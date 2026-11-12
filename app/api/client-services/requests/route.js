import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { sendNotification } from '../../utils/notificationsHelper.js';
import { generateAICaption } from '../../utils/generateCaption.js';
import { checkAuth } from '../../utils/storageManager.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const viewerId = searchParams.get('viewerId') || request.headers.get('x-user-id');
    const viewerRole = searchParams.get('viewerRole') || request.headers.get('x-user-role');

    const db = await getDbConnection();
    let rows;

    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN completion_note TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN project_id VARCHAR(50) DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN assigned_tl_id VARCHAR(50) DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN attachment TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN drive_url TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN revision_notes TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN caption TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN hashtags VARCHAR(500) DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN revision_notes TEXT DEFAULT NULL`);
    } catch (e) {}

    const baseQuery = `
      SELECT r.*, 
        c.name as client_name, 
        tl.name as tl_name,
        t.fileUrl as deliverable_files,
        t.completion_note as deliverable_note,
        t.completedAt as delivered_at,
        t.status as task_status,
        ea.name as specialist_name,
        COALESCE(r.revision_notes, smo.revision_notes, t.revision_notes) as revision_notes,
        COALESCE(r.caption, smo.caption) as caption,
        COALESCE(r.hashtags, smo.hashtags) as hashtags
      FROM service_requests r 
      LEFT JOIN employees c ON (r.clientId COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci) 
      LEFT JOIN employees tl ON (r.assigned_tl_id COLLATE utf8mb4_unicode_ci = tl.id COLLATE utf8mb4_unicode_ci) 
      LEFT JOIN tasks t ON (r.id COLLATE utf8mb4_unicode_ci = t.project_id COLLATE utf8mb4_unicode_ci)
      LEFT JOIN client_smo_requests smo ON (r.id COLLATE utf8mb4_unicode_ci = smo.id COLLATE utf8mb4_unicode_ci)
      LEFT JOIN employees ea ON (t.assignedTo COLLATE utf8mb4_unicode_ci = ea.id COLLATE utf8mb4_unicode_ci)
    `;

    if (clientId) {
      [rows] = await db.query(
        `${baseQuery} WHERE r.clientId = ? ORDER BY r.created_at DESC`,
        [clientId]
      );
    } else {
      [rows] = await db.query(
        `${baseQuery} ORDER BY r.created_at DESC`
      );
    }

    // Role-based visibility for drive_url:
    // Only Admin, the assigned Team Leader, or the client who owns the request should see drive_url
    if (viewerRole && !['Admin', 'Management', 'admin', 'management'].includes(viewerRole)) {
      rows = rows.map(r => {
        const isAssignedTl = viewerId && String(r.assigned_tl_id) === String(viewerId);
        const isClientOwner = viewerId && String(r.clientId) === String(viewerId);
        if (!isAssignedTl && !isClientOwner) {
          return { ...r, drive_url: null };
        }
        return r;
      });
    }

    let deletedNotices = [];
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
        const [dRows] = await db.query(
          `SELECT * FROM service_request_deletions WHERE client_id = ? AND dismissed_by_client = 0 ORDER BY deleted_at DESC LIMIT 5`,
          [clientId]
        );
        deletedNotices = dRows || [];
      } catch (dErr) {
        console.warn('Error fetching deletedNotices:', dErr);
      }
    }

    return NextResponse.json({ success: true, data: rows, deletedNotices });
  } catch (err) {
    console.error('Fetch Service Requests Error:', err);
    try {
      const db = await getDbConnection();
      const { searchParams } = new URL(request.url);
      const clientId = searchParams.get('clientId');
      let rows;
      if (clientId) {
        [rows] = await db.query(`SELECT * FROM service_requests WHERE clientId = ? ORDER BY created_at DESC`, [clientId]);
      } else {
        [rows] = await db.query(`SELECT * FROM service_requests ORDER BY created_at DESC`);
      }
      let deletedNotices = [];
      if (clientId) {
        try {
          const [dRows] = await db.query(
            `SELECT * FROM service_request_deletions WHERE client_id = ? AND dismissed_by_client = 0 ORDER BY deleted_at DESC LIMIT 5`,
            [clientId]
          );
          deletedNotices = dRows || [];
        } catch (de) {}
      }
      return NextResponse.json({ success: true, data: rows, deletedNotices });
    } catch (e) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}

function extractDriveUrl(source) {
  if (!source) return null;
  const regex = /https?:\/\/(?:drive|docs|sheets)\.google\.com\/[^\s"')<>]+/i;
  if (typeof source === 'string') {
    const match = source.match(regex);
    if (match) return match[0];
  } else if (Array.isArray(source)) {
    for (const item of source) {
      const found = extractDriveUrl(item);
      if (found) return found;
    }
  } else if (typeof source === 'object') {
    for (const val of Object.values(source)) {
      const found = extractDriveUrl(val);
      if (found) return found;
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const { clientId, service_type, requirements, attachment, drive_url } = await request.json();
    if (!clientId || !service_type || !requirements) {
      return NextResponse.json({ success: false, error: 'Missing required fields (service type or requirements).' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Ensure columns exist dynamically
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN attachment TEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN assigned_tl_id VARCHAR(50)`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN drive_url TEXT`);
    } catch (e) {}

    // Verify client has an active package before allowing service booking
    const [activePkgs] = await db.query(
      `SELECT cpo.id, p.name FROM client_package_overrides cpo 
       LEFT JOIN packages p ON (cpo.package_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci) 
       WHERE cpo.client_id = ? AND (cpo.status = 'Active' OR cpo.status = 'active')`,
      [clientId]
    );

    if (!activePkgs || activePkgs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please buy a package first. You need an active package subscription to book services.'
      }, { status: 400 });
    }

    // Auto-detect and save Google Drive link if provided directly or mentioned in requirements/attachment
    let autoDriveUrl = drive_url && String(drive_url).trim() ? String(drive_url).trim() : null;
    if (!autoDriveUrl) {
      autoDriveUrl = extractDriveUrl(requirements) || extractDriveUrl(attachment) || null;
    }

    const id = 'req_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO service_requests (id, clientId, service_type, requirements, status, created_at, attachment, drive_url)
       VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [id, clientId, service_type, requirements, now, attachment || null, autoDriveUrl || null]
    );

    // Auto-sync into client_smo_requests if service_type is SMO, Social Media, or Graphic Design
    const sType = String(service_type || '').toLowerCase();
    if (sType.includes('smo') || sType.includes('social') || sType.includes('graphic') || sType.includes('banner')) {
      try {
        await db.query(
          `INSERT INTO client_smo_requests (id, client_id, requirements, status, platforms, banner_url, created_at)
           VALUES (?, ?, ?, 'Pending Design', '["facebook", "instagram"]', NULL, NOW())
           ON DUPLICATE KEY UPDATE requirements = VALUES(requirements)`,
          [id, clientId, requirements]
        );
      } catch (smoSyncErr) {
        console.warn('Auto-sync to client_smo_requests failed:', smoSyncErr.message);
      }
    }

    // Notify Management (Admins & Management)
    try {
      const [admins] = await db.query(`SELECT id FROM employees WHERE role IN ('Admin', 'Management')`);
      const [clientData] = await db.query(`SELECT name FROM employees WHERE id = ?`, [clientId]);
      const clientName = clientData.length > 0 ? clientData[0].name : 'A client';

      for (const admin of admins) {
        await sendNotification(
          admin.id,
          'New Client Service Request',
          `${clientName} has booked a new service request for ${service_type}.`,
          '/admin/client-requests'
        );
      }

      // Record Security Audit with browser user & target client
      try {
        const browserUser = await checkAuth(request);
        const isProxy = browserUser && browserUser.id !== clientId;
        await logSecurityEvent({
          request,
          action: 'CLIENT_SERVICE_REQUEST_SUBMITTED',
          category: 'EMPLOYEE_REQUEST',
          status: 'SUCCESS',
          user: browserUser,
          targetUser: { id: clientId, name: clientName },
          details: {
            requestId: id,
            service_type,
            requirements: requirements.slice(0, 300),
            submittedByBrowserUser: browserUser ? `${browserUser.name} (${browserUser.role || 'User'})` : 'Client Session',
            targetClient: `${clientName} (${clientId})`,
            isProxySubmission: isProxy,
            note: isProxy
              ? `Service request submitted by ${browserUser?.name} (${browserUser?.id}) on behalf of client ${clientName} (${clientId}).`
              : `Service request self-submitted by ${clientName}.`
          }
        });
      } catch (auditErr) {
        console.warn('Audit log error on client service request:', auditErr);
      }

    } catch (notifyErr) {
      console.error('Failed to notify admins of new client request:', notifyErr);
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Add Service Request Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status, assigned_tl_id, drive_url, caption, hashtags, action } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const db = await getDbConnection();
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN drive_url TEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN caption TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE service_requests ADD COLUMN hashtags VARCHAR(500) DEFAULT NULL`);
    } catch (e) {}

    // 0. Action: reject_request
    if (action === 'reject_request' || status === 'Rejected') {
      const rejection_notes = (body.rejection_notes || body.reason || 'Request rejected by Admin').trim();

      try {
        await db.query(`ALTER TABLE service_requests ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}
      try {
        await db.query(`ALTER TABLE client_smo_requests ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}
      try {
        await db.query(`ALTER TABLE tasks ADD COLUMN revision_notes TEXT DEFAULT NULL`);
      } catch (e) {}

      await db.execute(`UPDATE service_requests SET status = 'Rejected', revision_notes = ? WHERE id = ?`, [rejection_notes, id]);
      try {
        await db.execute(`UPDATE client_smo_requests SET status = 'Rejected', revision_notes = ? WHERE id = ?`, [rejection_notes, id]);
      } catch (e) {}
      try {
        await db.execute(`UPDATE tasks SET status = 'Cancelled', revision_notes = ? WHERE project_id = ?`, [rejection_notes, id]);
      } catch (e) {}

      // Notify TL and Client
      try {
        const [rows] = await db.query(`
          SELECT sr.clientId, sr.service_type, sr.assigned_tl_id, c.name as client_name
          FROM service_requests sr
          LEFT JOIN employees c ON sr.clientId COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
          WHERE sr.id = ?
        `, [id]);

        if (rows && rows.length > 0) {
          const r = rows[0];
          if (r.clientId) {
            await sendNotification(
              r.clientId,
              '❌ Request Rejected by Admin',
              `Your request for "${r.service_type || 'Service'}" was rejected by Admin. Reason: ${rejection_notes.slice(0, 120)}`,
              '/portal/client/book-service'
            );
          }
          if (r.assigned_tl_id) {
            await sendNotification(
              r.assigned_tl_id,
              '❌ Request Rejected by Admin',
              `Request #${id} for "${r.service_type || 'Service'}" was rejected by Admin. Reason: ${rejection_notes.slice(0, 120)}`,
              '/portal/leader/client-requests'
            );
          }
        }
      } catch (nErr) {
        console.warn('Rejection notification error:', nErr);
      }

      try {
        const adminUser = await checkAuth(request);
        await logSecurityEvent({
          request,
          action: 'ADMIN_REJECT_CLIENT_REQUEST',
          category: 'ADMIN_PANEL',
          status: 'WARNING',
          user: adminUser,
          details: {
            requestId: id,
            reason: rejection_notes
          }
        });
      } catch (auditErr) {
        console.warn('Audit log error on reject request:', auditErr);
      }

      return NextResponse.json({ success: true, message: 'Request rejected successfully.' });
    }

    // 1. Action: regenerate_caption (triggered on-demand by Team Leader via AI button)
    if (action === 'regenerate_caption') {
      const [rows] = await db.query(`
        SELECT sr.id, sr.clientId, sr.service_type, sr.requirements, sr.attachment, sr.drive_url,
               t.fileUrl as task_file_url, t.completion_note,
               c.name as client_name,
               cd.company_name
        FROM service_requests sr
        LEFT JOIN tasks t ON sr.id COLLATE utf8mb4_unicode_ci = t.project_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN employees c ON sr.clientId COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
        LEFT JOIN client_details cd ON sr.clientId COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci
        WHERE sr.id = ?
      `, [id]);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Service request not found.' }, { status: 404 });
      }

      const sr = rows[0];
      function extractFirstImg(val) {
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

      const detectedBanner = extractFirstImg(sr.task_file_url) || extractFirstImg(sr.attachment) || extractFirstImg(sr.drive_url);
      const brandName = sr.company_name || sr.client_name || 'Flymedia Technology';
      const requirement = sr.requirements || sr.completion_note || 'Engaging creative banner post';

      const aiResult = await generateAICaption({
        requirement,
        brandName,
        bannerUrl: detectedBanner
      });

      // Persist regenerated caption & hashtags in service_requests & client_smo_requests
      await db.execute(
        `UPDATE service_requests SET caption = ?, hashtags = ? WHERE id = ?`,
        [aiResult.caption, aiResult.hashtags, id]
      );
      try {
        await db.execute(
          `UPDATE client_smo_requests SET caption = ?, hashtags = ? WHERE id = ?`,
          [aiResult.caption, aiResult.hashtags, id]
        );
      } catch (e) {}

      return NextResponse.json({
        success: true,
        caption: aiResult.caption,
        hashtags: aiResult.hashtags,
        message: 'Caption and hashtags regenerated successfully!'
      });
    }

    // 2. Action: update_caption / save edits made by TL
    if (action === 'update_caption') {
      await db.execute(
        `UPDATE service_requests SET caption = ?, hashtags = ? WHERE id = ?`,
        [caption || '', hashtags || '', id]
      );
      try {
        await db.execute(
          `UPDATE client_smo_requests SET caption = ?, hashtags = ? WHERE id = ?`,
          [caption || '', hashtags || '', id]
        );
      } catch (e) {}
      return NextResponse.json({ success: true, message: 'Caption & hashtags updated.' });
    }
    
    // 3. Update assigned_tl_id and/or drive_url if provided
    if (assigned_tl_id !== undefined || drive_url !== undefined) {
      const updates = [];
      const params = [];
      if (assigned_tl_id !== undefined) {
        updates.push('assigned_tl_id = ?');
        params.push(assigned_tl_id || null);
      }
      if (drive_url !== undefined) {
        updates.push('drive_url = ?');
        params.push(drive_url || null);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }
      params.push(id);
      await db.query(`UPDATE service_requests SET ${updates.join(', ')} WHERE id = ?`, params);

      if (assigned_tl_id) {
        try {
          await sendNotification(
            assigned_tl_id,
            'New Client Request',
            'A new client requirement has been assigned to you.',
            '/portal/leader/client-requests'
          );
        } catch (notifErr) {
          console.error('Failed to send notification to TL:', notifErr);
        }
      }
      return NextResponse.json({ success: true });
    }

    // 4. Update status logic (e.g., Deliver to Client)
    if (status) {
      const updates = ['status = ?'];
      const params = [status];
      if (caption !== undefined) {
        updates.push('caption = ?');
        params.push(caption);
      }
      if (hashtags !== undefined) {
        updates.push('hashtags = ?');
        params.push(hashtags);
      }
      params.push(id);

      await db.query(
        `UPDATE service_requests SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      if (status === 'Completed') {
        try {
          await db.query(
            `UPDATE tasks SET status = 'Completed', completedAt = ? WHERE project_id = ?`,
            [new Date().toISOString(), id]
          );
        } catch (e) {
          console.error('Failed to sync tasks status on request completion:', e);
        }

        // Deliver approved banner with final caption & hashtags to Client SMO queue
        try {
          await deliverToClientSMO(id, db, { caption, hashtags });
        } catch (smoDeliverErr) {
          console.error('Failed to auto-deliver to client SMO:', smoDeliverErr);
        }
      }
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: 'No update data provided' });
  } catch (err) {
    console.error('Update Service Request Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const dismissNoticeId = searchParams.get('dismissNoticeId');
    const clientId = searchParams.get('clientId');
    const viewerRole = searchParams.get('viewerRole') || request.headers.get('x-user-role');

    // Handle dismissing a deleted service request notice by client or admin
    if (dismissNoticeId) {
      const db = await getDbConnection();
      try {
        if (clientId) {
          await db.query('UPDATE service_request_deletions SET dismissed_by_client = 1 WHERE id = ? AND client_id = ?', [dismissNoticeId, clientId]);
        } else {
          await db.query('UPDATE service_request_deletions SET dismissed_by_client = 1 WHERE id = ?', [dismissNoticeId]);
        }
      } catch (e) {
        console.warn('Error dismissing notice:', e);
      }
      return NextResponse.json({ success: true, message: 'Notice dismissed successfully' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing request id' }, { status: 400 });
    }

    // Role check: Admin, Team Leader, or staff can delete client requests
    const normalizedRole = (viewerRole || '').trim().toLowerCase();
    const isAuthorized = !viewerRole || [
      'admin', 'management', 'superadmin',
      'team leader', 'tl', 'leader', 'team lead',
      'smo', 'specialist', 'designer', 'employee', 'staff'
    ].some(r => normalizedRole.includes(r)) || !normalizedRole.includes('client');

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: You do not have permission to delete client requests' }, { status: 403 });
    }

    const db = await getDbConnection();

    // 1. Fetch request details before deleting so we can record notice and inform client
    let targetReq = null;
    const [existingRows] = await db.query('SELECT * FROM service_requests WHERE id = ?', [id]);
    if (existingRows.length > 0) {
      targetReq = existingRows[0];
    } else {
      const [smoRows] = await db.query('SELECT * FROM client_smo_requests WHERE id = ?', [id]);
      if (smoRows.length > 0) {
        targetReq = {
          id: smoRows[0].id,
          clientId: smoRows[0].client_id,
          service_type: 'SMO / Social Media',
          requirements: smoRows[0].requirements
        };
      }
    }

    if (!targetReq) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }
    const targetClientId = targetReq.clientId;
    const targetServiceType = targetReq.service_type || 'Service Request';

    // 2. Ensure service_request_deletions table exists and log deletion
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
      const deletionId = 'del_' + Date.now() + Math.random().toString(36).substring(2, 7);
      await db.query(
        `INSERT INTO service_request_deletions (id, request_id, client_id, service_type, requirements, deleted_by, deleted_at, dismissed_by_client)
         VALUES (?, ?, ?, ?, ?, 'Admin', NOW(), 0)`,
        [deletionId, targetReq.id, targetClientId, targetServiceType, targetReq.requirements || '']
      );
    } catch (delLogErr) {
      console.warn('Error recording service request deletion:', delLogErr);
    }

    // 3. Post notification note into client_notes so client sees related explanation in Project Notes
    try {
      const noteId = 'cn_' + Date.now() + Math.random().toString(36).substring(2, 7);
      const noticeText = `⚠️ [Admin Notice] Your service request for "${targetServiceType}" has been cancelled and removed by Administration. If you have questions or wish to submit updated requirements, please reply here.`;
      await db.query(
        `INSERT INTO client_notes (id, client_id, note, created_by, created_at, role, status)
         VALUES (?, ?, ?, 'Admin', NOW(), 'Admin', 'active')`,
        [noteId, targetClientId, noticeText]
      );
    } catch (noteErr) {
      console.warn('Error posting deletion note to client_notes:', noteErr);
    }

    // 4. Send in-app & push notification to client
    try {
      await sendNotification(
        targetClientId,
        'Service Request Removed',
        `Your service request for "${targetServiceType}" has been removed by Admin.`,
        '/portal/client/book-service'
      );
    } catch (notifErr) {
      console.warn('Error sending deletion notification:', notifErr);
    }

    // 5. Clean up any tasks linked via project_id
    try {
      await db.query('DELETE FROM tasks WHERE project_id = ?', [id]);
    } catch (taskErr) {
      console.warn('Error deleting linked tasks:', taskErr);
    }

    // 6. Delete from service_requests
    const [result] = await db.query('DELETE FROM service_requests WHERE id = ?', [id]);

    // 6b. Delete from client_smo_requests
    try {
      await db.query('DELETE FROM client_smo_requests WHERE id = ?', [id]);
    } catch (smoErr) {
      console.warn('Error deleting from client_smo_requests:', smoErr);
    }

    // 7. Emit real-time socket event so active client panel sessions instantly delete it and show message
    try {
      const { io } = require('socket.io-client');
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
      socket.emit('service-request-deleted', {
        requestId: id,
        clientId: targetClientId,
        serviceType: targetServiceType,
        message: `Your service request for "${targetServiceType}" has been removed by Admin.`
      });
      setTimeout(() => socket.disconnect(), 1000);
    } catch (sockErr) {
      console.warn('Socket emit error on delete service request:', sockErr);
    }

    try {
      const adminUser = await checkAuth(request);
      await logSecurityEvent({
        request,
        action: 'ADMIN_DELETE_CLIENT_REQUEST',
        category: 'ADMIN_PANEL',
        status: 'WARNING',
        user: adminUser,
        details: {
          requestId: id,
          clientId: targetClientId,
          serviceType: targetServiceType
        }
      });
    } catch (auditErr) {
      console.warn('Audit log error on delete request:', auditErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Client request deleted successfully and client notified' 
    });
  } catch (err) {
    console.error('Delete Service Request Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Automatically delivers an approved banner to the Client SMO queue
 * with an approved or AI-generated social media caption and trending hashtags.
 */
async function deliverToClientSMO(requestId, db, options = {}) {
  try {
    const [rows] = await db.query(`
      SELECT sr.id, sr.clientId, sr.service_type, sr.requirements, sr.created_at, sr.attachment, sr.drive_url,
             sr.caption as sr_caption, sr.hashtags as sr_hashtags,
             t.fileUrl as task_file_url, t.assignedToName as designer_name, t.completion_note,
             c.name as client_name,
             cd.company_name
      FROM service_requests sr
      LEFT JOIN tasks t ON sr.id COLLATE utf8mb4_unicode_ci = t.project_id COLLATE utf8mb4_unicode_ci
      LEFT JOIN employees c ON sr.clientId COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN client_details cd ON sr.clientId COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci
      WHERE sr.id = ?
    `, [requestId]);

    if (!rows || rows.length === 0) return;
    const sr = rows[0];

    function extractFirstImg(val) {
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

    const detectedBanner = extractFirstImg(sr.task_file_url) || extractFirstImg(sr.attachment) || extractFirstImg(sr.drive_url);
    const brandName = sr.company_name || sr.client_name || 'Flymedia Technology';

    let finalCaption = (options.caption !== undefined ? options.caption : sr.sr_caption || '').trim();
    let finalHashtags = (options.hashtags !== undefined ? options.hashtags : sr.sr_hashtags || '').trim();

    // If caption was not already generated, generate now
    if (!finalCaption) {
      const aiResult = await generateAICaption({
        requirement: sr.requirements || sr.completion_note || 'Engaging creative banner post',
        brandName,
        bannerUrl: detectedBanner
      });
      finalCaption = aiResult.caption;
      finalHashtags = aiResult.hashtags;
    }

    // Ensure client_smo_requests table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS client_smo_requests (
        id VARCHAR(50) PRIMARY KEY,
        client_id VARCHAR(50) NOT NULL,
        requirements TEXT,
        banner_url VARCHAR(500),
        caption TEXT,
        hashtags VARCHAR(500),
        platforms VARCHAR(255) DEFAULT '["facebook", "instagram"]',
        status VARCHAR(50) DEFAULT 'Ready for Approval',
        designer_id VARCHAR(50),
        designer_name VARCHAR(100),
        revision_notes TEXT,
        scheduled_at DATETIME NULL,
        published_at DATETIME NULL,
        fb_post_id VARCHAR(100),
        ig_post_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert or update client_smo_requests with 'Ready for Approval'
    await db.query(`
      INSERT INTO client_smo_requests (
        id, client_id, requirements, banner_url, caption, hashtags, status, designer_name, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 'Ready for Approval', ?, NOW()
      )
      ON DUPLICATE KEY UPDATE
        banner_url = COALESCE(VALUES(banner_url), client_smo_requests.banner_url),
        caption = VALUES(caption),
        hashtags = VALUES(hashtags),
        status = IF(client_smo_requests.status IN ('Published', 'Scheduled'), client_smo_requests.status, 'Ready for Approval'),
        designer_name = COALESCE(VALUES(designer_name), client_smo_requests.designer_name)
    `, [
      sr.id,
      sr.clientId,
      sr.requirements,
      detectedBanner,
      finalCaption,
      finalHashtags,
      sr.designer_name || 'Design Specialist'
    ]);

    // Send push notification to client
    try {
      await sendNotification(
        sr.clientId,
        '🎉 Creative Banner & Caption Ready!',
        'Your banner is ready for review with an AI-generated caption. Check, edit, and post now.',
        '/portal/client/smo'
      );
    } catch (notifErr) {
      console.error('Failed to notify client on SMO delivery:', notifErr);
    }
  } catch (err) {
    console.error('deliverToClientSMO error:', err);
  }
}
