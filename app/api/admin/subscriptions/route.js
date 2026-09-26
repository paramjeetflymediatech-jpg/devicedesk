import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request) {
  try {
    const db = await getDbConnection();

    // Fetch all active subscriptions with client and package details
    const [rows] = await db.query(`
      SELECT 
        cpo.id as subscription_id, 
        cpo.custom_price as price, 
        cpo.status, 
        cpo.created_at, 
        cpo.updated_at,
        p.name as package_name, 
        p.billing_cycle,
        e.id as client_id,
        e.name as client_name,
        e.email as client_email
      FROM client_package_overrides cpo
      JOIN packages p ON cpo.package_id = p.id
      JOIN employees e ON cpo.client_id = e.id
      ORDER BY cpo.created_at DESC
    `);

    // Calculate Validity
    const subscriptions = rows.map(sub => {
      const startDate = new Date(sub.created_at || Date.now());
      let validUntil = new Date(startDate);
      
      const cycle = (sub.billing_cycle || 'Monthly').toLowerCase();
      
      if (cycle === 'yearly' || cycle === 'annually') {
        validUntil.setFullYear(validUntil.getFullYear() + 1);
      } else if (cycle === 'quarterly') {
        validUntil.setMonth(validUntil.getMonth() + 3);
      } else {
        validUntil.setMonth(validUntil.getMonth() + 1);
      }

      return {
        ...sub,
        start_date_formatted: startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        valid_until_formatted: validUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        is_expired: new Date() > validUntil
      };
    });

    return NextResponse.json({ success: true, data: subscriptions });
  } catch (err) {
    console.error('Fetch Admin Subscriptions Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
