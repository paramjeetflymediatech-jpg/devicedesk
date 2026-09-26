import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { client_id, package_id } = body;

    if (!client_id || !package_id) {
      return NextResponse.json({ success: false, error: 'client_id and package_id are required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Fetch package details
    const [pkgRows] = await db.query('SELECT * FROM packages WHERE id = ?', [package_id]);
    if (pkgRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }
    const pkg = pkgRows[0];

    // Check if an override already exists
    const [existing] = await db.query(
      'SELECT id FROM client_package_overrides WHERE client_id = ? AND package_id = ? LIMIT 1',
      [client_id, package_id]
    );

    if (existing.length > 0) {
      // Update
      await db.execute(
        'UPDATE client_package_overrides SET custom_price = ?, status = "Active" WHERE id = ?',
        [pkg.price, existing[0].id]
      );
    } else {
      // Insert
      const id = 'override_' + Date.now();
      await db.execute(
        'INSERT INTO client_package_overrides (id, client_id, package_id, custom_price, status) VALUES (?, ?, ?, ?, "Active")',
        [id, client_id, package_id, pkg.price]
      );
    }

    // Generate an invoice for this purchase
    const invoiceId = 'inv_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    await db.execute(
      `INSERT INTO invoices (id, client_id, package_id, amount, status) VALUES (?, ?, ?, ?, 'Pending')`,
      [invoiceId, client_id, package_id, pkg.price]
    );

    return NextResponse.json({ success: true, message: 'Package started successfully. Invoice generated for cash payment.' });
  } catch (error) {
    console.error('Error purchasing package:', error);
    return NextResponse.json({ success: false, error: 'Failed to process package purchase' }, { status: 500 });
  }
}
