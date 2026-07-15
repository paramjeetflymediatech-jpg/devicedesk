// DeviceDesk Database and State Store
import { initialSystems, initialEmployees, initialTickets, initialDepartments } from './data.js';
import { sendEmail } from './utils/emailHandler.js';

// Keys for LocalStorage
const SYSTEMS_KEY = 'devicedesk_systems';
const EMPLOYEES_KEY = 'devicedesk_employees';
const TICKETS_KEY = 'devicedesk_tickets';
const SOUND_SETTING_KEY = 'devicedesk_sound_enabled';
const ASSIGNMENT_HISTORY_KEY = 'devicedesk_assignment_history';
const DEPARTMENTS_KEY = 'devicedesk_departments';

// Client-side local data cache
export let dbCache = {
  systems: [],
  employees: [],
  tickets: [],
  assignment_history: [],
  departments: [],
  sent_emails: []
};

// Post updates to server-side JSON database in the background
async function postToServer(action, data) {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, data })
    });
  } catch (err) {
    console.error(`Failed to post action ${action} to server db:`, err);
  }
}

// Background sync from MySQL database via /api/db
export async function syncWithServer() {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/db');
    const serverDb = await res.json();
    
    dbCache.systems = serverDb.systems || [];
    dbCache.employees = serverDb.employees || [];
    dbCache.tickets = serverDb.tickets || [];
    dbCache.assignment_history = serverDb.assignment_history || [];
    dbCache.departments = serverDb.departments || [];
    dbCache.sent_emails = serverDb.sent_emails || [];

    // Persist to local storage as browser local backup cache
    localStorage.setItem(SYSTEMS_KEY, JSON.stringify(dbCache.systems));
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(dbCache.employees));
    localStorage.setItem(TICKETS_KEY, JSON.stringify(dbCache.tickets));
    localStorage.setItem(ASSIGNMENT_HISTORY_KEY, JSON.stringify(dbCache.assignment_history));
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(dbCache.departments));
    localStorage.setItem('devicedesk_sent_emails', JSON.stringify(dbCache.sent_emails));

    // Dispatch global event so active client components refresh their state
    window.dispatchEvent(new CustomEvent('devicedesk_db_synced'));
  } catch (err) {
    console.error('Failed to sync database with server:', err);
  }
}

// Populate local cache from localStorage immediately on startup
if (typeof window !== 'undefined') {
  // Version stamp — bump this whenever seed data changes significantly
  const SEED_VERSION = 'v2_yopmail';
  const storedVersion = localStorage.getItem('devicedesk_seed_version');

  if (storedVersion !== SEED_VERSION) {
    // Clear all cached data so server sync re-seeds fresh
    localStorage.removeItem(SYSTEMS_KEY);
    localStorage.removeItem(EMPLOYEES_KEY);
    localStorage.removeItem(TICKETS_KEY);
    localStorage.removeItem(ASSIGNMENT_HISTORY_KEY);
    localStorage.removeItem(DEPARTMENTS_KEY);
    localStorage.removeItem('devicedesk_sent_emails');
    localStorage.setItem('devicedesk_seed_version', SEED_VERSION);
  }

  // If local storage is still empty after version clear, seed from JS data
  if (!localStorage.getItem(SYSTEMS_KEY)) {
    localStorage.setItem(SYSTEMS_KEY, JSON.stringify(initialSystems));
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(initialEmployees));
    localStorage.setItem(TICKETS_KEY, JSON.stringify(initialTickets));
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(initialDepartments));
    localStorage.setItem(SOUND_SETTING_KEY, 'true');
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
    localStorage.setItem(ASSIGNMENT_HISTORY_KEY, JSON.stringify(initialHistory));
  }

  dbCache.systems = JSON.parse(localStorage.getItem(SYSTEMS_KEY) || '[]');
  dbCache.employees = JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
  dbCache.tickets = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]');
  dbCache.assignment_history = JSON.parse(localStorage.getItem(ASSIGNMENT_HISTORY_KEY) || '[]');
  dbCache.departments = JSON.parse(localStorage.getItem(DEPARTMENTS_KEY) || '[]');
  dbCache.sent_emails = JSON.parse(localStorage.getItem('devicedesk_sent_emails') || '[]');

  // Launch server sync in background
  syncWithServer();
}

