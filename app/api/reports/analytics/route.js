import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    
    // Fetch aggregate counts for the dashboard
    const [[{ total_projects }]] = await db.query(`SELECT COUNT(*) as total_projects FROM projects`);
    const [[{ total_departments }]] = await db.query(`SELECT COUNT(*) as total_departments FROM departments`);
    const [[{ total_tasks }]] = await db.query(`SELECT COUNT(*) as total_tasks FROM tasks`);
    const [[{ total_leads }]] = await db.query(`SELECT COUNT(*) as total_leads FROM leads`);
    const [[{ active_campaigns }]] = await db.query(`SELECT COUNT(*) as active_campaigns FROM campaigns WHERE status = 'Active'`);
    const [[{ total_submissions }]] = await db.query(`SELECT COUNT(*) as total_submissions FROM work_submissions`);

    return NextResponse.json({
      success: true,
      data: {
        projects: total_projects,
        departments: total_departments,
        tasks: total_tasks,
        leads: total_leads,
        active_campaigns,
        work_submissions: total_submissions
      }
    });
  } catch (err) {
    console.error('Analytics API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
