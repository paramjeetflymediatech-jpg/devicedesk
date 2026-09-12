import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
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
    const { id } = await params;
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
      card_details,
      status,
      notes
    } = body;

    const db = await getDbConnection();

    const [existing] = await db.query('SELECT * FROM domains WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    let updates = [];
    let values = [];

    if (domain_name !== undefined) {
      updates.push('domain_name = ?');
      values.push(domain_name ? domain_name.toLowerCase().trim() : null);
    }
    if (client_name !== undefined) {
      updates.push('client_name = ?');
      values.push(client_name ?? null);
    }
    if (client_email !== undefined) {
      updates.push('client_email = ?');
      values.push(client_email ?? null);
    }
    if (registrar !== undefined) {
      updates.push('registrar = ?');
      values.push(registrar ?? null);
    }
    if (registration_date !== undefined) {
      updates.push('registration_date = ?');
      values.push(registration_date ? new Date(registration_date).toISOString().split('T')[0] : null);
    }
    if (expiry_date !== undefined) {
      updates.push('expiry_date = ?');
      values.push(expiry_date ? new Date(expiry_date).toISOString().split('T')[0] : null);
    }
    if (auto_renew !== undefined) {
      updates.push('auto_renew = ?');
      values.push(auto_renew ? 1 : 0);
    }
    if (renewal_cost !== undefined) {
      updates.push('renewal_cost = ?');
      values.push(renewal_cost ?? null);
    }
    if (card_details !== undefined) {
      updates.push('card_details = ?');
      values.push(card_details ?? null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status ?? 'Active');
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes ?? null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields provided for update.' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.execute(
      `UPDATE domains SET ${updates.join(', ')} WHERE id = ?`,
      values
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
    const { id } = await params;
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
