import { getPool } from '../db/db.js';
import { sendMailNotification } from './mailHelper.js';

function formatLocalDate(d) {
  const istDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDayDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Checks attendance and dispatches a summary report email (Morning/Afternoon/Evening).
 * - At 9:30 PM (Evening): Includes dedicated listing of employees who forgot to punch out today (auto-closed at 9:00 PM).
 * - At 11:00 AM (Morning): Includes today's attendance PLUS yesterday's employees who forgot to punch out (auto-closed last night at 9:00 PM).
 */
export async function checkAndSendSummaryReport(connectionOverride = null, period = 'Morning', force = false, dateOverride = null) {
  try {
    const pool = getPool();
    const db = connectionOverride || await pool.getConnection();
    const shouldRelease = !connectionOverride;

    try {
      const now = new Date();
      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      
      // Stop automatic emails on Sundays unless forced
      if (istDate.getDay() === 0 && !force) {
        if (shouldRelease) db.release();
        return { success: true, message: 'Skipped: Automatic emails are disabled on Sundays.' };
      }

      const todayStr = dateOverride || formatLocalDate(now);
      const yesterdayStr = getPreviousDayDateStr(todayStr);

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
         WHERE LOWER(role) NOT IN ('admin', 'superadmin', 'management', 'client', 'candidate', 'dns manager') 
           AND LOWER(COALESCE(department, '')) NOT IN ('dns manager')
           AND (status IS NULL OR LOWER(TRIM(status)) NOT IN ('paused', 'inactive'))`
      );

      if (activeEmps.length === 0) {
        if (shouldRelease) db.release();
        return { success: true, message: 'No active team members found.' };
      }

      // 3. Get today's attendance records with punch in/out and remarks
      const [attRows] = await db.execute(
        `SELECT employeeId, employeeName, punchInTime, punchOutTime, status, totalWorkMinutes, totalBreakMinutes, netWorkMinutes, remarks 
         FROM attendance_records WHERE date = ?`,
        [todayStr]
      );

      const attMap = new Map();
      attRows.forEach(r => attMap.set(r.employeeId, r));

      // 4. Categorize TODAY's employees
      const autoClosedEmps = [];
      const presentEmps = [];
      const halfDayEmps = [];
      const missingEmps = [];
      const categorizedEmpIds = new Set();

      activeEmps.forEach((emp) => {
        categorizedEmpIds.add(emp.id);
        const att = attMap.get(emp.id);
        if (att && att.punchInTime && att.status !== 'Absent') {
          const st = (att.status || '').toLowerCase().trim();
          const rem = (att.remarks || '').toLowerCase();
          const isAutoClosed = (st === 'auto closed' || rem.includes('auto punched-out') || rem.includes('auto closed')) && !st.includes('absent') && !rem.includes('absent');
          const recordEmpName = (att.employeeName && att.employeeName.trim()) || emp.name;

          if (isAutoClosed) {
            autoClosedEmps.push({ 
              ...emp, 
              name: recordEmpName,
              punchInTime: att.punchInTime, 
              punchOutTime: att.punchOutTime, 
              netWorkMinutes: att.netWorkMinutes || 0,
              totalWorkMinutes: att.totalWorkMinutes || 0,
              attStatus: 'Auto Closed (Forgot Punch-Out)',
              remarks: att.remarks || 'Auto punched-out at 09:00 PM'
            });
          } else if (att.status === 'Half Day') {
            halfDayEmps.push({ 
              ...emp, 
              name: recordEmpName,
              punchInTime: att.punchInTime, 
              punchOutTime: att.punchOutTime, 
              netWorkMinutes: att.netWorkMinutes || 0,
              totalWorkMinutes: att.totalWorkMinutes || 0,
              attStatus: att.status,
              remarks: att.remarks || ''
            });
          } else {
            presentEmps.push({ 
              ...emp, 
              name: recordEmpName,
              punchInTime: att.punchInTime, 
              punchOutTime: att.punchOutTime, 
              netWorkMinutes: att.netWorkMinutes || 0,
              totalWorkMinutes: att.totalWorkMinutes || 0,
              attStatus: att.status,
              remarks: att.remarks || ''
            });
          }
        } else {
          missingEmps.push({ ...emp, punchInTime: null, punchOutTime: null, attStatus: 'Absent' });
        }
      });

      // Capture any employee who has an Auto Closed attendance record today but wasn't in activeEmps
      attRows.forEach(att => {
        if (!categorizedEmpIds.has(att.employeeId) && att.punchInTime && att.status !== 'Absent') {
          const st = (att.status || '').toLowerCase().trim();
          const rem = (att.remarks || '').toLowerCase();
          const isAutoClosed = (st === 'auto closed' || rem.includes('auto punched-out') || rem.includes('auto closed')) && !st.includes('absent') && !rem.includes('absent');
          if (isAutoClosed) {
            autoClosedEmps.push({
              id: att.employeeId,
              name: att.employeeName || 'Team Member',
              role: 'Team Member',
              department: 'General',
              punchInTime: att.punchInTime,
              punchOutTime: att.punchOutTime,
              netWorkMinutes: att.netWorkMinutes || 0,
              totalWorkMinutes: att.totalWorkMinutes || 0,
              attStatus: 'Auto Closed (Forgot Punch-Out)',
              remarks: att.remarks || 'Auto punched-out at 09:00 PM'
            });
          }
        }
      });

      // 5. Fetch YESTERDAY's Auto-Closed records (for Morning report follow-up)
      let yesterdayAutoClosedEmps = [];
      try {
        const [yesterdayAttRows] = await db.execute(
          `SELECT employeeId, employeeName, punchInTime, punchOutTime, status, totalWorkMinutes, totalBreakMinutes, netWorkMinutes, remarks 
           FROM attendance_records WHERE date = ?`,
          [yesterdayStr]
        );

        const empInfoMap = new Map();
        activeEmps.forEach(e => empInfoMap.set(e.id, e));

        yesterdayAttRows.forEach(att => {
          const st = (att.status || '').toLowerCase().trim();
          const rem = (att.remarks || '').toLowerCase();
          const isAutoClosed = (st === 'auto closed' || rem.includes('auto punched-out') || rem.includes('auto closed')) && !st.includes('absent') && !rem.includes('absent');
          if (isAutoClosed && att.punchInTime) {
            const empInfo = empInfoMap.get(att.employeeId) || {};
            yesterdayAutoClosedEmps.push({
              id: att.employeeId,
              name: (att.employeeName && att.employeeName.trim()) || empInfo.name || 'Team Member',
              role: empInfo.role || 'Team Member',
              department: empInfo.department || 'General',
              punchInTime: att.punchInTime,
              punchOutTime: att.punchOutTime,
              netWorkMinutes: att.netWorkMinutes || 0,
              totalWorkMinutes: att.totalWorkMinutes || 0,
              attStatus: 'Auto Closed (Forgot Punch-Out)',
              remarks: att.remarks || 'Auto punched-out at 09:00 PM'
            });
          }
        });
      } catch (yErr) {
        console.warn('Could not fetch yesterday auto-closed records:', yErr.message);
      }

      // Helper to format IST times
      const formatTimeIST = (timeStr) => {
        if (!timeStr) return '-';
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' });
      };

      const formatDuration = (mins) => {
        if (!mins || mins <= 0) return '0h 0m';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
      };

      // HTML Row Generators
      const generateStandardRows = (emps) => emps.map(emp => {
        const formattedIn = formatTimeIST(emp.punchInTime);
        const formattedOut = formatTimeIST(emp.punchOutTime);
        const workDuration = formatDuration(emp.netWorkMinutes);

        let statusBgColor = '#dcfce7';
        let statusBadgeColor = '#166534';
        
        const currentStatus = emp.attStatus;
        if (currentStatus === 'Late') {
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
            <td style="padding: 10px; font-weight: 600; color: #0284c7;">${formattedIn}</td>
            <td style="padding: 10px; font-weight: 600; color: #475569;">${formattedOut}</td>
            <td style="padding: 10px; font-weight: 600; color: #0f766e;">${workDuration}</td>
            <td style="padding: 10px;"><span style="background: ${statusBgColor}; color: ${statusBadgeColor}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">${currentStatus}</span></td>
          </tr>
        `;
      }).join('');

      const generateAutoClosedRows = (emps, dateLabel = '') => emps.map(emp => {
        const formattedIn = formatTimeIST(emp.punchInTime);
        const formattedOut = formatTimeIST(emp.punchOutTime);
        const workDuration = formatDuration(emp.netWorkMinutes);

        return `
          <tr style="border-bottom: 1px solid #fed7aa; background-color: #fff7ed;">
            <td style="padding: 10px; font-weight: bold; color: #9a3412;">${emp.name}</td>
            <td style="padding: 10px; color: #7c2d12;">${emp.role || 'Team Member'}</td>
            <td style="padding: 10px; color: #7c2d12;">${emp.department || 'General'}</td>
            <td style="padding: 10px; font-weight: 600; color: #0369a1;">${formattedIn} ${dateLabel ? `(${dateLabel})` : '(Morning)'}</td>
            <td style="padding: 10px; font-weight: 600; color: #c2410c;">${formattedOut} (9:00 PM Auto)</td>
            <td style="padding: 10px; font-weight: 600; color: #7c2d12;">${workDuration}</td>
            <td style="padding: 10px;">
              <span style="background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                ⚠️ Forgot Punch-Out
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const isMorning = period.toLowerCase() === 'morning';
      const isEvening = period.toLowerCase() === 'evening';

      // Auto Closed HTML
      const autoClosedHtml = autoClosedEmps.length 
        ? generateAutoClosedRows(autoClosedEmps) 
        : '<tr><td colspan="7" style="padding: 14px; text-align: center; color: #166534; font-weight: 600; background: #f0fdf4;">✅ Great news! No employees forgot to punch out today. All punch-outs were recorded properly.</td></tr>';

      const yesterdayAutoClosedHtml = yesterdayAutoClosedEmps.length
        ? generateAutoClosedRows(yesterdayAutoClosedEmps, 'Yesterday')
        : '<tr><td colspan="7" style="padding: 14px; text-align: center; color: #166534; font-weight: 600; background: #f0fdf4;">✅ All employees punched out properly yesterday. No auto-closed records.</td></tr>';

      const presentHtml = presentEmps.length 
        ? generateStandardRows(presentEmps) 
        : '<tr><td colspan="7" style="padding: 10px; text-align: center; color: #64748b;">No employees in this category</td></tr>';

      const halfDayHtml = halfDayEmps.length 
        ? generateStandardRows(halfDayEmps) 
        : '<tr><td colspan="7" style="padding: 10px; text-align: center; color: #64748b;">No employees in this category</td></tr>';

      const absentHtml = missingEmps.length 
        ? missingEmps.map(emp => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; color: #1e293b;">${emp.name}</td>
              <td style="padding: 10px; color: #475569;">${emp.role || 'Team Member'}</td>
              <td style="padding: 10px; color: #475569;">${emp.department || 'General'}</td>
              <td style="padding: 10px; color: #94a3b8;">-</td>
              <td style="padding: 10px; color: #94a3b8;">-</td>
              <td style="padding: 10px; color: #94a3b8;">0h 0m</td>
              <td style="padding: 10px;"><span style="background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">Absent</span></td>
            </tr>
          `).join('')
        : '<tr><td colspan="7" style="padding: 10px; text-align: center; color: #64748b;">No employees in this category</td></tr>';

      // 6. Subject Line Generation
      let subject = '';
      if (isEvening) {
        subject = `🌙 Evening Attendance & 9:00 PM Auto-Close Report: ${presentEmps.length} Present, ${autoClosedEmps.length} Forgot Punch-Out, ${missingEmps.length} Absent (${todayStr})`;
      } else if (isMorning) {
        subject = `📅 Morning Attendance Summary: ${presentEmps.length} Present, ${missingEmps.length} Absent${yesterdayAutoClosedEmps.length > 0 ? ` • ⚠️ ${yesterdayAutoClosedEmps.length} Forgot Punch-Out Yesterday` : ''} (${todayStr})`;
      } else {
        subject = `📅 ${period} Attendance Summary: ${presentEmps.length} Present, ${missingEmps.length} Absent (${todayStr})`;
      }

      // 7. Plain-Text Formatting (Logged in sent_emails.log and sent in plain text part)
      const formatEmpText = (emp, idx, isAuto = false) => {
        const inStr = formatTimeIST(emp.punchInTime);
        const outStr = formatTimeIST(emp.punchOutTime);
        const durStr = formatDuration(emp.netWorkMinutes);
        const roleDept = [emp.role, emp.department].filter(Boolean).join(' • ') || 'Team Member';
        if (isAuto) {
          return `${idx + 1}. ${emp.name} (${roleDept})\n   - Morning Punch-In:  ${inStr}\n   - Auto Punch-Out:    ${outStr} (09:00 PM IST Auto)\n   - Net Work Duration: ${durStr} (${emp.netWorkMinutes || 0} mins)\n   - Status:            ⚠️ Auto Closed (Forgot Punch-Out)\n   - Remarks:           ${emp.remarks || 'Auto punched-out at 09:00 PM'}`;
        }
        return `${idx + 1}. ${emp.name} (${roleDept})\n   - Morning Punch-In:  ${inStr}\n   - Evening Punch-Out: ${outStr}\n   - Net Work Duration: ${durStr} (${emp.netWorkMinutes || 0} mins)\n   - Status:            ${emp.attStatus}`;
      };

      let textDetails = '';

      // If Morning: Show Yesterday's Auto-Closed listing upfront
      if (isMorning) {
        textDetails += `\n=======================================================\n`;
        textDetails += `⚠️ YESTERDAY'S UNPUNCHED EMPLOYEES (AUTO-CLOSED AT 9:00 PM ON ${yesterdayStr}) [${yesterdayAutoClosedEmps.length}]\n`;
        textDetails += `=======================================================\n`;
        if (yesterdayAutoClosedEmps.length > 0) {
          textDetails += yesterdayAutoClosedEmps.map((e, idx) => formatEmpText(e, idx, true)).join('\n\n') + '\n';
        } else {
          textDetails += `✅ All employees punched out properly yesterday. No auto-closed records.\n`;
        }

        textDetails += `\n=======================================================\n`;
        textDetails += `✅ TODAY'S PRESENT EMPLOYEES (MORNING PUNCH-IN) [${presentEmps.length}]\n`;
        textDetails += `=======================================================\n`;
        if (presentEmps.length > 0) {
          textDetails += presentEmps.map((e, idx) => formatEmpText(e, idx, false)).join('\n\n') + '\n';
        } else {
          textDetails += `(No employees punched in yet today)\n`;
        }
      } else {
        // Evening / Afternoon: Show Today's Auto-Closed listing
        textDetails += `\n=======================================================\n`;
        textDetails += `⚠️ EMPLOYEES WHO FORGOT TO PUNCH OUT (AUTO-CLOSED AT 9:00 PM TODAY) [${autoClosedEmps.length}]\n`;
        textDetails += `=======================================================\n`;
        if (autoClosedEmps.length > 0) {
          textDetails += autoClosedEmps.map((e, idx) => formatEmpText(e, idx, true)).join('\n\n') + '\n';
        } else {
          textDetails += `✅ Great news! No employees forgot to punch out today. All punch-outs were recorded properly.\n`;
        }

        textDetails += `\n=======================================================\n`;
        textDetails += `✅ PRESENT EMPLOYEES (NORMAL PUNCH-OUT) [${presentEmps.length}]\n`;
        textDetails += `=======================================================\n`;
        if (presentEmps.length > 0) {
          textDetails += presentEmps.map((e, idx) => formatEmpText(e, idx, false)).join('\n\n') + '\n';
        } else {
          textDetails += `(No employees in this category)\n`;
        }
      }

      if (halfDayEmps.length > 0) {
        textDetails += `\n=======================================================\n`;
        textDetails += `⚠️ TODAY'S HALF DAY EMPLOYEES [${halfDayEmps.length}]\n`;
        textDetails += `=======================================================\n`;
        textDetails += halfDayEmps.map((e, idx) => formatEmpText(e, idx, false)).join('\n\n') + '\n';
      }

      textDetails += `\n=======================================================\n`;
      textDetails += `❌ TODAY'S ABSENT EMPLOYEES [${missingEmps.length}]\n`;
      textDetails += `=======================================================\n`;
      if (missingEmps.length > 0) {
        textDetails += missingEmps.map((e, idx) => `${idx + 1}. ${e.name} (${[e.role, e.department].filter(Boolean).join(' • ') || 'Team Member'}) - Absent`).join('\n') + '\n';
      } else {
        textDetails += `(No employees absent today)\n`;
      }

      const textBody = `${subject}\n\nDate: ${todayStr}\nGenerated Period: ${period}\n\n📊 KPI SUMMARY:\n- Total Team Size: ${activeEmps.length}\n- Present Today: ${presentEmps.length}\n${isMorning ? `- ⚠️ Forgot Out Yesterday (${yesterdayStr}): ${yesterdayAutoClosedEmps.length}\n` : `- ⚠️ Auto-Closed Today (9:00 PM): ${autoClosedEmps.length}\n`}- Half Day Today: ${halfDayEmps.length}\n- Absent Today: ${missingEmps.length}\n${textDetails}\n\nLog in to DeviceDesk Admin Panel for full interactive dashboard and live records.`;

      // 8. HTML Body Formatting
      const headerColor = isEvening ? '#1e1b4b' : isMorning ? '#0369a1' : '#0284c7';
      const headerTitle = isEvening 
        ? `🌙 Evening Attendance & 9:00 PM Auto-Close Report` 
        : `📅 ${period} Attendance Summary & Operations Report`;

      const secondaryCardTitle = isMorning ? '⚠️ Forgot Out (Yesterday)' : '⚠️ Auto Closed (9 PM)';
      const secondaryCardCount = isMorning ? yesterdayAutoClosedEmps.length : autoClosedEmps.length;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: ${headerColor}; padding: 20px 24px; border-radius: 8px 8px 0 0; color: #ffffff; text-align: center;">
            <h2 style="margin: 0; font-size: 22px;">${headerTitle}</h2>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Date: ${todayStr} • ${period} Summary • Auto Punch-Out Sweep: 09:00 PM IST</p>
          </div>

          <div style="padding: 22px; color: #333333; line-height: 1.6;">
            <!-- KPI Summary Cards -->
            <table width="100%" style="margin-bottom: 24px; text-align: center; border-collapse: separate; border-spacing: 8px 0;">
              <tr>
                <td style="padding: 12px; width: 25%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                  <span style="font-size: 11px; color: #166534; font-weight: bold; text-transform: uppercase;">Present Today</span>
                  <h3 style="margin: 4px 0 0 0; color: #15803d; font-size: 22px;">${presentEmps.length}</h3>
                </td>
                <td style="padding: 12px; width: 25%; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
                  <span style="font-size: 11px; color: #c2410c; font-weight: bold; text-transform: uppercase;">${secondaryCardTitle}</span>
                  <h3 style="margin: 4px 0 0 0; color: #ea580c; font-size: 22px;">${secondaryCardCount}</h3>
                </td>
                <td style="padding: 12px; width: 25%; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
                  <span style="font-size: 11px; color: #92400e; font-weight: bold; text-transform: uppercase;">Half Day</span>
                  <h3 style="margin: 4px 0 0 0; color: #d97706; font-size: 22px;">${halfDayEmps.length}</h3>
                </td>
                <td style="padding: 12px; width: 25%; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
                  <span style="font-size: 11px; color: #991b1b; font-weight: bold; text-transform: uppercase;">Absent</span>
                  <h3 style="margin: 4px 0 0 0; color: #dc2626; font-size: 22px;">${missingEmps.length}</h3>
                </td>
              </tr>
            </table>

            ${isMorning ? `
              <!-- Morning Alert: Yesterday's Unpunched Employees -->
              <div style="margin-bottom: 24px;">
                <div style="border-left: 4px solid #ea580c; padding-left: 10px; margin-bottom: 12px;">
                  <h4 style="margin: 0; color: #c2410c; font-size: 16px;">
                    ⚠️ Yesterday's Auto-Closed Listing (Forgot Punch-Out on ${yesterdayStr})
                  </h4>
                  <p style="margin: 2px 0 0 0; font-size: 12px; color: #7c2d12;">
                    The following employees forgot to punch out yesterday evening. The system automatically closed their shifts at 09:00 PM IST. Please review for attendance regularization.
                  </p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #fed7aa; border-radius: 6px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #ffedd5; text-align: left; color: #7c2d12;">
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Employee</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Role</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Department</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Yesterday In</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Auto Punch-Out</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Net Work</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Status</th>
                    </tr>
                  </thead>
                  <tbody>${yesterdayAutoClosedHtml}</tbody>
                </table>
              </div>
            ` : `
              <!-- Evening Alert: Today's Auto Closed Employees -->
              <div style="margin-bottom: 24px;">
                <div style="border-left: 4px solid #ea580c; padding-left: 10px; margin-bottom: 12px;">
                  <h4 style="margin: 0; color: #c2410c; font-size: 16px;">
                    ⚠️ Auto Closed Listing (Forgot Punch-Out at 9:00 PM Today)
                  </h4>
                  <p style="margin: 2px 0 0 0; font-size: 12px; color: #7c2d12;">
                    Employees who punched in during morning/day but forgot to punch out before 9:00 PM. System automatically closed their shift at 09:00 PM IST.
                  </p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #fed7aa; border-radius: 6px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #ffedd5; text-align: left; color: #7c2d12;">
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Employee</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Role</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Department</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Morning In</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Auto Punch-Out</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Net Work</th>
                      <th style="padding: 10px; border-bottom: 1px solid #fed7aa;">Status</th>
                    </tr>
                  </thead>
                  <tbody>${autoClosedHtml}</tbody>
                </table>
              </div>
            `}

            <!-- Present Employees -->
            <div style="margin-bottom: 24px;">
              <h4 style="margin: 0 0 10px 0; color: #15803d; font-size: 15px; border-left: 4px solid #16a34a; padding-left: 10px;">
                ✅ Present Employees (${todayStr})
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Employee</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Role</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Department</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Morning In</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Punch-Out</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Net Work</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Status</th>
                  </tr>
                </thead>
                <tbody>${presentHtml}</tbody>
              </table>
            </div>

            <!-- Half Day Employees -->
            <div style="margin-bottom: 24px;">
              <h4 style="margin: 0 0 10px 0; color: #d97706; font-size: 15px; border-left: 4px solid #f59e0b; padding-left: 10px;">
                ⚠️ Half Day Employees (${todayStr})
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Employee</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Role</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Department</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Morning In</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Punch-Out</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Net Work</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Status</th>
                  </tr>
                </thead>
                <tbody>${halfDayHtml}</tbody>
              </table>
            </div>

            <!-- Absent Employees -->
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #dc2626; font-size: 15px; border-left: 4px solid #ef4444; padding-left: 10px;">
                ❌ Absent Employees (${todayStr})
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Employee</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Role</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Department</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Morning In</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Punch-Out</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Net Work</th>
                    <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Status</th>
                  </tr>
                </thead>
                <tbody>${absentHtml}</tbody>
              </table>
            </div>
          </div>

          <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; font-size: 12px; color: #888888;">
            DeviceDesk Operations & Attendance Monitor • Fly Media Technology • Automatic ${period} Report
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
        period,
        date: todayStr,
        yesterdayDate: yesterdayStr,
        presentCount: presentEmps.length,
        autoClosedCount: autoClosedEmps.length,
        yesterdayAutoClosedCount: yesterdayAutoClosedEmps.length,
        halfDayCount: halfDayEmps.length,
        absentCount: missingEmps.length,
        totalCount: activeEmps.length,
        recipientCount: recipientEmails.length,
        emailResult,
        message: `${period} Attendance summary email successfully sent to ${recipientEmails.length} recipients.`
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
