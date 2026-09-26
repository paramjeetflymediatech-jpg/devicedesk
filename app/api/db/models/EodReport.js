import { getPool } from '../db.js';

export class EodReport {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM eod_reports ORDER BY submitted_at DESC');
    return rows;
  }

  static async getByEmployeeId(employeeId) {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM eod_reports WHERE employee_id = ? ORDER BY submitted_at DESC', [employeeId]);
    return rows;
  }
  
  static async getTodayByEmployeeId(employeeId) {
    const db = getPool();
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await db.execute('SELECT * FROM eod_reports WHERE employee_id = ? AND DATE(submitted_at) = ? ORDER BY submitted_at DESC', [employeeId, today]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async createOrUpdate(data) {
    const db = getPool();
    const { id, employee_id, report_text, status } = data;
    
    const [existing] = await db.execute('SELECT * FROM eod_reports WHERE id = ?', [id]);
    
    if (existing.length > 0) {
      await db.execute(
        'UPDATE eod_reports SET report_text = ?, status = ? WHERE id = ?',
        [report_text, status || 'Pending', id]
      );
    } else {
      await db.execute(
        'INSERT INTO eod_reports (id, employee_id, report_text, status) VALUES (?, ?, ?, ?)',
        [id, employee_id, report_text, status || 'Pending']
      );
    }
  }
}
