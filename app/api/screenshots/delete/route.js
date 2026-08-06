import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import { deleteFile } from '../../utils/storageManager.js';

export async function DELETE(req) {
  try {
    const pool = await getDbConnection();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const employeeId = searchParams.get('employeeId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (!id && !employeeId && !deleteAll) {
      return NextResponse.json({ success: false, error: 'Target ID, employeeId, or deleteAll required' }, { status: 400 });
    }

    // Option A: Delete ALL screenshots
    if (deleteAll) {
      const [rows] = await pool.query(`SELECT imageUrl FROM screenshots`);
      await pool.query(`DELETE FROM screenshots`);

      // Non-blocking background file cleanup
      Promise.allSettled(rows.map(r => r.imageUrl ? deleteFile(r.imageUrl) : Promise.resolve())).catch(() => {});

      return NextResponse.json({ success: true, message: 'All screenshots permanently deleted' });
    }

    // Option B: Delete single screenshot by ID
    if (id) {
      const [rows] = await pool.query(`SELECT imageUrl FROM screenshots WHERE id = ?`, [id]);
      await pool.query(`DELETE FROM screenshots WHERE id = ?`, [id]);

      // Non-blocking background file cleanup
      if (rows.length > 0 && rows[0].imageUrl) {
        deleteFile(rows[0].imageUrl).catch(err => console.warn('Async file deletion notice:', err.message));
      }

      return NextResponse.json({ success: true, message: 'Screenshot deleted successfully' });
    }

    // Option C: Delete all screenshots for a specific employee
    if (employeeId) {
      const [rows] = await pool.query(`SELECT imageUrl FROM screenshots WHERE employeeId = ?`, [employeeId]);
      await pool.query(`DELETE FROM screenshots WHERE employeeId = ?`, [employeeId]);

      // Non-blocking background file cleanup
      Promise.allSettled(rows.map(r => r.imageUrl ? deleteFile(r.imageUrl) : Promise.resolve())).catch(() => {});

      return NextResponse.json({ success: true, message: `All screenshots for employee ${employeeId} deleted` });
    }

  } catch (err) {
    console.error('Delete screenshot error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
