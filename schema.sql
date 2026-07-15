-- DeviceDesk Database Schema and Seed Migration Script
-- Fly Media Technology System Tracking

CREATE DATABASE IF NOT EXISTS system_tracking;
USE system_tracking;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Employees Table
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(100),
  department VARCHAR(100),
  ticketLimit INT DEFAULT 5
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Systems Table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tickets Table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Assignment History Table
CREATE TABLE IF NOT EXISTS assignment_history (
  id VARCHAR(100) PRIMARY KEY,
  employeeId VARCHAR(50),
  systemId VARCHAR(50),
  systemNumber VARCHAR(50),
  action VARCHAR(255),
  timestamp VARCHAR(50),
  assignedBy VARCHAR(100) DEFAULT 'System'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Sent Emails Table
CREATE TABLE IF NOT EXISTS sent_emails (
  id VARCHAR(100) PRIMARY KEY,
  to_address VARCHAR(150),
  subject VARCHAR(255),
  body TEXT,
  timestamp VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- SEED DATA
-- ========================================================

-- Seed Departments
INSERT IGNORE INTO departments (id, name) VALUES 
('dept1', 'Development'),
('dept2', 'Operations'),
('dept3', 'Design'),
('dept4', 'QA'),
('dept5', 'IT Support'),
('dept6', 'Executive');

-- Seed Employees
INSERT IGNORE INTO employees (id, name, email, password, role, department, ticketLimit) VALUES
('emp1', 'Pravi Sir', 'pravi@yopmail.com', 'pravi123', 'Management', 'Executive', 20),
('emp2', 'Sarabjot', 'sarabjot@yopmail.com', 'sarabjot123', 'Team Member', 'Operations', 5),
('emp3', 'Harsh', 'harsh@yopmail.com', 'harsh123', 'Team Member', 'Operations', 5),
('emp4', 'Arvinder', 'arvinder@yopmail.com', 'arvinder123', 'Team Member', 'Operations', 5),
('emp5', 'Tanmay', 'tanmay@yopmail.com', 'tanmay123', 'IT Engineer', 'IT Support', 10),
('emp6', 'Navraj', 'navraj@yopmail.com', 'navraj123', 'Team Member', 'Development', 5),
('emp7', 'Armaan', 'armaan@yopmail.com', 'armaan123', 'Team Member', 'Development', 5),
('emp8', 'Pardeep', 'pardeep@yopmail.com', 'pardeep123', 'Team Member', 'Design', 5),
('emp9', 'Harpreet', 'harpreet@yopmail.com', 'harpreet123', 'Team Member', 'QA', 5),
('emp10', 'Ikvak', 'ikvak@yopmail.com', 'ikvak123', 'Team Member', 'Development', 5),
('emp11', 'Sharad', 'sharad@yopmail.com', 'sharad123', 'Team Member', 'Design', 5),
('emp12', 'Parvani', 'parvani@yopmail.com', 'parvani123', 'Team Member', 'Operations', 5),
('emp13', 'Jaskirat', 'jaskirat@yopmail.com', 'jaskirat123', 'Team Member', 'Development', 5),
('emp14', 'Aman', 'aman@yopmail.com', 'aman123', 'Team Member', 'Development', 5),
('emp15', 'Rohit', 'rohit@yopmail.com', 'rohit123', 'Team Member', 'QA', 5),
('emp16', 'Simran', 'simran@yopmail.com', 'simran123', 'Team Member', 'Design', 5),
('emp17', 'Karan', 'karan@yopmail.com', 'karan123', 'IT Engineer', 'IT Support', 10);

-- Seed Systems
INSERT IGNORE INTO systems (id, systemNumber, cpu, ram, storage, os, model, assignedTo, status, remarks) VALUES
('sys11', 'SN11', 'Intel Core i3-4330 @ 3.50 GHz', '16 GB DDR3', '224 GB SSD', 'Windows 10 Home (64-bit)', 'H81M-K PRO', 'emp1', 'Active', 'Handwritten: 8GB, 4GB notes'),
('sys12', 'SN12', 'AMD Ryzen 5 3600X', '24 GB', '466 GB SSD', 'Windows 11 Pro', 'A520M KV2', 'emp2', 'Active', 'Handwritten: 1 month repair date'),
('sys13', 'SN13', 'Intel Core i5-12400F (12th Gen)', '32 GB DDR4', '823 GB SSD', 'Windows 11 Pro', 'System Product Name', 'emp3', 'Active', 'Handwritten: 8GB note'),
('sys14', 'SN14', 'Apple Mac mini M4', '16 GB Unified', '256 GB SSD', 'macOS Sequoia', 'Mac mini M4', 'emp4', 'Active', 'Handwritten: 8GB note'),
('sys15', 'SN15', 'Intel Core i5-12400F (12th Gen)', '32 GB DDR4', '1.03 TB SSD', 'Windows 11 Pro (64-bit)', 'System Product Name', 'emp5', 'Active', 'Handwritten: 8GB note'),
('sys16', 'SN16', 'Intel Core i5-14400F @ 2.50 GHz', '16 GB', '238 GB SSD', 'Windows 11 Pro', 'MSI MS-7D48', 'emp6', 'Active', 'Shared system: Navraj & Armaan'),
('sys17', 'SN17', 'Intel Core i5-4590S', '8 GB', '118 GB SSD', 'Windows 10 Pro', 'Generic PC', 'emp8', 'Active', 'Design PC'),
('sys18', 'SN18', 'AMD Ryzen 5 5600G', '16 GB', '465 GB SSD', 'Windows 11 Pro', 'Generic PC', 'emp9', 'Active', 'QA PC'),
('sys19', 'SN19', 'Intel Core i7-10700', '16 GB', '512 GB SSD', 'Windows 11 Pro', 'HP ProDesk 600 G6', 'emp10', 'Active', 'Dev PC'),
('sys20', 'SN20', 'Apple iMac 21.5"', '8 GB', '1 TB HDD', 'macOS Monterey', 'iMac 2017', 'emp11', 'Active', 'Design Mac'),
('sys21', 'SN21', 'Intel Core i3-4150', '8 GB', '119 GB SSD', 'Windows 11 (64-bit)', 'H81M-K PRO', 'emp12', 'Active', ''),
('sys22', 'SN22', 'Intel Core i5-4570T', '16 GB', '120 GB SSD', 'Ubuntu 24.04.4 LTS', 'MSI MS-7817', 'emp13', 'Active', '');

-- Seed Tickets
INSERT IGNORE INTO tickets (id, title, description, category, severity, status, systemId, systemNumber, raisedBy, raisedByName, createdAt, startedAt, resolvedAt, resolutionRemarks) VALUES
('t1', 'RAM Upgrade Request', 'System runs slow when compiling code. Requesting RAM upgrade to 32GB.', 'RAM/Speed', 'High', 'Resolved', 'sys15', 'SN15', 'emp5', 'Tanmay', '2026-07-15T11:00:00.000Z', '2026-07-15T11:30:00.000Z', '2026-07-15T12:00:00.000Z', 'Upgraded RAM to 32GB DDR4 successfully. Tested and verified.'),
('t2', 'Screen Flickering', 'Screen flickering issue observed during video rendering.', 'Hardware', 'Medium', 'In Progress', 'sys12', 'SN12', 'emp2', 'Sarabjot', '2026-07-15T13:30:00.000Z', '2026-07-15T13:48:00.000Z', NULL, NULL);

-- Seed Assignment History
INSERT IGNORE INTO assignment_history (id, employeeId, systemId, systemNumber, action, timestamp, assignedBy) VALUES
('log_seed_0', 'emp1', 'sys11', 'SN11', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_1', 'emp2', 'sys12', 'SN12', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_2', 'emp3', 'sys13', 'SN13', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_3', 'emp4', 'sys14', 'SN14', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_4', 'emp5', 'sys15', 'SN15', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_5', 'emp6', 'sys16', 'SN16', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_6', 'emp8', 'sys17', 'SN17', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_7', 'emp9', 'sys18', 'SN18', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_8', 'emp10', 'sys19', 'SN19', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_9', 'emp11', 'sys20', 'SN20', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_10', 'emp12', 'sys21', 'SN21', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System'),
('log_seed_11', 'emp13', 'sys22', 'SN22', 'Assigned (Initial Seed)', '2026-06-15T08:49:52.506Z', 'System');
