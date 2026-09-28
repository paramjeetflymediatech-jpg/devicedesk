import { getPool } from '../db.js';

export class System {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM systems');
    return rows;
  }

  static async saveAll(systems) {
    if (!Array.isArray(systems) || systems.length === 0) return;

    // Sort deterministically by primary key (id) to avoid out-of-order lock conflicts
    const sortedSystems = [...systems].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
    const db = getPool();

    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        // Non-destructive upsert: Never delete existing systems
        for (const s of sortedSystems) {
          if (!s.id) continue;
          await conn.execute(
            `INSERT INTO systems (id, systemNumber, cpu, gpu, ram, storage, os, model, assignedTo, status, remarks) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
               remarks = VALUES(remarks)`,
            [
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
          console.warn(`[System.saveAll] Deadlock encountered (attempt ${attempt}/${maxRetries}), retrying...`);
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
