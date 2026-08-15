import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { sendMailNotification } from '../../utils/mailHelper.js';

function calcWorkingDays(from, to) {
  let count = 0;
  const start = new Date(from);
  const end = new Date(to);
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeId, employeeName, leaveType, fromDate, toDate, reason } = body;

    if (!employeeId || !employeeName || !leaveType || !fromDate || !toDate) {
      return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, message: 'Reason is required.' }, { status: 400 });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return NextResponse.json({ success: false, message: 'From date must be on or before To date.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check for overlapping pending/approved leave for the same employee
    const [overlap] = await db.execute(
      `SELECT id FROM leave_requests
       WHERE employeeId = ?
         AND status IN ('Pending', 'Approved')
         AND fromDate <= ? AND toDate >= ?`,
      [employeeId, toDate, fromDate]
    );
    if (overlap.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'You already have a pending or approved leave that overlaps with the selected dates.'
      }, { status: 409 });
    }

    const id = `leave_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const appliedAt = new Date().toISOString();
    const totalDays = calcWorkingDays(fromDate, toDate);

    await db.execute(
      `INSERT INTO leave_requests
         (id, employeeId, employeeName, leaveType, fromDate, toDate, totalDays, reason, status, appliedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [id, employeeId, employeeName, leaveType, fromDate, toDate, totalDays, reason.trim(), appliedAt]
    );

    // Send email notification to HR and Superadmin
    let recipientEmails = [];
    try {
      const [adminRows] = await db.execute(
        `SELECT DISTINCT email FROM employees 
         WHERE (LOWER(role) IN ('admin', 'superadmin', 'hr', 'management') 
            OR LOWER(department) IN ('hr', 'human resources'))
           AND email IS NOT NULL AND email != ''`
      );
      adminRows.forEach((r) => {
        if (r.email) recipientEmails.push(r.email.trim());
      });
    } catch (dbErr) {
      console.warn('Failed to fetch HR/Superadmin emails from DB:', dbErr.message);
    }

    const envSupport = process.env.SUPPORT_EMAILS || 'support@flymediatech.com, amandeepkumar.flymediatech@gmail.com';
    envSupport.split(',').forEach((e) => {
      if (e.trim()) recipientEmails.push(e.trim());
    });

    recipientEmails = Array.from(new Set(recipientEmails));

    if (recipientEmails.length > 0) {
      const subject = `🌴 New Leave Application: ${employeeName} (${leaveType})`;
      const textBody = `New Leave Application Submitted\n\nEmployee: ${employeeName}\nLeave Type: ${leaveType}\nDuration: ${fromDate} to ${toDate} (${totalDays} day(s))\nReason:\n${reason.trim()}\n\nApplied At: ${new Date(appliedAt).toLocaleString()}\n\nPlease log in to the DeviceDesk Admin Panel to review and process this leave request.`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #0284c7; padding: 16px 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">🌴 New Leave Application</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Submitted by <strong>${employeeName}</strong></p>
          </div>
          <div style="padding: 20px; color: #333333; line-height: 1.6;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 140px; color: #555555;">Employee Name:</td><td style="padding: 8px 0; font-weight: bold;">${employeeName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #555555;">Leave Type:</td><td style="padding: 8px 0;"><span style="background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">${leaveType}</span></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #555555;">Dates / Duration:</td><td style="padding: 8px 0;"><strong>${fromDate}</strong> to <strong>${toDate}</strong> (${totalDays} ${totalDays === 1 ? 'day' : 'days'})</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #555555;">Applied At:</td><td style="padding: 8px 0;">${new Date(appliedAt).toLocaleString()}</td></tr>
            </table>
            <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 15px; border-radius: 6px; margin-top: 10px;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #0369a1; font-size: 14px;">Reason for Leave:</p>
              <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #1e293b;">${reason.trim()}</p>
            </div>
          </div>
          <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; font-size: 12px; color: #888888;">
            DeviceDesk HR & Leave Management • Fly Media Technology
          </div>
        </div>
      `;

      sendMailNotification({
        to: recipientEmails,
        subject,
        text: textBody,
        html: htmlBody
      }).catch((err) => console.error('Leave apply mail dispatch error:', err));
    }

    return NextResponse.json({ success: true, message: 'Leave request submitted successfully.', id });
  } catch (error) {
    console.error('Leave Apply API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
