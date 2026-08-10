import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';

export async function GET(req) {
  try {
    const pool = await getDbConnection();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || '';
    const department = searchParams.get('department') || '';
    const date = searchParams.get('date') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const search = searchParams.get('search') || '';
    const limitParam = searchParams.get('limit');
    let limit = parseInt(limitParam || '1000', 10);
    if (limitParam === 'all' || limitParam === 'unlimited' || limitParam === '0') {
      limit = 10000;
    }
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = Math.max(0, (page - 1) * limit);

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id VARCHAR(100) PRIMARY KEY,
        employeeId VARCHAR(50) NOT NULL,
        employeeName VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        imageUrl TEXT NOT NULL,
        capturedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        shiftId VARCHAR(100),
        ipAddress VARCHAR(50),
        systemNumber VARCHAR(50),
        activityScore INT DEFAULT 100,
        INDEX idx_emp (employeeId),
        INDEX idx_capturedAt (capturedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 1. Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_registrations (
        id VARCHAR(100) PRIMARY KEY,
        employeeId VARCHAR(100) NOT NULL,
        employeeName VARCHAR(150) NOT NULL,
        department VARCHAR(100),
        systemNumber VARCHAR(100),
        ipAddress VARCHAR(50),
        osPlatform VARCHAR(50),
        serverUrl VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        installedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastSeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_emp_sys (employeeId, systemNumber)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Fetch all screenshots matching filter (Includes all capture types)
    let query = `SELECT * FROM screenshots WHERE 1=1`;
    const params = [];

    if (employeeId && employeeId !== 'all') {
      query += ` AND employeeId = ?`;
      params.push(employeeId);
    }

    if (department && department !== 'all') {
      query += ` AND department = ?`;
      params.push(department);
    }

    if (date) {
      query += ` AND DATE(capturedAt) = ?`;
      params.push(date);
    }

    if (startDate && endDate) {
      query += ` AND DATE(capturedAt) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (search.trim()) {
      query += ` AND (employeeName LIKE ? OR employeeId LIKE ? OR systemNumber LIKE ? OR ipAddress LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    // Count total rows matching filter
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countQuery, params);
    const totalCount = countRows[0]?.total || 0;

    // Query paginated results
    query += ` ORDER BY capturedAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);

    // Fetch registered agents list to display all registered users even if 0 screenshots taken today
    let registrations = [];
    try {
      const [regRows] = await pool.query(`SELECT * FROM agent_registrations ORDER BY lastSeenAt DESC`);
      registrations = regRows || [];
    } catch (e) {}

    // Summary Statistics
    const [statsRows] = await pool.query(`
      SELECT 
        COUNT(*) as totalCaptures,
        COUNT(DISTINCT employeeId) as monitoredEmployees,
        AVG(activityScore) as avgActivity
      FROM screenshots
      WHERE DATE(capturedAt) = CURDATE()
    `);

    const [totalRegCount] = await pool.query(`SELECT COUNT(DISTINCT employeeId) as total FROM agent_registrations`);

    const stats = {
      todayCaptures: statsRows[0]?.totalCaptures || 0,
      todayMonitoredEmployees: Math.max(statsRows[0]?.monitoredEmployees || 0, totalRegCount[0]?.total || 0),
      todayAvgActivity: Math.round(statsRows[0]?.avgActivity || 100),
      totalMatchingFilter: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1
    };

    const formatIso = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      const str = String(val).replace(' ', 'T');
      return (!str.endsWith('Z') && !str.includes('+')) ? new Date(str + 'Z').toISOString() : new Date(str).toISOString();
    };

    const formattedRegs = registrations.map(r => ({
      ...r,
      installedAt: formatIso(r.installedAt),
      lastSeenAt: formatIso(r.lastSeenAt)
    }));

    const formattedRows = rows.map(r => ({
      ...r,
      capturedAt: formatIso(r.capturedAt)
    }));

    return NextResponse.json({
      success: true,
      stats,
      registrations: formattedRegs,
      data: formattedRows
    });

  } catch (err) {
    console.error('Screenshot list error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
