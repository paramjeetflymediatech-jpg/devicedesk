import { getPool } from '../db.js';

export class AssignmentHistory {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM assignment_history');
    return rows;
  }

  static async saveAll(history) {
    if (!Array.isArray(history)) return;
    const db = getPool();
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
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
        return;
      } catch (err) {
        try {
          await conn.rollback();
        } catch (rbErr) {}

        const isDeadlock =
          err.code === 'ER_LOCK_DEADLOCK' ||
          err.errno === 1213 ||
          err.code === 'ER_LOCK_WAIT_TIMEOUT' ||
          err.errno === 1205 ||
          (err.message && err.message.toLowerCase().includes('deadlock'));

        if (isDeadlock && attempt < maxRetries) {
          console.warn(`[AssignmentHistory.saveAll] Deadlock encountered (attempt ${attempt}/${maxRetries}), retrying...`);
          const delay = Math.floor(Math.random() * 50) + attempt * 50;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw err;
      } finally {
        conn.release();
      }
    }
  }
}
