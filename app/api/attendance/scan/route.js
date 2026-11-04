import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

function formatLocalDate(d) {
  const istDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const { identifier, source = 'QR_CARD' } = body;

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return NextResponse.json({ success: false, message: 'Card or QR code identifier is required' }, { status: 400 });
  }

  // Support clean extracted IDs if QR code contains a JSON payload like {"id": "emp_123"}
  let cleanId = identifier.trim();
  try {
    if (cleanId.startsWith('{') && cleanId.endsWith('}')) {
      const parsed = JSON.parse(cleanId);
      if (parsed.id || parsed.employeeId || parsed.biometricId) {
        cleanId = String(parsed.id || parsed.employeeId || parsed.biometricId).trim();
      }
    }
  } catch (e) {}

  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Find employee by employeeId OR biometric_id
    const [empRows] = await connection.execute(
      `SELECT id, name, role, department, avatarUrl, biometric_id, status 
       FROM employees 
       WHERE id = ? OR biometric_id = ? 
       LIMIT 1`,
      [cleanId, cleanId]
    );

    if (empRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ 
        success: false, 
        message: `Unrecognized card or QR code: "${cleanId}". Please register this ID in employee settings.` 
      }, { status: 404 });
    }

    const employee = empRows[0];
    if (employee.status && employee.status.toLowerCase() === 'suspended') {
      await connection.rollback();
      return NextResponse.json({ 
        success: false, 
        message: `Account is inactive/suspended for ${employee.name}. Please contact HR.` 
      }, { status: 403 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = formatLocalDate(now);
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // 2. Fetch today's or any active open attendance record for this employee
    const [existingRows] = await connection.execute(
      `SELECT * FROM attendance_records 
       WHERE employeeId = ? AND (date = ? OR (punchOutTime IS NULL AND date <= ?)) 
       ORDER BY punchInTime DESC LIMIT 1 FOR UPDATE`,
      [employee.id, todayStr, todayStr]
    );

    const activeRecord = existingRows.length > 0 ? existingRows[0] : null;

    // Check if there is NO active session -> PUNCH IN
    if (!activeRecord || activeRecord.punchOutTime) {
      // Check if employee already completed full attendance today
      if (activeRecord && activeRecord.date === todayStr && activeRecord.punchOutTime) {
        await connection.rollback();
        return NextResponse.json({
          success: false,
          action: 'ALREADY_COMPLETED',
          employee: {
            id: employee.id,
            name: employee.name,
            avatarUrl: employee.avatarUrl,
            department: employee.department
          },
          message: `${employee.name} has already completed attendance for today!`
        }, { status: 400 });
      }

      // Check if Late: Shift start 09:30 AM, grace period ends 09:40 AM
      const shiftCutoff = new Date(now);
      shiftCutoff.setHours(9, 40, 0, 0);
      const isLate = now > shiftCutoff;
      const status = isLate ? 'Late' : 'Present';

      const recordId = `att_qr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      await connection.execute(
        `INSERT INTO attendance_records 
         (id, employeeId, employeeName, date, punchInTime, status, punchSource, deviceInfo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          employee.id,
          employee.name,
          todayStr,
          nowIso,
          status,
          source,
          `Kiosk / ID Card Scanner (${source})`
        ]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        action: 'PUNCH_IN',
        employee: {
          id: employee.id,
          name: employee.name,
          avatarUrl: employee.avatarUrl,
          department: employee.department
        },
        time: timeFormatted,
        date: todayStr,
        status,
        message: `Welcome, ${employee.name}! Checked In at ${timeFormatted} (${status})`
      });
    }

    // Active session exists -> PUNCH OUT
    const punchInMs = new Date(activeRecord.punchInTime).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - punchInMs) / 1000));

    // Anti-bounce: If scanned again within 90 seconds of punch in, ignore to prevent accidental double-taps
    if (elapsedSeconds < 90) {
      await connection.rollback();
      return NextResponse.json({
        success: true,
        action: 'ALREADY_PUNCHED',
        employee: {
          id: employee.id,
          name: employee.name,
          avatarUrl: employee.avatarUrl,
          department: employee.department
        },
        time: timeFormatted,
        message: `Already checked in! Please wait before scanning again.`
      });
    }

    // Auto-close open break if employee was on break when scanning out
    let finalBreakMins = activeRecord.totalBreakMinutes || 0;
    if (activeRecord.breakStatus === 'On Break') {
      const [breakRows] = await connection.execute(
        `SELECT * FROM attendance_breaks WHERE attendanceId = ? AND endTime IS NULL ORDER BY startTime DESC LIMIT 1 FOR UPDATE`,
        [activeRecord.id]
      );

      if (breakRows.length > 0) {
        const openBreak = breakRows[0];
        const startMs = new Date(openBreak.startTime).getTime();
        const durationMins = Math.max(1, Math.round((now.getTime() - startMs) / 60000));

        await connection.execute(
          `UPDATE attendance_breaks SET endTime = ?, durationMinutes = ? WHERE id = ?`,
          [nowIso, durationMins, openBreak.id]
        );

        const [sumRows] = await connection.execute(
          `SELECT SUM(durationMinutes) as totalMins FROM attendance_breaks WHERE attendanceId = ? AND endTime IS NOT NULL`,
          [activeRecord.id]
        );
        finalBreakMins = parseInt(sumRows[0].totalMins || '0', 10);
      }
    }

    const totalWorkMins = Math.max(0, Math.round((now.getTime() - punchInMs) / 60000));
    const netWorkMins = Math.max(0, totalWorkMins - finalBreakMins);

    let finalStatus = activeRecord.status;
    if (netWorkMins < 240) {
      finalStatus = 'Half Day';
    } else if (netWorkMins >= 540) {
      finalStatus = 'Overtime';
    } else {
      finalStatus = 'Completed';
    }

    const hours = Math.floor(netWorkMins / 60);
    const mins = netWorkMins % 60;
    const workFormatted = `${hours}h ${mins}m`;

    await connection.execute(
      `UPDATE attendance_records SET 
        punchOutTime = ?, 
        totalWorkMinutes = ?, 
        totalBreakMinutes = ?, 
        netWorkMinutes = ?, 
        status = ?, 
        breakStatus = 'Completed' 
       WHERE id = ?`,
      [nowIso, totalWorkMins, finalBreakMins, netWorkMins, finalStatus, activeRecord.id]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      action: 'PUNCH_OUT',
      employee: {
        id: employee.id,
        name: employee.name,
        avatarUrl: employee.avatarUrl,
        department: employee.department
      },
      time: timeFormatted,
      date: todayStr,
      workHours: workFormatted,
      status: finalStatus,
      message: `Goodbye, ${employee.name}! Checked Out at ${timeFormatted} (Worked: ${workFormatted})`
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Scan Attendance API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

