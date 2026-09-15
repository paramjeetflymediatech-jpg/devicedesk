import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';
import { isMarketingAuthorized } from '../../utils/marketingAuth.js';

async function ensureLocationLogsTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS marketing_location_logs (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL,
        attendance_id VARCHAR(100) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(10, 2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {}

  // Drop any legacy foreign keys on marketing_location_logs to prevent ER_NO_REFERENCED_ROW_2 constraint errors
  try {
    const [fks] = await db.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'marketing_location_logs' 
        AND TABLE_SCHEMA = DATABASE() 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    for (const fk of fks) {
      try {
        await db.execute(`ALTER TABLE marketing_location_logs DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
      } catch (e) {}
    }
  } catch (e) {}
}

export async function POST(request) {
  try {
    const { employee_id, attendance_id, latitude, longitude, accuracy } = await request.json();

    if (!employee_id || !attendance_id || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required location data (employee_id, attendance_id, latitude, longitude).' }, { status: 400 });
    }

    const db = await getDbConnection();
    await ensureLocationLogsTable(db);

    const logId = 'loc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    await db.execute(
      `INSERT INTO marketing_location_logs (id, employee_id, attendance_id, latitude, longitude, accuracy) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [logId, employee_id, attendance_id, latitude, longitude, accuracy || null]
    );

    // Also update current location and last ping timestamp in marketing_attendance
    try {
      await db.execute(
        `UPDATE marketing_attendance 
         SET current_latitude = ?, current_longitude = ?, last_location_update = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [latitude, longitude, attendance_id]
      );
    } catch (e) {}

    return NextResponse.json({ success: true, log_id: logId, message: 'Location logged successfully' });
  } catch (err) {
    console.error('Location Log API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = await checkAuth(request);
    const hasMarketingAccess = await isMarketingAuthorized(user);

    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get('attendance_id');
    const employeeId = searchParams.get('employee_id');

    if (!hasMarketingAccess && (!user || user.id !== employeeId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Marketing location access restricted.' }, { status: 403 });
    }

    const db = await getDbConnection();
    await ensureLocationLogsTable(db);

    let query = `
      SELECT ml.*, e.name as employee_name, e.department as employee_department
      FROM marketing_location_logs ml
      LEFT JOIN employees e ON (ml.employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
    `;
    let params = [];

    if (attendanceId) {
      query += ` WHERE ml.attendance_id = ? ORDER BY ml.recorded_at ASC`;
      params.push(attendanceId);
    } else if (employeeId) {
      query += ` WHERE ml.employee_id = ? ORDER BY ml.recorded_at DESC LIMIT 200`;
      params.push(employeeId);
    } else {
      query += ` ORDER BY ml.recorded_at DESC LIMIT 100`;
    }

    const [rows] = await db.query(query, params);

    return NextResponse.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Fetch Location Logs Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
