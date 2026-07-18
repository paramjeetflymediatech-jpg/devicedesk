"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import {
  getSystems,
  getTickets,
  getEmployees,
  getAssignmentHistory,
  createTicket,
  removeEmployee,
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  startTask,
  stopTask,
  completeTask
} from "../store";

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Redirect if not authenticated or not an employee
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (user.role === "admin") {
      router.push("/");
    }
  }, [user, router]);

  // States
  const [currentView, setCurrentView] = useState("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("devicedesk_employee_view");
      if (saved) setCurrentView(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("devicedesk_employee_view", currentView);
    }
  }, [currentView]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Performance report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  
  // Self Task States
  const [showSelfTaskModal, setShowSelfTaskModal] = useState(false);
  const [selfTaskTitle, setSelfTaskTitle] = useState("");
  const [selfTaskDesc, setSelfTaskDesc] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("Pending");
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Complaint Form States
  const [category, setCategory] = useState("RAM/Speed");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 3;
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const mySystems = systems.filter(s => s.assignedTo === user?.id);

  const refreshData = () => {
    setSystems(getSystems());
    setTickets(getTickets());
    setEmployees(getEmployees());
    setAssignmentHistory(getAssignmentHistory());
    setTasks(getTasks());
  };

  const handleOpenReportModal = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setReportFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setReportTo(today.toISOString().split('T')[0]);
    setShowReportModal(true);
  };

  const handleCreateSelfTaskSubmit = (e) => {
    e.preventDefault();
    if (!selfTaskTitle.trim()) {
      Swal.fire({ icon: 'warning', title: 'Validation', text: 'Task title is required.' });
      return;
    }

    addTask({
      title: selfTaskTitle,
      description: selfTaskDesc,
      assignedTo: user?.id,
      assignedToName: user?.name || 'Employee',
      assignedBy: user?.id,
      assignedByName: user?.name || 'Employee'
    });

    setShowSelfTaskModal(false);
    setSelfTaskTitle("");
    setSelfTaskDesc("");
    refreshData();
    playBeep(900, 0.1);
    Swal.fire({ icon: 'success', title: 'Created', text: 'Task successfully created for yourself!' });
  };

  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      Swal.fire({ icon: 'warning', title: 'Validation', text: 'Task title is required.' });
      return;
    }

    const updatedTask = {
      ...editingTask,
      title: editTaskTitle.trim(),
      description: editTaskDesc.trim(),
      status: editTaskStatus
    };

    if (editTaskStatus === 'Completed' && editingTask.status !== 'Completed') {
      updatedTask.completedAt = new Date().toISOString();
    } else if (editTaskStatus !== 'Completed') {
      updatedTask.completedAt = null;
    }

    updateTask(updatedTask, user?.name || 'Employee');
    setShowEditTaskModal(false);
    setEditingTask(null);
    refreshData();
    playBeep(800, 0.1);
    Swal.fire({ icon: 'success', title: 'Updated', text: 'Task successfully updated!' });
  };

  const handleDeleteSelfTask = (taskId, taskTitle) => {
    Swal.fire({
      title: `Delete Task?`,
      text: `Are you sure you want to delete task "${taskTitle}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (result.isConfirmed) {
        deleteTask(taskId, user?.name || 'Employee');
        refreshData();
        playBeep(400, 0.15, 'sawtooth');
        Swal.fire('Deleted!', `Task "${taskTitle}" has been deleted.`, 'success');
      }
    });
  };

  const handleDownloadReport = (fromDate, toDate) => {
    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;
    
    const empLogs = assignmentHistory.filter(h => {
      if (h.employeeId !== user.id) return false;
      if (!h.timestamp) return false;
      const ts = new Date(h.timestamp);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const empTickets = tickets.filter(t => {
      const matchEmp = t.raisedBy === user.id || t.employeeId === user.id;
      if (!matchEmp) return false;
      if (!t.createdAt) return false;
      const ts = new Date(t.createdAt);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const empTasks = tasks.filter(t => {
      if (t.assignedTo !== user.id) return false;
      if (!t.createdAt) return false;
      const ts = new Date(t.createdAt);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const csvRows = [];
    csvRows.push(`MY PERFORMANCE & ACTIVITY REPORT,${user.name}`);
    csvRows.push(`Role,${user.role || "Team Member"}`);
    csvRows.push(`Report Range,${fromDate || "Start"} to ${toDate || "End"}`);
    csvRows.push("");

    csvRows.push("CURRENT ASSIGNED DEVICES");
    csvRows.push("System ID,System Number,Model,OS,Status");
    const currentDevices = systems.filter(s => s.assignedTo === user.id);
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
    link.setAttribute("download", `my_performance_report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCompleteTaskClick = async (taskId, title) => {
    const confirm = await Swal.fire({
      title: 'Confirm Completion',
      text: `Are you sure you want to mark the task "${title}" as completed?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Complete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--status-resolved)',
      cancelButtonColor: '#30363d',
      background: '#161b22',
      color: '#f0f6fc',
    });

    if (!confirm.isConfirmed) return;

    const { value: files } = await Swal.fire({
      title: 'Upload Work Proof',
      html: `<div style="text-align: left; font-size: 0.9rem; color: #8b949e; margin-bottom: 10px;">
               <strong>Task:</strong> ${title}<br/>
               Upload files, images, or documents as proof (optional).
             </div>
             <input type="file" id="swal-multiple-files" class="swal2-file" multiple style="display: flex; margin: 15px auto;" />`,
      showCancelButton: true,
      confirmButtonText: 'Complete Task ✅',
      confirmButtonColor: 'var(--status-resolved)',
      cancelButtonColor: '#30363d',
      background: '#161b22',
      color: '#f0f6fc',
      preConfirm: () => {
        const fileInput = document.getElementById('swal-multiple-files');
        return fileInput ? Array.from(fileInput.files) : [];
      }
    });

    let fileUrl = null;
    if (files && files.length > 0) {
      Swal.fire({
        title: 'Uploading files...',
        didOpen: () => { Swal.showLoading(); },
        allowOutsideClick: false,
        background: '#161b22',
        color: '#f0f6fc'
      });

      try {
        const formData = new FormData();
        files.forEach(f => {
          formData.append('files', f);
        });

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        fileUrl = JSON.stringify(data.fileUrls);
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message, background: '#161b22', color: '#f0f6fc' });
        return;
      }
    }

    completeTask(taskId, user.name, fileUrl);
    refreshData();
    Swal.fire({
      icon: 'success',
      title: 'Completed',
      text: 'Task marked as completed successfully!',
      background: '#161b22',
      color: '#f0f6fc'
    });
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('devicedesk_db_synced', refreshData);
    return () => {
      window.removeEventListener('devicedesk_db_synced', refreshData);
    };
  }, []);

  if (!user || user.role === "admin") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading session...</p>
      </div>
    );
  }

  // Get current employee details
  const empDetails = employees.find(e => e.id === user.id) || { name: user.name, ticketLimit: 5 };

  // Guard for suspended/paused accounts
  if (empDetails && empDetails.status === 'Paused') {
    if (typeof window !== "undefined") {
      logout();
      Swal.fire({
        icon: 'error',
        title: 'Account Paused',
        text: 'Your account has been paused due to suspicious activities. Please contact Admin/IT Support.',
        background: '#161b22',
        color: '#f0f6fc',
        confirmButtonText: 'OK'
      }).then(() => {
        router.push("/login");
      });
    }
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--status-critical)", fontWeight: "bold" }}>🚫 Account Paused</p>
      </div>
    );
  }
  const employeeTickets = tickets.filter(t => t.employeeId === user.id);
  const activeSystems = systems.filter(s => s.assignedTo === user.id);
  const empHistory = assignmentHistory.filter(h => h.employeeId === user.id);

  // Filtered employee tickets
  const filteredTickets = employeeTickets.filter(t => {
    const query = searchQuery.toLowerCase();
    return t.category.toLowerCase().includes(query) ||
           t.severity.toLowerCase().includes(query) ||
           t.status.toLowerCase().includes(query) ||
           t.description.toLowerCase().includes(query) ||
           t.id.toLowerCase().includes(query);
  });

  // Paginated tickets calculation
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  // Issue raising limits
  const totalRaised = employeeTickets.length;
  const ticketLimit = empDetails.ticketLimit || 5;
  const remainingTickets = Math.max(0, ticketLimit - totalRaised);
  const isLimitReached = totalRaised >= ticketLimit;

  const handleRaiseComplaint = (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (isLimitReached) {
      setFormError(`You have reached your ticket limit of ${ticketLimit} issues.`);
      return;
    }

    if (!description.trim()) {
      setFormError("Please describe the issue.");
      return;
    }

    // Default to first assigned system, or 'sys_generic' if none
    const systemId = activeSystems.length > 0 ? activeSystems[0].id : "sys_none";

    createTicket(user.id, systemId, category, description, severity);
    setDescription("");
    setFormSuccess("Complaint ticket raised successfully!");
    setCurrentPage(1); // reset to page 1 to see the new ticket
    refreshData();
  };

  return (
    <div style={{ display: "contents" }} onClick={() => setUserDropdownOpen(false)}>
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
            <li className={`nav-item ${currentView === "overview" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("overview")}><span className="nav-icon">📊</span> Overview</button>
            </li>
            <li className={`nav-item ${currentView === "file-complaint" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("file-complaint")}><span className="nav-icon">🚨</span> File Complaint</button>
            </li>
            <li className={`nav-item ${currentView === "records" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("records")}><span className="nav-icon">📋</span> My Records</button>
            </li>
            <li className={`nav-item ${currentView === "tasks" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("tasks")}><span className="nav-icon">📅</span> Task Board</button>
            </li>
            <li className={`nav-item ${currentView === "profile" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("profile")}><span className="nav-icon">👤</span> My Profile</button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* ── Mobile Hamburger Drawer ── */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <img src="/flymedia-logo-white.png" alt="Fly Media Technology" style={{ height: "32px", objectFit: "contain" }} />
          <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        </div>
        <div style={{ padding: "0.5rem 0 1rem", borderBottom: "1px solid var(--glass-border)", marginBottom: "0.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Logged in as</p>
          <p style={{ fontWeight: "600", color: "var(--accent-cyan)" }}>{empDetails.name}</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{empDetails.department || "General"}</p>
        </div>
        <nav className="mobile-drawer-nav">
          <button className={`mobile-drawer-item ${currentView === "overview" ? "active" : ""}`}
            onClick={() => { setCurrentView("overview"); setMobileMenuOpen(false); }}>
            <span>📊</span> Overview
          </button>
          <button className={`mobile-drawer-item ${currentView === "file-complaint" ? "active" : ""}`}
            onClick={() => { setCurrentView("file-complaint"); setMobileMenuOpen(false); }}>
            <span>🚨</span> File Complaint
          </button>
          <button className={`mobile-drawer-item ${currentView === "records" ? "active" : ""}`}
            onClick={() => { setCurrentView("records"); setMobileMenuOpen(false); }}>
            <span>📋</span> My Records
          </button>
          <button className={`mobile-drawer-item ${currentView === "tasks" ? "active" : ""}`}
            onClick={() => { setCurrentView("tasks"); setMobileMenuOpen(false); }}>
            <span>📅</span> Task Board
          </button>
          <button className={`mobile-drawer-item ${currentView === "profile" ? "active" : ""}`}
            onClick={() => { setCurrentView("profile"); setMobileMenuOpen(false); }}>
            <span>👤</span> My Profile
          </button>

        </nav>
        <div className="mobile-drawer-footer">
          <button className="mobile-drawer-logout" onClick={() => { logout(); router.push("/login"); }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main Container Wrapper */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
          <div className="header-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/flymedia-logo-white.png"
              alt="Fly Media Technology"
              style={{ height: "28px", objectFit: "contain" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                  {empDetails?.name ? empDetails.name.charAt(0).toUpperCase() : "E"}
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: "600" }}>
                  {empDetails?.name}
                </span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", transition: "transform 0.2s ease", transform: userDropdownOpen ? "rotate(180deg)" : "none" }}>
                  ▼
                </span>
              </div>

              {/* Glassmorphism Dropdown */}
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
                    <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-cyan)", wordBreak: "break-all" }}>{empDetails?.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>{empDetails?.department || "General"}</div>
                  </div>

                  <button
                    onClick={() => { setCurrentView("profile"); setUserDropdownOpen(false); }}
                    style={{ background: "none", border: "none", color: "var(--text-primary)", padding: "8px", borderRadius: "6px", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", width: "100%", transition: "background 0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span>👤</span> My Profile
                  </button>

                  <button
                    onClick={() => { router.push("/privacy-policy"); setUserDropdownOpen(false); }}
                    style={{ background: "none", border: "none", color: "var(--text-primary)", padding: "8px", borderRadius: "6px", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", width: "100%", transition: "background 0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span>🔒</span> Privacy & Terms
                  </button>

                  <button
                    onClick={() => { logout(); router.push("/login"); }}
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", padding: "8px", borderRadius: "6px", textAlign: "center", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", marginTop: "6px", fontWeight: "600", transition: "background 0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Container */}
        <div className="page-container emp-container">
          
          {/* VIEW: TASK BOARD */}
          {currentView === "tasks" && (
            <div className="container-card fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--accent-cyan)", margin: 0 }}>📅 My Task Board</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>Manage and track your assigned work in real-time</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    className="btn-secondary" 
                    onClick={handleOpenReportModal}
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)", borderColor: "var(--accent-purple)", padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--accent-purple)", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    📊 My Performance Report
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => setShowSelfTaskModal(true)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "8px 14px", borderRadius: "8px" }}
                  >
                    ➕ Create Self Task
                  </button>
                </div>
              </div>

              <div>
                {tasks.filter(t => t.assignedTo === user.id).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", background: "rgba(255,255,255,0.01)", borderRadius: "12px", border: "1px dashed var(--glass-border)" }}>
                    <p style={{ color: "var(--text-muted)", margin: 0 }}>No tasks currently assigned to you.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Task Title</th>
                          <th>Description</th>
                          <th>Assigned By</th>
                          <th>Status</th>
                          <th>Time Spent</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks
                          .filter(t => t.assignedTo === user.id)
                          .map(t => {
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
                                <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>{t.title}</td>
                                <td style={{ color: "var(--text-secondary)" }}>{t.description || "—"}</td>
                                <td>{t.assignedByName || "System"}</td>
                                <td>
                                  <span className={`status-badge badge-${t.status === 'In Progress' ? 'progress' : (t.status === 'Completed' ? 'resolved' : 'open')}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td style={{ fontFamily: "monospace", fontWeight: "600", color: "var(--accent-cyan)" }}>
                                  {formatTime(displayDuration)}
                                </td>
                                <td>
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    {t.status === 'Pending' && (
                                      <button 
                                        className="btn-action start" 
                                        onClick={() => { startTask(t.id, user.name); refreshData(); }}
                                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                      >
                                        ▶️ Start
                                      </button>
                                    )}
                                    {t.status === 'In Progress' && (
                                      <>
                                        <button 
                                          className="btn-action" 
                                          style={{
                                            background: "rgba(240,136,62,0.15)",
                                            color: "#f0883e",
                                            borderColor: "rgba(240,136,62,0.3)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            fontSize: "0.85rem",
                                            fontWeight: "500",
                                            cursor: "pointer",
                                            border: "1px solid"
                                          }}
                                          onClick={() => { stopTask(t.id, user.name); refreshData(); }}
                                        >
                                          ⏸️ Stop
                                        </button>
                                        <button 
                                          className="btn-action resolve" 
                                          onClick={() => handleCompleteTaskClick(t.id, t.title)}
                                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                        >
                                          ✅ Complete
                                        </button>
                                      </>
                                    )}
                                    {t.status === 'Completed' && (
                                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                                        Done at {t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : 'N/A'}
                                      </span>
                                    )}
                                    {t.assignedBy === user.id && (
                                      <>
                                        <button 
                                          className="btn-action"
                                          onClick={() => {
                                            setEditingTask(t);
                                            setEditTaskTitle(t.title);
                                            setEditTaskDesc(t.description || "");
                                            setEditTaskStatus(t.status);
                                            setShowEditTaskModal(true);
                                          }}
                                          style={{
                                            background: "rgba(33, 136, 255, 0.15)",
                                            color: "#2188ff",
                                            borderColor: "rgba(33, 136, 255, 0.3)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            fontSize: "0.85rem",
                                            fontWeight: "500",
                                            cursor: "pointer",
                                            border: "1px solid"
                                          }}
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button 
                                          className="btn-action"
                                          onClick={() => handleDeleteSelfTask(t.id, t.title)}
                                          style={{
                                            background: "rgba(218, 54, 55, 0.15)",
                                            color: "#da3637",
                                            borderColor: "rgba(218, 54, 55, 0.3)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            fontSize: "0.85rem",
                                            fontWeight: "500",
                                            cursor: "pointer",
                                            border: "1px solid"
                                          }}
                                        >
                                          🗑️ Delete
                                        </button>
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
                )}
              </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {currentView === "profile" && (
            <div className="container-card">
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--accent-cyan)", marginBottom: "1.5rem" }}>👤 My Profile Details</h2>
              
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
                      {empDetails.name ? empDetails.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>{empDetails.name}</h3>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>{empDetails.role}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Email:</span>
                      <span>{empDetails.email || "N/A"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Department:</span>
                      <span>{empDetails.department || "Operations"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Ticket Limit Status:</span>
                      <span>{totalRaised} / {ticketLimit} complaints used</span>
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
                    Deleting your account will permanently remove your login credentials, raised tickets, and unassign any active computer systems assigned to you. This action is irreversible.
                  </p>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
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

              {/* Hardware Specifications */}
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--accent-cyan)", marginBottom: "1rem" }}>🖥️ My Assigned Hardware Specs</h3>
              {mySystems.length === 0 ? (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No hardware inventory assigned to you.
                </div>
              ) : (
                mySystems.map(sys => (
                  <div key={sys.id} style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem"
                  }}>
                    <h4 style={{ margin: "0 0 1rem 0", color: "var(--text-primary)", fontSize: "1.05rem" }}>
                      System ID: <span style={{ color: "var(--accent-cyan)" }}>{sys.systemNumber}</span> ({sys.model || "Standard Desktop"})
                    </h4>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "1rem"
                    }}>
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Processor (CPU)</span>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.cpu || "N/A"}</p>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Graphics Card (GPU)</span>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.gpu || "Integrated"}</p>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Memory (RAM)</span>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.ram || "N/A"}</p>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Storage Specs</span>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.storage || "N/A"}</p>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Operating System</span>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.os || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW: OVERVIEW */}
          {currentView === "overview" && (
            <div className="page-section active emp-overview-grid">
              
              {/* Active System Details */}
              <div className="emp-card">
                <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                  🖥️ Assigned System Info
                </h3>
                {activeSystems.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No hardware system assigned to you at the moment.</p>
                ) : (
                  activeSystems.map(sys => (
                    <div key={sys.id} className="emp-system-grid">
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>System Number:</span>
                        <p style={{ fontWeight: "600", color: "var(--accent-cyan)", fontSize: "1.1rem" }}>{sys.systemNumber}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Model:</span>
                        <p style={{ fontWeight: "600" }}>{sys.model}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>CPU:</span>
                        <p style={{ fontWeight: "600" }}>{sys.cpu}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>RAM:</span>
                        <p style={{ fontWeight: "600" }}>{sys.ram}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Storage:</span>
                        <p style={{ fontWeight: "600" }}>{sys.storage}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>OS:</span>
                        <p style={{ fontWeight: "600" }}>{sys.os}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Limits and history stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                
                {/* Complaint limits */}
                <div className="emp-card">
                  <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                    📊 Complaint Limits
                  </h3>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                    <span>Tickets Raised:</span>
                    <span style={{ fontWeight: "700" }}>{totalRaised} / {ticketLimit}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ height: "10px", width: "100%", background: "rgba(0,0,0,0.3)", borderRadius: "5px", overflow: "hidden", marginBottom: "1rem", border: "1px solid var(--glass-border)" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (totalRaised / ticketLimit) * 100)}%`,
                        background: isLimitReached 
                          ? "var(--status-critical)" 
                          : "linear-gradient(to right, var(--accent-cyan), var(--accent-purple))",
                        borderRadius: "5px",
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>
                  
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {isLimitReached 
                      ? "⚠️ You have reached your issue limits. Please contact IT support to extend your limit if necessary."
                      : `You can raise ${remainingTickets} more complaint ticket(s) before reaching your limit.`
                    }
                  </p>
                </div>

                {/* System Change history */}
                <div className="emp-card" style={{ maxHeight: "300px", overflowY: "auto" }}>
                  <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                    🔄 System Assignment History
                  </h3>
                  {empHistory.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.9rem" }}>No assignment logs found.</p>
                  ) : (
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {empHistory.map(h => (
                        <li key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "start", fontSize: "0.85rem", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                          <div>
                            <span style={{
                              color: h.action.includes("Assigned") ? "var(--status-resolved)" : "var(--status-critical)",
                              fontWeight: "600",
                              marginRight: "0.5rem"
                            }}>
                              {h.action}
                            </span>
                            <span>System: <strong>{h.systemNumber}</strong></span>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {new Date(h.timestamp).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: FILE COMPLAINT */}
          {currentView === "file-complaint" && (
            <div className="page-section active" style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
              <div className="emp-card">
                <h3 className="emp-card-title" style={{ color: "var(--accent-purple)" }}>
                  🚨 File a Complaint / Raise Issue
                </h3>
                
                <form onSubmit={handleRaiseComplaint}>
                  <div className="modal-form-grid">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className="form-control"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ background: "rgba(0,0,0,0.3)" }}
                      >
                        <option value="RAM/Speed">RAM/Speed</option>
                        <option value="Hardware">Hardware Failure</option>
                        <option value="OS/Crash">OS Crash/Lag</option>
                        <option value="Network">Wifi/Network</option>
                        <option value="Software">Software Install</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Severity Level</label>
                      <select
                        className="form-control"
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        style={{ background: "rgba(0,0,0,0.3)" }}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: "0.5rem" }}>
                    <label>Issue Description</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Describe your issue in detail..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  {formError && (
                    <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--status-critical)", color: "var(--status-critical)", padding: "10px", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--status-resolved)", color: "var(--status-resolved)", padding: "10px", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>
                      {formSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLimitReached}
                    className="btn-primary"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "10px",
                      opacity: isLimitReached ? 0.5 : 1,
                      cursor: isLimitReached ? "not-allowed" : "pointer"
                    }}
                  >
                    File Ticket
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: MY RECORDS */}
          {currentView === "records" && (
            <div className="page-section active">
              <div className="emp-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                  📋 Your Raise Records (Past & Present)
                </h3>
                
                {employeeTickets.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "3rem 0" }}>No tickets raised yet.</p>
                ) : (
                  <>
                    {/* Search Field */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by ID, Category, Severity, Status, or Description..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--glass-border)", padding: "10px", borderRadius: "8px", color: "var(--text-primary)" }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {currentTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid var(--glass-border)",
                            borderRadius: "12px",
                            padding: "1.25rem",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>ID: {ticket.id}</span>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                padding: "4px 8px",
                                borderRadius: "20px",
                                textTransform: "uppercase",
                                background: 
                                  ticket.status === "Resolved" ? "rgba(16, 185, 129, 0.15)" :
                                  ticket.status === "In Progress" ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color:
                                  ticket.status === "Resolved" ? "var(--status-resolved)" :
                                  ticket.status === "In Progress" ? "var(--status-progress)" : "var(--status-open)"
                              }}
                            >
                              {ticket.status}
                            </span>
                          </div>

                          <div style={{ marginBottom: "0.5rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginRight: "0.5rem" }}>Category:</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{ticket.category}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0.5rem" }}>|</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginRight: "0.5rem" }}>Severity:</span>
                            <span style={{
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              color: 
                                ticket.severity === "Critical" || ticket.severity === "High" 
                                  ? "var(--status-critical)" : "var(--text-primary)"
                            }}>{ticket.severity}</span>
                          </div>

                          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>{ticket.description}</p>
                          
                          {ticket.status === "Resolved" && ticket.notes && (
                            <div style={{ background: "rgba(16, 185, 129, 0.05)", borderLeft: "3px solid var(--status-resolved)", padding: "8px 12px", borderRadius: "0 6px 6px 0", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                              <strong style={{ color: "var(--status-resolved)" }}>IT Resolution Note:</strong> {ticket.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="pagination-controls" style={{ paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          style={{ padding: "6px 12px", fontSize: "0.85rem", opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                        >
                          ← Previous
                        </button>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          style={{ padding: "6px 12px", fontSize: "0.85rem", opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ================= MODAL: CREATE SELF TASK ================= */}
      {showSelfTaskModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">➕ Create Self Task</h3>
              <button className="modal-close" onClick={() => setShowSelfTaskModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateSelfTaskSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={selfTaskTitle}
                  onChange={(e) => setSelfTaskTitle(e.target.value)}
                  placeholder="e.g. Design homepage mockup"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Task Description</label>
                <textarea 
                  className="form-control" 
                  value={selfTaskDesc}
                  onChange={(e) => setSelfTaskDesc(e.target.value)}
                  placeholder="Provide context or instructions for your task..."
                  style={{ height: "100px", resize: "none" }}
                />
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowSelfTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Task</button>
              </div>
            </form>
          </div>
      )}

      {/* ================= MODAL: EDIT SELF TASK ================= */}
      {showEditTaskModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Task Details</h3>
              <button className="modal-close" onClick={() => setShowEditTaskModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditTaskSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Task Description</label>
                <textarea 
                  className="form-control" 
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  style={{ height: "100px", resize: "none" }}
                />
              </div>

              <div className="form-group">
                <label>Task Status</label>
                <select 
                  className="form-control" 
                  value={editTaskStatus}
                  onChange={(e) => setEditTaskStatus(e.target.value)}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ================= MODAL: MY PERFORMANCE & ACTIVITY REPORT ================= */}
      {showReportModal && (() => {
        const from = reportFrom ? new Date(reportFrom + "T00:00:00") : null;
        const to = reportTo ? new Date(reportTo + "T23:59:59") : null;

        const currentDevices = systems.filter(s => s.assignedTo === user.id);

        const empLogs = assignmentHistory.filter(h => {
          if (h.employeeId !== user.id) return false;
          if (!h.timestamp) return false;
          const ts = new Date(h.timestamp);
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        });

        const empTickets = tickets.filter(t => {
          const matchEmp = t.raisedBy === user.id || t.employeeId === user.id;
          if (!matchEmp) return false;
          if (!t.createdAt) return false;
          const ts = new Date(t.createdAt);
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        });

        const empTasks = tasks.filter(t => {
          if (t.assignedTo !== user.id) return false;
          if (!t.createdAt) return false;
          const ts = new Date(t.createdAt);
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        });

        return (
          <div className="modal-overlay active">
            <div className="modal-card" style={{ maxWidth: "800px", width: "95%" }}>
              <div className="modal-header" style={{ paddingBottom: "10px" }}>
                <h3 className="modal-title">📊 My Activity & Performance Report</h3>
                <button className="modal-close" onClick={() => setShowReportModal(false)}>&times;</button>
              </div>

              {/* Employee Overview Info Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "15px", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div><strong>Name:</strong> {user.name}</div>
                <div><strong>Role:</strong> {user.role || "Team Member"}</div>
                <div><strong>Email:</strong> {user.email || "N/A"}</div>
              </div>

              {/* Date Filters & Download Button */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end", marginBottom: "20px", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                <div style={{ flex: "1 1 180px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>From Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={reportFrom} 
                    onChange={(e) => setReportFrom(e.target.value)} 
                    style={{ width: "100%", padding: "6px 10px" }}
                  />
                </div>
                <div style={{ flex: "1 1 180px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>To Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={reportTo} 
                    onChange={(e) => setReportTo(e.target.value)} 
                    style={{ width: "100%", padding: "6px 10px" }}
                  />
                </div>
                <div>
                  <button 
                    onClick={() => handleDownloadReport(reportFrom, reportTo)}
                    className="btn-action start"
                    style={{ padding: "8px 14px", background: "var(--accent-cyan)", color: "#000", fontWeight: "600", whiteSpace: "nowrap" }}
                  >
                    📥 Download CSV Report
                  </button>
                </div>
              </div>

              {/* Modal scrollable body containing content tabs */}
              <div className="modal-body" style={{ maxHeight: "55vh", overflowY: "auto", paddingRight: "6px" }}>
                
                {/* Section 1: Assigned Devices */}
                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{ color: "var(--accent-cyan)", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px", marginBottom: "12px", fontSize: "1rem" }}>
                    <span>🖥️ Current Assigned Devices ({currentDevices.length})</span>
                  </h4>
                  {currentDevices.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No devices currently assigned.</p>
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
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No issues or complaints registered by you during this period.</p>
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
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No tasks assigned to you during this period.</p>
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
    </div>
  );
}
