import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchFromDb, postToDb } from '../utils/api';

const SYSTEMS_KEY = 'devicedesk_systems';
const EMPLOYEES_KEY = 'devicedesk_employees';
const TICKETS_KEY = 'devicedesk_tickets';
const ASSIGNMENT_HISTORY_KEY = 'devicedesk_assignment_history';
const DEPARTMENTS_KEY = 'devicedesk_departments';
const EMAILS_KEY = 'devicedesk_sent_emails';

// Client-side local data cache
export let dbCache = {
  systems: [],
  employees: [],
  tickets: [],
  assignment_history: [],
  departments: [],
  sent_emails: []
};

// Listeners subscription for React Native reactive rendering
let listeners = [];

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notify() {
  listeners.forEach(l => {
    try {
      l();
    } catch (e) {
      console.error('Error notifying listener:', e);
    }
  });
}

// Load cache from AsyncStorage initially
export async function loadCache() {
  try {
    const systems = await AsyncStorage.getItem(SYSTEMS_KEY);
    const employees = await AsyncStorage.getItem(EMPLOYEES_KEY);
    const tickets = await AsyncStorage.getItem(TICKETS_KEY);
    const history = await AsyncStorage.getItem(ASSIGNMENT_HISTORY_KEY);
    const departments = await AsyncStorage.getItem(DEPARTMENTS_KEY);
    const emails = await AsyncStorage.getItem(EMAILS_KEY);

    if (systems) dbCache.systems = JSON.parse(systems);
    if (employees) dbCache.employees = JSON.parse(employees);
    if (tickets) dbCache.tickets = JSON.parse(tickets);
    if (history) dbCache.assignment_history = JSON.parse(history);
    if (departments) dbCache.departments = JSON.parse(departments);
    if (emails) dbCache.sent_emails = JSON.parse(emails);

    notify();
  } catch (err) {
    console.error('Failed to load local cache from AsyncStorage:', err);
  }
}

// Background sync from MySQL database via Next.js backend
export async function syncWithServer() {
  try {
    const serverDb = await fetchFromDb();

    dbCache.systems = serverDb.systems || [];
    dbCache.employees = serverDb.employees || [];
    dbCache.tickets = serverDb.tickets || [];
    dbCache.assignment_history = serverDb.assignment_history || [];
    dbCache.departments = serverDb.departments || [];
    dbCache.sent_emails = serverDb.sent_emails || [];

    // Save to AsyncStorage
    await AsyncStorage.setItem(SYSTEMS_KEY, JSON.stringify(dbCache.systems));
    await AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(dbCache.employees));
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(dbCache.tickets));
    await AsyncStorage.setItem(ASSIGNMENT_HISTORY_KEY, JSON.stringify(dbCache.assignment_history));
    await AsyncStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(dbCache.departments));
    await AsyncStorage.setItem(EMAILS_KEY, JSON.stringify(dbCache.sent_emails));

    notify();
    return { success: true };
  } catch (err) {
    console.error('Failed to sync database with server:', err);
    return { success: false, error: err.message };
  }
}

// Post updates to server
async function postToServer(action, data) {
  try {
    await postToDb(action, data);
  } catch (err) {
    console.error(`Failed to post action ${action} to server db:`, err);
  }
}

// Getters
export function getSystems() {
  return dbCache.systems || [];
}

