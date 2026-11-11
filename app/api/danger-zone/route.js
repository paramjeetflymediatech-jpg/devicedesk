import { NextResponse } from 'next/server';
import { getDbConnection, getPool } from '../db/db.js';
import { checkAuth } from '../utils/storageManager.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

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

    try {
      const adminUser = await checkAuth(request);
      await logSecurityEvent({
        request,
        action: 'ADMIN_DANGER_ZONE_PURGE',
        category: 'DANGER_ZONE',
        status: 'CRITICAL',
        user: adminUser,
        details: { target, deletedSummary: deleted, warning: 'Permanent database purge executed' }
      });
    } catch (auditErr) {
      console.warn('Audit log error on danger zone:', auditErr);
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('Danger zone error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
