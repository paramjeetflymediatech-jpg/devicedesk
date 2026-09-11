import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(request) {
  try {
    const { employee_id, action, latitude, longitude } = await request.json();

    if (!employee_id || !action || !latitude || !longitude) {
      return NextResponse.json({ error: 'employee_id, action, latitude, and longitude are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    if (action === 'check_in') {
      const attendanceId = 'att_' + Date.now();
      const status = 'Checked In';

      await db.execute(
        `INSERT INTO marketing_attendance (id, employee_id, check_in_at, check_in_latitude, check_in_longitude, status) 
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        [attendanceId, employee_id, latitude, longitude, status]
      );

      return NextResponse.json({ success: true, attendance_id: attendanceId, message: 'Check-in successful' });
    } 
    
    else if (action === 'check_out') {
      const { attendance_id, total_km } = await request.json();
      
      if (!attendance_id) {
        return NextResponse.json({ error: 'attendance_id is required for check-out.' }, { status: 400 });
      }

      await db.execute(
        `UPDATE marketing_attendance 
         SET check_out_at = CURRENT_TIMESTAMP, check_out_latitude = ?, check_out_longitude = ?, total_km = ?, status = 'Checked Out' 
         WHERE id = ? AND employee_id = ?`,
        [latitude, longitude, total_km || 0, attendance_id, employee_id]
      );

      return NextResponse.json({ success: true, message: 'Check-out successful' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('Marketing Attendance API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    let query = `SELECT * FROM marketing_attendance ORDER BY check_in_at DESC`;
    let params = [];

    if (employeeId) {
      query = `SELECT * FROM marketing_attendance WHERE employee_id = ? ORDER BY check_in_at DESC`;
      params.push(employeeId);
    }

    const db = await getDbConnection();
    const [rows] = await db.query(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch Marketing Attendance Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
