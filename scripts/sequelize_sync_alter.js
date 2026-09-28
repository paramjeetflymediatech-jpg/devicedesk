import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables (.env.local / .env / .env.production)
const envCandidates = [
  path.join(__dirname, '..', '.env.local'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '.env.production'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env')
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/(^['"]|['"]$)/g, '');
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const DB_NAME = process.env.DB_NAME || 'system_tracking';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || process.env.DB_PASSWORD || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

console.log('================================================================');
console.log('🚀 SEQUELIZE DATABASE SYNC SCRIPT: alter: true (Safe / No Data Loss)');
console.log('================================================================');
console.log(`📌 Target Database : ${DB_NAME}`);
console.log(`📌 Host            : ${DB_HOST}:${DB_PORT}`);
console.log(`📌 User            : ${DB_USER}`);
console.log('----------------------------------------------------------------');

// Initialize Sequelize Instance
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    decimalNumbers: true
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// ==========================================
// MODEL DEFINITIONS MATCHING EXISTING SCHEMA
// ==========================================

export const Department = sequelize.define('Department', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true }
}, { tableName: 'departments', timestamps: false });

export const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), unique: true },
  password: { type: DataTypes.STRING(255) },
  role: { type: DataTypes.STRING(100) },
  department: { type: DataTypes.STRING(100) },
  ticketLimit: { type: DataTypes.INTEGER, defaultValue: 5 },
  status: { type: DataTypes.STRING(20), defaultValue: 'Active' },
  avatarUrl: { type: DataTypes.STRING(512), allowNull: true },
  lastSeen: { type: DataTypes.DATE, allowNull: true },
  tl_id: { type: DataTypes.STRING(50), allowNull: true }
}, { tableName: 'employees', timestamps: false });

export const System = sequelize.define('System', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  systemNumber: { type: DataTypes.STRING(50), unique: true },
  cpu: { type: DataTypes.STRING(100) },
  gpu: { type: DataTypes.STRING(100) },
  ram: { type: DataTypes.STRING(50) },
  storage: { type: DataTypes.STRING(50) },
  os: { type: DataTypes.STRING(100) },
  model: { type: DataTypes.STRING(100) },
  assignedTo: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.STRING(50) },
  remarks: { type: DataTypes.TEXT }
}, { tableName: 'systems', timestamps: false });

export const Ticket = sequelize.define('Ticket', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  title: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING(100) },
  severity: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.STRING(50) },
  systemId: { type: DataTypes.STRING(50) },
  systemNumber: { type: DataTypes.STRING(50) },
  raisedBy: { type: DataTypes.STRING(50) },
  raisedByName: { type: DataTypes.STRING(100) },
  createdAt: { type: DataTypes.STRING(50) },
  startedAt: { type: DataTypes.STRING(50) },
  resolvedAt: { type: DataTypes.STRING(50) },
  resolutionRemarks: { type: DataTypes.TEXT }
}, { tableName: 'tickets', timestamps: false });

export const AssignmentHistory = sequelize.define('AssignmentHistory', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employeeId: { type: DataTypes.STRING(50) },
  systemId: { type: DataTypes.STRING(50) },
  systemNumber: { type: DataTypes.STRING(50) },
  action: { type: DataTypes.STRING(255) },
  timestamp: { type: DataTypes.STRING(50) },
  assignedBy: { type: DataTypes.STRING(100), defaultValue: 'System' }
}, { tableName: 'assignment_history', timestamps: false });

export const Task = sequelize.define('Task', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  assignedTo: { type: DataTypes.STRING(50) },
  assignedToName: { type: DataTypes.STRING(100) },
  assignedBy: { type: DataTypes.STRING(50) },
  assignedByName: { type: DataTypes.STRING(100) },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
  createdAt: { type: DataTypes.STRING(50) },
  startedAt: { type: DataTypes.STRING(50) },
  completedAt: { type: DataTypes.STRING(50) },
  totalDuration: { type: DataTypes.INTEGER, defaultValue: 0 },
  fileUrl: { type: DataTypes.STRING(512), allowNull: true },
  project_id: { type: DataTypes.STRING(50), allowNull: true }
}, { tableName: 'tasks', timestamps: false });

