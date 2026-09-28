import { getPool } from '../db.js';

export class Email {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM sent_emails');
    return rows;
  }

  static async saveAll(emails) {
    if (!Array.isArray(emails)) return;
    const db = getPool();
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('DELETE FROM sent_emails');
        for (const e of emails) {
          await conn.execute(
            `INSERT INTO sent_emails (id, to_address, subject, body, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [
              e.id || null,
              e.to || e.to_address || null,
              e.subject || null,
              e.body || null,
              e.timestamp || null
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
          console.warn(`[Email.saveAll] Deadlock encountered (attempt ${attempt}/${maxRetries}), retrying...`);
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
