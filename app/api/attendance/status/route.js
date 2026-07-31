import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

    // Fetch active session (either today's or open session from previous day)
    const [rows] = await pool.query(
      `SELECT * FROM attendance_records 
       WHERE employeeId = ? AND (date = ? OR punchOutTime IS NULL) 
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
        activeBreak: null
      });
    }

    const activeRecord = rows[0];
    const punchedIn = !activeRecord.punchOutTime;
    const onBreak = activeRecord.breakStatus === 'On Break';

    let activeBreak = null;
    if (onBreak) {
      const [breakRows] = await pool.query(
        `SELECT * FROM attendance_breaks WHERE attendanceId = ? AND endTime IS NULL ORDER BY startTime DESC LIMIT 1`,
        [activeRecord.id]
      );
      if (breakRows.length > 0) {
        activeBreak = breakRows[0];
      }
    }

    // Calculate live active work & break seconds
    const nowMs = now.getTime();
    const punchInMs = new Date(activeRecord.punchInTime).getTime();

    let liveBreakMins = activeRecord.totalBreakMinutes || 0;
    let liveBreakSeconds = 0;

    if (activeBreak) {
      const breakStartMs = new Date(activeBreak.startTime).getTime();
      liveBreakSeconds = Math.max(0, Math.floor((nowMs - breakStartMs) / 1000));
      liveBreakMins += Math.floor(liveBreakSeconds / 60);
    }

    let elapsedWorkSeconds = 0;
    if (punchedIn) {
      const totalElapsed = Math.max(0, Math.floor((nowMs - punchInMs) / 1000));
      elapsedWorkSeconds = Math.max(0, totalElapsed - (liveBreakMins * 60));
    } else {
      elapsedWorkSeconds = (activeRecord.netWorkMinutes || 0) * 60;
    }

    // Fetch breaks history for this session
    const [breaksHistory] = await pool.query(
      `SELECT * FROM attendance_breaks WHERE attendanceId = ? ORDER BY startTime ASC`,
      [activeRecord.id]
    );

    return NextResponse.json({
      success: true,
      hasActiveSession: true,
      punchedIn,
      onBreak,
      activeRecord,
      activeBreak,
      breaksHistory,
      elapsedWorkSeconds,
      elapsedBreakSeconds: liveBreakSeconds,
      serverTime: now.toISOString()
    });

  } catch (error) {
    console.error('Attendance Status API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
