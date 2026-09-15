import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';

// Helper to ensure table exists
async function ensureAuthorizationsTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS marketing_authorizations (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL UNIQUE,
        employee_name VARCHAR(150),
        assigned_by VARCHAR(100) DEFAULT 'Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure collation is consistent if the table was created under default server collation
    try {
      await db.execute(`
        ALTER TABLE marketing_authorizations 
        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
    } catch (e) {}
  } catch (err) {
    console.warn('ensureAuthorizationsTable notice:', err?.message);
  }
}

/**
 * GET /api/marketing/authorizations
 * Lists all employee IDs authorized by Admin to access Marketing members and data.
 */
export async function GET(request) {
  try {
    const db = await getDbConnection();
    await ensureAuthorizationsTable(db);

    const [cols] = await db.query(`SHOW COLUMNS FROM marketing_authorizations`);
    const colNames = cols.map(c => c.Field);
    const empIdCol = colNames.includes('employee_id') ? 'employee_id' : 'employeeId';
    const empNameCol = colNames.includes('employee_name') ? 'employee_name' : (colNames.includes('employeeName') ? 'employeeName' : empIdCol);
    const assignedByCol = colNames.includes('assigned_by') ? 'assigned_by' : (colNames.includes('assignedBy') ? 'assignedBy' : null);
    const createdAtCol = colNames.includes('created_at') ? 'created_at' : (colNames.includes('createdAt') ? 'createdAt' : null);

    const [rows] = await db.query(
      `SELECT ma.id, 
              ma.${empIdCol} AS employeeId, 
              ma.${empIdCol} AS employee_id,
              ma.${empNameCol} AS employeeName,
              ma.${empNameCol} AS employee_name,
              ${assignedByCol ? `ma.${assignedByCol} AS assignedBy, ma.${assignedByCol} AS assigned_by,` : `'Admin' AS assignedBy, 'Admin' AS assigned_by,`}
              ${createdAtCol ? `ma.${createdAtCol} AS createdAt, ma.${createdAtCol} AS created_at,` : `NOW() AS createdAt, NOW() AS created_at,`}
              e.email, e.role, e.department, e.avatarUrl
       FROM marketing_authorizations ma
       LEFT JOIN employees e ON (ma.${empIdCol} COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
       ${createdAtCol ? `ORDER BY ma.${createdAtCol} DESC` : 'ORDER BY ma.id DESC'}`
    );

    return NextResponse.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Fetch Marketing Authorizations Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/marketing/authorizations
 * Adds an authorized employee to access Marketing members.
 */
export async function POST(request) {
  try {
    const user = await checkAuth(request);
    const userRole = (user?.role || '').toLowerCase();
    const isSuperOrAdmin = userRole.includes('admin') || userRole.includes('management');

    if (!user || !isSuperOrAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { employeeId, employee_id, employeeName, employee_name } = await request.json();
    const targetEmpId = employeeId || employee_id;
    const targetEmpName = employeeName || employee_name || targetEmpId;

    if (!targetEmpId) {
      return NextResponse.json({ success: false, error: 'employeeId is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    await ensureAuthorizationsTable(db);

    const [cols] = await db.query(`SHOW COLUMNS FROM marketing_authorizations`);
    const colNames = cols.map(c => c.Field);
    const empIdCol = colNames.includes('employee_id') ? 'employee_id' : 'employeeId';
    const empNameCol = colNames.includes('employee_name') ? 'employee_name' : 'employeeName';
    const assignedByCol = colNames.includes('assigned_by') ? 'assigned_by' : 'assignedBy';

    const authId = 'mkt_auth_' + Date.now();
    await db.execute(
      `INSERT INTO marketing_authorizations (id, ${empIdCol}, ${empNameCol}, ${assignedByCol})
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ${empNameCol} = VALUES(${empNameCol}), ${assignedByCol} = VALUES(${assignedByCol})`,
      [authId, targetEmpId, targetEmpName, user.name || 'Admin']
    );

    return NextResponse.json({ success: true, message: 'Marketing authorization granted successfully.' });
  } catch (err) {
    console.error('Grant Marketing Authorization Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/marketing/authorizations
 * Revokes marketing access authorization from an employee.
 */
export async function DELETE(request) {
  try {
    const user = await checkAuth(request);
    const userRole = (user?.role || '').toLowerCase();
    const isSuperOrAdmin = userRole.includes('admin') || userRole.includes('management');

    if (!user || !isSuperOrAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || searchParams.get('employee_id');

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'employeeId parameter is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    await ensureAuthorizationsTable(db);

    const [cols] = await db.query(`SHOW COLUMNS FROM marketing_authorizations`);
    const colNames = cols.map(c => c.Field);
    const empIdCol = colNames.includes('employee_id') ? 'employee_id' : 'employeeId';

    await db.execute(`DELETE FROM marketing_authorizations WHERE ${empIdCol} = ?`, [employeeId]);

    return NextResponse.json({ success: true, message: 'Marketing authorization revoked successfully.' });
  } catch (err) {
    console.error('Revoke Marketing Authorization Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
