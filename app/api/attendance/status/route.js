import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function autoClosePreviousOpenSessions(pool, employeeId, todayStr) {
  try {
    const [openRows] = await pool.query(
      `SELECT * FROM attendance_records 
       WHERE employeeId = ? AND punchOutTime IS NULL AND date < ? 
       ORDER BY punchInTime ASC`,
      [employeeId, todayStr]
    );

    for (const record of openRows) {
      const recordDateStr = record.date;
      const autoPunchOutIso = `${recordDateStr}T23:59:59.000Z`;

      // If this is an Absent/Leave record or has no valid punchInTime, close it safely with 0 minutes
      if (!record.punchInTime || record.punchInTime.trim() === '' || record.status === 'Absent' || record.status === 'On Leave') {
        await pool.query(
          `UPDATE attendance_records SET 
            punchOutTime = ?, 
            totalWorkMinutes = 0, 
            totalBreakMinutes = 0, 
            netWorkMinutes = 0, 
            breakStatus = 'Completed' 
           WHERE id = ?`,
          [autoPunchOutIso, record.id]
        );
        continue;
      }

      const autoPunchOutMs = new Date(autoPunchOutIso).getTime();
      const punchInDate = new Date(record.punchInTime);
      const punchInMs = isNaN(punchInDate.getTime()) ? null : punchInDate.getTime();

      // Close any open break for this record at 11:59:59 PM
      await pool.query(
        `UPDATE attendance_breaks SET endTime = ? WHERE attendanceId = ? AND endTime IS NULL`,
        [autoPunchOutIso, record.id]
      );

      // Sum all break minutes for this record
      const [breakRows] = await pool.query(
        `SELECT startTime, endTime FROM attendance_breaks WHERE attendanceId = ?`,
        [record.id]
      );

      let totalBreakSecs = 0;
      for (const b of breakRows) {
        if (b.startTime && b.endTime) {
          const s = new Date(b.startTime).getTime();
          const e = new Date(b.endTime).getTime();
          if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
            totalBreakSecs += Math.floor((e - s) / 1000);
          }
        }
      }

      let totalWorkSecs = 0;
      if (punchInMs !== null && Number.isFinite(punchInMs) && Number.isFinite(autoPunchOutMs) && autoPunchOutMs > punchInMs) {
        totalWorkSecs = Math.max(0, Math.floor((autoPunchOutMs - punchInMs) / 1000));
      }
      const netWorkSecs = Math.max(0, totalWorkSecs - totalBreakSecs);

      const totalWorkMins = Number.isFinite(totalWorkSecs) ? Math.floor(totalWorkSecs / 60) : 0;
      const totalBreakMins = Number.isFinite(totalBreakSecs) ? Math.floor(totalBreakSecs / 60) : 0;
      const netWorkMins = Number.isFinite(netWorkSecs) ? Math.floor(netWorkSecs / 60) : 0;

      let finalStatus = record.status;
      if (finalStatus === 'Present' || finalStatus === 'Late') {
        finalStatus = 'Auto Closed';
      }

      await pool.query(
        `UPDATE attendance_records SET 
          punchOutTime = ?, 
          totalWorkMinutes = ?, 
          totalBreakMinutes = ?, 
          netWorkMinutes = ?, 
          status = ?, 
          breakStatus = 'Completed',
          remarks = COALESCE(CONCAT(remarks, ' | Auto punched-out at 11:59 PM'), 'Auto punched-out at 11:59 PM')
         WHERE id = ?`,
        [autoPunchOutIso, totalWorkMins, totalBreakMins, netWorkMins, finalStatus, record.id]
      );
    }
  } catch (err) {
    console.error('Error auto-closing previous open sessions:', err);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ success: false, message: 'employeeId parameter required' }, { status: 400 });
  }

  const pool = getPool();
  try {
    const now = new Date();
    const todayStr = formatLocalDate(now);

    // Auto-close any forgotten open sessions from previous days at 11:59:59 PM
    await autoClosePreviousOpenSessions(pool, employeeId, todayStr);

    // Fetch active session for today
    const [rows] = await pool.query(
      `SELECT * FROM attendance_records 
       WHERE employeeId = ? AND date = ? 
       ORDER BY punchInTime DESC LIMIT 1`,
      [employeeId, todayStr]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        hasActiveSession: false,
        punchedIn: false,
        onBreak: false,
        activeRecord: null,
        activeBreak: null,
        elapsedWorkSeconds: 0,
        elapsedBreakSeconds: 0
      });
    }

    const activeRecord = rows[0];
    const punchedIn = !activeRecord.punchOutTime;
    const onBreak = activeRecord.breakStatus === 'On Break';

    // Fetch all breaks history for exact second-level calculations
    const [breaksHistory] = await pool.query(
      `SELECT * FROM attendance_breaks WHERE attendanceId = ? ORDER BY startTime ASC`,
      [activeRecord.id]
    );

    let activeBreak = null;
    let completedBreakSeconds = 0;

    for (const b of breaksHistory) {
      if (b.endTime) {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        completedBreakSeconds += Math.max(0, Math.floor((end - start) / 1000));
      } else if (!b.endTime && onBreak) {
        activeBreak = b;
      }
    }

    const nowMs = now.getTime();
    const punchInMs = new Date(activeRecord.punchInTime).getTime();

    let liveActiveBreakSeconds = 0;
    if (activeBreak) {
      const breakStartMs = new Date(activeBreak.startTime).getTime();
      liveActiveBreakSeconds = Math.max(0, Math.floor((nowMs - breakStartMs) / 1000));
    }

    const totalBreakSeconds = completedBreakSeconds + liveActiveBreakSeconds;

    let elapsedWorkSeconds = 0;
    if (punchedIn) {
      const totalElapsedSeconds = Math.max(0, Math.floor((nowMs - punchInMs) / 1000));
      elapsedWorkSeconds = Math.max(0, totalElapsedSeconds - totalBreakSeconds);
    } else {
      const punchOutMs = new Date(activeRecord.punchOutTime).getTime();
      const totalElapsedSeconds = Math.max(0, Math.floor((punchOutMs - punchInMs) / 1000));
      elapsedWorkSeconds = Math.max(0, totalElapsedSeconds - completedBreakSeconds);
    }

    return NextResponse.json({
      success: true,
      hasActiveSession: true,
      punchedIn,
      onBreak,
      activeRecord,
      activeBreak,
      breaksHistory,
      completedBreakSeconds,
      elapsedWorkSeconds,
      elapsedBreakSeconds: totalBreakSeconds,
      serverTime: now.toISOString()
    });

  } catch (error) {
    console.error('Attendance Status API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
