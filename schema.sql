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

-- 7. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(100) PRIMARY KEY,
  employeeId VARCHAR(50) NOT NULL,
  employeeName VARCHAR(100) NOT NULL,
  date VARCHAR(20) NOT NULL,
  punchInTime VARCHAR(50) NOT NULL,
  punchOutTime VARCHAR(50) DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'Present',
  totalWorkMinutes INT DEFAULT 0,
  totalBreakMinutes INT DEFAULT 0,
  netWorkMinutes INT DEFAULT 0,
  ipAddress VARCHAR(45) DEFAULT NULL,
  deviceInfo VARCHAR(255) DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  breakStatus VARCHAR(20) DEFAULT 'None',
  modifiedBy VARCHAR(100) DEFAULT NULL,
  modifiedReason TEXT DEFAULT NULL,
  UNIQUE KEY uk_emp_date (employeeId, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Attendance Breaks Table
CREATE TABLE IF NOT EXISTS attendance_breaks (
  id VARCHAR(100) PRIMARY KEY,
  attendanceId VARCHAR(100) NOT NULL,
  employeeId VARCHAR(50) NOT NULL,
  breakType VARCHAR(50) DEFAULT 'Tea Break',
  startTime VARCHAR(50) NOT NULL,
  endTime VARCHAR(50) DEFAULT NULL,
  durationMinutes INT DEFAULT 0,
  INDEX idx_att_id (attendanceId),
  INDEX idx_emp_id (employeeId)
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

-- 7. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignedTo VARCHAR(50),
  assignedToName VARCHAR(100),
  assignedBy VARCHAR(50),
  assignedByName VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Pending',
  createdAt VARCHAR(50),
  startedAt VARCHAR(50),
  completedAt VARCHAR(50),
  totalDuration INT DEFAULT 0,
  fileUrl VARCHAR(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. User Devices Table (FCM Tokens)
CREATE TABLE IF NOT EXISTS user_devices (
  id VARCHAR(100) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL,
  fcmToken VARCHAR(255) NOT NULL UNIQUE,
  deviceId VARCHAR(100) NOT NULL UNIQUE,
  deviceModel VARCHAR(100),
  lastActive VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  createdAt VARCHAR(50) NOT NULL,
  expiresAt VARCHAR(50) NOT NULL,
  used INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(100) PRIMARY KEY,
  senderId VARCHAR(50) NOT NULL,
  senderName VARCHAR(100) NOT NULL,
  receiverId VARCHAR(50) NOT NULL,
  messageType VARCHAR(20) DEFAULT 'text',
  content TEXT,
  fileUrl TEXT DEFAULT NULL,
  fileName VARCHAR(255) DEFAULT NULL,
  fileSize VARCHAR(50) DEFAULT NULL,
  timestamp VARCHAR(50) NOT NULL,
  INDEX idx_chat_sender (senderId),
  INDEX idx_chat_receiver (receiverId),
  INDEX idx_chat_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Chat Groups Table
CREATE TABLE IF NOT EXISTS chat_groups (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  createdBy VARCHAR(50) NOT NULL,
  createdAt VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Chat Group Members Table
CREATE TABLE IF NOT EXISTS chat_group_members (
  groupId VARCHAR(100) NOT NULL,
  employeeId VARCHAR(50) NOT NULL,
  PRIMARY KEY (groupId, employeeId),
  FOREIGN KEY (groupId) REFERENCES chat_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Screenshots Activity Logger Table
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
-- 14. Support Enquiries Table
CREATE TABLE IF NOT EXISTS support_enquiries (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  category VARCHAR(50) DEFAULT 'General',
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at VARCHAR(50) NOT NULL,
  ipAddress VARCHAR(45) DEFAULT NULL,
  INDEX idx_support_email (email),
  INDEX idx_support_status (status),
  INDEX idx_support_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;




-- Table: permissions
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id VARCHAR(50) PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission_id VARCHAR(50) NOT NULL,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_role_permission (role, permission_id)
);

-- Table: projects
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- FOREIGN KEY (client_id) REFERENCES clients/employees(id) -- to be linked later based on unified user table
);

-- Table: project_departments
CREATE TABLE IF NOT EXISTS project_departments (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  department_id VARCHAR(50) NOT NULL,
  team_leader_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
  -- FOREIGN KEY (team_leader_id) REFERENCES employees(id)
);

-- Table: project_team_members
CREATE TABLE IF NOT EXISTS project_team_members (
  id VARCHAR(50) PRIMARY KEY,
  project_department_id VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_department_id) REFERENCES project_departments(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_dept_member (project_department_id, employee_id)
);

-- Table: marketing_attendance
CREATE TABLE IF NOT EXISTS marketing_attendance (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  check_in_at TIMESTAMP NULL,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out_at TIMESTAMP NULL,
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  total_km DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Table: marketing_location_logs
CREATE TABLE IF NOT EXISTS marketing_location_logs (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  attendance_id VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (attendance_id) REFERENCES marketing_attendance(id) ON DELETE CASCADE
);

-- Table: marketing_visits
CREATE TABLE IF NOT EXISTS marketing_visits (
  id VARCHAR(50) PRIMARY KEY,
  marketing_employee_id VARCHAR(50) NOT NULL,
  client_id VARCHAR(50),
  project_id VARCHAR(50),
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  check_in_at TIMESTAMP NULL,
  check_out_at TIMESTAMP NULL,
  notes TEXT,
  status VARCHAR(50),
  FOREIGN KEY (marketing_employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Table: campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10, 2),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: leads
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(50),
  campaign_id VARCHAR(50),
  assigned_to VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(150),
  source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'New',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
);

-- Table: work_submissions
CREATE TABLE IF NOT EXISTS work_submissions (
  id VARCHAR(50) PRIMARY KEY,
  task_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  submitted_by VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Draft',
  description TEXT,
  file_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES employees(id) ON DELETE CASCADE
);

-- Table: work_submission_history
CREATE TABLE IF NOT EXISTS work_submission_history (
  id VARCHAR(50) PRIMARY KEY,
  submission_id VARCHAR(50) NOT NULL,
  changed_by VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES work_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES employees(id) ON DELETE CASCADE
);
