import { getPool } from '../db.js';

export class System {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM systems');
    return rows;
  }

  static async saveAll(systems) {
    if (!Array.isArray(systems) || systems.length === 0) return;

    const validSystems = systems.filter(s => s && s.id);
    if (validSystems.length === 0) return;

    // Sort deterministically by primary key (id) to avoid out-of-order lock conflicts
    const sortedSystems = [...validSystems].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const placeholders = sortedSystems.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',\n');
    const values = [];
    for (const s of sortedSystems) {
      values.push(
        s.id || null,
        s.systemNumber || null,
        s.cpu || null,
        s.gpu || null,
        s.ram || null,
        s.storage || null,
        s.os || null,
        s.model || null,
        s.assignedTo || null,
        s.status || 'Active',
        s.remarks || null
      );
    }

    const sql = `
      INSERT INTO systems (id, systemNumber, cpu, gpu, ram, storage, os, model, assignedTo, status, remarks) 
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        systemNumber = VALUES(systemNumber),
        cpu = VALUES(cpu),
        gpu = VALUES(gpu),
        ram = VALUES(ram),
        storage = VALUES(storage),
        os = VALUES(os),
        model = VALUES(model),
        assignedTo = VALUES(assignedTo),
        status = VALUES(status),
        remarks = VALUES(remarks)
    `;

    const db = getPool();
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
