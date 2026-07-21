import { NextResponse } from 'next/server';
import { getDbConnection, getPool } from '../db/db.js';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await getDbConnection();
    const db = getPool();

    const { employees: incoming } = await request.json();

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'No employee records provided.' }, { status: 400 });
    }

    // Fetch existing employees for duplicate check (by email OR name)
    const [existing] = await db.execute('SELECT name, email FROM employees');
    const existingEmails = new Set(existing.map(e => (e.email || '').trim().toLowerCase()));
    const existingNames  = new Set(existing.map(e => (e.name  || '').trim().toLowerCase()));

    // Fetch existing departments
    const [existingDeptsRows] = await db.execute('SELECT name FROM departments');
    const existingDepts = new Set(existingDeptsRows.map(d => d.name.trim().toLowerCase()));

    const imported   = [];
    const duplicates = [];
    const errors     = [];

    for (const row of incoming) {
      const name  = (row.name  || row['Name']  || row['Employee Name'] || '').toString().trim();
      const email = (row.email || row['Email'] || row['Email Address']  || '').toString().trim();

      if (!name) {
        errors.push({ reason: 'Missing Name' });
        continue;
      }

      const emailKey = email.toLowerCase();
      const nameKey  = name.toLowerCase();

      if (existingEmails.has(emailKey) || existingNames.has(nameKey)) {
        duplicates.push(name + (email ? ` (${email})` : ''));
        continue;
      }

      const empId    = 'emp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const empEmail = email || (name.split(' ')[0].toLowerCase() + '@devicedesk.com');
      const rawPass  = (row.password || row['Password'] || row['Pass'] || name.split(' ')[0].toLowerCase() + '123').toString().trim();
      const empRole  = (row.role     || row['Role']     || 'Team Member').toString().trim();
      const empDept  = (row.department || row['Department'] || row['Dept'] || 'General').toString().trim();
      const empLimit = Number(row.ticketLimit || row['Ticket Limit'] || row['ticketlimit'] || 100);

      // Auto-create department if it does not exist
      if (empDept && !existingDepts.has(empDept.toLowerCase())) {
        const newDeptId = 'dept_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await db.execute(
          `INSERT IGNORE INTO departments (id, name) VALUES (?, ?)`,
          [newDeptId, empDept]
        ).catch(err => console.error('Failed to auto-create department:', err));
        
        // Log department addition
        const deptLogId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        await db.execute(
          `INSERT INTO assignment_history (id, employeeId, systemId, systemNumber, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [deptLogId, null, null, null, `Department Added (Imported): ${empDept}`, new Date().toISOString(), 'Admin']
        ).catch(() => {});

        existingDepts.add(empDept.toLowerCase());
      }

      // Hash password with bcrypt and secret key
      const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
      const hashedPassword = await bcrypt.hash(rawPass + pepper, 10);

      await db.execute(
        `INSERT INTO employees (id, name, email, password, role, department, ticketLimit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [empId, name, empEmail, hashedPassword, empRole, empDept, empLimit]
      );

      // Log employee addition
      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      await db.execute(
        `INSERT INTO assignment_history (id, employeeId, systemId, systemNumber, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [logId, empId, null, null, 'Employee Added (Imported)', new Date().toISOString(), 'Admin']
      ).catch(() => {});

      // Track to prevent within-batch duplicates
      existingEmails.add(emailKey || empEmail.toLowerCase());
      existingNames.add(nameKey);

      imported.push({ id: empId, name, email: empEmail, role: empRole, department: empDept });
    }

    return NextResponse.json({ success: true, imported: imported.length, duplicates, errors });
  } catch (err) {
    console.error('Bulk employee import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
