import fs from 'fs';

const schemaPath = 'd:/devicedesk/schema.sql';
let content = fs.readFileSync(schemaPath, 'utf8');

const newTables = `
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
`;

if (!content.includes('CREATE TABLE IF NOT EXISTS permissions')) {
  content = content + "\n\n" + newTables;
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('SQL Schema updated successfully for devicedesk.');
} else {
  console.log('Schema already updated.');
}
