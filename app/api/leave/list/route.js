import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId'); // optional — admin fetches all
    const status = searchParams.get('status');         // optional filter

    const db = await getDbConnection();

    let query = `SELECT * FROM leave_requests WHERE 1=1`;
    const params = [];

    if (employeeId) {
      query += ` AND employeeId = ?`;
      params.push(employeeId);
    }

    query += ` ORDER BY appliedAt DESC`;

    const [allRows] = await db.execute(query, params);

    // Calculate summary stats globally based on all rows matching employeeId
    const total = allRows.length;
    const pending = allRows.filter(r => r.status === 'Pending').length;
    const approved = allRows.filter(r => r.status === 'Approved').length;
    const rejected = allRows.filter(r => r.status === 'Rejected').length;

    // Filter requests returned in response by status parameter in memory
    let filteredRows = allRows;
    if (status && status !== 'ALL') {
      filteredRows = allRows.filter(r => String(r.status).toUpperCase() === status.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      requests: filteredRows,
      summary: { total, pending, approved, rejected }
    });
  } catch (error) {
    console.error('Leave List API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
