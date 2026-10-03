import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { sendNotification } from '../../utils/notificationsHelper.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const db = await getDbConnection();
    let rows;

    if (clientId) {
      [rows] = await db.query(
        `SELECT r.*, c.name as client_name, tl.name as tl_name FROM service_requests r LEFT JOIN employees c ON r.clientId = c.id LEFT JOIN employees tl ON r.assigned_tl_id = tl.id WHERE r.clientId = ? ORDER BY r.created_at DESC`,
        [clientId]
      );
    } else {
      [rows] = await db.query(
        `SELECT r.*, c.name as client_name, tl.name as tl_name FROM service_requests r LEFT JOIN employees c ON r.clientId = c.id LEFT JOIN employees tl ON r.assigned_tl_id = tl.id ORDER BY r.created_at DESC`
      );
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch Service Requests Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { clientId, service_type, requirements, attachment } = await request.json();
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

    // Verify client has an active package before allowing service booking
    const [activePkgs] = await db.query(
      `SELECT cpo.id, p.name FROM client_package_overrides cpo 
       LEFT JOIN packages p ON cpo.package_id = p.id 
       WHERE cpo.client_id = ? AND (cpo.status = 'Active' OR cpo.status = 'active')`,
      [clientId]
    );

    if (!activePkgs || activePkgs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please buy a package first. You need an active package subscription to book services.'
      }, { status: 400 });
    }

    const id = 'req_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO service_requests (id, clientId, service_type, requirements, status, created_at, attachment)
       VALUES (?, ?, ?, ?, 'Pending', ?, ?)`,
      [id, clientId, service_type, requirements, now, attachment || null]
    );

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
    const { id, status, assigned_tl_id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // Update assigned_tl_id if provided
    if (assigned_tl_id !== undefined) {
      await db.query(`UPDATE service_requests SET assigned_tl_id = ? WHERE id = ?`, [assigned_tl_id || null, id]);
      if (assigned_tl_id) {
        await sendNotification(
          assigned_tl_id,
          'New Client Request',
          'A new client requirement has been assigned to you.',
          '/portal/leader/client-requests'
        );
      }
      return NextResponse.json({ success: true });
    }

    // Update status logic
    if (status) {
      await db.query(
        `UPDATE service_requests SET status = ? WHERE id = ?`,
        [status, id]
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
      }
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: 'No update data provided' });
  } catch (err) {
    console.error('Update Service Request Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
