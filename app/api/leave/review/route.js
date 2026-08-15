import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { sendMailNotification } from '../../utils/mailHelper.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { leaveId, action, rejectionReason, reviewerName } = body;

    if (!leaveId || !action || !reviewerName) {
      return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    }

    if (!['Approved', 'Rejected'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Invalid action. Must be Approved or Rejected.' }, { status: 400 });
    }

    if (action === 'Rejected' && (!rejectionReason || !rejectionReason.trim())) {
      return NextResponse.json({ success: false, message: 'Rejection reason is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const [existing] = await db.execute(`SELECT * FROM leave_requests WHERE id = ?`, [leaveId]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'Leave request not found.' }, { status: 404 });
    }

    if (existing[0].status !== 'Pending') {
      return NextResponse.json({ success: false, message: `This leave request has already been ${existing[0].status}.` }, { status: 409 });
    }

    const leaveReq = existing[0];
    const reviewedAt = new Date().toISOString();

    await db.execute(
      `UPDATE leave_requests
         SET status = ?, reviewedBy = ?, reviewedAt = ?, rejectionReason = ?
       WHERE id = ?`,
      [action, reviewerName, reviewedAt, action === 'Rejected' ? rejectionReason.trim() : null, leaveId]
    );

    // Fetch employee email address to send decision notification
    try {
      let empEmail = null;
      const [empRows] = await db.execute(`SELECT email, name FROM employees WHERE id = ?`, [leaveReq.employeeId]);
      if (empRows.length > 0 && empRows[0].email) {
        empEmail = empRows[0].email.trim();
      } else {
        // Fallback: search by name
        const [empByName] = await db.execute(`SELECT email FROM employees WHERE LOWER(name) = LOWER(?)`, [leaveReq.employeeName]);
        if (empByName.length > 0 && empByName[0].email) {
          empEmail = empByName[0].email.trim();
        }
      }

      if (empEmail) {
        const isApproved = action === 'Approved';
        const subject = `Leave Request ${action}: ${leaveReq.leaveType} (${leaveReq.fromDate} to ${leaveReq.toDate})`;
        const textBody = `Leave Application Update\n\nHello ${leaveReq.employeeName},\n\nYour leave application for ${leaveReq.leaveType} (${leaveReq.fromDate} to ${leaveReq.toDate}, ${leaveReq.totalDays} day(s)) has been ${action.toUpperCase()} by ${reviewerName}.\n\nReviewed At: ${new Date(reviewedAt).toLocaleString()}\n${action === 'Rejected' && rejectionReason ? `Rejection Reason: ${rejectionReason.trim()}\n` : ''}\nPlease log in to DeviceDesk to view details.`;

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
            <div style="background-color: ${isApproved ? '#16a34a' : '#dc2626'}; padding: 16px 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
              <h2 style="margin: 0; font-size: 20px;">Leave Application ${action}</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Reviewed by <strong>${reviewerName}</strong></p>
            </div>
            <div style="padding: 20px; color: #333333; line-height: 1.6;">
              <p style="margin-top: 0; font-size: 15px;">Hello <strong>${leaveReq.employeeName}</strong>,</p>
              <p>Your leave request has been reviewed by management/HR.</p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 140px; color: #555555;">Leave Type:</td><td style="padding: 8px 0;">${leaveReq.leaveType}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #555555;">Duration:</td><td style="padding: 8px 0;"><strong>${leaveReq.fromDate}</strong> to <strong>${leaveReq.toDate}</strong> (${leaveReq.totalDays} ${leaveReq.totalDays === 1 ? 'day' : 'days'})</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #555555;">Decision Status:</td><td style="padding: 8px 0;"><span style="background: ${isApproved ? '#dcfce7' : '#fee2e2'}; color: ${isApproved ? '#15803d' : '#b91c1c'}; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">${action}</span></td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #555555;">Reviewed By:</td><td style="padding: 8px 0;">${reviewerName}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #555555;">Review Date:</td><td style="padding: 8px 0;">${new Date(reviewedAt).toLocaleString()}</td></tr>
              </table>
              ${action === 'Rejected' && rejectionReason ? `
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 6px; margin-top: 10px;">
                  <p style="margin: 0 0 8px 0; font-weight: bold; color: #991b1b; font-size: 14px;">Reason for Rejection:</p>
                  <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #7f1d1d;">${rejectionReason.trim()}</p>
                </div>
              ` : ''}
            </div>
            <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; font-size: 12px; color: #888888;">
              DeviceDesk HR & Operations • Fly Media Technology
            </div>
          </div>
        `;

        sendMailNotification({
          to: empEmail,
          subject,
          text: textBody,
          html: htmlBody
        }).catch((err) => console.error('Leave review mail dispatch error:', err));
      }
    } catch (mailErr) {
      console.warn('Failed to dispatch leave review notification email:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${action.toLowerCase()} successfully.`
    });
  } catch (error) {
    console.error('Leave Review API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
