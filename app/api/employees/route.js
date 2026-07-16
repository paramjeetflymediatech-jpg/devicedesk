import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { name, email, password, role, department, ticketLimit } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const empId    = 'emp_' + Date.now();
    const empEmail = (email || '').trim() || (name.split(' ')[0].toLowerCase() + '@devicedesk.com');
    const empPass  = (password || '').trim() || (name.split(' ')[0].toLowerCase() + '123');
    const empRole  = (role || 'Team Member').trim();
    const empDept  = (department || 'General').trim();
    const empLimit = Number(ticketLimit) || 5;

    // Hash the password with bcrypt (salt rounds = 10) and secret key
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    const hashedPassword = await bcrypt.hash(empPass + pepper, 10);

    await db.execute(
      `INSERT INTO employees (id, name, email, password, role, department, ticketLimit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, name.trim(), empEmail, hashedPassword, empRole, empDept, empLimit]
    );

    return NextResponse.json({
      success: true,
      employee: { id: empId, name: name.trim(), email: empEmail, role: empRole, department: empDept, ticketLimit: empLimit }
    });
  } catch (err) {
    console.error('Add Employee API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
