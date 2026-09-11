import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const db = await getDbConnection();
    const [domains] = await db.query('SELECT * FROM domains ORDER BY expiry_date ASC');

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiringDomains = [];
    const notificationLogs = [];

    // Email dispatcher helper
    const sendExpiryEmail = async (to, subject, textContent) => {
      try {
        const host = process.env.SMTP_HOST;
        const port = process.env.SMTP_PORT || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const emailSender = process.env.EMAIL_FROM || '"DeviceDesk Domain Alerts" <noreply@devicedeskflymediatech.com>';

        let transporter;
        if (host && user && pass) {
          transporter = nodemailer.createTransport({
            host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: { user, pass }
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
          });
        }

        const info = await transporter.sendMail({
          from: emailSender,
          to,
          subject,
          text: textContent
        });

        // Append to sent_emails.log
        try {
          const logFilePath = path.join(process.cwd(), 'sent_emails.log');
          const logEntry = `[${new Date().toISOString()}] DOMAIN_EXPIRY_ALERT | To: ${to} | Subject: ${subject} | ID: ${info.messageId}\nBody:\n${textContent}\n${'-'.repeat(50)}\n`;
          await fs.appendFile(logFilePath, logEntry, 'utf8');
        } catch (e) {}

        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.error('Failed to dispatch expiry email:', err);
        return { success: false, error: err.message };
      }
    };

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@flymediatech.com';

    for (const d of domains) {
      if (!d.expiry_date) continue;

      const exp = new Date(d.expiry_date);
      exp.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Threshold: expiring within 30 days or already expired
      if (daysLeft <= 30) {
        expiringDomains.push({ ...d, days_left: daysLeft });

        const urgencyLabel = daysLeft < 0 
          ? `EXPIRED (${Math.abs(daysLeft)} days ago)` 
          : daysLeft === 0 
            ? `EXPIRING TODAY` 
            : `EXPIRING IN ${daysLeft} DAYS`;

        // 1. Send alert to Client if email present
        if (d.client_email) {
          const clientSubject = `⚠️ URGENT: Domain Renewal Notice - ${d.domain_name} (${urgencyLabel})`;
          const clientBody = `Dear ${d.client_name || 'Valued Client'},\n\nThis is an automated renewal alert for your domain registered with DeviceDesk / Fly Media Technology.\n\nDomain Name: ${d.domain_name}\nRegistrar: ${d.registrar || 'N/A'}\nExpiry Date: ${d.expiry_date}\nStatus: ${urgencyLabel}\nRenewal Cost: $${d.renewal_cost || '0.00'}\n\nPlease contact your account manager or renewal team immediately to ensure uninterrupted DNS and website services.\n\nThank you,\nDeviceDesk Support Team`;

          await sendExpiryEmail(d.client_email, clientSubject, clientBody);
          notificationLogs.push({ domain: d.domain_name, recipient: d.client_email, status: 'Dispatched', days_left: daysLeft });
        }

        // 2. Send administrative alert to Super Admin
        const adminSubject = `🚨 [Super Admin Alert] Domain Expiry Notice: ${d.domain_name} (${urgencyLabel})`;
        const adminBody = `Super Admin Notification:\n\nThe following domain is expiring soon and requires administrative review / renewal action:\n\n- Domain Name: ${d.domain_name}\n- Client: ${d.client_name || 'Unassigned'} (${d.client_email || 'No Email'})\n- Registrar: ${d.registrar || 'GoDaddy'}\n- Expiry Date: ${d.expiry_date}\n- Days Remaining: ${daysLeft} days\n- Auto-Renew: ${d.auto_renew ? 'Enabled' : 'Disabled'}\n- Estimated Renewal Cost: $${d.renewal_cost || '0.00'}\n\nPlease login to the Super Admin Domain Management Portal at /admin/domains to renew or contact the client.\n\nDeviceDesk Automated Fleet Monitor`;

        await sendExpiryEmail(adminEmail, adminSubject, adminBody);
        notificationLogs.push({ domain: d.domain_name, recipient: adminEmail, status: 'Dispatched', days_left: daysLeft });

        // Update last_notified_at
        await db.execute('UPDATE domains SET last_notified_at = ? WHERE id = ?', [new Date().toISOString(), d.id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Expiry check completed. Processed ${domains.length} domains, found ${expiringDomains.length} expiring/expired.`,
      expiring_domains_count: expiringDomains.length,
      alerts_sent: notificationLogs
    });

  } catch (err) {
    console.error('Check Expiry Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
