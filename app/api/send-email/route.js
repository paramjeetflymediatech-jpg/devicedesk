import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { to, subject, body } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Determine SMTP configuration (use env variables if defined, otherwise Ethereal mock)
    let transporter;
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let isEthereal = false;
    let testMessageUrl = null;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass }
      });
    } else {
      isEthereal = true;
      // Auto-generate test SMTP service account from ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const mailOptions = {
      from: user || '"DeviceDesk Support" <noreply@devicedesk.com>',
      to,
      subject,
      text: body
    };

    const info = await transporter.sendMail(mailOptions);

    if (isEthereal) {
      testMessageUrl = nodemailer.getTestMessageUrl(info);
    }

    // Append email log to a physical file in the workspace
    try {
      const logFilePath = path.join(process.cwd(), 'sent_emails.log');
      const logEntry = `[${new Date().toISOString()}] To: ${to} | Subject: ${subject} | MessageID: ${info.messageId} | EtherealURL: ${testMessageUrl || 'N/A'}\nBody:\n${body}\n${'-'.repeat(50)}\n`;
      await fs.appendFile(logFilePath, logEntry, 'utf8');
    } catch (logError) {
      console.error('Failed to write to sent_emails.log:', logError);
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      url: testMessageUrl,
      isEthereal
    });

  } catch (error) {
    console.error('Nodemailer Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
