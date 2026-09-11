import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query(
      `SELECT * FROM projects ORDER BY created_at DESC`
    );
    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Fetch Projects API Error:', err);
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, client_id, description, status } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
    }
    if (!client_id || !client_id.trim()) {
      return NextResponse.json({ error: 'Client ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const projectId = 'proj_' + Date.now();
    const projName = name.trim();
    const projClientId = client_id.trim();
    const projDesc = description ? description.trim() : null;
    const projStatus = status ? status.trim() : 'planning';

    await db.execute(
      `INSERT INTO projects (id, name, client_id, description, status) VALUES (?, ?, ?, ?, ?)`,
      [projectId, projName, projClientId, projDesc, projStatus]
    );

    return NextResponse.json({
      success: true,
      project: { id: projectId, name: projName, client_id: projClientId, description: projDesc, status: projStatus }
    });
  } catch (err) {
    console.error('Add Project API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
