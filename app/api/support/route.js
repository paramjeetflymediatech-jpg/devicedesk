import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { name, email, category, subject, message } = await request.json();

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message content are required.' },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const supportRecipient = 'support@flymediatech.com';
    const categoryLabel = (category || 'General').toUpperCase();
    const emailSubject = `[DeviceDesk Support - ${categoryLabel}] ${subject || 'New Inquiry'} from ${name || email}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #0284c7; padding: 16px 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">DeviceDesk Support Ticket</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">New customer support inquiry submitted via mobile/web portal</p>
        </div>
        
        <div style="padding: 20px; color: #333333; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 130px; color: #555555;">Sender Name:</td>
              <td style="padding: 8px 0;">${name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555555;">Contact Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0284c7; font-weight: bold;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555555;">Category:</td>
              <td style="padding: 8px 0;"><span style="background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">${categoryLabel}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555555;">Subject:</td>
              <td style="padding: 8px 0;">${subject || 'No Subject Provided'}</td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 15px; border-radius: 4px; margin-top: 10px;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #0369a1; font-size: 14px;">Inquiry / Issue Description:</p>
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #1e293b;">${message}</p>
          </div>
        </div>

        <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; font-size: 12px; color: #888888;">
          DeviceDesk Support Desk • Fly Media Technology<br />
          Sent at: ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    const textBody = `New DeviceDesk Support Ticket\n\nSender: ${name || 'N/A'} <${email}>\nCategory: ${categoryLabel}\nSubject: ${subject || 'N/A'}\n\nMessage:\n${message}\n\nSent: ${new Date().toLocaleString()}`;

    let isEthereal = false;
    let testMessageUrl = null;
    let transporter;

    try {
      if (host && user && pass) {
        transporter = nodemailer.createTransport({
          host,
          port: Number(port),
          secure: Number(port) === 465,
          auth: { user, pass }
        });
      } else {
        throw new Error('No custom SMTP credentials configured');
      }

      // Send inquiry email to support team
      await transporter.sendMail({
        from: `"${name || 'DeviceDesk User'}" <${user}>`,
        replyTo: email,
        to: `${supportRecipient}, ${user}`,
        subject: emailSubject,
        text: textBody,
        html: htmlBody
      });

      // Send automated confirmation back to the user
      await transporter.sendMail({
        from: `"DeviceDesk Support" <${user}>`,
        to: email,
        subject: `[Received] We received your DeviceDesk support inquiry: ${subject || 'Support Ticket'}`,
        text: `Hello ${name || 'User'},\n\nThank you for contacting DeviceDesk Support. We have received your inquiry regarding "${subject || 'Support Ticket'}" and our support team will respond within 24 hours.\n\nYour message details:\nCategory: ${categoryLabel}\nMessage: ${message}\n\nBest regards,\nDeviceDesk Support Team\nFly Media Technology`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0284c7; margin-top: 0;">Support Request Received</h2>
            <p>Hello <strong>${name || 'User'}</strong>,</p>
            <p>Thank you for reaching out to DeviceDesk Support. We have received your inquiry and our team is reviewing your request.</p>
            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569;"><strong>Subject:</strong> ${subject || 'Support Ticket'}</p>
              <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Status:</strong> Queued for Technician Review</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">We aim to respond to all inquiries within 24 hours.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">DeviceDesk Support Team • Fly Media Technology</p>
          </div>
        `
      });

    } catch (smtpError) {
      console.warn('Primary SMTP dispatch failed, utilizing Ethereal fallback:', smtpError.message);
      isEthereal = true;
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

      const info = await transporter.sendMail({
        from: `"DeviceDesk Support" <${testAccount.user}>`,
        to: `${supportRecipient}, ${email}`,
        subject: emailSubject,
        text: textBody,
        html: htmlBody
      });

      testMessageUrl = nodemailer.getTestMessageUrl(info);
    }

    // Append to sent_emails.log
    try {
      const logFilePath = path.join(process.cwd(), 'sent_emails.log');
      const logEntry = `[${new Date().toISOString()}] SUPPORT FORM | From: ${name} <${email}> | Category: ${categoryLabel} | Subject: ${subject} | EtherealURL: ${testMessageUrl || 'N/A'}\nMessage:\n${message}\n${'-'.repeat(60)}\n`;
      await fs.appendFile(logFilePath, logEntry, 'utf8');
    } catch (logError) {
      console.error('Failed to log support email to sent_emails.log:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Support request sent successfully.',
      testUrl: testMessageUrl,
      isEthereal
    });

  } catch (error) {
    console.error('Support Route Nodemailer Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send support email.' },
      { status: 500 }
    );
  }
}
