import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log(`[API /agent/login] Incoming login request for identifier: ${body.identifier}, System: ${body.systemNumber || 'Unknown'}`);
    const { identifier, password } = body;
    const osPlatform = body.osPlatform || process.platform || 'windows';
    const systemNumber = body.systemNumber || `AGENT-${osPlatform.toUpperCase()}`;
    const serverUrl = body.serverUrl || 'https://devicedesk.flymediatech.com';
    const ipAddress = body.ipAddress || req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (!identifier || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email/Employee ID and Password are required.'
      }, { status: 400 });
    }

    const pool = await getDbConnection();

    // 1. Fetch employee by ID, Email, or Name
    const [rows] = await pool.execute(
      `SELECT id, name, email, password, role, department, ticketLimit, status
       FROM employees
       WHERE LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)
       LIMIT 1`,
      [identifier.toLowerCase().trim(), identifier.toLowerCase().trim(), identifier.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: '⚠️ Account not found. Please check your credentials.'
      }, { status: 401 });
    }

    const emp = rows[0];

    if (emp.status === 'Paused') {
      return NextResponse.json({
        success: false,
        message: '🚫 Account is paused. Please contact your IT Admin.'
      }, { status: 403 });
    }

    const storedPassword = emp.password || '';
    let passwordMatch = false;
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';

    if (storedPassword.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password + pepper, storedPassword);
    } else {
      passwordMatch = storedPassword === password;
    }

    if (!passwordMatch) {
      return NextResponse.json({
        success: false,
        message: '⚠️ Incorrect password. Please try again.'
      }, { status: 401 });
    }

    // Auto-migrate plain-text password to bcrypt hash
    if (!storedPassword.startsWith('$2') && passwordMatch) {
      try {
        const newHash = await bcrypt.hash(password + pepper, 10);
        await pool.execute('UPDATE employees SET password = ? WHERE id = ?', [newHash, emp.id]);
      } catch (e) {}
    }

    // 2. Ensure agent_registrations table exists
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

    // 3. Upsert agent registration
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
    `, [regId, emp.id, emp.name, emp.department || 'General', systemNumber, ipAddress, osPlatform, serverUrl]);

    return NextResponse.json({
      success: true,
      message: 'Agent authenticated and connected successfully',
      user: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department || 'General',
        role: emp.role || 'Employee'
      }
    });

  } catch (err) {
    console.error('Agent login API error:', err);
    return NextResponse.json({ success: false, message: 'Server connection error.' }, { status: 500 });
  }
}
