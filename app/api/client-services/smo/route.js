import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import crypto from 'crypto';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ success: false, error: 'clientId required' });

    const db = await getDbConnection();
    const [rows] = await db.execute('SELECT * FROM client_smo_requests WHERE client_id = ? ORDER BY created_at DESC', [clientId]);
    return NextResponse.json({ success: true, data: rows });
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
