import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

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

    return NextResponse.json({ success: true, message: 'Leave request submitted successfully.', id });
  } catch (error) {
    console.error('Leave Apply API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
