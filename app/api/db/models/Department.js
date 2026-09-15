import { getPool } from '../db.js';

export class Department {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM departments');
    return rows;
  }

  static async saveAll(departments) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      // Non-destructive upsert: Never delete existing departments
      for (const d of departments) {
        if (!d.id) continue;
        await conn.execute(
          `INSERT INTO departments (id, name) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [d.id, d.name]
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
