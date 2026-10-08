import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../api/db/db.js';

export async function GET(request) {
  try {
    const db = await getDbConnection();

    // Ensure created_at and other columns exist on both candidate tables
    try {
      await db.execute(`ALTER TABLE candidate_registrations ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    } catch (e) {}
    try {
      await db.execute(`ALTER TABLE candidate_registrations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    } catch (e) {}
    try {
      await db.execute(`ALTER TABLE candidate_tests ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    } catch (e) {}
    try {
      await db.execute(`ALTER TABLE candidate_tests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    } catch (e) {}
    
    // Fetch all registrations
    let registrations = [];
    try {
      const [rows] = await db.query(
        `SELECT * FROM candidate_registrations ORDER BY created_at DESC`
      );
      registrations = rows;
    } catch (err) {
      const [rows] = await db.query(`SELECT * FROM candidate_registrations`);
      registrations = rows;
    }

    // Fetch tests assigned to candidates
    let tests = [];
    try {
      const [testRows] = await db.query(
        `SELECT t.*, e.name as candidate_name, e.email as candidate_email 
         FROM candidate_tests t 
         LEFT JOIN employees e ON (t.candidate_employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
         ORDER BY t.created_at DESC`
      );
      tests = testRows;
    } catch (err) {
      const [testRows] = await db.query(
        `SELECT t.*, e.name as candidate_name, e.email as candidate_email 
         FROM candidate_tests t 
         LEFT JOIN employees e ON (t.candidate_employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)`
      );
      tests = testRows;
    }

    return NextResponse.json({ success: true, registrations, tests });
  } catch (error) {
    console.error('Candidate List API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error fetching candidates' }, { status: 500 });
  }
}
