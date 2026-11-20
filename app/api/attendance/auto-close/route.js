import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { getIstTimeInfo, formatLocalDate, getMinutesBetween } from '../../utils/istDate.js';

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

      const { dateStr, timeIso } = getIstTimeInfo();
      const nowIso = timeIso;
      const todayStr = dateStr;

      // Find all open sessions across ALL employees
      const [openRows] = await connection.execute(
        `SELECT * FROM attendance_records 
         WHERE punchOutTime IS NULL AND date <= ? 
         FOR UPDATE`,
        [todayStr]
      );

      let closedCount = 0;

      for (const record of openRows) {
        // If it's a previous day, auto close at 09:00 PM IST of that day. 
        // If it's today, auto close at the current time (which should be 9:00 PM IST when triggered).
        const isToday = record.date === todayStr;
        const autoPunchOutIso = isToday ? nowIso : `${record.date}T21:00:00+05:30`;

        // If this is an Absent/Leave record or has no valid punchInTime, close it safely with 0 minutes
        if (!record.punchInTime || record.punchInTime.trim() === '' || record.status === 'Absent' || record.status === 'On Leave') {
          await connection.execute(
            `UPDATE attendance_records SET 
              punchOutTime = ?, 
              totalWorkMinutes = 0, 
              totalBreakMinutes = 0, 
              netWorkMinutes = 0, 
              breakStatus = 'Completed' 
             WHERE id = ?`,
            [autoPunchOutIso, record.id]
          );
          closedCount++;
          continue;
        }

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

        let totalBreakMins = 0;
        for (const b of breakRows) {
          if (b.startTime && b.endTime) {
            totalBreakMins += getMinutesBetween(b.startTime, b.endTime);
          }
        }

        const totalWorkMins = getMinutesBetween(record.punchInTime, autoPunchOutIso);
        const netWorkMins = Math.max(0, totalWorkMins - totalBreakMins);

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

      // Additionally, generate 'Absent' records for employees who never punched in today
      try {
        await connection.beginTransaction();
        const dayOfWeek = now.getDay();
        // Skip Sundays
        if (dayOfWeek !== 0) {
          const [employees] = await connection.execute(
            `SELECT id, name FROM employees WHERE (status IS NULL OR status != 'Paused') AND LOWER(role) NOT IN ('admin', 'superadmin', 'management', 'client', 'candidate', 'dns manager') AND LOWER(COALESCE(department, '')) NOT IN ('dns manager')`
          );
          
          const [todayRecords] = await connection.execute(
            `SELECT employeeId FROM attendance_records WHERE date = ?`,
            [todayStr]
          );
          const presentIds = new Set(todayRecords.map(r => r.employeeId));
          
          let absentCount = 0;
          for (const emp of employees) {
            if (!presentIds.has(emp.id)) {
              const recordId = `absent_${emp.id}_${todayStr}`;
              const absentPunchOut = `${todayStr}T23:59:59.000Z`;
              await connection.execute(
                `INSERT IGNORE INTO attendance_records 
                 (id, employeeId, employeeName, date, punchInTime, punchOutTime, status, totalWorkMinutes, totalBreakMinutes, netWorkMinutes, remarks)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  recordId, emp.id, emp.name, todayStr, '', absentPunchOut, 'Absent', 0, 0, 0, 'Auto-generated Absent (End of Day)'
                ]
              );
              absentCount++;
            }
          }
          console.log(`[API /attendance/auto-close] Generated ${absentCount} absent records for today.`);
        }
        await connection.commit();
      } catch (absentErr) {
        await connection.rollback();
        console.error('[API /attendance/auto-close] Error generating absent records:', absentErr);
      }

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
