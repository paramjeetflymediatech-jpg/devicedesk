import bcrypt from 'bcryptjs';
import { getPool } from '../db.js';

export class Employee {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM employees');
    return rows;
  }

  static async saveAll(employees) {
    if (!Array.isArray(employees) || employees.length === 0) return;

    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    const db = getPool();

    // 1. Fetch passMap OUTSIDE transaction so we don't hold locks during read/hash
    let passMap = {};
    try {
      const [existingRows] = await db.execute('SELECT id, password FROM employees');
      for (const row of existingRows) {
        passMap[row.id] = row.password;
      }
    } catch (e) {
      // If table empty or select fails, proceed
    }

    const validEmployees = employees.filter(e => e && e.id);
    if (validEmployees.length === 0) return;

    // 2. Pre-hash passwords before opening any transaction
    const processedEmployees = [];
    for (const e of validEmployees) {
      let passwordToSave = passMap[e.id] || e.password || null;
      if (passwordToSave && !passwordToSave.startsWith('$2a$') && !passwordToSave.startsWith('$2b$')) {
        passwordToSave = await bcrypt.hash(passwordToSave + pepper, 10);
      }
      processedEmployees.push({
        id: e.id,
        name: e.name || null,
        email: e.email && String(e.email).trim() ? String(e.email).trim() : null,
        password: passwordToSave,
        role: e.role || null,
        department: e.department || null,
        ticketLimit: e.ticketLimit || 5,
        status: e.status || 'Active',
        avatarUrl: e.avatarUrl || null
      });
    }

    // 3. Sort deterministically by primary key (id)
    processedEmployees.sort((a, b) => String(a.id).localeCompare(String(b.id)));

    // 4. Construct single atomic batch upsert statement
    const placeholders = processedEmployees.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',\n');
    const values = [];
    for (const e of processedEmployees) {
      values.push(
        e.id,
        e.name,
        e.email,
        e.password,
        e.role,
        e.department,
        e.ticketLimit,
        e.status,
        e.avatarUrl
      );
    }

    const sql = `
      INSERT INTO employees (id, name, email, password, role, department, ticketLimit, status, avatarUrl)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        email = VALUES(email),
        password = COALESCE(VALUES(password), password),
        role = VALUES(role),
        department = VALUES(department),
        ticketLimit = VALUES(ticketLimit),
        status = VALUES(status),
        avatarUrl = COALESCE(VALUES(avatarUrl), avatarUrl)
    `;

    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(sql, values);
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
