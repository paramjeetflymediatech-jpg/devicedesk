import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import crypto from 'crypto';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    const db = await getDbConnection();
    if (clientId) {
      const [rows] = await db.execute('SELECT * FROM client_smo_requests WHERE client_id = ? ORDER BY created_at DESC', [clientId]);
      return NextResponse.json({ success: true, data: rows });
    } else {
      const [rows] = await db.execute(`
        SELECT r.*, c.name as client_name 
        FROM client_smo_requests r 
        LEFT JOIN employees c ON r.client_id = c.id 
        ORDER BY r.created_at DESC
      `);
      return NextResponse.json({ success: true, data: rows });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, assigned_tl_id } = data;
    if (!id) return NextResponse.json({ success: false, error: 'Request ID required' });

    const db = await getDbConnection();
    await db.execute('UPDATE client_smo_requests SET assigned_tl_id = ? WHERE id = ?', [assigned_tl_id || null, id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { clientId, requirements } = data;
    
    if (!clientId || !requirements) {
      return NextResponse.json({ success: false, error: 'Missing required fields' });
    }

    const id = 'smo_' + crypto.randomBytes(8).toString('hex');
    const db = await getDbConnection();
    await db.execute(
      'INSERT INTO client_smo_requests (id, client_id, requirements) VALUES (?, ?, ?)',
      [id, clientId, requirements]
    );

    return NextResponse.json({ success: true, data: { id, clientId, requirements, status: 'Pending' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
