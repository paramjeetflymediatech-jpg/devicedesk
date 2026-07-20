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

    // 1. Verify employee exists
    const [empRows] = await db.execute(
      'SELECT id, name, email FROM employees WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [cleanEmail]
    );

    const isDefaultAdmin = cleanEmail === 'admin@devicedesk.com';

    if (empRows.length === 0 && !isDefaultAdmin) {
      return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 });
    }

    const targetEmail = isDefaultAdmin ? 'admin@devicedesk.com' : empRows[0].email;
    const targetName = isDefaultAdmin ? 'Admin' : empRows[0].name;

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

    // 5. Construct Web Reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://devicedesk.flymediatech.com';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // 6. Send Email
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let isEthereal = false;
    let testMessageUrl = null;
    let transporter;

    const bodyText = `Hello ${targetName},\n\nYou requested a password reset for your DeviceDesk account.\n\nPlease click the single-use link below to set a new password on your web browser:\n\n${resetUrl}\n\nNote: This link will expire in 1 hour and can only be used once.\nIf you did not request this, please ignore this email.\n\nBest Regards,\nDeviceDesk IT Support`;

    const mailOptions = {
      from: user || '"DeviceDesk Support" <noreply@devicedesk.com>',
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
      } else {
        throw new Error('No custom SMTP configured');
      }
    } catch (smtpError) {
      console.warn('Custom SMTP failed, using Ethereal mock fallback:', smtpError.message);
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
    }

    if (isEthereal) {
      testMessageUrl = nodemailer.getTestMessageUrl(info);
    }

    // Log to sent_emails.log
    try {
      const logFilePath = path.join(process.cwd(), 'sent_emails.log');
      const logEntry = `[${new Date().toISOString()}] To: ${targetEmail} | ResetLink: ${resetUrl} | EtherealURL: ${testMessageUrl || 'N/A'}\n${'-'.repeat(50)}\n`;
      await fs.appendFile(logFilePath, logEntry, 'utf8');
    } catch (logErr) {
      console.error('Failed to log email:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'A password reset link has been sent to your email address. Please check your inbox and open the link in your web browser.',
      url: testMessageUrl
    });

  } catch (err) {
    console.error('Forgot Password API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
