import { getPool } from '../db.js';

export class System {
  static async getAll() {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM systems');
    return rows;
  }

  static async saveAll(systems) {
    const db = getPool();
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      // Non-destructive upsert: Never delete existing systems
      for (const s of systems) {
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
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
