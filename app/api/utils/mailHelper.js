import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Universal Mail Notification Dispatcher for API routes
 */
export async function sendMailNotification({ to, subject, text, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('[mailHelper] No recipient email specified.');
    return { success: false, error: 'No recipient email specified' };
  }

  const recipients = Array.isArray(to)
    ? Array.from(new Set(to.map((e) => (e || '').trim()).filter(Boolean))).join(', ')
    : to.trim();

  if (!recipients) {
    return { success: false, error: 'No valid recipient email address.' };
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const emailSender = process.env.EMAIL_FROM || `"Device Desk" <${user || 'noreply@devicedeskflymediatech.com'}>`;

  let transporter;
  let isEthereal = false;
  let testMessageUrl = null;

  const mailOptions = {
    from: emailSender,
    to: recipients,
    subject,
    text,
    html: html || undefined
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
      throw new Error('No custom SMTP credentials configured');
    }
  } catch (smtpError) {
    console.warn('Custom SMTP dispatch failed, utilizing Ethereal fallback:', smtpError.message);
    isEthereal = true;
    try {
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
      info = await transporter.sendMail({
        from: `"Device Desk" <${testAccount.user}>`,
        to: recipients,
        subject,
        text,
        html: html || undefined
      });
      testMessageUrl = nodemailer.getTestMessageUrl(info);
    } catch (etherealErr) {
      console.error('Ethereal fallback error:', etherealErr.message);
      return { success: false, error: etherealErr.message };
    }
  }

  // Append log to sent_emails.log
  try {
    const logFilePath = path.join(process.cwd(), 'sent_emails.log');
    const logEntry = `[${new Date().toISOString()}] To: ${recipients} | Subject: ${subject} | MessageID: ${info?.messageId || 'N/A'}\nText:\n${text}\n${'-'.repeat(50)}\n`;
    await fs.appendFile(logFilePath, logEntry, 'utf8');
  } catch (logError) {
    console.error('Failed to append to sent_emails.log:', logError);
  }

  return {
    success: true,
    messageId: info?.messageId,
    url: testMessageUrl,
    isEthereal
  };
}
