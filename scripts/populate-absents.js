const mysql = require('mysql2/promise');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function populateAbsents() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'system_tracking',
  });

  try {
    const [minRes] = await conn.query('SELECT MIN(date) as minDate FROM attendance_records');
    let minDateStr = minRes[0].minDate;
    if (!minDateStr) {
      console.log('No attendance records found. Exiting.');
      return;
    }

    const startDate = new Date(minDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active employees (exclude admins to avoid polluting their logs)
    const [employees] = await conn.query(
      `SELECT id, name FROM employees WHERE (status IS NULL OR status != 'Paused') AND LOWER(role) NOT IN ('admin', 'superadmin', 'management')`
    );

    let insertedCount = 0;

    for (let d = new Date(startDate); d < today; d.setDate(d.getDate() + 1)) {
      // Skip Sundays (0)
      if (d.getDay() === 0) continue;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const [records] = await conn.query(
        `SELECT employeeId FROM attendance_records WHERE date = ?`,
        [dateStr]
      );
      
      const presentEmpIds = new Set(records.map(r => r.employeeId));

      for (const emp of employees) {
        if (!presentEmpIds.has(emp.id)) {
          const recordId = `absent_${emp.id}_${dateStr}`;
          
          await conn.execute(
            `INSERT IGNORE INTO attendance_records 
             (id, employeeId, employeeName, date, punchInTime, punchOutTime, status, totalWorkMinutes, totalBreakMinutes, netWorkMinutes, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              recordId,
              emp.id,
              emp.name,
              dateStr,
              '', // Empty string to match existing schema type for punchInTime if it's VARCHAR NOT NULL, wait, schema says 'VARCHAR(50) NOT NULL'
              null,
              'Absent',
              0,
              0,
              0,
              'Auto-generated Absent (Past)'
            ]
          );
          insertedCount++;
        }
      }
    }

    console.log(`Successfully inserted ${insertedCount} past Absent records.`);

  } catch (err) {
    console.error('Error populating absent records:', err);
  } finally {
    await conn.end();
  }
}

populateAbsents();
