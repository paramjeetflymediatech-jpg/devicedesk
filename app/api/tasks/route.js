import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import { sendNotification } from '../utils/notificationsHelper.js';

export async function GET() {
  try {
    const db = await getDbConnection();

    // Ensure project_id column exists in tasks table dynamically
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN project_id VARCHAR(50)`);
    } catch (e) {}

    const [rows] = await db.query(
      `SELECT t.*, 
       p.name as project_name, 
       COALESCE(c.name, sc.name) as client_name,
       a.name as assigned_to_name,
       sr.attachment as client_attachment,
       sr.service_type as client_service_type,
       sr.requirements as client_requirements,
       sr.clientId as client_id
       FROM tasks t
       LEFT JOIN projects p ON (t.project_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN employees c ON (p.client_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN service_requests sr ON (t.project_id COLLATE utf8mb4_unicode_ci = sr.id COLLATE utf8mb4_unicode_ci)
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
    const taskFileUrl = fileUrl || attachment || null;

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
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status.' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.execute(`UPDATE tasks SET status = ? WHERE id = ?`, [status, id]);

    // If task has a project_id (service request), update that too if completed
    if (status === 'Completed') {
      try {
        const [rows] = await db.query('SELECT project_id FROM tasks WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].project_id) {
          await db.execute(`UPDATE service_requests SET status = 'For TL Review' WHERE id = ?`, [rows[0].project_id]);
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
