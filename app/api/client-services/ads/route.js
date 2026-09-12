import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import crypto from 'crypto';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ success: false, error: 'clientId required' });

    const db = await getDbConnection();
    const [rows] = await db.execute('SELECT * FROM client_paid_ads WHERE client_id = ? ORDER BY created_at DESC', [clientId]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { clientId, platform, total_budget, spent_amount, pending_balance } = data;
    
    if (!clientId || !platform) {
      return NextResponse.json({ success: false, error: 'Missing required fields' });
    }

    const db = await getDbConnection();
    
    // Check if exists
    const [existing] = await db.execute(
      'SELECT id FROM client_paid_ads WHERE client_id = ? AND platform = ?', 
      [clientId, platform]
    );

    let id;
    if (existing.length > 0) {
      id = existing[0].id;
      await db.execute(
        'UPDATE client_paid_ads SET total_budget = ?, spent_amount = ?, pending_balance = ? WHERE id = ?',
        [total_budget || 0, spent_amount || 0, pending_balance || 0, id]
      );
    } else {
      id = 'ads_' + crypto.randomBytes(8).toString('hex');
      await db.execute(
        'INSERT INTO client_paid_ads (id, client_id, platform, total_budget, spent_amount, pending_balance) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, platform, total_budget || 0, spent_amount || 0, pending_balance || 0]
      );
    }

    return NextResponse.json({ success: true, data: { id, clientId, platform } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
