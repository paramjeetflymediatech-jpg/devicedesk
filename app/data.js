// DeviceDesk Initial Seed Data
// Based on the 'FLY MEDIA TECHNOLOGY' current system details sheet

export const initialEmployees = [
  { id: "emp1",  name: "Pravi Sir",  email: "pravi@yopmail.com",    password: "pravi123",    role: "Management",  department: "Executive",   ticketLimit: 20 },
  { id: "emp2",  name: "Sarabjot",   email: "sarabjot@yopmail.com", password: "sarabjot123", role: "Team Member", department: "Operations",  ticketLimit: 5  },
  { id: "emp3",  name: "Harsh",      email: "harsh@yopmail.com",    password: "harsh123",    role: "Team Member", department: "Operations",  ticketLimit: 5  },
  { id: "emp4",  name: "Arvinder",   email: "arvinder@yopmail.com", password: "arvinder123", role: "Team Member", department: "Operations",  ticketLimit: 5  },
  { id: "emp5",  name: "Tanmay",     email: "tanmay@yopmail.com",   password: "tanmay123",   role: "IT Engineer", department: "IT Support",  ticketLimit: 10 },
  { id: "emp6",  name: "Navraj",     email: "navraj@yopmail.com",   password: "navraj123",   role: "Team Member", department: "Development", ticketLimit: 5  },
  { id: "emp7",  name: "Armaan",     email: "armaan@yopmail.com",   password: "armaan123",   role: "Team Member", department: "Development", ticketLimit: 5  },
  { id: "emp8",  name: "Pardeep",    email: "pardeep@yopmail.com",  password: "pardeep123",  role: "Team Member", department: "Design",      ticketLimit: 5  },
  { id: "emp9",  name: "Harpreet",   email: "harpreet@yopmail.com", password: "harpreet123", role: "Team Member", department: "QA",          ticketLimit: 5  },
  { id: "emp10", name: "Ikvak",      email: "ikvak@yopmail.com",    password: "ikvak123",    role: "Team Member", department: "Development", ticketLimit: 5  },
  { id: "emp11", name: "Sharad",     email: "sharad@yopmail.com",   password: "sharad123",   role: "Team Member", department: "Design",      ticketLimit: 5  },
  { id: "emp12", name: "Parvani",    email: "parvani@yopmail.com",  password: "parvani123",  role: "Team Member", department: "Operations",  ticketLimit: 5  },
  { id: "emp13", name: "Jaskirat",   email: "jaskirat@yopmail.com", password: "jaskirat123", role: "Team Member", department: "Development", ticketLimit: 5  },
  { id: "emp14", name: "Aman",       email: "aman@yopmail.com",     password: "aman123",     role: "Team Member", department: "Development", ticketLimit: 5  },
  { id: "emp15", name: "Rohit",      email: "rohit@yopmail.com",    password: "rohit123",    role: "Team Member", department: "QA",          ticketLimit: 5  },
  { id: "emp16", name: "Simran",     email: "simran@yopmail.com",   password: "simran123",   role: "Team Member", department: "Design",      ticketLimit: 5  },
  { id: "emp17", name: "Karan",      email: "karan@yopmail.com",    password: "karan123",    role: "IT Engineer", department: "IT Support",  ticketLimit: 10 }
];

