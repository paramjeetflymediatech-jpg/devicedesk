import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import fs from 'fs';
import path from 'path';

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
          const relPath = row.imageUrl.replace(/^\//, '');
          const fullPath = path.join(process.cwd(), 'public', relPath);
          if (fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
          }
        }
      }
      await pool.query(`DELETE FROM screenshots`);

      // Also clean up orphan files in uploads/screenshots directory if any exist
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'screenshots');
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(uploadDir, file));
          } catch (e) { /* ignore */ }
        }
      }

      return NextResponse.json({ success: true, message: 'All screenshots permanently deleted' });
    }

    // Option B: Delete single screenshot by ID
    if (id) {
      const [rows] = await pool.query(`SELECT imageUrl FROM screenshots WHERE id = ?`, [id]);
      if (rows.length > 0 && rows[0].imageUrl) {
        const relPath = rows[0].imageUrl.replace(/^\//, '');
        const fullPath = path.join(process.cwd(), 'public', relPath);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
        }
      }
      await pool.query(`DELETE FROM screenshots WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Screenshot deleted successfully' });
    }

    // Option C: Delete all screenshots for a specific employee
    if (employeeId) {
      const [rows] = await pool.query(`SELECT imageUrl FROM screenshots WHERE employeeId = ?`, [employeeId]);
      for (const row of rows) {
        if (row.imageUrl) {
          const relPath = row.imageUrl.replace(/^\//, '');
          const fullPath = path.join(process.cwd(), 'public', relPath);
          if (fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
          }
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
