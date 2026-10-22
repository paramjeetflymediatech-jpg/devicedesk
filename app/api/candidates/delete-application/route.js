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
      id = body?.id || body?.registrationId;
    } catch (e) {}

    if (!id) {
      const { searchParams } = new URL(request.url);
      id = searchParams.get('id') || searchParams.get('registrationId');
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if application exists
    const [regs] = await db.execute(`SELECT * FROM candidate_registrations WHERE id = ? LIMIT 1`, [id]);
    if (regs.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }
    const reg = regs[0];

    // Clean up any candidate employee accounts and their tests if created
    try {
      if (reg.email) {
        const [candidateEmps] = await db.execute(
          `SELECT id FROM employees WHERE email = ? AND role = 'Candidate'`,
          [reg.email]
        );
        for (const emp of candidateEmps) {
          await db.execute(`DELETE FROM candidate_tests WHERE candidate_employee_id = ?`, [emp.id]);
          await db.execute(`DELETE FROM employees WHERE id = ?`, [emp.id]);
        }
      }
    } catch (cleanErr) {
      console.warn('Candidate cleanup warning:', cleanErr);
    }

    // Delete the application registration
    await db.execute(`DELETE FROM candidate_registrations WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Delete Application API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error deleting application' }, { status: 500 });
  }
}
