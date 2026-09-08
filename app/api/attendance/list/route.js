import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const date = searchParams.get('date');
  const month = searchParams.get('month'); // YYYY-MM
  const year = searchParams.get('year');   // YYYY
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const status = searchParams.get('status');

  const pool = getPool();

  try {
    let query = `SELECT * FROM attendance_records WHERE 1=1`;
    const params = [];

    const search = searchParams.get('search');

    if (employeeId) {
      query += ` AND employeeId = ?`;
      params.push(employeeId);
    }

    if (date) {
      query += ` AND date = ?`;
      params.push(date);
    } else if (month && month !== 'all') {
      query += ` AND date LIKE ?`;
      params.push(`${month}%`);
    } else if (year && year !== 'all') {
      query += ` AND date LIKE ?`;
      params.push(`${year}%`);
    } else if (startDate && endDate) {
      query += ` AND date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }



    if (search) {
      query += ` AND (LOWER(employeeName) LIKE ? OR LOWER(employeeId) LIKE ? OR LOWER(remarks) LIKE ?)`;
      const term = `%${search.toLowerCase().trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY date DESC, punchInTime DESC`;

    const [records] = await pool.query(query, params);

    // If querying by specific date, dynamically synthesize absent records for active employees who haven't punched in
    if (date) {
      if (employeeId) {
        if (records.length === 0) {
          const [empRows] = await pool.query(
            `SELECT id, name FROM employees WHERE id = ? AND (status IS NULL OR status != 'Paused')`,
            [employeeId]
          );
          if (empRows.length > 0) {
            records.push({
              id: `virtual_absent_${empRows[0].id}_${date}`,
              employeeId: empRows[0].id,
              employeeName: empRows[0].name,
              date: date,
              punchInTime: null,
              punchOutTime: null,
              status: 'Absent',
              totalWorkMinutes: 0,
              totalBreakMinutes: 0,
              netWorkMinutes: 0,
              ipAddress: null,
              deviceInfo: null,
              remarks: 'Not Punched In / Absent',
              breakStatus: 'None',
              isVirtual: true
            });
          }
        }
      } else {
        const [empRows] = await pool.query(
          `SELECT id, name FROM employees WHERE (status IS NULL OR status != 'Paused') AND LOWER(role) NOT IN ('admin', 'superadmin', 'management')`
        );
        const existingEmpIds = new Set(records.map(r => r.employeeId));

        empRows.forEach(emp => {
          if (!existingEmpIds.has(emp.id)) {
            if (search) {
              const s = search.toLowerCase().trim();
              const nameMatch = (emp.name || '').toLowerCase().includes(s);
              const idMatch = (emp.id || '').toLowerCase().includes(s);
              if (!nameMatch && !idMatch) return;
            }

            records.push({
              id: `virtual_absent_${emp.id}_${date}`,
              employeeId: emp.id,
              employeeName: emp.name,
              date: date,
              punchInTime: null,
              punchOutTime: null,
              status: 'Absent',
              totalWorkMinutes: 0,
              totalBreakMinutes: 0,
              netWorkMinutes: 0,
              ipAddress: null,
              deviceInfo: null,
              remarks: 'Not Punched In / Absent',
              breakStatus: 'None',
              isVirtual: true
            });
          }
        });
      }
    }

    // Summary calculation
    const totalRecords = records.length;
    let totalNetMinutes = 0;
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;

    records.forEach(r => {
      totalNetMinutes += (r.netWorkMinutes || 0);
      const st = (r.status || '').toLowerCase().trim();
      const rem = (r.remarks || '').toLowerCase();

      let isLate = st.includes('late') || rem.includes('late');

      if (!isLate && r.punchInTime) {
        try {
          const pDate = new Date(r.punchInTime);
          const hrs = pDate.getHours();
          const mins = pDate.getMinutes();
          if (hrs * 60 + mins > 580) { // Punched in after 09:40 AM
            isLate = true;
          }
        } catch (e) {}
      }

      if (isLate) {
        lateCount++;
        presentCount++;
      } else if (st === 'present' || st === 'completed' || st === 'overtime' || st === 'active' || st === 'auto closed') {
        presentCount++;
      } else if (st.includes('half')) {
        halfDayCount++;
      } else if (st === 'absent') {
        absentCount++;
      }
    });

    const totalWorkHours = (totalNetMinutes / 60).toFixed(1);
    const avgWorkHours = totalRecords > 0 ? (totalNetMinutes / 60 / totalRecords).toFixed(1) : '0.0';

    return NextResponse.json({
      success: true,
      records,
      summary: {
        totalRecords,
        presentCount,
        lateCount,
        halfDayCount,
        absentCount,
        totalWorkHours,
        totalNetMinutes,
        avgWorkHours
      }
    });

  } catch (error) {
    console.error('Attendance List API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
