import { getPool } from '../db.js';

export class AssignmentHistory {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM assignment_history');
    return rows;
  }

  static async saveAll(history) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.execute('DELETE FROM assignment_history');
      for (const h of history) {
        await conn.execute(
          `INSERT INTO assignment_history (id, employeeId, systemId, systemNumber, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            h.id || null,
            h.employeeId || null,
            h.systemId || null,
            h.systemNumber || null,
            h.action || null,
            h.timestamp || null,
            h.assignedBy || 'System'
          ]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
