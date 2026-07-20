import bcrypt from 'bcryptjs';
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
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    try {
      await conn.execute('DELETE FROM employees');
      for (const e of employees) {
        let passwordToSave = e.password || null;

        // If password is plain text (not starting with $2a$ or $2b$), hash it with bcrypt!
        if (passwordToSave && !passwordToSave.startsWith('$2a$') && !passwordToSave.startsWith('$2b$')) {
          passwordToSave = await bcrypt.hash(passwordToSave + pepper, 10);
        }

        await conn.execute(
          `INSERT INTO employees (id, name, email, password, role, department, ticketLimit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            e.id || null,
            e.name || null,
            e.email || null,
            passwordToSave,
            e.role || null,
            e.department || null,
            e.ticketLimit || 5,
            e.status || 'Active'
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
