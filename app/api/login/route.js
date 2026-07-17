import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/name and password are required.' }, { status: 400 });
    }

    // Hard-coded admin shortcut
    if (identifier.toLowerCase() === 'admin' && password === 'admin123') {
      return NextResponse.json({
        success: true,
        user: { role: 'admin', name: 'Admin', dbRole: 'Admin' }
      });
    }

    const db = await getDbConnection();

    // Fetch by email OR name — do NOT compare password in SQL; use bcrypt below
    const [rows] = await db.execute(
      `SELECT id, name, email, password, role, department, ticketLimit, status
       FROM employees
       WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)
       LIMIT 1`,
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: '⚠️ Account not found or incorrect password.' }, { status: 401 });
    }

    const emp = rows[0];
    if (emp.status === 'Paused') {
      return NextResponse.json({ success: false, message: '🚫 Your account has been paused due to suspicious activities. Please contact Admin/IT Support.' }, { status: 403 });
    }
    const storedPassword = emp.password || '';

    // Support bcrypt hashes AND legacy plain-text passwords (backward compatibility)
    let passwordMatch = false;
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    if (storedPassword.startsWith('$2')) {
      // Hashed — use bcrypt.compare with secret key
      passwordMatch = await bcrypt.compare(password + pepper, storedPassword);
    } else {
      // Legacy plain-text fallback
      passwordMatch = storedPassword === password;
    }

    if (!passwordMatch) {
      return NextResponse.json({ success: false, message: '⚠️ Account not found or incorrect password.' }, { status: 401 });
    }

    const isAdmin = emp.role === 'Admin' || emp.role === 'Management' || emp.role === 'IT Engineer' || emp.role === 'Team Leader';

    return NextResponse.json({
      success: true,
      user: {
        id:          emp.id,
        name:        emp.name,
        email:       emp.email,
        role:        isAdmin ? 'admin' : 'employee',
        dbRole:      emp.role,
        department:  emp.department,
        ticketLimit: emp.ticketLimit
      }
    });
  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
