"use client";

import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth/AuthContext";
import {
  getSystems,
  getEmployees,
  getTickets,
  isSoundEnabled,
  setSoundEnabled,
  addSystem,
  updateSystem,
  deleteSystem,
  getTicketTimings,
  calculateDuration,
  formatDuration,
  createTicket,
  startTicketWork,
  resolveTicket,
  assignSystemToEmployee,
  addEmployee,
  removeEmployee,
  updateEmployee,
  getDepartments,
  addDepartment,
  deleteDepartment,
  getAssignmentHistory,
  logAssignmentChange,
  getTasks,
  addTask,
  updateTask,
  saveTasks
} from "./store.js";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Guard for Admin Role
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (user.role === "employee") {
      router.push("/employee-dashboard");
    }
  }, [user, router]);

  // Navigation & Role States
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("devicedesk_admin_view");
      if (saved) setCurrentView(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("devicedesk_admin_view", currentView);
    }
  }, [currentView]);

  const userRole = user?.role || "admin";
  // Team Leader scope — only sees their own department
  const isTeamLeader = user?.dbRole === "Team Leader";
  const leaderDepartment = user?.department || "";

  
  // Data States
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistorySys, setSelectedHistorySys] = useState(null);
  
  // Task Board States
  const [tasks, setTasks] = useState([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [perfChartTab, setPerfChartTab] = useState("daily"); // daily | weekly | monthly | yearly
  const [showEmpReportModal, setShowEmpReportModal] = useState(false);
  const [empReportTarget, setEmpReportTarget] = useState(null); // the employee object
  const [empReportFrom, setEmpReportFrom] = useState(""); // ISO date string yyyy-mm-dd
  const [empReportTo, setEmpReportTo] = useState("");     // ISO date string yyyy-mm-dd
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [perfPage, setPerfPage] = useState(1);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // App Config States
  const [soundOn, setSoundOn] = useState(true);
  const [fastTestMode, setFastTestMode] = useState(false);
  const [activeAudioAlert, setActiveAudioAlert] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Real-time re-renderer ticker
  const [now, setNow] = useState(Date.now());
  
  // Filter States
  const [sysSearch, setSysSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [sysFilterOS, setSysFilterOS] = useState("all");
  const [sysFilterStatus, setSysFilterStatus] = useState("all");
  
  // Modal Visibility States
  const [showSysModal, setShowSysModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Bulk Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importParsed, setImportParsed] = useState([]);
  const [importStatus, setImportStatus] = useState(null); // null | 'preview' | 'loading' | 'done'
  const [importResult, setImportResult] = useState(null);

  // Bulk Employee Import States
  const [showEmpImportModal, setShowEmpImportModal] = useState(false);
  const [empImportFile, setEmpImportFile] = useState(null);
  const [empImportParsed, setEmpImportParsed] = useState([]);
  const [empImportStatus, setEmpImportStatus] = useState(null); // null | 'preview' | 'loading' | 'done'
  const [empImportResult, setEmpImportResult] = useState(null);
  
  // Add Employee Form States
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpPassword, setNewEmpPassword] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("Team Member");
  const [newEmpDept, setNewEmpDept] = useState("");
  const [newEmpLimit, setNewEmpLimit] = useState(5);

  // Departments CRUD States
  const [newDeptName, setNewDeptName] = useState("");
  const [deptError, setDeptError] = useState("");

  // Searchable Employee Dropdown inside System Modal
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Modal Fields
  const [editingSys, setEditingSys] = useState({
    id: "", systemNumber: "", cpu: "", gpu: "", ram: "", storage: "", os: "", model: "", assignedTo: "", remarks: "", status: "Active"
  });
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState({
    id: "", name: "", email: "", role: "Team Member", department: "", ticketLimit: 5
  });
  const [assigningEmp, setAssigningEmp] = useState({ id: "", name: "" });
  const [assigningSysId, setAssigningSysId] = useState("");
  const [resolvingTicketId, setResolvingTicketId] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [selectedViewSystem, setSelectedViewSystem] = useState(null);
  const [selectedViewDept, setSelectedViewDept] = useState(null);

  // Raise Records Filter & Pagination States
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketFilterStatus, setTicketFilterStatus] = useState("all");
  const [ticketFilterSeverity, setTicketFilterSeverity] = useState("all");
  const [ticketPage, setTicketPage] = useState(1);
  const adminTicketsPerPage = 10;

  // Systems Pagination State
  const [sysPage, setSysPage] = useState(1);
  const sysPerPage = 10;

  // Employees Pagination State
  const [empPage, setEmpPage] = useState(1);
  const empPerPage = 10;
  const [empSearch, setEmpSearch] = useState("");
  
  // Employee Portal Form States
  const [portalEmployeeId, setPortalEmployeeId] = useState("");
  const [portalSystemId, setPortalSystemId] = useState("");
  const [portalCategory, setPortalCategory] = useState("RAM/Speed");
  const [portalSeverity, setPortalSeverity] = useState("Medium");
  const [portalDesc, setPortalDesc] = useState("");
  
  // Audio Context Ref
  const audioCtxRef = useRef(null);
  const prevTicketsRef = useRef([]);

  // Load Initial Database Data
  useEffect(() => {
    const loadData = () => {
      setSystems(getSystems());
      setEmployees(getEmployees());
      setTickets(getTickets());
      setAssignmentHistory(getAssignmentHistory());
      setTasks(getTasks());
      const depts = getDepartments();
      setDepartments(depts);
      if (depts.length > 0) {
        setNewEmpDept(prev => prev || depts[0].name);
      }
    };
    
    loadData();
    setSoundOn(isSoundEnabled());

    const enableAudio = () => {
      initAudio();
    };
    window.addEventListener('click', enableAudio, { once: true });

    window.addEventListener('devicedesk_db_synced', loadData);
    return () => {
      window.removeEventListener('devicedesk_db_synced', loadData);
      window.removeEventListener('click', enableAudio);
    };
  }, []);

  // Update ticking clocks every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Synthesizer functions
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playBeep = (frequency = 800, duration = 0.15, type = "sine") => {
    if (!soundOn) return;
    try {
      const ctx = initAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked or not ready:", e);
    }
  };

  const triggerNewTicketBeep = () => {
    if (!soundOn) return;
    try {
      const audio = new Audio("/work_alert.mp3");
      audio.volume = 0.5;
      audio.play().catch(e => {
        console.warn("Audio playback of work_alert.mp3 failed:", e);
        // Fallback to synth beep
        playBeep(880, 0.1, "sine");
        setTimeout(() => playBeep(1100, 0.15, "sine"), 100);
      });
    } catch (err) {
      // Fallback to synth beep
      playBeep(880, 0.1, "sine");
      setTimeout(() => playBeep(1100, 0.15, "sine"), 100);
    }
  };

  const triggerEscalationBeep = () => {
    if (!soundOn) return;
    try {
      const audio = new Audio("/work_alert.mp3");
      audio.volume = 0.5;
      audio.play().catch(e => {
        console.warn("Audio playback of escalation alert failed:", e);
        // Fallback to synth beep
        playBeep(440, 0.12, "sawtooth");
        setTimeout(() => playBeep(440, 0.12, "sawtooth"), 180);
      });
    } catch (err) {
      // Fallback to synth beep
      playBeep(440, 0.12, "sawtooth");
      setTimeout(() => playBeep(440, 0.12, "sawtooth"), 180);
    }
  };

  // Background timer loop for ticket escalation sound notifications
  useEffect(() => {
    const checker = setInterval(() => {
      if (userRole !== "admin") return;
      
      const openTickets = tickets.filter(t => t.status === "Open");
      if (openTickets.length === 0) {
        setActiveAudioAlert(false);
        return;
      }
      
      const limitMs = fastTestMode ? 30 * 1000 : 15 * 60 * 1000;
      const nowTime = Date.now();
      let shouldBeep = false;
      
      openTickets.forEach(ticket => {
        const elapsed = nowTime - new Date(ticket.createdAt).getTime();
        if (elapsed >= limitMs) {
          shouldBeep = true;
        }
      });
      
      if (shouldBeep) {
        setActiveAudioAlert(true);
        triggerEscalationBeep();
      } else {
        setActiveAudioAlert(false);
      }
    }, 10000); // scan every 10 seconds
    
    return () => clearInterval(checker);
  }, [tickets, userRole, fastTestMode, soundOn]);

  // Watch for new tickets and trigger a beep sound for the admin
  useEffect(() => {
    if (userRole !== "admin") return;
    
    const currentTickets = tickets;
    const prevTickets = prevTicketsRef.current;
    
    if (prevTickets.length > 0) {
      // Find open tickets in current list that were not in the previous list
      const newOpenTickets = currentTickets.filter(t => 
        t.status === "Open" && !prevTickets.some(pt => pt.id === t.id)
      );
      
      if (newOpenTickets.length > 0) {
        triggerNewTicketBeep();
      }
    }
    
    prevTicketsRef.current = currentTickets;
  }, [tickets, userRole]);

  // Audio initialize event listener on first click
  const handleBodyClick = () => {
    initAudio();
    setUserDropdownOpen(false);
  };

  // Event handlers
  const handleSoundToggle = () => {
    const newVal = !soundOn;
    setSoundOn(newVal);
    setSoundEnabled(newVal);
    if (newVal) {
      setTimeout(() => playBeep(880, 0.05), 50);
    }
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmpName,
          email: newEmpEmail,
          password: newEmpPassword,
          role: newEmpRole,
          department: newEmpDept,
          ticketLimit: newEmpLimit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add employee');

      // Refresh local state from server
      const { loadFromServer } = await import('./store.js');
      if (typeof loadFromServer === 'function') await loadFromServer();
      setEmployees(getEmployees());

    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      return;
    }

    setNewEmpName("");
    setNewEmpEmail("");
    setNewEmpPassword("");
    setNewEmpRole("Team Member");
    setNewEmpDept("Development");
    setNewEmpLimit(5);
    setShowAddEmpModal(false);
    playBeep(600, 0.1);
  };

  const handleOpenEditEmpModal = (emp) => {
    setEditingEmp({
      id: emp.id,
      name: emp.name,
      email: emp.email || "",
      role: emp.role,
      department: emp.department,
      ticketLimit: emp.ticketLimit || 5
    });
    setShowEditEmpModal(true);
    playBeep(600, 0.05);
  };

  const handleEditEmployeeSubmit = (e) => {
    e.preventDefault();
    if (!editingEmp.name.trim()) return;
    
    updateEmployee(editingEmp.id, {
      name: editingEmp.name.trim(),
      email: editingEmp.email.trim(),
      role: editingEmp.role,
      department: editingEmp.department,
      ticketLimit: Number(editingEmp.ticketLimit)
    });
    
    setShowEditEmpModal(false);
    setEmployees(getEmployees());
    playBeep(700, 0.1);
  };

  const handleRemoveEmployee = (empId) => {
    if (userRole !== 'admin') {
      Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Only admins can delete employees.' });
      return;
    }
    Swal.fire({
      title: 'Remove Employee?',
      text: 'This will also unassign all their devices.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (result.isConfirmed) {
        removeEmployee(empId);
        setEmployees(getEmployees());
        setSystems(getSystems());
        playBeep(400, 0.15, 'sawtooth');
      }
    });
  };

  const handleToggleEmployeeStatus = (emp) => {
    if (userRole !== 'admin') {
      Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Only admins can suspend accounts.' });
      return;
    }
    const isPaused = emp.status === 'Paused';
    const newStatus = isPaused ? 'Active' : 'Paused';
    const actionLabel = isPaused ? 'activate' : 'pause';
    
    Swal.fire({
      title: `${isPaused ? 'Activate' : 'Pause'} Account?`,
      text: `Are you sure you want to ${actionLabel} the account of ${emp.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionLabel}`,
      confirmButtonColor: isPaused ? '#10b981' : '#dc2626',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        updateEmployee(emp.id, { status: newStatus });
        setEmployees(getEmployees());
        playBeep(isPaused ? 700 : 400, 0.12);
        Swal.fire('Updated!', `Account of ${emp.name} has been ${isPaused ? 'activated' : 'paused'}.`, 'success');
      }
    });
  };
  
  const handleRemoveSystem = (sysId, sn) => {
    if (userRole !== 'admin') {
      Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Only admins can delete systems.' });
      return;
    }
    Swal.fire({
      title: `Delete System ${sn}?`,
      text: 'This will permanently remove this system and clear its assignments. This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (result.isConfirmed) {
        deleteSystem(sysId);
        setSystems(getSystems());
        playBeep(400, 0.15, 'sawtooth');
        Swal.fire('Deleted!', `System ${sn} has been deleted.`, 'success');
      }
    });
  };

  const handleDangerDelete = async (target, label) => {
    if (user?.dbRole !== 'Admin') {
      Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Only users with the Admin role can access the Danger Zone.' });
      return;
    }
    // Double confirmation
    const first = await Swal.fire({
      title: `Delete All ${label}?`,
      text: `This will permanently delete ALL ${label.toLowerCase()} records. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, delete all ${label}`,
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
    });
    if (!first.isConfirmed) return;

    const second = await Swal.fire({
      title: 'Are you absolutely sure?',
      input: 'text',
      inputPlaceholder: 'Type DELETE to confirm',
      inputAttributes: { autocapitalize: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Delete Now',
      confirmButtonColor: '#dc2626',
      preConfirm: (val) => {
        if (val !== 'DELETE') {
          Swal.showValidationMessage('You must type DELETE exactly');
          return false;
        }
        return true;
      }
    });
    if (!second.isConfirmed) return;

    try {
      const res  = await fetch('/api/danger-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      Swal.fire({ icon: 'success', title: 'Deleted!', text: `All ${label.toLowerCase()} have been permanently deleted.` });

      // Refresh local state
      const { loadFromServer } = await import('./store.js');
      if (typeof loadFromServer === 'function') await loadFromServer();
      setSystems(getSystems());
      setEmployees(getEmployees());
      setTickets(getTickets());
      setAssignmentHistory(getAssignmentHistory ? getAssignmentHistory() : []);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  const handleFastTestToggle = (e) => {
    const checked = e.target.checked;
    setFastTestMode(checked);
    playBeep(1000, 0.08);
  };

  const handleStartTicket = (ticketId) => {
    startTicketWork(ticketId);
    setTickets(getTickets());
    playBeep(950, 0.08, "sine");
  };

  const handleOpenResolveModal = (ticketId) => {
    setResolvingTicketId(ticketId);
    setResolveNotes("");
    setShowResolveModal(true);
  };

  const handleResolveTicketSubmit = (e) => {
    e.preventDefault();
    const ticket = resolveTicket(resolvingTicketId, resolveNotes);
    
    if (ticket && resolveNotes.toLowerCase().includes("ram")) {
      const sys = getSystems().find(s => s.id === ticket.systemId);
      if (sys) {
        sys.remarks = `Upgrade details: ${resolveNotes} (ticket ${ticket.id}). ` + sys.remarks;
        updateSystem(sys);
      }
    }
    
    setTickets(getTickets());
    setSystems(getSystems());
    setShowResolveModal(false);
    playBeep(1200, 0.15, "sine");
  };

  const handlePortalEmployeeChange = (empId) => {
    setPortalEmployeeId(empId);
    if (!empId) {
      setPortalSystemId("");
      return;
    }
    const assigned = systems.filter(s => s.assignedTo === empId);
    if (assigned.length > 0) {
      setPortalSystemId(assigned[0].id);
    } else {
      setPortalSystemId("");
    }
  };

  const handleComplaintSubmit = (e) => {
    e.preventDefault();
    if (!portalEmployeeId || !portalSystemId || !portalCategory || !portalDesc) {
      alert("Please fill in all details.");
      return;
    }
    
    createTicket(portalEmployeeId, portalSystemId, portalCategory, portalDesc, portalSeverity);
    
    // Refresh states
    setTickets(getTickets());
    
    // Trigger alarm sound immediately
    triggerNewTicketBeep();
    
    alert("Complaint Submitted Successfully! IT Desk has been alerted with an active sound alert.");
    
    // Reset form fields
    setPortalDesc("");
    setPortalCategory("RAM/Speed");
  };

  const handleExportTicketsToExcel = () => {
    // Define CSV headers
    const headers = ["Ticket ID", "Category", "Description", "Severity", "Status", "System ID", "System Number", "Raised By", "Employee Name", "Created At", "Started At", "Resolved At", "Resolution Remarks"];
    
    // Convert tickets to CSV rows
    const csvRows = [
      headers.join(","),
      ...tickets.map(t => {
        const row = [
          t.id,
          t.category,
          t.description ? `"${t.description.replace(/"/g, '""')}"` : "",
          t.severity,
          t.status,
          t.systemId,
          t.systemNumber,
          t.raisedBy || t.employeeId,
          t.raisedByName || "",
          t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
          t.startedAt ? new Date(t.startedAt).toLocaleString() : "",
          t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : "",
          t.resolutionRemarks || t.notes ? `"${(t.resolutionRemarks || t.notes).replace(/"/g, '""')}"` : ""
        ];
        return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
      })
    ];

    // Create CSV download trigger
    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `devicedesk_ticket_reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportHistoryToExcel = () => {
    const headers = ["Log ID", "Action", "System ID", "System Number", "Employee ID", "Employee Name", "Timestamp", "Assigned By"];
    const csvRows = [
      headers.join(","),
      ...filteredHistory.map(log => {
        const emp = employees.find(e => e.id === log.employeeId) || { name: "Unknown" };
        const row = [
          log.id,
          log.action,
          log.systemId,
          log.systemNumber,
          log.employeeId,
          emp.name,
          log.timestamp ? new Date(log.timestamp).toLocaleString() : "",
          log.assignedBy || "System"
        ];
        return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
      })
    ];

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `devicedesk_transfer_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSystemsToExcel = () => {
    const headers = ["System ID", "System Number", "Model", "OS", "CPU", "GPU", "RAM", "Storage", "Status", "Assigned To", "Employee Name", "Remarks"];
    const csvRows = [
      headers.join(","),
      ...systems.map(s => {
        const emp = employees.find(e => e.id === s.assignedTo) || { name: "Unassigned" };
        const row = [
          s.id,
          s.systemNumber,
          s.model || "Generic PC",
          s.os || "Windows 11 Pro",
          s.cpu || "Intel Core i5",
          s.gpu || "Integrated Graphics",
          s.ram || "16 GB",
          s.storage || "512 GB SSD",
          s.status || "Active",
          s.assignedTo || "Unassigned",
          emp.name,
          s.remarks ? `"${s.remarks.replace(/"/g, '""')}"` : ""
        ];
        return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
      })
    ];

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `devicedesk_systems_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ---- Bulk Import Systems from Excel/CSV ---- */
  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportStatus(null);
    setImportParsed([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        // Dynamically import xlsx from the installed package
        import('xlsx').then(XLSX => {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          setImportParsed(jsonRows);
          setImportStatus('preview');
        });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Parse Error', text: 'Could not read file: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (!importParsed.length) return;
    setImportStatus('loading');
    try {
      // Normalise column names — support both "System Number" header and camelCase
      const normalised = importParsed.map(row => ({
        systemNumber: row['System Number'] || row['systemNumber'] || row['system_number'] || '',
        model:        row['Model']         || row['model']        || '',
        os:           row['OS']            || row['os']           || '',
        cpu:          row['CPU']           || row['cpu']          || '',
        gpu:          row['GPU']           || row['gpu']          || '',
        ram:          row['RAM']           || row['ram']          || '',
        storage:      row['Storage']       || row['storage']      || '',
        status:       row['Status']        || row['status']       || 'Active',
        remarks:      row['Remarks']       || row['remarks']      || '',
        assignedTo:   row['Assigned To']   || row['Assigned Employee'] || row['Employee'] || row['assignedTo'] || '',
      }));

      const res = await fetch('/api/import-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systems: normalised }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');

      setImportResult(result);
      setImportStatus('done');

      // Refresh store
      const { loadFromServer } = await import('./store.js');
      if (typeof loadFromServer === 'function') loadFromServer();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Import Failed', text: err.message });
      setImportStatus('preview');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'System Number,Model,OS,CPU,GPU,RAM,Storage,Status,Assigned To,Remarks';
    const sample  = 'PC-001,Dell OptiPlex 7090,Windows 11 Pro,Intel Core i7-11700,Intel UHD 750,16 GB,512 GB SSD,Active,John Smith,';
    const csvStr  = '\uFEFF' + headers + '\n' + sample;
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'devicedesk_systems_import_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  /* ---- Bulk Import Employees from Excel/CSV ---- */
  const handleEmpImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEmpImportFile(file);
    setEmpImportStatus(null);
    setEmpImportParsed([]);
    setEmpImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      import('xlsx').then(XLSX => {
        const data = new Uint8Array(evt.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setEmpImportParsed(rows);
        setEmpImportStatus('preview');
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmEmpImport = async () => {
    if (!empImportParsed.length) return;
    setEmpImportStatus('loading');
    try {
      const normalised = empImportParsed.map(row => ({
        name:        row['Name']         || row['Employee Name'] || row['name']        || '',
        email:       row['Email']        || row['Email Address'] || row['email']       || '',
        password:    row['Password']     || row['Pass']          || row['password']    || '',
        role:        row['Role']         || row['role']          || 'Team Member',
        department:  row['Department']   || row['Dept']          || row['department']  || 'General',
        ticketLimit: row['Ticket Limit'] || row['ticketLimit']   || 5,
      }));

      const res    = await fetch('/api/import-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: normalised }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');

      setEmpImportResult(result);
      setEmpImportStatus('done');

      const { loadFromServer } = await import('./store.js');
      if (typeof loadFromServer === 'function') await loadFromServer();
      setEmployees(getEmployees());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Import Failed', text: err.message });
      setEmpImportStatus('preview');
    }
  };

  const handleDownloadEmpTemplate = () => {
    const headers = 'Name,Email,Password,Role,Department,Ticket Limit';
    const sample  = 'John Smith,john.smith@company.com,Pass@123,Team Member,Operations,5';
    const csvStr  = '\uFEFF' + headers + '\n' + sample;
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'devicedesk_employees_import_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleExportEmployeesToExcel = () => {
    const headers = ["Employee ID", "Name", "Email", "Role", "Department", "Ticket Limit", "Assigned Systems"];
    const csvRows = [
      headers.join(","),
      ...employees.map(e => {
        const assigned = systems.filter(sys => sys.assignedTo === e.id).map(sys => sys.systemNumber).join(" | ");
        const row = [
          e.id,
          e.name,
          e.email || "N/A",
          e.role || "Team Member",
          e.department || "Operations",
          e.ticketLimit || 5,
          assigned ? `"${assigned}"` : "None"
        ];
        return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
      })
    ];

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `devicedesk_employees_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  // Systems inventory modal handlers
  const handleOpenAddSysModal = () => {
    setEditingSys({
      id: "", systemNumber: "", cpu: "", gpu: "", ram: "", storage: "", os: "", model: "", assignedTo: "", remarks: "", status: "Active"
    });
    setEmpSearchQuery("");
    setShowSysModal(true);
  };

  const handleOpenEditSysModal = (sys) => {
    setEditingSys({ ...sys });
    const emp = employees.find(e => e.id === sys.assignedTo);
    setEmpSearchQuery(emp ? emp.name : "");
    setShowSysModal(true);
  };

  const handleOpenHistoryModal = (sys) => {
    setSelectedHistorySys(sys);
    setIsHistoryModalOpen(true);
  };

  const handleOpenEmpReportModal = (emp) => {
    setEmpReportTarget(emp);
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setEmpReportFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setEmpReportTo(today.toISOString().split('T')[0]);
    setShowEmpReportModal(true);
    playBeep(600, 0.05);
  };

  const handleDownloadEmpReport = (emp, fromDate, toDate) => {
    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;
    
    const empLogs = assignmentHistory.filter(h => {
      if (h.employeeId !== emp.id) return false;
      if (!h.timestamp) return false;
      const ts = new Date(h.timestamp);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const empTickets = tickets.filter(t => {
      const matchEmp = t.raisedBy === emp.id || t.employeeId === emp.id;
      if (!matchEmp) return false;
      if (!t.createdAt) return false;
      const ts = new Date(t.createdAt);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const empTasks = tasks.filter(t => {
      if (t.assignedTo !== emp.id) return false;
      if (!t.createdAt) return false;
      const ts = new Date(t.createdAt);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const csvRows = [];
    csvRows.push(`EMPLOYEE ACTIVITY & PERFORMANCE REPORT,${emp.name}`);
    csvRows.push(`Department,${emp.department || "N/A"}`);
    csvRows.push(`Role,${emp.role || "N/A"}`);
    csvRows.push(`Ticket Limit,${emp.ticketLimit || 5}`);
    csvRows.push(`Report Range,${fromDate || "Start"} to ${toDate || "End"}`);
    csvRows.push("");

    csvRows.push("CURRENT ASSIGNED DEVICES");
    csvRows.push("System ID,System Number,Model,OS,Status");
    const currentDevices = systems.filter(s => s.assignedTo === emp.id);
    currentDevices.forEach(s => {
      csvRows.push(`${s.id},${s.systemNumber},${s.model || "N/A"},${s.os || "N/A"},${s.status || "Active"}`);
    });
    csvRows.push("");

    csvRows.push("DEVICE TRANSFER & ASSIGNMENT LOGS (IN RANGE)");
    csvRows.push("Log ID,Action,System Number,Timestamp,Assigned By");
    empLogs.forEach(log => {
      csvRows.push(`${log.id},${log.action},${log.systemNumber},${new Date(log.timestamp).toLocaleString()},${log.assignedBy || "System"}`);
    });
    csvRows.push("");

    csvRows.push("ISSUES AND COMPLAINTS BOARD (IN RANGE)");
    csvRows.push("Ticket ID,Category,Description,Severity,Status,Created At,Resolved At,Notes");
    empTickets.forEach(t => {
      const descEscaped = t.description ? `"${t.description.replace(/"/g, '""')}"` : "";
      const notesEscaped = t.resolutionRemarks || t.notes ? `"${(t.resolutionRemarks || t.notes).replace(/"/g, '""')}"` : "";
      csvRows.push(`${t.id},${t.category},${descEscaped},${t.severity},${t.status},${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : ""},${notesEscaped}`);
    });
    csvRows.push("");

    csvRows.push("ASSIGNED TASKS (IN RANGE)");
    csvRows.push("Task ID,Title,Description,Status,Created At,Started At,Completed At,Duration (mins)");
    empTasks.forEach(t => {
      const descEscaped = t.description ? `"${t.description.replace(/"/g, '""')}"` : "";
      const durationMins = t.totalDuration ? Math.round(t.totalDuration / 60) : 0;
      csvRows.push(`${t.id},${t.title},${descEscaped},${t.status},${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.startedAt ? new Date(t.startedAt).toLocaleString() : ""},${t.completedAt ? new Date(t.completedAt).toLocaleString() : ""},${durationMins}`);
    });

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `devicedesk_report_${emp.name.replace(/\s+/g, "_")}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSystemReport = (sys) => {
    const sysLogs = assignmentHistory.filter(h => h.systemId === sys.id);
    const sysTickets = tickets.filter(t => t.systemId === sys.id);
    const csvRows = [];
    
    csvRows.push("SYSTEM SPECIFICATION REPORT");
    csvRows.push(`System Number,${sys.systemNumber}`);
    csvRows.push(`Model,${sys.model || "N/A"}`);
    csvRows.push(`Operating System,${sys.os || "N/A"}`);
    csvRows.push(`CPU,${sys.cpu || "N/A"}`);
    csvRows.push(`GPU,${sys.gpu || "Integrated"}`);
    csvRows.push(`RAM,${sys.ram || "N/A"}`);
    csvRows.push(`Storage,${sys.storage || "N/A"}`);
    csvRows.push(`Current Status,${sys.status || "Active"}`);
    csvRows.push("");
    
    csvRows.push("ASSIGNMENT HISTORY LOGS");
    csvRows.push("Log ID,Action,Employee ID,Employee Name,Timestamp,Assigned By");
    sysLogs.forEach(log => {
      const emp = employees.find(e => e.id === log.employeeId) || { name: "Unknown" };
      csvRows.push(`${log.id},${log.action},${log.employeeId},${emp.name},${new Date(log.timestamp).toLocaleString()},${log.assignedBy || "System"}`);
    });
    csvRows.push("");
    
    csvRows.push("ISSUES AND COMPLAINTS BOARD");
    csvRows.push("Ticket ID,Category,Description,Severity,Status,Created At,Resolved At,Notes");
    sysTickets.forEach(t => {
      const descEscaped = t.description ? `"${t.description.replace(/"/g, '""')}"` : "";
      const notesEscaped = t.resolutionRemarks || t.notes ? `"${(t.resolutionRemarks || t.notes).replace(/"/g, '""')}"` : "";
      csvRows.push(`${t.id},${t.category},${descEscaped},${t.severity},${t.status},${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : ""},${notesEscaped}`);
    });
    
    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `devicedesk_report_${sys.systemNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSystemSubmit = (e) => {
    e.preventDefault();
    const adminName = user?.name || "Admin";

    if (editingSys.id) {
      const oldSys = systems.find(s => s.id === editingSys.id);
      const oldAssignee = oldSys ? oldSys.assignedTo : null;
      const newAssignee = editingSys.assignedTo;
      
      if (oldAssignee !== newAssignee) {
        assignSystemToEmployee(editingSys.id, newAssignee, adminName);
      }
      updateSystem({ ...editingSys, assignedTo: newAssignee });
    } else {
      const added = addSystem({ ...editingSys, assignedTo: null });
      if (editingSys.assignedTo) {
        assignSystemToEmployee(added.id, editingSys.assignedTo, adminName);
      }
    }
    
    setSystems(getSystems());
    setShowSysModal(false);
    playBeep(1000, 0.1);
  };

  // Device assignment modal handlers
  const handleOpenAssignModal = (emp) => {
    setAssigningEmp(emp);
    const assigned = systems.filter(s => s.assignedTo === emp.id);
    if (assigned.length > 0) {
      setAssigningSysId(assigned[0].id);
    } else {
      setAssigningSysId("");
    }
    setShowAssignModal(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    const adminName = user?.name || "Admin";

    if (assigningSysId) {
      assignSystemToEmployee(assigningSysId, assigningEmp.id, adminName);
    } else {
      // Unassign all devices for this employee
      systems.forEach(s => {
        if (s.assignedTo === assigningEmp.id) {
          logAssignmentChange(assigningEmp.id, s.id, s.systemNumber, 'Unassigned', adminName);
          s.assignedTo = null;
          updateSystem(s);
        }
      });
    }
    
    setSystems(getSystems());
    setShowAssignModal(false);
    playBeep(900, 0.1);
  };

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      Swal.fire({ icon: 'warning', title: 'Validation', text: 'Task title is required.' });
      return;
    }
    const assignee = employees.find(emp => emp.id === newTaskAssignee);
    const assigneeName = assignee ? assignee.name : 'Unassigned';
    
    addTask({
      title: newTaskTitle,
      description: newTaskDesc,
      assignedTo: newTaskAssignee || null,
      assignedToName: assigneeName,
      assignedBy: user?.id || 'Admin',
      assignedByName: user?.name || 'Admin'
    });

    setShowAddTaskModal(false);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setTasks(getTasks());
    playBeep(900, 0.1);
    Swal.fire({ icon: 'success', title: 'Assigned', text: 'Task successfully assigned!' });
  };

  const handleExportTasksToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Task ID,Title,Description,Assigned To,Assigned By,Status,Total Duration (seconds),Created At,Completed\n";
    
    tasks.forEach(t => {
      const row = [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${t.assignedToName || 'Unassigned'}"`,
        `"${t.assignedByName || 'System'}"`,
        t.status,
        t.totalDuration || 0,
        t.createdAt || '',
        t.completedAt || ''
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "deviceDesk_task_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Seed Dummy Task Data for Chart Preview ──────────────────────────────
  const seedDummyTasks = () => {
    const now = new Date();

    const taskTemplates = [
      { title: "SEO Keyword Research", description: "Research high-volume keywords for Q3 campaign", category: "SEO" },
      { title: "On-Page Optimization", description: "Update meta titles and descriptions for landing pages", category: "SEO" },
      { title: "Backlink Audit", description: "Review and disavow toxic backlinks", category: "SEO" },
      { title: "Content Calendar Planning", description: "Plan blog posts for next 30 days", category: "Content" },
      { title: "Social Media Post - Instagram", description: "Design and schedule 5 Instagram posts", category: "Social" },
      { title: "PPC Campaign Review", description: "Analyze Google Ads performance and optimize bids", category: "Ads" },
      { title: "Email Newsletter Draft", description: "Write and design monthly email newsletter", category: "Email" },
      { title: "Google Analytics Report", description: "Pull weekly analytics report and share with team", category: "Analytics" },
      { title: "Landing Page A/B Test", description: "Set up A/B test for new landing page variant", category: "CRO" },
      { title: "Competitor Analysis", description: "Analyze top 5 competitors' digital strategies", category: "Research" },
      { title: "Website Speed Audit", description: "Run Lighthouse audit and fix Core Web Vitals issues", category: "Technical" },
      { title: "Lead Generation Form Setup", description: "Create and test lead capture form on homepage", category: "CRO" },
      { title: "YouTube Thumbnail Design", description: "Design thumbnails for 3 new videos", category: "Design" },
      { title: "Facebook Ad Creative", description: "Create 3 ad creatives for retargeting campaign", category: "Ads" },
      { title: "Monthly Performance Report", description: "Compile KPIs and prepare monthly report for client", category: "Reporting" },
      { title: "Blog Post Writing", description: "Write 1500-word blog on industry trends", category: "Content" },
      { title: "Technical SEO Fix", description: "Fix broken links and 404 errors across the site", category: "Technical" },
      { title: "CRM Data Cleanup", description: "Remove duplicate contacts and update lead status", category: "CRM" },
    ];

    // Helper: random date offset from now
    const daysAgo = (d) => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      return dt.toISOString();
    };
    const hoursAgo = (h) => {
      const dt = new Date(now);
      dt.setHours(dt.getHours() - h);
      return dt.toISOString();
    };

    // Get assignable employees (non-admin)
    const assignable = employees.filter(e => e.role !== "Admin" && e.role !== "Management");
    if (assignable.length === 0) {
      Swal.fire({ icon: "warning", title: "No Employees", text: "Add team members first, then seed demo data." });
      return;
    }

    const statuses = ["Completed", "Completed", "Completed", "In Progress", "Pending"];
    const existingIds = new Set(tasks.map(t => t.id));
    const newTasks = [];
    let idCounter = Date.now();

    // For each employee generate tasks spread across all time buckets
    assignable.forEach(emp => {
      const templates = [...taskTemplates].sort(() => Math.random() - 0.5);

      // TODAY  — 2 tasks
      [0, 1].forEach((i) => {
        const tpl = templates[i % templates.length];
        const status = i === 0 ? "Completed" : "In Progress";
        const created = hoursAgo(2 + i * 3);
        const task = {
          id: `demo_${idCounter++}`,
          title: tpl.title,
          description: tpl.description,
          assignedTo: emp.id,
          assignedToName: emp.name,
          assignedBy: user?.id || "admin",
          assignedByName: user?.name || "Admin",
          status,
          createdAt: created,
          startedAt: status !== "Pending" ? created : null,
          completedAt: status === "Completed" ? new Date(new Date(created).getTime() + 3600000).toISOString() : null,
          totalDuration: status === "Completed" ? 3600 + Math.floor(Math.random() * 7200) : 0,
          fileUrl: null
        };
        if (!existingIds.has(task.id)) newTasks.push(task);
      });

      // THIS WEEK — 3 more tasks (2–6 days ago)
      [2, 3, 4].forEach((i, idx) => {
        const tpl = templates[(i) % templates.length];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const created = daysAgo(2 + idx);
        const task = {
          id: `demo_${idCounter++}`,
          title: tpl.title,
          description: tpl.description,
          assignedTo: emp.id,
          assignedToName: emp.name,
          assignedBy: user?.id || "admin",
          assignedByName: user?.name || "Admin",
          status,
          createdAt: created,
          startedAt: status !== "Pending" ? created : null,
          completedAt: status === "Completed" ? new Date(new Date(created).getTime() + 5400000).toISOString() : null,
          totalDuration: status === "Completed" ? 5400 + Math.floor(Math.random() * 3600) : 0,
          fileUrl: null
        };
        if (!existingIds.has(task.id)) newTasks.push(task);
      });

      // THIS MONTH — 4 more tasks (7–25 days ago)
      [5, 6, 7, 8].forEach((i, idx) => {
        const tpl = templates[(i) % templates.length];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const created = daysAgo(8 + idx * 4);
        const task = {
          id: `demo_${idCounter++}`,
          title: tpl.title,
          description: tpl.description,
          assignedTo: emp.id,
          assignedToName: emp.name,
          assignedBy: user?.id || "admin",
          assignedByName: user?.name || "Admin",
          status,
          createdAt: created,
          startedAt: status !== "Pending" ? created : null,
          completedAt: status === "Completed" ? new Date(new Date(created).getTime() + 7200000).toISOString() : null,
          totalDuration: status === "Completed" ? 7200 + Math.floor(Math.random() * 5400) : 0,
          fileUrl: null
        };
        if (!existingIds.has(task.id)) newTasks.push(task);
      });

      // THIS YEAR — 5 more tasks (30–200 days ago)
      [9, 10, 11, 12, 13].forEach((i, idx) => {
        const tpl = templates[(i) % templates.length];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const created = daysAgo(30 + idx * 35);
        const task = {
          id: `demo_${idCounter++}`,
          title: tpl.title,
          description: tpl.description,
          assignedTo: emp.id,
          assignedToName: emp.name,
          assignedBy: user?.id || "admin",
          assignedByName: user?.name || "Admin",
          status,
          createdAt: created,
          startedAt: status !== "Pending" ? created : null,
          completedAt: status === "Completed" ? new Date(new Date(created).getTime() + 9000000).toISOString() : null,
          totalDuration: status === "Completed" ? 9000 + Math.floor(Math.random() * 7200) : 0,
          fileUrl: null
        };
        if (!existingIds.has(task.id)) newTasks.push(task);
      });
    });

    const merged = [...tasks, ...newTasks];
    saveTasks(merged);
    setTasks(getTasks());

    Swal.fire({
      icon: "success",
      title: "Demo Data Seeded!",
      html: `<p style="color:#aaa">Added <strong style="color:#00ccff">${newTasks.length}</strong> demo tasks across <strong style="color:#a855f7">${assignable.length}</strong> team members.<br><br>Switch between <em>Today / Week / Month / Year</em> tabs to see the chart populate.</p>`,
      confirmButtonText: "View Chart 📊"
    });
  };

  // ── Individual Employee Report ───────────────────────────────────────────
  const openEmpReport = (emp) => {
    // Default date range: last 30 days → today
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fmt = (d) => d.toISOString().split("T")[0];
    setEmpReportTarget(emp);
    setEmpReportFrom(fmt(from));
    setEmpReportTo(fmt(to));
    setShowEmpReportModal(true);
  };

  const downloadEmpReport = (emp, filteredTasks, from, to) => {
    const formatTime = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${h}h ${m}m ${s}s`;
    };

    const completed = filteredTasks.filter(t => t.status === "Completed");
    const pending   = filteredTasks.filter(t => t.status === "Pending");
    const inProg    = filteredTasks.filter(t => t.status === "In Progress");
    const totalTime = filteredTasks.reduce((sum, t) => sum + (t.totalDuration || 0), 0);
    const rate      = filteredTasks.length > 0 ? Math.round((completed.length / filteredTasks.length) * 100) : 0;

    const lines = [];
    lines.push(`EMPLOYEE PERFORMANCE REPORT`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Period: ${from} to ${to}`);
    lines.push(``);
    lines.push(`EMPLOYEE DETAILS`);
    lines.push(`Name,${emp.name}`);
    lines.push(`Department,${emp.department || "N/A"}`);
    lines.push(`Role,${emp.role}`);
    lines.push(`Email,${emp.email || "N/A"}`);
    lines.push(``);
    lines.push(`SUMMARY`);
    lines.push(`Total Tasks Assigned,${filteredTasks.length}`);
    lines.push(`Completed,${completed.length}`);
    lines.push(`In Progress,${inProg.length}`);
    lines.push(`Pending,${pending.length}`);
    lines.push(`Total Time Spent,${formatTime(totalTime)}`);
    lines.push(`Completion Rate,${rate}%`);
    lines.push(``);
    lines.push(`TASK DETAILS`);
    lines.push(`Task Title,Description,Status,Assigned By,Created Date,Completed Date,Time Spent`);

    filteredTasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(t => {
        const created   = t.createdAt ? new Date(t.createdAt).toLocaleString() : "—";
        const completed2 = t.completedAt ? new Date(t.completedAt).toLocaleString() : "—";
        const time      = formatTime(t.totalDuration || 0);
        lines.push([
          `"${(t.title || "").replace(/"/g, '""')}"`,
          `"${(t.description || "").replace(/"/g, '""')}"`,
          t.status,
          `"${t.assignedByName || "Admin"}"`,
          `"${created}"`,
          `"${completed2}"`,
          time
        ].join(","));
      });

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `report_${emp.name.replace(/ /g,"_")}_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const activeTickets = tickets.filter(t => t.status !== "Resolved")
    .sort((a, b) => {
      const severityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const weightA = severityWeight[a.severity] || 0;
      const weightB = severityWeight[b.severity] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  // Compute stats dynamically based on state to prevent hydration mismatches
  const totalSystems = systems.length;
  const activeAssignments = systems.filter(s => s.assignedTo).length;
  const openTicketsCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressTicketsCount = tickets.filter(t => t.status === 'In Progress').length;
  const pendingComplaints = openTicketsCount + inProgressTicketsCount;
  
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

  const stats = {
    totalSystems,
    activeAssignments,
    pendingComplaints,
    openTickets: openTicketsCount,
    inProgressTickets: inProgressTicketsCount,
    resolvedCount: resolvedTickets.length,
    avgResolutionTimeStr
  };
  
  // Charts calculator
  const ramDistribution = {};
  systems.forEach(s => {
    const r = s.ram || "Unknown";
    ramDistribution[r] = (ramDistribution[r] || 0) + 1;
  });
  const chartEntries = Object.entries(ramDistribution).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...chartEntries.map(e => e[1]), 1);

  // Filtered Systems Calculator
  const filteredSystems = systems.filter(sys => {
    const matchesSearch = sys.systemNumber.toLowerCase().includes(sysSearch.toLowerCase()) || 
                          sys.cpu.toLowerCase().includes(sysSearch.toLowerCase()) ||
                          (sys.gpu || "").toLowerCase().includes(sysSearch.toLowerCase()) ||
                          sys.ram.toLowerCase().includes(sysSearch.toLowerCase()) ||
                          sys.model.toLowerCase().includes(sysSearch.toLowerCase());
                          
    const matchesOS = sysFilterOS === "all" || sys.os.toLowerCase().includes(sysFilterOS.toLowerCase());
    const matchesStatus = sysFilterStatus === "all" || sys.status === sysFilterStatus;
    
    return matchesSearch && matchesOS && matchesStatus;
  });

  // Filtered & Paginated Tickets for Admin records view
  const filteredTicketsList = tickets.filter(t => {
    const sys = systems.find(s => s.id === t.systemId);
    const emp = employees.find(e => e.id === t.employeeId);
    const systemNum = sys ? sys.systemNumber.toLowerCase() : "";
    const empName = emp ? emp.name.toLowerCase() : "";
    const query = ticketSearch.toLowerCase();
    
    const matchesSearch = systemNum.includes(query) || 
                          empName.includes(query) || 
                          t.id.includes(query) || 
                          t.category.toLowerCase().includes(query) ||
                          t.description.toLowerCase().includes(query);
                          
    const matchesStatus = ticketFilterStatus === "all" || t.status === ticketFilterStatus;
    const matchesSeverity = ticketFilterSeverity === "all" || t.severity === ticketFilterSeverity;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const indexOfLastAdminTicket = ticketPage * adminTicketsPerPage;
  const indexOfFirstAdminTicket = indexOfLastAdminTicket - adminTicketsPerPage;
  const currentAdminTickets = filteredTicketsList.slice(indexOfFirstAdminTicket, indexOfLastAdminTicket);
  const totalAdminTicketPages = Math.ceil(filteredTicketsList.length / adminTicketsPerPage);

  // Paginated systems calculations
  const indexOfLastSys = sysPage * sysPerPage;
  const indexOfFirstSys = indexOfLastSys - sysPerPage;
  const currentSystems = filteredSystems.slice(indexOfFirstSys, indexOfLastSys);
  const totalSysPages = Math.ceil(filteredSystems.length / sysPerPage);

  // Filtered & Paginated Employees for Admin employee view
  const filteredEmployees = employees.filter(emp => {
    // 1. Don't show the currently logged-in user
    if (emp.id === user?.id) return false;

    // 2. Don't show other admin roles in the general employee list
    if (['Admin'].includes(emp.role)) return false;

    // 3. Team Leaders only see their own department
    if (isTeamLeader && leaderDepartment && emp.department?.toLowerCase() !== leaderDepartment.toLowerCase()) return false;

    const query = empSearch.toLowerCase();
    return emp.name.toLowerCase().includes(query) || 
           emp.department.toLowerCase().includes(query) || 
           emp.role.toLowerCase().includes(query);
  });

  const indexOfLastEmp = empPage * empPerPage;
  const indexOfFirstEmp = indexOfLastEmp - empPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmp, indexOfLastEmp);
  const totalEmpPages = Math.ceil(filteredEmployees.length / empPerPage);

  // Filtered & Paginated History logs
  const filteredHistory = assignmentHistory.filter(log => {
    const emp = employees.find(e => e.id === log.employeeId);
    const empName = emp ? emp.name : "unknown";
    const query = historySearch.toLowerCase();
    return (
      (log.systemNumber || "").toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      (log.assignedBy || "").toLowerCase().includes(query) ||
      empName.toLowerCase().includes(query) ||
      new Date(log.timestamp).toLocaleString().toLowerCase().includes(query)
    );
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const historyPerPage = 10;
  const indexOfLastHistory = historyPage * historyPerPage;
  const indexOfFirstHistory = indexOfLastHistory - historyPerPage;
  const currentHistory = filteredHistory.slice(indexOfFirstHistory, indexOfLastHistory);
  const totalHistoryPages = Math.ceil(filteredHistory.length / historyPerPage);
  // Filtered & Paginated Tasks calculations
  const filteredTasks = tasks.filter(t => {
    // Team Leaders only see tasks assigned to their department's employees
    if (isTeamLeader && leaderDepartment) {
      const assignee = employees.find(e => e.id === t.assignedTo);
      if (!assignee || assignee.department?.toLowerCase() !== leaderDepartment.toLowerCase()) return false;
    }
    const query = taskSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      (t.description || "").toLowerCase().includes(query) ||
      (t.assignedToName || "").toLowerCase().includes(query)
    );
  });
  const tasksPerPage = 5;
  const indexOfLastTask = taskPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalTaskPages = Math.ceil(filteredTasks.length / tasksPerPage);

  // Paginated Performance Employees
  const performanceEmployees = employees.filter(e => {
    if (e.role === "Admin" || e.role === "Management") return false;
    // Team Leaders only see performance data for their own department
    if (isTeamLeader && leaderDepartment && e.department?.toLowerCase() !== leaderDepartment.toLowerCase()) return false;
    return true;
  });
  const perfPerPage = 10;
  const indexOfLastPerf = perfPage * perfPerPage;
  const indexOfFirstPerf = indexOfLastPerf - perfPerPage;
  const currentPerfEmployees = performanceEmployees.slice(indexOfFirstPerf, indexOfLastPerf);
  const totalPerfPages = Math.ceil(performanceEmployees.length / perfPerPage);

  return (
    <div onClick={handleBodyClick} style={{ display: "contents" }}>
      
      {/* Sidebar Navigation (Desktop) */}
      <aside className="sidebar">
        <div className="logo-container">
          <img
            src="/flymedia-logo-white.png"
            alt="Fly Media Technology"
            style={{ height: "36px", objectFit: "contain" }}
          />
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ul className="nav-links">
            {userRole === "admin" && (
              <>
                <li className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("dashboard")}><span className="nav-icon">📊</span> Dashboard</button>
                </li>
                <li className={`nav-item ${currentView === "systems" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("systems")}><span className="nav-icon">🖥️</span> Systems Inventory</button>
                </li>
                <li className={`nav-item ${currentView === "employees" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("employees")}><span className="nav-icon">👥</span> Team Member Directory</button>
                </li>
                <li className={`nav-item ${currentView === "tickets" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("tickets")}><span className="nav-icon">📋</span> Raise Records</button>
                </li>
                <li className={`nav-item ${currentView === "departments" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("departments")}><span className="nav-icon">🏢</span> Departments</button>
                </li>
                <li className={`nav-item ${currentView === "history" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("history")}><span className="nav-icon">📜</span> System Logs</button>
                </li>
                <li className={`nav-item ${currentView === "tasks" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("tasks")}><span className="nav-icon">📅</span> Task Board</button>
                </li>
                <li className={`nav-item ${currentView === "profile" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("profile")}><span className="nav-icon">👤</span> My Profile</button>
                </li>
                {user?.dbRole === 'Admin' && (
                  <li className={`nav-item ${currentView === "danger-zone" ? "active" : ""}`} style={{ marginTop: '8px' }}>
                    <button onClick={() => setCurrentView("danger-zone")} style={{ color: 'var(--status-critical)' }}><span className="nav-icon">⚠️</span> Danger Zone</button>
                  </li>
                )}
              </>
            )}
            {userRole === "employee" && (
              <li className={`nav-item ${currentView === "employee-portal" ? "active" : ""}`}>
                <button onClick={() => setCurrentView("employee-portal")}><span className="nav-icon">🚨</span> Register Complaint</button>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* ── Mobile Hamburger Drawer ── */}
      {/* Backdrop */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Drawer */}
      <div className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <img src="/flymedia-logo-white.png" alt="Fly Media Technology" style={{ height: "32px", objectFit: "contain" }} />
          <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        </div>

        <nav className="mobile-drawer-nav">
          {userRole === "admin" && (
            <>
              <button className={`mobile-drawer-item ${currentView === "dashboard" ? "active" : ""}`}
                onClick={() => { setCurrentView("dashboard"); setMobileMenuOpen(false); }}>
                <span>📊</span> Dashboard
              </button>
              <button className={`mobile-drawer-item ${currentView === "systems" ? "active" : ""}`}
                onClick={() => { setCurrentView("systems"); setMobileMenuOpen(false); }}>
                <span>🖥️</span> Systems Inventory
              </button>
              <button className={`mobile-drawer-item ${currentView === "employees" ? "active" : ""}`}
                onClick={() => { setCurrentView("employees"); setMobileMenuOpen(false); }}>
                <span>👥</span> Team Members
              </button>
              <button className={`mobile-drawer-item ${currentView === "tickets" ? "active" : ""}`}
                onClick={() => { setCurrentView("tickets"); setMobileMenuOpen(false); }}>
                <span>📋</span> Tickets
              </button>
              <button className={`mobile-drawer-item ${currentView === "departments" ? "active" : ""}`}
                onClick={() => { setCurrentView("departments"); setMobileMenuOpen(false); }}>
                <span>🏢</span> Departments
              </button>
              <button className={`mobile-drawer-item ${currentView === "tasks" ? "active" : ""}`}
                onClick={() => { setCurrentView("tasks"); setMobileMenuOpen(false); }}>
                <span>📅</span> Task Board
              </button>
              <button className={`mobile-drawer-item ${currentView === "profile" ? "active" : ""}`}
                onClick={() => { setCurrentView("profile"); setMobileMenuOpen(false); }}>
                <span>👤</span> My Profile
              </button>
            </>
          )}
        </nav>

        <div className="mobile-drawer-footer">
          <button className="mobile-drawer-logout"
            onClick={() => { logout(); router.push("/login"); }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main Container Wrapper */}
      <div className="main-wrapper">
        
        {/* Top Header */}
        <header className="top-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Hamburger — mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>

          <div className="header-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/flymedia-logo-white.png"
              alt="Fly Media Technology"
              style={{ height: "30px", objectFit: "contain" }}
            />
          </div>
          <div className="alert-widget" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Clickable User Capsule & Dropdown */}
            <div style={{ position: "relative" }}>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setUserDropdownOpen(!userDropdownOpen);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: userDropdownOpen ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "#fff"
                }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: "600" }}>
                  {user?.name}
                </span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", transition: "transform 0.2s ease", transform: userDropdownOpen ? "rotate(180deg)" : "none" }}>
                  ▼
                </span>
              </div>

              {/* Sleek Glassmorphism Dropdown */}
              {userDropdownOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "42px",
                    right: "0",
                    width: "200px",
                    background: "rgba(20, 20, 30, 0.95)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                    padding: "12px",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <div style={{ padding: "4px 8px 8px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "6px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Signed in as</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-cyan)", wordBreak: "break-all" }}>{user?.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>{isTeamLeader ? `Team Leader — ${leaderDepartment}` : userRole === "admin" ? "Administrator" : "Employee"}</div>
                  </div>

                  <button 
                    onClick={() => {
                      setCurrentView("profile");
                      setUserDropdownOpen(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-primary)",
                      padding: "8px",
                      borderRadius: "6px",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span>👤</span> My Profile
                  </button>

                  <button 
                    onClick={() => {
                      router.push("/privacy-policy");
                      setUserDropdownOpen(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-primary)",
                      padding: "8px",
                      borderRadius: "6px",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span>🔒</span> Privacy & Terms
                  </button>

                  <button 
                    onClick={() => {
                      logout();
                      router.push("/login");
                    }}
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#ef4444",
                      padding: "8px",
                      borderRadius: "6px",
                      textAlign: "center",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      width: "100%",
                      marginTop: "6px",
                      fontWeight: "600",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)"}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>

            <button className={`sound-toggle-btn ${!soundOn ? "muted" : ""}`} onClick={handleSoundToggle}>
              <span className="nav-icon">{soundOn ? "🔊" : "🔇"}</span>
            </button>
            <div id="alert-bell" className={`notification-bell ${activeAudioAlert ? "active-alert" : ""}`} title="Warning Alerts Active">
              🔔
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="page-container">

          {/* ================= VIEW: PROFILE ================= */}
          {currentView === "profile" && (
            <div className="page-section active">
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--accent-cyan)", marginBottom: "1.5rem" }}>👤 Admin Profile Details</h2>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", marginBottom: "2rem" }}>
                {/* User card info */}
                <div style={{
                  flex: "1 1 300px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "16px",
                  padding: "1.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "#000"
                    }}>
                      A
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>{user?.name || "Administrator"}</h3>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>Root Admin Access</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Email:</span>
                      <span>{user?.email || "admin@devicedesk.com"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Access Level:</span>
                      <span style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>Full Owner</span>
                    </div>
                  </div>
                </div>

                {/* Account Actions card */}
                <div style={{
                  flex: "1 1 300px",
                  background: "rgba(239, 68, 68, 0.03)",
                  border: "1px dashed rgba(239, 68, 68, 0.3)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <h4 style={{ color: "var(--status-critical)", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.75rem" }}>⚠️ Permanent Account Deletion</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "1.5rem" }}>
                    Deleting your account will permanently wipe your profile record, delete your raised tickets, and unassign any active inventory assets. This action is irreversible.
                  </p>
                  <button 
                    onClick={() => {
                      if (user?.id === "admin") {
                        alert("Default root admin account cannot be deleted.");
                      } else {
                        setShowDeleteConfirm(true);
                      }
                    }}
                    className="btn-danger"
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      border: "none",
                      backgroundColor: "var(--status-critical)",
                      color: "#fff",
                      alignSelf: "flex-start"
                    }}
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: DANGER ZONE ================= */}
          {currentView === "danger-zone" && user?.dbRole === "Admin" && (
            <div className="page-section active">
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--status-critical)', margin: '0 0 6px 0' }}>⚠️ Danger Zone</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>All actions here are <strong style={{ color: 'var(--status-critical)' }}>permanent and irreversible</strong>. You will be asked to confirm twice before any data is deleted.</p>
              </div>

              {/* Delete per section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>

                {/* Systems */}
                <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🖥️</span>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Delete All Systems</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '14px', lineHeight: '1.5' }}>
                    Permanently removes <strong>{systems.length}</strong> system records, clears all assignments and hardware inventory.
                  </p>
                  <button
                    onClick={() => handleDangerDelete('systems', 'Systems')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.1)', color: '#ef4444', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }}>
                    🗑️ Delete All Systems ({systems.length})
                  </button>
                </div>

                {/* Tickets */}
                <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎫</span>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Delete All Tickets</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '14px', lineHeight: '1.5' }}>
                    Permanently removes <strong>{tickets.length}</strong> IT complaint tickets and all resolution records.
                  </p>
                  <button
                    onClick={() => handleDangerDelete('tickets', 'Tickets')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.1)', color: '#ef4444', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }}>
                    🗑️ Delete All Tickets ({tickets.length})
                  </button>
                </div>

                {/* History */}
                <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📜</span>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Delete Transfer Logs</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '14px', lineHeight: '1.5' }}>
                    Permanently removes all assignment history and transfer audit logs from the system.
                  </p>
                  <button
                    onClick={() => handleDangerDelete('history', 'Transfer Logs')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.1)', color: '#ef4444', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }}>
                    🗑️ Delete All Transfer Logs
                  </button>
                </div>
              </div>

              {/* Nuclear option */}
              <div style={{
                background: 'rgba(220,38,38,0.08)', border: '2px solid rgba(220,38,38,0.5)',
                borderRadius: '14px', padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '2rem' }}>☢️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#ef4444' }}>Delete Everything</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Wipes all systems, employees, tickets and history in one action</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDangerDelete('all', 'All Data')}
                  style={{
                    padding: '12px 28px', borderRadius: '10px', border: 'none',
                    background: 'var(--status-critical)', color: '#fff',
                    fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem',
                    boxShadow: '0 4px 20px rgba(220,38,38,0.4)'
                  }}>
                  ☢️ Wipe All Data — Full Reset
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: DASHBOARD ================= */}
          {currentView === "dashboard" && userRole === "admin" && (
            <div className="page-section active">
              
              {/* Test Mode Banner */}
              <div className="test-mode-banner">
                <div className="test-mode-text">
                  <strong>Fast Alert Test Mode</strong>
                  <span className="test-mode-subtext">Shorten warning beep interval from 15 mins to 30 seconds for quick testing.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--accent-purple)" }}>
                    {fastTestMode ? "30 seconds" : "15 minutes"}
                  </span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={fastTestMode} onChange={handleFastTestToggle} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Total Systems</span>
                  <span className="stat-value">{stats.totalSystems}</span>
                </div>
                <div className="stat-card purple">
                  <span className="stat-label">Active Assignments</span>
                  <span className="stat-value">{stats.activeAssignments}</span>
                </div>
                <div className="stat-card orange">
                  <span className="stat-label">Pending Complaints</span>
                  <span className="stat-value">{stats.pendingComplaints}</span>
                </div>
                <div className="stat-card green">
                  <span className="stat-label">Avg Resolve Time</span>
                  <span className="stat-value">{stats.avgResolutionTimeStr}</span>
                </div>
              </div>

              {/* Split Screen */}
              <div className="dashboard-split">
                
                {/* Active Tickets Queue */}
                <div className="panel-card">
                  <div className="panel-header">
                    <span className="panel-title">Active Complaints Queue</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sorted by Severity</span>
                  </div>
                  <div className="ticket-list">
                    {activeTickets.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        No active complaints. System functioning normally! ⚡
                      </div>
                    ) : (
                      activeTickets.map(ticket => {
                        const sys = systems.find(s => s.id === ticket.systemId);
                        const emp = employees.find(e => e.id === ticket.employeeId);
                        const timings = getTicketTimings(ticket);
                        const isOpen = ticket.status === "Open";
                        
                        let timerClass = "timer-badge ticking";
                        if (isOpen) {
                          const limit = fastTestMode ? 30 * 1000 : 15 * 60 * 1000;
                          const elapsed = Date.now() - new Date(ticket.createdAt).getTime();
                          if (elapsed >= limit) {
                            timerClass = "timer-badge alert-escalated";
                          }
                        }
                        
                        const activeElapsedStr = isOpen ? timings.totalDowntimeStr : timings.resolutionTimeStr;
                        const elapsedLabel = isOpen ? "Open: " : "Working: ";

                        return (
                          <div className="ticket-item" key={ticket.id}>
                            <div className="ticket-details">
                              <div className="ticket-meta">
                                <span className={`status-tag ${ticket.status.toLowerCase().replace(" ", "")}`}>{ticket.status}</span>
                                <span className={`status-tag ${ticket.severity.toLowerCase()}`}>{ticket.severity}</span>
                                <span><strong>{sys ? sys.systemNumber : "N/A"}</strong> - {emp ? emp.name : "Unknown"}</span>
                              </div>
                              <div className="ticket-desc">{ticket.description}</div>
                              <div style={{ marginTop: "6px", display: "flex", gap: "10px" }}>
                                <span className={timerClass}>{elapsedLabel}{activeElapsedStr}</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  Logged: {new Date(ticket.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <div className="ticket-actions">
                              {isOpen ? (
                                <button className="btn-action start" onClick={() => handleStartTicket(ticket.id)}>Start Work</button>
                              ) : (
                                <button className="btn-action resolve" onClick={() => handleOpenResolveModal(ticket.id)}>Resolve</button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* RAM Capacity distribution charts */}
                <div className="panel-card">
                  <div className="panel-header">
                    <span className="panel-title">RAM Capacity Distribution</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {chartEntries.map(([ram, count]) => {
                      const percentage = (count / maxCount) * 100;
                      return (
                        <div style={{ margin: "10px 0" }} key={ram}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                            <span>{ram}</span>
                            <span style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{count} system{count > 1 ? "s" : ""}</span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ width: `${percentage}%`, height: "100%", background: "linear-gradient(to right, var(--accent-cyan), var(--accent-blue))", borderRadius: "4px" }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================= VIEW: SYSTEMS INVENTORY ================= */}
          {currentView === "systems" && userRole === "admin" && (
            <div className="page-section active">
              <div className="section-header">
                <h2 style={{ fontSize: "1.4rem" }}>Hardware Directory</h2>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-secondary" onClick={handleExportSystemsToExcel}>📥 Export Systems</button>
                  <button className="btn-secondary" onClick={() => { setShowImportModal(true); setImportStatus(null); setImportFile(null); setImportParsed([]); setImportResult(null); }} style={{ background: 'linear-gradient(135deg,#1a6b3c,#22a05a)', color: '#fff', border: 'none' }}>📤 Import Excel</button>
                  <button className="btn-primary" onClick={handleOpenAddSysModal}>+ Add New System</button>
                </div>
              </div>

              {/* Filters */}
              <div className="filter-row">
                <div style={{ position: "relative", flexGrow: 1 }}>
                  <input 
                    type="text" 
                    className="form-control search-box" 
                    placeholder="Search System Number, CPU, RAM, Model..." 
                    value={sysSearch}
                    onChange={(e) => { setSysSearch(e.target.value); setSysPage(1); }}
                    style={{ width: "100%", paddingRight: "35px" }}
                  />
                  {sysSearch && (
                    <button
                      type="button"
                      onClick={() => { setSysSearch(""); setSysPage(1); }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        padding: "4px",
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
                <select className="form-control select-filter" value={sysFilterOS} onChange={(e) => { setSysFilterOS(e.target.value); setSysPage(1); }}>
                  <option value="all">All OS</option>
                  <option value="Windows 11">Windows 11</option>
                  <option value="Windows 10">Windows 10</option>
                  <option value="macOS">macOS</option>
                  <option value="Ubuntu">Ubuntu</option>
                </select>
                <select className="form-control select-filter" value={sysFilterStatus} onChange={(e) => { setSysFilterStatus(e.target.value); setSysPage(1); }}>
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Idle">Idle</option>
                  <option value="In Repair">In Repair</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              {/* Table — Desktop */}
              <div className="table-wrapper desktop-only">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>System ID</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>CPU Spec</th>
                      <th>GPU</th>
                      <th>RAM</th>
                      <th>Storage</th>
                      <th>OS</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSystems.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)" }}>No matching systems found.</td></tr>
                    ) : (
                      currentSystems.map(sys => {
                        const emp = employees.find(e => e.id === sys.assignedTo);
                        return (
                          <tr key={sys.id}>
                            <td style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{sys.systemNumber}</td>
                            <td><span className={`status-tag ${sys.status.toLowerCase().replace(" ", "")}`}>{sys.status}</span></td>
                            <td><strong>{emp ? emp.name : <span style={{ color: "var(--text-muted)" }}>Unassigned</span>}</strong></td>
                            <td>{sys.cpu}</td>
                            <td><span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{sys.gpu || "—"}</span></td>
                            <td><span className="timer-badge">{sys.ram}</span></td>
                            <td>{sys.storage}</td>
                            <td>{sys.os}</td>
                            <td style={{ textAlign: "right" }}>
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                  <button className="btn-action start" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => handleOpenEditSysModal(sys)}>Edit</button>
                                  <button className="btn-action resolve" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => handleOpenHistoryModal(sys)}>History</button>
                                  {userRole === 'admin' && (
                                    <button className="btn-action resolve" style={{ padding: "4px 8px", fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.15)", color: "var(--status-critical)", borderColor: "var(--status-critical)" }} onClick={() => handleRemoveSystem(sys.id, sys.systemNumber)}>Delete</button>
                                  )}
                                </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cards — Mobile */}
              <div className="mobile-card-list mobile-only">
                {currentSystems.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>No matching systems found.</p>
                ) : (
                  currentSystems.map(sys => {
                    const emp = employees.find(e => e.id === sys.assignedTo);
                    return (
                      <div className="mobile-card" key={sys.id}>
                        <div className="mobile-card-header">
                          <span className="mobile-card-title">🖥️ {sys.systemNumber}</span>
                          <span className={`status-tag ${sys.status.toLowerCase().replace(" ", "")}`}>{sys.status}</span>
                        </div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Assigned To</span><span className="mobile-card-value">{emp ? emp.name : <span style={{ color: "var(--text-muted)" }}>Unassigned</span>}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">CPU</span><span className="mobile-card-value">{sys.cpu || "—"}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">GPU</span><span className="mobile-card-value">{sys.gpu || "—"}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">RAM</span><span className="mobile-card-value">{sys.ram || "—"}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Storage</span><span className="mobile-card-value">{sys.storage || "—"}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">OS</span><span className="mobile-card-value">{sys.os || "—"}</span></div>
                        <div className="mobile-card-actions" style={{ display: "flex", gap: "8px" }}>
                          <button className="btn-action start" onClick={() => handleOpenEditSysModal(sys)}>✏️ Edit</button>
                          <button className="btn-action resolve" onClick={() => handleOpenHistoryModal(sys)}>📜 History</button>
                          {userRole === 'admin' && (
                            <button className="btn-action resolve" style={{ background: "rgba(239,68,68,0.15)", color: "var(--status-critical)", borderColor: "var(--status-critical)" }} onClick={() => handleRemoveSystem(sys.id, sys.systemNumber)}>🗑️ Delete</button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Systems Pagination Controls */}
              {totalSysPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn-secondary"
                    onClick={() => setSysPage(prev => Math.max(prev - 1, 1))}
                    disabled={sysPage === 1}
                    style={{ padding: "6px 12px", opacity: sysPage === 1 ? 0.5 : 1, cursor: sysPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Page {sysPage} of {totalSysPages}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => setSysPage(prev => Math.min(prev + 1, totalSysPages))}
                    disabled={sysPage === totalSysPages}
                    style={{ padding: "6px 12px", opacity: sysPage === totalSysPages ? 0.5 : 1, cursor: sysPage === totalSysPages ? "not-allowed" : "pointer" }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: EMPLOYEE DIRECTORY ================= */}
          {currentView === "employees" && userRole === "admin" && (
            <div className="page-section active">
              <div className="section-header">
                <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Team Member Assignments</h2>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-secondary" onClick={handleExportEmployeesToExcel}>📥 Export Team Members</button>
                  <button className="btn-secondary" onClick={() => { setShowEmpImportModal(true); setEmpImportStatus(null); setEmpImportFile(null); setEmpImportParsed([]); setEmpImportResult(null); }} style={{ background: 'linear-gradient(135deg,#1a3a6b,#2260d4)', color: '#fff', border: 'none' }}>📤 Import Excel</button>
                  <button className="btn-primary" onClick={() => setShowAddEmpModal(true)}>
                    + Add Team Member
                  </button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="filter-row" style={{ marginBottom: "1.5rem" }}>
                <div style={{ position: "relative", width: "100%" }}>
                  <input 
                    type="text" 
                    className="form-control search-box" 
                    placeholder="Search by Team Member name, department, or role..." 
                    value={empSearch}
                    onChange={(e) => { setEmpSearch(e.target.value); setEmpPage(1); }}
                    style={{ width: "100%", paddingRight: "35px" }}
                  />
                  {empSearch && (
                    <button
                      type="button"
                      onClick={() => { setEmpSearch(""); setEmpPage(1); }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        padding: "4px",
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
              
              {/* Table — Desktop */}
              <div className="table-wrapper desktop-only">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Team Member Name</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Assigned Devices</th>
                      <th>Ticket Limit</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEmployees.map(emp => {
                      const assigned = systems.filter(s => s.assignedTo === emp.id);
                      return (
                        <tr key={emp.id}>
                          <td>
                            <strong>{emp.name}</strong>
                            {emp.status === 'Paused' && (
                              <span className="status-tag open" style={{ marginLeft: "8px", fontSize: "0.65rem", padding: "2px 6px", background: "rgba(239, 68, 68, 0.15)", color: "var(--status-critical)", borderColor: "var(--status-critical)" }}>Paused</span>
                            )}
                          </td>
                          <td>
                            <span 
                              className="status-tag resolved" 
                              style={{ cursor: "pointer", transition: "transform 0.2s" }}
                              onClick={() => setSelectedViewDept(emp.department)}
                              title={`View all devices in ${emp.department}`}
                            >
                              {emp.department}
                            </span>
                          </td>
                          <td>{emp.role}</td>
                          <td>
                            {assigned.length > 0 ? (
                              assigned.map(s => (
                                <span 
                                  className="timer-badge" 
                                  style={{ color: "var(--accent-cyan)", borderColor: "var(--accent-cyan)", marginRight: "4px", cursor: "pointer" }} 
                                  key={s.id}
                                  onClick={() => setSelectedViewSystem(s)}
                                  title="Click to view details"
                                >
                                  {s.systemNumber}
                                </span>
                              ))
                            ) : (<span style={{ color: "var(--text-muted)" }}>None</span>)}
                          </td>
                          <td>{emp.ticketLimit || 5}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                              <button className="btn-action start" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => handleOpenAssignModal(emp)}>Assign Device</button>
                              <button className="btn-action start" style={{ padding: "4px 8px", fontSize: "0.75rem", background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-cyan)", borderColor: "var(--accent-cyan)" }} onClick={() => handleOpenEditEmpModal(emp)}>Edit</button>
                              <button className="btn-action start" style={{ padding: "4px 8px", fontSize: "0.75rem", background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)", borderColor: "var(--accent-purple)" }} onClick={() => handleOpenEmpReportModal(emp)}>View Report</button>
                              {!['Admin'].includes(emp.role) && (
                                <>
                                  <button 
                                    className="btn-action start" 
                                    style={{ 
                                      padding: "4px 8px", 
                                      fontSize: "0.75rem", 
                                      background: emp.status === 'Paused' ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", 
                                      color: emp.status === 'Paused' ? "var(--status-resolved)" : "var(--status-open)", 
                                      borderColor: emp.status === 'Paused' ? "var(--status-resolved)" : "var(--status-open)" 
                                    }} 
                                    onClick={() => handleToggleEmployeeStatus(emp)}
                                  >
                                    {emp.status === 'Paused' ? 'Activate' : 'Pause'}
                                  </button>
                                  <button className="btn-action resolve" style={{ padding: "4px 8px", fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.15)", color: "var(--status-critical)", borderColor: "var(--status-critical)" }} onClick={() => handleRemoveEmployee(emp.id)}>Remove</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards — Mobile */}
              <div className="mobile-card-list mobile-only">
                {currentEmployees.map(emp => {
                  const assigned = systems.filter(s => s.assignedTo === emp.id);
                  return (
                     <div className="mobile-card" key={emp.id}>
                       <div className="mobile-card-header">
                         <span className="mobile-card-title">
                           👤 {emp.name}
                           {emp.status === 'Paused' && (
                             <span className="status-tag open" style={{ marginLeft: "6px", fontSize: "0.65rem", padding: "1px 5px", background: "rgba(239, 68, 68, 0.15)", color: "var(--status-critical)", borderColor: "var(--status-critical)" }}>Paused</span>
                           )}
                         </span>
                         <span 
                           className="status-tag resolved" 
                           style={{ cursor: "pointer" }}
                           onClick={() => setSelectedViewDept(emp.department)}
                           title={`View all devices in ${emp.department}`}
                         >
                           {emp.department}
                         </span>
                       </div>
                       <div className="mobile-card-row"><span className="mobile-card-label">Role</span><span className="mobile-card-value">{emp.role}</span></div>
                       <div className="mobile-card-row">
                         <span className="mobile-card-label">Devices</span>
                         <span className="mobile-card-value">
                           {assigned.length > 0 ? assigned.map(s => (
                             <span 
                               key={s.id} 
                               className="timer-badge" 
                               style={{ color: "var(--accent-cyan)", borderColor: "var(--accent-cyan)", marginRight: "4px", cursor: "pointer" }}
                               onClick={() => setSelectedViewSystem(s)}
                               title="Click to view details"
                             >
                               {s.systemNumber}
                             </span>
                           )) : <span style={{ color: "var(--text-muted)" }}>None</span>}
                         </span>
                       </div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Ticket Limit</span><span className="mobile-card-value">{emp.ticketLimit || 5}</span></div>
                      <div className="mobile-card-actions">
                        <button className="btn-action start" onClick={() => handleOpenAssignModal(emp)}>🖥️ Assign</button>
                        <button className="btn-action start" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent-cyan)", borderColor: "var(--accent-cyan)" }} onClick={() => handleOpenEditEmpModal(emp)}>✏️ Edit</button>
                        <button className="btn-action start" style={{ background: "rgba(139,92,246,0.15)", color: "var(--accent-purple)", borderColor: "var(--accent-purple)" }} onClick={() => handleOpenEmpReportModal(emp)}>📊 Report</button>
                        {!['Admin'].includes(emp.role) && (
                           <>
                             <button 
                               className="btn-action start" 
                               style={{ 
                                 background: emp.status === 'Paused' ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", 
                                 color: emp.status === 'Paused' ? "var(--status-resolved)" : "var(--status-open)", 
                                 borderColor: emp.status === 'Paused' ? "var(--status-resolved)" : "var(--status-open)" 
                               }} 
                               onClick={() => handleToggleEmployeeStatus(emp)}
                             >
                               {emp.status === 'Paused' ? '🔓 Activate' : '🔒 Pause'}
                             </button>
                             <button className="btn-action resolve" style={{ background: "rgba(239,68,68,0.15)", color: "var(--status-critical)", borderColor: "var(--status-critical)" }} onClick={() => handleRemoveEmployee(emp.id)}>🗑️ Remove</button>
                           </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>



              {/* Employees Pagination Controls */}
              {totalEmpPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn-secondary"
                    onClick={() => setEmpPage(prev => Math.max(prev - 1, 1))}
                    disabled={empPage === 1}
                    style={{ padding: "6px 12px", opacity: empPage === 1 ? 0.5 : 1, cursor: empPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Page {empPage} of {totalEmpPages}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => setEmpPage(prev => Math.min(prev + 1, totalEmpPages))}
                    disabled={empPage === totalEmpPages}
                    style={{ padding: "6px 12px", opacity: empPage === totalEmpPages ? 0.5 : 1, cursor: empPage === totalEmpPages ? "not-allowed" : "pointer" }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: RAISE RECORDS ================= */}
          {currentView === "tickets" && userRole === "admin" && (
            <div className="page-section active">
              <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Raise Records (All Tickets)</h2>
                <button 
                  onClick={handleExportTicketsToExcel} 
                  className="btn-action start" 
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                >
                  📥 Export Reports
                </button>
              </div>

              {/* Filters & Search */}
              <div className="filter-row">
                <div style={{ flexGrow: 1, minWidth: "250px", position: "relative" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by Employee, System, ID, Description..."
                    value={ticketSearch}
                    onChange={(e) => { setTicketSearch(e.target.value); setTicketPage(1); }}
                    style={{ width: "100%", paddingRight: "35px" }}
                  />
                  {ticketSearch && (
                    <button
                      type="button"
                      onClick={() => { setTicketSearch(""); setTicketPage(1); }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        padding: "4px",
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
                <div>
                  <select
                    className="form-control"
                    value={ticketFilterStatus}
                    onChange={(e) => { setTicketFilterStatus(e.target.value); setTicketPage(1); }}
                    style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-primary)" }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <select
                    className="form-control"
                    value={ticketFilterSeverity}
                    onChange={(e) => { setTicketFilterSeverity(e.target.value); setTicketPage(1); }}
                    style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-primary)" }}
                  >
                    <option value="all">All Severities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Table — Desktop */}
              <div className="table-wrapper desktop-only">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th><th>Date Logged</th><th>Employee</th><th>System</th>
                      <th>Category</th><th>Severity</th><th>Status</th><th>Notes</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAdminTickets.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No tickets match your filters.</td></tr>
                    ) : (
                      currentAdminTickets.map(ticket => {
                        const sys = systems.find(s => s.id === ticket.systemId);
                        const emp = employees.find(e => e.id === ticket.employeeId);
                        const isOpen = ticket.status === "Open";
                        return (
                          <tr key={ticket.id}>
                            <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ticket.id}</td>
                            <td style={{ fontSize: "0.85rem" }}>{new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString()}</td>
                            <td><strong>{emp ? emp.name : "Unknown"}</strong></td>
                            <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{sys ? sys.systemNumber : "N/A"}</td>
                            <td>{ticket.category}</td>
                            <td><span className={`status-tag ${ticket.severity.toLowerCase()}`}>{ticket.severity}</span></td>
                            <td><span className={`status-tag ${ticket.status.toLowerCase().replace(" ", "")}`}>{ticket.status}</span></td>
                            <td style={{ fontSize: "0.85rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ticket.notes || ""}>{ticket.notes || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>None</span>}</td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                {isOpen ? <button className="btn-action start" onClick={() => handleStartTicket(ticket.id)}>Start Work</button>
                                  : ticket.status === "In Progress" ? <button className="btn-action resolve" onClick={() => handleOpenResolveModal(ticket.id)}>Resolve</button>
                                  : <span style={{ color: "var(--status-resolved)", fontSize: "0.85rem", fontWeight: "600" }}>✓ Resolved</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cards — Mobile */}
              <div className="mobile-card-list mobile-only">
                {currentAdminTickets.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>No tickets match your filters.</p>
                ) : (
                  currentAdminTickets.map(ticket => {
                    const sys = systems.find(s => s.id === ticket.systemId);
                    const emp = employees.find(e => e.id === ticket.employeeId);
                    const isOpen = ticket.status === "Open";
                    return (
                      <div className="mobile-card" key={ticket.id}>
                        <div className="mobile-card-header">
                          <span className="mobile-card-title">🎫 {emp ? emp.name : "Unknown"}</span>
                          <span className={`status-tag ${ticket.status.toLowerCase().replace(" ", "")}`}>{ticket.status}</span>
                        </div>
                        <div className="mobile-card-row"><span className="mobile-card-label">System</span><span className="mobile-card-value" style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{sys ? sys.systemNumber : "N/A"}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Category</span><span className="mobile-card-value">{ticket.category}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Severity</span><span className="mobile-card-value"><span className={`status-tag ${ticket.severity.toLowerCase()}`}>{ticket.severity}</span></span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Date</span><span className="mobile-card-value" style={{ fontSize: "0.8rem" }}>{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
                        {ticket.notes && <div className="mobile-card-row"><span className="mobile-card-label">Notes</span><span className="mobile-card-value" style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>{ticket.notes}</span></div>}
                        <div className="mobile-card-actions">
                          {isOpen ? (
                            <button className="btn-action start" onClick={() => handleStartTicket(ticket.id)}>▶ Start Work</button>
                          ) : ticket.status === "In Progress" ? (
                            <button className="btn-action resolve" onClick={() => handleOpenResolveModal(ticket.id)}>✓ Resolve</button>
                          ) : (
                            <span style={{ color: "var(--status-resolved)", fontWeight: 600, padding: "6px 0" }}>✓ Resolved</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>



              {/* Pagination controls */}
              {totalAdminTicketPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn-secondary"
                    onClick={() => setTicketPage(prev => Math.max(prev - 1, 1))}
                    disabled={ticketPage === 1}
                    style={{ padding: "6px 12px", opacity: ticketPage === 1 ? 0.5 : 1, cursor: ticketPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Page {ticketPage} of {totalAdminTicketPages}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => setTicketPage(prev => Math.min(prev + 1, totalAdminTicketPages))}
                    disabled={ticketPage === totalAdminTicketPages}
                    style={{ padding: "6px 12px", opacity: ticketPage === totalAdminTicketPages ? 0.5 : 1, cursor: ticketPage === totalAdminTicketPages ? "not-allowed" : "pointer" }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: DEPARTMENTS MANAGEMENT ================= */}
          {currentView === "departments" && userRole === "admin" && (
            <div className="page-section active">
              <div className="section-header">
                <h2 style={{ fontSize: "1.4rem" }}>🏢 Department Settings</h2>
              </div>

              <div className="dashboard-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {/* Add Department Form */}
                <div className="panel-card">
                  <div className="panel-header">
                    <span className="panel-title">Add Department</span>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!newDeptName.trim()) return;
                    const added = addDepartment(newDeptName);
                    if (added) {
                      setNewDeptName("");
                      setDeptError("");
                      setDepartments(getDepartments());
                      playBeep(600, 0.1);
                    } else {
                      setDeptError("Department already exists or name is invalid.");
                      playBeep(400, 0.2);
                    }
                  }}>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label>Department Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Sales, Marketing, HR"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        required
                      />
                    </div>
                    {deptError && (
                      <div style={{ color: "var(--status-critical)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                        ⚠️ {deptError}
                      </div>
                    )}
                    <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                      + Add Department
                    </button>
                  </form>
                </div>

                {/* Departments List */}
                <div className="panel-card">
                  <div className="panel-header">
                    <span className="panel-title">Existing Departments</span>
                  </div>
                  <div className="table-wrapper">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.length === 0 ? (
                          <tr><td colSpan="2" style={{ textAlign: "center", color: "var(--text-muted)" }}>No departments configured.</td></tr>
                        ) : (
                          departments.map(dept => {
                            const count = employees.filter(e => e.department && e.department.toLowerCase() === dept.name.toLowerCase()).length;
                            return (
                              <tr key={dept.id}>
                                <td style={{ fontWeight: 600 }}>{dept.name} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "8px" }}>({count} employees)</span></td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    className="btn-action resolve"
                                    onClick={() => {
                                      if (count > 0) {
                                        alert(`Cannot delete department "${dept.name}" because it is currently assigned to ${count} employee(s).`);
                                        playBeep(400, 0.2);
                                        return;
                                      }
                                      if (confirm(`Are you sure you want to delete the department "${dept.name}"?`)) {
                                        deleteDepartment(dept.id);
                                        setDepartments(getDepartments());
                                        playBeep(700, 0.1);
                                      }
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "0.75rem",
                                      background: "rgba(239, 68, 68, 0.15)",
                                      color: "var(--status-critical)",
                                      borderColor: "var(--status-critical)"
                                    }}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: SYSTEM HISTORY LOGS ================= */}
          {currentView === "history" && userRole === "admin" && (
            <div className="page-section active">
              <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.4rem", margin: 0 }}>📜 System Tracking & Audit Logs</h2>
                <button 
                  onClick={handleExportHistoryToExcel} 
                  className="btn-action start" 
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                >
                  📥 Export Audit Logs
                </button>
              </div>

              {/* Filters */}
              <div className="filter-row">
                <div style={{ position: "relative", flexGrow: 1 }}>
                  <input 
                    type="text" 
                    className="form-control search-box" 
                    placeholder="Search Employee, System, Action, Department..." 
                    style={{ width: "100%", paddingRight: "35px" }}
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => { setHistorySearch(""); setHistoryPage(1); }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        padding: "4px",
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>

              {/* Table — Desktop */}
              <div className="table-wrapper desktop-only">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Action</th>
                      <th>System Number</th>
                      <th>Team Member Name</th>
                      <th>Timestamp</th>
                      <th>Performed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentHistory.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)" }}>No matching audit logs found.</td></tr>
                    ) : (
                      currentHistory.map(log => {
                        const emp = employees.find(e => e.id === log.employeeId);
                        const act = log.action.toLowerCase();
                        let statusClass = 'open';
                        if (act === 'assigned') statusClass = 'resolved';
                        else if (act === 'unassigned') statusClass = 'open';
                        else if (act.includes('added') || act.includes('add')) statusClass = 'progress';
                        else if (act.includes('updated') || act.includes('update')) statusClass = 'open';
                        else if (act.includes('removed') || act.includes('delete') || act.includes('unassigned')) statusClass = 'critical';

                        return (
                          <tr key={log.id}>
                            <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{log.id}</td>
                            <td>
                              <span className={`status-tag ${statusClass}`}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: log.systemNumber ? "var(--accent-cyan)" : "var(--text-muted)" }}>{log.systemNumber || "N/A"}</td>
                            <td><strong>{emp ? emp.name : (log.employeeId ? (log.employeeId.startsWith('emp_') ? "Unknown" : log.employeeId) : "N/A")}</strong></td>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                            <td><span className="timer-badge">{log.assignedBy || "System"}</span></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cards — Mobile */}
              <div className="mobile-card-list mobile-only">
                {currentHistory.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>No audit logs found.</p>
                ) : (
                  currentHistory.map(log => {
                    const emp = employees.find(e => e.id === log.employeeId);
                    const act = log.action.toLowerCase();
                    let statusClass = 'open';
                    if (act === 'assigned') statusClass = 'resolved';
                    else if (act === 'unassigned') statusClass = 'open';
                    else if (act.includes('added') || act.includes('add')) statusClass = 'progress';
                    else if (act.includes('updated') || act.includes('update')) statusClass = 'open';
                    else if (act.includes('removed') || act.includes('delete') || act.includes('unassigned')) statusClass = 'critical';

                    let title = "📜 Audit Log";
                    if (log.systemNumber) title = `🖥️ ${log.systemNumber}`;
                    else if (act.includes('employee')) title = `👤 Employee Log`;
                    else if (act.includes('department')) title = `🏢 Department Log`;

                    return (
                      <div className="mobile-card" key={log.id}>
                        <div className="mobile-card-header">
                          <span className="mobile-card-title">{title}</span>
                          <span className={`status-tag ${statusClass}`}>{log.action}</span>
                        </div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Employee</span><span className="mobile-card-value">{emp ? emp.name : (log.employeeId ? (log.employeeId.startsWith('emp_') ? "Unknown" : log.employeeId) : "N/A")}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Timestamp</span><span className="mobile-card-value">{new Date(log.timestamp).toLocaleString()}</span></div>
                        <div className="mobile-card-row"><span className="mobile-card-label">Performed By</span><span className="mobile-card-value">{log.assignedBy || "System"}</span></div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* History Pagination Controls */}
              {totalHistoryPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn-secondary"
                    onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                    disabled={historyPage === 1}
                    style={{ padding: "6px 12px", opacity: historyPage === 1 ? 0.5 : 1, cursor: historyPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Page {historyPage} of {totalHistoryPages} (Total {filteredHistory.length} logs)
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                    disabled={historyPage === totalHistoryPages}
                    style={{ padding: "6px 12px", opacity: historyPage === totalHistoryPages ? 0.5 : 1, cursor: historyPage === totalHistoryPages ? "not-allowed" : "pointer" }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: TASK BOARD (ADMIN/LEADER) ================= */}
          {currentView === "tasks" && userRole === "admin" && (
            <div className="page-section active">
              <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", margin: 0 }}>📅 Team Task Board</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                    {isTeamLeader
                      ? `Showing tasks for your department: ${leaderDepartment}`
                      : "Assign tasks, view daily performance reports, and track employee task logs"}
                  </p>
                  {isTeamLeader && (
                    <span style={{ display: "inline-block", marginTop: "6px", padding: "2px 10px", background: "rgba(0,204,255,0.12)", border: "1px solid rgba(0,204,255,0.3)", borderRadius: "20px", fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: "600" }}>
                      🏷️ Dept: {leaderDepartment}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={handleExportTasksToCSV} 
                    className="btn-secondary" 
                  >
                    📥 Export All Tasks
                  </button>
                  <button 
                    onClick={() => {
                      setEmpReportTarget(null);
                      const today = new Date();
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(today.getDate() - 30);
                      setEmpReportFrom(thirtyDaysAgo.toISOString().split('T')[0]);
                      setEmpReportTo(today.toISOString().split('T')[0]);
                      setShowEmpReportModal(true);
                    }} 
                    className="btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)", borderColor: "var(--accent-purple)" }}
                  >
                    📊 Performance Reports
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      setNewTaskTitle("");
                      setNewTaskDesc("");
                      const assignableEmps = employees.filter(e => 
                        e.role !== "Admin" && e.role !== "Management" &&
                        (!isTeamLeader || !leaderDepartment || e.department?.toLowerCase() === leaderDepartment.toLowerCase())
                      );
                      setNewTaskAssignee(assignableEmps.length > 0 ? assignableEmps[0].id : "");
                      setShowAddTaskModal(true);
                    }}
                  >
                    + Assign New Task
                  </button>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div className="tab-container" style={{ display: "flex", gap: "15px", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "10px" }}>
                <button 
                  onClick={() => setTaskPage(1)} 
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-cyan)",
                    fontWeight: "bold",
                    borderBottom: "2px solid var(--accent-cyan)",
                    paddingBottom: "5px",
                    cursor: "pointer"
                  }}
                >
                  Tasks List
                </button>
              </div>

              {/* Filters */}
              <div className="filter-row" style={{ marginBottom: "1.5rem" }}>
                <div style={{ position: "relative", flexGrow: 1 }}>
                  <input 
                    type="text" 
                    className="form-control search-box" 
                    placeholder="Search by task title, description, or assignee..." 
                    style={{ width: "100%", paddingRight: "35px" }}
                    value={taskSearch}
                    onChange={(e) => { setTaskSearch(e.target.value); setTaskPage(1); }}
                  />
                  {taskSearch && (
                    <button
                      type="button"
                      onClick={() => { setTaskSearch(""); setTaskPage(1); }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        padding: "4px",
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>

              {/* Table — Tasks List */}
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Task Title</th>
                      <th>Description</th>
                      <th>Assigned To</th>
                      <th>Assigned By</th>
                      <th>Status</th>
                      <th>Time Spent</th>
                      <th>Created</th>
                      <th>Completed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTasks.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                          No tasks found.
                        </td>
                      </tr>
                    ) : (
                      currentTasks.map(t => {
                        let displayDuration = t.totalDuration || 0;
                        if (t.status === 'In Progress' && t.startedAt) {
                          const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
                          displayDuration += Math.max(0, elapsed);
                        }

                        const formatTime = (secs) => {
                          const h = Math.floor(secs / 3600);
                          const m = Math.floor((secs % 3600) / 60);
                          const s = secs % 60;
                          return `${h}h ${m}m ${s}s`;
                        };

                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: "600" }}>{t.title}</td>
                            <td>{t.description || "—"}</td>
                            <td><strong>{t.assignedToName || "Unassigned"}</strong></td>
                            <td>{t.assignedByName || "System"}</td>
                            <td>
                              <span className={`status-badge badge-${t.status === 'In Progress' ? 'progress' : (t.status === 'Completed' ? 'resolved' : 'open')}`}>
                                {t.status}
                              </span>
                            </td>
                            <td style={{ fontFamily: "monospace", color: "var(--accent-cyan)" }}>{formatTime(displayDuration)}</td>
                            <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                            <td>{t.completedAt ? new Date(t.completedAt).toLocaleString() : "—"}</td>
                            <td>
                              <button
                                className="btn-secondary"
                                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                                onClick={() => {
                                  setSelectedTaskDetails(t);
                                  setShowTaskDetailsModal(true);
                                }}
                              >
                                👁️ View details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Task Pagination Controls */}
              {totalTaskPages > 1 && (
                <div className="pagination-controls" style={{ marginTop: "1rem" }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setTaskPage(prev => Math.max(prev - 1, 1))}
                    disabled={taskPage === 1}
                    style={{ padding: "6px 12px", opacity: taskPage === 1 ? 0.5 : 1, cursor: taskPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Page {taskPage} of {totalTaskPages} (Total {filteredTasks.length} tasks)
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => setTaskPage(prev => Math.min(prev + 1, totalTaskPages))}
                    disabled={taskPage === totalTaskPages}
                    style={{ padding: "6px 12px", opacity: taskPage === totalTaskPages ? 0.5 : 1, cursor: taskPage === totalTaskPages ? "not-allowed" : "pointer" }}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Performance Summary section */}
              <div style={{ marginTop: "3rem" }}>
                {/* ── Chart Header ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "1.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", color: "var(--accent-cyan)", margin: 0 }}>📊 Team Performance Chart</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>Task completion rates per team member across time periods</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {/* Seed / Clear demo buttons */}
                    <button
                      onClick={seedDummyTasks}
                      title="Inject demo tasks for all employees across all time periods"
                      style={{
                        padding: "5px 13px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0,204,255,0.3)",
                        background: "rgba(0,204,255,0.08)",
                        color: "var(--accent-cyan)",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,204,255,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(0,204,255,0.08)"}
                    >
                      🧪 Seed Demo Data
                    </button>
                    <button
                      onClick={() => {
                        Swal.fire({
                          title: "Clear all demo tasks?",
                          text: "This removes tasks with IDs starting with 'demo_'. Real tasks are kept.",
                          icon: "warning",
                          showCancelButton: true,
                          confirmButtonText: "Yes, clear",
                          confirmButtonColor: "#ef4444"
                        }).then(r => {
                          if (r.isConfirmed) {
                            const cleaned = tasks.filter(t => !t.id.startsWith("demo_"));
                            saveTasks(cleaned);
                            setTasks(getTasks());
                            Swal.fire({ icon: "success", title: "Cleared", text: "Demo tasks removed." });
                          }
                        });
                      }}
                      title="Remove all seeded demo tasks"
                      style={{
                        padding: "5px 13px",
                        borderRadius: "8px",
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.06)",
                        color: "#ef4444",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.06)"}
                    >
                      🗑️ Clear Demo
                    </button>
                    {/* Tab Switcher */}
                    <div style={{ display: "flex", gap: "6px", background: "rgba(255,255,255,0.04)", padding: "4px", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                      {["daily", "weekly", "monthly", "yearly"].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setPerfChartTab(tab)}
                          style={{
                            padding: "5px 14px",
                            borderRadius: "7px",
                            border: "none",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            textTransform: "capitalize",
                            background: perfChartTab === tab ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))" : "transparent",
                            color: perfChartTab === tab ? "#fff" : "var(--text-secondary)",
                            transition: "all 0.2s ease",
                            boxShadow: perfChartTab === tab ? "0 2px 10px rgba(0,204,255,0.3)" : "none"
                          }}
                        >
                          {tab === "daily" ? "Today" : tab === "weekly" ? "Week" : tab === "monthly" ? "Month" : "Year"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Bar Chart ── */}
                {(() => {
                  const now2 = new Date();
                  const chartData = performanceEmployees.map(e => {
                    let empTasks = tasks.filter(t => t.assignedTo === e.id);

                    // Filter by time period
                    if (perfChartTab === "daily") {
                      empTasks = empTasks.filter(t => {
                        const d = new Date(t.createdAt || t.updatedAt || 0);
                        return d.toDateString() === now2.toDateString();
                      });
                    } else if (perfChartTab === "weekly") {
                      const weekAgo = new Date(now2); weekAgo.setDate(weekAgo.getDate() - 7);
                      empTasks = empTasks.filter(t => new Date(t.createdAt || t.updatedAt || 0) >= weekAgo);
                    } else if (perfChartTab === "monthly") {
                      empTasks = empTasks.filter(t => {
                        const d = new Date(t.createdAt || t.updatedAt || 0);
                        return d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear();
                      });
                    } else if (perfChartTab === "yearly") {
                      empTasks = empTasks.filter(t => {
                        const d = new Date(t.createdAt || t.updatedAt || 0);
                        return d.getFullYear() === now2.getFullYear();
                      });
                    }

                    const total = empTasks.length;
                    const completed = empTasks.filter(t => t.status === "Completed").length;
                    const pending = total - completed;
                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const shortName = e.name.split(" ")[0];
                    return { name: shortName, Completed: completed, Pending: pending, Rate: rate, total };
                  }).filter(d => d.total > 0 || true); // show all employees

                  const hasData = chartData.some(d => d.total > 0);

                  return (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
                      {!hasData ? (
                        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
                          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📭</div>
                          <p style={{ margin: 0 }}>No tasks found for this time period.</p>
                        </div>
                      ) : (
                        <>
                          {/* Stacked Bar Chart */}
                          <div style={{ marginBottom: "1.5rem" }}>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>Tasks: Completed vs Pending</p>
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                  contentStyle={{ background: "rgba(15,15,25,0.95)", border: "1px solid var(--glass-border)", borderRadius: "10px", fontSize: "0.8rem" }}
                                  labelStyle={{ color: "var(--accent-cyan)", fontWeight: "bold" }}
                                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                                />
                                <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "10px" }} />
                                <Bar dataKey="Completed" stackId="a" fill="#00ccff" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Pending" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Completion Rate Bar Chart */}
                          <div>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>Completion Rate (%)</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {chartData.map((d, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ width: "90px", fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "right", flexShrink: 0 }}>{d.name}</span>
                                  <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: "20px", height: "10px", overflow: "hidden" }}>
                                    <div style={{
                                      height: "100%",
                                      width: `${d.Rate}%`,
                                      background: d.Rate === 100 ? "linear-gradient(90deg, #00ccff, #00ff99)" : d.Rate >= 50 ? "linear-gradient(90deg, #00ccff, #a855f7)" : "linear-gradient(90deg, #f59e0b, #ef4444)",
                                      borderRadius: "20px",
                                      transition: "width 0.8s ease"
                                    }} />
                                  </div>
                                  <span style={{ width: "38px", fontSize: "0.75rem", fontWeight: "700", color: d.Rate === 100 ? "#00ff99" : d.Rate >= 50 ? "var(--accent-cyan)" : "#f59e0b", textAlign: "left" }}>{d.Rate}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                <h3 style={{ fontSize: "1.1rem", color: "var(--accent-cyan)", marginBottom: "1rem" }}>📈 Team Performance Table</h3>
                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Team Member</th>
                        <th>Department</th>
                        <th>Role</th>
                        <th style={{ textAlign: "center" }}>Total Assigned</th>
                        <th style={{ textAlign: "center" }}>Completed</th>
                        <th style={{ textAlign: "center" }}>Pending</th>
                        <th>Total Time Spent</th>
                        <th>Rate (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPerfEmployees.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                            No team members found.
                          </td>
                        </tr>
                      ) : (
                        currentPerfEmployees.map(e => {
                          const empTasks = tasks.filter(t => t.assignedTo === e.id);
                          const completed = empTasks.filter(t => t.status === "Completed");
                          const pending = empTasks.filter(t => t.status !== "Completed");
                          
                          let totalTime = 0;
                          empTasks.forEach(t => {
                            let displayDuration = t.totalDuration || 0;
                            if (t.status === 'In Progress' && t.startedAt) {
                              const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
                              displayDuration += Math.max(0, elapsed);
                            }
                            totalTime += displayDuration;
                          });

                          const formatTime = (secs) => {
                            const h = Math.floor(secs / 3600);
                            const m = Math.floor((secs % 3600) / 60);
                            const s = secs % 60;
                            return `${h}h ${m}m ${s}s`;
                          };

                          const rate = empTasks.length > 0 
                            ? Math.round((completed.length / empTasks.length) * 100) 
                            : 0;

                          return (
                            <tr key={e.id}>
                              <td><strong>{e.name}</strong></td>
                              <td>{e.department || "Operations"}</td>
                              <td>{e.role}</td>
                              <td style={{ textAlign: "center" }}>{empTasks.length}</td>
                              <td style={{ textAlign: "center", color: "var(--status-resolved)" }}>{completed.length}</td>
                              <td style={{ textAlign: "center", color: "var(--status-progress)" }}>{pending.length}</td>
                              <td style={{ fontFamily: "monospace", color: "var(--accent-cyan)" }}>{formatTime(totalTime)}</td>
                              <td>
                                <span style={{ fontWeight: "bold", color: rate === 100 ? "var(--status-resolved)" : "var(--text-primary)" }}>
                                  {rate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Performance Report Pagination Controls */}
                {totalPerfPages > 1 && (
                  <div className="pagination-controls" style={{ marginTop: "1rem" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setPerfPage(prev => Math.max(prev - 1, 1))}
                      disabled={perfPage === 1}
                      style={{ padding: "6px 12px", opacity: perfPage === 1 ? 0.5 : 1, cursor: perfPage === 1 ? "not-allowed" : "pointer" }}
                    >
                      ← Previous
                    </button>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Page {perfPage} of {totalPerfPages} (Total {performanceEmployees.length} team members)
                    </span>
                    <button
                      className="btn-secondary"
                      onClick={() => setPerfPage(prev => Math.min(prev + 1, totalPerfPages))}
                      disabled={perfPage === totalPerfPages}
                      style={{ padding: "6px 12px", opacity: perfPage === totalPerfPages ? 0.5 : 1, cursor: perfPage === totalPerfPages ? "not-allowed" : "pointer" }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= VIEW: EMPLOYEE PORTAL ================= */}
          {currentView === "employee-portal" && userRole === "employee" && (
            <div className="page-section active">
              <div className="mobile-device-frame">
                <div className="complaint-card">
                  <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>IT Desk Complaint Box</h2>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>Report a hardware or software issue with your system.</p>
                  </div>
                  
                  <form onSubmit={handleComplaintSubmit}>
                    <div className="form-group">
                      <label>My Name</label>
                      <select className="form-control" value={portalEmployeeId} onChange={(e) => handlePortalEmployeeChange(e.target.value)} required>
                        <option value="">-- Choose Your Name --</option>
                        {employees.map(emp => (
                          <option value={emp.id} key={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>My Assigned System</label>
                      <select className="form-control" value={portalSystemId} onChange={(e) => setPortalSystemId(e.target.value)} required disabled={!portalEmployeeId}>
                        <option value="">{portalEmployeeId ? "-- Select System --" : "-- Select Team Member First --"}</option>
                        {portalEmployeeId && (
                          (() => {
                            const assigned = systems.filter(s => s.assignedTo === portalEmployeeId);
                            if (assigned.length === 0) {
                              return (
                                <>
                                  <option value="">No system assigned. Choose other:</option>
                                  {systems.map(s => (
                                    <option value={s.id} key={s.id}>{s.systemNumber} - ({s.cpu})</option>
                                  ))}
                                </>
                              );
                            }
                            return assigned.map(s => (
                              <option value={s.id} key={s.id}>{s.systemNumber} - {s.model}</option>
                            ));
                          })()
                        )}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Issue Category</label>
                      <select className="form-control" value={portalCategory} onChange={(e) => setPortalCategory(e.target.value)} required>
                        <option value="RAM/Speed">System Slow / Lagging (RAM/CPU)</option>
                        <option value="Hardware">Physical Hardware Fault (Keyboard/Mouse/SSD)</option>
                        <option value="Display">Monitor / Screen Flickering</option>
                        <option value="Network">Internet / Wi-Fi Connection</option>
                        <option value="Software">Software Crash / License Expired</option>
                        <option value="Other">Other Issues</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Issue Severity</label>
                      <select className="form-control" value={portalSeverity} onChange={(e) => setPortalSeverity(e.target.value)} required>
                        <option value="Low">Low - Cosmetic issue, system usable</option>
                        <option value="Medium">Medium - Distracting issue, work delayed</option>
                        <option value="High">High - Major blocker, critical apps failing</option>
                        <option value="Critical">Critical - System crash, unable to work</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Problem Description</label>
                      <textarea 
                        className="form-control" 
                        rows="3" 
                        placeholder="Provide details..." 
                        value={portalDesc}
                        onChange={(e) => setPortalDesc(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
                      🚨 Send IT Complaint
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ================= MODAL: SYSTEM SAVE FORM ================= */}
      <div className={`modal-overlay ${showSysModal ? "active" : ""}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 className="modal-title">{editingSys.id ? "Edit Hardware Details" : "Add Hardware System"}</h3>
            <button className="modal-close" onClick={() => setShowSysModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleSaveSystemSubmit}>
            
            <div className="form-group">
              <label>System Number</label>
              <input 
                type="text" 
                className="form-control" 
                value={editingSys.systemNumber}
                onChange={(e) => setEditingSys({ ...editingSys, systemNumber: e.target.value })}
                placeholder="e.g. SN15" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Model / Motherboard</label>
              <input 
                type="text" 
                className="form-control" 
                value={editingSys.model}
                onChange={(e) => setEditingSys({ ...editingSys, model: e.target.value })}
                placeholder="e.g. MSI MS-7D48" 
              />
            </div>

            <div className="modal-form-grid">
              <div className="form-group">
                <label>CPU Spec</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingSys.cpu}
                  onChange={(e) => setEditingSys({ ...editingSys, cpu: e.target.value })}
                  placeholder="e.g. Core i5" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Graphic Card (GPU)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingSys.gpu || ""}
                  onChange={(e) => setEditingSys({ ...editingSys, gpu: e.target.value })}
                  placeholder="e.g. NVIDIA RTX 4060 / Integrated" 
                />
              </div>
            </div>

            <div className="modal-form-grid">
              <div className="form-group">
                <label>RAM Installed</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingSys.ram}
                  onChange={(e) => setEditingSys({ ...editingSys, ram: e.target.value })}
                  placeholder="e.g. 16 GB DDR4" 
                  required 
                />
              </div>
            </div>

            <div className="modal-form-grid">
              <div className="form-group">
                <label>Storage Drive</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingSys.storage}
                  onChange={(e) => setEditingSys({ ...editingSys, storage: e.target.value })}
                  placeholder="e.g. 512 GB SSD" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Operating System</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingSys.os}
                  onChange={(e) => setEditingSys({ ...editingSys, os: e.target.value })}
                  placeholder="e.g. Windows 11 Pro" 
                  required 
                />
              </div>
            </div>

            <div className="form-group searchable-select-container">
              <label>Assigned Employee</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search & select employee..."
                  value={empSearchQuery}
                  onChange={(e) => {
                    setEmpSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                    if (!e.target.value) {
                      setEditingSys({ ...editingSys, assignedTo: null });
                    }
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowSearchDropdown(false);
                    }, 250);
                  }}
                />
                {editingSys.assignedTo && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSys({ ...editingSys, assignedTo: null });
                      setEmpSearchQuery("");
                    }}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      padding: "4px"
                    }}
                  >
                    &times;
                  </button>
                )}
                
                {showSearchDropdown && (
                  <div className="searchable-select-dropdown">
                    <div 
                      className="searchable-select-item"
                      onClick={() => {
                        setEditingSys({ ...editingSys, assignedTo: null });
                        setEmpSearchQuery("");
                        setShowSearchDropdown(false);
                      }}
                      style={{ fontStyle: "italic", color: "var(--text-secondary)" }}
                    >
                      -- Unassigned --
                    </div>
                    {employees
                      .filter(emp => emp.name.toLowerCase().includes(empSearchQuery.toLowerCase()))
                      .map(emp => (
                        <div
                          key={emp.id}
                          className="searchable-select-item"
                          onClick={() => {
                            setEditingSys({ ...editingSys, assignedTo: emp.id });
                            setEmpSearchQuery(emp.name);
                            setShowSearchDropdown(false);
                          }}
                        >
                          <strong>{emp.name}</strong> <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>({emp.role} - {emp.department})</span>
                        </div>
                      ))}
                    {employees.filter(emp => emp.name.toLowerCase().includes(empSearchQuery.toLowerCase())).length === 0 && (
                      <div className="searchable-select-item" style={{ color: "var(--text-muted)", pointerEvents: "none" }}>
                        No matching employees found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select 
                className="form-control" 
                value={editingSys.status} 
                onChange={(e) => setEditingSys({ ...editingSys, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Idle">Idle</option>
                <option value="In Repair">In Repair</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            <div className="form-group">
              <label>Remarks & Maintenance Notes</label>
              <textarea 
                className="form-control" 
                value={editingSys.remarks}
                onChange={(e) => setEditingSys({ ...editingSys, remarks: e.target.value })}
                placeholder="Upgrade logs, repair dates..." 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
              Save Changes
            </button>
          </form>
        </div>
      </div>

      {/* ================= MODAL: ASSIGN DEVICE ================= */}
      <div className={`modal-overlay ${showAssignModal ? "active" : ""}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 className="modal-title">Device Assignment</h3>
            <button className="modal-close" onClick={() => setShowAssignModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleAssignSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              Assigning hardware device for employee: <strong style={{ color: "var(--accent-cyan)" }}>{assigningEmp.name}</strong>
            </div>
            
            <div className="form-group">
              <label>Select System Device</label>
              <select className="form-control" value={assigningSysId} onChange={(e) => setAssigningSysId(e.target.value)}>
                <option value="">-- Unassign All Devices --</option>
                {systems.map(sys => {
                  if (!sys.assignedTo || sys.assignedTo === assigningEmp.id) {
                    return (
                      <option value={sys.id} key={sys.id}>
                        {sys.systemNumber} - {sys.cpu} ({sys.ram})
                      </option>
                    );
                  }
                  return null;
                })}
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
              Confirm Assignment
            </button>
          </form>
        </div>
      </div>

      {/* ================= MODAL: RESOLVE TICKET ================= */}
      <div className={`modal-overlay ${showResolveModal ? "active" : ""}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 className="modal-title">Resolve Complaint Ticket</h3>
            <button className="modal-close" onClick={() => setShowResolveModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleResolveTicketSubmit}>
            
            <div className="form-group">
              <label>IT Resolution & Repair Notes</label>
              <textarea 
                className="form-control" 
                rows="4" 
                placeholder="Describe the fix (e.g. Upgraded RAM, reinstalled drivers...)" 
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                required 
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "5px" }}>
                💡 Typing "RAM" in the notes will automatically update the system specs in the Hardware Directory.
              </p>
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
              Mark as Fixed & Log Time
            </button>
          </form>
        </div>
      </div>

      {/* ================= MODAL: ASSIGN TASK ================= */}
      <div className={`modal-overlay ${showAddTaskModal ? "active" : ""}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 className="modal-title">Assign New Task</h3>
            <button className="modal-close" onClick={() => setShowAddTaskModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleAddTaskSubmit}>
            <div className="form-group">
              <label>Task Title</label>
              <input 
                type="text" 
                className="form-control" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Complete System Tracking UI"
                required 
              />
            </div>

            <div className="form-group">
              <label>Task Description</label>
              <textarea 
                className="form-control" 
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Describe the task instructions here..."
                style={{ height: "100px", resize: "none" }}
              />
            </div>

            <div className="form-group">
              <label>Assign to Team Member</label>
              <select 
                className="form-control" 
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                required
              >
                {employees.filter(e => 
                  e.role !== "Admin" && e.role !== "Management" &&
                  (!isTeamLeader || !leaderDepartment || e.department?.toLowerCase() === leaderDepartment.toLowerCase())
                ).map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAddTaskModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Assign Task</button>
            </div>
          </form>
        </div>
      </div>

      {/* ================= MODAL: VIEW TASK DETAILS ================= */}
      <div className={`modal-overlay ${showTaskDetailsModal ? "active" : ""}`} style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--bg-primary)",
        zIndex: 1500,
        overflowY: "auto",
        display: showTaskDetailsModal ? "block" : "none",
        padding: "2rem"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { setShowTaskDetailsModal(false); setSelectedTaskDetails(null); }}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", padding: "8px 16px" }}
              >
                ⬅️ Back to Task Board
              </button>
              <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-primary)", fontWeight: "700" }}>Task Details & Attachment Viewer</h2>
            </div>
            <button 
              onClick={() => { setShowTaskDetailsModal(false); setSelectedTaskDetails(null); }}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.8rem", cursor: "pointer" }}
            >
              &times;
            </button>
          </div>

          {selectedTaskDetails && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
              {/* Left Column: Details Card */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.02)", 
                border: "1px solid rgba(255, 255, 255, 0.06)", 
                borderRadius: "12px", 
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "20px"
              }}>
                <div>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "1.3rem", color: "var(--accent-cyan)", fontWeight: "700" }}>
                    {selectedTaskDetails.title}
                  </h3>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    {selectedTaskDetails.description || "No description provided."}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>Status</span>
                    <span className={`status-badge badge-${selectedTaskDetails.status === 'In Progress' ? 'progress' : (selectedTaskDetails.status === 'Completed' ? 'resolved' : 'open')}`} style={{ marginTop: "6px", display: "inline-block" }}>
                      {selectedTaskDetails.status}
                    </span>
                  </div>

                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>Time Spent</span>
                    <span style={{ color: "var(--accent-cyan)", fontSize: "1.2rem", fontFamily: "monospace", fontWeight: "bold", display: "block", marginTop: "4px" }}>
                      {(() => {
                        let displayDuration = selectedTaskDetails.totalDuration || 0;
                        if (selectedTaskDetails.status === 'In Progress' && selectedTaskDetails.startedAt) {
                          const elapsed = Math.floor((Date.now() - new Date(selectedTaskDetails.startedAt).getTime()) / 1000);
                          displayDuration += Math.max(0, elapsed);
                        }
                        const h = Math.floor(displayDuration / 3600);
                        const m = Math.floor((displayDuration % 3600) / 60);
                        const s = displayDuration % 60;
                        return `${h}h ${m}m ${s}s`;
                      })()}
                    </span>
                  </div>

                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>Assigned To</span>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: "600", display: "block", marginTop: "4px" }}>
                      {selectedTaskDetails.assignedToName || "Unassigned"}
                    </span>
                  </div>

                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>Assigned By</span>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.95rem", display: "block", marginTop: "4px" }}>
                      {selectedTaskDetails.assignedByName || "System"}
                    </span>
                  </div>

                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>Created Date</span>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", display: "block", marginTop: "4px" }}>
                      {selectedTaskDetails.createdAt ? new Date(selectedTaskDetails.createdAt).toLocaleString() : "—"}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>Completed Date</span>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", display: "block", marginTop: "4px" }}>
                      {selectedTaskDetails.completedAt ? new Date(selectedTaskDetails.completedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Files & Galleries */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.02)", 
                border: "1px solid rgba(255, 255, 255, 0.06)", 
                borderRadius: "12px", 
                padding: "2rem",
                minHeight: "450px"
              }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", color: "var(--text-primary)", fontWeight: "600", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
                  📁 Uploaded Attachments & Proofs Gallery
                </h3>

                {selectedTaskDetails.fileUrl ? (() => {
                  let urls = [];
                  try {
                    if (selectedTaskDetails.fileUrl.startsWith('[')) {
                      urls = JSON.parse(selectedTaskDetails.fileUrl);
                    } else {
                      urls = [selectedTaskDetails.fileUrl];
                    }
                  } catch (e) {
                    urls = [selectedTaskDetails.fileUrl];
                  }

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      {urls.map((url, idx) => {
                        const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url);
                        return (
                          <div key={idx} style={{ 
                            border: "1px solid rgba(255, 255, 255, 0.08)", 
                            borderRadius: "10px", 
                            padding: "16px", 
                            background: "rgba(255, 255, 255, 0.01)"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: "600" }}>
                                📄 File Attachment #{idx + 1}
                              </span>
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn-primary" 
                                style={{ padding: "6px 14px", fontSize: "0.8rem", textDecoration: "none" }}
                              >
                                🔗 Open Original File
                              </a>
                            </div>
                            
                            {isImage ? (
                              <div style={{ display: "flex", justifyContent: "center", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "10px" }}>
                                <a href={url} target="_blank" rel="noopener noreferrer" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                                  <img 
                                    src={url} 
                                    alt={`Attachment Proof ${idx + 1}`} 
                                    style={{ 
                                      maxWidth: "100%", 
                                      maxHeight: "500px", 
                                      borderRadius: "8px", 
                                      border: "1px solid rgba(255, 255, 255, 0.05)",
                                      objectFit: "contain",
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                                    }} 
                                  />
                                </a>
                              </div>
                            ) : (
                              <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "12px", 
                                padding: "16px", 
                                background: "rgba(255,255,255,0.02)", 
                                borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.05)"
                              }}>
                                <span style={{ fontSize: "2rem" }}>📄</span>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: "500", wordBreak: "break-all" }}>
                                    {url.split('/').pop()}
                                  </span>
                                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "2px" }}>
                                    Document / Non-Image format
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    height: "200px", 
                    border: "1px dashed rgba(255,255,255,0.1)", 
                    borderRadius: "12px" 
                  }}>
                    <span style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📁</span>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
                      No attachments uploaded for this task.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD EMPLOYEE ================= */}
      <div className={`modal-overlay ${showAddEmpModal ? "active" : ""}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 className="modal-title">Add New Team Member</h3>
            <button className="modal-close" onClick={() => setShowAddEmpModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleAddEmployeeSubmit}>
            <div className="form-group">
              <label>Team Member Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                placeholder="e.g. Sarabjot"
                required 
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={newEmpEmail}
                onChange={(e) => setNewEmpEmail(e.target.value)}
                placeholder="e.g. sarabjot@example.com (Optional)" 
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Leave blank to auto-generate: first name in lowercase + '@devicedesk.com'
              </span>
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={newEmpPassword}
                onChange={(e) => setNewEmpPassword(e.target.value)}
                placeholder="e.g. password123 (Optional)" 
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Leave blank to auto-generate: first name in lowercase + '123'
              </span>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select 
                className="form-control" 
                value={newEmpRole}
                onChange={(e) => setNewEmpRole(e.target.value)}
              >
                <option value="Team Member">Team Member</option>
                <option value="Team Leader">Team Leader</option>
                <option value="IT Engineer">IT Engineer</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div className="form-group">
              <label>Department</label>
              <select 
                className="form-control" 
                value={newEmpDept}
                onChange={(e) => setNewEmpDept(e.target.value)}
              >
                {departments.map(dept => (
                  <option value={dept.name} key={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ticket Limit (Raise limit)</label>
              <input 
                type="number" 
                className="form-control" 
                value={newEmpLimit}
                onChange={(e) => setNewEmpLimit(parseInt(e.target.value) || 5)}
                min="1"
                max="999"
                required 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
              Add Team Member
            </button>
          </form>
        </div>
      </div>

      {/* ================= MODAL: EDIT EMPLOYEE ================= */}
      <div className={`modal-overlay ${showEditEmpModal ? "active" : ""}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 className="modal-title">Edit Team Member Profile</h3>
            <button className="modal-close" onClick={() => setShowEditEmpModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleEditEmployeeSubmit}>
            <div className="form-group">
              <label>Team Member Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={editingEmp.name}
                onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                placeholder="e.g. Sarabjot"
                required 
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={editingEmp.email}
                onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                placeholder="e.g. sarabjot@example.com"
                required 
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select 
                className="form-control" 
                value={editingEmp.role}
                onChange={(e) => setEditingEmp({ ...editingEmp, role: e.target.value })}
              >
                <option value="Team Member">Team Member</option>
                <option value="Team Leader">Team Leader</option>
                <option value="IT Engineer">IT Engineer</option>
                <option value="Management">Management</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Department</label>
              <select 
                className="form-control" 
                value={editingEmp.department}
                onChange={(e) => setEditingEmp({ ...editingEmp, department: e.target.value })}
              >
                {departments.map(dept => (
                  <option value={dept.name} key={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ticket Limit (Raise limit)</label>
              <input 
                type="number" 
                className="form-control" 
                value={editingEmp.ticketLimit}
                onChange={(e) => setEditingEmp({ ...editingEmp, ticketLimit: parseInt(e.target.value) || 5 })}
                min="1"
                max="999"
                required 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
              Save Changes
            </button>
          </form>
        </div>
      </div>

      {/* ================= MODAL: SYSTEM HISTORY REPORT ================= */}
      {isHistoryModalOpen && selectedHistorySys && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: "750px", width: "90%" }}>
            <div className="modal-header">
              <h3 className="modal-title">🖥️ System History: {selectedHistorySys.systemNumber}</h3>
              <button className="modal-close" onClick={() => setIsHistoryModalOpen(false)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: "65vh", overflowY: "auto", paddingRight: "6px" }}>
              {/* Spec Overview */}
              <div className="panel-card" style={{ marginBottom: "15px", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "var(--accent-cyan)", fontSize: "1.1rem" }}>{selectedHistorySys.model || "Generic PC"}</h4>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      CPU: {selectedHistorySys.cpu} | GPU: {selectedHistorySys.gpu || "Integrated"} | RAM: {selectedHistorySys.ram} | Storage: {selectedHistorySys.storage} | OS: {selectedHistorySys.os}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDownloadSystemReport(selectedHistorySys)}
                    className="btn-action start"
                    style={{ padding: "8px 14px", background: "var(--accent-cyan)", color: "#000" }}
                  >
                    📥 Download Report
                  </button>
                </div>
              </div>

              {/* Assignment logs section */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ borderBottom: "1px solid #30363d", paddingBottom: "6px", marginBottom: "10px" }}>Assignment History Logs</h4>
                {assignmentHistory.filter(h => h.systemId === selectedHistorySys.id).length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No assignment logs recorded for this machine.</p>
                ) : (
                  <div className="table-wrapper" style={{ maxHeight: "180px", overflowY: "auto" }}>
                    <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Team Member</th>
                          <th>Timestamp</th>
                          <th>Assigned By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentHistory.filter(h => h.systemId === selectedHistorySys.id).map(log => {
                          const emp = employees.find(e => e.id === log.employeeId);
                          return (
                            <tr key={log.id}>
                              <td><span className={`status-tag ${log.action.toLowerCase() === "assigned" ? "resolved" : "open"}`}>{log.action}</span></td>
                              <td><strong>{emp ? emp.name : "Unknown"}</strong></td>
                              <td>{new Date(log.timestamp).toLocaleString()}</td>
                              <td>{log.assignedBy || "System"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Related Tickets section */}
              <div>
                <h4 style={{ borderBottom: "1px solid #30363d", paddingBottom: "6px", marginBottom: "10px" }}>Related IT Issues & Complaints</h4>
                {tickets.filter(t => t.systemId === selectedHistorySys.id).length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No issues raised for this machine.</p>
                ) : (
                  <div className="table-wrapper" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.filter(t => t.systemId === selectedHistorySys.id).map(t => (
                          <tr key={t.id}>
                            <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{t.id}</td>
                            <td>{t.category}</td>
                            <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.description}>{t.description}</td>
                            <td><span className={`status-tag ${t.severity.toLowerCase()}`}>{t.severity}</span></td>
                            <td><span className={`status-tag ${t.status.toLowerCase().replace(" ", "")}`}>{t.status}</span></td>
                            <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EMPLOYEE PERFORMANCE & ACTIVITY REPORT ================= */}
      {showEmpReportModal && (() => {
        const from = empReportFrom ? new Date(empReportFrom + "T00:00:00") : null;
        const to = empReportTo ? new Date(empReportTo + "T23:59:59") : null;

        const currentDevices = empReportTarget ? systems.filter(s => s.assignedTo === empReportTarget.id) : [];

        const empLogs = empReportTarget ? assignmentHistory.filter(h => {
          if (h.employeeId !== empReportTarget.id) return false;
          if (!h.timestamp) return false;
          const ts = new Date(h.timestamp);
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        }) : [];

        const empTickets = empReportTarget ? tickets.filter(t => {
          const matchEmp = t.raisedBy === empReportTarget.id || t.employeeId === empReportTarget.id;
          if (!matchEmp) return false;
          if (!t.createdAt) return false;
          const ts = new Date(t.createdAt);
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        }) : [];

        const empTasks = empReportTarget ? tasks.filter(t => {
          if (t.assignedTo !== empReportTarget.id) return false;
          if (!t.createdAt) return false;
          const ts = new Date(t.createdAt);
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        }) : [];

        return (
          <div className="modal-overlay active">
            <div className="modal-card" style={{ maxWidth: "850px", width: "95%" }}>
              <div className="modal-header" style={{ paddingBottom: "10px" }}>
                <h3 className="modal-title">📊 Team Member Performance Report</h3>
                <button className="modal-close" onClick={() => setShowEmpReportModal(false)}>&times;</button>
              </div>

              {/* Selection & Filters Banner */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end", marginBottom: "20px", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Select Team Member</label>
                  <select 
                    className="form-control"
                    value={empReportTarget?.id || ""}
                    onChange={(e) => {
                      const selectedEmp = employees.find(emp => emp.id === e.target.value);
                      setEmpReportTarget(selectedEmp || null);
                    }}
                    style={{ width: "100%", padding: "6px 10px" }}
                  >
                    <option value="">-- Choose Team Member --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department} - {emp.role})</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: "1 1 150px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>From Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={empReportFrom} 
                    onChange={(e) => setEmpReportFrom(e.target.value)} 
                    style={{ width: "100%", padding: "6px 10px" }}
                  />
                </div>
                <div style={{ flex: "1 1 150px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>To Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={empReportTo} 
                    onChange={(e) => setEmpReportTo(e.target.value)} 
                    style={{ width: "100%", padding: "6px 10px" }}
                  />
                </div>
                <div>
                  <button 
                    onClick={() => {
                      if (!empReportTarget) {
                        Swal.fire({ icon: 'warning', title: 'Selection Required', text: 'Please select a team member first.' });
                        return;
                      }
                      handleDownloadEmpReport(empReportTarget, empReportFrom, empReportTo);
                    }}
                    className="btn-action start"
                    style={{ padding: "8px 14px", background: "var(--accent-cyan)", color: "#000", fontWeight: "600", whiteSpace: "nowrap" }}
                  >
                    📥 Download CSV Report
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="modal-body" style={{ maxHeight: "55vh", overflowY: "auto", paddingRight: "6px" }}>
                {!empReportTarget ? (
                  <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Please select a team member from the dropdown list above to generate their performance and activity report.
                  </div>
                ) : (
                  <>
                    {/* Employee Info Details Banner */}
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                      <div><strong>Dept:</strong> {empReportTarget.department || "N/A"}</div>
                      <div><strong>Role:</strong> {empReportTarget.role || "N/A"}</div>
                      <div><strong>Email:</strong> {empReportTarget.email || "N/A"}</div>
                      <div><strong>Ticket Limit:</strong> {empReportTarget.ticketLimit || 5}</div>
                    </div>

                    {/* Section 1: Assigned Devices */}
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ color: "var(--accent-cyan)", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px", marginBottom: "12px", fontSize: "1rem" }}>
                        <span>🖥️ Assigned Devices ({currentDevices.length})</span>
                      </h4>
                      {currentDevices.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No devices currently assigned to this team member.</p>
                      ) : (
                        <div className="table-wrapper">
                          <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                            <thead>
                              <tr>
                                <th>System Number</th>
                                <th>Model</th>
                                <th>OS</th>
                                <th>Specs</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentDevices.map(s => (
                                <tr key={s.id}>
                                  <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{s.systemNumber}</td>
                                  <td>{s.model || "Generic PC"}</td>
                                  <td>{s.os || "Windows 11"}</td>
                                  <td>{s.cpu} / {s.ram} / {s.storage}</td>
                                  <td><span className={`status-tag ${s.status?.toLowerCase() === "active" ? "resolved" : "open"}`}>{s.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Device Assignment History Logs */}
                      <h5 style={{ marginTop: "12px", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Device Transfer Logs In Range ({empLogs.length})</h5>
                      {empLogs.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No device assignment or transfer logs recorded for this period.</p>
                      ) : (
                        <div className="table-wrapper" style={{ maxHeight: "150px", overflowY: "auto" }}>
                          <table className="custom-table" style={{ fontSize: "0.8rem" }}>
                            <thead>
                              <tr>
                                <th>Action</th>
                                <th>System Number</th>
                                <th>Timestamp</th>
                                <th>Assigned By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empLogs.map(log => (
                                <tr key={log.id}>
                                  <td><span className={`status-tag ${log.action.toLowerCase().includes("assign") ? "resolved" : "open"}`}>{log.action}</span></td>
                                  <td><strong>{log.systemNumber}</strong></td>
                                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                                  <td>{log.assignedBy || "System"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Section 2: Complaints & Tickets */}
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ color: "var(--accent-purple)", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px", marginBottom: "12px", fontSize: "1rem" }}>
                        📋 Issues & Complaints Raised In Range ({empTickets.length})
                      </h4>
                      {empTickets.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No issues or complaints registered by this team member during this period.</p>
                      ) : (
                        <div className="table-wrapper" style={{ maxHeight: "200px", overflowY: "auto" }}>
                          <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Severity</th>
                                <th>Status</th>
                                <th>Date Raised</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empTickets.map(t => (
                                <tr key={t.id}>
                                  <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{t.id}</td>
                                  <td>{t.category}</td>
                                  <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.description}>{t.description}</td>
                                  <td><span className={`status-tag ${t.severity.toLowerCase()}`}>{t.severity}</span></td>
                                  <td><span className={`status-tag ${t.status.toLowerCase().replace(" ", "")}`}>{t.status}</span></td>
                                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Section 3: Tasks Assigned */}
                    <div style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--accent-blue)", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px", marginBottom: "12px", fontSize: "1rem" }}>
                        📅 Assigned Tasks In Range ({empTasks.length})
                      </h4>
                      {empTasks.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No tasks assigned to this team member during this period.</p>
                      ) : (
                        <div className="table-wrapper" style={{ maxHeight: "200px", overflowY: "auto" }}>
                          <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                            <thead>
                              <tr>
                                <th>Task Title</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Duration (mins)</th>
                                <th>Date Assigned</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empTasks.map(t => {
                                const durationMins = t.totalDuration ? Math.round(t.totalDuration / 60) : 0;
                                return (
                                  <tr key={t.id}>
                                    <td><strong>{t.title}</strong></td>
                                    <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.description}>{t.description || "—"}</td>
                                    <td><span className={`status-tag ${t.status.toLowerCase().replace(" ", "")}`}>{t.status}</span></td>
                                    <td>{durationMins > 0 ? `${durationMins} mins` : "—"}</td>
                                    <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
        }}>
          <div style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "24px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            textAlign: "center",
          }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "3px solid var(--status-critical)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
              margin: "0 auto 1rem auto"
            }}>
              ⚠️
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Are you sure?</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
              You will not be able to revert this account deletion! All assignments and tickets will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  removeEmployee(user.id);
                  logout();
                  router.push("/login");
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  border: "none",
                  background: "var(--status-critical)",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Yes, delete it!
              </button>
            </div>
          </div>
        </div>
      )}

    {/* ====================== BULK IMPORT SYSTEMS MODAL ====================== */}
    {showImportModal && (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: "20px"
      }}>
        <div style={{
          background: "var(--bg-secondary)", border: "1px solid var(--glass-border)",
          borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "760px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto"
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>📤 Bulk Import Systems</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "4px" }}>Upload an Excel (.xlsx) or CSV file to add multiple systems at once</p>
            </div>
            <button onClick={() => setShowImportModal(false)}
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "0.9rem" }}>✕ Close</button>
          </div>

          {/* Template Download */}
          <div style={{
            background: "rgba(34,160,90,0.08)", border: "1px solid rgba(34,160,90,0.3)",
            borderRadius: "10px", padding: "12px 16px", marginBottom: "18px",
            display: "flex", alignItems: "center", gap: "12px"
          }}>
            <span style={{ fontSize: "1.4rem" }}>📋</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: "600", color: "var(--text-primary)", fontSize: "0.88rem" }}>Download Import Template</p>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.78rem" }}>Columns: System Number, Model, OS, CPU, GPU, RAM, Storage, Status, <strong style={{color:"#22a05a"}}>Assigned To</strong> (employee name or email — optional), Remarks</p>
            </div>
            <button onClick={handleDownloadTemplate}
              style={{ background: "linear-gradient(135deg,#1a6b3c,#22a05a)", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 16px", cursor: "pointer", fontWeight: "600", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
              ⬇ Get Template
            </button>
          </div>

          {/* File picker */}
          {importStatus !== 'done' && (
            <div style={{
              border: "2px dashed var(--glass-border)", borderRadius: "10px",
              padding: "24px", textAlign: "center", marginBottom: "18px",
              background: "var(--bg-tertiary)", cursor: "pointer"
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📁</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "12px" }}>
                {importFile ? `Selected: ${importFile.name}` : 'Choose your Excel (.xlsx) or CSV file'}
              </p>
              <label style={{ cursor: "pointer" }}>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFileChange}
                  style={{ display: "none" }} />
                <span style={{
                  background: "var(--accent-cyan)", color: "#0d1117", fontWeight: "700",
                  borderRadius: "8px", padding: "8px 20px", fontSize: "0.85rem", cursor: "pointer"
                }}>Browse File</span>
              </label>
            </div>
          )}

          {/* Preview table */}
          {importStatus === 'preview' && importParsed.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "8px" }}>
                📊 Preview — <strong style={{ color: "var(--text-primary)" }}>{importParsed.length} rows</strong> detected. Review before importing.
              </p>
              <div style={{ overflowX: "auto", maxHeight: "220px", overflowY: "auto", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-tertiary)", position: "sticky", top: 0 }}>
                      {Object.keys(importParsed[0]).slice(0, 9).map(h => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "var(--accent-cyan)", borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importParsed.slice(0, 20).map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {Object.values(row).slice(0, 9).map((val, j) => (
                          <td key={j} style={{ padding: "5px 10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importParsed.length > 20 && <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "6px" }}>...and {importParsed.length - 20} more rows</p>}

              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <button onClick={() => { setImportFile(null); setImportParsed([]); setImportStatus(null); }}
                  style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid var(--glass-border)", background: "var(--bg-tertiary)", color: "var(--text-primary)", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}>
                  ↩ Change File
                </button>
                <button onClick={handleConfirmImport}
                  style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg,#1a6b3c,#22a05a)", color: "#fff", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" }}>
                  ✅ Confirm & Import {importParsed.length} Systems
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {importStatus === 'loading' && (
            <div style={{ textAlign: "center", padding: "30px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
              <p style={{ color: "var(--text-secondary)" }}>Importing systems, please wait...</p>
            </div>
          )}

          {/* Result */}
          {importStatus === 'done' && importResult && (
            <div>
              <div style={{
                background: "rgba(34,160,90,0.1)", border: "1px solid rgba(34,160,90,0.4)",
                borderRadius: "10px", padding: "16px", marginBottom: "14px"
              }}>
                <h3 style={{ color: "#22a05a", margin: "0 0 6px 0", fontSize: "1.05rem" }}>✅ Import Complete!</h3>
                <p style={{ color: "var(--text-primary)", margin: 0, fontSize: "0.88rem" }}>
                  <strong>{importResult.imported}</strong> systems imported successfully.
                </p>
              </div>

              {importResult.duplicates?.length > 0 && (
                <div style={{
                  background: "rgba(255,168,0,0.08)", border: "1px solid rgba(255,168,0,0.35)",
                  borderRadius: "10px", padding: "14px", marginBottom: "10px"
                }}>
                  <p style={{ color: "#ffa800", fontWeight: "700", margin: "0 0 6px 0", fontSize: "0.88rem" }}>
                    ⚠️ {importResult.duplicates.length} Duplicate(s) Skipped
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>
                    These System Numbers already exist: <em>{importResult.duplicates.join(', ')}</em>
                  </p>
                </div>
              )}

              {importResult.errors?.length > 0 && (
                <div style={{
                  background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.35)",
                  borderRadius: "10px", padding: "14px", marginBottom: "10px"
                }}>
                  <p style={{ color: "#dc2626", fontWeight: "700", margin: "0 0 6px 0", fontSize: "0.88rem" }}>
                    ❌ {importResult.errors.length} Row(s) Had Errors
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>
                    Rows missing a System Number were skipped.
                  </p>
                </div>
              )}

              <button onClick={() => { setShowImportModal(false); window.location.reload(); }}
                style={{ marginTop: "10px", padding: "9px 22px", borderRadius: "8px", border: "none", background: "var(--accent-cyan)", color: "#0d1117", fontWeight: "700", cursor: "pointer" }}>
                Done — Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* ====================== BULK IMPORT EMPLOYEES MODAL ====================== */}
    {showEmpImportModal && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px'
      }}>
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
          borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '780px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>📤 Bulk Import Employees</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Upload an Excel (.xlsx) or CSV file — passwords will be bcrypt encrypted automatically</p>
            </div>
            <button onClick={() => setShowEmpImportModal(false)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.9rem' }}>✕ Close</button>
          </div>

          {/* Template download */}
          <div style={{
            background: 'rgba(34,96,212,0.08)', border: '1px solid rgba(34,96,212,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '18px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.88rem' }}>Download Import Template</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Columns: Name, Email, Password, Role, Department, Ticket Limit — passwords auto-encrypted</p>
            </div>
            <button onClick={handleDownloadEmpTemplate}
              style={{ background: 'linear-gradient(135deg,#1a3a6b,#2260d4)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              ⬇ Get Template
            </button>
          </div>

          {/* File picker */}
          {empImportStatus !== 'done' && (
            <div style={{
              border: '2px dashed var(--glass-border)', borderRadius: '10px',
              padding: '24px', textAlign: 'center', marginBottom: '18px',
              background: 'var(--bg-tertiary)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👥</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                {empImportFile ? `Selected: ${empImportFile.name}` : 'Choose your Excel (.xlsx) or CSV file'}
              </p>
              <label style={{ cursor: 'pointer' }}>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleEmpImportFileChange} style={{ display: 'none' }} />
                <span style={{
                  background: 'var(--accent-cyan)', color: '#0d1117', fontWeight: '700',
                  borderRadius: '8px', padding: '8px 20px', fontSize: '0.85rem', cursor: 'pointer'
                }}>Browse File</span>
              </label>
            </div>
          )}

          {/* Preview table */}
          {empImportStatus === 'preview' && empImportParsed.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
                📊 Preview — <strong style={{ color: 'var(--text-primary)' }}>{empImportParsed.length} rows</strong> detected. Review before importing.
              </p>
              <div style={{ overflowX: 'auto', maxHeight: '220px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', position: 'sticky', top: 0 }}>
                      {Object.keys(empImportParsed[0]).slice(0, 6).map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--accent-cyan)', borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empImportParsed.slice(0, 20).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {Object.values(row).slice(0, 6).map((val, j) => (
                          <td key={j} style={{ padding: '5px 10px', color: j === 2 ? '#888' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {j === 2 ? '••••••••' : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {empImportParsed.length > 20 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '6px' }}>...and {empImportParsed.length - 20} more rows</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button onClick={() => { setEmpImportFile(null); setEmpImportParsed([]); setEmpImportStatus(null); }}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                  ↩ Change File
                </button>
                <button onClick={handleConfirmEmpImport}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#1a3a6b,#2260d4)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
                  ✅ Confirm & Import {empImportParsed.length} Employees
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {empImportStatus === 'loading' && (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <p style={{ color: 'var(--text-secondary)' }}>Encrypting passwords & importing employees...</p>
            </div>
          )}

          {/* Result */}
          {empImportStatus === 'done' && empImportResult && (
            <div>
              <div style={{
                background: 'rgba(34,96,212,0.1)', border: '1px solid rgba(34,96,212,0.4)',
                borderRadius: '10px', padding: '16px', marginBottom: '14px'
              }}>
                <h3 style={{ color: '#4d90fe', margin: '0 0 6px 0', fontSize: '1.05rem' }}>✅ Import Complete!</h3>
                <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.88rem' }}>
                  <strong>{empImportResult.imported}</strong> employees imported successfully with encrypted passwords.
                </p>
              </div>

              {empImportResult.duplicates?.length > 0 && (
                <div style={{
                  background: 'rgba(255,168,0,0.08)', border: '1px solid rgba(255,168,0,0.35)',
                  borderRadius: '10px', padding: '14px', marginBottom: '10px'
                }}>
                  <p style={{ color: '#ffa800', fontWeight: '700', margin: '0 0 6px 0', fontSize: '0.88rem' }}>
                    ⚠️ {empImportResult.duplicates.length} Duplicate(s) Skipped
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                    Already exist: <em>{empImportResult.duplicates.join(', ')}</em>
                  </p>
                </div>
              )}

              {empImportResult.errors?.length > 0 && (
                <div style={{
                  background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.35)',
                  borderRadius: '10px', padding: '14px', marginBottom: '10px'
                }}>
                  <p style={{ color: '#dc2626', fontWeight: '700', margin: '0 0 6px 0', fontSize: '0.88rem' }}>
                    ❌ {empImportResult.errors.length} Row(s) Had Errors
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Rows missing a Name were skipped.</p>
                </div>
              )}

              <button onClick={() => { setShowEmpImportModal(false); window.location.reload(); }}
                style={{ marginTop: '10px', padding: '9px 22px', borderRadius: '8px', border: 'none', background: 'var(--accent-cyan)', color: '#0d1117', fontWeight: '700', cursor: 'pointer' }}>
                Done — Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    )}
      {/* ================= MODAL: DETAILED SYSTEM INFO ================= */}
      {selectedViewSystem && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: "600px", width: "90%" }}>
            <div className="modal-header">
              <h3 className="modal-title">💻 Device Specification Details</h3>
              <button className="modal-close" onClick={() => setSelectedViewSystem(null)}>&times;</button>
            </div>
            <div style={{ color: "var(--text-primary)", padding: "1rem 0", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>System Number:</strong>
                  <span style={{ color: "var(--accent-blue)", fontWeight: "bold" }}>{selectedViewSystem.systemNumber}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>Model:</strong>
                  <span>{selectedViewSystem.model}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>OS:</strong>
                  <span>{selectedViewSystem.os}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>CPU:</strong>
                  <span>{selectedViewSystem.cpu}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>GPU:</strong>
                  <span>{selectedViewSystem.gpu || "N/A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>RAM:</strong>
                  <span>{selectedViewSystem.ram}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>Storage:</strong>
                  <span>{selectedViewSystem.storage}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>Status:</strong>
                  <span className={`status-tag ${selectedViewSystem.status === 'Active' ? 'resolved' : 'progress'}`}>{selectedViewSystem.status}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-muted)" }}>Remarks / Hardware Issues:</strong>
                  <div style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "8px", borderRadius: "6px", fontSize: "0.85rem", minHeight: "40px" }}>
                    {selectedViewSystem.remarks || "No remarks or known hardware issues."}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.5rem" }}>
                  <strong style={{ color: "var(--text-muted)", borderBottom: "1px solid #30363d", paddingBottom: "6px", marginBottom: "8px" }}>📜 Device Assignment History (Past Users):</strong>
                  {(() => {
                    const sysLogs = assignmentHistory.filter(h => h.systemId === selectedViewSystem.id);
                    if (sysLogs.length === 0) {
                      return <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0 }}>No past assignment logs recorded for this machine.</p>;
                    }
                    return (
                      <div className="table-wrapper" style={{ maxHeight: "150px", overflowY: "auto", marginTop: "4px" }}>
                        <table className="custom-table" style={{ fontSize: "0.8rem", width: "100%" }}>
                          <thead>
                            <tr>
                              <th>Action</th>
                              <th>Team Member</th>
                              <th>Timestamp</th>
                              <th>Assigned By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sysLogs.map(log => {
                              const emp = employees.find(e => e.id === log.employeeId);
                              return (
                                <tr key={log.id}>
                                  <td><span className={`status-tag ${log.action.toLowerCase() === "assigned" ? "resolved" : "open"}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{log.action}</span></td>
                                  <td><strong style={{ fontSize: "0.8rem" }}>{emp ? emp.name : "Unknown"}</strong></td>
                                  <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{new Date(log.timestamp).toLocaleString()}</td>
                                  <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{log.assignedBy || "System"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
            <div style={{ textAlign: "right", marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <button className="btn-action start" onClick={() => setSelectedViewSystem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DEPARTMENT SYSTEMS LIST ================= */}
      {selectedViewDept && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <h3 className="modal-title">🏢 Devices in {selectedViewDept} Department</h3>
              <button className="modal-close" onClick={() => setSelectedViewDept(null)}>&times;</button>
            </div>
            <div style={{ color: "var(--text-primary)", padding: "1rem 0" }}>
              {(() => {
                const deptEmployees = employees.filter(e => e.department?.toLowerCase() === selectedViewDept.toLowerCase());
                const deptSystems = systems.filter(s => deptEmployees.some(e => e.id === s.assignedTo));
                
                if (deptSystems.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      No systems are currently assigned to team members in the {selectedViewDept} department.
                    </div>
                  );
                }
                
                return (
                  <div className="table-wrapper">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>System Number</th>
                          <th>Model</th>
                          <th>Specs (CPU/RAM/GPU)</th>
                          <th>Assigned Team Member</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptSystems.map(sys => {
                          const assignee = employees.find(e => e.id === sys.assignedTo);
                          return (
                            <tr key={sys.id}>
                              <td><strong style={{ color: "var(--accent-blue)" }}>{sys.systemNumber}</strong></td>
                              <td>{sys.model}</td>
                              <td>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                  CPU: {sys.cpu} | RAM: {sys.ram} | GPU: {sys.gpu || "N/A"}
                                </div>
                              </td>
                              <td>{assignee ? `${assignee.name} (${assignee.email})` : "Unassigned"}</td>
                              <td>
                                <span className={`status-tag ${sys.status === 'Active' ? 'resolved' : 'progress'}`}>{sys.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <div style={{ textAlign: "right", marginTop: "1rem" }}>
              <button className="btn-action start" onClick={() => setSelectedViewDept(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
