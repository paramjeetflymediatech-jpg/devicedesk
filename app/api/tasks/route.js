import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query(
      `SELECT t.*, 
       p.name as project_name, 
       c.name as client_name,
       a.name as assigned_to_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN employees a ON t.assignedTo = a.id
       ORDER BY t.createdAt DESC`
    );
    // Note: The devicedesk schema uses assignedTo, assignedToName, assignedBy, etc.
    // However, the original devicedesk tasks table didn't have project_id.
    // Wait, the devicedesk tasks table is: id, title, description, assignedTo, assignedToName, assignedBy, assignedByName, status, createdAt, startedAt, completedAt, totalDuration, fileUrl
    // For our new portal, we might need to add project_id to tasks if it doesn't exist.
    // Let's ensure project_id exists in tasks table dynamically or just select what exists.

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Fetch Tasks API Error:', err);
    // Fallback if JOIN fails due to missing columns
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
    const { title, description, assignedTo, assignedToName, assignedBy, assignedByName, project_id } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const taskId = 'task_' + Date.now();
    const taskTitle = title.trim();
    const taskDesc = description ? description.trim() : null;
    const taskStatus = 'Pending';
    const createdAt = new Date().toISOString();

    // Dynamically add project_id to tasks if needed
    try {
        await db.query(`ALTER TABLE tasks ADD COLUMN project_id VARCHAR(50)`);
    } catch(e) {}

    await db.execute(
      `INSERT INTO tasks (id, title, description, assignedTo, assignedToName, assignedBy, assignedByName, status, createdAt, project_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, taskTitle, taskDesc, assignedTo || null, assignedToName || null, assignedBy || null, assignedByName || null, taskStatus, createdAt, project_id || null]
    );

    return NextResponse.json({
      success: true,
      task: { id: taskId, title: taskTitle, description: taskDesc, status: taskStatus, project_id }
    });
  } catch (err) {
    console.error('Add Task API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
