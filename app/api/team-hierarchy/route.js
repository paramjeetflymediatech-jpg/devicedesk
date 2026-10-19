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
    const teamLeaders = employees.filter(e => isTL(e.role) && e.status !== 'Inactive').map(tl => {
      const tlIds = (tl.tl_id || '').split(',').map(s => s.trim()).filter(Boolean);
      const membersCount = employees.filter(emp => 
        !isTL(emp.role) && 
        emp.status !== 'Inactive' && 
        (emp.tl_id || '').split(',').map(s => s.trim()).includes(String(tl.id))
      ).length;
      return {
        ...tl,
        tl_ids: tlIds,
        membersCount
      };
    });
    const regularEmployees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      return !isTL(e.role) && e.status !== 'Inactive' && !EXCLUDED_ROLES.includes(r);
    }).map(e => ({
      ...e,
      tl_ids: (e.tl_id || '').split(',').map(s => s.trim()).filter(Boolean)
    }));

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

    // 1. Ensure employee_team_leaders table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_team_leaders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL,
        tl_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_emp_tl (employee_id, tl_id),
        INDEX idx_emp (employee_id),
        INDEX idx_tl (tl_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Clear current assignments for this TL in employee_team_leaders table
    await db.query(`DELETE FROM employee_team_leaders WHERE tl_id = ?`, [tl_id]);

    // 3. Insert new member assignments for this TL
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      for (const empId of member_ids) {
        if (empId) {
          await db.query(
            `INSERT IGNORE INTO employee_team_leaders (employee_id, tl_id) VALUES (?, ?)`,
            [empId, tl_id]
          );
        }
      }
    }

    // 4. Synchronize employees.tl_id with comma-separated list of assigned TL IDs
    const [allAssigned] = await db.query(
      `SELECT employee_id, GROUP_CONCAT(tl_id ORDER BY id ASC SEPARATOR ',') as tl_ids 
       FROM employee_team_leaders 
       GROUP BY employee_id`
    );

    const tlMap = {};
    for (const row of allAssigned) {
      tlMap[row.employee_id] = row.tl_ids;
    }

    const [allEmps] = await db.query(`SELECT id, tl_id FROM employees`);
    for (const emp of allEmps) {
      const syncedTlId = tlMap[emp.id] || null;
      if (emp.tl_id !== syncedTlId) {
        await db.query(`UPDATE employees SET tl_id = ? WHERE id = ?`, [syncedTlId, emp.id]);
      }
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
