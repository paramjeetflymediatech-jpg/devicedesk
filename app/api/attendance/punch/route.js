import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

// In-memory concurrency locks per employee ID to block double-clicks & duplicate browser tab hits
const activeLocks = new Set();

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const { employeeId, employeeName, action, breakType, remarks } = body;

  if (!employeeId || !action) {
    return NextResponse.json({ success: false, message: 'employeeId and action are required' }, { status: 400 });
  }

  // Lock per employee ID to handle concurrency
  if (activeLocks.has(employeeId)) {
    return NextResponse.json({ success: false, message: 'Another request is currently processing for this account. Please wait.' }, { status: 429 });
  }

  activeLocks.add(employeeId);

  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = formatLocalDate(now);

    // Extract Client IP address & User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const deviceInfo = request.headers.get('user-agent') || 'Unknown Browser';

    // 1. Fetch any open or today's attendance record
    const [existingRows] = await connection.execute(
      `SELECT * FROM attendance_records WHERE employeeId = ? AND (date = ? OR (punchOutTime IS NULL AND date <= ?)) ORDER BY punchInTime DESC LIMIT 1 FOR UPDATE`,
      [employeeId, todayStr, todayStr]
    );

    const activeRecord = existingRows.length > 0 ? existingRows[0] : null;

    if (action === 'PUNCH_IN') {
      if (activeRecord) {
        if (!activeRecord.punchOutTime) {
          await connection.rollback();
          return NextResponse.json({ success: false, message: 'You are already punched in!' }, { status: 400 });
        }
        if (activeRecord.date === todayStr) {
          await connection.rollback();
          return NextResponse.json({ success: false, message: 'You have already completed attendance for today!' }, { status: 400 });
        }
      }

      // Check if Late: Shift starts 09:30 AM, grace period ends 09:40 AM
      const shiftCutoff = new Date(now);
      shiftCutoff.setHours(9, 40, 0, 0);
      const isLate = now > shiftCutoff;
      const status = isLate ? 'Late' : 'Present';

      const recordId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      await connection.execute(
        `INSERT INTO attendance_records 
         (id, employeeId, employeeName, date, punchInTime, status, ipAddress, deviceInfo, remarks, breakStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          employeeId,
          employeeName || 'Employee',
          todayStr,
          nowIso,
          status,
          ipAddress.split(',')[0].trim(),
          deviceInfo.substring(0, 255),
          remarks || null,
          'None'
        ]
      );

      await connection.commit();
      return NextResponse.json({
        success: true,
        message: `Punched in successfully as ${status}!`,
        recordId,
        punchInTime: nowIso,
        status
      });
    }

    // Actions below require an open active punch-in session
    if (!activeRecord || activeRecord.punchOutTime) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'No active punch-in session found. Please punch in first.' }, { status: 400 });
    }

    if (action === 'START_BREAK') {
      if (activeRecord.breakStatus === 'On Break') {
        await connection.rollback();
        return NextResponse.json({ success: false, message: 'A break is already active! Please end it first.' }, { status: 400 });
      }

      const breakId = `brk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const selectedType = breakType || 'Tea Break';

      await connection.execute(
        `INSERT INTO attendance_breaks (id, attendanceId, employeeId, breakType, startTime) VALUES (?, ?, ?, ?, ?)`,
        [breakId, activeRecord.id, employeeId, selectedType, nowIso]
      );

      await connection.execute(
        `UPDATE attendance_records SET breakStatus = 'On Break' WHERE id = ?`,
        [activeRecord.id]
      );

      await connection.commit();
      return NextResponse.json({
        success: true,
        message: `Started ${selectedType}!`,
        breakId,
        startTime: nowIso
      });
    }

    if (action === 'END_BREAK') {
      if (activeRecord.breakStatus !== 'On Break') {
        await connection.rollback();
        return NextResponse.json({ success: false, message: 'No active break found to end.' }, { status: 400 });
      }

      // Find open break
      const [breakRows] = await connection.execute(
        `SELECT * FROM attendance_breaks WHERE attendanceId = ? AND endTime IS NULL ORDER BY startTime DESC LIMIT 1 FOR UPDATE`,
        [activeRecord.id]
      );

      if (breakRows.length === 0) {
        await connection.execute(`UPDATE attendance_records SET breakStatus = 'None' WHERE id = ?`, [activeRecord.id]);
        await connection.commit();
        return NextResponse.json({ success: true, message: 'Break status updated.' });
      }

      const openBreak = breakRows[0];
      const startMs = new Date(openBreak.startTime).getTime();
      const endMs = now.getTime();
      const durationMins = Math.max(1, Math.round((endMs - startMs) / 60000));

      await connection.execute(
        `UPDATE attendance_breaks SET endTime = ?, durationMinutes = ? WHERE id = ?`,
        [nowIso, durationMins, openBreak.id]
      );

      // Re-sum total break minutes for this session
      const [sumRows] = await connection.execute(
        `SELECT SUM(durationMinutes) as totalMins FROM attendance_breaks WHERE attendanceId = ? AND endTime IS NOT NULL`,
        [activeRecord.id]
      );
      const totalBreakMins = parseInt(sumRows[0].totalMins || '0', 10);

      await connection.execute(
        `UPDATE attendance_records SET totalBreakMinutes = ?, breakStatus = 'None' WHERE id = ?`,
        [totalBreakMins, activeRecord.id]
      );

      await connection.commit();
      return NextResponse.json({
        success: true,
        message: `Ended break (${durationMins} mins)!`,
        durationMinutes: durationMins,
        totalBreakMinutes: totalBreakMins
      });
    }

    if (action === 'PUNCH_OUT') {
      let finalBreakMins = activeRecord.totalBreakMinutes || 0;

      // Auto-close active break if punch out is triggered while on break
      if (activeRecord.breakStatus === 'On Break') {
        const [breakRows] = await connection.execute(
          `SELECT * FROM attendance_breaks WHERE attendanceId = ? AND endTime IS NULL ORDER BY startTime DESC LIMIT 1 FOR UPDATE`,
          [activeRecord.id]
        );

        if (breakRows.length > 0) {
          const openBreak = breakRows[0];
          const startMs = new Date(openBreak.startTime).getTime();
          const endMs = now.getTime();
          const durationMins = Math.max(1, Math.round((endMs - startMs) / 60000));

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

      const punchInMs = new Date(activeRecord.punchInTime).getTime();
      const punchOutMs = now.getTime();
      const totalWorkMins = Math.max(0, Math.round((punchOutMs - punchInMs) / 60000));
      const netWorkMins = Math.max(0, totalWorkMins - finalBreakMins);

      // Determine final status based on net work time
      // Shift: 09:30 AM – 06:30 PM (9h). Overtime = > 9h net (> 540 min)
      let finalStatus = activeRecord.status;
      if (netWorkMins < 240) {
        // Less than 4 hours → Half Day
        finalStatus = 'Half Day';
      } else if (netWorkMins >= 540) {
        // 9+ hours → Overtime (shift end 06:30 PM)
        finalStatus = 'Overtime';
      } else {
        // 4h–8h 59m → Completed
        finalStatus = 'Completed';
      }

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

      const hours = (netWorkMins / 60).toFixed(1);
      return NextResponse.json({
        success: true,
        message: `Punched out successfully! Net working hours: ${hours} hrs.`,
        punchOutTime: nowIso,
        netWorkMinutes: netWorkMins,
        status: finalStatus
      });
    }

    await connection.rollback();
    return NextResponse.json({ success: false, message: `Unknown action '${action}'` }, { status: 400 });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Attendance Punch API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
    activeLocks.delete(employeeId);
  }
}
