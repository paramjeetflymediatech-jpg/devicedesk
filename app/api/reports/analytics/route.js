import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function GET() {
  try {
    const db = await getDbConnection();
    
    const safeCount = async (sql) => {
      try {
        const [[res]] = await db.query(sql);
        return Object.values(res)[0] || 0;
      } catch (e) {
        return 0;
      }
    };

    const total_projects = await safeCount(`SELECT COUNT(*) as total_projects FROM projects`);
    const total_departments = await safeCount(`SELECT COUNT(*) as total_departments FROM departments`);
    const total_tasks = await safeCount(`SELECT COUNT(*) as total_tasks FROM tasks`);
    const total_leads = await safeCount(`SELECT COUNT(*) as total_leads FROM leads`);
    const active_campaigns = await safeCount(`SELECT COUNT(*) as active_campaigns FROM campaigns WHERE status = 'Active'`);
    const total_submissions = await safeCount(`SELECT COUNT(*) as total_submissions FROM work_submissions`);

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
    return NextResponse.json({ 
      success: false, 
      error: err.message, 
      data: {
        projects: 0,
        departments: 0,
        tasks: 0,
        leads: 0,
        active_campaigns: 0,
        work_submissions: 0
      }
    }, { status: 200 });
  }
}

