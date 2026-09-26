const fs = require('fs');

let dbJs = fs.readFileSync('app/api/db/db.js', 'utf8');

const tableCreation = `
  await db.execute(\`
    CREATE TABLE IF NOT EXISTS eod_reports (
      id VARCHAR(100) PRIMARY KEY,
      employee_id VARCHAR(50) NOT NULL,
      report_text TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending',
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  \`);
`;

if (!dbJs.includes('CREATE TABLE IF NOT EXISTS eod_reports')) {
  // Insert before checking alreadySeeded
  dbJs = dbJs.replace('// Check if DB was already seeded', tableCreation + '\n  // Check if DB was already seeded');
  fs.writeFileSync('app/api/db/db.js', dbJs);
  console.log('eod_reports table added to db.js');
} else {
  console.log('eod_reports table already exists in db.js');
}
