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
      for (const row of rows) {
        if (row.imageUrl) {
          await deleteFile(row.imageUrl);
        }
      }
      await pool.query(`DELETE FROM screenshots`);

      return NextResponse.json({ success: true, message: 'All screenshots permanently deleted' });
    }

    // Option B: Delete single screenshot by ID
    if (id) {
      const [rows] = await pool.query(`SELECT imageUrl FROM screenshots WHERE id = ?`, [id]);
      if (rows.length > 0 && rows[0].imageUrl) {
        await deleteFile(rows[0].imageUrl);
      }
      await pool.query(`DELETE FROM screenshots WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Screenshot deleted successfully' });
    }

    // Option C: Delete all screenshots for a specific employee
    if (employeeId) {
      const [rows] = await pool.query(`SELECT imageUrl FROM screenshots WHERE employeeId = ?`, [employeeId]);
      for (const row of rows) {
        if (row.imageUrl) {
          await deleteFile(row.imageUrl);
        }
      }
      await pool.query(`DELETE FROM screenshots WHERE employeeId = ?`, [employeeId]);
      return NextResponse.json({ success: true, message: `All screenshots for employee ${employeeId} deleted` });
    }

  } catch (err) {
    console.error('Delete screenshot error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
