import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

// In-memory concurrency locks per employee ID to block double-clicks & duplicate browser tab hits
const activeLocks = new Set();

// Office Geolocation Settings (Flymedia Technology Ludhiana, Punjab, India)
const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT || '30.8795221');
const OFFICE_LNG = parseFloat(process.env.OFFICE_LNG || '75.820214');
const OFFICE_RADIUS = parseFloat(process.env.OFFICE_RADIUS_METERS || '100'); // 100 meters

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // meters
}

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function autoClosePreviousOpenSessions(connection, employeeId, todayStr) {
  try {
    const [openRows] = await connection.execute(
      `SELECT * FROM attendance_records 
       WHERE employeeId = ? AND punchOutTime IS NULL AND date < ? 
       ORDER BY punchInTime ASC FOR UPDATE`,
      [employeeId, todayStr]
    );

    for (const record of openRows) {
      const recordDateStr = record.date;
      // Store as UTC equivalent of 9:00 PM IST (15:30 UTC) so UI shows 9:00 PM
      const autoPunchOutIso = `${recordDateStr}T15:30:00.000Z`;
      const autoPunchOutMs = new Date(autoPunchOutIso).getTime();
      const punchInMs = new Date(record.punchInTime).getTime();

      // Close open break if any
      await connection.execute(
        `UPDATE attendance_breaks SET endTime = ? WHERE attendanceId = ? AND endTime IS NULL`,
        [autoPunchOutIso, record.id]
      );

      // Calculate break seconds
      const [breakRows] = await connection.execute(
        `SELECT startTime, endTime FROM attendance_breaks WHERE attendanceId = ?`,
        [record.id]
      );

      let totalBreakSecs = 0;
      for (const b of breakRows) {
        if (b.startTime && b.endTime) {
          const s = new Date(b.startTime).getTime();
          const e = new Date(b.endTime).getTime();
          totalBreakSecs += Math.max(0, Math.floor((e - s) / 1000));
        }
      }

      const totalWorkSecs = Math.max(0, Math.floor((autoPunchOutMs - punchInMs) / 1000));
      const netWorkSecs = Math.max(0, totalWorkSecs - totalBreakSecs);

      const totalWorkMins = Math.floor(totalWorkSecs / 60);
      const totalBreakMins = Math.floor(totalBreakSecs / 60);
      const netWorkMins = Math.floor(netWorkSecs / 60);

      let finalStatus = record.status;
      if (finalStatus === 'Present' || finalStatus === 'Late') {
        finalStatus = 'Auto Closed';
      }

      await connection.execute(
        `UPDATE attendance_records SET 
          punchOutTime = ?, 
          totalWorkMinutes = ?, 
          totalBreakMinutes = ?, 
          netWorkMinutes = ?, 
          status = ?, 
          breakStatus = 'Completed',
          remarks = COALESCE(CONCAT(remarks, ' | Auto punched-out at 09:00 PM'), 'Auto punched-out at 09:00 PM')
         WHERE id = ?`,
        [autoPunchOutIso, totalWorkMins, totalBreakMins, netWorkMins, finalStatus, record.id]
      );
    }
  } catch (err) {
    console.error('Error auto closing previous sessions during punch:', err);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const { employeeId, employeeName, action, breakType, remarks, latitude, longitude } = body;

  if (!employeeId || !action) {
    return NextResponse.json({ success: false, message: 'employeeId and action are required' }, { status: 400 });
  }

  // Location validation for punch in and punch out
  if (action === 'PUNCH_IN' || action === 'PUNCH_OUT') {
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return NextResponse.json({ success: false, message: 'Location access is required to punch in or out. Please enable GPS/Location settings.' }, { status: 400 });
    }

    if (action === 'PUNCH_IN') {
      const distance = getHaversineDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        OFFICE_LAT,
        OFFICE_LNG
      );

      if (distance > OFFICE_RADIUS) {
        return NextResponse.json({
          success: false,
          message: `Punch-in rejected. You must be within the office area (100 meters). You are currently ${Math.round(distance)} meters away.`
        }, { status: 400 });
      }
    }
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

    // Auto-close any forgotten open sessions from previous days before processing punch actions
    await autoClosePreviousOpenSessions(connection, employeeId, todayStr);

    // 1. Fetch any open or today's attendance record
    const [existingRows] = await connection.execute(
      `SELECT * FROM attendance_records WHERE employeeId = ? AND (date = ? OR (punchOutTime IS NULL AND date <= ?)) ORDER BY punchInTime DESC LIMIT 1 FOR UPDATE`,
      [employeeId, todayStr, todayStr]
    );

    const activeRecord = existingRows.length > 0 ? existingRows[0] : null;

    if (action === 'PUNCH_IN') {
      // Rule 1: Shift Cutoff Check - Unable to punch in after 06:30 PM (18:30)
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (hours > 18 || (hours === 18 && minutes >= 30)) {
        await connection.rollback();
        return NextResponse.json({
          success: false,
          message: 'Punch-in restricted. Shift cutoff time (06:30 PM) has passed for today.'
        }, { status: 400 });
      }

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
         (id, employeeId, employeeName, date, punchInTime, status, ipAddress, deviceInfo, remarks, breakStatus, punchInLatitude, punchInLongitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          'None',
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null
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
          breakStatus = 'Completed',
          punchOutLatitude = ?,
          punchOutLongitude = ?
         WHERE id = ?`,
        [
          nowIso,
          totalWorkMins,
          finalBreakMins,
          netWorkMins,
          finalStatus,
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null,
          activeRecord.id
        ]
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
