import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // Fetch from client_details
    const [rows] = await db.execute(`
      SELECT cd.*, e.name, e.email 
      FROM employees e
      LEFT JOIN client_details cd ON e.id = cd.client_id
      WHERE e.id = ?
    `, [clientId]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching client details:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      client_id, 
      company_name, 
      phone, 
      whatsapp, 
      address, 
      gst_number, 
      website_url, 
      primary_service, 
      notes 
    } = body;

    if (!client_id) {
      return NextResponse.json({ success: false, error: 'client_id is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both create and update
    await db.execute(`
      INSERT INTO client_details (
        client_id, company_name, phone, whatsapp, address, gst_number, website_url, primary_service, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        company_name = VALUES(company_name),
        phone = VALUES(phone),
        whatsapp = VALUES(whatsapp),
        address = VALUES(address),
        gst_number = VALUES(gst_number),
        website_url = VALUES(website_url),
        primary_service = VALUES(primary_service),
        notes = VALUES(notes)
    `, [
      client_id, 
      company_name || null, 
      phone || null, 
      whatsapp || null, 
      address || null, 
      gst_number || null, 
      website_url || null, 
      primary_service || null, 
      notes || null
    ]);

    // Optional: Update name/email in employees table if they are passed
    if (body.name || body.email) {
      const updates = [];
      const params = [];
      if (body.name) { updates.push("name = ?"); params.push(body.name); }
      if (body.email) { updates.push("email = ?"); params.push(body.email); }
      
      params.push(client_id);
      await db.execute(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return NextResponse.json({ success: true, message: 'Client details updated successfully' });
  } catch (error) {
    console.error('Error updating client details:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
