import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, price, billing_cycle, features } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: 'Name and Price are required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const featuresStr = Array.isArray(features) ? JSON.stringify(features) : features;

    await db.execute(
      `UPDATE packages SET name = ?, description = ?, price = ?, billing_cycle = ?, features = ? WHERE id = ?`,
      [name, description || '', price, billing_cycle || 'Monthly', featuresStr || '[]', id]
    );

    return NextResponse.json({ success: true, message: 'Package updated successfully' });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json({ success: false, error: 'Failed to update package' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.execute(`DELETE FROM packages WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete package' }, { status: 500 });
  }
}