export function getEmployees() {
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
  const list = dbCache.tickets || [];
  return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAssignmentHistory() {
  return dbCache.assignment_history || [];
}

export function getDepartments() {
  return dbCache.departments || [];
}

export function getSentEmails() {
  return dbCache.sent_emails || [];
}

// Setters and Persistors
async function saveSystems(systems) {
  dbCache.systems = systems;
  await AsyncStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
  notify();
  await postToServer('saveSystems', systems);
}

async function saveEmployees(employees) {
  dbCache.employees = employees;
  await AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  notify();
  await postToServer('saveEmployees', employees);
}

async function saveTickets(tickets) {
  dbCache.tickets = tickets;
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  notify();
  await postToServer('saveTickets', tickets);
}

async function saveAssignmentHistory(history) {
  dbCache.assignment_history = history;
  await AsyncStorage.setItem(ASSIGNMENT_HISTORY_KEY, JSON.stringify(history));
  notify();
  await postToServer('saveAssignmentHistory', history);
}

async function saveSentEmails(emails) {
  dbCache.sent_emails = emails;
  await AsyncStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
  notify();
  await postToServer('saveEmails', emails);
}

async function saveDepartments(departments) {
  dbCache.departments = departments;
  await AsyncStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
  notify();
  await postToServer('saveDepartments', departments);
}

// System Operations
export function addSystem(system) {
  const systems = [...getSystems()];
  const newSystem = {
    id: 'sys_' + Date.now(),
    systemNumber: system.systemNumber || `SN${systems.length + 11}`,
    cpu: system.cpu || 'Unknown CPU',
    gpu: system.gpu || 'Integrated Graphics',
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
  const systems = [...getSystems()];
  const index = systems.findIndex(s => s.id === updatedSys.id);
  if (index !== -1) {
    systems[index] = { ...systems[index], ...updatedSys };
    saveSystems(systems);
    return true;
  }
  return false;
}

export function deleteSystem(systemId) {
  const systems = [...getSystems()];
  const sys = systems.find(s => s.id === systemId);
  if (sys && sys.assignedTo) {
    logAssignmentChange(sys.assignedTo, sys.id, sys.systemNumber, 'Unassigned due to system deletion');
  }
  const filtered = systems.filter(s => s.id !== systemId);
  saveSystems(filtered);
}

export function logAssignmentChange(employeeId, systemId, systemNumber, action, assignedBy = 'System') {
  const history = [...getAssignmentHistory()];
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

// Employee Operations
export function addEmployee(name, email, password, role, department, ticketLimit = 5) {
  const employees = [...getEmployees()];
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

  sendMockEmail(
    newEmp.email,
    'Welcome to DeviceDesk!',
    `Hello ${newEmp.name},\n\nYour account has been successfully created on DeviceDesk.\n\nUsername: ${newEmp.name}\nEmail: ${newEmp.email}\nDefault Password: ${newEmp.password}\nRole: ${newEmp.role}\nDepartment: ${newEmp.department}\n\nBest Regards,\nIT Support Team`
  );

  return newEmp;
}

export function removeEmployee(employeeId) {
  const employees = [...getEmployees()];
  const filtered = employees.filter(e => e.id !== employeeId);
  saveEmployees(filtered);

  // Unassign systems
  const systems = [...getSystems()];
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

export function updateEmployee(employeeId, updatedFields) {
  const employees = [...getEmployees()];
  const idx = employees.findIndex(e => e.id === employeeId);
  if (idx === -1) return null;
  
  employees[idx] = {
    ...employees[idx],
    ...updatedFields
  };
  saveEmployees(employees);
  return employees[idx];
}

export function assignSystemToEmployee(systemId, employeeId, assignedBy = 'System') {
  const systems = [...getSystems()];
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

// Authentication / Password operations
export function findEmployeeByCredentials(nameOrEmail, password) {
  const employees = getEmployees();
  const cleanStr = nameOrEmail.trim().toLowerCase();
  return employees.find(e => 
    (e.name.toLowerCase() === cleanStr || e.email.toLowerCase() === cleanStr) && 
    e.password === password
  ) || null;
}

export function findEmployeeByEmail(email) {
  const employees = getEmployees();
  return employees.find(e => e.email && e.email.toLowerCase() === email.trim().toLowerCase());
}

export function isAdminCredentials(username, password) {
  return username.trim().toLowerCase() === 'admin' && password === 'admin123';
}

export function resetPassword(role, name, verifyField, newPassword) {
  if (role === 'admin') {
    if (name.toLowerCase() === 'admin') {
      return { success: false, message: 'The default "admin" account password is static ("admin123").' };
    }
    
    if (verifyField !== 'admin123') {
      return { success: false, message: 'Invalid Admin Access Key.' };
    }
    
    const employees = [...getEmployees()];
    const adminIndex = employees.findIndex(e => e.name.toLowerCase() === name.toLowerCase() && e.role === 'admin');
    
    if (adminIndex === -1) {
      return { success: false, message: 'Admin account not found.' };
    }
    
    employees[adminIndex].password = newPassword;
    saveEmployees(employees);
    return { success: true, message: 'Admin password reset successfully!' };
  } else {
    const employees = [...getEmployees()];
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

export function resetPasswordByEmail(email, newPassword) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail === 'admin@devicedesk.com') {
    return { success: false, message: 'The default "admin" account password is static ("admin123").' };
  }
  const employees = [...getEmployees()];
  const idx = employees.findIndex(e => e.email && e.email.toLowerCase() === cleanEmail);
  if (idx === -1) return { success: false, message: 'Account not found.' };
  
  employees[idx].password = newPassword;
  saveEmployees(employees);
  return { success: true, message: 'Password updated successfully!' };
}

export function createTicket(employeeId, systemId, category, description, severity) {
  const tickets = [...getTickets()];
  const systems = getSystems();
  const employees = getEmployees();

  const system = systems.find(s => s.id === systemId);
  const employee = employees.find(e => e.id === employeeId);

  const newTicket = {
    id: 't_' + Date.now(),
    title: category + ' Request',
    description,
    category,
    severity: severity || 'Medium',
    status: 'Open',
    systemId,
    systemNumber: system ? system.systemNumber : null,
    raisedBy: employeeId,
    employeeId, // Keep for legacy compatibility
    raisedByName: employee ? employee.name : 'Unknown',
    createdAt: new Date().toISOString(),
    startedAt: null,
    resolvedAt: null,
    resolutionRemarks: null,
    notes: ''
  };
  tickets.push(newTicket);
  saveTickets(tickets);
  return newTicket;
}

export function startTicketWork(ticketId) {
  const tickets = [...getTickets()];
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
  const tickets = [...getTickets()];
  const index = tickets.findIndex(t => t.id === ticketId);
  if (index !== -1 && tickets[index].status !== 'Resolved') {
    const ticket = tickets[index];
    ticket.status = 'Resolved';
    ticket.resolvedAt = new Date().toISOString();
    ticket.notes = notes;
    if (!ticket.startedAt) {
      ticket.startedAt = ticket.createdAt;
    }
    saveTickets(tickets);
    return ticket;
  }
  return null;
}

// Emails Logger
export function sendMockEmail(to, subject, body) {
  const emails = [...getSentEmails()];
  const newEmail = {
    id: 'email_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    to,
    subject,
    body,
    timestamp: new Date().toISOString()
  };
  emails.push(newEmail);
  saveSentEmails(emails);

  console.log(`[SMTP MOCK EMAIL] To: ${to} | Subject: ${subject}`);
  return newEmail;
}

// Department Operations
export function addDepartment(name) {
  const departments = [...getDepartments()];
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
  const departments = [...getDepartments()];
  const filtered = departments.filter(d => d.id !== id);
  saveDepartments(filtered);
  return true;
}

// Stats & Calculations
export function calculateDuration(startStr, endStr) {
  if (!startStr || !endStr) return 0;
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
