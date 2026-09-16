import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../api/db/db.js';

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, email, phone, address, experience_level, experience_details, resume_url, portfolio_url, education, skills, notice_period, position_applied } = data;

    if (!name || !email || !phone) {
      return NextResponse.json({ success: false, error: 'Name, email, and phone are required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // Check if email or phone already applied recently (optional basic validation)
    const [existing] = await db.execute(
      `SELECT id FROM candidate_registrations WHERE email = ? OR phone = ? LIMIT 1`,
      [email, phone]
    );

    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'An application with this email or phone already exists.' }, { status: 400 });
    }

    const id = `cand_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    await db.execute(
      `INSERT INTO candidate_registrations (id, name, email, phone, address, experience_level, experience_details, status, resume_url, portfolio_url, education, skills, notice_period, position_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, email, phone, address || '', experience_level || 'Fresher', experience_details || '', 'Pending',
        resume_url || null, portfolio_url || null, education || null, skills || null, notice_period || null, position_applied || null
      ]
    );

    return NextResponse.json({ success: true, message: 'Application submitted successfully', id });
  } catch (error) {
    console.error('Candidate Registration Error:', error);
    return NextResponse.json({ success: false, error: 'Server error processing application' }, { status: 500 });
  }
}
