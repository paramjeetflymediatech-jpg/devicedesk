import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

function formatLocalDate(d) {
  const istDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const { apiKey, logs, log } = body;
  const secretKey = process.env.BIOMETRIC_SECRET_KEY || 'devicedesk_biometric_secret_2026';

  // Verify secret key
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (apiKey !== secretKey && token !== secretKey) {
    return NextResponse.json({ success: false, message: 'Unauthorized: Invalid API Key' }, { status: 401 });
  }

  // Normalize logs array
  const rawLogs = Array.isArray(logs) ? logs : (log ? [log] : []);
  if (rawLogs.length === 0) {
    return NextResponse.json({ success: false, message: 'No attendance logs provided in payload' }, { status: 400 });
  }

  const pool = getPool();
  let connection;
  let processedCount = 0;
  let skippedCount = 0;

  try {
    connection = await pool.getConnection();

    for (const item of rawLogs) {
      // Support various field names from different machine SDKs
      const bioId = String(item.biometricId || item.deviceUserId || item.userId || item.id || '').trim();
      const rawTime = item.timestamp || item.recordTime || item.time || new Date().toISOString();
      const punchDateObj = new Date(rawTime);

      if (!bioId || isNaN(punchDateObj.getTime())) {
        skippedCount++;
        continue;
      }

      const punchIso = punchDateObj.toISOString();
      const todayStr = formatLocalDate(punchDateObj);

      // 1. Find employee by biometric_id OR id
      const [empRows] = await connection.execute(
        `SELECT id, name, department FROM employees WHERE biometric_id = ? OR id = ? LIMIT 1`,
        [bioId, bioId]
      );

      if (empRows.length === 0) {
        skippedCount++;
        continue;
      }

      const employee = empRows[0];

      await connection.beginTransaction();

      // 2. Check existing record for that date
      const [existingRows] = await connection.execute(
        `SELECT * FROM attendance_records WHERE employeeId = ? AND date = ? ORDER BY punchInTime DESC LIMIT 1 FOR UPDATE`,
        [employee.id, todayStr]
      );

      if (existingRows.length === 0) {
        // First punch of day -> PUNCH IN
        const shiftCutoff = new Date(punchDateObj);
        shiftCutoff.setHours(9, 40, 0, 0);
        const isLate = punchDateObj > shiftCutoff;
        const status = isLate ? 'Late' : 'Present';

        const recordId = `att_bio_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        await connection.execute(
          `INSERT INTO attendance_records 
           (id, employeeId, employeeName, date, punchInTime, status, punchSource, deviceInfo)
           VALUES (?, ?, ?, ?, ?, ?, 'BIOMETRIC', 'Physical Biometric Machine')`,
          [recordId, employee.id, employee.name, todayStr, punchIso, status]
        );
      } else {
        // Subsequent punch -> Update PUNCH OUT
        const record = existingRows[0];
        const punchInMs = new Date(record.punchInTime).getTime();
        const punchOutMs = punchDateObj.getTime();

        if (punchOutMs > punchInMs) {
          const totalWorkMins = Math.max(0, Math.round((punchOutMs - punchInMs) / 60000));
          const netWorkMins = Math.max(0, totalWorkMins - (record.totalBreakMinutes || 0));

          let finalStatus = record.status;
          if (netWorkMins < 240) {
            finalStatus = 'Half Day';
          } else if (netWorkMins >= 540) {
            finalStatus = 'Overtime';
          } else {
            finalStatus = 'Completed';
          }

          await connection.execute(
            `UPDATE attendance_records SET 
              punchOutTime = ?, 
              totalWorkMinutes = ?, 
              netWorkMinutes = ?, 
              status = ? 
             WHERE id = ?`,
            [punchIso, totalWorkMins, netWorkMins, finalStatus, record.id]
          );
        }
      }

      await connection.commit();
      processedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} logs successfully (${skippedCount} skipped)`,
      processedCount,
      skippedCount
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Biometric Sync Ingestion API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

