"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import {
  FiCompass,
  FiArrowRight,
  FiUsers,
  FiShield,
  FiUserCheck,
  FiBriefcase,
  FiMonitor,
  FiCheckCircle,
  FiClock,
  FiLock,
  FiActivity,
  FiLayers,
  FiRepeat,
  FiDatabase,
  FiCpu,
  FiSearch,
  FiMapPin,
  FiFileText,
  FiCreditCard,
  FiCoffee,
  FiMessageSquare,
  FiCamera,
  FiSmartphone,
  FiCheck,
  FiX,
  FiFolder,
  FiSend,
  FiEye,
  FiTag
} from "react-icons/fi";

// ==========================================
// 1. CLIENT-TO-DELIVERY WORKFLOW STAGES
// ==========================================
const CLIENT_LIFECYCLE_STAGES = [
  {
    step: "01",
    title: "Client Onboarding & Service Booking",
    actor: "Corporate Client",
    actorBadge: "Client Portal",
    badgeColor: "#8b5cf6",
    routeDisplay: "/portal/client/book-service",
    icon: <FiFileText />,
    summary: "Client registers, browses service retainers (SEO, Social, Web Dev), fills requirements, and attaches brief files & Google Drive folder.",
    details: [
      "Client specifies project scope, timeline, target keywords, and brand assets.",
      "Attaches reference guidelines or pastes a Google Drive Requirements Folder link.",
      "Dispatches request via POST /api/client-services/requests (initial status: 'Pending Assignment')."
    ]
  },
  {
    step: "02",
    title: "Management Review & TL Assignment",
    actor: "Admin / Management",
    actorBadge: "Admin Console",
    badgeColor: "#0f766e",
    routeDisplay: "/admin (Client Services Queue)",
    icon: <FiShield />,
    summary: "Management analyzes requirements, checks team bandwidth, and assigns a designated Team Leader (TL) to lead the project.",
    details: [
      "Management checks service category (e.g. SEO, Web Dev, Paid Ads) and reviews client attachments.",
      "Assigns the request's assigned_tl_id to the appropriate department Team Leader.",
      "System issues real-time notification to the Team Leader's dashboard queue."
    ]
  },
  {
    step: "03",
    title: "TL Scoping & Task Delegation",
    actor: "Team Leader (TL)",
    actorBadge: "Leader Portal",
    badgeColor: "#2563eb",
    routeDisplay: "/portal/leader/client-requests",
    icon: <FiUsers />,
    summary: "TL opens incoming booking, reviews scope, creates task breakdown, adds guidelines/notes, and assigns a specialized team member.",
    details: [
      "TL inspects original brief and clicks 'Assign Request'.",
      "Picks an active reporting employee from their assigned hierarchy.",
      "Attaches custom execution notes, guidelines, and priority instructions.",
      "Triggers POST /api/tasks linking task to project_id for unified tracking."
    ]
  },
  {
    step: "04",
    title: "Team Member Execution & Proof Upload",
    actor: "Team Member (Dev / Design / SEO)",
    actorBadge: "Employee Workspace",
    badgeColor: "#0284c7",
    routeDisplay: "/employee-dashboard",
    icon: <FiActivity />,
    summary: "Member accepts task on Kanban board, works under background screenshot monitoring, uploads work proofs & adds completion notes.",
    details: [
      "Employee moves task from 'To Do' to 'In Progress' while active work timer ticks.",
      "Desktop Agent silently records periodic screenshot previews to document productivity.",
      "Upon completion, employee uploads deliverable links (GitHub PR, Figma, Drive, ZIP).",
      "Fills in Employee Completion Note explaining work done and marks task 'Done'."
    ]
  },
  {
    step: "05",
    title: "TL Quality Audit (Before vs. After Match)",
    actor: "Team Leader (TL)",
    actorBadge: "Leader Portal",
    badgeColor: "#e11d48",
    routeDisplay: "/portal/leader/client-requests (Audit Modal)",
    icon: <FiEye />,
    summary: "TL opens Side-by-Side Verification: compares Client Brief (Before) vs Member Deliverables (After). Rejects for revision or approves for delivery.",
    details: [
      "Modal compares Original Requirements (Before) with Employee Submissions (After).",
      "Inspects deliverable files, Figma handoffs, staging URLs, and completion notes.",
      "If flawed: TL returns task with feedback via Team Chat.",
      "If approved: TL signs off and marks request 'Completed' for client dispatch."
    ]
  },
  {
    step: "06",
    title: "Final Client Delivery & Sign-Off",
    actor: "Corporate Client & TL",
    actorBadge: "Client Portal",
    badgeColor: "#10b981",
    routeDisplay: "/portal/client/book-service (Delivery Banner)",
    icon: <FiCheckCircle />,
    summary: "Client receives green delivery card with team completion summary, one-click asset downloads, delivery timestamp, and optional TL chat.",
    details: [
      "Client portal immediately updates with '🎉 Work Delivered & Completed' banner.",
      "Client downloads verified assets and reviews team completion notes.",
      "Client can open direct Client-TL Chat if any revisions or questions arise.",
      "Employee logs completed project hours in their daily End-of-Day (EOD) summary."
    ]
  }
];