export function initializeDB(forceReset = false) {
  if (typeof window === 'undefined') return false;
  if (forceReset || !localStorage.getItem(SYSTEMS_KEY)) {
    localStorage.setItem(SYSTEMS_KEY, JSON.stringify(initialSystems));
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(initialEmployees));
    localStorage.setItem(TICKETS_KEY, JSON.stringify(initialTickets));
    localStorage.setItem(SOUND_SETTING_KEY, 'true');
    
    // Seed initial assignments in history
    const initialHistory = initialSystems
      .filter(s => s.assignedTo)
      .map((s, idx) => ({
        id: 'log_seed_' + idx,
        employeeId: s.assignedTo,
        systemId: s.id,
        systemNumber: s.systemNumber,
        action: 'Assigned (Initial Seed)',
        timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() // 30 days ago
      }));
    localStorage.setItem(ASSIGNMENT_HISTORY_KEY, JSON.stringify(initialHistory));
    return true;
  }
  return false;
}

// Getters
export function getSystems() {
  if (typeof window === 'undefined') return initialSystems;
  return dbCache.systems || [];
}

export function getEmployees() {
  if (typeof window === 'undefined') return initialEmployees;
  const list = dbCache.employees || [];
  let updated = false;
  const mapped = list.map(e => {
    let modified = false;
    if (!e.email) {
      const firstName = e.name ? e.name.split(' ')[0].toLowerCase() : 'employee';
      e.email = firstName + '@devicedesk.com';
      modified = true;
    }
    if (!e.password) {
      const firstName = e.name ? e.name.split(' ')[0].toLowerCase() : 'employee';
      e.password = firstName + '123';
      modified = true;
    }
    if (e.ticketLimit === undefined) {
      e.ticketLimit = 5;
      modified = true;
    }
    if (modified) updated = true;
    return e;
  });
  if (updated) {
    saveEmployees(mapped);
  }
  return mapped;
}

export function getTickets() {
  if (typeof window === 'undefined') return initialTickets;
  return dbCache.tickets || [];
}

export function getAssignmentHistory() {
  if (typeof window === 'undefined') return [];
  return dbCache.assignment_history || [];
}

export function getDepartments() {
  if (typeof window === 'undefined') return initialDepartments;
  return dbCache.departments || [];
}

export function addDepartment(name) {
  const departments = getDepartments();
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (departments.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) {
    return null;
  }
  const newDept = {
    id: 'dept_' + Date.now(),
    name: trimmed
  };
  departments.push(newDept);
  saveDepartments(departments);
  return newDept;
}

export function deleteDepartment(id) {
  const departments = getDepartments();
  const filtered = departments.filter(d => d.id !== id);
  saveDepartments(filtered);
  return true;
}

export function getSentEmails() {
  if (typeof window === 'undefined') return [];
  return dbCache.sent_emails || [];
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_SETTING_KEY) !== 'false';
}

export function setSoundEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_SETTING_KEY, String(enabled));
}

// Setters
function saveSystems(systems) {
  if (typeof window === 'undefined') return;
  dbCache.systems = systems;
  localStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
  postToServer('saveSystems', systems);
}

function saveEmployees(employees) {
  if (typeof window === 'undefined') return;
  dbCache.employees = employees;
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  postToServer('saveEmployees', employees);
}

function saveTickets(tickets) {
  if (typeof window === 'undefined') return;
  dbCache.tickets = tickets;
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  postToServer('saveTickets', tickets);
}

function saveAssignmentHistory(history) {
  if (typeof window === 'undefined') return;
  dbCache.assignment_history = history;
  localStorage.setItem(ASSIGNMENT_HISTORY_KEY, JSON.stringify(history));
  postToServer('saveAssignmentHistory', history);
}

function saveSentEmails(emails) {
  if (typeof window === 'undefined') return;
  dbCache.sent_emails = emails;
  localStorage.setItem('devicedesk_sent_emails', JSON.stringify(emails));
  postToServer('saveEmails', emails);
}

function saveDepartments(departments) {
  if (typeof window === 'undefined') return;
  dbCache.departments = departments;
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
  postToServer('saveDepartments', departments);
}

