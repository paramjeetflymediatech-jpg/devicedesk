import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query(`SELECT * FROM campaigns ORDER BY created_at DESC`);
    return NextResponse.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Fetch Campaigns API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, description, start_date, end_date, budget } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const campaignId = 'camp_' + Date.now();
    const campStatus = 'Active';

    await db.execute(
      `INSERT INTO campaigns (id, name, description, start_date, end_date, budget, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [campaignId, name.trim(), description || null, start_date || null, end_date || null, budget || 0, campStatus]
    );

    return NextResponse.json({
      success: true,
      campaign: { id: campaignId, name: name.trim(), status: campStatus }
    });
  } catch (err) {
    console.error('Add Campaign API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
