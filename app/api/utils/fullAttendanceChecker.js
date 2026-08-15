import { getPool } from '../db/db.js';
import { sendMailNotification } from './mailHelper.js';

function formatLocalDate(d) {
  const istDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if ALL active non-admin team members & team leaders have punched in for today.
 * If 100% attendance is reached, dispatches a celebration summary report email to HR / Superadmin.
 */
export async function checkAndSendFullAttendanceReport(connectionOverride = null) {
  try {
    const pool = getPool();
    const db = connectionOverride || await pool.getConnection();
    const shouldRelease = !connectionOverride;

    try {
      const now = new Date();
      const todayStr = formatLocalDate(now);

      // Create tracking table if not exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS full_attendance_notifs (
          date VARCHAR(20) PRIMARY KEY,
          sentAt VARCHAR(50) NOT NULL,
          totalEmployees INT DEFAULT 0,
          recipientCount INT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // 1. Check if email was ALREADY sent today
      const [alreadySent] = await db.execute(
        `SELECT date FROM full_attendance_notifs WHERE date = ? LIMIT 1`,
        [todayStr]
      );

      if (alreadySent.length > 0) {
        if (shouldRelease) db.release();
        return { success: true, alreadySent: true, message: '100% Attendance report already sent for today.' };
      }

      // 2. Fetch all active non-admin team members and team leaders
      const [activeEmps] = await db.execute(
        `SELECT id, name, role, department, email FROM employees 
         WHERE LOWER(role) NOT IN ('admin') 
           AND (status IS NULL OR status != 'Paused')`
      );

      if (activeEmps.length === 0) {
        if (shouldRelease) db.release();
        return { success: true, message: 'No active team members found.' };
      }

      // 3. Fetch today's attendance records
      const [todayAtt] = await db.execute(
        `SELECT id, employeeId, employeeName, punchInTime, status FROM attendance_records WHERE date = ?`,
        [todayStr]
      );

      const attMap = new Map();
      todayAtt.forEach((a) => {
        attMap.set(a.employeeId, a);
      });

      // 4. Check if every active employee has a punch-in record for today
      const presentEmps = [];
      const missingEmps = [];

      activeEmps.forEach((emp) => {
        const att = attMap.get(emp.id);
        if (att && att.punchInTime) {
          presentEmps.push({
            ...emp,
            punchInTime: att.punchInTime,
            status: att.status || 'Present'
          });
        } else {
          missingEmps.push(emp);
        }
      });

      // If missing employees exist, return without sending email
      if (missingEmps.length > 0) {
        if (shouldRelease) db.release();
        return {
          success: true,
          fullAttendance: false,
          presentCount: presentEmps.length,
          totalCount: activeEmps.length,
          missingCount: missingEmps.length,
          message: `${presentEmps.length}/${activeEmps.length} present. Not all members are present yet.`
        };
      }

      // 5. 100% ATTENDANCE ACHIEVED! Gather Recipient Emails
      let recipientEmails = [];

      // A. HR, Superadmin, Admin, Management from DB
      const [admins] = await db.execute(
        `SELECT DISTINCT email FROM employees 
         WHERE (LOWER(role) IN ('admin', 'superadmin', 'hr', 'management') 
            OR LOWER(department) IN ('hr', 'human resources'))
           AND email IS NOT NULL AND email != ''`
      );
      admins.forEach((r) => {
        if (r.email) recipientEmails.push(r.email.trim());
      });

      // B. Env Support Emails
      const envSupport = process.env.SUPPORT_EMAILS || 'support@flymediatech.com, amandeepkumar.flymediatech@gmail.com';
      envSupport.split(',').forEach((e) => {
        if (e.trim()) recipientEmails.push(e.trim());
      });

      if (process.env.SMTP_USER) {
        recipientEmails.push(process.env.SMTP_USER.trim());
      }

      recipientEmails = Array.from(new Set(recipientEmails));

      // 6. Build Roster HTML Table
      const rosterRowsHtml = presentEmps
        .map((emp) => {
          const formattedPunchIn = new Date(emp.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const statusBadgeColor = emp.status === 'Late' ? '#b91c1c' : '#15803d';
          const statusBgColor = emp.status === 'Late' ? '#fee2e2' : '#dcfce7';

          return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; color: #1e293b;">${emp.name}</td>
              <td style="padding: 10px; color: #475569;">${emp.role || 'Team Member'}</td>
              <td style="padding: 10px; color: #475569;">${emp.department || 'General'}</td>
              <td style="padding: 10px; font-weight: 600; color: #0284c7;">${formattedPunchIn}</td>
              <td style="padding: 10px;"><span style="background: ${statusBgColor}; color: ${statusBadgeColor}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">${emp.status}</span></td>
            </tr>
          `;
        })
        .join('');

      const subject = `🎉 100% Attendance Milestone: All Team Members & Leaders Are Present Today! (${todayStr})`;
      const textBody = `🎉 100% Attendance Milestone Reached!\n\nAll ${presentEmps.length} active Team Members and Team Leaders have punched in and are present today (${todayStr}).\n\nTotal Team Size: ${activeEmps.length}\nPresent Count: ${presentEmps.length}\nAttendance Rate: 100%\n\nLog in to DeviceDesk Admin Panel for full details.`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #16a34a; padding: 18px 22px; border-radius: 8px 8px 0 0; color: #ffffff; text-align: center;">
            <h2 style="margin: 0; font-size: 22px;">🎉 100% Full Attendance Milestone</h2>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">All Team Members and Team Leaders are present today!</p>
          </div>

          <div style="padding: 22px; color: #333333; line-height: 1.6;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
              <span style="font-size: 12px; color: #166534; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Attendance Summary (${todayStr})</span>
              <h3 style="margin: 6px 0 0 0; color: #15803d; font-size: 24px;">${presentEmps.length} / ${activeEmps.length} Present (100% Rate)</h3>
            </div>

            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 15px;">Team Attendance Roster:</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Name</th>
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Role</th>
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Department</th>
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Punch-In Time</th>
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rosterRowsHtml}
              </tbody>
            </table>
          </div>

          <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; font-size: 12px; color: #888888;">
            DeviceDesk Operations & Attendance Monitor • Fly Media Technology
          </div>
        </div>
      `;

      // Dispatch Email
      const emailResult = await sendMailNotification({
        to: recipientEmails,
        subject,
        text: textBody,
        html: htmlBody
      });

      // Mark notification as sent for today
      await db.execute(
        `INSERT INTO full_attendance_notifs (date, sentAt, totalEmployees, recipientCount) VALUES (?, ?, ?, ?)`,
        [todayStr, new Date().toISOString(), activeEmps.length, recipientEmails.length]
      );

      if (shouldRelease) db.release();

      return {
        success: true,
        fullAttendance: true,
        presentCount: presentEmps.length,
        totalCount: activeEmps.length,
        emailResult,
        message: '100% Attendance report email successfully sent to recipients.'
      };
    } catch (err) {
      if (shouldRelease && db) db.release();
      throw err;
    }
  } catch (error) {
    console.error('checkAndSendFullAttendanceReport error:', error);
    return { success: false, error: error.message };
  }
}