// Hardware Inventory Operations
export function addSystem(system) {
  const systems = getSystems();
  const newSystem = {
    id: 'sys_' + Date.now(),
    systemNumber: system.systemNumber || `SN${systems.length + 11}`,
    cpu: system.cpu || 'Unknown CPU',
    ram: system.ram || '8 GB',
    storage: system.storage || '256 GB SSD',
    os: system.os || 'Windows 11 Pro',
    model: system.model || 'Generic PC',
    assignedTo: system.assignedTo || null,
    status: system.status || 'Active',
    remarks: system.remarks || ''
  };
  systems.push(newSystem);
  saveSystems(systems);
  return newSystem;
}

export function updateSystem(updatedSys) {
  const systems = getSystems();
  const index = systems.findIndex(s => s.id === updatedSys.id);
  if (index !== -1) {
    systems[index] = { ...systems[index], ...updatedSys };
    saveSystems(systems);
    return true;
  }
  return false;
}



export function logAssignmentChange(employeeId, systemId, systemNumber, action, assignedBy = 'System') {
  const history = getAssignmentHistory();
  const entry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    employeeId,
    systemId,
    systemNumber,
    action, // 'Assigned' or 'Unassigned'
    timestamp: new Date().toISOString(),
    assignedBy
  };
  history.push(entry);
  saveAssignmentHistory(history);
}

export function deleteSystem(systemId) {
  const systems = getSystems();
  const sys = systems.find(s => s.id === systemId);
  if (sys && sys.assignedTo) {
    logAssignmentChange(sys.assignedTo, sys.id, sys.systemNumber, 'Unassigned due to system deletion');
  }
  const filtered = systems.filter(s => s.id !== systemId);
  saveSystems(filtered);
}

// Employee Operations
export function addEmployee(name, email, password, role, department, ticketLimit = 5) {
  const employees = getEmployees();
  const newEmp = {
    id: 'emp_' + Date.now(),
    name,
    email: email || (name.split(' ')[0].toLowerCase() + '@devicedesk.com'),
    password: password || (name.split(' ')[0].toLowerCase() + '123'),
    role: role || 'Team Member',
    department: department || 'General',
    ticketLimit: ticketLimit
  };
  employees.push(newEmp);
  saveEmployees(employees);

  // Send mock email
  sendMockEmail(
    newEmp.email,
    'Welcome to DeviceDesk!',
    `Hello ${newEmp.name},\n\nYour account has been successfully created on DeviceDesk.\n\nUsername: ${newEmp.name}\nEmail: ${newEmp.email}\nDefault Password: ${newEmp.password}\nRole: ${newEmp.role}\nDepartment: ${newEmp.department}\n\nBest Regards,\nIT Support Team`
  );

  return newEmp;
}

export function removeEmployee(employeeId) {
  const employees = getEmployees();
  const filtered = employees.filter(e => e.id !== employeeId);
  saveEmployees(filtered);

  // Unassign systems assigned to this employee
  const systems = getSystems();
  let systemsUpdated = false;
  systems.forEach(s => {
    if (s.assignedTo === employeeId) {
      logAssignmentChange(employeeId, s.id, s.systemNumber, 'Unassigned due to employee removal');
      s.assignedTo = null;
      systemsUpdated = true;
    }
  });
  if (systemsUpdated) {
    saveSystems(systems);
  }
  return true;
}

export function assignSystemToEmployee(systemId, employeeId, assignedBy = 'System') {
  const systems = getSystems();
  const index = systems.findIndex(s => s.id === systemId);
  if (index !== -1) {
    const sys = systems[index];
    const oldAssignee = sys.assignedTo;

    // Unassign this employee from any other system first
    if (employeeId) {
      systems.forEach(s => {
        if (s.assignedTo === employeeId) {
          logAssignmentChange(employeeId, s.id, s.systemNumber, 'Unassigned', assignedBy);
          s.assignedTo = null;
        }
      });
    }

    if (oldAssignee && oldAssignee !== employeeId) {
      logAssignmentChange(oldAssignee, sys.id, sys.systemNumber, 'Unassigned', assignedBy);
    }

    sys.assignedTo = employeeId;
    if (employeeId) {
      logAssignmentChange(employeeId, sys.id, sys.systemNumber, 'Assigned', assignedBy);
    }

    saveSystems(systems);
    return true;
  }
  return false;
}

export function findEmployeeByCredentials(name, password) {
  const employees = getEmployees();
  return employees.find(e => e.name === name && e.password === password) || null;
}