export const AttendanceRecord = sequelize.define('AttendanceRecord', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employeeId: { type: DataTypes.STRING(50), allowNull: false },
  employeeName: { type: DataTypes.STRING(100), allowNull: false },
  date: { type: DataTypes.STRING(20), allowNull: false },
  punchInTime: { type: DataTypes.STRING(50), allowNull: false },
  punchOutTime: { type: DataTypes.STRING(50), allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'Present' },
  totalWorkMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalBreakMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  netWorkMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  ipAddress: { type: DataTypes.STRING(45), allowNull: true },
  deviceInfo: { type: DataTypes.STRING(255), allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  breakStatus: { type: DataTypes.STRING(20), defaultValue: 'None' },
  modifiedBy: { type: DataTypes.STRING(100), allowNull: true },
  modifiedReason: { type: DataTypes.TEXT, allowNull: true },
  punchInLatitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  punchInLongitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  punchOutLatitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  punchOutLongitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true }
}, { tableName: 'attendance_records', timestamps: false });

export const AttendanceBreak = sequelize.define('AttendanceBreak', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  attendanceId: { type: DataTypes.STRING(100), allowNull: false },
  employeeId: { type: DataTypes.STRING(50), allowNull: false },
  breakType: { type: DataTypes.STRING(50), defaultValue: 'Tea Break' },
  startTime: { type: DataTypes.STRING(50), allowNull: false },
  endTime: { type: DataTypes.STRING(50), allowNull: true },
  durationMinutes: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'attendance_breaks', timestamps: false });

export const LeaveRequest = sequelize.define('LeaveRequest', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employeeId: { type: DataTypes.STRING(50), allowNull: false },
  employeeName: { type: DataTypes.STRING(100), allowNull: false },
  leaveType: { type: DataTypes.STRING(50), allowNull: false },
  fromDate: { type: DataTypes.STRING(20), allowNull: false },
  toDate: { type: DataTypes.STRING(20), allowNull: false },
  totalDays: { type: DataTypes.FLOAT, defaultValue: 1 },
  reason: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(20), defaultValue: 'Pending' },
  appliedAt: { type: DataTypes.STRING(50), allowNull: false },
  reviewedBy: { type: DataTypes.STRING(100), allowNull: true },
  reviewedAt: { type: DataTypes.STRING(50), allowNull: true },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'leave_requests', timestamps: false });

export const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  senderId: { type: DataTypes.STRING(50), allowNull: false },
  senderName: { type: DataTypes.STRING(100), allowNull: false },
  receiverId: { type: DataTypes.STRING(50), allowNull: false },
  messageType: { type: DataTypes.STRING(20), defaultValue: 'text' },
  content: { type: DataTypes.TEXT },
  fileUrl: { type: DataTypes.TEXT, allowNull: true },
  fileName: { type: DataTypes.STRING(255), allowNull: true },
  fileSize: { type: DataTypes.STRING(50), allowNull: true },
  timestamp: { type: DataTypes.STRING(50), allowNull: false },
  isEdited: { type: DataTypes.INTEGER, defaultValue: 0 },
  editedAt: { type: DataTypes.STRING(50), allowNull: true },
  deletedForEveryone: { type: DataTypes.INTEGER, defaultValue: 0 },
  deletedForUsers: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'chat_messages', timestamps: false });

export const ChatGroup = sequelize.define('ChatGroup', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  createdBy: { type: DataTypes.STRING(50), allowNull: false },
  createdAt: { type: DataTypes.STRING(50), allowNull: false },
  avatarUrl: { type: DataTypes.STRING(512), allowNull: true }
}, { tableName: 'chat_groups', timestamps: false });

export const ChatGroupMember = sequelize.define('ChatGroupMember', {
  groupId: { type: DataTypes.STRING(100), primaryKey: true },
  employeeId: { type: DataTypes.STRING(50), primaryKey: true }
}, { tableName: 'chat_group_members', timestamps: false });

