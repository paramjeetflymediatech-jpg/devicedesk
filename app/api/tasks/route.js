import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import { sendNotification } from '../utils/notificationsHelper.js';
import { generateAICaption } from '../utils/generateCaption.js';
import { checkAuth } from '../utils/storageManager.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

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

export async function GET() {
  try {
    const db = await getDbConnection();

    // Ensure project_id and revision_notes columns exist in tasks table dynamically
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN project_id VARCHAR(50)`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN revision_notes TEXT DEFAULT NULL`);
    } catch (e) {}

    const [rows] = await db.query(
      `SELECT t.*, 
       t.fileUrl as fileUrl,
       p.name as project_name, 
       COALESCE(c.name, sc.name) as client_name,
       a.name as assigned_to_name,
       sr.attachment as client_attachment,
       sr.drive_url as client_drive_url,
       sr.service_type as client_service_type,
       sr.requirements as client_requirements,
       sr.clientId as client_id,
       COALESCE(t.revision_notes, sr.revision_notes, smo.revision_notes) as revision_notes
       FROM tasks t
       LEFT JOIN projects p ON (t.project_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN employees c ON (p.client_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN service_requests sr ON (t.project_id COLLATE utf8mb4_unicode_ci = sr.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN client_smo_requests smo ON (t.project_id COLLATE utf8mb4_unicode_ci = smo.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN employees sc ON (sr.clientId COLLATE utf8mb4_unicode_ci = sc.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN employees a ON (t.assignedTo COLLATE utf8mb4_unicode_ci = a.id COLLATE utf8mb4_unicode_ci)
       ORDER BY t.createdAt DESC`
    );

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Fetch Tasks API Error:', err);
    // Fallback if JOIN fails due to missing columns or tables
    try {
      const db = await getDbConnection();
      const [rows] = await db.query(`SELECT * FROM tasks ORDER BY createdAt DESC`);
      return NextResponse.json({ success: true, count: rows.length, data: rows });
    } catch(e) {
      return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
    }
  }
}

