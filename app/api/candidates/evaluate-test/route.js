import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { test_id, status } = body;

    if (!test_id) {
      return NextResponse.json({ success: false, error: 'Test ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.execute(
      'UPDATE candidate_tests SET status = ? WHERE id = ?',
      [status || 'Evaluated', test_id]
    );

    return NextResponse.json({ success: true, message: 'Test status updated' });
  } catch (error) {
    console.error('Error updating test status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update test status' }, { status: 500 });
  }
}
