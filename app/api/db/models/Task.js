import { getPool } from '../db.js';

export class Task {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM tasks');
    return rows;
  }

  static async saveAll(tasks) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.execute('DELETE FROM tasks');
      for (const t of tasks) {
        await conn.execute(
          `INSERT INTO tasks (id, title, description, assignedTo, assignedToName, assignedBy, assignedByName, status, createdAt, startedAt, completedAt, totalDuration, fileUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            t.fileUrl || null
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