export async function POST(request) {
  try {
    const { title, description, assignedTo, assignedToName, assignedBy, assignedByName, project_id, attachment, fileUrl } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const taskId = 'task_' + Date.now();
    const taskTitle = title.trim();
    const taskDesc = description ? description.trim() : null;
    const taskStatus = 'Pending';
    const createdAt = new Date().toISOString();
    // Newly assigned tasks start with no work deliverables (fileUrl is null until employee completes task)
    const taskFileUrl = fileUrl || null;

    // Dynamically add project_id to tasks if needed
    try {
        await db.query(`ALTER TABLE tasks ADD COLUMN project_id VARCHAR(50)`);
    } catch(e) {}

    await db.execute(
      `INSERT INTO tasks (id, title, description, assignedTo, assignedToName, assignedBy, assignedByName, status, createdAt, project_id, fileUrl) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, taskTitle, taskDesc, assignedTo || null, assignedToName || null, assignedBy || null, assignedByName || null, taskStatus, createdAt, project_id || null, taskFileUrl]
    );

    if (project_id) {
      try {
        await db.execute(`UPDATE service_requests SET status = 'Assigned' WHERE id = ?`, [project_id]);
      } catch (e) {
        console.error('Failed to update service_requests status:', e);
      }
    }

    if (assignedTo) {
      const assignedByNameStr = assignedByName || 'the system';
      await sendNotification(
        assignedTo,
        'New Task Assigned',
        `You have been assigned a new task "${taskTitle}" by ${assignedByNameStr}.`,
        '/employee-dashboard/tasks'
      );
    }

    try {
      const browserUser = await checkAuth(request);
      await logSecurityEvent({
        request,
        action: 'TASK_ASSIGNED_TO_EMPLOYEE',
        category: 'EMPLOYEE_REQUEST',
        status: 'SUCCESS',
        user: browserUser,
        targetUser: { id: assignedTo, name: assignedToName },
        details: {
          taskId,
          taskTitle,
          project_id,
          assignedTo: `${assignedToName || 'Employee'} (${assignedTo})`,
          assignedBy: assignedByName || 'Admin',
          submittedByBrowserUser: browserUser ? `${browserUser.name} (${browserUser.role || 'User'})` : (assignedByName || 'System'),
          note: `Task "${taskTitle}" assigned to ${assignedToName || assignedTo}.`
        }
      });
    } catch (auditErr) {
      console.warn('Audit log error on assign task:', auditErr);
    }

    return NextResponse.json({
      success: true,
      task: { id: taskId, title: taskTitle, description: taskDesc, status: taskStatus, project_id, fileUrl: taskFileUrl }
    });
  } catch (err) {
    console.error('Add Task API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, status, fileUrl, completion_note, notes, note } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status.' }, { status: 400 });
    }

    const completionNoteStr = completion_note || notes || note || null;
    const db = await getDbConnection();

    // Ensure columns exist in tasks dynamically
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN fileUrl TEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN completedAt VARCHAR(50)`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN completion_note TEXT`);
    } catch (e) {}

    const fileUrlStr = fileUrl ? (Array.isArray(fileUrl) ? JSON.stringify(fileUrl) : String(fileUrl)) : null;

    if (status === 'Completed') {
      const completedAt = new Date().toISOString();
      if (fileUrlStr && completionNoteStr) {
        await db.execute(`UPDATE tasks SET status = ?, fileUrl = ?, completedAt = ?, completion_note = ? WHERE id = ?`, [status, fileUrlStr, completedAt, completionNoteStr, id]);
      } else if (fileUrlStr) {
        await db.execute(`UPDATE tasks SET status = ?, fileUrl = ?, completedAt = ? WHERE id = ?`, [status, fileUrlStr, completedAt, id]);
      } else if (completionNoteStr) {
        await db.execute(`UPDATE tasks SET status = ?, completedAt = ?, completion_note = ? WHERE id = ?`, [status, completedAt, completionNoteStr, id]);
      } else {
        await db.execute(`UPDATE tasks SET status = ?, completedAt = ? WHERE id = ?`, [status, completedAt, id]);
      }
    } else {
      if (fileUrlStr && completionNoteStr) {
        await db.execute(`UPDATE tasks SET status = ?, fileUrl = ?, completion_note = ? WHERE id = ?`, [status, fileUrlStr, completionNoteStr, id]);
      } else if (fileUrlStr) {
        await db.execute(`UPDATE tasks SET status = ?, fileUrl = ? WHERE id = ?`, [status, fileUrlStr, id]);
      } else if (completionNoteStr) {
        await db.execute(`UPDATE tasks SET status = ?, completion_note = ? WHERE id = ?`, [status, completionNoteStr, id]);
      } else {
        await db.execute(`UPDATE tasks SET status = ? WHERE id = ?`, [status, id]);
      }
    }

    // If task has a project_id (service request), update that too if completed
    if (status === 'Completed') {
      try {
        const [taskRows] = await db.query('SELECT project_id, fileUrl, assignedToName FROM tasks WHERE id = ?', [id]);
        if (taskRows.length > 0 && taskRows[0].project_id) {
          const projectId = taskRows[0].project_id;

          // Ensure columns exist on service_requests
          try {
            await db.query(`ALTER TABLE service_requests ADD COLUMN caption TEXT DEFAULT NULL`);
          } catch (e) {}
          try {
            await db.query(`ALTER TABLE service_requests ADD COLUMN hashtags VARCHAR(500) DEFAULT NULL`);
          } catch (e) {}

          // Query client info & service request requirements
          const [srRows] = await db.query(`
            SELECT sr.id, sr.clientId, sr.service_type, sr.requirements, sr.assigned_tl_id,
                   c.name as client_name,
                   cd.company_name
            FROM service_requests sr
            LEFT JOIN employees c ON sr.clientId COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
            LEFT JOIN client_details cd ON sr.clientId COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci
            WHERE sr.id = ?
          `, [projectId]);

          if (srRows.length > 0) {
            const sr = srRows[0];
            const bannerFile = extractFirstImage(fileUrlStr) || extractFirstImage(taskRows[0].fileUrl);
            const brand = sr.company_name || sr.client_name || 'Flymedia Technology';
            const requirement = sr.requirements || completionNoteStr || 'Engaging social media post';

            // Automatically generate AI caption when team member submits the work
            let aiResult = { caption: '', hashtags: '' };
            try {
              aiResult = await generateAICaption({
                requirement,
                brandName: brand,
                bannerUrl: bannerFile
              });
            } catch (aiErr) {
              console.warn('AI caption generation fallback on task submit:', aiErr.message);
              aiResult = {
                caption: `✨ Elevate Your Business with ${brand}!\n\nDelivering top-tier creative solutions designed to help your brand stand out and grow.\n\n👉 Connect with us today to learn more!`,
                hashtags: `#${brand.replace(/[^a-zA-Z0-9]/g, '')} #Flymedia #DigitalMarketing #Trending`
              };
            }

            // Update service_requests with 'For TL Review', caption, and hashtags
            await db.execute(
              `UPDATE service_requests 
               SET status = 'For TL Review', 
                   caption = ?, 
                   hashtags = ? 
               WHERE id = ?`,
              [aiResult.caption, aiResult.hashtags, projectId]
            );

            // Sync into client_smo_requests with status 'Under Review' so client sees 'Under Review'
            try {
              await db.query(`
                INSERT INTO client_smo_requests (
                  id, client_id, requirements, banner_url, caption, hashtags, status, designer_name, created_at
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, 'Under Review', ?, NOW()
                )
                ON DUPLICATE KEY UPDATE
                  banner_url = COALESCE(VALUES(banner_url), client_smo_requests.banner_url),
                  caption = VALUES(caption),
                  hashtags = VALUES(hashtags),
                  status = IF(client_smo_requests.status IN ('Published', 'Approved', 'Scheduled', 'Ready for Approval'), client_smo_requests.status, 'Under Review'),
                  designer_name = COALESCE(VALUES(designer_name), client_smo_requests.designer_name)
              `, [
                sr.id,
                sr.clientId,
                sr.requirements,
                bannerFile,
                aiResult.caption,
                aiResult.hashtags,
                taskRows[0].assignedToName || 'Design Specialist'
              ]);
            } catch (smoErr) {
              console.warn('Failed to draft into client_smo_requests on task completion:', smoErr.message);
            }

            // Notify Team Leader that work was submitted and caption is generated for review
            if (sr.assigned_tl_id) {
              try {
                await sendNotification(
                  sr.assigned_tl_id,
                  '🎨 Work Submitted for Review',
                  `Team member completed creative work for "${sr.service_type || 'Design Task'}". AI caption & hashtags are ready for your review and delivery.`,
                  '/portal/leader/client-requests'
                );
              } catch (notifErr) {
                console.error('Failed to notify TL:', notifErr);
              }
            }
          } else {
            await db.execute(`UPDATE service_requests SET status = 'For TL Review' WHERE id = ?`, [projectId]);
          }
        }
      } catch (e) {
        console.error('Failed to update service request status:', e);
      }
    } else if (status === 'In Progress') {
      try {
        const [rows] = await db.query('SELECT project_id FROM tasks WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].project_id) {
          await db.execute(`UPDATE service_requests SET status = 'In Progress' WHERE id = ?`, [rows[0].project_id]);
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (err) {
    console.error('Update Task API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
