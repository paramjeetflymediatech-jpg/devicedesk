import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';
import { isMarketingAuthorized } from '../../utils/marketingAuth.js';

async function ensureMarketingAttendanceTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS marketing_attendance (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL,
        check_in_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        check_in_latitude DECIMAL(10, 8),
        check_in_longitude DECIMAL(11, 8),
        check_out_at TIMESTAMP NULL,
        check_out_latitude DECIMAL(10, 8),
        check_out_longitude DECIMAL(11, 8),
        total_km DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Checked In'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {}

  // Drop any legacy foreign keys on marketing_attendance to prevent ER_NO_REFERENCED_ROW_2 constraint errors
  try {
    const [fks] = await db.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'marketing_attendance' 
        AND TABLE_SCHEMA = DATABASE() 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    for (const fk of fks) {
      try {
        await db.execute(`ALTER TABLE marketing_attendance DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
      } catch (e) {}
    }
  } catch (e) {}

  try {
    const [cols] = await db.query(`SHOW COLUMNS FROM marketing_attendance`);
    const existingColNames = cols.map(c => c.Field);

    // Relax any legacy NOT NULL columns without defaults (like 'date', etc.)
    for (const col of cols) {
      if (col.Field !== 'id' && col.Null === 'NO' && col.Default === null && !col.Extra?.includes('auto_increment')) {
        try {
          await db.execute(`ALTER TABLE marketing_attendance MODIFY COLUMN \`${col.Field}\` ${col.Type} NULL DEFAULT NULL`);
        } catch (e) {}
      }
    }

    const columnsToAdd = [
      { name: 'from_location', def: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'to_location', def: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'notes', def: 'TEXT DEFAULT NULL' },
      { name: 'check_in_at', def: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP' },
      { name: 'check_in_latitude', def: 'DECIMAL(10, 8) DEFAULT NULL' },
      { name: 'check_in_longitude', def: 'DECIMAL(11, 8) DEFAULT NULL' },
      { name: 'dest_latitude', def: 'DECIMAL(10, 8) DEFAULT NULL' },
      { name: 'dest_longitude', def: 'DECIMAL(11, 8) DEFAULT NULL' },
      { name: 'estimated_km', def: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'current_latitude', def: 'DECIMAL(10, 8) DEFAULT NULL' },
      { name: 'current_longitude', def: 'DECIMAL(11, 8) DEFAULT NULL' },
      { name: 'last_location_update', def: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'check_out_at', def: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'check_out_latitude', def: 'DECIMAL(10, 8) DEFAULT NULL' },
      { name: 'check_out_longitude', def: 'DECIMAL(11, 8) DEFAULT NULL' },
      { name: 'total_km', def: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'status', def: "VARCHAR(50) DEFAULT 'Checked In'" },
      { name: 'device_id', def: 'VARCHAR(100) DEFAULT NULL' }
    ];

    for (const col of columnsToAdd) {
      if (!existingColNames.includes(col.name)) {
        try {
          await db.execute(`ALTER TABLE marketing_attendance ADD COLUMN \`${col.name}\` ${col.def}`);
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('ensureMarketingAttendanceTable notice:', err?.message);
  }
}

export async function POST(request) {
  try {
    const { 
      employee_id, action, latitude, longitude, 
      from_location, to_location, notes,
      dest_latitude, dest_longitude, estimated_km,
      attendance_id, total_km,
      device_id, deviceId
    } = await request.json();

    if (!employee_id || !action || !latitude || !longitude) {
      return NextResponse.json({ error: 'employee_id, action, latitude, and longitude are required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    await ensureMarketingAttendanceTable(db);

    if (action === 'check_in') {
      const attendanceId = 'att_' + Date.now();
      const status = 'Checked In';
      const activeDeviceId = device_id || deviceId || null;

      // Check current table columns to construct matching insert query
      const [cols] = await db.query(`SHOW COLUMNS FROM marketing_attendance`);
      const colNames = cols.map(c => c.Field);
      const hasDeviceIdCol = colNames.includes('device_id');

      if (colNames.includes('date')) {
        const today = new Date().toISOString().split('T')[0];
        if (hasDeviceIdCol) {
          await db.execute(
            `INSERT INTO marketing_attendance (id, employee_id, date, from_location, to_location, notes, check_in_at, check_in_latitude, check_in_longitude, dest_latitude, dest_longitude, estimated_km, current_latitude, current_longitude, last_location_update, status, device_id) 
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
            [
              attendanceId, employee_id, today, 
              from_location || null, to_location || null, notes || null, 
              latitude, longitude, 
              dest_latitude || null, dest_longitude || null, estimated_km || 0,
              latitude, longitude, status, activeDeviceId
            ]
          );
        } else {
          await db.execute(
            `INSERT INTO marketing_attendance (id, employee_id, date, from_location, to_location, notes, check_in_at, check_in_latitude, check_in_longitude, dest_latitude, dest_longitude, estimated_km, current_latitude, current_longitude, last_location_update, status) 
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [
              attendanceId, employee_id, today, 
              from_location || null, to_location || null, notes || null, 
              latitude, longitude, 
              dest_latitude || null, dest_longitude || null, estimated_km || 0,
              latitude, longitude, status
            ]
          );
        }
      } else {
        if (hasDeviceIdCol) {
          await db.execute(
            `INSERT INTO marketing_attendance (id, employee_id, from_location, to_location, notes, check_in_at, check_in_latitude, check_in_longitude, dest_latitude, dest_longitude, estimated_km, current_latitude, current_longitude, last_location_update, status, device_id) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
            [
              attendanceId, employee_id, 
              from_location || null, to_location || null, notes || null, 
              latitude, longitude, 
              dest_latitude || null, dest_longitude || null, estimated_km || 0,
              latitude, longitude, status, activeDeviceId
            ]
          );
        } else {
          await db.execute(
            `INSERT INTO marketing_attendance (id, employee_id, from_location, to_location, notes, check_in_at, check_in_latitude, check_in_longitude, dest_latitude, dest_longitude, estimated_km, current_latitude, current_longitude, last_location_update, status) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [
              attendanceId, employee_id, 
              from_location || null, to_location || null, notes || null, 
              latitude, longitude, 
              dest_latitude || null, dest_longitude || null, estimated_km || 0,
              latitude, longitude, status
            ]
          );
        }
      }

      // Also create the initial point in marketing_location_logs
      try {
        await db.execute(
          `CREATE TABLE IF NOT EXISTS marketing_location_logs (
            id VARCHAR(100) PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            attendance_id VARCHAR(100) NOT NULL,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            accuracy DECIMAL(10, 2),
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        );
        const logId = 'loc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        await db.execute(
          `INSERT INTO marketing_location_logs (id, employee_id, attendance_id, latitude, longitude)
           VALUES (?, ?, ?, ?, ?)`,
          [logId, employee_id, attendanceId, latitude, longitude]
        );
      } catch (logErr) {}

      return NextResponse.json({ success: true, attendance_id: attendanceId, message: 'Check-in successful' });
    } 
    
    else if (action === 'check_out') {
      if (!attendance_id) {
        return NextResponse.json({ error: 'attendance_id is required for check-out.' }, { status: 400 });
      }

      await db.execute(
        `UPDATE marketing_attendance 
         SET check_out_at = CURRENT_TIMESTAMP, check_out_latitude = ?, check_out_longitude = ?, current_latitude = ?, current_longitude = ?, last_location_update = CURRENT_TIMESTAMP, total_km = ?, status = 'Checked Out' 
         WHERE id = ? AND employee_id = ?`,
        [latitude, longitude, latitude, longitude, total_km || 0, attendance_id, employee_id]
      );

      // Log checkout point
      try {
        const logId = 'loc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        await db.execute(
          `INSERT INTO marketing_location_logs (id, employee_id, attendance_id, latitude, longitude)
           VALUES (?, ?, ?, ?, ?)`,
          [logId, employee_id, attendance_id, latitude, longitude]
        );
      } catch (logErr) {}

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
    const user = await checkAuth(request);
    const hasMarketingAccess = await isMarketingAuthorized(user);

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    // Non-authorized user can only view their own attendance (if they are the employee)
    if (!hasMarketingAccess && (!user || user.id !== employeeId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Marketing access restricted.' }, { status: 403 });
    }

    const db = await getDbConnection();
    await ensureMarketingAttendanceTable(db);

    let query = `
      SELECT ma.*, 
             e.name as employee_name, 
             e.email as employee_email, 
             e.avatarUrl as employee_avatar, 
             e.department as employee_department
      FROM marketing_attendance ma
      LEFT JOIN employees e ON (ma.employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
      ORDER BY ma.check_in_at DESC
    `;
    let params = [];

    if (employeeId) {
      query = `
        SELECT ma.*, 
               e.name as employee_name, 
               e.email as employee_email, 
               e.avatarUrl as employee_avatar, 
               e.department as employee_department
        FROM marketing_attendance ma
        LEFT JOIN employees e ON (ma.employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
        WHERE ma.employee_id = ?
        ORDER BY ma.check_in_at DESC
      `;
      params.push(employeeId);
    }

    const [rows] = await db.query(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch Marketing Attendance Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
