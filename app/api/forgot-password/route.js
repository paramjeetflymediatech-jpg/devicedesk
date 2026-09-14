import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { email } = await request.json();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Ensure password_reset_tokens table exists dynamically
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(255) NOT NULL,
        createdAt VARCHAR(50) NOT NULL,
        expiresAt VARCHAR(50) NOT NULL,
        used INT DEFAULT 0,
        INDEX idx_token (token),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 1. Verify employee exists by email, name, or id
    const [empRows] = await db.execute(
      'SELECT id, name, email FROM employees WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR LOWER(id) = LOWER(?) LIMIT 1',
      [cleanEmail, cleanEmail, cleanEmail]
    );

    const isDefaultAdmin = cleanEmail === 'admin@devicedesk.com' || cleanEmail === 'admin' || cleanEmail === 'superadmin';

    if (empRows.length === 0 && !isDefaultAdmin) {
      return NextResponse.json({ success: false, message: 'No account found with this email or username.' }, { status: 404 });
    }

    const targetEmail = empRows.length > 0 ? empRows[0].email : 'admin@devicedesk.com';
    const targetName = empRows.length > 0 ? empRows[0].name : 'Admin';

    // 2. Invalidate / expire all previous active tokens for this email
    await db.execute(
      'UPDATE password_reset_tokens SET used = 1 WHERE LOWER(email) = LOWER(?) AND used = 0',
      [targetEmail]
    );

    // 3. Generate new secure single-use token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenId = 'rst_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour TTL

    // 4. Save token to DB
    await db.execute(
      'INSERT INTO password_reset_tokens (id, email, token, createdAt, expiresAt, used) VALUES (?, ?, ?, ?, ?, 0)',
      [tokenId, targetEmail, token, createdAt, expiresAt]
    );

    // 5. Construct Web Reset URL dynamically from request host
    const hostHeader = request.headers?.get ? request.headers.get('host') : (request.headers ? request.headers['host'] : null);
    const protoHeader = request.headers?.get ? (request.headers.get('x-forwarded-proto') || 'https') : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (hostHeader ? `${protoHeader}://${hostHeader}` : 'http://localhost:3000');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // 6. Send Email
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let emailSent = false;
    let isEthereal = false;
    let testMessageUrl = null;
    let transporter;

    const bodyText = `Hello ${targetName},\n\nYou requested a password reset for your DeviceDesk account.\n\nPlease click the single-use link below to set a new password on your web browser:\n\n${resetUrl}\n\nNote: This link will expire in 1 hour and can only be used once.\nIf you did not request this, please ignore this email.\n\nBest Regards,\nDeviceDesk IT Support`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || (user ? `"DeviceDesk Support" <${user}>` : '"DeviceDesk Support" <noreply@devicedesk.com>'),
      to: targetEmail,
      subject: 'Reset your DeviceDesk Password',
      text: bodyText
    };

    let info;
    try {
      if (host && user && pass) {
        transporter = nodemailer.createTransport({
          host,
          port: Number(port),
          secure: Number(port) === 465,
          auth: { user, pass }
        });
        info = await transporter.sendMail(mailOptions);
        emailSent = true;
      } else {
        throw new Error('No custom SMTP configured');
      }
    } catch (smtpError) {
      console.warn('Custom SMTP failed (quota or config), falling back:', smtpError.message);
      try {
        isEthereal = true;
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
        info = await transporter.sendMail({
          from: `"DeviceDesk Support" <${testAccount.user}>`,
          to: targetEmail,
          subject: 'Reset your DeviceDesk Password',
          text: bodyText
        });
        testMessageUrl = nodemailer.getTestMessageUrl(info);
      } catch (etherealErr) {
        console.warn('Ethereal fallback also failed:', etherealErr.message);
      }
    }

    // 7. Save record into sent_emails database table
    try {
      const emailRecordId = 'eml_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      await db.execute(
        `INSERT INTO sent_emails (id, to_address, subject, body, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [emailRecordId, targetEmail, mailOptions.subject, bodyText, createdAt]
      );
    } catch (dbErr) {
      console.error('Failed to record in sent_emails table:', dbErr.message);
    }

    // 8. Log to sent_emails.log
    try {
      const logFilePath = path.join(process.cwd(), 'sent_emails.log');
      const logEntry = `[${new Date().toISOString()}] To: ${targetEmail} | ResetLink: ${resetUrl} | EtherealURL: ${testMessageUrl || 'N/A'}\n${'-'.repeat(50)}\n`;
      await fs.appendFile(logFilePath, logEntry, 'utf8');
    } catch (logErr) {
      console.error('Failed to log email:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `A password reset link has been sent to ${targetEmail}. Please check your inbox.`
        : `A password reset link has been generated for ${targetEmail}.`,
      emailSent,
      resetUrl,
      previewUrl: testMessageUrl
    });

  } catch (err) {
    console.error('Forgot Password API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
