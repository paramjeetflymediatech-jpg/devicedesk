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

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 40px 20px; }
          .container { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaedf1; }
          .header { background-color: #06b6d4; padding: 25px 20px; text-align: center; }
          .header h2 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; }
          .content { padding: 35px 30px; color: #444444; line-height: 1.6; }
          .greeting { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 20px; }
          .instructions { font-size: 15px; color: #6b7280; margin-bottom: 25px; }
          .otp-container { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
          .otp-code { font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 6px; margin: 0; }
          .footer { padding: 25px 30px; background-color: #f8fafc; border-top: 1px solid #eaedf1; text-align: center; font-size: 13px; color: #94a3b8; }
          .warning { color: #ef4444; font-size: 13px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>DeviceDesk Security</h2>
          </div>
          <div class="content">
            <div class="greeting">Hello ${emp.name},</div>
            <div class="instructions">
              You recently requested to sign in to the HR Portal. Please use the following One-Time Password to complete your secure login:
            </div>
            
            <div class="otp-container">
              <div class="otp-code">${otpCode}</div>
            </div>
            
            <div class="instructions" style="text-align: center; margin-bottom: 0;">
              This code will expire in <strong>5 minutes</strong>.
            </div>
            
            <div class="warning">
              If you did not request this code, please ignore this email or contact IT Support immediately.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} DeviceDesk. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    // Send Email in background (fire-and-forget) to prevent blocking the UI
    sendMailNotification({
      to: email,
      subject: 'DeviceDesk HR Login Verification',
      text: `Your OTP is: ${otpCode}`,
      html: emailContent
    }).catch(err => {
      console.error('Background OTP email failed:', err);
    });

    return NextResponse.json({ success: true, message: 'OTP dispatch initiated.' });
  } catch (err) {
    console.error('Request OTP API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