// ==========================================
// 2. DEPARTMENT & ROLE DIRECTORY
// ==========================================
const ROLES_DIRECTORY = [
  {
    roleName: "Human Resources (HR)",
    dbRole: "HR Management",
    department: "Human Resources",
    badgeColor: "#ec4899",
    landingRoute: "/portal/hr & /admin/attendance",
    objective: "Talent acquisition, candidate assessments, employee attendance regularizations, leave approvals, and personnel compliance.",
    permissions: [
      "Recruitment ATS: Review job applications from /careers, evaluate candidate test scores, and schedule interviews.",
      "Candidate Onboarding: Convert approved candidates into active staff, assign initial credentials, and issue ID cards.",
      "Attendance Management: Approve/reject missed biometric punches, regularize attendance, and review penalty waivers.",
      "Leave Requests: Review casual/medical leave submissions and coordinate shift approvals.",
      "Account Lifecycle: Pause accounts for disciplinary review (status: 'Paused') or deactivate resigned employees (status: 'Inactive')."
    ],
    boundaries: [
      "Cannot modify database connection strings or server environment settings.",
      "Cannot delete or assign physical hardware without IT Support confirmation.",
      "Cannot edit client invoices or financial ledgers."
    ],
    securityNote: "Protected with mandatory 2-Factor Email OTP authentication upon every login attempt."
  },
  {
    roleName: "Regular Team Member",
    dbRole: "Team Member",
    department: "Development / Design / SEO / QA",
    badgeColor: "#0284c7",
    landingRoute: "/employee-dashboard & Mobile App",
    objective: "Execute sprint deliverables, track daily productive hours, raise hardware complaints, and report daily progress.",
    permissions: [
      "Personal Kanban Board: View assigned tasks, move cards (To-Do, In Progress, Done), and log work proofs.",
      "Punch-In / Out & Break Logger: Web clock-in/out, launch Tea/Lunch/Personal breaks, and monitor live net work seconds.",
      "Hardware Support Tickets: Raise repair/upgrade complaint tickets with priority tags up to their allocated ticket quota (e.g. 5).",
      "Daily EOD Reports: Submit End-of-Day productivity summaries detailing completed milestones.",
      "Internal Team Chat: Instant communication with team members and designated Team Leaders."
    ],
    boundaries: [
      "Cannot reassign tasks to other team members.",
      "Cannot approve or deliver work directly to corporate clients.",
      "Cannot view other colleagues' salary, payroll, or confidential company audits."
    ],
    securityNote: "Monitored during punched-in hours by the background Desktop Screenshot Agent."
  },
  {
    roleName: "Corporate Client",
    dbRole: "Client",
    department: "External Accounts",
    badgeColor: "#8b5cf6",
    landingRoute: "/portal/client",
    objective: "Book digital marketing, design, and development services, track campaign KPIs, and review finalized deliverables.",
    permissions: [
      "Service Booking: Order custom packages (SEO, Social, Web Dev) with briefs, requirements, and Google Drive links.",
      "Deliverable Handoff: View and download verified project proofs, completion notes, and delivery timestamps.",
      "Retainer & Billing: Purchase monthly retainers, download GST invoices, and track ad spend ledgers.",
      "Direct TL Chat: Message the assigned Team Leader directly to discuss project deliverables and campaign strategies."
    ],
    boundaries: [
      "Cannot view internal employee rosters, task timers, or hardware inventories.",
      "Cannot reassign project Team Leaders without Administrative consultation."
    ],
    securityNote: "Isolated to client data only; strict multi-tenant boundary via clientId partition."
  },
  {
    roleName: "Team Leader (TL)",
    dbRole: "Team Leader / TL",
    department: "Operations / Engineering / Creative",
    badgeColor: "#2563eb",
    landingRoute: "/portal/leader",
    objective: "Supervise team execution, allocate client service requests, perform before/after deliverable quality audits, and oversee attendance.",
    permissions: [
      "Client Service Queue: Receive incoming bookings routed by Management and scope project timelines.",
      "Task Delegation: Assign tasks to specific team members under their hierarchy with guidelines and instructions.",
      "Quality Audit: Side-by-side verification of original client brief (Before) vs member work proof (After) before sign-off.",
      "Screenshot Monitoring: View live team desktop capture previews to ensure active engagement.",
      "Leave Recommendations: Pre-approve or reject team leave applications before HR finalization."
    ],
    boundaries: [
      "Cannot delete hardware systems or wipe audit logs.",
      "Cannot access confidential company financial statements or adjust employee compensation."
    ],
    securityNote: "Supervises subordinate employees and subordinate TLs via multi-level team hierarchy."
  },
  {
    roleName: "IT Support Engineer",
    dbRole: "IT Engineer / IT Support",
    department: "IT Infrastructure",
    badgeColor: "#f59e0b",
    landingRoute: "/?tab=dashboard & /it-support",
    objective: "Manage physical IT hardware assets, execute diagnostics, maintain office networks, and resolve complaint tickets.",
    permissions: [
      "Hardware Inventory: Add systems (Laptops, MacBooks, Desktops), record serials, and generate QR code asset tags.",
      "System Handover & Returns: Assign hardware to employees, take handover on transfers, and inspect equipment return condition.",
      "Complaint Ticket Desk: Claim hardware/software tickets, mark In Progress, and record resolution remarks.",
      "Specification Upgrades: Record RAM, SSD, and GPU upgrades with full historical audit trails.",
      "Network & Peripherals: Monitor office Wi-Fi routers, SFTP screenshot servers, and biometric scanners."
    ],
    boundaries: [
      "Cannot approve candidate hiring or alter employee HR records.",
      "Cannot edit client billing or manage marketing campaign packages."
    ],
    securityNote: "Manages physical system assignments; updates sync directly to the centralized database."
  },
  {
    roleName: "Root Admin & Management",
    dbRole: "Admin / Superadmin / Management",
    department: "Executive Management",
    badgeColor: "#0f766e",
    landingRoute: "/admin & /admin/management-overview",
    objective: "Total operational governance, hardware assets, financial ledgers, system security, and high-level KPI oversight.",
    permissions: [
      "Complete Master Control: Manage all employees, hardware, attendance, tickets, and system configurations.",
      "Client Request Triage: Review incoming bookings and assign designated Team Leaders.",
      "Live Productivity Monitoring: Inspect company-wide screenshots, biometric logs, and department task velocity.",
      "Financial Ledgers: View revenue versus payroll overhead, client invoice receipts, and domain expenses.",
      "Security Audits & Policies: Configure IP whitelists, reset passwords, and adjust department ticket quotas."
    ],
    boundaries: [
      "Executive role handles administrative decisions; daily task execution is delegated to operational leads."
    ],
    securityNote: "Full master privilege across all database models and API endpoints."
  },
  {
    roleName: "Field Marketing Executive",
    dbRole: "Marketing",
    department: "Marketing & Sales",
    badgeColor: "#10b981",
    landingRoute: "/portal/marketing & Mobile App",
    objective: "Conduct on-site client visits, track GPS travel routes, generate new business leads, and submit expense reimbursements.",
    permissions: [
      "Geofenced Mobile Punch: Check in and out on the mobile app with real-time GPS coordinates.",
      "GPS Route Tracking: Real-time breadcrumb route logging for traveling sales and client meetings.",
      "KM Traveled Reimbursement: Automatic distance calculation for travel expense reimbursement.",
      "Lead Management: Capture new business leads, meeting notes, and client contact information."
    ],
    boundaries: [
      "Cannot access internal server hardware specs or IT complaint queues.",
      "Cannot modify client packages or issue invoices."
    ],
    securityNote: "Requires device binding to prevent GPS spoofing and maintain location integrity."
  },
  {
    roleName: "DNS & Domain Manager",
    dbRole: "DNS Manager",
    department: "DNS Manager",
    badgeColor: "#6366f1",
    landingRoute: "/admin/domains",
    objective: "Safeguard corporate and client domain portfolios, track SSL expiration dates, and monitor DNS registrar configurations.",
    permissions: [
      "Domain Portfolio: Monitor registration status across GoDaddy, Namecheap, Cloudflare, and AWS.",
      "SSL Certificate Monitoring: Automated expiry warnings (30, 15, and 7 days) to prevent website downtime.",
      "DNS Record Registry: Safely store registrar logins, nameserver records, and TXT verification tags."
    ],
    boundaries: [
      "Cannot manage employee HR records or approve employee leaves.",
      "Cannot handle physical laptop maintenance."
    ],
    securityNote: "Protected with mandatory 2-Factor Email OTP authentication upon every login attempt."
  }
];

