import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDbConnection();

    const [rows] = await db.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    let employee = rows[0];

    // If client, fetch advanced details
    if (employee.role && employee.role.toLowerCase() === 'client') {
      const [details] = await db.query('SELECT * FROM client_details WHERE client_id = ? LIMIT 1', [id]);
      if (details.length > 0) {
        employee = { ...employee, ...details[0] };
      }
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (err) {
    console.error('Fetch Employee by ID API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      name, email, role, department, status, ticketLimit, avatarUrl,
      company_name, phone, whatsapp, address, gst_number, website_url, primary_service, notes 
    } = body;

    const db = await getDbConnection();
    
    // Dynamically build the update query
    let updates = [];
    let values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email.trim());
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role.trim());
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department.trim());
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status.trim());
    }
    if (ticketLimit !== undefined) {
      updates.push('ticketLimit = ?');
      values.push(Number(ticketLimit) || 5);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatarUrl = ?');
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No update data provided.' }, { status: 400 });
    }

    values.push(id);

    const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(query, values);

    // If updating a client, update client_details as well
    if (role && role.toLowerCase() === 'client') {
      const [existing] = await db.query('SELECT client_id FROM client_details WHERE client_id = ?', [id]);
      if (existing.length > 0) {
        await db.execute(
          `UPDATE client_details SET company_name=?, phone=?, whatsapp=?, address=?, gst_number=?, website_url=?, primary_service=?, notes=? WHERE client_id=?`,
          [company_name || null, phone || null, whatsapp || null, address || null, gst_number || null, website_url || null, primary_service || null, notes || null, id]
        ).catch(err => console.error('Failed to update client_details:', err));
      } else {
        await db.execute(
          `INSERT INTO client_details (client_id, company_name, phone, whatsapp, address, gst_number, website_url, primary_service, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, company_name || null, phone || null, whatsapp || null, address || null, gst_number || null, website_url || null, primary_service || null, notes || null]
        ).catch(err => console.error('Failed to insert client_details:', err));
      }
    }

    // Add to assignment_history for audit
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    await db.execute(
      `INSERT INTO assignment_history (id, employeeId, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?)`,
      [logId, id, 'User Details Updated', new Date().toISOString(), 'Admin']
    ).catch(err => console.error('Failed to log employee update:', err));

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Update Employee API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDbConnection();

    // Check if user exists
    const [existing] = await db.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Unassign systems assigned to this employee
    await db.execute(
      `UPDATE systems SET assignedTo = NULL, status = 'Available' WHERE assignedTo = ?`,
      [id]
    ).catch(err => console.warn('Unassign systems warning:', err.message));

    // Clean up device tokens and chat group memberships
    await db.execute('DELETE FROM user_devices WHERE userId = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM chat_group_members WHERE employeeId = ?', [id]).catch(() => {});

    // Delete employee record
    await db.execute('DELETE FROM employees WHERE id = ?', [id]);

    // Add to assignment_history for audit
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    await db.execute(
      `INSERT INTO assignment_history (id, employeeId, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?)`,
      [logId, id, `User Deleted: ${existing[0].name} (${existing[0].role || 'Employee'})`, new Date().toISOString(), 'Admin']
    ).catch(err => console.error('Failed to log employee deletion:', err));

    return NextResponse.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Delete Employee API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
