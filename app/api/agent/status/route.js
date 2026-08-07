import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

// GET /api/agent/status - Retrieves real-time connectivity status of all desktop agents
export async function GET(req) {
  try {
    const pool = await getDbConnection();

    // Ensure agent_registrations table exists
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

    // Retrieve all registrations
    const [rows] = await pool.query(`
      SELECT 
        id,
        employeeId,
        employeeName,
        department,
        systemNumber,
        ipAddress,
        osPlatform,
        serverUrl,
        status,
        installedAt,
        lastSeenAt,
        CASE 
          WHEN TIMESTAMPDIFF(MINUTE, lastSeenAt, NOW()) <= 5 THEN 'ONLINE'
          ELSE 'OFFLINE'
        END AS connectionState
      FROM agent_registrations
      ORDER BY lastSeenAt DESC;
    `);

    const formatIso = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      const str = String(val).replace(' ', 'T');
      return (!str.endsWith('Z') && !str.includes('+')) ? new Date(str + 'Z').toISOString() : new Date(str).toISOString();
    };

    const formattedRows = rows.map(r => ({
      ...r,
      installedAt: formatIso(r.installedAt),
      lastSeenAt: formatIso(r.lastSeenAt)
    }));

    const onlineCount = formattedRows.filter(r => r.connectionState === 'ONLINE').length;
    const totalCount = formattedRows.length;

    return NextResponse.json({
      success: true,
      summary: {
        totalAgents: totalCount,
        onlineAgents: onlineCount,
        offlineAgents: totalCount - onlineCount
      },
      agents: formattedRows
    });

  } catch (err) {
    console.error('Fetch agent status error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
