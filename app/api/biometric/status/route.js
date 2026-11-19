import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { getOrCreateTelemetry, rssiToPercent, rssiToQuality } from '../telemetry.js';

export async function GET() {
  try {
    const pool = getPool();

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

    // 6. Currently Inside / Active Sessions
    const [currently_in_lab] = await pool.execute(`
      SELECT b.*, e.name as employee_name, e.department
      FROM biometric_lab_attendance b
      JOIN employees e ON CONVERT(b.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      WHERE b.status = 'IN_LAB' AND b.out_time IS NULL
      ORDER BY b.in_time DESC
    `);

    // 7. Active Employees list for slot assignment modal
    const [employees] = await pool.execute(`
      SELECT id, name, email, role, department, biometric_id, status
      FROM employees
      WHERE status = 'Active' OR status IS NULL
      ORDER BY name ASC
    `);

    // 8. Room Movement Summary (Today's in/out counts per employee)
    const nowDate = new Date();
    const istDate = new Date(nowDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const yyyy = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    let room_summary = [];
    let room_sessions = [];
    let room_punches = [];

    try {
      const [summaryRows] = await pool.execute(`
        SELECT 
          e.id as employee_id,
          e.name as employee_name,
          e.department,
          fm.fingerprint_slot,
          COUNT(CASE WHEN r.punch_type = 'PUNCH_IN' THEN 1 END) as total_punch_in,
          COUNT(CASE WHEN r.punch_type = 'PUNCH_OUT' THEN 1 END) as total_punch_out,
          SUM(COALESCE(r.duration_minutes, 0)) as total_inside_minutes,
          MAX(r.punch_time) as last_punch_time,
          (
            SELECT punch_type FROM biometric_room_attendance sub 
            WHERE CONVERT(sub.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci 
              AND sub.attendance_date = ? 
            ORDER BY sub.id DESC LIMIT 1
          ) as last_punch_type,
          CASE 
            WHEN EXISTS(
              SELECT 1 FROM biometric_door_sessions s 
              WHERE CONVERT(s.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci 
                AND s.status = 'INSIDE' AND s.out_time IS NULL
            ) THEN 'INSIDE'
            ELSE 'OUTSIDE'
          END as current_room_status
        FROM biometric_room_attendance r
        JOIN employees e ON CONVERT(r.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        LEFT JOIN fingerprint_mappings fm ON CONVERT(fm.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        WHERE r.attendance_date = ?
        GROUP BY e.id, e.name, e.department, fm.fingerprint_slot
        ORDER BY last_punch_time DESC
      `, [todayStr, todayStr]);
      room_summary = summaryRows;

      const [sessionRows] = await pool.execute(`
        SELECT s.*, e.name as employee_name, e.department
        FROM biometric_door_sessions s
        JOIN employees e ON CONVERT(s.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        WHERE s.attendance_date = ?
        ORDER BY s.in_time DESC LIMIT 100
      `, [todayStr]);
      room_sessions = sessionRows;

      const [punchRows] = await pool.execute(`
        SELECT p.*, e.name as employee_name, e.department
        FROM biometric_room_attendance p
        JOIN employees e ON CONVERT(p.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
        WHERE p.attendance_date = ?
        ORDER BY p.punch_time DESC LIMIT 100
      `, [todayStr]);
      room_punches = punchRows;
    } catch (e) {
      console.warn('Room attendance summary error:', e.message);
    }

    return NextResponse.json({
      success: true,
      server_time: new Date().toISOString(),
      devices,
      mappings,
      recent_logs,
      pending_commands,
      lab_sessions,
      currently_in_lab,
      currently_inside: currently_in_lab,
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
