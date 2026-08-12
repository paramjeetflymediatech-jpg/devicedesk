import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

// POST /api/agent/ping - Heartbeat endpoint called by desktop agents every 60 seconds
export async function POST(req) {
  try {
    const pool = await getDbConnection();
    const body = await req.json();
    console.log(`[API /agent/ping] Heartbeat received from ${body.employeeName || 'Unknown'} (${body.employeeId || 'Unknown'})`);

    const employeeId = body.employeeId || 'EMP-UNKNOWN';
    const employeeName = body.employeeName || 'Unknown Employee';
    const systemNumber = body.systemNumber || 'DESKTOP-AGENT';
    const department = body.department || 'General';
    const osPlatform = body.osPlatform || process.platform || 'windows';
    const ipAddress = body.ipAddress || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const agentVersion = body.agentVersion || '1.0.0';

    // 1. Ensure table exists
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

    // 2. Upsert ping timestamp & status
    await pool.query(`
      INSERT INTO agent_registrations (id, employeeId, employeeName, department, systemNumber, ipAddress, osPlatform, status, installedAt, lastSeenAt)
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        employeeName = VALUES(employeeName),
        department = VALUES(department),
        ipAddress = VALUES(ipAddress),
        osPlatform = VALUES(osPlatform),
        status = 'ACTIVE',
        lastSeenAt = NOW();
    `, [employeeId, employeeName, department, systemNumber, ipAddress, osPlatform]);

    // 3. Return heartbeat response with dynamic server configuration
    return NextResponse.json({
      success: true,
      message: 'Agent heartbeat acknowledged',
      serverTime: new Date().toISOString(),
      config: {
        pingIntervalMs: 60000,
        captureIntervalMs: 180000,
        isMonitoringActive: true,
        agentVersion: agentVersion
      }
    });

  } catch (err) {
    console.error('Agent ping heartbeat error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// GET /api/agent/ping - Check heartbeat service health
export async function GET() {
  return NextResponse.json({
    status: 'ONLINE',
    service: 'DeviceDesk Agent Connection Ping API',
    timestamp: new Date().toISOString()
  });
}
