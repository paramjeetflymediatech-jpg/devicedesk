import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const pool = await getDbConnection();
    const body = await req.json();

    const employeeId = body.employeeId || 'EMP-UNKNOWN';
    const employeeName = body.employeeName || 'Unknown Employee';
    const department = body.department || 'General';
    const systemNumber = body.systemNumber || 'DESKTOP-AGENT';
    const serverUrl = body.serverUrl || 'https://devicedesk.flymediatech.com';
    const osPlatform = body.osPlatform || process.platform || 'windows';
    const ipAddress = body.ipAddress || req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Ensure dedicated agent_registrations table exists
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

    // 2. Upsert registration into dedicated table
    const regId = uuidv4();
    await pool.query(`
      INSERT INTO agent_registrations (id, employeeId, employeeName, department, systemNumber, ipAddress, osPlatform, serverUrl, status, installedAt, lastSeenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        employeeName = VALUES(employeeName),
        department = VALUES(department),
        ipAddress = VALUES(ipAddress),
        osPlatform = VALUES(osPlatform),
        serverUrl = VALUES(serverUrl),
        lastSeenAt = NOW(),
        status = 'ACTIVE';
    `, [regId, employeeId, employeeName, department, systemNumber, ipAddress, osPlatform, serverUrl]);

    // 3. Also auto-register in employees master table if missing
    try {
      if (employeeId && employeeId !== 'EMP-UNKNOWN') {
        const [empCheck] = await pool.query(`SELECT id FROM employees WHERE id = ?`, [employeeId]);
        if (!empCheck || empCheck.length === 0) {
          await pool.query(
            `INSERT INTO employees (id, name, department, status, role, createdAt) VALUES (?, ?, ?, 'ACTIVE', 'Employee', NOW())`,
            [employeeId, employeeName || employeeId, department || 'General']
          );
        }
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Agent registration saved to dedicated agent_registrations table successfully',
      data: {
        employeeId,
        employeeName,
        systemNumber,
        department,
        status: 'ACTIVE'
      }
    });

  } catch (err) {
    console.error('Agent registration error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const pool = await getDbConnection();

    // Ensure table exists
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

    const [rows] = await pool.query(`SELECT * FROM agent_registrations ORDER BY lastSeenAt DESC`);
    return NextResponse.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
