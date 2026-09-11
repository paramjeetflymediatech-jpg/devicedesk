import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');
    const assignedTo = searchParams.get('assigned_to');

    let query = `SELECT l.*, c.name as campaign_name 
                 FROM leads l 
                 LEFT JOIN campaigns c ON l.campaign_id = c.id 
                 WHERE 1=1`;
    let params = [];

    if (campaignId) {
      query += ` AND l.campaign_id = ?`;
      params.push(campaignId);
    }
    if (assignedTo) {
      query += ` AND l.assigned_to = ?`;
      params.push(assignedTo);
    }

    query += ` ORDER BY l.created_at DESC`;

    const db = await getDbConnection();
    const [rows] = await db.query(query, params);

    return NextResponse.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Fetch Leads API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { client_id, campaign_id, assigned_to, name, phone, email, source, notes } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Lead name is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const leadId = 'lead_' + Date.now();
    const initialStatus = 'New';

    await db.execute(
      `INSERT INTO leads (id, client_id, campaign_id, assigned_to, name, phone, email, source, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leadId, 
        client_id || null, 
        campaign_id || null, 
        assigned_to || null, 
        name.trim(), 
        phone || null, 
        email || null, 
        source || null, 
        initialStatus, 
        notes || null
      ]
    );

    return NextResponse.json({
      success: true,
      lead: { id: leadId, name: name.trim(), status: initialStatus }
    });
  } catch (err) {
    console.error('Add Lead API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
