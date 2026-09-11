import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(request) {
  try {
    const { employee_id, attendance_id, latitude, longitude, accuracy } = await request.json();

    if (!employee_id || !attendance_id || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required location data.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const logId = 'loc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    await db.execute(
      `INSERT INTO marketing_location_logs (id, employee_id, attendance_id, latitude, longitude, accuracy) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [logId, employee_id, attendance_id, latitude, longitude, accuracy || null]
    );

    return NextResponse.json({ success: true, log_id: logId });
  } catch (err) {
    console.error('Location Log API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get('attendance_id');

    if (!attendanceId) {
      return NextResponse.json({ error: 'attendance_id is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [rows] = await db.query(
      `SELECT * FROM marketing_location_logs WHERE attendance_id = ? ORDER BY recorded_at ASC`,
      [attendanceId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch Location Logs Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
