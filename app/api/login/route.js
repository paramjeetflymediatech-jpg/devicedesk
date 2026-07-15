import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/name and password are required.' }, { status: 400 });
    }

    // Hard-coded admin shortcut
    if ((identifier === 'admin' || identifier.toLowerCase() === 'admin') && password === 'admin123') {
      return NextResponse.json({
        success: true,
        user: { role: 'admin', name: 'Admin' }
      });
    }

    const db = await getDbConnection();

    // Try matching by email OR name (case-insensitive)
    const [rows] = await db.execute(
      `SELECT id, name, email, password, role, department, ticketLimit
       FROM employees
       WHERE (LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)) AND password = ?
       LIMIT 1`,
      [identifier, identifier, password]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: '⚠️ Account not found or incorrect password.' }, { status: 401 });
    }

    const emp = rows[0];
    const isAdmin = emp.role === 'Admin' || emp.role === 'Management' || emp.role === 'IT Engineer';

    return NextResponse.json({
      success: true,
      user: {
        id:          emp.id,
        name:        emp.name,
        email:       emp.email,
        role:        isAdmin ? 'admin' : 'employee',
        department:  emp.department,
        ticketLimit: emp.ticketLimit
      }
    });
  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
