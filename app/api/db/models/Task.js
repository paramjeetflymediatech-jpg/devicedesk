import { getPool } from '../db.js';

export class Task {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM tasks');
    return rows;
  }

  static async saveAll(tasks) {
    if (!Array.isArray(tasks)) return;
    const db = getPool();
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('DELETE FROM tasks');
        for (const t of tasks) {
          await conn.execute(
            `INSERT INTO tasks (id, title, description, assignedTo, assignedToName, assignedBy, assignedByName, status, createdAt, startedAt, completedAt, totalDuration, fileUrl, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              t.id || null,
              t.title || '',
              t.description || null,
              t.assignedTo || null,
              t.assignedToName || null,
              t.assignedBy || null,
              t.assignedByName || null,
              t.status || 'Pending',
              t.createdAt || null,
              t.startedAt || null,
              t.completedAt || null,
              t.totalDuration || 0,
              t.fileUrl || null,
              t.project_id || null
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
          console.warn(`[Task.saveAll] Deadlock encountered (attempt ${attempt}/${maxRetries}), retrying...`);
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
