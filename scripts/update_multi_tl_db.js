import { getDbConnection } from '../app/api/db/db.js';

async function migrate() {
  try {
    const db = await getDbConnection();

    // 1. Modify tl_id in employees to VARCHAR(255)
    await db.query('ALTER TABLE employees MODIFY tl_id VARCHAR(255) NULL');
    console.log('✓ employees.tl_id modified to VARCHAR(255)');

    // 2. Create employee_team_leaders junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_team_leaders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL,
        tl_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_emp_tl (employee_id, tl_id),
        INDEX idx_emp (employee_id),
        INDEX idx_tl (tl_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ employee_team_leaders table verified');

    // 3. Backfill from existing employees.tl_id
    const [existing] = await db.query('SELECT id, tl_id FROM employees WHERE tl_id IS NOT NULL AND tl_id != ""');
    for (const emp of existing) {
      const tlIds = (emp.tl_id || '').split(',').map(s => s.trim()).filter(Boolean);
      for (const tid of tlIds) {
        await db.query(
          'INSERT IGNORE INTO employee_team_leaders (employee_id, tl_id) VALUES (?, ?)',
          [emp.id, tid]
        );
      }
    }
    const [count] = await db.query('SELECT COUNT(*) as cnt FROM employee_team_leaders');
    console.log('✓ employee_team_leaders total rows backfilled:', count[0].cnt);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
