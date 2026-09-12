import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    
    // Fetch recent audit logs from work_submission_history safely
    let auditLogs = [];
    try {
      const [rows] = await db.query(`
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
        LEFT JOIN employees e ON (h.changed_by COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
        ORDER BY h.created_at DESC
        LIMIT 100
      `);
      auditLogs = rows || [];
    } catch (queryErr) {
      console.warn('work_submission_history table query warning:', queryErr.message);
      try {
        const [rows] = await db.query(`SELECT * FROM work_submission_history ORDER BY created_at DESC LIMIT 100`);
        auditLogs = rows || [];
      } catch (fallbackErr) {
        auditLogs = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: auditLogs
    });
  } catch (err) {
    console.error('Audit Logs API Error:', err);
    return NextResponse.json({
      success: true,
      data: [],
      error: err.message
    }, { status: 200 });
  }
}
