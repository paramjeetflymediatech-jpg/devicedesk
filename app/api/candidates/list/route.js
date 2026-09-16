import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../api/db/db.js';

export async function GET(request) {
  try {
    const db = await getDbConnection();
    
    // Fetch all registrations
    const [registrations] = await db.query(
      `SELECT * FROM candidate_registrations ORDER BY created_at DESC`
    );

    // Fetch tests assigned to candidates
    const [tests] = await db.query(
      `SELECT t.*, e.name as candidate_name, e.email as candidate_email 
       FROM candidate_tests t 
       LEFT JOIN employees e ON (t.candidate_employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
       ORDER BY t.created_at DESC`
    );

    return NextResponse.json({ success: true, registrations, tests });
  } catch (error) {
    console.error('Candidate List API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error fetching candidates' }, { status: 500 });
  }
}
