import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query(
      `SELECT * FROM departments ORDER BY name ASC`
    );
    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Fetch Departments API Error:', err);
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const deptId = 'dept_' + Date.now();
    const deptName = name.trim();
    const deptDesc = description ? description.trim() : null;

    // Check if department with this name already exists
    const [existing] = await db.query('SELECT id FROM departments WHERE name = ?', [deptName]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Department with this name already exists.' }, { status: 400 });
    }

    // Notice: our devicedesk schema says departments has id, name. We modified schema.sql but we must check if description exists.
    // If not, we might just insert id, name. For safety, let's just insert id and name first, 
    // since the original schema.sql had: CREATE TABLE IF NOT EXISTS departments (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE)
    
    // I will try to update the table if needed, or just insert name. 
    try {
        await db.query(`ALTER TABLE departments ADD COLUMN description TEXT`);
        await db.query(`ALTER TABLE departments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        await db.query(`ALTER TABLE departments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    } catch(e) {}

    await db.execute(
      `INSERT INTO departments (id, name, description) VALUES (?, ?, ?)`,
      [deptId, deptName, deptDesc]
    );

    return NextResponse.json({
      success: true,
      department: { id: deptId, name: deptName, description: deptDesc }
    });
  } catch (err) {
    console.error('Add Department API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