export function isAdminCredentials(username, password) {
  // Simple hard‑coded admin credentials for demo
  return username === 'admin' && password === 'admin123';
}

export function createTicket(employeeId, systemId, category, description, severity) {
  const tickets = getTickets();
  const newTicket = {
    id: 't_' + Date.now(),
    systemId,
    employeeId,
    category,
    description,
    severity: severity || 'Medium', // Low, Medium, High, Critical
    status: 'Open', // Open, In Progress, Resolved
    createdAt: new Date().toISOString(),
    startedAt: null,
    resolvedAt: null,
    notes: ''
  };
  tickets.push(newTicket);
  saveTickets(tickets);
  return newTicket;
}

export function startTicketWork(ticketId) {
  const tickets = getTickets();
  const index = tickets.findIndex(t => t.id === ticketId);
  if (index !== -1 && tickets[index].status === 'Open') {
    tickets[index].status = 'In Progress';
    tickets[index].startedAt = new Date().toISOString();
    saveTickets(tickets);
    return tickets[index];
  }
  return null;
}

export function resolveTicket(ticketId, notes = '') {
  const tickets = getTickets();
  const index = tickets.findIndex(t => t.id === ticketId);
  if (index !== -1 && tickets[index].status !== 'Resolved') {
    const ticket = tickets[index];
    ticket.status = 'Resolved';
    ticket.resolvedAt = new Date().toISOString();
    ticket.notes = notes;
    if (!ticket.startedAt) {
      ticket.startedAt = ticket.createdAt; // fallback if marked resolved directly
    }
    saveTickets(tickets);
    return ticket;
  }
  return null;
}

// Time Analytics Helpers
export function calculateDuration(startStr, endStr) {
  if (!startStr || !endStr) return 0; // returns milliseconds
  return new Date(endStr).getTime() - new Date(startStr).getTime();
}

export function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let str = '';
  if (hours > 0) str += `${hours}h `;
  if (minutes > 0 || hours > 0) str += `${minutes}m `;
  str += `${seconds}s`;
  return str;
}

export function getTicketTimings(ticket) {
  const now = new Date().toISOString();
  
  // 1. Response Time: Created -> Started
  const responseTime = ticket.startedAt 
    ? calculateDuration(ticket.createdAt, ticket.startedAt)
    : calculateDuration(ticket.createdAt, now);
    
  // 2. Resolution Work Time: Started -> Resolved
  let resolutionTime = 0;
  if (ticket.startedAt) {
    resolutionTime = ticket.resolvedAt
      ? calculateDuration(ticket.startedAt, ticket.resolvedAt)
      : calculateDuration(ticket.startedAt, now);
  }

  // 3. Total Downtime: Created -> Resolved
  const totalDowntime = ticket.resolvedAt
    ? calculateDuration(ticket.createdAt, ticket.resolvedAt)
    : calculateDuration(ticket.createdAt, now);

  return {
    responseTime,
    resolutionTime,
    totalDowntime,
    responseTimeStr: formatDuration(responseTime),
    resolutionTimeStr: formatDuration(resolutionTime),
    totalDowntimeStr: formatDuration(totalDowntime)
  };
}

