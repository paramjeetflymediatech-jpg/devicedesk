const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('==========================================================');
  console.log('📦 DeviceDesk Safe Database Migration Tool (Non-Destructive)');
  console.log('==========================================================');

  const dbName = process.env.DB_NAME || 'devicedesk';
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || 'root',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true
  };

  console.log(`Connecting to MySQL server at ${config.host}:${config.port}...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server successfully!\n');

    // Create database if missing
    console.log(`--> Ensuring database [${dbName}] exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);
    console.log(`✅ Using database [${dbName}]\n`);

    // 1. Table: agent_registrations
    console.log('--> Checking/Creating table: agent_registrations...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_registrations (
        id VARCHAR(100) PRIMARY KEY,
        employeeId VARCHAR(100) NOT NULL,
        employeeName VARCHAR(150) NOT NULL,
        department VARCHAR(100),
        systemNumber VARCHAR(100),
        ipAddress VARCHAR(50),
        osPlatform VARCHAR(50),
        serverUrl VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        installedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastSeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_emp_sys (employeeId, systemNumber)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Table: screenshots
    console.log('--> Checking/Creating table: screenshots...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id VARCHAR(100) PRIMARY KEY,
        employeeId VARCHAR(50) NOT NULL,
        employeeName VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        imageUrl TEXT NOT NULL,
        capturedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        shiftId VARCHAR(100),
        ipAddress VARCHAR(50),
        systemNumber VARCHAR(50),
        captureType VARCHAR(50) DEFAULT 'FULL_DESKTOP',
        activityScore INT DEFAULT 100,
        INDEX idx_emp (employeeId),
        INDEX idx_capturedAt (capturedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist on screenshots
    const alterScreenshots = [
      `ALTER TABLE screenshots ADD COLUMN captureType VARCHAR(50) DEFAULT 'FULL_DESKTOP'`,
      `ALTER TABLE screenshots ADD COLUMN activityScore INT DEFAULT 100`,
      `ALTER TABLE screenshots ADD COLUMN systemNumber VARCHAR(50)`
    ];
    for (const statement of alterScreenshots) {
      try { await connection.query(statement); } catch (e) { /* column exists */ }
    }

    // 3. Table: employees
    console.log('--> Checking/Creating table: employees...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        department VARCHAR(100) DEFAULT 'General',
        designation VARCHAR(100) DEFAULT 'Employee',
        role VARCHAR(50) DEFAULT 'Employee',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        ticketLimit INT DEFAULT 5,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Table: attendance
    console.log('--> Checking/Creating table: attendance...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(100) PRIMARY KEY,
        employeeId VARCHAR(100) NOT NULL,
        employeeName VARCHAR(150),
        date DATE NOT NULL,
        punchIn TIMESTAMP NULL,
        punchOut TIMESTAMP NULL,
        status VARCHAR(50) DEFAULT 'PRESENT',
        workHours DECIMAL(5,2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_emp_date (employeeId, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Table: devices
    console.log('--> Checking/Creating table: devices...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id VARCHAR(100) PRIMARY KEY,
        systemTag VARCHAR(100) NOT NULL,
        assignedTo VARCHAR(100),
        employeeName VARCHAR(150),
        type VARCHAR(50) DEFAULT 'Desktop',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        ipAddress VARCHAR(50),
        lastActive TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Table: password_reset_tokens
    console.log('--> Checking/Creating table: password_reset_tokens...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(255) NOT NULL,
        used TINYINT DEFAULT 0,
        expiresAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('\n==========================================================');
    console.log(`🎉 SUCCESS: All database tables & schema alterations applied cleanly to database [${dbName}]!`);
    console.log('Zero live data was deleted. All existing records preserved intact.');
    console.log('==========================================================');

  } catch (err) {
    console.error('\n❌ Migration Failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