// ==========================================
// 3. CORE PLATFORM ENGINES & SUBSYSTEMS
// ==========================================
const PLATFORM_ENGINES = [
  {
    title: "Desktop Screenshot Monitoring Agent",
    icon: <FiCamera />,
    badge: "Native Tray Daemon",
    color: "#2563eb",
    description: "Lightweight background agent (agent.exe) running in the Windows system tray. Silently captures multi-screen previews at randomized intervals while employees are punched in. Previews upload securely via SFTP/cloud storage, empowering Team Leaders and Admins with live productivity visibility.",
    keyCapabilities: [
      "Automatic capture triggered only when punched in",
      "Encrypted SFTP upload to /api/screenshots/upload",
      "Live screenshot gallery with employee, date, and hour filters",
      "Automatic 30-day retention cleanup daemon"
    ]
  },
  {
    title: "Punch-In & Biometric Attendance System",
    icon: <FiClock />,
    badge: "Hardware Sync Engine",
    color: "#059669",
    description: "Enterprise attendance tracking combining browser punch-in with physical biometric fingerprint/face scanners. Uses immutable wall-clock timestamps to compute late check-ins, half-days, and overtime, with an automated cron daemon that closes forgotten punch-outs at midnight.",
    keyCapabilities: [
      "Live punch-in / punch-out with wall-clock verification",
      "Office biometric scanner integration (/api/attendance/biometric)",
      "Automated auto-close daemon (/api/attendance/auto-close)",
      "HR regularization workflow for missed punch approvals"
    ]
  },
  {
    title: "Break Logging & Net Productivity Engine",
    icon: <FiCoffee />,
    badge: "Live Running Clock",
    color: "#d97706",
    description: "Real-time break tracking with dedicated categories for Tea Break, Lunch Break, and Personal Break. When an employee takes a break, the active work clock pauses and a live second-by-second break counter activates, automatically computing accurate Net Productive Hours.",
    keyCapabilities: [
      "Categorized breaks: Tea Break, Lunch Break, Personal Break",
      "Formula: Net Work Hours = (Punch Out - Punch In) - Breaks",
      "Real-time countdown and policy limit alerts",
      "Auditable break history per employee shift"
    ]
  },
  {
    title: "Dual Real-Time Chat Hubs",
    icon: <FiMessageSquare />,
    badge: "Socket.IO Engine",
    color: "#7c3aed",
    description: "High-speed real-time messaging powered by Socket.IO. Structured into two dedicated collaboration channels: Team Chat for internal employee-to-TL sprint huddles, and Client Chat for direct communication between Corporate Clients and their designated Team Leaders.",
    keyCapabilities: [
      "Team Chat (/portal/leader/team-chat) for internal execution",
      "Client Chat (/portal/leader/client-chat) for client feedback",
      "Real-time file/asset sharing and message read receipts",
      "Unread counters and instant browser toast notifications"
    ]
  },
  {
    title: "Hardware Asset & Complaint Ticket Desk",
    icon: <FiMonitor />,
    badge: "IT Service Desk",
    color: "#ea580c",
    description: "Complete physical IT lifecycle management. Covers laptop/MacBook inventory, asset QR code labels, and employee complaint tickets. Employees submit issues within a protected quota limit (e.g. 5 tickets), while IT Engineers claim tickets, log hardware upgrades, and document resolutions.",
    keyCapabilities: [
      "System asset registry with printable QR code labels",
      "Employee ticket quotas preventing spam (/employee-dashboard)",
      "Diagnostic stages: Open -> In Progress -> Resolved -> Closed",
      "Hardware spec upgrade audit trail (RAM, SSD, GPU, Battery)"
    ]
  },
  {
    title: "Field Marketing & Mobile Android App",
    icon: <FiSmartphone />,
    badge: "Android + React Native",
    color: "#0891b2",
    description: "Dedicated React Native mobile application for on-the-go staff. Features geofenced GPS check-in, real-time route breadcrumb tracking, travel KM reimbursement calculation, and portable hardware QR code scanning.",
    keyCapabilities: [
      "GPS geofenced mobile punch-in with device binding",
      "Real-time travel route breadcrumbs for client visits",
      "Automated KM traveled calculation for expense payouts",
      "Portable camera QR scanner for instant system audits"
    ]
  }
];

