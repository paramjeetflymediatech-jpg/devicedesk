import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../api/db/db.js';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const candidateId = url.searchParams.get('candidateId');
    
    if (!candidateId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbConnection();
    const [tests] = await db.query(
      `SELECT * FROM candidate_tests WHERE candidate_employee_id = ? ORDER BY created_at DESC LIMIT 1`,
      [candidateId]
    );

    if (tests.length === 0) {
      return NextResponse.json({ success: true, test: null });
    }

    return NextResponse.json({ success: true, test: tests[0] });
  } catch (error) {
    console.error('Candidate Me API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
