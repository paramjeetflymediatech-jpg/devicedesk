import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { sendMailNotification } from '../../utils/mailHelper.js';

export async function POST(request) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ success: false, message: 'User ID and Email are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Verify user exists
    const [empRows] = await db.execute(`SELECT id, name FROM employees WHERE id = ? AND email = ? LIMIT 1`, [userId, email]);
    if (empRows.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }
    const emp = empRows[0];

    // Invalidate old OTPs
    await db.execute(`UPDATE login_otps SET used = 1 WHERE employeeId = ? AND used = 0`, [userId]);

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const otpId = `otp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    await db.execute(
      `INSERT INTO login_otps (id, employeeId, email, otp, createdAt, expiresAt, used) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [otpId, userId, email, otpCode, new Date().toISOString(), expiresAt, 0]
    );

    // Send Email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #06b6d4;">HR Portal Login Verification</h2>
        <p>Hi ${emp.name},</p>
        <p>Please use the following One-Time Password (OTP) to complete your login:</p>
        <div style="font-size: 24px; font-weight: bold; margin: 20px 0; padding: 15px; background: #f4f4f4; border-radius: 8px; text-align: center; letter-spacing: 2px;">
          ${otpCode}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you did not request this login, please contact IT Support immediately.</p>
      </div>
    `;

    await sendMailNotification({
      to: email,
      subject: 'DeviceDesk HR Login Verification',
      text: `Your OTP is: ${otpCode}`,
      html: emailContent
    });

    return NextResponse.json({ success: true, message: 'OTP resent successfully.' });
  } catch (err) {
    console.error('Resend OTP API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
