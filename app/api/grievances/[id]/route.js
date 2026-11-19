import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';

export const dynamic = 'force-dynamic';

export async function PATCH(request, context) {
  try {
    const params = await context.params;
    const grievanceId = params?.id;

    if (!grievanceId) {
      return NextResponse.json({ success: false, error: 'Grievance ID is required' }, { status: 400 });
    }

    const auth = await checkAuth(request);
    const userRoleLower = (auth?.user?.role || '').toLowerCase();
    const userDeptLower = (auth?.user?.department || '').toLowerCase();
    const isIT = userRoleLower.includes('engineer') || userRoleLower.includes('it support') || userDeptLower.includes('it');
    if (isIT) {
      return NextResponse.json({ success: false, error: 'Unauthorized: IT engineers cannot manage or review workplace grievances.' }, { status: 403 });
    }

    const body = await request.json();

    const reviewerId = auth?.user?.id || body.reviewed_by || 'HR_ADMIN';
    const { status, hr_notes } = body;

    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED', 'DISMISSED'];

    const pool = await getPool();

    // Check if grievance exists
    const [existing] = await pool.execute('SELECT * FROM team_grievances WHERE id = ?', [grievanceId]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Grievance record not found' }, { status: 404 });
    }

    const currentRecord = existing[0];
    const newStatus = status && validStatuses.includes(status) ? status : currentRecord.status;
    const newHrNotes = hr_notes !== undefined ? hr_notes : currentRecord.hr_notes;

    await pool.execute(`
      UPDATE team_grievances
      SET 
        status = ?,
        hr_notes = ?,
        reviewed_by = ?,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [newStatus, newHrNotes, reviewerId, grievanceId]);

    return NextResponse.json({
      success: true,
      message: `Grievance #${grievanceId} updated to status '${newStatus}'.`,
      grievance: {
        id: grievanceId,
        status: newStatus,
        hr_notes: newHrNotes,
        reviewed_by: reviewerId
      }
    });
  } catch (error) {
    console.error('Error updating grievance:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const grievanceId = params?.id;

    if (!grievanceId) {
      return NextResponse.json({ success: false, error: 'Grievance ID is required' }, { status: 400 });
    }

    const auth = await checkAuth(request);
    const userRoleLower = (auth?.user?.role || '').toLowerCase();
    const userDeptLower = (auth?.user?.department || '').toLowerCase();
    const isIT = userRoleLower.includes('engineer') || userRoleLower.includes('it support') || userDeptLower.includes('it');
    if (isIT) {
      return NextResponse.json({ success: false, error: 'Unauthorized: IT engineers cannot delete workplace grievances.' }, { status: 403 });
    }

    const pool = await getPool();
    await pool.execute('DELETE FROM team_grievances WHERE id = ?', [grievanceId]);

    return NextResponse.json({
      success: true,
      message: `Grievance #${grievanceId} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting grievance:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