// ==========================================
// 4. INTERACTIVE FLOW MODULES (6 COMPLETE FLOWS)
// ==========================================
const FLOW_MODULES = [
  {
    id: "delegation",
    title: "Client Request & Team Delegation Flow",
    subtitle: "From Client Order to Team Leader Assignment, Member Execution, Proof Verification & Delivery",
    role: "Team Leader & Client",
    badgeColor: "#3b82f6",
    icon: <FiRepeat />,
    description: "The primary operational revenue cycle: client requests social media, SEO, or paid ad deliverables; Management assigns a designated TL; the TL allocates work to specialized team members; employees execute under the screenshot agent; TL reviews and approves for client delivery.",
    steps: [
      {
        number: "01",
        actor: "Corporate Client",
        actorColor: "#8b5cf6",
        title: "Client Orders Service",
        route: "/portal/client/book-service",
        endpoint: "POST /api/client-services/requests",
        table: "client_services, service_requests",
        details: "The client selects their service category (SMO, SEO, Web Dev, Ads), enters detailed requirements, and uploads reference briefs or Google Drive URLs."
      },
      {
        number: "02",
        actor: "Admin / Management",
        actorColor: "#0f766e",
        title: "Management Triage & TL Assignment",
        route: "/admin (Client Services Queue)",
        endpoint: "PUT /api/client-services/requests/[id]",
        table: "service_requests, employees",
        details: "Management evaluates project requirements, checks department capacity, and assigns a designated Team Leader (assigned_tl_id)."
      },
      {
        number: "03",
        actor: "Team Leader (TL)",
        actorColor: "#3b82f6",
        title: "TL Scoping & Task Delegation",
        route: "/portal/leader/client-requests",
        endpoint: "POST /api/tasks (with project_id)",
        table: "tasks, employees",
        details: "The TL opens incoming bookings, selects an active reporting employee from their hierarchy, attaches guidelines and instructions, and dispatches the task."
      },
      {
        number: "04",
        actor: "Team Member",
        actorColor: "#0284c7",
        title: "Work Execution & Proof Submission",
        route: "/employee-dashboard",
        endpoint: "PUT /api/tasks (status: Done, fileUrl: [...])",
        table: "tasks",
        details: "The specialist works under background screenshot monitoring, uploads deliverable proof files/links (GitHub, Figma, Drive), writes a completion note, and marks the task Done."
      },
      {
        number: "05",
        actor: "Team Leader (TL)",
        actorColor: "#e11d48",
        title: "TL Quality Audit (Before vs. After)",
        route: "/portal/leader/client-requests",
        endpoint: "PUT /api/client-services/requests (status: Completed)",
        table: "service_requests, tasks",
        details: "TL opens side-by-side audit: matches original client brief (Before) against employee deliverable proofs (After). Rejects for revision or marks 'Completed'."
      },
      {
        number: "06",
        actor: "Corporate Client",
        actorColor: "#10b981",
        title: "Final Delivery & Client Sign-Off",
        route: "/portal/client/book-service",
        endpoint: "GET /api/client-services/requests?clientId=[id]",
        table: "service_requests",
        details: "Client views green 'Work Delivered & Completed' card, downloads assets, reviews team summary note, and communicates follow-ups via direct TL Chat."
      }
    ]
  },
  {
    id: "attendance",
    title: "Biometric, Web Punch & Break Tracking Flow",
    subtitle: "Biometric Hardware Sync, Immutable Web Punching, Break Logger & Auto-Close Daemon",
    role: "All Employees & HR",
    badgeColor: "#10b981",
    icon: <FiClock />,
    description: "Employee daily time tracking: wall-clock punch-in/out, biometric device synchronization, categorized break logging (Tea/Lunch/Personal), live net hours calculation, and automated midnight auto-closing.",
    steps: [
      {
        number: "01",
        actor: "Employee / Hardware",
        actorColor: "#10b981",
        title: "Punch-In Event Captured",
        route: "/employee-dashboard or Biometric Machine",
        endpoint: "POST /api/attendance/punch or /api/attendance/biometric",
        table: "attendance_records",
        details: "Employee punches in via web widget or office fingerprint scanner. The system logs immutable punchInTime and sets punchedIn: true."
      },
      {
        number: "02",
        actor: "Employee",
        actorColor: "#f59e0b",
        title: "Categorized Break Logging",
        route: "/employee-dashboard",
        endpoint: "POST /api/attendance/punch (action: start_break)",
        table: "attendance_breaks",
        details: "Employee selects Tea Break, Lunch Break, or Personal Break. The work timer pauses and a live second-by-second break counter activates."
      },
      {
        number: "03",
        actor: "Desktop Agent",
        actorColor: "#2563eb",
        title: "Background Screenshot Capture",
        route: "Windows System Tray Agent",
        endpoint: "POST /api/screenshots/upload",
        table: "employee_screenshots",
        details: "While punched in and working, the desktop agent silently captures multi-screen previews at randomized intervals and uploads them to the server."
      },
      {
        number: "04",
        actor: "System Engine",
        actorColor: "#0f766e",
        title: "Net Productive Hours Math",
        route: "/employee-dashboard",
        endpoint: "GET /api/attendance/status",
        table: "attendance_records, attendance_breaks",
        details: "System calculates Net Work Hours = (Punch Out - Punch In) - Total Completed Breaks, factoring in shift tolerances and late check-in rules."
      },
      {
        number: "05",
        actor: "Background Cron",
        actorColor: "#6366f1",
        title: "Automated Midnight Auto-Close",
        route: "Server Cron Daemon",
        endpoint: "POST /api/attendance/auto-close",
        table: "attendance_records",
        details: "At midnight, the daemon identifies unclosed shifts, stamps auto-close markers, and flags records for HR review or regularization."
      }
    ]
  },
  {
    id: "hardware",
    title: "Hardware Inventory & IT Ticket Resolution Flow",
    subtitle: "Asset Registration, QR Tagging, Employee Quotas, Diagnostic Lifecycles & Spec Upgrades",
    role: "IT Engineer & Admin",
    badgeColor: "#06b6d4",
    icon: <FiMonitor />,
    description: "Physical hardware governance: laptop/MacBook asset tagging, assign/unassign handovers, employee 5-ticket complaint limits, hardware diagnostics, and RAM/SSD upgrade logging.",
    steps: [
      {
        number: "01",
        actor: "IT Engineer",
        actorColor: "#06b6d4",
        title: "System Hardware Registration",
        route: "/admin/systems",
        endpoint: "POST /api/systems",
        table: "systems",
        details: "IT Support logs serial numbers, processor, RAM, SSD, and operating system. A printable QR code asset label is generated for physical tagging."
      },
      {
        number: "02",
        actor: "IT Engineer",
        actorColor: "#06b6d4",
        title: "Assignment & Handover Audit",
        route: "/admin/systems",
        endpoint: "POST /api/db (action: ASSIGN_SYSTEM)",
        table: "assignment_history, systems",
        details: "The system is assigned to an employee. Handover date, condition notes, and employee acknowledgments are permanently logged in history."
      },
      {
        number: "03",
        actor: "Team Member",
        actorColor: "#ec4899",
        title: "Complaint Ticket Raised",
        route: "/employee-dashboard",
        endpoint: "POST /api/tickets",
        table: "tickets, employees.ticketLimit",
        details: "Employee raises a hardware issue (e.g. slow PC, broken keyboard, overheating). System verifies employee has not exceeded their 5-ticket quota."
      },
      {
        number: "04",
        actor: "IT Support Desk",
        actorColor: "#f59e0b",
        title: "Diagnostic, Upgrade & Resolution",
        route: "/admin/tickets & /it-support",
        endpoint: "PUT /api/tickets/[id], POST /api/spec-upgrades",
        table: "tickets, systems, spec_upgrade_history",
        details: "IT Engineer claims ticket, moves to 'In Progress', diagnoses the hardware, logs any RAM/SSD upgrades, and marks the ticket 'Resolved'."
      }
    ]
  },
  {
    id: "recruitment",
    title: "HR Recruitment & Document Vault Flow",
    subtitle: "Candidate Registration, Timed Skill Testing, HR Scoring, Onboarding & Compliance Verification",
    role: "HR & Candidate",
    badgeColor: "#ec4899",
    icon: <FiBriefcase />,
    description: "Talent acquisition to employee onboarding: career portal applications, automated candidate test execution, HR evaluation, conversion to staff roster, and document compliance checks.",
    steps: [
      {
        number: "01",
        actor: "Applicant",
        actorColor: "#ec4899",
        title: "Application Registration",
        route: "/careers/register",
        endpoint: "POST /api/candidates/register",
        table: "employees (role: candidate)",
        details: "Applicant submits resume, contact info, and desired role (Development, Design, Marketing)."
      },
      {
        number: "02",
        actor: "Candidate",
        actorColor: "#ec4899",
        title: "Timed Assessment Test",
        route: "/candidate-dashboard",
        endpoint: "POST /api/candidates/submit-test",
        table: "candidate_tests",
        details: "Candidate logs into the test portal and answers timed technical questions with automated submission upon time expiry."
      },
      {
        number: "03",
        actor: "HR Team",
        actorColor: "#8b5cf6",
        title: "Evaluation & Selection",
        route: "/admin/recruitment",
        endpoint: "POST /api/candidates/evaluate-test, POST /api/candidates/approve",
        table: "employees",
        details: "HR scores the test submission, adds interviewer feedback, and clicks 'Approve & Onboard' to convert candidate into an official Employee."
      },
      {
        number: "04",
        actor: "Admin / HR",
        actorColor: "#3b82f6",
        title: "Document Vault & Compliance Meter",
        route: "/admin/users",
        endpoint: "POST /api/employees/[id]/documents",
        table: "employees.documents",
        details: "HR uploads mandatory verification proofs (Resume, Govt ID, Address proof, Offer letter). The dynamic Compliance Gauge reaches 100% when all 4 are verified."
      }
    ]
  },
  {
    id: "chat",
    title: "Real-Time Collaboration & Dual Chat Hubs",
    subtitle: "Socket.IO Powered Bidirectional Messaging: Internal Team Sprint Chat & External Client-to-TL Channel",
    role: "Team Leader, Member & Client",
    badgeColor: "#7c3aed",
    icon: <FiMessageSquare />,
    description: "Real-time communication across organizational layers: Team Chat enables rapid sprint alignment between Team Leaders and members, while Client Chat provides clients a direct line to their designated account lead.",
    steps: [
      {
        number: "01",
        actor: "Socket.IO Gateway",
        actorColor: "#7c3aed",
        title: "WebSocket Connection Established",
        route: "/api/chat",
        endpoint: "WSS /socket.io",
        table: "chat_sessions",
        details: "Client and employee devices establish persistent WebSocket connections with automatic room joining based on role and project IDs."
      },
      {
        number: "02",
        actor: "TL & Team Member",
        actorColor: "#2563eb",
        title: "Internal Team Chat Session",
        route: "/portal/leader/team-chat",
        endpoint: "POST /api/chat (type: team)",
        table: "chat_messages",
        details: "Team Leader and members exchange instant messages, asset links, and sprint blockers with live typing indicators and read receipts."
      },
      {
        number: "03",
        actor: "Client & TL",
        actorColor: "#8b5cf6",
        title: "Client-to-TL Communication Hub",
        route: "/portal/leader/client-chat",
        endpoint: "POST /api/chat (type: client)",
        table: "chat_messages, service_requests",
        details: "Corporate clients message their designated Team Leader to clarify briefs, request campaign tweaks, and discuss deliverables."
      },
      {
        number: "04",
        actor: "Notification Daemon",
        actorColor: "#10b981",
        title: "Toast & Email Notification Dispatch",
        route: "Background Dispatcher",
        endpoint: "POST /api/notifications",
        table: "notifications",
        details: "When a user is offline or tab is unfocused, the system triggers browser toast alerts and email digests to ensure prompt replies."
      }
    ]
  },
  {
    id: "security",
    title: "Authentication, Inactive Gate & Recovery Flow",
    subtitle: "Dual-Layer Bcrypt+Pepper Hashing, OTP Verification, Inactive Access Gate & Autonomous Recovery",
    role: "System Security",
    badgeColor: "#f43f5e",
    icon: <FiLock />,
    description: "Identity and session protection: bcrypt hashing with secret pepper salt, one-time login codes via SMTP, portal deactivation screen for suspended accounts, and real-time database reactivation detection.",
    steps: [
      {
        number: "01",
        actor: "User",
        actorColor: "#3b82f6",
        title: "Credentials Submission",
        route: "/login",
        endpoint: "POST /api/login",
        table: "employees",
        details: "User enters email/username and password. Server appends cryptographic pepper salt before Bcrypt hash comparison."
      },
      {
        number: "02",
        actor: "System Engine",
        actorColor: "#f59e0b",
        title: "OTP Verification Challenge",
        route: "/login",
        endpoint: "POST /api/login/request-otp, POST /api/login/verify-otp",
        table: "login_otps",
        details: "Mandatory for HR and DNS Manager roles: a 6-digit code is dispatched via Nodemailer SMTP. System validates expiration and marks code as used."
      },
      {
        number: "03",
        actor: "Gate Keeper",
        actorColor: "#ef4444",
        title: "Inactive Account Interception",
        route: "/inactive-account",
        endpoint: "Response Status 403 (isInactive: true)",
        table: "employees (status: Inactive)",
        details: "If account status is Inactive, Paused, or Suspended, the portal completely strips the sidebar and header, redirecting to the dedicated /inactive-account page."
      },
      {
        number: "04",
        actor: "Background Listener",
        actorColor: "#10b981",
        title: "Autonomous Reactivation Stream",
        route: "/inactive-account",
        endpoint: "GET /api/employees/[id] (polled every 12s)",
        table: "employees",
        details: "While the inactive page is open, it autonomous-polls the database. As soon as an Admin switches status back to 'Active', the screen celebrates and auto-routes to dashboard."
      }
    ]
  }
];

