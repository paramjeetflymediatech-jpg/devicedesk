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
    
    try {
      await db.execute(`ALTER TABLE candidate_tests ADD COLUMN candidate_name VARCHAR(150) DEFAULT NULL`);
    } catch (e) {}
    try {
      await db.execute(`ALTER TABLE candidate_tests ADD COLUMN candidate_email VARCHAR(150) DEFAULT NULL`);
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

    // Fetch tests assigned to candidates with joins
    let tests = [];
    try {
      const [testRows] = await db.query(
        `SELECT t.*, 
          COALESCE(t.candidate_name, e.name, cr.name) as candidate_name, 
          COALESCE(t.candidate_email, e.email, cr.email) as candidate_email,
          cr.phone as candidate_phone,
          cr.position_applied as candidate_position
         FROM candidate_tests t 
         LEFT JOIN employees e ON (t.candidate_employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
         LEFT JOIN candidate_registrations cr ON (t.candidate_employee_id COLLATE utf8mb4_unicode_ci = cr.id COLLATE utf8mb4_unicode_ci)
         ORDER BY t.created_at DESC`
      );
      tests = testRows;
    } catch (err) {
      try {
        const [testRows] = await db.query(
          `SELECT t.*, e.name as candidate_name, e.email as candidate_email 
           FROM candidate_tests t 
           LEFT JOIN employees e ON (t.candidate_employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)`
        );
        tests = testRows;
      } catch (e2) {
        const [testRows] = await db.query(`SELECT * FROM candidate_tests`);
        tests = testRows;
      }
    }

    // Fallback resolution for any remaining tests where candidate_name is null or empty
    tests = tests.map(t => {
      let resolvedName = t.candidate_name;
      let resolvedEmail = t.candidate_email;
      let resolvedPhone = t.candidate_phone;
      let resolvedPosition = t.candidate_position;

      if (!resolvedName || resolvedName === 'Candidate' || resolvedName.trim() === '') {
        const match = registrations.find(r => 
          r.id === t.candidate_employee_id || 
          (r.email && resolvedEmail && r.email.toLowerCase() === resolvedEmail.toLowerCase())
        ) || registrations.find(r => {
          const regTs = parseInt(r.id.replace('cand_', ''));
          const testEmpTs = parseInt((t.candidate_employee_id || '').replace('cand_', ''));
          return !isNaN(regTs) && !isNaN(testEmpTs) && Math.abs(testEmpTs - regTs) < 300000;
        });

        if (match) {
          resolvedName = match.name;
          resolvedEmail = resolvedEmail || match.email;
          resolvedPhone = resolvedPhone || match.phone;
          resolvedPosition = resolvedPosition || match.position_applied;
        }
      }

      return {
        ...t,
        candidate_name: resolvedName || 'Candidate',
        candidate_email: resolvedEmail || '',
        candidate_phone: resolvedPhone || '',
        candidate_position: resolvedPosition || ''
      };
    });

    return NextResponse.json({ success: true, registrations, tests });
  } catch (error) {
    console.error('Candidate List API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error fetching candidates' }, { status: 500 });
  }
}
