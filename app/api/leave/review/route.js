import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

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

    const reviewedAt = new Date().toISOString();

    await db.execute(
      `UPDATE leave_requests
         SET status = ?, reviewedBy = ?, reviewedAt = ?, rejectionReason = ?
       WHERE id = ?`,
      [action, reviewerName, reviewedAt, action === 'Rejected' ? rejectionReason.trim() : null, leaveId]
    );

    return NextResponse.json({
      success: true,
      message: `Leave request ${action.toLowerCase()} successfully.`
    });
  } catch (error) {
    console.error('Leave Review API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
