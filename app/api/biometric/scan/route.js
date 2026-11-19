import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { authenticateBiometricDevice, getOrCreateTelemetry } from '../telemetry.js';

function firstNameOf(fullName) {
  return (fullName || 'Employee').trim().split(/\s+/)[0].slice(0, 14);
}

function getIstDateStrings() {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeIso = istDate.toISOString();
  const timeFormatted = istDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { dateStr, timeIso, timeFormatted, istDate };
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  // 1. Authenticate Hardware Terminal
  const auth = await authenticateBiometricDevice(request, body);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        status: 'UNAUTHORIZED',
        error: auth.error,
        display_line1: auth.display_line1,
        display_line2: auth.display_line2
      },
      { status: auth.status }
    );
  }

  const device = auth.device;
  const tele = getOrCreateTelemetry(device.device_id);
  tele.last_ping_ms = Date.now();

  const { fingerprint_slot, event_id, scanned_at } = body;
  if (fingerprint_slot === undefined || fingerprint_slot === null || isNaN(Number(fingerprint_slot))) {
    return NextResponse.json(
      {
        status: 'ERROR',
        error: 'Valid numeric fingerprint_slot is required.',
        display_line1: 'Invalid Scan',
        display_line2: 'No Slot ID'
      },
      { status: 400 }
    );
  }

  const slot = Number(fingerprint_slot);
  const safeEventId = event_id ? String(event_id).trim() : `${device.device_id}-${slot}-${Date.now()}`;
  const pool = getPool();

  // 2. Idempotency check
  const [existingLogs] = await pool.execute(
    'SELECT * FROM biometric_scan_logs WHERE event_id = ? LIMIT 1',
    [safeEventId]
  );
  if (existingLogs && existingLogs.length > 0) {
    const existing = existingLogs[0];
    return NextResponse.json({
      status: existing.action,
      duplicate: true,
      message: existing.message || 'Event already processed.',
      display_line1: 'Already Synced',
      display_line2: existing.action
    });
  }

  // 3. Lookup employee mapped to (device_id, fingerprint_slot)
  const [mappings] = await pool.execute(`
    SELECT fm.*, e.id as emp_id, e.name as emp_name, e.email as emp_email, 
           e.role as emp_role, e.department as emp_dept, e.status as emp_status
    FROM fingerprint_mappings fm
    JOIN employees e ON CONVERT(fm.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
    WHERE fm.device_id = ? AND fm.fingerprint_slot = ? AND fm.is_active = 1
    LIMIT 1
  `, [device.device_id, slot]);

  if (!mappings || mappings.length === 0) {
    await pool.execute(`
      INSERT INTO biometric_scan_logs (event_id, device_id, fingerprint_slot, employee_id, action, message)
      VALUES (?, ?, ?, NULL, 'REJECTED_UNKNOWN', ?)
    `, [safeEventId, device.device_id, slot, `Unmapped fingerprint slot #${slot}`]);

    tele.display_line1 = 'Unregistered';
    tele.display_line2 = `Slot #${slot}`;
    tele.last_event_type = 'REJECTED';

    return NextResponse.json(
      {
        status: 'REJECTED',
        error: `Fingerprint slot #${slot} is not assigned to any employee.`,
        display_line1: 'Unregistered',
        display_line2: `Slot #${slot}`
      },
      { status: 404 }
    );
  }

  const mapping = mappings[0];
  const employeeId = mapping.emp_id;
  const employeeName = mapping.emp_name;
  const shortName = firstNameOf(employeeName);

  // 4. 30-second cooldown check (prevent accidental double door / sensor taps)
  const [recentScans] = await pool.execute(`
    SELECT id, created_at FROM biometric_scan_logs
    WHERE employee_id = ? AND action IN ('PUNCH_IN', 'PUNCH_OUT', 'LAB_IN', 'LAB_OUT')
      AND created_at >= (NOW() - INTERVAL 30 SECOND)
    ORDER BY id DESC LIMIT 1
  `, [employeeId]);

  if (recentScans && recentScans.length > 0) {
    await pool.execute(`
      INSERT INTO biometric_scan_logs (event_id, device_id, fingerprint_slot, employee_id, action, message)
      VALUES (?, ?, ?, ?, 'COOLDOWN', 'Ignored duplicate scan within 30s cooldown')
    `, [safeEventId, device.device_id, slot, employeeId]);

    tele.display_line1 = shortName;
    tele.display_line2 = 'Wait 30s...';
    tele.last_event_type = 'COOLDOWN';

    return NextResponse.json({
      status: 'COOLDOWN',
      employee: { id: employeeId, name: employeeName, department: mapping.emp_dept },
      message: 'Scan ignored: please wait 30 seconds between scans.',
      display_line1: shortName,
      display_line2: 'Wait 30s...'
    });
  }

  // 5. Determine whether PUNCH IN or PUNCH OUT
  const { dateStr, timeIso, timeFormatted, istDate } = getIstDateStrings();
  const deviceInfo = `ESP32 (${device.device_id}) - Slot #${slot}`;

  // Check 1: What was the employee's last biometric action?
  const [lastScanRows] = await pool.execute(`
    SELECT action FROM biometric_scan_logs
    WHERE employee_id = ? AND action IN ('PUNCH_IN', 'PUNCH_OUT')
    ORDER BY id DESC LIMIT 1
  `, [employeeId]);
  const lastBiometricAction = lastScanRows.length > 0 ? lastScanRows[0].action : null;

  // Check 2: Active unclosed biometric lab session
  const [openLabRows] = await pool.execute(`
    SELECT * FROM biometric_lab_attendance
    WHERE employee_id = ? AND status = 'IN_LAB' AND out_time IS NULL
    ORDER BY in_time DESC LIMIT 1
  `, [employeeId]);
  const openLabSession = openLabRows.length > 0 ? openLabRows[0] : null;

  // Check 3: Active open attendance record in attendance_records
  const [openAttendanceRows] = await pool.execute(`
    SELECT * FROM attendance_records
    WHERE employeeId = ? 
      AND punchInTime IS NOT NULL 
      AND (punchOutTime IS NULL OR TRIM(punchOutTime) = '')
    ORDER BY punchInTime DESC LIMIT 1
  `, [employeeId]);
  const openAttendanceRecord = openAttendanceRows.length > 0 ? openAttendanceRows[0] : null;

  // Check 4: Any attendance record for today (even if previously punched out)
  const [todayAttendanceRows] = await pool.execute(`
    SELECT * FROM attendance_records
    WHERE employeeId = ? AND date = ?
    ORDER BY punchInTime DESC LIMIT 1
  `, [employeeId, dateStr]);
  const todayRecord = todayAttendanceRows.length > 0 ? todayAttendanceRows[0] : null;

  // Smart Toggle Determination:
  // An employee is currently punched in if:
  // - Their last biometric scan was PUNCH_IN, OR
  // - They have an open lab session, OR
  // - They have an open attendance record without punchOutTime
  const isPunchedIn = (lastBiometricAction === 'PUNCH_IN') || Boolean(openLabSession) || Boolean(openAttendanceRecord);

  if (!isPunchedIn) {
    // -------------------------------------------------------------
    // PUNCH IN
    // -------------------------------------------------------------
    // Check if late (office grace time usually 09:40 AM)
    const punchHour = istDate.getHours();
    const punchMin = istDate.getMinutes();
    const totalMinutesSinceMidnight = punchHour * 60 + punchMin;
    const isLate = totalMinutesSinceMidnight > (9 * 60 + 40); // After 9:40 AM
    const attStatus = isLate ? 'Late' : 'Present';

    let attRecordId;
    if (todayRecord) {
      // Re-opening today's record (e.g. returning from break / re-entry)
      attRecordId = todayRecord.id;
      await pool.execute(`
        UPDATE attendance_records
        SET punchOutTime = NULL,
            status = ?,
            punchSource = 'ESP32_BIOMETRIC',
            deviceInfo = ?,
            remarks = CONCAT(COALESCE(remarks, ''), ' | ESP32 Punch In at ', ?)
        WHERE id = ?
      `, [attStatus, deviceInfo, timeFormatted, attRecordId]);
    } else {
      // New attendance record for today
      attRecordId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await pool.execute(`
        INSERT INTO attendance_records (
          id, employeeId, employeeName, date, punchInTime, punchOutTime, status,
          punchSource, deviceInfo, remarks, breakStatus
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'ESP32_BIOMETRIC', ?, ?, 'Completed')
      `, [
        attRecordId,
        employeeId,
        employeeName,
        dateStr,
        timeIso,
        attStatus,
        deviceInfo,
        `ESP32 Biometric Punch In at ${timeFormatted} (Slot #${slot})`
      ]);
    }

    // Count how many times this employee has punched IN today
    const [inCountRows] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM biometric_room_attendance
      WHERE employee_id = ? AND attendance_date = ? AND punch_type = 'PUNCH_IN'
    `, [employeeId, dateStr]);
    const punchInNumber = (inCountRows[0]?.cnt || 0) + 1;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Insert into biometric_door_sessions
    await pool.execute(`
      INSERT INTO biometric_door_sessions (
        session_id, employee_id, device_id, fingerprint_slot, attendance_date,
        in_time, status, session_number
      ) VALUES (?, ?, ?, ?, ?, NOW(), 'INSIDE', ?)
    `, [sessionId, employeeId, device.device_id, slot, dateStr, punchInNumber]);

    // Insert into biometric_room_attendance
    await pool.execute(`
      INSERT INTO biometric_room_attendance (
        employee_id, device_id, fingerprint_slot, attendance_date,
        punch_type, punch_time, punch_number, session_id
      ) VALUES (?, ?, ?, ?, 'PUNCH_IN', NOW(), ?, ?)
    `, [employeeId, device.device_id, slot, dateStr, punchInNumber, sessionId]);

    // Close any previous unclosed lab session before starting new one
    await pool.execute(`
      UPDATE biometric_lab_attendance
      SET status = 'OUT_OF_LAB', out_time = NOW()
      WHERE employee_id = ? AND status = 'IN_LAB' AND out_time IS NULL
    `, [employeeId]);

    // Insert into biometric_lab_attendance for IoT granular tracking
    await pool.execute(`
      INSERT INTO biometric_lab_attendance (
        employee_id, device_id, fingerprint_slot, attendance_date, in_time, status
      ) VALUES (?, ?, ?, ?, NOW(), 'IN_LAB')
    `, [employeeId, device.device_id, slot, dateStr]);

    // Audit log
    await pool.execute(`
      INSERT INTO biometric_scan_logs (event_id, device_id, fingerprint_slot, employee_id, action, message)
      VALUES (?, ?, ?, ?, 'PUNCH_IN', ?)
    `, [safeEventId, device.device_id, slot, employeeId, `${employeeName} entered room (Punch In #${punchInNumber}) via ${deviceInfo}`]);

    const l1 = `Hi ${shortName}`;
    const l2 = `IN #${punchInNumber} ${timeFormatted}`;
    tele.display_line1 = l1;
    tele.display_line2 = l2;
    tele.last_event_type = 'PUNCH_IN';

    return NextResponse.json({
      status: 'PUNCH_IN',
      action: 'PUNCH_IN',
      employee: { id: employeeId, name: employeeName, department: mapping.emp_dept },
      punch_time: timeIso,
      formatted_time: timeFormatted,
      punch_in_number: punchInNumber,
      fingerprint_slot: slot,
      attendance_id: attRecordId,
      session_id: sessionId,
      message: `${employeeName} entered room (Punch In #${punchInNumber})!`,
      display_line1: l1,
      display_line2: l2
    });

  } else {
    // -------------------------------------------------------------
    // PUNCH OUT
    // -------------------------------------------------------------
    // Find active open door session
    const [openDoorRows] = await pool.execute(`
      SELECT * FROM biometric_door_sessions
      WHERE employee_id = ? AND status = 'INSIDE' AND out_time IS NULL
      ORDER BY in_time DESC LIMIT 1
    `, [employeeId]);
    const activeDoor = openDoorRows[0] || null;

    // Count how many times this employee has punched OUT today
    const [outCountRows] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM biometric_room_attendance
      WHERE employee_id = ? AND attendance_date = ? AND punch_type = 'PUNCH_OUT'
    `, [employeeId, dateStr]);
    const punchOutNumber = (outCountRows[0]?.cnt || 0) + 1;

    let effectivePunchInMs = null;
    if (activeDoor?.in_time) {
      effectivePunchInMs = new Date(activeDoor.in_time).getTime();
    } else if (openAttendanceRecord?.punchInTime) {
      effectivePunchInMs = new Date(openAttendanceRecord.punchInTime).getTime();
    } else if (openLabSession?.in_time) {
      effectivePunchInMs = new Date(openLabSession.in_time).getTime();
    } else if (todayRecord?.punchInTime) {
      effectivePunchInMs = new Date(todayRecord.punchInTime).getTime();
    } else {
      effectivePunchInMs = Date.now();
    }

    const punchOutMs = new Date(timeIso).getTime();
    const totalMinutes = Math.max(1, Math.floor((punchOutMs - effectivePunchInMs) / 60000));
    const targetRecord = openAttendanceRecord || todayRecord;
    const totalBreak = Number(targetRecord?.totalBreakMinutes || 0);
    const netMinutes = Math.max(0, totalMinutes - totalBreak);

    // Close biometric_door_sessions
    await pool.execute(`
      UPDATE biometric_door_sessions
      SET out_time = NOW(), duration_minutes = ?, status = 'COMPLETED'
      WHERE employee_id = ? AND status = 'INSIDE' AND out_time IS NULL
    `, [totalMinutes, employeeId]);

    // Insert into biometric_room_attendance
    await pool.execute(`
      INSERT INTO biometric_room_attendance (
        employee_id, device_id, fingerprint_slot, attendance_date,
        punch_type, punch_time, punch_number, duration_minutes, session_id
      ) VALUES (?, ?, ?, ?, 'PUNCH_OUT', NOW(), ?, ?, ?)
    `, [employeeId, device.device_id, slot, dateStr, punchOutNumber, totalMinutes, activeDoor?.session_id || null]);

    // Update attendance_records if record exists
    if (targetRecord) {
      let finalStatus = targetRecord.status;
      if (netMinutes < 240) {
        finalStatus = 'Half Day';
      } else if (netMinutes >= 540) {
        finalStatus = 'Overtime';
      } else {
        finalStatus = 'Completed';
      }

      await pool.execute(`
        UPDATE attendance_records
        SET punchOutTime = ?, totalWorkMinutes = ?, netWorkMinutes = ?,
            status = ?, remarks = CONCAT(COALESCE(remarks, ''), ' | ESP32 Punch Out at ', ?)
        WHERE id = ?
      `, [timeIso, totalMinutes, netMinutes, finalStatus, timeFormatted, targetRecord.id]);
    }

    // Close biometric_lab_attendance session
    await pool.execute(`
      UPDATE biometric_lab_attendance
      SET out_time = NOW(),
          duration_minutes = TIMESTAMPDIFF(MINUTE, in_time, NOW()),
          status = 'OUT_OF_LAB'
      WHERE employee_id = ? AND status = 'IN_LAB' AND out_time IS NULL
    `, [employeeId]);

    // Audit log
    const durLabel = totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${totalMinutes}m`;

    await pool.execute(`
      INSERT INTO biometric_scan_logs (event_id, device_id, fingerprint_slot, employee_id, action, message)
      VALUES (?, ?, ?, ?, 'PUNCH_OUT', ?)
    `, [safeEventId, device.device_id, slot, employeeId, `${employeeName} exited room (Punch Out #${punchOutNumber}) after ${durLabel} via ${deviceInfo}`]);

    const l1 = `Bye ${shortName}`;
    const l2 = `OUT #${punchOutNumber} (${durLabel})`;
    tele.display_line1 = l1;
    tele.display_line2 = l2;
    tele.last_event_type = 'PUNCH_OUT';

    return NextResponse.json({
      status: 'PUNCH_OUT',
      action: 'PUNCH_OUT',
      employee: { id: employeeId, name: employeeName, department: mapping.emp_dept },
      punch_time: timeIso,
      formatted_time: timeFormatted,
      punch_out_number: punchOutNumber,
      duration_minutes: totalMinutes,
      duration_label: durLabel,
      fingerprint_slot: slot,
      attendance_id: targetRecord?.id || null,
      session_id: activeDoor?.session_id || null,
      message: `${employeeName} exited room (Punch Out #${punchOutNumber}) after ${durLabel}!`,
      display_line1: l1,
      display_line2: l2
    });
  }
}
