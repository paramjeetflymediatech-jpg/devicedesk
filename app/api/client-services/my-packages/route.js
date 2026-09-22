import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Fetch active packages for the client
    const [rows] = await db.query(`
      SELECT 
        cpo.id as override_id, 
        cpo.custom_price as price, 
        cpo.status, 
        cpo.created_at, 
        cpo.updated_at,
        p.id as package_id, 
        p.name, 
        p.description, 
        p.billing_cycle, 
        p.features
      FROM client_package_overrides cpo
      JOIN packages p ON cpo.package_id = p.id
      WHERE cpo.client_id = ? AND cpo.status = 'Active'
      ORDER BY cpo.created_at DESC
    `, [clientId]);

    // Calculate Validity
    const activePackages = rows.map(pkg => {
      // Use created_at or updated_at as the start date
      const startDate = new Date(pkg.created_at || Date.now());
      let validUntil = new Date(startDate);
      
      const cycle = (pkg.billing_cycle || 'Monthly').toLowerCase();
      
      if (cycle === 'yearly' || cycle === 'annually') {
        validUntil.setFullYear(validUntil.getFullYear() + 1);
      } else if (cycle === 'quarterly') {
        validUntil.setMonth(validUntil.getMonth() + 3);
      } else {
        // Default to Monthly
        validUntil.setMonth(validUntil.getMonth() + 1);
      }

      // Format dates for the UI
      return {
        ...pkg,
        start_date_formatted: startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        valid_until_formatted: validUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        is_expired: new Date() > validUntil,
        features_list: pkg.features ? JSON.parse(pkg.features) : []
      };
    });

    return NextResponse.json({ success: true, data: activePackages });
  } catch (err) {
    console.error('Fetch My Packages API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
