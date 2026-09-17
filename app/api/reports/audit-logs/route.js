import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    let auditLogs = [];
    
    // Fetch recent audit logs from work_submission_history
    try {
      const [workRows] = await db.query(`
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
      `);
      if (workRows) {
        auditLogs = auditLogs.concat(workRows);
      }
    } catch (err) {
      console.warn('work_submission_history fetch failed:', err.message);
    }

    // Fetch assignment history
    try {
      const [assignRows] = await db.query(`
        SELECT 
          a.id, 
          CONCAT('System ', a.systemNumber) as submission_id,
          a.assignedBy as changed_by,
          NULL as old_status,
          a.action as new_status,
          CONCAT('Assigned to ', e.name) as comment,
          a.timestamp as created_at,
          a.assignedBy as employee_name
        FROM assignment_history a
        LEFT JOIN employees e ON (a.employeeId COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
      `);
      if (assignRows) {
        auditLogs = auditLogs.concat(assignRows);
      }
    } catch (err) {
      console.warn('assignment_history fetch failed:', err.message);
    }

    // Sort combined logs by date descending and limit to 100
    auditLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    auditLogs = auditLogs.slice(0, 100);

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
