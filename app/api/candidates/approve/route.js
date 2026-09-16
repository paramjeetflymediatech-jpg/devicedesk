import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../api/db/db.js';
import bcrypt from 'bcryptjs';
import { sendMailNotification } from '../../utils/mailHelper.js';

export async function POST(request) {
  try {
    const data = await request.json();
    const { registrationId, testTitle, testInstructions, fileUrl, testType, mcqData } = data;

    if (!registrationId) {
      return NextResponse.json({ success: false, error: 'Registration ID required.' }, { status: 400 });
    }
    if (!testTitle) {
      return NextResponse.json({ success: false, error: 'Test title is required.' }, { status: 400 });
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
      [empId, reg.name, reg.email, hashedPassword, 'Candidate', 'N/A', 'Active', 0]
    );

    // 4. Update registration status
    await db.execute(
      `UPDATE candidate_registrations SET status = 'Approved' WHERE id = ?`,
      [registrationId]
    );

    // 5. Assign Test
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const dbTestType = testType === 'mcq' ? 'mcq' : 'text';
    const dbTestData = testType === 'mcq' ? JSON.stringify(mcqData || []) : null;
    const dbTestInstructions = testType === 'mcq' ? 'Please complete the multiple choice questions below.' : testInstructions;

    await db.execute(
      `INSERT INTO candidate_tests (id, candidate_employee_id, test_title, test_instructions, file_url, test_type, test_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [testId, empId, testTitle, dbTestInstructions, fileUrl || '', dbTestType, dbTestData]
    );

    // 6. Send Email Notification
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailSubject = `Application Approved - Test Assigned: ${testTitle}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0284c7;">Congratulations, ${reg.name}!</h2>
        <p>Your application has been reviewed and approved by our HR team. We would like to invite you to complete the next step of our interview process: <strong>${testTitle}</strong>.</p>
        <p>A secure temporary candidate portal has been generated for you to view the test instructions and submit your work.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Your Temporary Login Details</h3>
          <p style="margin: 8px 0;"><strong>Portal URL:</strong> <a href="${loginUrl}" target="_blank" style="color: #0284c7;">${loginUrl}</a></p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${reg.email}</p>
          <p style="margin: 8px 0;"><strong>Password:</strong> <span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 15px; font-weight: bold;">${tempPasswordRaw}</span></p>
        </div>

        <p style="font-size: 14px; color: #475569;">Please log in using the credentials above to review the full instructions and begin your assessment.</p>
        <p style="font-size: 14px; color: #475569;">Best of luck!</p>
        <br/>
        <p style="font-size: 14px; color: #475569;">Regards,<br/><strong>HR Recruitment Team</strong></p>
      </div>
    `;

    sendMailNotification({
      to: reg.email,
      subject: emailSubject,
      html: emailHtml
    }).catch(err => console.error('Failed to send candidate email:', err));

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
