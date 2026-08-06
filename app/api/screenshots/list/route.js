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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

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

    // Only include Full OS Desktop Agent screenshots (exclude WEB_TAB captures)
    let query = `SELECT * FROM screenshots WHERE (captureType = 'FULL_DESKTOP' OR captureType IS NULL)`;
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

    // Summary Statistics
    const [statsRows] = await pool.query(`
      SELECT 
        COUNT(*) as totalCaptures,
        COUNT(DISTINCT employeeId) as monitoredEmployees,
        AVG(activityScore) as avgActivity
      FROM screenshots
      WHERE DATE(capturedAt) = CURDATE()
    `);

    const stats = {
      todayCaptures: statsRows[0]?.totalCaptures || 0,
      todayMonitoredEmployees: statsRows[0]?.monitoredEmployees || 0,
      todayAvgActivity: Math.round(statsRows[0]?.avgActivity || 100),
      totalMatchingFilter: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1
    };

    return NextResponse.json({
      success: true,
      stats,
      data: rows
    });

  } catch (err) {
    console.error('Screenshot list error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
