import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function POST(request) {
  try {
    const { email, identifier, reason } = await request.json();

    const searchKey = (email || identifier || '').trim().toLowerCase();
    if (!searchKey) {
      return NextResponse.json(
        { success: false, message: 'Email or User Account Identifier is required.' },
        { status: 400 }
      );
    }

    const db = await getDbConnection();

    // Check if employee exists
    const [rows] = await db.execute(
      `SELECT id, name, email, role, status FROM employees WHERE LOWER(email) = ? OR LOWER(name) = ? OR LOWER(id) = ? LIMIT 1`,
      [searchKey, searchKey, searchKey]
    );

    if (rows.length === 0) {
      // For privacy compliance, return a clear successful request message
      return NextResponse.json({
        success: true,
        message: 'If an account matches the provided identifier, your deletion request has been logged and queued for complete data purging within 48 hours.'
      });
    }

    const emp = rows[0];

    // Mark account as Deletion Pending or remove profile
    await db.execute(
      `UPDATE employees SET status = 'Deletion Pending' WHERE id = ?`,
      [emp.id]
    );

    // Unassign systems
    await db.execute(
      `UPDATE systems SET assignedTo = '' WHERE assignedTo = ? OR assignedTo = ?`,
      [emp.id, emp.name]
    );

    return NextResponse.json({
      success: true,
      message: `Account deletion request accepted for ${emp.name} (${emp.email || emp.id}). Account profile and associated records have been queued for permanent deletion.`
    });
  } catch (err) {
    console.error('Account Deletion API Error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error processing account deletion request.' },
      { status: 500 }
    );
  }
}
