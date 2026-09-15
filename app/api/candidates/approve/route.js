import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../api/db/db.js';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const data = await request.json();
    const { registrationId, testTitle, testInstructions, fileUrl } = data;

    if (!registrationId) {
      return NextResponse.json({ success: false, error: 'Registration ID required.' }, { status: 400 });
    }
    if (!testTitle || !testInstructions) {
      return NextResponse.json({ success: false, error: 'Test title and instructions are required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // 1. Fetch registration
    const [regs] = await db.execute(`SELECT * FROM candidate_registrations WHERE id = ? LIMIT 1`, [registrationId]);
    if (regs.length === 0) {
      return NextResponse.json({ success: false, error: 'Registration not found.' }, { status: 404 });
    }
    const reg = regs[0];
    if (reg.status === 'Approved') {
      return NextResponse.json({ success: false, error: 'Candidate already approved.' }, { status: 400 });
    }

    // 2. Generate Temp Password and Employee ID
    const tempPasswordRaw = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPasswordRaw, 10);
    const empId = `cand_${Date.now()}`;

    // 3. Insert into employees
    await db.execute(
      `INSERT INTO employees (id, name, email, password, role, department, status, ticketLimit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [empId, reg.name, reg.email, hashedPassword, 'Candidate', 'HR', 'Active', 0]
    );

    // 4. Update registration status
    await db.execute(
      `UPDATE candidate_registrations SET status = 'Approved' WHERE id = ?`,
      [registrationId]
    );

    // 5. Assign Test
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await db.execute(
      `INSERT INTO candidate_tests (id, candidate_employee_id, test_title, test_instructions, file_url)
       VALUES (?, ?, ?, ?, ?)`,
      [testId, empId, testTitle, testInstructions, fileUrl || '']
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Candidate approved, login generated, and test assigned successfully.',
      credentials: {
        email: reg.email,
        password: tempPasswordRaw
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.warn('Candidate Approve API Warning: Blocked duplicate email entry.');
      return NextResponse.json({ 
        success: false, 
        error: 'This email is already registered in the system (possibly as an existing employee). For testing purposes, please submit a new candidate application using a different, unique email address.' 
      }, { status: 400 });
    }
    console.error('Candidate Approve API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error processing approval' }, { status: 500 });
  }
}