export function getStats() {
  const systems = getSystems();
  const tickets = getTickets();
  
  const totalSystems = systems.length;
  const activeAssignments = systems.filter(s => s.assignedTo).length;
  
  const openTickets = tickets.filter(t => t.status === 'Open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
  const pendingComplaints = openTickets + inProgressTickets;
  
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved');
  
  let totalWorkMs = 0;
  resolvedTickets.forEach(t => {
    if (t.startedAt && t.resolvedAt) {
      totalWorkMs += calculateDuration(t.startedAt, t.resolvedAt);
    }
  });

  const avgResolutionTimeStr = resolvedTickets.length > 0
    ? formatDuration(totalWorkMs / resolvedTickets.length)
    : 'N/A';

  return {
    totalSystems,
    activeAssignments,
    pendingComplaints,
    openTickets,
    inProgressTickets,
    resolvedCount: resolvedTickets.length,
    avgResolutionTimeStr
  };
}

export function resetPassword(role, name, verifyField, newPassword) {
  if (typeof window === 'undefined') return { success: false, message: 'Database unreachable.' };
  
  if (role === 'admin') {
    if (name.toLowerCase() === 'admin') {
      return { success: false, message: 'The default "admin" account password is static ("admin123").' };
    }
    
    // For custom registered admins, verify they have the admin access key
    if (verifyField !== 'admin123') {
      return { success: false, message: 'Invalid Admin Access Key.' };
    }
    
    const employees = getEmployees();
    const adminIndex = employees.findIndex(e => e.name.toLowerCase() === name.toLowerCase() && e.role === 'admin');
    
    if (adminIndex === -1) {
      return { success: false, message: 'Admin account not found.' };
    }
    
    employees[adminIndex].password = newPassword;
    saveEmployees(employees);
    return { success: true, message: 'Admin password reset successfully!' };
  } else {
    // For employees, verify the department matches
    const employees = getEmployees();
    const empIndex = employees.findIndex(e => e.name.toLowerCase() === name.toLowerCase() && e.role !== 'admin');
    
    if (empIndex === -1) {
      return { success: false, message: 'Employee account not found.' };
    }
    
    const emp = employees[empIndex];
    if (emp.department.toLowerCase() !== verifyField.toLowerCase()) {
      return { success: false, message: 'Incorrect department verification details.' };
    }
    
    employees[empIndex].password = newPassword;
    saveEmployees(employees);
    return { success: true, message: 'Password reset successfully!' };
  }
}



export function sendMockEmail(to, subject, body) {
  if (typeof window === 'undefined') return;
  const emails = getSentEmails();
  const newEmail = {
    id: 'email_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    to,
    subject,
    body,
    timestamp: new Date().toISOString()
  };
  emails.push(newEmail);
  saveSentEmails(emails);
  
  // Custom styled browser console notification
  console.group("%c✉️ [Mock Email System]", "color: var(--accent-cyan); font-weight: bold; font-size: 1.1rem;");
  console.log("%cTo: " + to, "color: var(--text-primary); font-weight: bold;");
  console.log("%cSubject: " + subject, "color: var(--text-primary); font-weight: bold;");
  console.log("%cBody:\n", "color: var(--text-secondary);");
  console.log(body);
  console.groupEnd();

  // Trigger custom event so UI can intercept and show an alert/toast
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('devicedesk_mock_email', { detail: newEmail });
    window.dispatchEvent(event);

    sendEmail({ to, subject, body })
      .then(data => {
        if (data.success) {
          console.log('%c✉️ [Nodemailer API Success]: Sent via SMTP. Message ID: ' + data.messageId, 'color: green;');
          if (data.url) {
            console.log('%c🔗 [Ethereal Mailbox URL]: ' + data.url, 'color: blue; text-decoration: underline;');
            // Dispatch event with URL so UI Toast can show the Ethereal inbox link
            const urlEvent = new CustomEvent('devicedesk_email_url', { detail: { id: newEmail.id, url: data.url } });
            window.dispatchEvent(urlEvent);
          }
        } else {
          console.error('❌ [Nodemailer API Error]:', data.error);
        }
      })
      .catch(err => {
        console.error('❌ [Nodemailer Network Error]:', err);
      });
  }
  
  return newEmail;
}

export function updateEmployee(employeeId, updatedFields) {
  if (typeof window === 'undefined') return null;
  const employees = getEmployees();
  const idx = employees.findIndex(e => e.id === employeeId);
  if (idx === -1) return null;
  
  employees[idx] = {
    ...employees[idx],
    ...updatedFields
  };
  saveEmployees(employees);
  return employees[idx];
}

export function findEmployeeByEmail(email) {
  if (typeof window === 'undefined') return null;
  const employees = getEmployees();
  return employees.find(e => e.email && e.email.toLowerCase() === email.toLowerCase());
}

export function resetPasswordByEmail(email, newPassword) {
  if (typeof window === 'undefined') return { success: false, message: 'Database unreachable.' };
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail === 'admin@devicedesk.com') {
    return { success: false, message: 'The default "admin" account password is static ("admin123").' };
  }
  const employees = getEmployees();
  const idx = employees.findIndex(e => e.email && e.email.toLowerCase() === cleanEmail);
  if (idx === -1) return { success: false, message: 'Account not found.' };
  
  employees[idx].password = newPassword;
  saveEmployees(employees);
  return { success: true, message: 'Password updated successfully!' };
}
