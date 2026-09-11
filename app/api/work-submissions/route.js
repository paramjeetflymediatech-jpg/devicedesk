import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const taskId = searchParams.get('task_id');

    let query = `SELECT * FROM work_submissions WHERE 1=1`;
    let params = [];

    if (projectId) {
      query += ` AND project_id = ?`;
      params.push(projectId);
    }
    if (taskId) {
      query += ` AND task_id = ?`;
      params.push(taskId);
    }

    query += ` ORDER BY created_at DESC`;

    const db = await getDbConnection();
    const [rows] = await db.query(query, params);

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Fetch Work Submissions API Error:', err);
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { task_id, project_id, submitted_by, description, file_url } = await request.json();

    if (!task_id || !project_id || !submitted_by) {
      return NextResponse.json({ error: 'task_id, project_id, and submitted_by are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const submissionId = 'sub_' + Date.now();
    const initialStatus = 'Draft';

    await db.execute(
      `INSERT INTO work_submissions (id, task_id, project_id, submitted_by, status, description, file_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [submissionId, task_id, project_id, submitted_by, initialStatus, description || null, file_url || null]
    );

    // Create an entry in work_submission_history
    const historyId = 'hist_' + Date.now();
    await db.execute(
      `INSERT INTO work_submission_history (id, submission_id, changed_by, old_status, new_status, comment) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [historyId, submissionId, submitted_by, null, initialStatus, 'Initial Draft Created']
    );

    return NextResponse.json({
      success: true,
      submission: { id: submissionId, task_id, project_id, status: initialStatus }
    });
  } catch (err) {
    console.error('Add Work Submission API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
