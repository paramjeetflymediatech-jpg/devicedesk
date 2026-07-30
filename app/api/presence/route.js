import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

/**
 * POST /api/presence
 * Called internally by socket-server.js when a user goes offline.
 * Body: { userId: string, lastSeen: ISO string, secret: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, lastSeen, secret } = body;

    // Verify the internal shared secret to prevent unauthorized calls
    const expectedSecret = process.env.SOCKET_INTERNAL_SECRET || 'devicedesk_socket_secret_2026';
    if (secret !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!userId || !lastSeen) {
      return NextResponse.json({ success: false, error: 'userId and lastSeen are required' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.execute(
      'UPDATE employees SET lastSeen = ? WHERE LOWER(id) = LOWER(?)',
      [new Date(lastSeen), userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Presence update error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/presence
 * Returns lastSeen timestamps for all employees (used to seed client-side state).
 */
export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.execute('SELECT id, lastSeen FROM employees WHERE lastSeen IS NOT NULL');
    const map = {};
    rows.forEach(r => {
      if (r.lastSeen) {
        map[String(r.id).toLowerCase()] = new Date(r.lastSeen).toISOString();
      }
    });
    return NextResponse.json({ success: true, lastSeen: map });
  } catch (err) {
    console.error('Presence fetch error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
