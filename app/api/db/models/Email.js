import { getPool } from '../db.js';

export class Email {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM sent_emails');
    return rows;
  }

  static async saveAll(emails) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
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
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
