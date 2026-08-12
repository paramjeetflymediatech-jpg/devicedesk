import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET(req) {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(`SELECT * FROM agent_logs ORDER BY createdAt DESC LIMIT 200`);
      return NextResponse.json({ success: true, data: rows });
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
      await connection.execute(
        `INSERT INTO agent_logs (employeeId, employeeName, action, details, createdAt) VALUES (?, ?, ?, ?, NOW())`,
        [employeeId || 'UNKNOWN', employeeName || 'Unknown Employee', action, details || '']
      );

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
