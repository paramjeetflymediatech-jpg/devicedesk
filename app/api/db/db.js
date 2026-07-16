import mysql from 'mysql2/promise';
import { initialSystems, initialEmployees, initialTickets, initialDepartments } from '../../data.js';

// Coerce undefined → null so MySQL2 doesn't throw "undefined bind param"
const n = v => (v === undefined ? null : v);

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT || '3306'),
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'Root@123',
      database: process.env.DB_NAME || 'system_tracking',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

export async function getDbConnection() {
  const db = getPool();

  // Create tables if they don't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE,
      password VARCHAR(255),
      role VARCHAR(100),
      department VARCHAR(100),
      ticketLimit INT DEFAULT 5
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS systems (
      id VARCHAR(50) PRIMARY KEY,
      systemNumber VARCHAR(50) UNIQUE,
      cpu VARCHAR(100),
      gpu VARCHAR(100),
      ram VARCHAR(50),
      storage VARCHAR(50),
      os VARCHAR(100),
      model VARCHAR(100),
      assignedTo VARCHAR(50),
      status VARCHAR(50),
      remarks TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255),
      description TEXT,
      category VARCHAR(100),
      severity VARCHAR(50),
      status VARCHAR(50),
      systemId VARCHAR(50),
      systemNumber VARCHAR(50),
      raisedBy VARCHAR(50),
      raisedByName VARCHAR(100),
      createdAt VARCHAR(50),
      startedAt VARCHAR(50),
      resolvedAt VARCHAR(50),
      resolutionRemarks TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assignment_history (
      id VARCHAR(100) PRIMARY KEY,
      employeeId VARCHAR(50),
      systemId VARCHAR(50),
      systemNumber VARCHAR(50),
      action VARCHAR(255),
      timestamp VARCHAR(50),
      assignedBy VARCHAR(100) DEFAULT 'System'
    )
  `);

  // Alter tables if columns do not exist
  try {
    await db.execute(`ALTER TABLE assignment_history ADD COLUMN assignedBy VARCHAR(100) DEFAULT 'System'`);
  } catch (err) {
    // Column already exists, ignore error
  }

  try {
    await db.execute(`ALTER TABLE systems ADD COLUMN gpu VARCHAR(100)`);
  } catch (err) {
    // Column already exists, ignore error
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id VARCHAR(100) PRIMARY KEY,
      to_address VARCHAR(150),
      subject VARCHAR(255),
      body TEXT,
      timestamp VARCHAR(50)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS db_meta (
      meta_key VARCHAR(50) PRIMARY KEY,
      meta_value VARCHAR(100)
    )
  `);

  // Check if DB was already seeded
  const [metaRows] = await db.execute("SELECT meta_value FROM db_meta WHERE meta_key = 'seeded' LIMIT 1");
  const alreadySeeded = metaRows.length > 0 && metaRows[0].meta_value === 'true';

  if (!alreadySeeded) {
    // Seed departments if empty
    const [deptRows] = await db.execute('SELECT COUNT(*) as count FROM departments');
    if (deptRows[0].count === 0) {
      for (const d of initialDepartments) {
        await db.execute(
          `INSERT IGNORE INTO departments (id, name) VALUES (?, ?)`,
          [n(d.id), n(d.name)]
        );
      }
    }

    // Seed employees if empty
    const [empRows] = await db.execute('SELECT COUNT(*) as count FROM employees');
    if (empRows[0].count === 0) {
      for (const e of initialEmployees) {
        const firstName = e.name ? e.name.split(' ')[0].toLowerCase() : 'employee';
        const email = e.email || `${firstName}@yopmail.com`;
        const password = e.password || `${firstName}123`;
        const ticketLimit = e.ticketLimit !== undefined ? e.ticketLimit : 5;
        await db.execute(
          `INSERT IGNORE INTO employees (id, name, email, password, role, department, ticketLimit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [n(e.id), n(e.name), n(email), n(password), n(e.role), n(e.department), ticketLimit]
        );
      }
    }

    // Seed systems if empty
    const [sysRows] = await db.execute('SELECT COUNT(*) as count FROM systems');
    if (sysRows[0].count === 0) {
      for (const s of initialSystems) {
        await db.execute(
          `INSERT IGNORE INTO systems (id, systemNumber, cpu, ram, storage, os, model, assignedTo, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [n(s.id), n(s.systemNumber), n(s.cpu), n(s.ram), n(s.storage), n(s.os), n(s.model), n(s.assignedTo), n(s.status), n(s.remarks)]
        );
      }
    }

    // Seed tickets if empty
    const [tktRows] = await db.execute('SELECT COUNT(*) as count FROM tickets');
    if (tktRows[0].count === 0) {
      for (const t of initialTickets) {
        await db.execute(
          `INSERT IGNORE INTO tickets (id, title, description, category, severity, status, systemId, systemNumber, raisedBy, raisedByName, createdAt, startedAt, resolvedAt, resolutionRemarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [n(t.id), n(t.title), n(t.description), n(t.category), n(t.severity), n(t.status), n(t.systemId), n(t.systemNumber), n(t.raisedBy), n(t.raisedByName), n(t.createdAt), n(t.startedAt), n(t.resolvedAt), n(t.resolutionRemarks)]
        );
      }
    }

    // Seed assignment history if empty
    const [histRows] = await db.execute('SELECT COUNT(*) as count FROM assignment_history');
    if (histRows[0].count === 0) {
      const initialHistory = initialSystems
        .filter(s => s.assignedTo)
        .map((s, idx) => ({
          id: 'log_seed_' + idx,
          employeeId: s.assignedTo,
          systemId: s.id,
          systemNumber: s.systemNumber,
          action: 'Assigned (Initial Seed)',
          timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          assignedBy: 'System'
        }));
      for (const h of initialHistory) {
        await db.execute(
          `INSERT IGNORE INTO assignment_history (id, employeeId, systemId, systemNumber, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [n(h.id), n(h.employeeId), n(h.systemId), n(h.systemNumber), n(h.action), n(h.timestamp), n(h.assignedBy)]
        );
      }
    }

    // Mark as seeded so it never auto-seeds again
    await db.execute("INSERT INTO db_meta (meta_key, meta_value) VALUES ('seeded', 'true') ON DUPLICATE KEY UPDATE meta_value='true'");
  }

  return db;
}
