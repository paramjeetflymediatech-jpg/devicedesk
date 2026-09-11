import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    
    // Fetch recent audit logs from work_submission_history
    const [auditLogs] = await db.query(`
      SELECT 
        h.id, 
        h.submission_id, 
        h.changed_by, 
        h.old_status, 
        h.new_status, 
        h.comment, 
        h.created_at,
        e.name as employee_name
      FROM work_submission_history h
      LEFT JOIN employees e ON h.changed_by = e.id
      ORDER BY h.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      data: auditLogs
    });
  } catch (err) {
    console.error('Audit Logs API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
