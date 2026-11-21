import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { getOrCreateTelemetry, rssiToPercent, rssiToQuality } from '../telemetry.js';
import { getIstTimeInfo } from '../../utils/istDate.js';

export async function GET(request) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(request.url);

    const filterType = searchParams.get('filterType') || 'daily';
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const employeeIdParam = searchParams.get('employeeId');
    const searchParam = searchParams.get('search');
    const deptParam = searchParams.get('department');

    // 1. Devices with live telemetry
    const [dbDevices] = await pool.execute(`
      SELECT d.id, d.device_id, d.name, d.location, d.is_active, d.last_seen_at,
        (SELECT COUNT(*) FROM fingerprint_mappings fm WHERE fm.device_id = d.device_id AND fm.is_active = 1) as mapped_count
      FROM biometric_devices d
      ORDER BY d.id ASC
    `);

    const now = Date.now();
    const devices = dbDevices.map(d => {
      const tele = getOrCreateTelemetry(d.device_id);
      const secondsSincePing = tele.last_ping_ms > 0 ? Math.max(0, Math.floor((now - tele.last_ping_ms) / 1000)) : null;
      // Online if ping received within last 15 seconds (ESP32 pings every 5s)
      const isOnline = secondsSincePing !== null && secondsSincePing <= 15;

      return {
        ...d,
        is_online: isOnline,
        seconds_since_last_seen: secondsSincePing,
        wifi_ssid: tele.wifi_ssid,
        ip_address: tele.ip_address,
        rssi: isOnline ? tele.rssi : null,
        signal_percent: isOnline ? rssiToPercent(tele.rssi) : 0,
        signal_quality: rssiToQuality(tele.rssi, isOnline),
        sensor_ready: tele.sensor_ready,
        oled_ready: tele.oled_ready,
        templates_count: tele.templates_count,
        queued_events: tele.queued_events,
        uptime_seconds: tele.uptime_seconds,
        display_line1: isOnline ? tele.display_line1 : 'ESP32 Offline',
        display_line2: isOnline ? tele.display_line2 : (secondsSincePing !== null ? `Lost ${secondsSincePing}s ago` : 'Waiting for ping...'),
        ping_count: tele.ping_count,
        rssi_history: tele.rssi_history
      };
    });

    // 2. Enrolled Fingerprint Mappings
    const [mappings] = await pool.execute(`
      SELECT fm.*, e.name as employee_name, e.email, e.role, e.department, e.status as employee_status
      FROM fingerprint_mappings fm
      JOIN employees e ON CONVERT(fm.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      ORDER BY fm.fingerprint_slot ASC
    `);

    // 3. Recent Scan Logs
    const [recent_logs] = await pool.execute(`
      SELECT l.*, e.name as employee_name, e.department
      FROM biometric_scan_logs l
      LEFT JOIN employees e ON CONVERT(l.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      ORDER BY l.id DESC LIMIT 40
    `);

    // 4. Pending / In-progress Commands
    const [pending_commands] = await pool.execute(`
      SELECT bc.*, e.name as employee_name
      FROM biometric_commands bc
      LEFT JOIN employees e ON CONVERT(bc.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      WHERE bc.status IN ('PENDING', 'IN_PROGRESS')
      ORDER BY bc.id DESC LIMIT 10
    `);

    // 5. IoT Sessions (biometric_lab_attendance)
    const [lab_sessions] = await pool.execute(`
      SELECT b.*, e.name as employee_name, e.email, e.role, e.department
      FROM biometric_lab_attendance b
      JOIN employees e ON CONVERT(b.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      ORDER BY b.id DESC LIMIT 50
    `);

    // 6. Currently Inside / Active Room Sessions
    let currently_inside = [];
    try {
      const [insideRows] = await pool.execute(`
        SELECT s.*, e.name as employee_name, e.department
        FROM biometric_door_sessions s
        JOIN employees e ON CONVERT(s.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        WHERE s.status = 'INSIDE' AND s.out_time IS NULL
        ORDER BY s.in_time DESC
      `);
      currently_inside = insideRows;
    } catch (e) {
      // Fallback to biometric_lab_attendance if door sessions table is empty/missing
      const [labRows] = await pool.execute(`
        SELECT b.*, e.name as employee_name, e.department
        FROM biometric_lab_attendance b
        JOIN employees e ON CONVERT(b.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        WHERE b.status = 'IN_LAB' AND b.out_time IS NULL
        ORDER BY b.in_time DESC
      `);
      currently_inside = labRows;
    }

    // 7. Active Employees list for slot assignment modal
    const [employees] = await pool.execute(`
      SELECT id, name, email, role, department, biometric_id, status
      FROM employees
      WHERE status = 'Active' OR status IS NULL
      ORDER BY name ASC
    `);

    // 8. Room Movement Summary (Date-wise in/out counts per employee in IST)
    const { dateStr: todayStr, timeIso: serverTimeIso } = getIstTimeInfo();

    let room_summary = [];
    let room_sessions = [];
    let room_punches = [];

    // Construct filter clauses
    let rWhere = '';
    let sWhere = '';
    let pWhere = '';
    const dateParams = [];
    const sessionParams = [];
    const punchParams = [];

    if (filterType === 'daily') {
      const targetDate = dateParam || todayStr;
      rWhere += ' AND r.attendance_date = ? ';
      sWhere += ' AND s.attendance_date = ? ';
      pWhere += ' AND p.attendance_date = ? ';
      dateParams.push(targetDate);
      sessionParams.push(targetDate);
      punchParams.push(targetDate);
    } else if (filterType === 'monthly') {
      const targetMonth = monthParam || todayStr.substring(0, 7);
      rWhere += ' AND r.attendance_date LIKE ? ';
      sWhere += ' AND s.attendance_date LIKE ? ';
      pWhere += ' AND p.attendance_date LIKE ? ';
      const likePattern = `${targetMonth}%`;
      dateParams.push(likePattern);
      sessionParams.push(likePattern);
      punchParams.push(likePattern);
    } else if (filterType === 'weekly' || filterType === 'custom') {
      if (startDateParam && endDateParam) {
        rWhere += ' AND r.attendance_date BETWEEN ? AND ? ';
        sWhere += ' AND s.attendance_date BETWEEN ? AND ? ';
        pWhere += ' AND p.attendance_date BETWEEN ? AND ? ';
        dateParams.push(startDateParam, endDateParam);
        sessionParams.push(startDateParam, endDateParam);
        punchParams.push(startDateParam, endDateParam);
      } else if (dateParam) {
        rWhere += ' AND r.attendance_date = ? ';
        sWhere += ' AND s.attendance_date = ? ';
        pWhere += ' AND p.attendance_date = ? ';
        dateParams.push(dateParam);
        sessionParams.push(dateParam);
        punchParams.push(dateParam);
      }
    } else if (filterType === 'yearly') {
      const targetYear = yearParam || todayStr.substring(0, 4);
      rWhere += ' AND r.attendance_date LIKE ? ';
      sWhere += ' AND s.attendance_date LIKE ? ';
      pWhere += ' AND p.attendance_date LIKE ? ';
      const likePattern = `${targetYear}%`;
      dateParams.push(likePattern);
      sessionParams.push(likePattern);
      punchParams.push(likePattern);
    } else if (filterType === 'all') {
      // All time! No date clause
    }

    if (employeeIdParam) {
      rWhere += ' AND r.employee_id = ? ';
      sWhere += ' AND s.employee_id = ? ';
      pWhere += ' AND p.employee_id = ? ';
      dateParams.push(employeeIdParam);
      sessionParams.push(employeeIdParam);
      punchParams.push(employeeIdParam);
    }

    if (deptParam && deptParam !== 'all') {
      rWhere += ' AND e.department = ? ';
      sWhere += ' AND e.department = ? ';
      pWhere += ' AND e.department = ? ';
      dateParams.push(deptParam);
      sessionParams.push(deptParam);
      punchParams.push(deptParam);
    }

    if (searchParam && searchParam.trim()) {
      const term = `%${searchParam.trim().toLowerCase()}%`;
      rWhere += ' AND (LOWER(e.name) LIKE ? OR LOWER(e.id) LIKE ? OR LOWER(e.department) LIKE ?) ';
      sWhere += ' AND (LOWER(e.name) LIKE ? OR LOWER(e.id) LIKE ? OR LOWER(e.department) LIKE ?) ';
      pWhere += ' AND (LOWER(e.name) LIKE ? OR LOWER(e.id) LIKE ? OR LOWER(e.department) LIKE ?) ';
      dateParams.push(term, term, term);
      sessionParams.push(term, term, term);
      punchParams.push(term, term, term);
    }

    try {
      const [summaryRows] = await pool.execute(`
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
      room_summary = summaryRows;

      const [sessionRows] = await pool.execute(`
        SELECT s.*, e.name as employee_name, e.department
        FROM biometric_door_sessions s
        JOIN employees e ON CONVERT(s.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        WHERE 1=1 ${sWhere}
        ORDER BY s.in_time DESC LIMIT 500
      `, sessionParams);
      room_sessions = sessionRows;

      const [punchRows] = await pool.execute(`
        SELECT p.*, e.name as employee_name, e.department
        FROM biometric_room_attendance p
        JOIN employees e ON CONVERT(p.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        WHERE 1=1 ${pWhere}
        ORDER BY p.punch_time DESC LIMIT 500
      `, punchParams);
      room_punches = punchRows;
    } catch (e) {
      console.warn('Room attendance summary error:', e.message);
    }

    return NextResponse.json({
      success: true,
      server_time: serverTimeIso,
      devices,
      mappings,
      recent_logs,
      pending_commands,
      lab_sessions,
      currently_in_lab: currently_inside,
      currently_inside,
      room_summary,
      room_sessions,
      room_punches,
      employees
    });
  } catch (error) {
    console.error('Biometric status GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
