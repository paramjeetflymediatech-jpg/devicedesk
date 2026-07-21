import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { name, email, password, role, department, ticketLimit } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email Address is required.' }, { status: 400 });
    }
    if (!password || !password.trim()) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }
    if (!role || !role.trim()) {
      return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
    }
    if (!department || !department.trim()) {
      return NextResponse.json({ error: 'Department is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const empId    = 'emp_' + Date.now();
    const empEmail = email.trim();
    const empPass  = password.trim();
    const empRole  = role.trim();
    const empDept  = department.trim();
    const empLimit = Number(ticketLimit) || 100;

    // Hash the password with bcrypt (salt rounds = 10) and secret key
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    const hashedPassword = await bcrypt.hash(empPass + pepper, 10);

    await db.execute(
      `INSERT INTO employees (id, name, email, password, role, department, ticketLimit, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [empId, name.trim(), empEmail, hashedPassword, empRole, empDept, empLimit]
    );

    // Log employee addition
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    await db.execute(
      `INSERT INTO assignment_history (id, employeeId, systemId, systemNumber, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [logId, empId, null, null, 'Employee Added', new Date().toISOString(), 'Admin']
    ).catch(err => console.error('Failed to log employee creation:', err));

    return NextResponse.json({
      success: true,
      employee: { id: empId, name: name.trim(), email: empEmail, role: empRole, department: empDept, ticketLimit: empLimit, status: 'Active' }
    });
  } catch (err) {
    console.error('Add Employee API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
