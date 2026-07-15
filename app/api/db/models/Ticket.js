import { getPool } from '../db.js';

export class Ticket {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM tickets');
    return rows.map(r => ({
      ...r,
      notes: r.resolutionRemarks,
      employeeId: r.raisedBy
    }));
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
          [
            t.id || null,
            t.title || t.category || 'Support Request',
            t.description || null,
            t.category || null,
            t.severity || null,
            t.status || 'Open',
            t.systemId || null,
            t.systemNumber || null,
            t.raisedBy || t.employeeId || null,
            t.raisedByName || null,
            t.createdAt || null,
            t.startedAt || null,
            t.resolvedAt || null,
            t.resolutionRemarks || t.notes || null
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
