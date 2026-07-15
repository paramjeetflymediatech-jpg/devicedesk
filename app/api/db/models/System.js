import { getPool } from '../db.js';

export class System {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM systems');
    return rows;
  }

  static async saveAll(systems) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.execute('DELETE FROM systems');
      for (const s of systems) {
        await conn.execute(
          `INSERT INTO systems (id, systemNumber, cpu, ram, storage, os, model, assignedTo, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.systemNumber, s.cpu, s.ram, s.storage, s.os, s.model, s.assignedTo || null, s.status, s.remarks || null]
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
