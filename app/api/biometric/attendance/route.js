import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { getIstTimeInfo } from '../../utils/istDate.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('filterType') || 'daily';
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const employeeId = searchParams.get('employee_id') || searchParams.get('employeeId');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const deptParam = searchParams.get('department');

    const pool = getPool();
    const { dateStr: todayStr } = getIstTimeInfo();

    let rWhere = '';
    let sWhere = '';
    const dateParams = [];
    const sessionParams = [];

    if (filterType === 'daily') {
      const targetDate = dateParam || todayStr;
      rWhere += ' AND r.attendance_date = ? ';
      sWhere += ' AND s.attendance_date = ? ';
      dateParams.push(targetDate);
      sessionParams.push(targetDate);
    } else if (filterType === 'monthly') {
      const targetMonth = monthParam || todayStr.substring(0, 7);
      rWhere += ' AND r.attendance_date LIKE ? ';
      sWhere += ' AND s.attendance_date LIKE ? ';
      const p = `${targetMonth}%`;
      dateParams.push(p);
      sessionParams.push(p);
    } else if (filterType === 'weekly' || filterType === 'custom') {
      if (startDateParam && endDateParam) {
        rWhere += ' AND r.attendance_date BETWEEN ? AND ? ';
        sWhere += ' AND s.attendance_date BETWEEN ? AND ? ';
        dateParams.push(startDateParam, endDateParam);
        sessionParams.push(startDateParam, endDateParam);
      } else if (dateParam) {
        rWhere += ' AND r.attendance_date = ? ';
        sWhere += ' AND s.attendance_date = ? ';
        dateParams.push(dateParam);
        sessionParams.push(dateParam);
      }
    } else if (filterType === 'yearly') {
      const targetYear = yearParam || todayStr.substring(0, 4);
      rWhere += ' AND r.attendance_date LIKE ? ';
      sWhere += ' AND s.attendance_date LIKE ? ';
      const p = `${targetYear}%`;
      dateParams.push(p);
      sessionParams.push(p);
    }

    if (employeeId) {
      rWhere += ' AND r.employee_id = ? ';
      sWhere += ' AND s.employee_id = ? ';
      dateParams.push(employeeId);
      sessionParams.push(employeeId);
    }

    if (deptParam && deptParam !== 'all') {
      rWhere += ' AND e.department = ? ';
      sWhere += ' AND e.department = ? ';
      dateParams.push(deptParam);
      sessionParams.push(deptParam);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      rWhere += ' AND (LOWER(e.name) LIKE ? OR LOWER(e.id) LIKE ? OR LOWER(e.department) LIKE ?) ';
      sWhere += ' AND (LOWER(e.name) LIKE ? OR LOWER(e.id) LIKE ? OR LOWER(e.department) LIKE ?) ';
      dateParams.push(term, term, term);
      sessionParams.push(term, term, term);
    }

    // 1. Fetch Room Summary records
    const [summary] = await pool.execute(`
      SELECT 
        r.attendance_date,
        e.id as employee_id,
        e.name as employee_name,
        e.department,
        COALESCE(fm.fingerprint_slot, r.fingerprint_slot) as fingerprint_slot,
        COUNT(CASE WHEN r.punch_type = 'PUNCH_IN' THEN 1 END) as total_punch_in,
        COUNT(CASE WHEN r.punch_type = 'PUNCH_OUT' THEN 1 END) as total_punch_out,
        SUM(COALESCE(r.duration_minutes, 0)) as total_inside_minutes,
        MIN(CASE WHEN r.punch_type = 'PUNCH_IN' THEN r.punch_time END) as first_punch_in,
        MAX(r.punch_time) as last_punch_time,
        (
          SELECT punch_type FROM biometric_room_attendance sub 
          WHERE CONVERT(sub.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci 
            AND sub.attendance_date = r.attendance_date 
          ORDER BY sub.id DESC LIMIT 1
        ) as last_punch_type,
        CASE 
          WHEN r.attendance_date = ? AND EXISTS(
            SELECT 1 FROM biometric_door_sessions s 
            WHERE CONVERT(s.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci 
              AND s.status = 'INSIDE' AND s.out_time IS NULL
          ) THEN 'INSIDE'
          ELSE 'OUTSIDE'
        END as current_room_status
      FROM biometric_room_attendance r
      JOIN employees e ON CONVERT(r.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      LEFT JOIN fingerprint_mappings fm ON CONVERT(fm.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      WHERE 1=1 ${rWhere}
      GROUP BY r.attendance_date, e.id, e.name, e.department, COALESCE(fm.fingerprint_slot, r.fingerprint_slot)
      ORDER BY r.attendance_date DESC, last_punch_time DESC
      LIMIT 500
    `, [todayStr, ...dateParams]);

    // 2. Fetch Sessions
    const [sessions] = await pool.execute(`
      SELECT s.*, e.name as employee_name, e.department
      FROM biometric_door_sessions s
      JOIN employees e ON CONVERT(s.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      WHERE 1=1 ${sWhere}
      ORDER BY s.in_time DESC LIMIT 500
    `, sessionParams);

    // 3. Currently Inside Room
    const [currently_inside] = await pool.execute(`
      SELECT s.*, e.name as employee_name, e.department
      FROM biometric_door_sessions s
      JOIN employees e ON CONVERT(s.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      WHERE s.status = 'INSIDE' AND s.out_time IS NULL
      ORDER BY s.in_time DESC
    `);

    return NextResponse.json({
      success: true,
      summary,
      sessions,
      currently_inside,
      counts: {
        total_records: summary.length,
        inside_now: currently_inside.length
      }
    });
  } catch (error) {
    console.error('Biometric attendance GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
