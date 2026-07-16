import { NextResponse } from 'next/server';
import { getDbConnection, getPool } from '../db/db.js';

// POST /api/danger-zone  { target: 'systems' | 'employees' | 'tickets' | 'history' | 'all' }
export async function POST(request) {
  try {
    await getDbConnection();
    const db = getPool();

    const { target } = await request.json();
    const allowed = ['systems', 'employees', 'tickets', 'history', 'all'];

    if (!allowed.includes(target)) {
      return NextResponse.json({ error: 'Invalid target.' }, { status: 400 });
    }

    const deleted = {};

    if (target === 'systems' || target === 'all') {
      const [r] = await db.execute('DELETE FROM systems');
      deleted.systems = r.affectedRows;
    }
    if (target === 'employees' || target === 'all') {
      // Delete all employees EXCEPT those with admin-privilege roles (Admin, Management)
      const [r] = await db.execute(
        `DELETE FROM employees 
         WHERE role NOT IN ('Admin', 'Management')`
      );
      deleted.employees = r.affectedRows;
    }
    if (target === 'tickets' || target === 'all') {
      const [r] = await db.execute('DELETE FROM tickets');
      deleted.tickets = r.affectedRows;
    }
    if (target === 'history' || target === 'all') {
      const [r] = await db.execute('DELETE FROM assignment_history');
      deleted.history = r.affectedRows;
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('Danger zone error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
