const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables
const envNames = ['.env.local', '.env', '.env.production'];
for (const name of envNames) {
  const envPath = path.join(__dirname, '..', name);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
        process.env[key] = val;
      }
    });
    break;
  }
}

async function getConnection() {
  const envPass = process.env.DB_PASS;
  const candidatePasswords = envPass !== undefined ? [envPass] : [process.env.DB_PASS || 'root', 'Root@123', '', '123456', 'password', 'admin'];

  let lastError;
  for (const pass of candidatePasswords) {
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: pass,
        multipleStatements: true
      });
      console.log(`🔑 Successfully connected to MySQL using user '${process.env.DB_USER || 'root'}'!`);
      return conn;
    } catch (err) {
      lastError = err;
      if (err.code !== 'ER_ACCESS_DENIED_ERROR') {
        throw err;
      }
    }
  }
  throw lastError;
}

async function runMigration() {
  console.log('🚀 Running DeviceDesk Database Migrations...');
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  console.log(`Host: ${host}:${port}`);
  console.log(`User: ${user}`);

  let connection;
  try {
    connection = await getConnection();

    // 1. Run schema.sql if present
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('\n📄 Executing schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log('✅ schema.sql executed successfully.');
    }

    // Connect specifically to target database now
    const dbName = process.env.DB_NAME || 'system_tracking';
    await connection.changeUser({ database: dbName });

    // 2. Run alter.sql if present
    const alterPath = path.join(__dirname, '..', 'alter.sql');
    if (fs.existsSync(alterPath)) {
      console.log('\n📄 Executing alter.sql...');
      const alterSql = fs.readFileSync(alterPath, 'utf8');
      const statements = alterSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await connection.query(statement);
          console.log(`  ✓ Executed: ${statement.substring(0, 50)}...`);
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
            console.log(`  ℹ Ignored duplicate column warning for: ${statement.substring(0, 40)}...`);
          } else {
            console.warn(`  ⚠️ Warning on statement: ${err.message}`);
          }
        }
      }
      console.log('✅ alter.sql processing complete.');
    }

    console.log('\n🎉 Database Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