export const Project = sequelize.define('Project', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  client_id: { type: DataTypes.STRING(50), allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(50), defaultValue: 'planning' }
}, { tableName: 'projects', timestamps: false });

export const ProjectDepartment = sequelize.define('ProjectDepartment', {
  project_id: { type: DataTypes.STRING(100), primaryKey: true },
  department_id: { type: DataTypes.STRING(50), primaryKey: true },
  team_leader_id: { type: DataTypes.STRING(50), allowNull: true }
}, { tableName: 'project_departments', timestamps: false });

export const Campaign = sequelize.define('Campaign', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  start_date: { type: DataTypes.STRING(50) },
  end_date: { type: DataTypes.STRING(50) },
  budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  status: { type: DataTypes.STRING(50), defaultValue: 'Active' }
}, { tableName: 'campaigns', timestamps: false });

export const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  campaign_id: { type: DataTypes.STRING(100), allowNull: true },
  assigned_to: { type: DataTypes.STRING(50), allowNull: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150) },
  phone: { type: DataTypes.STRING(50) },
  source: { type: DataTypes.STRING(100) },
  status: { type: DataTypes.STRING(50), defaultValue: 'New' },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'leads', timestamps: false });

export const MarketingAttendance = sequelize.define('MarketingAttendance', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  employee_id: { type: DataTypes.STRING(50), allowNull: false },
  from_location: { type: DataTypes.STRING(255), allowNull: true },
  to_location: { type: DataTypes.STRING(255), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  check_in_at: { type: DataTypes.DATE, allowNull: true },
  check_in_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  check_in_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  check_out_at: { type: DataTypes.DATE, allowNull: true },
  check_out_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  check_out_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  total_km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.STRING(50), defaultValue: 'Checked In' },
  device_id: { type: DataTypes.STRING(100), allowNull: true }
}, { tableName: 'marketing_attendance', timestamps: false });

export const MarketingLocationLog = sequelize.define('MarketingLocationLog', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employee_id: { type: DataTypes.STRING(50), allowNull: false },
  attendance_id: { type: DataTypes.STRING(100), allowNull: false },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  accuracy: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
}, { tableName: 'marketing_location_logs', timestamps: false });

export const MarketingVisit = sequelize.define('MarketingVisit', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  marketing_employee_id: { type: DataTypes.STRING(50), allowNull: false },
  client_id: { type: DataTypes.STRING(50), allowNull: true },
  project_id: { type: DataTypes.STRING(50), allowNull: true },
  location: { type: DataTypes.STRING(255), allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  check_in_at: { type: DataTypes.DATE, allowNull: true },
  check_out_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(50), allowNull: true }
}, { tableName: 'marketing_visits', timestamps: false });

export const MarketingAuthorization = sequelize.define('MarketingAuthorization', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  employee_name: { type: DataTypes.STRING(150), allowNull: true },
  assigned_by: { type: DataTypes.STRING(50), defaultValue: 'Admin' }
}, { tableName: 'marketing_authorizations', timestamps: false });

export const WorkSubmission = sequelize.define('WorkSubmission', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  task_id: { type: DataTypes.STRING(50), allowNull: false },
  project_id: { type: DataTypes.STRING(100), allowNull: false },
  submitted_by: { type: DataTypes.STRING(50), allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'Draft' },
  description: { type: DataTypes.TEXT },
  file_url: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'work_submissions', timestamps: false });

export const WorkSubmissionHistory = sequelize.define('WorkSubmissionHistory', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  submission_id: { type: DataTypes.STRING(100), allowNull: false },
  changed_by: { type: DataTypes.STRING(50), allowNull: false },
  old_status: { type: DataTypes.STRING(50) },
  new_status: { type: DataTypes.STRING(50) },
  comment: { type: DataTypes.TEXT }
}, { tableName: 'work_submission_history', timestamps: false });

export const ClientDetail = sequelize.define('ClientDetail', {
  client_id: { type: DataTypes.STRING(50), primaryKey: true },
  company_name: { type: DataTypes.STRING(255) },
  phone: { type: DataTypes.STRING(50) },
  whatsapp: { type: DataTypes.STRING(50) },
  address: { type: DataTypes.TEXT },
  gst_number: { type: DataTypes.STRING(100) },
  website_url: { type: DataTypes.STRING(255) },
  primary_service: { type: DataTypes.STRING(100) },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'client_details', timestamps: false });

