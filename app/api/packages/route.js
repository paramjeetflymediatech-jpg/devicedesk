import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const db = await getDbConnection();
    const [rows] = await db.query('SELECT * FROM packages ORDER BY created_at DESC');
    
    let processedRows = rows;
    if (clientId) {
      const [overrides] = await db.query('SELECT package_id, custom_price, custom_name, custom_description, custom_billing_cycle, custom_features FROM client_package_overrides WHERE client_id = ? AND status = "Active"', [clientId]);
      const overrideMap = {};
      overrides.forEach(o => { overrideMap[o.package_id] = o; });
      
      processedRows = rows.map(row => {
        const o = overrideMap[row.id];
        if (o) {
          return {
            ...row,
            price: o.custom_price !== undefined && o.custom_price !== null ? o.custom_price : row.price,
            name: o.custom_name || row.name,
            description: o.custom_description || row.description,
            billing_cycle: o.custom_billing_cycle || row.billing_cycle,
            features: o.custom_features || row.features
          };
        }
        return row;
      });
    }

    // Parse features from JSON if possible, otherwise keep as string
    const packages = processedRows.map(pkg => {
      let parsedFeatures = [];
      try {
        parsedFeatures = JSON.parse(pkg.features);
      } catch (e) {
        parsedFeatures = pkg.features ? [pkg.features] : [];
      }
      return { ...pkg, features: parsedFeatures };
    });

    return NextResponse.json({ success: true, packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch packages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, price, billing_cycle, features } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: 'Name and Price are required' }, { status: 400 });
    }

    const id = 'pkg_' + Date.now();
    const db = await getDbConnection();
    
    const featuresStr = Array.isArray(features) ? JSON.stringify(features) : features;

    await db.execute(
      `INSERT INTO packages (id, name, description, price, billing_cycle, features) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description || '', price, billing_cycle || 'Monthly', featuresStr || '[]']
    );

    return NextResponse.json({ success: true, message: 'Package created successfully', id });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json({ success: false, error: 'Failed to create package' }, { status: 500 });
  }
}