export default function SystemFlowPage() {
  const [selectedModule, setSelectedModule] = useState(FLOW_MODULES[0].id);
  const [selectedRoleTab, setSelectedRoleTab] = useState(ROLES_DIRECTORY[0].roleName);
  const [searchFilter, setSearchFilter] = useState("");

  // Guarantee 100vw layout across widescreen monitors by overriding body flex-row
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("page-full-width");
    const prevDisplay = document.body.style.display;
    const prevFlexDir = document.body.style.flexDirection;
    const prevWidth = document.body.style.width;

    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";
    document.body.style.width = "100%";
    document.body.style.minWidth = "100vw";

    return () => {
      document.body.classList.remove("page-full-width");
      document.body.style.display = prevDisplay;
      document.body.style.flexDirection = prevFlexDir;
      document.body.style.width = prevWidth;
    };
  }, []);

  const activeModuleData = FLOW_MODULES.find((m) => m.id === selectedModule) || FLOW_MODULES[0];
  const activeRoleData = ROLES_DIRECTORY.find((r) => r.roleName === selectedRoleTab) || ROLES_DIRECTORY[0];

  const filteredSteps = activeModuleData.steps.filter(
    (s) =>
      s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.actor.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.details.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.endpoint.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flow-page-root page-standalone">
      {/* Top Header */}
      <header className="flow-top-header">
        <div className="flow-brand-area">
          <Logo height="32px" />
          <div className="flow-brand-separator" />
          <div className="flow-page-badge">
            <FiCompass />
            <span>PLATFORM ARCHITECTURE & FLOW MAP</span>
          </div>
        </div>

        <div className="flow-header-actions">
          <Link href="/admin" className="header-admin-link">
            <FiShield />
            <span>Admin Console</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flow-main-container">
        {/* Hero Section */}
        <section className="flow-hero-banner">
          <div className="hero-tag">ENTERPRISE PLATFORM BLUEPRINT</div>
          <h1 className="hero-title">
            DeviceDesk <span className="highlight-text">Complete System & Workflow Map</span>
          </h1>
          <p className="hero-subtitle">
            An end-to-end architectural guide illustrating the client-to-delivery lifecycle, department roles, before-and-after quality audits, attendance engines, and real-time collaboration subsystems.
          </p>
        </section>

        {/* SECTION 1: THE COMPLETE CLIENT-TO-DELIVERY WORKFLOW (WITH BEFORE/AFTER MATCH) */}
        <section className="workflow-master-section">
          <div className="section-title-wrap">
            <span className="section-pill">CORE REVENUE ENGINE</span>
            <h2 className="section-heading-large">
              Client Service Lifecycle: From Onboarding to Verified Delivery
            </h2>
            <p className="section-subtext-large">
              Step-by-step breakdown showing how client requirements are scoped, delegated to specialists, executed under desktop monitoring, matched before-and-after by the TL, and delivered.
            </p>
          </div>

          <div className="lifecycle-stepper-grid">
            {CLIENT_LIFECYCLE_STAGES.map((stg) => (
              <div key={stg.step} className="stepper-card">
                <div className="stepper-header">
                  <span className="stepper-num" style={{ borderColor: stg.badgeColor, color: stg.badgeColor }}>
                    {stg.step}
                  </span>
                  <div className="stepper-actor-pill" style={{ backgroundColor: `${stg.badgeColor}15`, color: stg.badgeColor, borderColor: `${stg.badgeColor}30` }}>
                    {stg.actor}
                  </div>
                </div>

                <h3 className="stepper-title">{stg.title}</h3>
                <p className="stepper-summary">{stg.summary}</p>

                <div className="stepper-details-list">
                  {stg.details.map((d, i) => (
                    <div key={i} className="stepper-detail-item">
                      <FiCheck className="detail-check-icon" style={{ color: stg.badgeColor }} />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* SIDE-BY-SIDE BEFORE VS AFTER QUALITY AUDIT VISUALIZER */}
          <div className="audit-visualizer-card">
            <div className="audit-vis-header">
              <div>
                <span className="vis-badge">STAGE 05 DEEP DIVE</span>
                <h3 className="vis-title">Team Leader "Before vs. After" Quality Match Visualizer</h3>
                <p className="vis-desc">
                  How the Team Leader inspects the original Client Scope against the Employee Deliverables inside the Leader Verification Modal before approving final delivery.
                </p>
              </div>
              <div className="vis-status-badge">
                <FiCheckCircle />
                <span>Ready For Client Dispatch</span>
              </div>
            </div>

            <div className="audit-columns-grid">
              {/* Before: Client Scope */}
              <div className="audit-col before-col">
                <div className="col-header">
                  <span className="col-tag before-tag">BEFORE • CLIENT REQUIREMENTS</span>
                  <h4>Original Project Scope</h4>
                </div>
                <div className="col-body">
                  <div className="audit-field">
                    <span className="field-lbl">Client Entity</span>
                    <span className="field-val">Fly Retailer Global Corp</span>
                  </div>
                  <div className="audit-field">
                    <span className="field-lbl">Selected Service</span>
                    <span className="field-val highlight">E-Commerce SEO & Social Media Package</span>
                  </div>
                  <div className="audit-field">
                    <span className="field-lbl">Client Brief & Guidelines</span>
                    <p className="field-box">
                      "Need 12 holiday promotional banner creatives (1080x1080) for Instagram & Facebook, plus full on-page SEO audit and meta tag schema updates for 48 apparel product pages. Follow our brand guide attached in Drive."
                    </p>
                  </div>
                  <div className="audit-field">
                    <span className="field-lbl">Reference Assets</span>
                    <div className="link-token">
                      📁 Google Drive Folder: fmt_holiday_brand_guidelines_2026/
                    </div>
                    <div className="link-token" style={{ marginTop: 6 }}>
                      📄 Attachment: product_catalog_brief_v2.pdf
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Indicator Arrow */}
              <div className="audit-match-center">
                <div className="match-pill">
                  <FiCheck className="match-check" />
                  <span>TL AUDIT MATCH</span>
                </div>
                <div className="match-divider" />
              </div>

              {/* After: Employee Deliverables */}
              <div className="audit-col after-col">
                <div className="col-header">
                  <span className="col-tag after-tag">AFTER • TEAM DELIVERABLES</span>
                  <h4>Completed Employee Submission</h4>
                </div>
                <div className="col-body">
                  <div className="audit-field">
                    <span className="field-lbl">Assigned Specialists</span>
                    <span className="field-val">Harsh (Dev Specialist) & Pardeep (Creative Lead)</span>
                  </div>
                  <div className="audit-field">
                    <span className="field-lbl">Execution Status</span>
                    <span className="field-val highlight-green">● Completed & Proofs Uploaded</span>
                  </div>
                  <div className="audit-field">
                    <span className="field-lbl">Team Completion Summary Note</span>
                    <p className="field-box field-box-green">
                      "All 12 carousel creatives designed according to color hex codes in brand guidelines. 48 apparel product pages audited; Title tags, meta descriptions, Alt tags, and schema.org JSON-LD snippets successfully deployed and verified on staging."
                    </p>
                  </div>
                  <div className="audit-field">
                    <span className="field-lbl">Delivered Artifacts</span>
                    <div className="link-token green-token">
                      📦 Package: holiday_social_creatives_final_12x.zip
                    </div>
                    <div className="link-token green-token" style={{ marginTop: 6 }}>
                      📊 Report: onpage_seo_audit_and_schema_validation.pdf
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTERACTIVE DEPARTMENT & ROLE EXPLORER */}
        <section className="roles-master-section">
          <div className="section-title-wrap">
            <span className="section-pill">GOVERNANCE & RESPONSIBILITIES</span>
            <h2 className="section-heading-large">
              Department Roles & Operational Permissions
            </h2>
            <p className="section-subtext-large">
              Select any role to view their primary objectives, what they are able to do in the platform, operational boundaries, and security protocols.
            </p>
          </div>

          <div className="role-tabs-bar">
            {ROLES_DIRECTORY.map((r) => (
              <button
                key={r.roleName}
                type="button"
                onClick={() => setSelectedRoleTab(r.roleName)}
                className={`role-tab-pill ${selectedRoleTab === r.roleName ? "active" : ""}`}
              >
                <span>{r.roleName}</span>
              </button>
            ))}
          </div>

          <div className="role-showcase-card">
            <div className="role-card-top">
              <div>
                <div className="role-badge-row">
                  <span className="dept-tag" style={{ backgroundColor: `${activeRoleData.badgeColor}15`, color: activeRoleData.badgeColor, borderColor: `${activeRoleData.badgeColor}30` }}>
                    {activeRoleData.department}
                  </span>
                  <span className="db-role-tag">DB Role: {activeRoleData.dbRole}</span>
                </div>
                <h3 className="role-showcase-title">{activeRoleData.roleName}</h3>
                <p className="role-objective">{activeRoleData.objective}</p>
              </div>
            </div>

            <div className="role-grid-details">
              {/* Permissions Box */}
              <div className="perm-box can-do">
                <div className="box-header">
                  <FiCheckCircle className="box-icon green-icon" />
                  <h4>What They Are Able to Do (Key Permissions)</h4>
                </div>
                <ul className="perm-list">
                  {activeRoleData.permissions.map((p, idx) => (
                    <li key={idx}>
                      <span className="bullet-dot green-dot" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Boundaries Box */}
              <div className="perm-box cannot-do">
                <div className="box-header">
                  <FiX className="box-icon red-icon" />
                  <h4>Operational Boundaries (What They Cannot Do)</h4>
                </div>
                <ul className="perm-list">
                  {activeRoleData.boundaries.map((b, idx) => (
                    <li key={idx}>
                      <span className="bullet-dot red-dot" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="security-notice-box">
                  <FiLock className="sec-icon" />
                  <div>
                    <strong>Security & Compliance:</strong>
                    <p>{activeRoleData.securityNote}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CORE PLATFORM ENGINES & SUBSYSTEMS */}
        <section className="engines-master-section">
          <div className="section-title-wrap">
            <span className="section-pill">TECHNICAL SUB-SYSTEMS</span>
            <h2 className="section-heading-large">
              Main System Functionalities & Architecture
            </h2>
            <p className="section-subtext-large">
              The fundamental engines powering DeviceDesk, including desktop screenshot auditing, biometrics, break calculations, dual real-time chat hubs, and IT asset tickets.
            </p>
          </div>

          <div className="engines-cards-grid">
            {PLATFORM_ENGINES.map((eng) => (
              <div key={eng.title} className="engine-card">
                <div className="eng-top-row">
                  <div className="eng-icon-box" style={{ color: eng.color, backgroundColor: `${eng.color}15` }}>
                    {eng.icon}
                  </div>
                  <span className="eng-badge" style={{ color: eng.color, borderColor: `${eng.color}30` }}>
                    {eng.badge}
                  </span>
                </div>

                <h3 className="eng-title">{eng.title}</h3>
                <p className="eng-desc">{eng.description}</p>

                <div className="eng-caps-list">
                  {eng.keyCapabilities.map((c, i) => (
                    <div key={i} className="eng-cap-item">
                      <span className="cap-dash" style={{ backgroundColor: eng.color }} />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: INTERACTIVE SYSTEM FLOW TIMELINES (6 MODULES) */}
        <section className="flow-display-card">
          <div className="module-summary-bar">
            <div>
              <div className="module-eyebrow">
                <span className="eyebrow-pill" style={{ borderColor: activeModuleData.badgeColor, color: activeModuleData.badgeColor }}>
                  {activeModuleData.role}
                </span>
                <span className="steps-count-pill">{activeModuleData.steps.length} STAGES</span>
              </div>
              <h2 className="module-display-title">{activeModuleData.title}</h2>
              <p className="module-display-desc">{activeModuleData.description}</p>
            </div>

            {/* Quick Search */}
            <div className="search-box-wrap">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search stages, APIs or models..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="flow-search-input"
              />
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <div className="flow-module-tabs">
            {FLOW_MODULES.map((mod) => {
              const isActive = mod.id === selectedModule;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setSelectedModule(mod.id);
                    setSearchFilter("");
                  }}
                  className={`module-tab-btn ${isActive ? "active" : ""}`}
                >
                  <span className="tab-icon">{mod.icon}</span>
                  <span className="tab-title">{mod.title.split(" Flow")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Flow Timeline */}
          <div className="flow-timeline">
            {filteredSteps.map((step, idx) => (
              <div className="timeline-node" key={step.number}>
                {/* Node Connector Line */}
                {idx < filteredSteps.length - 1 && <div className="timeline-connector-line" />}

                {/* Left Number / Badge */}
                <div className="node-marker-wrap">
                  <div className="node-marker" style={{ borderColor: step.actorColor, color: step.actorColor }}>
                    {step.number}
                  </div>
                  <span className="actor-label" style={{ color: step.actorColor }}>
                    {step.actor}
                  </span>
                </div>

                {/* Content Box */}
                <div className="node-content-card">
                  <div className="node-card-top">
                    <div>
                      <h3 className="node-step-title">{step.title}</h3>
                      <p className="node-step-details">{step.details}</p>
                    </div>
                  </div>

                  {/* Technical Metadata Pills */}
                  <div className="node-meta-pills">
                    {step.endpoint && (
                      <div className="meta-pill endpoint-pill">
                        <FiCpu className="pill-icon" />
                        <code>{step.endpoint}</code>
                      </div>
                    )}
                    {step.table && (
                      <div className="meta-pill table-pill">
                        <FiDatabase className="pill-icon" />
                        <span>Tables: {step.table}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5: WORKSPACE LAUNCHPAD (HIGH LEVEL SUMMARIES) */}
        <section className="portal-launchpad">
          <h2 className="section-heading" style={{ marginBottom: "1.25rem" }}>
            <FiLayers style={{ marginRight: 8, color: "#8b5cf6" }} />
            Direct Workspace Launchpad
          </h2>

          <div className="launchpad-grid">
            <Link href="/admin" className="launch-tile tile-admin">
              <div className="launch-icon-box"><FiShield /></div>
              <div className="launch-text">
                <strong>Admin Command Center</strong>
                <span>Overall operations, systems, users & approvals</span>
              </div>
            </Link>

            <Link href="/portal/leader" className="launch-tile tile-leader">
              <div className="launch-icon-box"><FiUsers /></div>
              <div className="launch-text">
                <strong>Team Leader Workspace</strong>
                <span>Client requests, member delegation & review</span>
              </div>
            </Link>

            <Link href="/employee-dashboard" className="launch-tile tile-emp">
              <div className="launch-icon-box"><FiActivity /></div>
              <div className="launch-text">
                <strong>Employee Workspace</strong>
                <span>Task board, punch attendance & service tickets</span>
              </div>
            </Link>

            <Link href="/portal/client" className="launch-tile tile-client">
              <div className="launch-icon-box"><FiCreditCard /></div>
              <div className="launch-text">
                <strong>Client Portal</strong>
                <span>Service ordering, monthly SEO & creative proofs</span>
              </div>
            </Link>

            <Link href="/kiosk" className="launch-tile tile-kiosk">
              <div className="launch-icon-box"><FiClock /></div>
              <div className="launch-text">
                <strong>Attendance Kiosk Station</strong>
                <span>Full-screen QR badge scanner station</span>
              </div>
            </Link>

            <Link href="/inactive-account" className="launch-tile tile-inactive">
              <div className="launch-icon-box"><FiLock /></div>
              <div className="launch-text">
                <strong>Inactive Security Gate</strong>
                <span>Account deactivation notice with auto-recovery</span>
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* STYLED JSX */}
      <style jsx>{`
        :global(body) {
          flex-direction: column !important;
          width: 100% !important;
          min-width: 100vw !important;
          overflow-x: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .flow-page-root {
          --bg: #f8fafc;
          --surface: #ffffff;
          --surface-alt: #f1f5f9;
          --ink: #0f172a;
          --muted: #64748b;
          --line: #e2e8f0;
          --accent: #0f766e;
          --accent-cyan: #0284c7;
          --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.04);
          min-height: 100vh;
          width: 100% !important;
          min-width: 100vw !important;
          flex: 1 1 100% !important;
          box-sizing: border-box !important;
          background: var(--bg);
          color: var(--ink);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        :global([data-theme="dark"]) .flow-page-root,
        :global(.dark) .flow-page-root {
          --bg: #090d16;
          --surface: #111827;
          --surface-alt: #1e293b;
          --ink: #f8fafc;
          --muted: #94a3b8;
          --line: #1e293b;
          --accent: #14b8a6;
          --accent-cyan: #38bdf8;
          --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        /* Top Header */
        .flow-top-header {
          width: 100% !important;
          box-sizing: border-box !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem clamp(1.25rem, 5vw, 3.5rem);
          border-bottom: 1px solid var(--line);
          background: var(--surface);
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
        }

        .flow-brand-area {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .flow-brand-separator {
          height: 20px;
          width: 1px;
          background: var(--line);
        }

        .flow-page-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--accent);
          background: rgba(15, 118, 110, 0.08);
          border: 1px solid rgba(15, 118, 110, 0.2);
          padding: 3px 10px;
          border-radius: 20px;
        }

        .flow-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-admin-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 8px;
          background: var(--surface-alt);
          color: var(--ink);
          border: 1px solid var(--line);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .header-admin-link:hover {
          background: var(--line);
        }

        /* Main Container */
        .flow-main-container {
          width: 100% !important;
          max-width: 1360px !important;
          margin: 0 auto !important;
          padding: 2.5rem clamp(1rem, 4vw, 2.5rem) 4rem;
          display: flex;
          flex-direction: column;
          gap: 3.5rem;
          box-sizing: border-box !important;
        }

        /* Hero Banner */
        .flow-hero-banner {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
        }

        .hero-tag {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--accent-cyan);
          text-transform: uppercase;
        }

        .hero-title {
          font-size: clamp(2.2rem, 5vw, 3.2rem);
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin: 0;
          color: var(--ink);
        }

        .highlight-text {
          background: linear-gradient(135deg, #0284c7 0%, #0f766e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.05rem;
          line-height: 1.6;
          color: var(--muted);
          max-width: 800px;
          margin: 0;
        }

        /* Section Title Wrappers */
        .section-title-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.5rem;
          margin-bottom: 1.75rem;
        }

        .section-pill {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent);
          background: rgba(15, 118, 110, 0.08);
          border: 1px solid rgba(15, 118, 110, 0.2);
          padding: 3px 12px;
          border-radius: 12px;
        }

        .section-heading-large {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin: 0;
        }

        .section-subtext-large {
          font-size: 0.95rem;
          color: var(--muted);
          max-width: 780px;
          line-height: 1.55;
          margin: 0;
        }

        /* =====================================
           SECTION 1: CLIENT LIFECYCLE STEPPER
           ===================================== */
        .lifecycle-stepper-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .stepper-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          position: relative;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .stepper-card:hover {
          transform: translateY(-2px);
          border-color: rgba(2, 132, 199, 0.35);
        }

        .stepper-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stepper-num {
          font-size: 1.15rem;
          font-weight: 900;
          border-bottom: 2px solid;
          padding-bottom: 2px;
        }

        .stepper-actor-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid;
        }

        .stepper-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }

        .stepper-summary {
          font-size: 0.88rem;
          color: var(--muted);
          line-height: 1.5;
          margin: 0;
        }

        .stepper-details-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          background: var(--surface-alt);
          padding: 0.85rem;
          border-radius: 10px;
          margin-top: auto;
        }

        .stepper-detail-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.82rem;
          line-height: 1.45;
          color: var(--ink);
        }

        .detail-check-icon {
          flex-shrink: 0;
          margin-top: 3px;
        }

        /* AUDIT VISUALIZER (BEFORE VS AFTER) */
        .audit-visualizer-card {
          background: var(--surface);
          border: 1.5px solid rgba(15, 118, 110, 0.35);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .audit-vis-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--line);
        }

        .vis-badge {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #e11d48;
          background: rgba(225, 29, 72, 0.08);
          border: 1px solid rgba(225, 29, 72, 0.2);
          padding: 3px 10px;
          border-radius: 12px;
          display: inline-block;
          margin-bottom: 6px;
        }

        .vis-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }

        .vis-desc {
          font-size: 0.9rem;
          color: var(--muted);
          margin: 4px 0 0 0;
          max-width: 720px;
        }

        .vis-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 30px;
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #15803d;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .audit-columns-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1.5rem;
          align-items: stretch;
        }

        .audit-col {
          border-radius: 14px;
          border: 1px solid var(--line);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: var(--surface-alt);
        }

        .before-col {
          border-left: 4px solid #3b82f6;
        }

        .after-col {
          border-left: 4px solid #10b981;
        }

        .col-header h4 {
          font-size: 1.05rem;
          font-weight: 800;
          margin: 4px 0 0 0;
          color: var(--ink);
        }

        .col-tag {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .before-tag {
          color: #2563eb;
        }

        .after-tag {
          color: #059669;
        }

        .audit-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 0.75rem;
        }

        .field-lbl {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
        }

        .field-val {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--ink);
        }

        .highlight {
          color: #2563eb;
        }

        .highlight-green {
          color: #059669;
        }

        .field-box {
          font-size: 0.85rem;
          line-height: 1.5;
          background: var(--surface);
          border: 1px solid var(--line);
          padding: 10px;
          border-radius: 8px;
          color: var(--ink);
          margin: 0;
        }

        .field-box-green {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #14532d;
        }

        .link-token {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 6px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          word-break: break-all;
        }

        .green-token {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #065f46;
        }

        .audit-match-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 0.5rem;
        }

        .match-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: #0f766e;
          color: #ffffff;
          padding: 12px 10px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 800;
          text-align: center;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
        }

        .match-check {
          font-size: 1.25rem;
        }

        /* =====================================
           SECTION 2: ROLES & RESPONSIBILITIES
           ===================================== */
        .role-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .role-tab-pill {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--muted);
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .role-tab-pill:hover {
          background: var(--surface-alt);
          color: var(--ink);
        }

        .role-tab-pill.active {
          background: var(--ink);
          color: var(--surface);
          border-color: var(--ink);
        }

        :global([data-theme="dark"]) .role-tab-pill.active {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
        }

        .role-showcase-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .role-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--line);
        }

        .role-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .dept-tag {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid;
        }

        .db-role-tag {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--muted);
          background: var(--surface-alt);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .role-showcase-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }

        .role-objective {
          font-size: 0.95rem;
          color: var(--muted);
          line-height: 1.5;
          margin: 6px 0 0 0;
          max-width: 720px;
        }

        .role-grid-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
          gap: 1.75rem;
        }

        .perm-box {
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .can-do {
          background: rgba(16, 185, 129, 0.03);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .cannot-do {
          background: rgba(239, 68, 68, 0.03);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .box-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .box-header h4 {
          font-size: 0.98rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }

        .green-icon {
          color: #10b981;
          font-size: 1.25rem;
        }

        .red-icon {
          color: #ef4444;
          font-size: 1.25rem;
        }

        .perm-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .perm-list li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.88rem;
          line-height: 1.5;
          color: var(--ink);
        }

        .bullet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 8px;
        }

        .green-dot {
          background: #10b981;
        }

        .red-dot {
          background: #ef4444;
        }

        .security-notice-box {
          margin-top: auto;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(15, 118, 110, 0.06);
          border: 1px solid rgba(15, 118, 110, 0.2);
          font-size: 0.82rem;
          color: var(--ink);
        }

        .sec-icon {
          color: var(--accent);
          font-size: 1.15rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .security-notice-box p {
          margin: 2px 0 0 0;
          color: var(--muted);
        }

        /* =====================================
           SECTION 3: PLATFORM ENGINES
           ===================================== */
        .engines-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 1.5rem;
        }

        .engine-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 1.75rem;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .engine-card:hover {
          transform: translateY(-2px);
          border-color: rgba(2, 132, 199, 0.4);
        }

        .eng-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .eng-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
        }

        .eng-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid;
        }

        .eng-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }

        .eng-desc {
          font-size: 0.88rem;
          line-height: 1.55;
          color: var(--muted);
          margin: 0;
        }

        .eng-caps-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          margin-top: auto;
          padding-top: 0.75rem;
          border-top: 1px solid var(--line);
        }

        .eng-cap-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--ink);
        }

        .cap-dash {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* =====================================
           SECTION 4: TIMELINE FLOW MODULES
           ===================================== */
        .flow-display-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: clamp(1.5rem, 4vw, 2.5rem);
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .module-summary-bar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          border-bottom: 1px solid var(--line);
          padding-bottom: 1.5rem;
        }

        .module-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .eyebrow-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid;
        }

        .steps-count-pill {
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--muted);
        }

        .module-display-title {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin: 0;
        }

        .module-display-desc {
          font-size: 0.92rem;
          color: var(--muted);
          margin: 6px 0 0 0;
          max-width: 680px;
          line-height: 1.5;
        }

        .search-box-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface-alt);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 8px 14px;
          width: 100%;
          max-width: 320px;
        }

        .search-icon {
          color: var(--muted);
        }

        .flow-search-input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.88rem;
          color: var(--ink);
          width: 100%;
        }

        .flow-module-tabs {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .module-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--surface-alt);
          color: var(--muted);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .module-tab-btn:hover {
          color: var(--ink);
          border-color: rgba(2, 132, 199, 0.4);
        }

        .module-tab-btn.active {
          background: #0284c7;
          color: #ffffff;
          border-color: #0284c7;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
        }

        /* Timeline Nodes */
        .flow-timeline {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: relative;
        }

        .timeline-node {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          position: relative;
        }

        .timeline-connector-line {
          position: absolute;
          left: 21px;
          top: 48px;
          bottom: -32px;
          width: 2px;
          background: var(--line);
          z-index: 1;
        }

        .node-marker-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
          z-index: 2;
        }

        .node-marker {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid;
          display: grid;
          place-items: center;
          font-size: 0.95rem;
          font-weight: 900;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        .actor-label {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-align: center;
          max-width: 80px;
        }

        .node-content-card {
          flex: 1;
          background: var(--surface-alt);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .node-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .node-step-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }

        .node-step-details {
          font-size: 0.92rem;
          color: var(--muted);
          line-height: 1.55;
          margin: 6px 0 0 0;
        }

        .node-meta-pills {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding-top: 0.6rem;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 600;
        }

        .endpoint-pill {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .table-pill {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .pill-icon {
          font-size: 0.85rem;
        }

        /* =====================================
           SECTION 5: WORKSPACE LAUNCHPAD
           ===================================== */
        .portal-launchpad {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: clamp(1.5rem, 4vw, 2.5rem);
          box-shadow: var(--card-shadow);
        }

        .launchpad-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .launch-tile {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 1.25rem;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--surface-alt);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .launch-tile:hover {
          transform: translateY(-2px);
          border-color: rgba(2, 132, 199, 0.5);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
        }

        .launch-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .tile-admin .launch-icon-box {
          background: rgba(15, 118, 110, 0.1);
          color: #0f766e;
        }

        .tile-leader .launch-icon-box {
          background: rgba(37, 99, 235, 0.1);
          color: #2563eb;
        }

        .tile-emp .launch-icon-box {
          background: rgba(2, 132, 199, 0.1);
          color: #0284c7;
        }

        .tile-client .launch-icon-box {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        .tile-kiosk .launch-icon-box {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .tile-inactive .launch-icon-box {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .launch-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .launch-text strong {
          font-size: 0.96rem;
          color: var(--ink);
        }

        .launch-text span {
          font-size: 0.82rem;
          color: var(--muted);
          line-height: 1.35;
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
          .audit-columns-grid {
            grid-template-columns: 1fr;
          }
          .audit-match-center {
            padding: 1rem 0;
          }
        }

        @media (max-width: 768px) {
          .flow-top-header {
            padding: 0.85rem 1rem;
          }
          .flow-main-container {
            padding: 1.5rem 1rem 3rem;
            gap: 2.5rem;
          }
          .role-grid-details {
            grid-template-columns: 1fr;
          }
          .timeline-node {
            flex-direction: column;
            gap: 0.75rem;
          }
          .timeline-connector-line {
            display: none;
          }
          .node-marker-wrap {
            flex-direction: row;
            width: 100%;
            justify-content: flex-start;
          }
          .node-card-top {
            flex-direction: column;
          }
          .launchpad-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
