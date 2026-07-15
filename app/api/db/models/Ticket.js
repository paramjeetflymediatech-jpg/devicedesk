import { getPool } from '../db.js';

export class Ticket {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM tickets');
    return rows;
  }

  static async saveAll(tickets) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.execute('DELETE FROM tickets');
      for (const t of tickets) {
        await conn.execute(
          `INSERT INTO tickets (id, title, description, category, severity, status, systemId, systemNumber, raisedBy, raisedByName, createdAt, startedAt, resolvedAt, resolutionRemarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.id, t.title, t.description, t.category, t.severity, t.status, t.systemId, t.systemNumber, t.raisedBy, t.raisedByName, t.createdAt, t.startedAt || null, t.resolvedAt || null, t.resolutionRemarks || null]
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
