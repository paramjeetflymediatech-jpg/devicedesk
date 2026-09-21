import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query('SELECT * FROM candidates_pool ORDER BY created_at DESC');
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching candidates pool:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, role_applied, resume_url } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const id = 'cand_' + Date.now() + Math.floor(Math.random() * 1000);

    await db.execute(
      'INSERT INTO candidates_pool (id, name, email, phone, role_applied, resume_url, status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
      [id, name, email || '', phone || '', role_applied || '', resume_url || '']
    );

    return NextResponse.json({ success: true, message: 'Candidate added successfully', data: { id } });
  } catch (error) {
    console.error('Error adding candidate:', error);
    return NextResponse.json({ success: false, error: 'Failed to add candidate' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status, feedback } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Candidate ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.execute(
      'UPDATE candidates_pool SET status = ?, feedback = ? WHERE id = ?',
      [status || 'Pending', feedback || '', id]
    );

    return NextResponse.json({ success: true, message: 'Candidate updated successfully' });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json({ success: false, error: 'Failed to update candidate' }, { status: 500 });
  }
}
