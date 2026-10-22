import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function DELETE(request) {
  return handleDelete(request);
}

export async function POST(request) {
  return handleDelete(request);
}

async function handleDelete(request) {
  try {
    let id;
    try {
      const body = await request.json();
      id = body?.id || body?.test_id;
    } catch (e) {}

    if (!id) {
      const { searchParams } = new URL(request.url);
      id = searchParams.get('id') || searchParams.get('test_id');
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Test ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if test exists
    const [tests] = await db.execute(`SELECT * FROM candidate_tests WHERE id = ? LIMIT 1`, [id]);
    if (tests.length === 0) {
      return NextResponse.json({ success: false, error: 'Assigned test not found' }, { status: 404 });
    }

    // Delete the assigned test
    await db.execute(`DELETE FROM candidate_tests WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Assigned candidate test deleted successfully'
    });
  } catch (error) {
    console.error('Delete Assigned Test API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error deleting assigned test' }, { status: 500 });
  }
}
