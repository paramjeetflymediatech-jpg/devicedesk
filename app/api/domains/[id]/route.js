import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const db = await getDbConnection();

    const [rows] = await db.query(
      'SELECT * FROM domains WHERE id = ? OR domain_name = ? OR REPLACE(REPLACE(domain_name, ".", "-"), "/", "") = ?',
      [id, id, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const d = rows[0];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let daysLeft = null;
    let computedStatus = d.status || 'Active';

    if (d.expiry_date) {
      const exp = new Date(d.expiry_date);
      exp.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) computedStatus = 'Expired';
      else if (daysLeft <= 30) computedStatus = 'Expiring Soon';
      else computedStatus = 'Active';
    }

    return NextResponse.json({
      success: true,
      data: { ...d, days_left: daysLeft, status: computedStatus }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      domain_name,
      client_name,
      client_email,
      registrar,
      registration_date,
      expiry_date,
      auto_renew,
      renewal_cost,
      status,
      notes
    } = body;

    const db = await getDbConnection();

    const [existing] = await db.query('SELECT id FROM domains WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    await db.execute(
      `UPDATE domains SET 
        domain_name = COALESCE(?, domain_name),
        client_name = COALESCE(?, client_name),
        client_email = COALESCE(?, client_email),
        registrar = COALESCE(?, registrar),
        registration_date = COALESCE(?, registration_date),
        expiry_date = COALESCE(?, expiry_date),
        auto_renew = COALESCE(?, auto_renew),
        renewal_cost = COALESCE(?, renewal_cost),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        domain_name ? domain_name.toLowerCase().trim() : null,
        client_name,
        client_email,
        registrar,
        registration_date,
        expiry_date,
        auto_renew !== undefined ? (auto_renew ? 1 : 0) : null,
        renewal_cost,
        status,
        notes,
        id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Domain updated successfully.'
    });
  } catch (err) {
    console.error('Domain PUT Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const db = await getDbConnection();

    await db.execute('DELETE FROM domains WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Domain removed from registry.'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
