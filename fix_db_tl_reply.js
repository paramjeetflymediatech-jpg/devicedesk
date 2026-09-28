const fs = require('fs');
let c = fs.readFileSync('app/api/db/db.js', 'utf8');

// Replace the CREATE TABLE
const oldTable = `CREATE TABLE IF NOT EXISTS client_notes (
      id VARCHAR(100) PRIMARY KEY,
      client_id VARCHAR(50) NOT NULL,
      note TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Unread',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const newTable = `CREATE TABLE IF NOT EXISTS client_notes (
      id VARCHAR(100) PRIMARY KEY,
      client_id VARCHAR(50) NOT NULL,
      note TEXT NOT NULL,
      tl_reply TEXT DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'Unread',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

c = c.replace(oldTable, newTable);

// Add the ALTER TABLE
const alterStatement = `
  try {
    await db.execute(\`ALTER TABLE client_notes ADD COLUMN tl_reply TEXT DEFAULT NULL\`);
  } catch (err) {}
`;

if (!c.includes('ALTER TABLE client_notes ADD COLUMN tl_reply')) {
  c = c.replace('// Alter tables if columns do not exist', '// Alter tables if columns do not exist' + alterStatement);
}

fs.writeFileSync('app/api/db/db.js', c);
console.log('Fixed client_notes tl_reply');
