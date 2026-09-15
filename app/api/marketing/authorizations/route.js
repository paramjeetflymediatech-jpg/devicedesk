import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';

// Helper to ensure table exists
async function ensureAuthorizationsTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS marketing_authorizations (
        id VARCHAR(100) PRIMARY KEY,
        employeeId VARCHAR(100) NOT NULL UNIQUE,
        employeeName VARCHAR(150),
        assignedBy VARCHAR(100) DEFAULT 'Admin',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    const [rows] = await db.query(
      `SELECT ma.id, ma.employeeId, ma.employeeName, ma.assignedBy, ma.createdAt,
              e.email, e.role, e.department, e.avatarUrl
       FROM marketing_authorizations ma
       LEFT JOIN employees e ON (ma.employeeId COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
       ORDER BY ma.createdAt DESC`
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

    const { employeeId, employeeName } = await request.json();
    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'employeeId is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    await ensureAuthorizationsTable(db);

    const authId = 'mkt_auth_' + Date.now();
    await db.execute(
      `INSERT INTO marketing_authorizations (id, employeeId, employeeName, assignedBy)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE employeeName = VALUES(employeeName), assignedBy = VALUES(assignedBy)`,
      [authId, employeeId, employeeName || employeeId, user.name || 'Admin']
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
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'employeeId parameter is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    await ensureAuthorizationsTable(db);

    await db.execute('DELETE FROM marketing_authorizations WHERE employeeId = ?', [employeeId]);

    return NextResponse.json({ success: true, message: 'Marketing authorization revoked successfully.' });
  } catch (err) {
    console.error('Revoke Marketing Authorization Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
