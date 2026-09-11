import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { role, department, status } = await request.json();

    if (!role && !department && !status) {
      return NextResponse.json({ error: 'No update data provided.' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // Dynamically build the update query
    let updates = [];
    let values = [];

    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (department) {
      updates.push('department = ?');
      values.push(department);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    values.push(id);

    const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(query, values);

    // Add to assignment_history for audit
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    await db.execute(
      `INSERT INTO assignment_history (id, employeeId, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?)`,
      [logId, id, 'User Role/Dept Updated', new Date().toISOString(), 'Admin']
    ).catch(err => console.error('Failed to log employee update:', err));

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Update Employee API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
