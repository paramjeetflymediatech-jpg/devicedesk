import { getPool } from '../db.js';

export class Employee {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM employees');
    return rows;
  }

  static async saveAll(employees) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.execute('DELETE FROM employees');
      for (const e of employees) {
        await conn.execute(
          `INSERT INTO employees (id, name, email, password, role, department, ticketLimit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            e.id || null,
            e.name || null,
            e.email || null,
            e.password || null,
            e.role || null,
            e.department || null,
            e.ticketLimit || 5
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
