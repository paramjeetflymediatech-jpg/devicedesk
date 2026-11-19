import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const pool = getPool();
    let query = `
      SELECT b.*, e.name as employee_name, e.email, e.role, e.department
      FROM biometric_lab_attendance b
      JOIN employees e ON b.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND b.attendance_date = ?`;
      params.push(date);
    }
    if (status && status !== 'all') {
      query += ` AND b.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (e.name LIKE ? OR e.email LIKE ? OR e.id LIKE ?)`;
      const p = `%${search}%`;
      params.push(p, p, p);
    }

    query += ` ORDER BY b.id DESC LIMIT 150`;
    const [sessions] = await pool.query(query, params);

    // Currently inside
    const [currently_in] = await pool.execute(`
      SELECT b.*, e.name as employee_name, e.department, e.role
      FROM biometric_lab_attendance b
      JOIN employees e ON b.employee_id = e.id
      WHERE b.status = 'IN_LAB' AND b.out_time IS NULL
      ORDER BY b.in_time DESC
    `);

    // Today's total count
    const today = new Date().toISOString().split('T')[0];
    const [todayCountRow] = await pool.execute(
      'SELECT COUNT(*) as c FROM biometric_lab_attendance WHERE attendance_date = ?',
      [today]
    );
    const todayCount = todayCountRow[0]?.c || 0;

    // Enrolled employees count
    const [enrolledCountRow] = await pool.execute(
      'SELECT COUNT(*) as c FROM fingerprint_mappings WHERE is_active = 1'
    );
    const enrolledCount = enrolledCountRow[0]?.c || 0;

    return NextResponse.json({
      success: true,
      sessions,
      currently_in,
      summary: {
        inside_now: currently_in.length,
        entries_today: todayCount,
        enrolled_count: enrolledCount
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
