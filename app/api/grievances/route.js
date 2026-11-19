import { NextResponse } from 'next/server';
import { getPool } from '../db/db.js';
import { checkAuth } from '../utils/storageManager.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(request.url);

    // Authentication check
    const auth = await checkAuth(request);
    const queryEmpId = searchParams.get('employee_id');
    const queryRole = searchParams.get('role');

    const currentUser = auth?.user || null;
    const currentUserId = currentUser?.id || queryEmpId || null;
    const currentRole = (currentUser?.role || queryRole || '').toUpperCase();

    const userRoleLower = (currentUser?.role || '').toLowerCase();
    const userDeptLower = (currentUser?.department || '').toLowerCase();
    const isIT = userRoleLower.includes('engineer') || userRoleLower.includes('it support') || userDeptLower.includes('it');

    const isHR = !isIT && (currentRole === 'ADMIN' || currentRole === 'SUPERADMIN' || currentRole === 'HR');

    // Base query with defensive collation conversions to prevent ER_CANT_AGGREGATE_2COLLATIONS
    let query = `
      SELECT 
        g.id,
        g.reporter_id,
        g.reported_against_id,
        g.category,
        g.severity,
        g.subject,
        g.description,
        g.is_anonymous,
        g.status,
        g.hr_notes,
        g.reviewed_by,
        g.reviewed_at,
        g.created_at,
        g.updated_at,
        CASE 
          WHEN g.is_anonymous = 1 AND ? = 0 THEN 'Confidential Colleague'
          ELSE COALESCE(rep.name, g.reporter_id)
        END as reporter_name,
        CASE 
          WHEN g.is_anonymous = 1 AND ? = 0 THEN 'confidential@internal'
          ELSE COALESCE(rep.email, '')
        END as reporter_email,
        COALESCE(rep.department, '') as reporter_department,
        COALESCE(target.name, 'General Workplace / Facility') as reported_against_name,
        COALESCE(target.department, '') as reported_against_department,
        COALESCE(target.email, '') as reported_against_email,
        COALESCE(rev.name, g.reviewed_by) as reviewer_name
      FROM team_grievances g
      LEFT JOIN employees rep ON CONVERT(g.reporter_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(rep.id USING utf8mb4) COLLATE utf8mb4_general_ci
      LEFT JOIN employees target ON CONVERT(g.reported_against_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(target.id USING utf8mb4) COLLATE utf8mb4_general_ci
      LEFT JOIN employees rev ON CONVERT(g.reviewed_by USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(rev.id USING utf8mb4) COLLATE utf8mb4_general_ci
      WHERE 1=1
    `;

    const params = [isHR ? 1 : 0, isHR ? 1 : 0];

    // If regular employee, only show their own submitted grievances
    if (!isHR) {
      if (!currentUserId) {
        return NextResponse.json({ success: true, grievances: [], metrics: {} });
      }
      query += ` AND g.reporter_id = ?`;
      params.push(currentUserId);
    }

    // Optional status & category filters
    const filterStatus = searchParams.get('status');
    if (filterStatus && filterStatus !== 'ALL') {
      query += ` AND g.status = ?`;
      params.push(filterStatus);
    }

    const filterCategory = searchParams.get('category');
    if (filterCategory && filterCategory !== 'ALL') {
      query += ` AND g.category = ?`;
      params.push(filterCategory);
    }

    query += ` ORDER BY g.created_at DESC`;

    const [rows] = await pool.execute(query, params);

    // Compute metrics
    const [metricsRows] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN status = 'ACTION_TAKEN' THEN 1 ELSE 0 END) as action_taken,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'DISMISSED' THEN 1 ELSE 0 END) as dismissed,
        SUM(CASE WHEN severity IN ('HIGH', 'CRITICAL') AND status IN ('SUBMITTED', 'UNDER_REVIEW') THEN 1 ELSE 0 END) as urgent_open
      FROM team_grievances
    `);

    return NextResponse.json({
      success: true,
      grievances: rows,
      metrics: metricsRows[0] || {
        total: 0,
        submitted: 0,
        under_review: 0,
        action_taken: 0,
        resolved: 0,
        dismissed: 0,
        urgent_open: 0
      }
    });
  } catch (error) {
    console.error('Error fetching team grievances:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const pool = await getPool();
    const body = await request.json();

    const auth = await checkAuth(request);
    const reporterId = auth?.user?.id || body.reporter_id;

    if (!reporterId) {
      return NextResponse.json({ success: false, error: 'Employee authentication required to file a grievance.' }, { status: 401 });
    }

    const {
      reported_against_id = null,
      category = 'OTHER',
      severity = 'MEDIUM',
      subject,
      description,
      is_anonymous = 0
    } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, error: 'Detailed description is required.' }, { status: 400 });
    }

    const validCategories = [
      'NOISE_DISTURBANCE',
      'INTERPERSONAL_CONFLICT',
      'WORKPLACE_CONDUCT',
      'COMMUNICATION',
      'WORK_ALLOCATION',
      'FACILITIES_DESK',
      'OTHER'
    ];
    const cat = validCategories.includes(category) ? category : 'OTHER';

    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const sev = validSeverities.includes(severity) ? severity : 'MEDIUM';

    const [result] = await pool.execute(`
      INSERT INTO team_grievances (
        reporter_id, reported_against_id, category, severity,
        subject, description, is_anonymous, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
    `, [
      reporterId,
      reported_against_id ? String(reported_against_id) : null,
      cat,
      sev,
      subject.trim(),
      description.trim(),
      is_anonymous ? 1 : 0
    ]);

    return NextResponse.json({
      success: true,
      message: 'Grievance submitted confidentially to HR. Your workplace well-being is our priority.',
      grievanceId: result.insertId
    }, { status: 201 });
  } catch (error) {
    console.error('Error filing team grievance:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