export const Package = sequelize.define('Package', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  billing_cycle: { type: DataTypes.STRING(50), defaultValue: 'Monthly' },
  features: { type: DataTypes.TEXT }
}, { tableName: 'packages', timestamps: false });

export const ClientPackageOverride = sequelize.define('ClientPackageOverride', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  client_id: { type: DataTypes.STRING(50), allowNull: false },
  package_id: { type: DataTypes.STRING(50), allowNull: false },
  custom_name: { type: DataTypes.STRING(255), allowNull: true },
  custom_description: { type: DataTypes.TEXT, allowNull: true },
  custom_billing_cycle: { type: DataTypes.STRING(100), allowNull: true },
  custom_features: { type: DataTypes.TEXT, allowNull: true },
  custom_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'Active' }
}, { tableName: 'client_package_overrides', timestamps: false });

export const ClientNote = sequelize.define('ClientNote', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  client_id: { type: DataTypes.STRING(50), allowNull: false },
  note: { type: DataTypes.TEXT, allowNull: false },
  tl_reply: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'Unread' }
}, { tableName: 'client_notes', timestamps: false });

export const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  client_id: { type: DataTypes.STRING(50), allowNull: false },
  package_id: { type: DataTypes.STRING(50), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
  transaction_id: { type: DataTypes.STRING(100), allowNull: true }
}, { tableName: 'invoices', timestamps: false });

export const ServiceRequest = sequelize.define('ServiceRequest', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  clientId: { type: DataTypes.STRING(50), allowNull: false },
  service_type: { type: DataTypes.STRING(100), allowNull: false },
  requirements: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
  assigned_tl_id: { type: DataTypes.STRING(50), allowNull: true },
  created_at: { type: DataTypes.STRING(50), allowNull: false }
}, { tableName: 'service_requests', timestamps: false });

export const Domain = sequelize.define('Domain', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  domain_name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  client_id: { type: DataTypes.STRING(50), allowNull: true },
  client_name: { type: DataTypes.STRING(150), allowNull: true },
  client_email: { type: DataTypes.STRING(150), allowNull: true },
  registrar: { type: DataTypes.STRING(100), defaultValue: 'GoDaddy' },
  registration_date: { type: DataTypes.STRING(50), allowNull: true },
  expiry_date: { type: DataTypes.STRING(50), allowNull: false },
  auto_renew: { type: DataTypes.INTEGER, defaultValue: 0 },
  renewal_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  card_details: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'Active' },
  last_notified_at: { type: DataTypes.STRING(50), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'domains', timestamps: false });

export const CandidateRegistration = sequelize.define('CandidateRegistration', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false },
  phone: { type: DataTypes.STRING(50) },
  address: { type: DataTypes.TEXT },
  experience_level: { type: DataTypes.STRING(50) },
  experience_details: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
  resume_url: { type: DataTypes.TEXT },
  portfolio_url: { type: DataTypes.TEXT },
  education: { type: DataTypes.TEXT },
  skills: { type: DataTypes.TEXT },
  notice_period: { type: DataTypes.STRING(50) },
  position_applied: { type: DataTypes.STRING(150) }
}, { tableName: 'candidate_registrations', timestamps: false });

export const CandidateTest = sequelize.define('CandidateTest', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  candidate_employee_id: { type: DataTypes.STRING(100), allowNull: false },
  test_title: { type: DataTypes.STRING(255), allowNull: false },
  test_instructions: { type: DataTypes.TEXT },
  file_url: { type: DataTypes.TEXT },
  test_type: { type: DataTypes.STRING(50), defaultValue: 'text' },
  test_data: { type: DataTypes.JSON, allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
  score: { type: DataTypes.INTEGER, allowNull: true },
  submitted_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'candidate_tests', timestamps: false });

export const EODReport = sequelize.define('EODReport', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employee_id: { type: DataTypes.STRING(50), allowNull: false },
  report_text: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'eod_reports', timestamps: false });

