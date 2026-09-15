import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';
import { sendMailNotification } from '../utils/mailHelper.js';

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();
    console.log(`[API /login] Login attempt for identifier: "${identifier}" at ${new Date().toISOString()}`);

    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/name and password are required.' }, { status: 400 });
    }

    // Hard-coded admin shortcut
    // if (identifier.toLowerCase() === 'admin' && password === 'admin123') {
    //   return NextResponse.json({
    //     success: true,
    //     user: { role: 'admin', name: 'Admin', dbRole: 'Admin' }
    //   });
    // }

    const db = await getDbConnection();

    // Fetch by email OR name OR id — do NOT compare password in SQL; use bcrypt below
    const [rows] = await db.execute(
      `SELECT id, name, email, password, role, department, ticketLimit, status
       FROM employees
       WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR LOWER(id) = LOWER(?)
       LIMIT 1`,
      [identifier.toLowerCase().trim(), identifier.toLowerCase().trim(), identifier.toLowerCase().trim()]
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
      // 1. Try with configured pepper
      passwordMatch = await bcrypt.compare(password + pepper, storedPassword);
      // 2. Try without pepper (in case hashed directly)
      if (!passwordMatch) {
        passwordMatch = await bcrypt.compare(password, storedPassword);
      }
      // 3. Try with default fallback pepper
      if (!passwordMatch && pepper !== 'devicedesk_secure_pepper_key_2026') {
        passwordMatch = await bcrypt.compare(password + 'devicedesk_secure_pepper_key_2026', storedPassword);
      }
      // 4. Try with securelevel fallback pepper
      if (!passwordMatch && pepper !== 'securelevel') {
        passwordMatch = await bcrypt.compare(password + 'securelevel', storedPassword);
      }
    } else {
      // Legacy plain-text fallback
      passwordMatch = storedPassword === password;
    }

    if (!passwordMatch) {
      return NextResponse.json({ success: false, message: '⚠️ Account not found or incorrect password.' }, { status: 401 });
    }

    // Auto-migrate legacy plain-text password to bcrypt hash upon successful login
    if (!storedPassword.startsWith('$2') && passwordMatch) {
      try {
        const db = await getDbConnection();
        const newHash = await bcrypt.hash(password + pepper, 10);
        await db.execute('UPDATE employees SET password = ? WHERE id = ?', [newHash, emp.id]);
      } catch (migrateErr) {
        console.warn('Auto-hash password migration failed:', migrateErr);
      }
    }

    const isDeskRole = emp.role === 'Admin' || emp.role === 'Management' || emp.role === 'IT Engineer' || emp.role === 'IT Support' || emp.role === 'Team Leader';

    // HR OTP Check
    const dbRoleStr = `${emp.role || ''}`.toLowerCase().trim();
    const deptStr = `${emp.department || ''}`.toLowerCase().trim();
    const isAdminUser =
      dbRoleStr === 'admin' ||
      dbRoleStr === 'superadmin' ||
      dbRoleStr === 'management' ||
      emp.email === 'admin@yopmail.com' ||
      emp.email === 'pravi@yopmail.com';
    const isHRUser = !isAdminUser && dbRoleStr !== 'candidate' && (dbRoleStr === 'hr' || dbRoleStr === 'Management' || dbRoleStr.includes('hr') || deptStr.includes('hr'));

    if (isHRUser) {
      return NextResponse.json({
        success: true,
        requiresOtp: true,
        email: emp.email,
        userId: emp.id
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: isDeskRole ? 'admin' : 'employee',
        dbRole: emp.role,
        department: emp.department,
        ticketLimit: emp.ticketLimit
      }
    });
  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
