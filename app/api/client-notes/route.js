import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    
    

    const db = await getDbConnection();
    let rows;
    if (client_id) {
      [rows] = await db.query('SELECT * FROM client_notes WHERE client_id = ? ORDER BY created_at DESC', [client_id]);
    } else {
      [rows] = await db.query('SELECT * FROM client_notes ORDER BY created_at DESC');
    }
    
    return NextResponse.json({ success: true, notes: rows });
  } catch (err) {
    console.error('Error fetching client notes:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { client_id, note } = body;

    if (!client_id || !note) {
      return NextResponse.json({ success: false, error: 'client_id and note are required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const id = 'note_' + Date.now();
    await db.execute(
      'INSERT INTO client_notes (id, client_id, note, status) VALUES (?, ?, ?, ?)',
      [id, client_id, note, 'Unread']
    );

    return NextResponse.json({ success: true, message: 'Note added successfully', id });
  } catch (err) {
    console.error('Error adding client note:', err);
    return NextResponse.json({ success: false, error: 'Failed to add note' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, tl_reply } = await request.json();
    if (!id || !tl_reply) {
      return NextResponse.json({ success: false, error: 'id and tl_reply are required' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.execute('UPDATE client_notes SET tl_reply = ?, status = ? WHERE id = ?', [tl_reply, 'Replied', id]);

    return NextResponse.json({ success: true, message: 'Reply sent' });
  } catch (err) {
    console.error('Error replying to client note:', err);
    return NextResponse.json({ success: false, error: 'Failed to reply' }, { status: 500 });
  }
}
