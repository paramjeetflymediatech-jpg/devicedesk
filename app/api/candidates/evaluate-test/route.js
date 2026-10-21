import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { test_id, status, feedback } = body;

    if (!test_id) {
      return NextResponse.json({ success: false, error: 'Test ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    try { await db.execute(`ALTER TABLE candidate_tests ADD COLUMN feedback TEXT DEFAULT NULL`); } catch (e) {}
    try { await db.execute(`ALTER TABLE candidate_tests ADD COLUMN evaluated_at TIMESTAMP NULL DEFAULT NULL`); } catch (e) {}

    await db.execute(
      'UPDATE candidate_tests SET status = ?, feedback = ?, evaluated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status || 'Evaluated', feedback || null, test_id]
    );

    return NextResponse.json({ success: true, message: 'Test status updated' });
  } catch (error) {
    console.error('Error updating test status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update test status' }, { status: 500 });
  }
}
