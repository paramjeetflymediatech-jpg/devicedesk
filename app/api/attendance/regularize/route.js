import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { checkAndSendFullAttendanceReport } from '../../utils/fullAttendanceChecker.js';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const { recordId, employeeId, employeeName, date, punchInTime, punchOutTime, status, remarks, adminName, reason } = body;

  if (!employeeId || !date || !punchInTime || !adminName || !reason) {
    return NextResponse.json({ success: false, message: 'employeeId, date, punchInTime, adminName and reason are required' }, { status: 400 });
  }

  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let totalWorkMins = 0;
    let netWorkMins = 0;
    let totalBreakMins = 0;

    if (punchInTime && punchOutTime) {
      const startMs = new Date(punchInTime).getTime();
      const endMs = new Date(punchOutTime).getTime();
      if (endMs < startMs) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: 'Punch Out time cannot be earlier than Punch In time!' }, { status: 400 });
      }
      totalWorkMins = Math.max(0, Math.round((endMs - startMs) / 60000));
      netWorkMins = totalWorkMins;
    }

    if (recordId) {
      // Update existing record
      await connection.execute(
        `UPDATE attendance_records SET 
          date = ?, 
          punchInTime = ?, 
          punchOutTime = ?, 
          status = ?, 
          totalWorkMinutes = ?, 
          netWorkMinutes = ?, 
          remarks = ?, 
          modifiedBy = ?, 
          modifiedReason = ? 
         WHERE id = ?`,
        [
          date,
          punchInTime,
          punchOutTime || null,
          status || 'Present',
          totalWorkMins,
          netWorkMins,
          remarks || null,
          adminName,
          reason,
          recordId
        ]
      );
    } else {
      // Create new regularized record
      const newRecordId = `att_reg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await connection.execute(
        `INSERT INTO attendance_records 
         (id, employeeId, employeeName, date, punchInTime, punchOutTime, status, totalWorkMinutes, netWorkMinutes, remarks, modifiedBy, modifiedReason, breakStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRecordId,
          employeeId,
          employeeName || 'Employee',
          date,
          punchInTime,
          punchOutTime || null,
          status || 'Present',
          totalWorkMins,
          netWorkMins,
          remarks || 'Admin Regularized',
          adminName,
          reason,
          punchOutTime ? 'Completed' : 'None'
        ]
      );
    }

    await connection.commit();

    // Trigger 100% full attendance report check
    checkAndSendFullAttendanceReport().catch((err) =>
      console.error('Full attendance check error on regularize:', err)
    );

    return NextResponse.json({
      success: true,
      message: 'Attendance regularized successfully!'
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Attendance Regularize API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
