import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ success: false, error: 'clientId required' }, { status: 400 });

    const db = await getDbConnection();
    const [rows] = await db.query(
      `SELECT * FROM service_requests WHERE clientId = ? ORDER BY created_at DESC`,
      [clientId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch Service Requests Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { clientId, service_type, requirements } = await request.json();
    if (!clientId || !service_type || !requirements) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const db = await getDbConnection();
    const id = 'req_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO service_requests (id, clientId, service_type, requirements, status, created_at)
       VALUES (?, ?, ?, ?, 'Pending', ?)`,
      [id, clientId, service_type, requirements, now]
    );

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Add Service Request Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
