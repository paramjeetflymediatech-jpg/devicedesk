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

    if (status && status !== 'ALL') {
      query += ` AND LOWER(status) = LOWER(?)`;
      params.push(status);
    }

    if (search) {
      query += ` AND (LOWER(employeeName) LIKE ? OR LOWER(employeeId) LIKE ? OR LOWER(remarks) LIKE ?)`;
      const term = `%${search.toLowerCase().trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY date DESC, punchInTime DESC`;

    const [records] = await pool.query(query, params);

    // Summary calculation
    const totalRecords = records.length;
    let totalNetMinutes = 0;
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;

    records.forEach(r => {
      totalNetMinutes += (r.netWorkMinutes || 0);
      if (r.status === 'Present' || r.status === 'Completed' || r.status === 'Overtime') presentCount++;
      if (r.status === 'Late') {
        presentCount++;
        lateCount++;
      }
      if (r.status === 'Half Day') halfDayCount++;
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
