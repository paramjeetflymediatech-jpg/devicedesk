import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../db/db.js';

export async function GET(request, { params }) {
  try {
    const { id: projectId } = await params;
    const db = await getDbConnection();

    const [rows] = await db.query(
      `SELECT pd.*, d.name as department_name, e.name as team_leader_name 
       FROM project_departments pd
       JOIN departments d ON (pd.department_id COLLATE utf8mb4_unicode_ci = d.id COLLATE utf8mb4_unicode_ci)
       LEFT JOIN employees e ON (pd.team_leader_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci)
       WHERE pd.project_id = ?`,
      [projectId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id: projectId } = await params;
    const { department_id, team_leader_id } = await request.json();

    if (!department_id) {
      return NextResponse.json({ error: 'department_id is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const projectDeptId = 'pd_' + Date.now();

    await db.execute(
      `INSERT INTO project_departments (id, project_id, department_id, team_leader_id) 
       VALUES (?, ?, ?, ?)`,
      [projectDeptId, projectId, department_id, team_leader_id || null]
    );

    return NextResponse.json({ success: true, id: projectDeptId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
