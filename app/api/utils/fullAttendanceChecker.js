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
 * Checks attendance and dispatches a summary report email (Morning/Afternoon).
 */
export async function checkAndSendSummaryReport(connectionOverride = null, period = 'Morning', force = false) {
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
          date VARCHAR(50) PRIMARY KEY,
          sentAt VARCHAR(50),
          totalEmployees INT,
          recipientCount INT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      const trackingKey = `${todayStr}_${period}`;

      // 1. Check if email was ALREADY sent today for this period
      const [alreadySent] = await db.execute(
        `SELECT date FROM full_attendance_notifs WHERE date = ? LIMIT 1`,
        [trackingKey]
      );

      if (alreadySent.length > 0 && !force) {
        if (shouldRelease) db.release();
        return { success: true, message: `Report already sent for ${trackingKey}.` };
      }

      // 2. Fetch all active non-admin team members and team leaders
      const [activeEmps] = await db.execute(
        `SELECT id, name, role, department, email FROM employees 
         WHERE LOWER(role) IN ('it engineer', 'team member') 
           AND (status IS NULL OR status != 'Paused')`
      );

      if (activeEmps.length === 0) {
        if (shouldRelease) db.release();
        return { success: true, message: 'No active team members found.' };
      }

      // 3. Get today's attendance records
      const [attRows] = await db.execute(
        `SELECT employeeId, punchInTime, status FROM attendance_records WHERE date = ?`,
        [todayStr]
      );

      const attMap = new Map();
      attRows.forEach(r => attMap.set(r.employeeId, r));

      // 4. Categorize employees
      const presentEmps = [];
      const halfDayEmps = [];
      const missingEmps = [];

      activeEmps.forEach((emp) => {
        const att = attMap.get(emp.id);
        if (att && att.punchInTime && att.status !== 'Absent') {
          if (att.status === 'Half Day') {
             halfDayEmps.push({ ...emp, punchInTime: att.punchInTime, attStatus: att.status });
          } else {
             presentEmps.push({ ...emp, punchInTime: att.punchInTime, attStatus: att.status });
          }
        } else {
          missingEmps.push({ ...emp, punchInTime: null, attStatus: 'Absent' });
        }
      });

      // 5. Build HTML Rows for the email
      const generateRows = (emps) => emps.map(emp => {
        const punchInDate = emp.punchInTime ? new Date(emp.punchInTime) : null;
        let formattedPunchIn = '-';
        
        if (punchInDate) {
          formattedPunchIn = punchInDate.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' });
        }

        let statusBgColor = '#f3f4f6';
        let statusBadgeColor = '#4b5563';
        
        const currentStatus = emp.attStatus;
        if (currentStatus === 'Present' || currentStatus === 'Active' || currentStatus === 'Completed' || currentStatus === 'Overtime') {
          statusBgColor = '#dcfce7'; statusBadgeColor = '#166534';
        } else if (currentStatus === 'Late') {
          statusBgColor = '#fef9c3'; statusBadgeColor = '#854d0e';
        } else if (currentStatus === 'Half Day') {
          statusBgColor = '#ffedd5'; statusBadgeColor = '#9a3412';
        } else if (currentStatus === 'Absent') {
          statusBgColor = '#fee2e2'; statusBadgeColor = '#991b1b';
        }

        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px; font-weight: bold; color: #1e293b;">${emp.name}</td>
            <td style="padding: 10px; color: #475569;">${emp.role || 'Team Member'}</td>
            <td style="padding: 10px; color: #475569;">${emp.department || 'General'}</td>
            <td style="padding: 10px; font-weight: 600; color: #0284c7;">${formattedPunchIn}</td>
            <td style="padding: 10px;"><span style="background: ${statusBgColor}; color: ${statusBadgeColor}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">${currentStatus}</span></td>
          </tr>
        `;
      }).join('');

      const presentHtml = presentEmps.length ? generateRows(presentEmps) : '<tr><td colspan="5" style="padding: 10px; text-align: center; color: #64748b;">No employees in this category</td></tr>';
      const halfDayHtml = halfDayEmps.length ? generateRows(halfDayEmps) : '<tr><td colspan="5" style="padding: 10px; text-align: center; color: #64748b;">No employees in this category</td></tr>';
      const absentHtml = missingEmps.length ? generateRows(missingEmps) : '<tr><td colspan="5" style="padding: 10px; text-align: center; color: #64748b;">No employees in this category</td></tr>';

      const subject = `📅 ${period} Attendance Summary: ${presentEmps.length} Present, ${missingEmps.length} Absent (${todayStr})`;
      const textBody = `📅 ${period} Attendance Summary for ${todayStr}\n\nTotal Team Size: ${activeEmps.length}\nPresent: ${presentEmps.length}\nHalf Day: ${halfDayEmps.length}\nAbsent: ${missingEmps.length}\n\nLog in to DeviceDesk Admin Panel for full details.`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #0284c7; padding: 18px 22px; border-radius: 8px 8px 0 0; color: #ffffff; text-align: center;">
            <h2 style="margin: 0; font-size: 22px;">📅 ${period} Attendance Summary</h2>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Date: ${todayStr}</p>
          </div>

          <div style="padding: 22px; color: #333333; line-height: 1.6;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; text-align: center; display: flex; justify-content: space-around;">
              <div>
                <span style="font-size: 12px; color: #166534; font-weight: bold; text-transform: uppercase;">Present</span>
                <h3 style="margin: 6px 0 0 0; color: #15803d; font-size: 24px;">${presentEmps.length}</h3>
              </div>
              <div>
                <span style="font-size: 12px; color: #9a3412; font-weight: bold; text-transform: uppercase;">Half Day</span>
                <h3 style="margin: 6px 0 0 0; color: #c2410c; font-size: 24px;">${halfDayEmps.length}</h3>
              </div>
              <div>
                <span style="font-size: 12px; color: #991b1b; font-weight: bold; text-transform: uppercase;">Absent</span>
                <h3 style="margin: 6px 0 0 0; color: #b91c1c; font-size: 24px;">${missingEmps.length}</h3>
              </div>
            </div>

            <h4 style="margin: 0 0 12px 0; color: #15803d; font-size: 15px;">✅ Present Employees</h4>
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
              <tbody>${presentHtml}</tbody>
            </table>

            <h4 style="margin: 0 0 12px 0; color: #c2410c; font-size: 15px;">⚠️ Half Day Employees</h4>
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
              <tbody>${halfDayHtml}</tbody>
            </table>

            <h4 style="margin: 0 0 12px 0; color: #b91c1c; font-size: 15px;">❌ Absent Employees</h4>
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
              <tbody>${absentHtml}</tbody>
            </table>
          </div>

          <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; font-size: 12px; color: #888888;">
            DeviceDesk Operations & Attendance Monitor • Fly Media Technology
          </div>
        </div>
      `;

      // A. HR, Superadmin, Admin, Management from DB
      const [admins] = await db.execute(
        `SELECT DISTINCT email FROM employees 
         WHERE (LOWER(role) IN ('admin', 'superadmin', 'hr', 'management') 
            OR LOWER(department) IN ('hr', 'human resources'))
           AND email IS NOT NULL AND email != ''`
      );
      let recipientEmails = admins.map(r => r.email.trim());

      // B. Env Support Emails
      const envSupport = process.env.SUPPORT_EMAILS || 'support@flymediatech.com, amandeepkumar.flymediatech@gmail.com';
      envSupport.split(',').forEach((e) => {
        if (e.trim()) recipientEmails.push(e.trim());
      });

      if (process.env.SMTP_USER) {
        recipientEmails.push(process.env.SMTP_USER.trim());
      }

      recipientEmails = Array.from(new Set(recipientEmails));

      // Dispatch Email
      const emailResult = await sendMailNotification({
        to: recipientEmails,
        subject,
        text: textBody,
        html: htmlBody
      });

      // Mark notification as sent for today and period (Update if forced)
      await db.execute(
        `INSERT INTO full_attendance_notifs (date, sentAt, totalEmployees, recipientCount) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE sentAt=VALUES(sentAt), totalEmployees=VALUES(totalEmployees), recipientCount=VALUES(recipientCount)`,
        [trackingKey, new Date().toISOString(), activeEmps.length, recipientEmails.length]
      );

      if (shouldRelease) db.release();

      return {
        success: true,
        presentCount: presentEmps.length,
        halfDayCount: halfDayEmps.length,
        absentCount: missingEmps.length,
        totalCount: activeEmps.length,
        emailResult,
        message: `${period} Attendance summary email successfully sent to recipients.`
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
