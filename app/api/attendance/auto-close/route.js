import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

function formatLocalDate(d) {
  // Convert to IST to get the exact "todayStr" in India
  const istDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const expectedSecret = process.env.SOCKET_INTERNAL_SECRET || 'devicedesk_socket_secret_2026';

    if (body.secret !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = formatLocalDate(now);

      // Find all open sessions across ALL employees
      const [openRows] = await connection.execute(
        `SELECT * FROM attendance_records 
         WHERE punchOutTime IS NULL AND date <= ? 
         FOR UPDATE`,
        [todayStr]
      );

      let closedCount = 0;

      for (const record of openRows) {
        // If it's a previous day, auto close at 23:59:59 of that day. 
        // If it's today, auto close at the current time (which should be 9:00 PM IST when triggered).
        const isToday = record.date === todayStr;
        const autoPunchOutIso = isToday ? nowIso : `${record.date}T15:30:00.000Z`;
        const autoPunchOutMs = new Date(autoPunchOutIso).getTime();
        const punchInMs = new Date(record.punchInTime).getTime();

        // 1. Close any open breaks
        await connection.execute(
          `UPDATE attendance_breaks SET endTime = ? WHERE attendanceId = ? AND endTime IS NULL`,
          [autoPunchOutIso, record.id]
        );

        // 2. Re-calculate break time
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

        const remarksSuffix = ' | Auto punched-out at 09:00 PM';

        await connection.execute(
          `UPDATE attendance_records SET 
            punchOutTime = ?, 
            totalWorkMinutes = ?, 
            totalBreakMinutes = ?, 
            netWorkMinutes = ?, 
            status = ?, 
            breakStatus = 'Completed',
            remarks = COALESCE(CONCAT(remarks, ?), ?)
           WHERE id = ?`,
          [autoPunchOutIso, totalWorkMins, totalBreakMins, netWorkMins, finalStatus, remarksSuffix, remarksSuffix.substring(3), record.id]
        );

        closedCount++;
      }

      await connection.commit();
      console.log(`[API /attendance/auto-close] Successfully auto-closed ${closedCount} orphaned sessions.`);

      return NextResponse.json({ success: true, closedCount, message: 'Auto-close complete' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('[API /attendance/auto-close] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
