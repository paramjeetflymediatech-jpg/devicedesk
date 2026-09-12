import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query('SELECT * FROM packages ORDER BY created_at DESC');
    
    // Parse features from JSON if possible, otherwise keep as string
    const packages = rows.map(pkg => {
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
