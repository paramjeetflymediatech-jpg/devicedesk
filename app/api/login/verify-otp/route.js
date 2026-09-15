import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(request) {
  try {
    const { userId, otp } = await request.json();
    console.log('[Verify OTP] Incoming payload:', { userId, otp });

    if (!userId || !otp) {
      return NextResponse.json({ success: false, message: 'User ID and OTP are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check OTP existence
    console.log('[Verify OTP] Checking DB for:', { userId, otp });
    const [otpRows] = await db.execute(
      `SELECT * FROM login_otps WHERE employeeId = ? AND otp = ? ORDER BY createdAt DESC LIMIT 1`,
      [userId, otp]
    );
    console.log('[Verify OTP] DB result:', otpRows);

    if (otpRows.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid OTP. Please check the code and try again.' }, { status: 400 });
    }

    const otpRecord = otpRows[0];
    
    if (otpRecord.used === 1 || otpRecord.used === true) {
      return NextResponse.json({ success: false, message: 'This OTP has already been invalidated by a newer login attempt! Please check sent_emails.log for the newest code.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (now > otpRecord.expiresAt) {
      return NextResponse.json({ success: false, message: 'OTP has expired. Please resend.' }, { status: 400 });
    }

    // Mark as used
    await db.execute(`UPDATE login_otps SET used = 1 WHERE id = ?`, [otpRecord.id]);

    // Fetch user details for login success
    const [empRows] = await db.execute(`SELECT * FROM employees WHERE id = ? LIMIT 1`, [userId]);

    if (empRows.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const emp = empRows[0];

    const isDeskRole = emp.role === 'Admin' || emp.role === 'Management' || emp.role === 'IT Engineer' || emp.role === 'IT Support' || emp.role === 'Team Leader';

    return NextResponse.json({
      success: true,
      user: {
        id:          emp.id,
        name:        emp.name,
        email:       emp.email,
        role:        isDeskRole ? 'admin' : 'employee',
        dbRole:      emp.role,
        department:  emp.department,
        ticketLimit: emp.ticketLimit
      }
    });
  } catch (err) {
    console.error('Verify OTP API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
