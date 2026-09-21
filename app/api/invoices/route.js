import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'client_id is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [rows] = await db.query(`
      SELECT i.*, p.name as package_name 
      FROM invoices i 
      LEFT JOIN packages p ON i.package_id = p.id 
      WHERE i.client_id = ? 
      ORDER BY i.created_at DESC
    `, [clientId]);

    return NextResponse.json({ success: true, invoices: rows });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { client_id, package_id, amount } = body;

    if (!client_id || !package_id || amount === undefined) {
      return NextResponse.json({ success: false, error: 'client_id, package_id, and amount are required' }, { status: 400 });
    }

    const id = 'inv_' + Date.now();
    const db = await getDbConnection();

    await db.execute(
      `INSERT INTO invoices (id, client_id, package_id, amount, status) VALUES (?, ?, ?, ?, 'Pending')`,
      [id, client_id, package_id, amount]
    );

    return NextResponse.json({ success: true, message: 'Invoice created successfully', invoiceId: id });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}
