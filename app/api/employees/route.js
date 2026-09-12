import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const db = await getDbConnection();
    try {
      await db.query(`ALTER TABLE employees ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    } catch (e) {}

    const [rows] = await db.query(
      `SELECT * FROM employees ORDER BY name ASC`
    );
    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Fetch Employees API Error:', err);
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { 
      name, email, password, role, department, ticketLimit,
      company_name, phone, whatsapp, address, gst_number, website_url, primary_service, notes 
    } = await request.json();

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

    // If it's a client, insert into client_details
    if (empRole.toLowerCase() === 'client') {
      await db.execute(
        `INSERT INTO client_details (client_id, company_name, phone, whatsapp, address, gst_number, website_url, primary_service, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [empId, company_name || null, phone || null, whatsapp || null, address || null, gst_number || null, website_url || null, primary_service || null, notes || null]
      ).catch(err => console.error('Failed to insert client_details:', err));

      // Simulate sending Welcome Email
      const emailId = 'email_' + Date.now();
      const subject = 'Welcome to Your Client Portal';
      const body = `Hi ${name.trim()},\n\nYour client portal account has been created.\n\nLogin URL: /login\nEmail: ${empEmail}\nPassword: ${empPass}\n\nPlease change your password after logging in.\n\nThanks,\nTeam`;
      await db.execute(
        `INSERT INTO sent_emails (id, to_address, subject, body, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [emailId, empEmail, subject, body, new Date().toISOString()]
      ).catch(err => console.error('Failed to log welcome email:', err));
    }

    return NextResponse.json({
      success: true,
      employee: { id: empId, name: name.trim(), email: empEmail, role: empRole, department: empDept, ticketLimit: empLimit, status: 'Active' }
    });
  } catch (err) {
    console.error('Add Employee API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
