import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET(request) {
  try {
    const db = await getDbConnection();
    const [employees] = await db.query(
      `SELECT id, name, email, role, department, tl_id, status FROM employees ORDER BY name ASC`
    );

    const isTL = (role) => {
      const r = (role || '').toLowerCase();
      return r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead' || r === 'leader';
    };

    const EXCLUDED_ROLES = ['client', 'admin', 'superadmin', 'candidate'];
    const teamLeaders = employees.filter(e => isTL(e.role) && e.status !== 'Inactive');
    const regularEmployees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      return !isTL(e.role) && e.status !== 'Inactive' && !EXCLUDED_ROLES.includes(r);
    });

    return NextResponse.json({
      success: true,
      teamLeaders,
      regularEmployees
    });
  } catch (err) {
    console.error('Fetch team hierarchy error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { tl_id, member_ids } = await request.json();

    if (!tl_id) {
      return NextResponse.json({ success: false, error: 'Team Leader ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Unassign all existing members from this TL
    await db.query(`UPDATE employees SET tl_id = NULL WHERE tl_id = ?`, [tl_id]);

    // 2. Assign the chosen members to this TL
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      const placeholders = member_ids.map(() => '?').join(',');
      await db.query(
        `UPDATE employees SET tl_id = ? WHERE id IN (${placeholders})`,
        [tl_id, ...member_ids]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team Leader member screenshot access updated successfully.',
      assignedCount: (member_ids || []).length
    });
  } catch (err) {
    console.error('Update team hierarchy error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
