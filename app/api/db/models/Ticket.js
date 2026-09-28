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
    if (!Array.isArray(tickets)) return;
    const db = getPool();
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
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
          console.warn(`[Ticket.saveAll] Deadlock encountered (attempt ${attempt}/${maxRetries}), retrying...`);
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