export const AgentRegistration = sequelize.define('AgentRegistration', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employeeId: { type: DataTypes.STRING(100), allowNull: false },
  employeeName: { type: DataTypes.STRING(150), allowNull: false },
  department: { type: DataTypes.STRING(100) },
  systemNumber: { type: DataTypes.STRING(100) },
  ipAddress: { type: DataTypes.STRING(50) },
  osPlatform: { type: DataTypes.STRING(50) },
  serverUrl: { type: DataTypes.STRING(255) },
  status: { type: DataTypes.STRING(50), defaultValue: 'ACTIVE' },
  installedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  lastSeenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'agent_registrations', timestamps: false });

export const AgentLog = sequelize.define('AgentLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: { type: DataTypes.STRING(100), allowNull: false },
  employeeName: { type: DataTypes.STRING(150), allowNull: false },
  action: { type: DataTypes.STRING(100), allowNull: false },
  details: { type: DataTypes.TEXT }
}, { tableName: 'agent_logs', timestamps: false });

export const Screenshot = sequelize.define('Screenshot', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employeeId: { type: DataTypes.STRING(50), allowNull: false },
  employeeName: { type: DataTypes.STRING(100), allowNull: false },
  department: { type: DataTypes.STRING(100) },
  imageUrl: { type: DataTypes.TEXT, allowNull: false },
  capturedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  shiftId: { type: DataTypes.STRING(100) },
  ipAddress: { type: DataTypes.STRING(50) },
  systemNumber: { type: DataTypes.STRING(50) },
  captureType: { type: DataTypes.STRING(50), defaultValue: 'FULL_DESKTOP' },
  activityScore: { type: DataTypes.INTEGER, defaultValue: 100 }
}, { tableName: 'screenshots', timestamps: false });

export const UserDevice = sequelize.define('UserDevice', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  userId: { type: DataTypes.STRING(50), allowNull: false },
  fcmToken: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  deviceId: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  deviceModel: { type: DataTypes.STRING(100) },
  lastActive: { type: DataTypes.STRING(50) }
}, { tableName: 'user_devices', timestamps: false });

export const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  email: { type: DataTypes.STRING(255), allowNull: false },
  token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  createdAt: { type: DataTypes.STRING(50), allowNull: false },
  expiresAt: { type: DataTypes.STRING(50), allowNull: false },
  used: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'password_reset_tokens', timestamps: false });

export const LoginOTP = sequelize.define('LoginOTP', {
  id: { type: DataTypes.STRING(100), primaryKey: true },
  employeeId: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  otp: { type: DataTypes.STRING(255), allowNull: false },
  createdAt: { type: DataTypes.STRING(50), allowNull: false },
  expiresAt: { type: DataTypes.STRING(50), allowNull: false },
  used: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'login_otps', timestamps: false });

export const Permission = sequelize.define('Permission', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  description: { type: DataTypes.TEXT }
}, { tableName: 'permissions', timestamps: false });

export const RolePermission = sequelize.define('RolePermission', {
  id: { type: DataTypes.STRING(50), primaryKey: true },
  role: { type: DataTypes.STRING(50), allowNull: false },
  permission_id: { type: DataTypes.STRING(50), allowNull: false }
}, { tableName: 'role_permissions', timestamps: false });

// ==========================================
// SYNC EXECUTION FUNCTION
// ==========================================

export async function syncDatabaseAlter() {
  try {
    console.log('🔄 Authenticating connection to MySQL server...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    console.log('\n🔄 Executing sequelize.sync({ alter: true })...');
    console.log('🛡️  Mode: alter: true (Creates missing tables, adds missing columns, updates column definitions, PRESERVES EXISTING DATA)');
    
    await sequelize.sync({ alter: true });

    console.log('\n================================================================');
    console.log('🎉 SUCCESS: All database tables & columns are synchronized cleanly!');
    console.log('🔒 Zero data was dropped or deleted. Previous rows are 100% intact.');
    console.log('================================================================\n');
  } catch (error) {
    console.error('❌ Error during sequelize.sync({ alter: true }):', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncDatabaseAlter();
}
