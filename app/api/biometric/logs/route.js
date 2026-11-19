import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
    const action = searchParams.get('action');

    const pool = getPool();
    let query = `
      SELECT l.*, e.name as employee_name, e.department, e.role
      FROM biometric_scan_logs l
      LEFT JOIN employees e ON CONVERT(l.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      WHERE 1=1
    `;
    const params = [];

    if (action && action !== 'all') {
      query += ` AND l.action = ?`;
      params.push(action);
    }

    query += ` ORDER BY l.id DESC LIMIT ?`;
    params.push(limit);

    const [logs] = await pool.query(query, params);
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
