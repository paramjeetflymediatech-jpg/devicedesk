import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { client_id, package_id, custom_price, custom_name, custom_description, custom_billing_cycle, custom_features } = body;

    if (!client_id || !package_id || custom_price === undefined) {
      return NextResponse.json({ success: false, error: 'client_id, package_id, and custom_price are required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if an override already exists
    const [existing] = await db.query(
      'SELECT id FROM client_package_overrides WHERE client_id = ? AND package_id = ? LIMIT 1',
      [client_id, package_id]
    );

    const fStr = custom_features ? String(custom_features) : null;

    if (existing.length > 0) {
      // Update
      await db.execute(
        'UPDATE client_package_overrides SET custom_price = ?, custom_name = ?, custom_description = ?, custom_billing_cycle = ?, custom_features = ?, status = "Active" WHERE id = ?',
        [custom_price, custom_name || null, custom_description || null, custom_billing_cycle || null, fStr, existing[0].id]
      );
    } else {
      // Insert
      const id = 'override_' + Date.now();
      await db.execute(
        'INSERT INTO client_package_overrides (id, client_id, package_id, custom_price, custom_name, custom_description, custom_billing_cycle, custom_features, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "Active")',
        [id, client_id, package_id, custom_price, custom_name || null, custom_description || null, custom_billing_cycle || null, fStr]
      );
    }

    return NextResponse.json({ success: true, message: 'Custom price saved successfully' });
  } catch (error) {
    console.error('Error saving custom price:', error);
    return NextResponse.json({ success: false, error: 'Failed to save custom price' }, { status: 500 });
  }
}