export const initialSystems = [
  {
    id: "sys11",
    systemNumber: "SN11",
    cpu: "Intel Core i3-4330 @ 3.50 GHz",
    ram: "16 GB DDR3",
    storage: "224 GB SSD",
    os: "Windows 10 Home (64-bit)",
    model: "H81M-K PRO",
    assignedTo: "emp1", // Pravi Sir
    status: "Active",
    remarks: "Handwritten: 8GB, 4GB notes"
  },
  {
    id: "sys12",
    systemNumber: "SN12",
    cpu: "AMD Ryzen 5 3600X",
    ram: "24 GB",
    storage: "466 GB SSD",
    os: "Windows 11 Pro",
    model: "A520M KV2",
    assignedTo: "emp2", // Sarabjot
    status: "Active",
    remarks: "Handwritten: 1 month repair date"
  },
  {
    id: "sys13",
    systemNumber: "SN13",
    cpu: "Intel Core i5-12400F (12th Gen)",
    ram: "32 GB DDR4",
    storage: "823 GB SSD",
    os: "Windows 11 Pro",
    model: "System Product Name",
    assignedTo: "emp3", // Harsh
    status: "Active",
    remarks: "Handwritten: 8GB note"
  },
  {
    id: "sys14",
    systemNumber: "SN14",
    cpu: "Apple Mac mini M4",
    ram: "16 GB Unified",
    storage: "256 GB SSD",
    os: "macOS Sequoia",
    model: "Mac mini M4",
    assignedTo: "emp4", // Arvinder
    status: "Active",
    remarks: "Handwritten: 8GB note"
  },
  {
    id: "sys15",
    systemNumber: "SN15",
    cpu: "Intel Core i5-12400F (12th Gen)",
    ram: "32 GB DDR4",
    storage: "1.03 TB SSD",
    os: "Windows 11 Pro (64-bit)",
    model: "System Product Name",
    assignedTo: "emp5", // Tanmay (IT Engineer)
    status: "Active",
    remarks: "Handwritten: 8GB note"
  },
  {
    id: "sys16",
    systemNumber: "SN16",
    cpu: "Intel Core i5-14400F @ 2.50 GHz",
    ram: "16 GB",
    storage: "238 GB SSD",
    os: "Windows 11 Pro",
    model: "MSI MS-7D48",
    assignedTo: "emp6", // Navraj (assigned to Navraj & Armaan on sheet)
    status: "Active",
    remarks: "Shared system: Navraj & Armaan"
  },
  {
    id: "sys17",
    systemNumber: "SN17",
    cpu: "Intel Core i5-4590S",
    ram: "16 GB",
    storage: "119 GB SSD",
    os: "Windows 11 Pro",
    model: "Not Specified",
    assignedTo: "emp8", // Pardeep
    status: "Active",
    remarks: "Handwritten: 8GB note"
  },
  {
    id: "sys18",
    systemNumber: "SN18",
    cpu: "Intel Core i5-12400F (12th Gen)",
    ram: "24 GB",
    storage: "1.02 TB SSD",
    os: "Windows 11 Pro",
    model: "System Product Name",
    assignedTo: "emp9", // Harpreet
    status: "Active",
    remarks: "Handwritten: 4GB, 8GB notes"
  },
  {
    id: "sys19",
    systemNumber: "SN19",
    cpu: "Intel Core i5-7400 @ 3.00 GHz",
    ram: "24 GB",
    storage: "585 GB SSD",
    os: "Windows 11 Pro (25H2)",
    model: "Not Visible",
    assignedTo: "emp10", // Ikvak
    status: "Active",
    remarks: "Handwritten: 4GB note"
  },
  {
    id: "sys20",
    systemNumber: "SN20",
    cpu: "Intel Core i3-6100T @ 3.20 GHz",
    ram: "16 GB",
    storage: "119 GB SSD",
    os: "Windows 11 Pro",
    model: "Not Specified",
    assignedTo: "emp11", // Sharad
    status: "Active",
    remarks: "Handwritten: 4GB, 8GB notes"
  },
  {
    id: "sys21",
    systemNumber: "SN21",
    cpu: "Intel Core i3-4330 @ 3.50 GHz",
    ram: "8 GB DDR3",
    storage: "119 GB SSD",
    os: "Windows 11 (64-bit)",
    model: "H81M-K PRO",
    assignedTo: "emp12", // Parvani
    status: "Active",
    remarks: ""
  },
  {
    id: "sys22",
    systemNumber: "SN22",
    cpu: "Intel Core i5-4570T",
    ram: "16 GB",
    storage: "120 GB SSD",
    os: "Ubuntu 24.04.4 LTS",
    model: "MSI MS-7817",
    assignedTo: "emp13", // Jaskirat
    status: "Active",
    remarks: ""
  }
];

export const initialTickets = [
  {
    id: "t1",
    systemId: "sys15",
    employeeId: "emp5",
    category: "RAM/Speed",
    description: "System runs slow when compiling code. Requesting RAM upgrade to 32GB.",
    severity: "High",
    status: "Resolved",
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    notes: "Upgraded RAM to 32GB DDR4 successfully. Tested and verified."
  },
  {
    id: "t2",
    systemId: "sys12",
    employeeId: "emp2",
    category: "Hardware",
    description: "Screen flickering issue observed during video rendering.",
    severity: "Medium",
    status: "In Progress",
    createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
    resolvedAt: null,
    notes: "Checking HDMI cable connection and graphics card drivers."
  }
];

export const initialDepartments = [
  { id: "dept1", name: "Development" },
  { id: "dept2", name: "Operations" },
  { id: "dept3", name: "Design" },
  { id: "dept4", name: "QA" },
  { id: "dept5", name: "IT Support" },
  { id: "dept6", name: "Executive" }
];

