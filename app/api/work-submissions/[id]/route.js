import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { new_status, comment, changed_by } = await request.json();

    if (!new_status || !changed_by) {
      return NextResponse.json({ error: 'new_status and changed_by are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Get current status
    const [existing] = await db.query('SELECT status FROM work_submissions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }
    const old_status = existing[0].status;

    // Update submission
    await db.execute(
      `UPDATE work_submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [new_status, id]
    );

    // Add to history log
    const historyId = 'hist_' + Date.now();
    await db.execute(
      `INSERT INTO work_submission_history (id, submission_id, changed_by, old_status, new_status, comment) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [historyId, id, changed_by, old_status, new_status, comment || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Workflow status updated',
      data: { id, old_status, new_status }
    });
  } catch (err) {
    console.error('Update Work Submission API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
