import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import { publishDuePosts } from '../../utils/smoScheduler';
import { generateAICaption } from '../../utils/generateCaption';
import { sendNotification } from '../../utils/notificationsHelper';
import crypto from 'crypto';

function extractFirstImage(val) {
  if (!val) return null;
  let urls = [];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try { urls = JSON.parse(trimmed); } catch (e) { urls = [trimmed]; }
    } else {
      urls = [trimmed];
    }
  } else if (Array.isArray(val)) {
    urls = val;
  }
  for (const u of urls) {
    if (typeof u === 'string' && /\.(jpeg|jpg|png|webp|svg|gif)($|\?)/i.test(u)) {
      return u;
    }
  }
  return urls[0] || null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const requestId = searchParams.get('id');

    const db = await getDbConnection();

    // Trigger any due scheduled posts in background
    publishDuePosts().catch(() => {});

    // 1. Auto-sync any requests booked via the "Book Service" page (service_requests)
    // where service_type is SMO, Social Media, or Graphic Design
    try {
      let syncQuery = `
        SELECT sr.id, sr.clientId as client_id, sr.requirements, sr.created_at, sr.attachment, sr.status as sr_status,
               sr.caption as sr_caption, sr.hashtags as sr_hashtags,
               t.fileUrl as task_file_url, t.completion_note, t.assignedToName, t.status as task_status
        FROM service_requests sr
        LEFT JOIN tasks t ON sr.id COLLATE utf8mb4_unicode_ci = t.project_id COLLATE utf8mb4_unicode_ci
        WHERE (LOWER(sr.service_type) LIKE '%smo%' OR LOWER(sr.service_type) LIKE '%social%' OR LOWER(sr.service_type) LIKE '%graphic%' OR LOWER(sr.service_type) LIKE '%banner%')
      `;
      const syncParams = [];
      if (clientId) {
        syncQuery += ` AND sr.clientId = ?`;
        syncParams.push(clientId);
      }
      if (requestId) {
        syncQuery += ` AND sr.id = ?`;
        syncParams.push(requestId);
      }

      const [serviceRows] = await db.query(syncQuery, syncParams);

      for (const sr of (serviceRows || [])) {
        // A finished design banner is ONLY extracted from the task deliverables when the task is Completed
        const isTaskCompleted = sr.task_status === 'Completed';
        const detectedImg = isTaskCompleted ? extractFirstImage(sr.task_file_url) : null;

        // Accurate status:
        // 1. If TL approved the service request ('Completed'): 'Ready for Approval'
        // 2. If employee completed task and waiting for TL review ('For TL Review' or task_status === 'Completed'): 'Under Review'
        // 3. If assigned to designer or in progress: 'In Progress'
        // 4. Otherwise: 'Pending Design'
        let autoStatus = 'Pending Design';
        if (sr.sr_status === 'Completed') {
          autoStatus = 'Ready for Approval';
        } else if (sr.sr_status === 'For TL Review' || isTaskCompleted) {
          autoStatus = 'Under Review';
        } else if (sr.sr_status === 'Assigned' || sr.sr_status === 'In Progress' || sr.task_status === 'In Progress') {
          autoStatus = 'In Progress';
        }

        await db.query(`
          INSERT INTO client_smo_requests (id, client_id, requirements, banner_url, caption, hashtags, status, designer_name, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            banner_url = IF(client_smo_requests.status IN ('Published', 'Approved', 'Scheduled', 'Ready for Approval'), client_smo_requests.banner_url, VALUES(banner_url)),
            caption = COALESCE(VALUES(caption), client_smo_requests.caption),
            hashtags = COALESCE(VALUES(hashtags), client_smo_requests.hashtags),
            status = IF(client_smo_requests.status IN ('Published', 'Approved', 'Scheduled', 'Revision Requested'), client_smo_requests.status, VALUES(status)),
            designer_name = COALESCE(VALUES(designer_name), client_smo_requests.designer_name)
        `, [
          sr.id,
          sr.client_id,
          sr.requirements,
          detectedImg, // NULL unless task has actually been completed
          sr.sr_caption || null,
          sr.sr_hashtags || '#Flymedia #SocialMedia #Trending',
          autoStatus,
          sr.assignedToName || 'Design Specialist',
          sr.created_at ? new Date(sr.created_at) : new Date()
        ]);
      }
    } catch (syncErr) {
      console.warn('Background sync from service_requests failed:', syncErr.message);
    }
    
    // 2. Fetch all SMO requests joined with client details and task proofs
    let query = `
      SELECT r.*, 
        c.name as client_name, 
        c.avatarUrl as client_avatar,
        cd.company_name,
        cd.fb_page_id,
        cd.ig_business_id,
        CASE WHEN cd.meta_access_token IS NOT NULL AND LENGTH(cd.meta_access_token) > 5 THEN 1 ELSE 0 END as has_meta_token,
        t.fileUrl as task_deliverables,
        t.completion_note as task_note,
        t.assignedToName as task_designer,
        t.status as task_status,
        sr.status as sr_status
      FROM client_smo_requests r 
      LEFT JOIN employees c ON (r.client_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci) 
      LEFT JOIN client_details cd ON (r.client_id COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
      LEFT JOIN tasks t ON (r.id COLLATE utf8mb4_unicode_ci = t.project_id COLLATE utf8mb4_unicode_ci)
      LEFT JOIN service_requests sr ON (r.id COLLATE utf8mb4_unicode_ci = sr.id COLLATE utf8mb4_unicode_ci)
    `;
    const params = [];

    if (requestId) {
      query += ` WHERE r.id = ?`;
      params.push(requestId);
    } else if (clientId) {
      query += ` WHERE r.client_id = ? ORDER BY r.created_at DESC`;
      params.push(clientId);
    } else {
      query += ` ORDER BY r.created_at DESC`;
    }

    const [rows] = await db.execute(query, params);

    // Accurate status mapping for client display:
    // A post is ONLY "Ready for Approval" if the Team Leader approved and delivered it, or designer uploaded directly.
    // If the task is still Pending, In Progress, or For TL Review, it is NEVER 'Ready for Approval'.
    const enhancedRows = (rows || []).map(row => {
      let finalBanner = row.banner_url;
      let finalStatus = row.status || 'Pending Design';

      if (row.sr_status || row.task_status) {
        if (row.sr_status === 'Completed' || finalStatus === 'Published' || finalStatus === 'Scheduled' || finalStatus === 'Approved') {
          // Delivered by TL or published
          finalStatus = (finalStatus === 'Pending Design' || finalStatus === 'In Progress') ? 'Ready for Approval' : finalStatus;
          if (!finalBanner && row.task_deliverables) {
            finalBanner = extractFirstImage(row.task_deliverables);
          }
        } else if (row.sr_status === 'For TL Review' || row.task_status === 'Completed') {
          // Finished by team member, currently waiting for TL review
          finalStatus = 'Under Review';
          finalBanner = null; // Do not show unfinished/unreviewed banner to client
        } else if (row.sr_status === 'Assigned' || row.sr_status === 'In Progress' || row.task_status === 'Pending' || row.task_status === 'In Progress') {
          // Team member has not finished work yet
          finalStatus = 'In Progress';
          finalBanner = null;
        } else if (row.sr_status === 'Pending') {
          finalStatus = 'Pending Design';
          finalBanner = null;
        }
      }

      return {
        ...row,
        banner_url: finalBanner,
        status: finalStatus,
        designer_name: row.designer_name || row.task_designer || 'Design Specialist',
        caption: (finalStatus === 'In Progress' || finalStatus === 'Pending Design' || finalStatus === 'Under Review')
          ? row.requirements
          : (row.caption || row.task_note || row.requirements)
      };
    });

    return NextResponse.json({ success: true, data: enhancedRows });
  } catch (error) {
    console.error('GET SMO Requests Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { action, id } = data;
    const db = await getDbConnection();

    // Trigger any due scheduled posts in background
    publishDuePosts().catch(() => {});

    // 1. Designer Uploads Banner & Suggested Copy
    if (action === 'upload_design') {
      const { banner_url, caption, hashtags, platforms, designer_id, designer_name } = data;
      if (!id || !banner_url) {
        return NextResponse.json({ success: false, error: 'Request ID and Banner URL are required.' }, { status: 400 });
      }

      await db.execute(`
        UPDATE client_smo_requests 
        SET banner_url = ?,
            caption = ?,
            hashtags = ?,
            platforms = ?,
            designer_id = ?,
            designer_name = ?,
            status = 'Ready for Approval',
            revision_notes = NULL
        WHERE id = ?
      `, [
        banner_url,
        caption || '',
        hashtags || '',
        platforms ? (typeof platforms === 'string' ? platforms : JSON.stringify(platforms)) : '["facebook", "instagram"]',
        designer_id || null,
        designer_name || 'Design Specialist',
        id
      ]);

      return NextResponse.json({ success: true, message: 'Banner uploaded and submitted for client review!' });
    }

    // 2. Client Approves the Creative
    if (action === 'approve') {
      const { scheduled_at } = data;
      if (!id) return NextResponse.json({ success: false, error: 'Request ID required.' }, { status: 400 });

      await db.execute(`
        UPDATE client_smo_requests 
        SET status = 'Approved',
            scheduled_at = ?
        WHERE id = ?
      `, [scheduled_at || null, id]);

      return NextResponse.json({ success: true, message: 'Creative approved!' });
    }

    // 2b. Schedule Post for a specific future date and time
    if (action === 'schedule_post') {
      const { scheduled_at, platforms } = data;
      if (!id || !scheduled_at) {
        return NextResponse.json({ success: false, error: 'Request ID and scheduled date/time are required.' }, { status: 400 });
      }

      let formattedDate;
      let displayTime;

      // Handle "YYYY-MM-DDTHH:mm" from <input type="datetime-local">
      if (typeof scheduled_at === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(scheduled_at)) {
        formattedDate = scheduled_at.replace('T', ' ').slice(0, 19);
        if (formattedDate.length === 16) formattedDate += ':00';
        const parsed = new Date(scheduled_at.replace(' ', 'T'));
        if (parsed.getTime() <= Date.now()) {
          return NextResponse.json({ success: false, error: 'Scheduled time must be in the future.' }, { status: 400 });
        }
        displayTime = parsed.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        const scheduleDate = new Date(scheduled_at);
        if (isNaN(scheduleDate.getTime())) {
          return NextResponse.json({ success: false, error: 'Invalid date/time format.' }, { status: 400 });
        }
        if (scheduleDate.getTime() <= Date.now()) {
          return NextResponse.json({ success: false, error: 'Scheduled time must be in the future.' }, { status: 400 });
        }
        const pad = n => String(n).padStart(2, '0');
        formattedDate = `${scheduleDate.getFullYear()}-${pad(scheduleDate.getMonth() + 1)}-${pad(scheduleDate.getDate())} ${pad(scheduleDate.getHours())}:${pad(scheduleDate.getMinutes())}:${pad(scheduleDate.getSeconds())}`;
        displayTime = scheduleDate.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }

      let query = `
        UPDATE client_smo_requests 
        SET status = 'Scheduled',
            scheduled_at = ?
      `;
      const updateParams = [formattedDate];

      if (platforms) {
        query += `, platforms = ?`;
        updateParams.push(typeof platforms === 'string' ? platforms : JSON.stringify(platforms));
      }

      query += ` WHERE id = ?`;
      updateParams.push(id);

      await db.execute(query, updateParams);

      return NextResponse.json({ 
        success: true, 
        message: `Post successfully scheduled for ${displayTime}!` 
      });
    }

    // 2c. Cancel Scheduled Post
    if (action === 'cancel_schedule') {
      if (!id) return NextResponse.json({ success: false, error: 'Request ID required.' }, { status: 400 });

      await db.execute(`
        UPDATE client_smo_requests 
        SET status = 'Ready for Approval',
            scheduled_at = NULL
        WHERE id = ?
      `, [id]);

      return NextResponse.json({ success: true, message: 'Schedule cancelled. Post returned to Ready for Approval.' });
    }

    // 3. Client Requests Revision / Changes
    if (action === 'request_revision') {
      const { revision_notes } = data;
      if (!id || !revision_notes) {
        return NextResponse.json({ success: false, error: 'Request ID and revision details are required.' }, { status: 400 });
      }

      // Ensure revision_notes column exists in relevant tables
      try {
        await db.query(`ALTER TABLE client_smo_requests ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}
      try {
        await db.query(`ALTER TABLE service_requests ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}
      try {
        await db.query(`ALTER TABLE tasks ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}

      // 1. Update client_smo_requests
      await db.execute(`
        UPDATE client_smo_requests 
        SET status = 'Revision Requested',
            revision_notes = ?
        WHERE id = ?
      `, [revision_notes, id]);

      // 2. Update service_requests status & revision_notes
      await db.execute(`
        UPDATE service_requests 
        SET status = 'Revision Requested',
            revision_notes = ?
        WHERE id = ?
      `, [revision_notes, id]);

      // 3. Re-open designer's task in tasks table to 'In Progress' with revision feedback
      await db.execute(`
        UPDATE tasks 
        SET status = 'In Progress',
            revision_notes = ?
        WHERE project_id = ?
      `, [revision_notes, id]);

      // 4. Notify assigned Team Leader and Designer
      try {
        const [infoRows] = await db.query(`
          SELECT sr.assigned_tl_id, sr.service_type, t.assignedTo as designer_id, c.name as client_name
          FROM service_requests sr
          LEFT JOIN tasks t ON sr.id COLLATE utf8mb4_unicode_ci = t.project_id COLLATE utf8mb4_unicode_ci
          LEFT JOIN employees c ON sr.clientId COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
          WHERE sr.id = ?
        `, [id]);

        if (infoRows.length > 0) {
          const info = infoRows[0];
          const clientName = info.client_name || 'Client';

          if (info.assigned_tl_id) {
            await sendNotification(
              info.assigned_tl_id,
              '⚠️ Revision Requested by Client',
              `${clientName} requested design revisions: "${revision_notes.slice(0, 100)}"`,
              '/portal/leader/client-requests'
            );
          }

          if (info.designer_id) {
            await sendNotification(
              info.designer_id,
              '⚠️ Design Revision Required',
              `${clientName} requested revisions: "${revision_notes.slice(0, 100)}"`,
              '/employee-dashboard/tasks'
            );
          }
        }
      } catch (notifErr) {
        console.error('Failed to notify TL/Designer of revision:', notifErr);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Revision feedback sent to Team Leader and Designer successfully!' 
      });
    }

    // 3b. Client or TL Modifies Caption & Hashtags
    if (action === 'update_copy' || action === 'update_caption') {
      const { caption, hashtags } = data;
      if (!id) return NextResponse.json({ success: false, error: 'Request ID required.' }, { status: 400 });

      await db.execute(`
        UPDATE client_smo_requests 
        SET caption = ?,
            hashtags = ?
        WHERE id = ?
      `, [caption || '', hashtags || '', id]);

      try {
        await db.execute(`UPDATE service_requests SET caption = ?, hashtags = ? WHERE id = ?`, [caption || '', hashtags || '', id]);
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Caption & hashtags updated successfully!' });
    }

    // 3c. Regenerate AI Caption on Demand
    if (action === 'regenerate_ai_caption') {
      if (!id) return NextResponse.json({ success: false, error: 'Request ID required.' }, { status: 400 });

      const [reqRows] = await db.query(`
        SELECT r.*, c.name as client_name, cd.company_name
        FROM client_smo_requests r
        LEFT JOIN employees c ON (r.client_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci)
        LEFT JOIN client_details cd ON (r.client_id COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
        WHERE r.id = ?
      `, [id]);

      if (!reqRows || reqRows.length === 0) {
        return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 });
      }

      const postRow = reqRows[0];
      const brand = postRow.company_name || postRow.client_name || 'Flymedia Technology';
      const aiResult = await generateAICaption({
        requirement: postRow.requirements || 'Engaging social media post',
        brandName: brand,
        bannerUrl: postRow.banner_url
      });

      await db.execute(`
        UPDATE client_smo_requests 
        SET caption = ?,
            hashtags = ?
        WHERE id = ?
      `, [aiResult.caption, aiResult.hashtags, id]);

      try {
        await db.execute(`UPDATE service_requests SET caption = ?, hashtags = ? WHERE id = ?`, [aiResult.caption, aiResult.hashtags, id]);
      } catch (e) {}

      return NextResponse.json({ 
        success: true, 
        message: 'New AI caption generated and saved!',
        caption: aiResult.caption,
        hashtags: aiResult.hashtags
      });
    }

    // 4. Save Client Social Credentials (Facebook Page ID, Instagram Business ID, Meta Page Access Token)
    if (action === 'save_social_settings') {
      const { client_id, fb_page_id, ig_business_id, meta_access_token } = data;
      if (!client_id) return NextResponse.json({ success: false, error: 'Client ID required.' }, { status: 400 });

      // Upsert into client_details
      const [existing] = await db.execute('SELECT client_id FROM client_details WHERE client_id = ?', [client_id]);
      if (existing.length === 0) {
        await db.execute(`
          INSERT INTO client_details (client_id, fb_page_id, ig_business_id, meta_access_token)
          VALUES (?, ?, ?, ?)
        `, [client_id, fb_page_id || null, ig_business_id || null, meta_access_token || null]);
      } else {
        let updateQuery = `UPDATE client_details SET fb_page_id = ?, ig_business_id = ?`;
        const params = [fb_page_id || null, ig_business_id || null];
        if (meta_access_token) {
          updateQuery += `, meta_access_token = ?`;
          params.push(meta_access_token);
        }
        updateQuery += ` WHERE client_id = ?`;
        params.push(client_id);
        await db.execute(updateQuery, params);
      }

      return NextResponse.json({ success: true, message: 'Social credentials saved successfully!' });
    }

    // 4b. Test Meta Social Credentials & Connectivity
    if (action === 'test_social_connection') {
      const { fb_page_id, meta_access_token, ig_business_id } = data;
      const token = (meta_access_token || '').trim();
      const pageId = (fb_page_id || '').trim();

      if (!token) {
        return NextResponse.json({ success: false, error: 'Please enter a Meta Access Token to test.' }, { status: 400 });
      }

      try {
        // Step 1: Check token validity via /me
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`);
        const meData = await meRes.json();
        if (!meRes.ok) {
          const errMsg = meData.error?.message || 'Invalid or expired Meta Access Token.';
          return NextResponse.json({ success: false, error: `Meta Error: ${errMsg}` }, { status: 400 });
        }

        // Step 2: Check managed accounts via /me/accounts
        let resolvedPageToken = token;
        let pageName = meData.name;
        let detectedIgId = null;

        const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`);
        if (accountsRes.ok) {
          const accData = await accountsRes.json();
          const pages = accData.data || [];
          if (pages.length > 0) {
            const match = pageId ? pages.find(p => String(p.id) === String(pageId)) : pages[0];
            if (match) {
              pageName = match.name;
              resolvedPageToken = match.access_token || resolvedPageToken;
              if (match.instagram_business_account?.id) {
                detectedIgId = match.instagram_business_account.id;
              }
            }
          }
        }

        // Step 3: Check direct Page ID details
        if (pageId) {
          const directPageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=id,name,access_token,instagram_business_account&access_token=${resolvedPageToken}`);
          if (directPageRes.ok) {
            const directPage = await directPageRes.json();
            pageName = directPage.name || pageName;
            if (directPage.access_token) {
              resolvedPageToken = directPage.access_token;
            }
            if (!detectedIgId && directPage.instagram_business_account?.id) {
              detectedIgId = directPage.instagram_business_account.id;
            }
          }
        }

        // Step 4: Check granted permissions
        const permRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`);
        const permData = await permRes.json();
        const grantedPerms = Array.isArray(permData.data) ? permData.data.filter(p => p.status === 'granted').map(p => p.permission) : [];
        const hasIgPublish = grantedPerms.includes('instagram_content_publish') || grantedPerms.includes('instagram_business_content_publish');

        let igWarning = null;
        if ((detectedIgId || ig_business_id) && !hasIgPublish) {
          igWarning = 'Permission "instagram_content_publish" is missing from this token. Add it in Graph API Explorer to enable Instagram posting.';
        }

        return NextResponse.json({
          success: true,
          message: `Successfully connected to Facebook Page "${pageName}"!`,
          details: {
            pageName,
            pageId: pageId || meData.id,
            detectedIgId: detectedIgId || ig_business_id || null,
            hasIgPublish,
            igWarning,
            grantedPermissions: grantedPerms
          }
        });
      } catch (testErr) {
        return NextResponse.json({ success: false, error: `Connection failed: ${testErr.message}` }, { status: 500 });
      }
    }

    // 4c. Reject Request by Admin
    if (action === 'reject_request' || action === 'reject') {
      const { rejection_notes, reason } = data;
      const note = (rejection_notes || reason || 'Request rejected by Admin').trim();
      if (!id) return NextResponse.json({ success: false, error: 'Request ID required.' }, { status: 400 });

      try {
        await db.query(`ALTER TABLE client_smo_requests ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}
      try {
        await db.query(`ALTER TABLE service_requests ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}
      try {
        await db.query(`ALTER TABLE tasks ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}

      await db.execute(`
        UPDATE client_smo_requests 
        SET status = 'Rejected',
            revision_notes = ?
        WHERE id = ?
      `, [note, id]);

      try {
        await db.execute(`
          UPDATE service_requests 
          SET status = 'Rejected',
              revision_notes = ?
          WHERE id = ?
        `, [note, id]);
      } catch (e) {}

      try {
        await db.execute(`
          UPDATE tasks 
          SET status = 'Cancelled',
              revision_notes = ?
          WHERE project_id = ?
        `, [note, id]);
      } catch (e) {}

      // Notify TL, Designer, and Client
      try {
        const [infoRows] = await db.query(`
          SELECT r.client_id, sr.assigned_tl_id, t.assignedTo as designer_id, c.name as client_name
          FROM client_smo_requests r
          LEFT JOIN service_requests sr ON r.id COLLATE utf8mb4_unicode_ci = sr.id COLLATE utf8mb4_unicode_ci
          LEFT JOIN tasks t ON r.id COLLATE utf8mb4_unicode_ci = t.project_id COLLATE utf8mb4_unicode_ci
          LEFT JOIN employees c ON r.client_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
          WHERE r.id = ?
        `, [id]);

        if (infoRows.length > 0) {
          const info = infoRows[0];
          if (info.client_id) {
            await sendNotification(
              info.client_id,
              '❌ Request Rejected by Admin',
              `Your SMO request was rejected by Admin. Reason: ${note.slice(0, 120)}`,
              '/portal/client/smo'
            );
          }
          if (info.assigned_tl_id) {
            await sendNotification(
              info.assigned_tl_id,
              '❌ Request Rejected by Admin',
              `SMO Request #${id} was rejected by Admin. Reason: ${note.slice(0, 120)}`,
              '/portal/leader/client-requests'
            );
          }
          if (info.designer_id) {
            await sendNotification(
              info.designer_id,
              '❌ Task Cancelled / Rejected',
              `Task for request #${id} was cancelled. Reason: ${note.slice(0, 120)}`,
              '/employee-dashboard/tasks'
            );
          }
        }
      } catch (notifErr) {
        console.error('Failed to notify on SMO rejection:', notifErr);
      }

      return NextResponse.json({ success: true, message: 'Request has been rejected successfully.' });
    }

    // 5. Default: Update assigned TL or general request status
    const { assigned_tl_id, status } = data;
    if (!id) return NextResponse.json({ success: false, error: 'Request ID required' }, { status: 400 });

    if (assigned_tl_id !== undefined) {
      await db.execute('UPDATE client_smo_requests SET assigned_tl_id = ? WHERE id = ?', [assigned_tl_id || null, id]);
    }
    if (status) {
      await db.execute('UPDATE client_smo_requests SET status = ? WHERE id = ?', [status, id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT SMO Requests Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { clientId, requirements, platforms } = data;
    
    if (!clientId || !requirements) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Verify client has an active SMO package before allowing SMO creation
    const [pkgs] = await db.query(`
      SELECT p.name 
      FROM client_package_overrides cpo 
      JOIN packages p ON (cpo.package_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci) 
      WHERE cpo.client_id = ? AND cpo.status = 'Active'
    `, [clientId]);

    const hasSmo = (pkgs || []).some(
      p => (p.name || '').toLowerCase().includes('smo') || (p.name || '').toLowerCase().includes('social')
    );

    if (!hasSmo) {
      return NextResponse.json({ 
        success: false, 
        error: 'Active SMO package required. Please subscribe to an SMO package to use SMO services.' 
      }, { status: 403 });
    }

    const id = 'smo_' + crypto.randomBytes(8).toString('hex');

    // Trigger any due scheduled posts in background
    publishDuePosts().catch(() => {});
    await db.execute(
      'INSERT INTO client_smo_requests (id, client_id, requirements, status, platforms) VALUES (?, ?, ?, ?, ?)',
      [
        id, 
        clientId, 
        requirements, 
        'Pending Design', 
        platforms ? (typeof platforms === 'string' ? platforms : JSON.stringify(platforms)) : '["facebook", "instagram"]'
      ]
    );

    return NextResponse.json({ 
      success: true, 
      data: { id, clientId, requirements, status: 'Pending Design' } 
    });
  } catch (error) {
    console.error('POST SMO Request Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const viewerRole = searchParams.get('viewerRole') || req.headers.get('x-user-role');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
    }

    const normalizedRole = (viewerRole || '').trim().toLowerCase();
    const isAdmin = !viewerRole || ['admin', 'management', 'superadmin'].includes(normalizedRole);

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Only admins can delete requests' }, { status: 403 });
    }

    const db = await getDbConnection();

    // Fetch details before deleting
    let clientId = null;
    let requirements = '';
    const [smoRows] = await db.query('SELECT * FROM client_smo_requests WHERE id = ?', [id]);
    if (smoRows.length > 0) {
      clientId = smoRows[0].client_id;
      requirements = smoRows[0].requirements || '';
    } else {
      const [srRows] = await db.query('SELECT * FROM service_requests WHERE id = ?', [id]);
      if (srRows.length > 0) {
        clientId = srRows[0].clientId;
        requirements = srRows[0].requirements || '';
      }
    }

    // Record deletion for client transparency
    if (clientId) {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS service_request_deletions (
            id VARCHAR(100) PRIMARY KEY,
            request_id VARCHAR(100) NOT NULL,
            client_id VARCHAR(100) NOT NULL,
            service_type VARCHAR(255),
            requirements TEXT,
            deleted_by VARCHAR(100) DEFAULT 'Admin',
            deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            dismissed_by_client TINYINT(1) DEFAULT 0
          )
        `);
        const delId = 'del_' + Date.now() + Math.random().toString(36).substring(2, 7);
        await db.query(
          `INSERT INTO service_request_deletions (id, request_id, client_id, service_type, requirements, deleted_by, deleted_at, dismissed_by_client)
           VALUES (?, ?, ?, 'SMO / Social Media', ?, 'Admin', NOW(), 0)`,
          [delId, id, clientId, requirements]
        );
      } catch (logErr) {
        console.warn('Error recording deletion notice:', logErr);
      }

      // Notify client
      try {
        await sendNotification(
          clientId,
          'Service Request Removed',
          'Your SMO request was removed by Admin.',
          '/portal/client/smo'
        );
      } catch (nErr) {}
    }

    // Clean up tasks
    try {
      await db.query('DELETE FROM tasks WHERE project_id = ?', [id]);
    } catch (tErr) {}

    // Clean up service_requests
    try {
      await db.query('DELETE FROM service_requests WHERE id = ?', [id]);
    } catch (srErr) {}

    // Clean up client_smo_requests
    await db.query('DELETE FROM client_smo_requests WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Request permanently deleted.' });
  } catch (error) {
    console.error('DELETE SMO Request Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
