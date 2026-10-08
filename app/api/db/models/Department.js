import { getPool } from '../db.js';

export class Department {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM departments');
    return rows;
  }

  static async saveAll(departments) {
    if (!Array.isArray(departments)) return;
    const db = getPool();

    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        if (departments.length === 0) {
          await conn.execute('DELETE FROM departments');
        } else {
          const sorted = [...departments].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
          for (const d of sorted) {
            if (!d.id) continue;
            await conn.execute(
              `INSERT INTO departments (id, name) VALUES (?, ?)
               ON DUPLICATE KEY UPDATE name = VALUES(name)`,
              [d.id, d.name]
            );
          }
          // Remove deleted departments from MySQL table
          const validIds = sorted.map(d => d.id).filter(Boolean);
          if (validIds.length > 0) {
            const placeholders = validIds.map(() => '?').join(',');
            await conn.execute(`DELETE FROM departments WHERE id NOT IN (${placeholders})`, validIds);
          }
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
          console.warn(`[Department.saveAll] Deadlock encountered (attempt ${attempt}/${maxRetries}), retrying...`);
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
