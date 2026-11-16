import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET(req) {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      try {
        const [rows] = await connection.execute(`SELECT * FROM agent_logs ORDER BY createdAt DESC LIMIT 200`);
        return NextResponse.json({ success: true, data: rows });
      } catch (err) {
        if (err.errno === 1054 || err.code === 'ER_BAD_FIELD_ERROR') {
          // Attempt to add column dynamically
          await connection.execute(`ALTER TABLE agent_logs ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).catch(() => null);
          const [fallbackRows] = await connection.execute(`SELECT * FROM agent_logs ORDER BY id DESC LIMIT 200`);
          return NextResponse.json({ success: true, data: fallbackRows });
        }
        throw err;
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { employeeId, employeeName, action, details } = body;

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      try {
        await connection.execute(
          `INSERT INTO agent_logs (employeeId, employeeName, action, details, createdAt) VALUES (?, ?, ?, ?, NOW())`,
          [employeeId || 'UNKNOWN', employeeName || 'Unknown Employee', action, details || '']
        );
      } catch (insertErr) {
        if (insertErr.errno === 1054 || insertErr.code === 'ER_BAD_FIELD_ERROR') {
          // Automatically add missing createdAt column and retry
          try {
            await connection.execute(`ALTER TABLE agent_logs ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            await connection.execute(
              `INSERT INTO agent_logs (employeeId, employeeName, action, details, createdAt) VALUES (?, ?, ?, ?, NOW())`,
              [employeeId || 'UNKNOWN', employeeName || 'Unknown Employee', action, details || '']
            );
          } catch (retryErr) {
            // Fallback: insert without createdAt
            await connection.execute(
              `INSERT INTO agent_logs (employeeId, employeeName, action, details) VALUES (?, ?, ?, ?)`,
              [employeeId || 'UNKNOWN', employeeName || 'Unknown Employee', action, details || '']
            );
          }
        } else {
          throw insertErr;
        }
      }

      // Automatically update agent status to LOGGED_OUT if employee logs out
      if (action === 'LOGOUT' && employeeId && employeeId !== 'UNKNOWN') {
        await connection.execute(
          `UPDATE agent_registrations SET status = 'LOGGED_OUT' WHERE employeeId = ?`,
          [employeeId]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Insert agent log error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
