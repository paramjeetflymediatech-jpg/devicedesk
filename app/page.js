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
  deleteTask,
  saveTasks
} from "./store.js";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import AttendanceTab from "./components/AttendanceTab.js";
import AttendanceWidget from "./components/AttendanceWidget.js";
import ScreenshotsTab from "./components/ScreenshotsTab.js";
import ChatView from "./components/ChatView.js";
import ThemeToggle from "./components/ThemeToggle.js";
import Logo from "./components/Logo.js";
import DashboardTab from "./components/DashboardTab.js";
import SystemsTab from "./components/SystemsTab.js";
import EmployeesTab from "./components/EmployeesTab.js";
import TicketsTab from "./components/TicketsTab.js";
import DepartmentsTab from "./components/DepartmentsTab.js";
import HistoryTab from "./components/HistoryTab.js";
import TasksTab from "./components/TasksTab.js";
import LeaveRequestsTab from "./components/LeaveRequestsTab.js";
import ProfileTab from "./components/ProfileTab.js";
import DangerZoneTab from "./components/DangerZoneTab.js";
import EmployeePortalTab from "./components/EmployeePortalTab.js";
import SystemModal from "./components/modals/SystemModal.js";
import AssignDeviceModal from "./components/modals/AssignDeviceModal.js";
import ResolveTicketModal from "./components/modals/ResolveTicketModal.js";
import TaskModals from "./components/modals/TaskModals.js";
import EmployeeModals from "./components/modals/EmployeeModals.js";
import DepartmentModals from "./components/modals/DepartmentModals.js";
import SystemHistoryModal from "./components/modals/SystemHistoryModal.js";
import DeviceDetailsModal from "./components/modals/DeviceDetailsModal.js";
import SystemImportModal from "./components/modals/SystemImportModal.js";
import AuxiliaryModals from "./components/modals/AuxiliaryModals.js";
import { FiGrid, FiServer, FiUsers, FiTag, FiBriefcase, FiFileText, FiCheckSquare, FiClock, FiMessageSquare, FiUser, FiAlertTriangle, FiLogOut, FiEye, FiEyeOff, FiShield, FiLock, FiUnlock, FiCalendar, FiCheck, FiX } from "react-icons/fi";

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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromQuery = urlParams.get("tab") || urlParams.get("view");
      const hashFromUrl = window.location.hash.replace("#", "");
      const validViews = [
        "dashboard", "systems", "employees", "tickets", "departments",
        "history", "tasks", "attendance", "screenshots", "chat",
        "leave-requests", "profile", "danger-zone", "employee-portal"
      ];

      if (tabFromQuery && validViews.includes(tabFromQuery)) {
        setCurrentView(tabFromQuery);
      } else if (hashFromUrl && validViews.includes(hashFromUrl)) {
        setCurrentView(hashFromUrl);
      } else {
        const saved = localStorage.getItem("devicedesk_admin_view");
        if (saved && validViews.includes(saved)) setCurrentView(saved);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("devicedesk_admin_view", currentView);
      const newUrl = currentView === "dashboard" ? window.location.pathname : `?tab=${currentView}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [currentView]);

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devicedesk_unread_chat_count");
      if (stored) setUnreadChatCount(Number(stored));

      const handleUnreadChange = (e) => {
        setUnreadChatCount(Number(e.detail || 0));
      };

      window.addEventListener("devicedesk_unread_chat_changed", handleUnreadChange);
      return () => {
        window.removeEventListener("devicedesk_unread_chat_changed", handleUnreadChange);
      };
    }
  }, []);

  const userRole = user?.role || "admin";
  const dbRoleLower = (user?.dbRole || "").toLowerCase();
  const roleLower = (user?.role || "").toLowerCase();
  const deptLower = (user?.department || "").toLowerCase();

  // Root Admin / Executive Management has full unrestricted access
  const isRootAdmin = isMounted && (
    dbRoleLower === 'admin' ||
    dbRoleLower === 'management' ||
    dbRoleLower === 'executive' ||
    dbRoleLower === 'superadmin' ||
    user?.email === 'admin@yopmail.com' ||
    user?.email === 'pravi@yopmail.com'
  );

  // IT person (IT Support / IT Engineer / IT Dept) is restricted to IT Desk sections
  const isITSupport = isMounted && !isRootAdmin && (
    dbRoleLower.includes('it') ||
    deptLower.includes('it')
  );

  // Auto-redirect IT Support away from restricted admin views
  useEffect(() => {
    if (isITSupport && ["tasks", "attendance", "screenshots", "leave-requests", "danger-zone", "chat"].includes(currentView)) {
      setCurrentView("dashboard");
    }
  }, [isITSupport, currentView]);

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
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskAssignee, setEditTaskAssignee] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("Pending");
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [perfChartTab, setPerfChartTab] = useState("daily"); // daily | weekly | monthly | yearly
  const [showEmpReportModal, setShowEmpReportModal] = useState(false);
  const [empReportTarget, setEmpReportTarget] = useState(null); // the employee object
  const [selectedReasonModal, setSelectedReasonModal] = useState(null);
  const [empReportFrom, setEmpReportFrom] = useState(""); // ISO date string yyyy-mm-dd
  const [empReportTo, setEmpReportTo] = useState("");     // ISO date string yyyy-mm-dd
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [perfPage, setPerfPage] = useState(1);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);
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
  const [showNewEmpPassword, setShowNewEmpPassword] = useState(false);
  const [newEmpRole, setNewEmpRole] = useState("Team Member");
  const [newEmpDept, setNewEmpDept] = useState("");
  const [newEmpLimit, setNewEmpLimit] = useState(100);

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
    id: "", name: "", email: "", role: "Team Member", department: "", ticketLimit: 100
  });
  const [assigningEmp, setAssigningEmp] = useState({ id: "", name: "" });
  const [assigningSysId, setAssigningSysId] = useState("");
  const [resolvingTicketId, setResolvingTicketId] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [selectedViewSystem, setSelectedViewSystem] = useState(null);
  const [selectedViewDept, setSelectedViewDept] = useState(null);
  const [deptModalTab, setDeptModalTab] = useState("members");

  // Raise Records Filter & Pagination States
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketFilterStatus, setTicketFilterStatus] = useState("all");
  const [ticketFilterSeverity, setTicketFilterSeverity] = useState("all");
  const [ticketPage, setTicketPage] = useState(1);
  const adminTicketsPerPage = 10;

  // Systems Pagination State
  const [sysPage, setSysPage] = useState(1);
  const sysPerPage = 10;

  // Employees Pagination & Filter State
  const [empPage, setEmpPage] = useState(1);
  const empPerPage = 10;
  const [empSearch, setEmpSearch] = useState("");
  const [empFilterDept, setEmpFilterDept] = useState("all");
  const [empFilterRole, setEmpFilterRole] = useState("all");
  
  // Employee Portal Form States
  const [portalEmployeeId, setPortalEmployeeId] = useState("");
  const [portalSystemId, setPortalSystemId] = useState("");
  const [portalCategory, setPortalCategory] = useState("RAM/Speed");
  const [portalSeverity, setPortalSeverity] = useState("Medium");
  const [portalDesc, setPortalDesc] = useState("");

  // Leave requests states
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [leaveFilterStatus, setLeaveFilterStatus] = useState("ALL");
  const [leaveActionLoading, setLeaveActionLoading] = useState(null);

  // Leave Pagination State
  const [leaveCurrentPage, setLeaveCurrentPage] = useState(1);
  const [leavePageSize, setLeavePageSize] = useState(10);

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch(`/api/leave/list?status=${leaveFilterStatus}`);
      const data = await res.json();
      if (data.success) {
        setLeaveRequests(data.requests || []);
        setLeaveSummary(data.summary || { total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error("Error fetching leave requests:", err);
    }
  };

  useEffect(() => {
    setLeaveCurrentPage(1);
    fetchLeaveRequests();
  }, [leaveFilterStatus]);

  const handleReviewLeave = async (leaveId, action) => {
    let rejectionReason = "";
    if (action === 'Rejected') {
      const { value: reasonText } = await Swal.fire({
        title: 'Reject Leave Request',
        input: 'textarea',
        inputLabel: 'Reason for rejection',
        inputPlaceholder: 'Enter reason here...',
        inputAttributes: {
          'aria-label': 'Type rejection reason'
        },
        showCancelButton: true,
        confirmButtonColor: 'var(--status-critical)',
        cancelButtonColor: '#30363d',
        background: '#161b22',
        color: '#f0f6fc',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'You need to write a reason for rejection!';
          }
        }
      });
      if (reasonText === undefined) return;
      rejectionReason = reasonText;
    } else {
      const confirm = await Swal.fire({
        title: 'Approve Leave Request',
        text: 'Are you sure you want to approve this leave request?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve',
        confirmButtonColor: 'var(--status-resolved)',
        cancelButtonColor: '#30363d',
        background: '#161b22',
        color: '#f0f6fc'
      });
      if (!confirm.isConfirmed) return;
    }

    setLeaveActionLoading(leaveId);
    try {
      const res = await fetch('/api/leave/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveId,
          action,
          rejectionReason,
          reviewerName: user?.name || 'Admin'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Leave request ${action.toLowerCase()} successfully!`,
          background: '#161b22',
          color: '#f0f6fc'
        });
        fetchLeaveRequests();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: data.message || 'Failed to review leave request.',
          background: '#161b22',
          color: '#f0f6fc'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network/server error.', background: '#161b22', color: '#f0f6fc' });
    } finally {
      setLeaveActionLoading(null);
    }
  };

  const handleViewLeave = (req) => {
    const emp = employees.find(e => e.id === req.employeeId);
    const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
    const modalBg = isLight ? '#ffffff' : '#161b22';
    const textColor = isLight ? '#0f172a' : '#f0f6fc';
    const reasonBoxBg = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)';
    const reasonTextColor = isLight ? '#1e293b' : '#f1f5f9';
    const borderCol = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.12)';

    Swal.fire({
      title: `<span style="color: ${textColor}; font-weight: 800;">Leave Application Details</span>`,
      html: `
        <div style="text-align: left; font-family: var(--font-main); color: ${textColor}; font-size: 0.9rem; line-height: 1.6; padding: 5px;">
          <div style="margin-bottom: 8px;"><strong style="color: ${textColor};">Employee Name:</strong> ${req.employeeName}</div>
          <div style="margin-bottom: 8px;"><strong style="color: ${textColor};">Role & Department:</strong> ${emp ? `${emp.role} • ${emp.department}` : 'N/A'}</div>
          <div style="margin-bottom: 8px;"><strong style="color: ${textColor};">Leave Type:</strong> ${req.leaveType}</div>
          <div style="margin-bottom: 8px;"><strong style="color: ${textColor};">Duration:</strong> ${req.fromDate} to ${req.toDate} (${req.totalDays} ${req.totalDays === 1 ? 'day' : 'days'})</div>
          <div style="margin-bottom: 6px; margin-top: 12px;"><strong style="color: ${textColor}; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">Full Reason for Leave:</strong></div>
          <div style="background: ${reasonBoxBg}; border: 1px solid ${borderCol}; padding: 14px 16px; border-radius: 10px; margin-bottom: 14px; max-height: 320px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; font-style: normal; text-align: left; font-size: 0.92rem; font-weight: 500; color: ${reasonTextColor}; line-height: 1.6;">
            ${req.reason || "No reason provided."}
          </div>
          <div style="margin-bottom: 8px;"><strong style="color: ${textColor};">Status:</strong> <span class="status-badge badge-${req.status === 'Approved' ? 'resolved' : (req.status === 'Rejected' ? 'critical' : 'progress')}" style="padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 0.75rem;">${req.status}</span></div>
          ${req.status !== 'Pending' ? `
            <div style="border-top: 1px solid ${borderCol}; margin-top: 12px; padding-top: 12px;">
              <div style="margin-bottom: 4px;"><strong style="color: ${textColor};">Reviewed By:</strong> ${req.reviewedBy}</div>
              <div style="margin-bottom: 4px;"><strong style="color: ${textColor};">Reviewed At:</strong> ${new Date(req.reviewedAt).toLocaleString()}</div>
              ${req.status === 'Rejected' && req.rejectionReason ? `<div style="margin-top: 6px; color: var(--status-critical);"><strong>Rejection Reason:</strong> "${req.rejectionReason}"</div>` : ''}
            </div>
          ` : ''}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#2563eb',
      background: modalBg,
      color: textColor
    });
  };
  
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
      fetchLeaveRequests();
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

  const renderProfileAvatar = (emp, size = "60px") => {
    if (emp?.avatarUrl) {
      return (
        <img
          src={emp.avatarUrl}
          alt={emp.name || "User"}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            }}
        />
      );
    }
    // Fallback: initials + gradient
    const getInitials = (n) => {
      if (!n) return "?";
      const parts = n.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
      return n.charAt(0).toUpperCase();
    };

    const getGradient = (n) => {
      const colors = [
        "linear-gradient(135deg, #4f46e5, #06b6d4)",
        "linear-gradient(135deg, #7c3aed, #ec4899)",
        "linear-gradient(135deg, #f59e0b, #e11d48)",
        "linear-gradient(135deg, #10b981, #059669)",
        "linear-gradient(135deg, #3b82f6, #1d4ed8)"
      ];
      let hash = 0;
      for (let i = 0; i < (n || "").length; i++) {
        hash = (n || "").charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getGradient(emp?.name || ""),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "700",
        fontSize: size === "24px" || size === "28px" ? "0.7rem" : "1.4rem",
        color: "#fff",
        }}>
        {getInitials(emp?.name || "")}
      </div>
    );
  };

  const cropAndUploadImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          Swal.fire({
            title: "Adjust Profile Picture",
            html: `
              <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin: 10px 0;">
                <div style="position:relative; width:180px; height:180px; border-radius:50%; overflow:hidden; border:3px solid var(--accent-cyan); background:#000; ">
                  <canvas id="crop-canvas" width="180" height="180" style="cursor:move; display:block;"></canvas>
                </div>
                <div style="display:flex; align-items:center; gap:10px; width:100%; max-width:200px; margin-top:8px;">
                  <span style="font-size:12px;">➖</span>
                  <input type="range" id="crop-zoom" min="1" max="4" step="0.05" value="1" style="flex-grow:1; accent-color:var(--accent-cyan); cursor:pointer;" />
                  <span style="font-size:12px;">➕</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Drag to adjust position • Use slider to zoom</p>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Apply & Upload",
            cancelButtonText: "Cancel",
            confirmButtonColor: "var(--accent-cyan)",
            cancelButtonColor: "#6e7881",
            background: "#161b22",
            color: "#f0f6fc",
            didOpen: (popup) => {
              const canvas = popup.querySelector("#crop-canvas");
              const ctx = canvas.getContext("2d");
              const zoomInput = popup.querySelector("#crop-zoom");

              let zoom = 1;
              let offsetX = 0;
              let offsetY = 0;
              let isDragging = false;
              let startX = 0;
              let startY = 0;

              const draw = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const minScale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const scale = minScale * zoom;
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (canvas.width - w) / 2 + offsetX;
                const y = (canvas.height - h) / 2 + offsetY;
                ctx.drawImage(img, x, y, w, h);
              };

              draw();

              zoomInput.oninput = (e) => {
                zoom = parseFloat(e.target.value);
                draw();
              };

              canvas.onmousedown = (e) => {
                isDragging = true;
                startX = e.clientX - offsetX;
                startY = e.clientY - offsetY;
              };

              window.onmousemove = (e) => {
                if (!isDragging) return;
                offsetX = e.clientX - startX;
                offsetY = e.clientY - startY;
                draw();
              };

              window.onmouseup = () => {
                isDragging = false;
              };

              canvas.ontouchstart = (e) => {
                isDragging = true;
                const touch = e.touches[0];
                startX = touch.clientX - offsetX;
                startY = touch.clientY - offsetY;
              };

              canvas.ontouchmove = (e) => {
                if (!isDragging) return;
                const touch = e.touches[0];
                offsetX = touch.clientX - startX;
                offsetY = touch.clientY - startY;
                draw();
              };

              canvas.ontouchend = () => {
                isDragging = false;
              };
            },
            preConfirm: () => {
              const canvas = document.getElementById("crop-canvas");
              return new Promise((res) => {
                canvas.toBlob((blob) => {
                  res(blob);
                }, "image/jpeg", 0.9);
              });
            }
          }).then((result) => {
            if (result.isConfirmed && result.value) {
              resolve(result.value);
            } else {
              reject(new Error("Cancelled"));
            }
          });
        };
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePictureUpload = async () => {
    const currentEmp = employees.find(e => e.id === user?.id);
    const hasAvatar = !!currentEmp?.avatarUrl;

    if (hasAvatar) {
      const choice = await Swal.fire({
        title: "Profile Picture Options",
        text: "Would you like to upload a new photo or remove the current one?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Upload New",
        denyButtonText: "Remove Current",
        cancelButtonText: "Cancel",
        confirmButtonColor: "var(--accent-cyan)",
        denyButtonColor: "var(--status-critical)",
        cancelButtonColor: "#6e7881",
        background: '#161b22',
        color: '#f0f6fc'
      });

      if (choice.isDenied) {
        Swal.fire({
          title: "Removing...",
          text: "Please wait.",
          allowOutsideClick: false,
          background: '#161b22',
          color: '#f0f6fc',
          didOpen: () => { Swal.showLoading(); }
        });
        try {
          const saveRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateProfilePicture", avatarUrl: null })
          });
          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.success) {
            Swal.fire({
              icon: "success",
              title: "Success",
              text: "Profile picture removed successfully!",
              background: '#161b22',
              color: '#f0f6fc'
            });
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("devicedesk_db_synced"));
            }
            const { loadFromServer } = await import('./store.js');
            if (typeof loadFromServer === 'function') await loadFromServer();
            setEmployees(getEmployees());
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: saveData.error || "Failed to remove profile picture",
              background: '#161b22',
              color: '#f0f6fc'
            });
          }
        } catch (err) {
          console.error("Remove profile picture error:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Network error. Failed to remove profile picture.",
            background: '#161b22',
            color: '#f0f6fc'
          });
        }
        return;
      }

      if (!choice.isConfirmed) {
        return;
      }
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const croppedBlob = await cropAndUploadImage(file);

        Swal.fire({
          title: "Uploading...",
          text: "Please wait while we upload your profile picture.",
          allowOutsideClick: false,
          background: '#161b22',
          color: '#f0f6fc',
          didOpen: () => { Swal.showLoading(); }
        });

        const formData = new FormData();
        formData.append("file", croppedBlob, "profile.jpg");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Upload failed");
        }

        const avatarUrl = uploadData.fileUrls[0];

        const saveRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "updateProfilePicture", avatarUrl })
        });

        const saveData = await saveRes.json();
        if (saveRes.ok && saveData.success) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: "Profile picture updated successfully!",
            background: '#161b22',
            color: '#f0f6fc'
          });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("devicedesk_db_synced"));
          }
          const { loadFromServer } = await import('./store.js');
          if (typeof loadFromServer === 'function') await loadFromServer();
          setEmployees(getEmployees());
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: saveData.error || "Failed to save profile picture to database",
            background: '#161b22',
            color: '#f0f6fc'
          });
        }
      } catch (err) {
        if (err.message !== "Cancelled") {
          console.error("Profile picture upload error:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message || "Failed to upload profile picture.",
            background: '#161b22',
            color: '#f0f6fc'
          });
        }
      }
    };
    input.click();
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
    }, user?.name || "Admin");
    
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
        removeEmployee(empId, user?.name || "Admin");
        setEmployees(getEmployees());
        setSystems(getSystems());
        playBeep(400, 0.15, 'sawtooth');
      }
    });
  };

  const handleDeleteAccountConfirm = () => {
    setShowDeleteConfirm(false);
    if (user?.id) {
      removeEmployee(user.id, user?.name || "Admin");
      logout();
      router.push("/login");
    }
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
        updateEmployee(emp.id, { status: newStatus }, user?.name || "Admin");
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
        deleteSystem(sysId, user?.name || "Admin");
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
        updateSystem(sys, user?.name || "Admin");
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
      updateSystem({ ...editingSys, assignedTo: newAssignee }, adminName);
    } else {
      const added = addSystem({ ...editingSys, assignedTo: null }, adminName);
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
          updateSystem(s, adminName);
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

  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      Swal.fire({ icon: 'warning', title: 'Validation', text: 'Task title is required.' });
      return;
    }

    const assignee = employees.find(emp => emp.id === editTaskAssignee);
    const assigneeName = assignee ? assignee.name : 'Unassigned';

    const oldStatus = editingTask.status;

    const updatedTask = {
      ...editingTask,
      title: editTaskTitle,
      description: editTaskDesc,
      assignedTo: editTaskAssignee || null,
      assignedToName: assigneeName,
      status: editTaskStatus
    };

    if (editTaskStatus === 'Completed' && oldStatus !== 'Completed') {
      updatedTask.completedAt = new Date().toISOString();
    } else if (editTaskStatus !== 'Completed') {
      updatedTask.completedAt = null;
    }

    updateTask(updatedTask, user?.name || 'Admin');
    setTasks(getTasks());
    setShowEditTaskModal(false);
    setEditingTask(null);
    playBeep(800, 0.1);
    Swal.fire({ icon: 'success', title: 'Updated', text: 'Task successfully updated!' });
  };

  const handleDeleteTask = (taskId, taskTitle) => {
    Swal.fire({
      title: `Delete Task?`,
      text: `Are you sure you want to delete task "${taskTitle}"? This will also delete its action log history.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (result.isConfirmed) {
        deleteTask(taskId, user?.name || 'Admin');
        setTasks(getTasks());
        playBeep(400, 0.15, 'sawtooth');
        Swal.fire('Deleted!', `Task "${taskTitle}" has been deleted.`, 'success');
      }
    });
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

  // Dynamic department and role lists for Team Member Directory filter dropdowns
  const availableEmpDepartments = Array.from(
    new Set(employees.map(e => e.department).filter(Boolean))
  ).sort();

  const availableEmpRoles = Array.from(
    new Set(employees.map(e => e.role).filter(Boolean))
  ).sort();

  // Filtered & Paginated Employees for Admin employee view
  const filteredEmployees = employees.filter(emp => {
    // 1. Don't show the currently logged-in user
    if (emp.id === user?.id) return false;

    // 2. Don't show other admin roles in the general employee list
    if (['Admin'].includes(emp.role)) return false;

    // 3. Team Leaders only see their own department
    if (isTeamLeader && leaderDepartment && emp.department?.toLowerCase() !== leaderDepartment.toLowerCase()) return false;

    // 4. Department filter
    if (empFilterDept !== "all" && (emp.department || "").toLowerCase() !== empFilterDept.toLowerCase()) return false;

    // 5. Role filter
    if (empFilterRole !== "all" && (emp.role || "").toLowerCase() !== empFilterRole.toLowerCase()) return false;

    const query = empSearch.toLowerCase();
    return (emp.name || "").toLowerCase().includes(query) || 
           (emp.department || "").toLowerCase().includes(query) || 
           (emp.role || "").toLowerCase().includes(query);
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
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
          <Logo height="36px" />
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ul className="nav-links">
            {['admin', 'it support', 'it_support', 'it', 'hr', 'management', 'superadmin', 'team leader'].includes((userRole || '').toLowerCase()) && (
              <>
                <li className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("dashboard")}><span className="nav-icon"><FiGrid /></span> Dashboard</button>
                </li>
                <li className={`nav-item ${currentView === "systems" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("systems")}><span className="nav-icon"><FiServer /></span> Systems Inventory</button>
                </li>
                <li className={`nav-item ${currentView === "employees" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("employees")}><span className="nav-icon"><FiUsers /></span> Team Member Directory</button>
                </li>
                <li className={`nav-item ${currentView === "tickets" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("tickets")}><span className="nav-icon"><FiTag /></span> Raise Records</button>
                </li>
                <li className={`nav-item ${currentView === "departments" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("departments")}><span className="nav-icon"><FiBriefcase /></span> Departments</button>
                </li>
                <li className={`nav-item ${currentView === "history" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("history")}><span className="nav-icon"><FiFileText /></span> System Logs</button>
                </li>
                {!isITSupport && (
                  <li className={`nav-item ${currentView === "tasks" ? "active" : ""}`}>
                    <button onClick={() => setCurrentView("tasks")}><span className="nav-icon"><FiCheckSquare /></span> Task Board</button>
                  </li>
                )}
                {!isITSupport && (
                  <li className={`nav-item ${currentView === "attendance" ? "active" : ""}`}>
                    <button onClick={() => setCurrentView("attendance")}><span className="nav-icon"><FiClock /></span> Attendance</button>
                  </li>
                )}
                {!isITSupport && (
                  <li className={`nav-item ${currentView === "screenshots" ? "active" : ""}`}>
                    <button onClick={() => setCurrentView("screenshots")}><span className="nav-icon"><FiEye /></span> Activity Screenshots</button>
                  </li>
                )}
                {!isITSupport && (
                  <li className={`nav-item ${currentView === "chat" ? "active" : ""}`}>
                    <button onClick={() => setCurrentView("chat")}>
                      <span className="nav-icon"><FiMessageSquare /></span> Chat Workspace
                      {isMounted && unreadChatCount > 0 && (
                        <span style={{
                          background: "var(--status-critical)",
                          color: "#fff",
                          borderRadius: "50%",
                          padding: "2px 6px",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          marginLeft: "8px"
                        }}>
                          {unreadChatCount}
                        </span>
                      )}
                    </button>
                  </li>
                )}
                {!isITSupport && (
                  <li className={`nav-item ${currentView === "leave-requests" ? "active" : ""}`}>
                    <button onClick={() => setCurrentView("leave-requests")}>
                      <span className="nav-icon"><FiCalendar /></span> Leave Requests
                      {isMounted && leaveRequests.filter(r => r.status === 'Pending').length > 0 && (
                        <span style={{
                          background: "var(--status-critical)",
                          color: "#fff",
                          borderRadius: "50%",
                          padding: "2px 6px",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          marginLeft: "8px"
                        }}>
                          {leaveRequests.filter(r => r.status === 'Pending').length}
                        </span>
                      )}
                    </button>
                  </li>
                )}
                <li className={`nav-item ${currentView === "profile" ? "active" : ""}`}>
                  <button onClick={() => setCurrentView("profile")}><span className="nav-icon"><FiUser /></span> My Profile</button>
                </li>
                {isITSupport && (
                  <li className="nav-item" style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                    <button
                      onClick={() => { window.location.href = "/employee-dashboard"; }}
                      style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}
                    >
                      <span className="nav-icon"><FiUser /></span> Employee Portal
                    </button>
                  </li>
                )}
                {isMounted && user?.dbRole === 'Admin' && (
                  <li className={`nav-item ${currentView === "danger-zone" ? "active" : ""}`} style={{ marginTop: '8px' }}>
                    <button onClick={() => setCurrentView("danger-zone")} style={{ color: 'var(--status-critical)' }}><span className="nav-icon"><FiAlertTriangle /></span> Danger Zone</button>
                  </li>
                )}
              </>
            )}
            {userRole === "employee" && (
              <li className={`nav-item ${currentView === "employee-portal" ? "active" : ""}`}>
                <button onClick={() => setCurrentView("employee-portal")}><span className="nav-icon"><FiTag /></span> Register Complaint</button>
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
          <Logo height="32px" />
          <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        </div>

        <nav className="mobile-drawer-nav">
          {['admin', 'it support', 'it_support', 'it', 'hr', 'management', 'superadmin', 'team leader'].includes((userRole || '').toLowerCase()) && (
            <>
              <button className={`mobile-drawer-item ${currentView === "dashboard" ? "active" : ""}`}
                onClick={() => { setCurrentView("dashboard"); setMobileMenuOpen(false); }}>
                <span style={{ display: "inline-flex" }}><FiGrid /></span> Dashboard
              </button>
              <button className={`mobile-drawer-item ${currentView === "systems" ? "active" : ""}`}
                onClick={() => { setCurrentView("systems"); setMobileMenuOpen(false); }}>
                <span style={{ display: "inline-flex" }}><FiServer /></span> Systems Inventory
              </button>
              <button className={`mobile-drawer-item ${currentView === "employees" ? "active" : ""}`}
                onClick={() => { setCurrentView("employees"); setMobileMenuOpen(false); }}>
                <span style={{ display: "inline-flex" }}><FiUsers /></span> Team Members
              </button>
              <button className={`mobile-drawer-item ${currentView === "tickets" ? "active" : ""}`}
                onClick={() => { setCurrentView("tickets"); setMobileMenuOpen(false); }}>
                <span style={{ display: "inline-flex" }}><FiTag /></span> Tickets
              </button>
              <button className={`mobile-drawer-item ${currentView === "departments" ? "active" : ""}`}
                onClick={() => { setCurrentView("departments"); setMobileMenuOpen(false); }}>
                <span style={{ display: "inline-flex" }}><FiBriefcase /></span> Departments
              </button>
              {!isITSupport && (
                <button className={`mobile-drawer-item ${currentView === "tasks" ? "active" : ""}`}
                  onClick={() => { setCurrentView("tasks"); setMobileMenuOpen(false); }}>
                  <span style={{ display: "inline-flex" }}><FiCheckSquare /></span> Task Board
                </button>
              )}
              {!isITSupport && (
                <button className={`mobile-drawer-item ${currentView === "attendance" ? "active" : ""}`}
                  onClick={() => { setCurrentView("attendance"); setMobileMenuOpen(false); }}>
                  <span style={{ display: "inline-flex" }}><FiClock /></span> Attendance
                </button>
              )}
              {!isITSupport && (
                <button className={`mobile-drawer-item ${currentView === "screenshots" ? "active" : ""}`}
                  onClick={() => { setCurrentView("screenshots"); setMobileMenuOpen(false); }}>
                  <span style={{ display: "inline-flex" }}><FiEye /></span> Activity Screenshots
                </button>
              )}
              {!isITSupport && (
                <button className={`mobile-drawer-item ${currentView === "chat" ? "active" : ""}`}
                  onClick={() => { setCurrentView("chat"); setMobileMenuOpen(false); }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ display: "inline-flex" }}><FiMessageSquare /></span> Chat Workspace
                  </span>
                  {unreadChatCount > 0 && (
                    <span style={{
                      background: "var(--status-critical)",
                      color: "#fff",
                      borderRadius: "50%",
                      padding: "2px 6px",
                      fontSize: "0.7rem",
                      fontWeight: "700"
                    }}>
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              )}
              {!isITSupport && (
                <button className={`mobile-drawer-item ${currentView === "leave-requests" ? "active" : ""}`}
                  onClick={() => { setCurrentView("leave-requests"); setMobileMenuOpen(false); }}>
                  <span style={{ display: "inline-flex" }}><FiCalendar /></span> Leave Requests
                  {leaveRequests.filter(r => r.status === 'Pending').length > 0 && (
                    <span style={{
                      background: "var(--status-critical)",
                      color: "#fff",
                      borderRadius: "50%",
                      padding: "2px 6px",
                      fontSize: "0.7rem",
                      fontWeight: "700",
                      marginLeft: "8px"
                    }}>
                      {leaveRequests.filter(r => r.status === 'Pending').length}
                    </span>
                  )}
                </button>
              )}
              <button className={`mobile-drawer-item ${currentView === "profile" ? "active" : ""}`}
                onClick={() => { setCurrentView("profile"); setMobileMenuOpen(false); }}>
                <span style={{ display: "inline-flex" }}><FiUser /></span> My Profile
              </button>
              {isITSupport && (
                <button className="mobile-drawer-item"
                  onClick={() => { window.location.href = "/employee-dashboard"; setMobileMenuOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", color: "var(--accent-cyan)", fontWeight: "600", marginTop: "12px", borderTop: "1px solid var(--glass-border)", paddingTop: "8px" }}
                >
                  <span style={{ display: "inline-flex" }}><FiUser /></span> Employee Portal
                </button>
              )}
            </>
          )}
        </nav>

        <div className="mobile-drawer-footer">
          <button className="mobile-drawer-logout"
            onClick={() => { logout(); router.push("/login"); }}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <FiLogOut /> Sign Out
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
            <Logo height="30px" />
          </div>
          <div className="alert-widget" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ThemeToggle />
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
                {isMounted && (() => {
                  const empDetails = employees.find(e => e.id === user?.id);
                  return renderProfileAvatar(empDetails || { name: user?.name || "A" }, "24px");
                })()}
                <span suppressHydrationWarning style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: "600" }}>
                  {isMounted ? user?.name : ""}
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
                    background: "var(--bg-secondary)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "12px",
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
                    <FiUser style={{ fontSize: "1rem", flexShrink: 0 }} /> My Profile
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
                    <FiShield style={{ fontSize: "1rem", flexShrink: 0 }} /> Privacy & Terms
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
                    <FiLogOut style={{ fontSize: "1rem", flexShrink: 0 }} /> Sign Out
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
        <main className="page-container" style={{ overflowY: currentView === "chat" ? "hidden" : "auto" }}>

          {/* ================= VIEW: ATTENDANCE ================= */}
          {currentView === "attendance" && !isITSupport && (
            <div className="page-section active">
              <AttendanceTab user={user} />
            </div>
          )}

          {/* ================= VIEW: SCREENSHOTS ================= */}
          {currentView === "screenshots" && !isITSupport && (
            <div className="page-section active">
              <ScreenshotsTab />
            </div>
          )}

          {/* ================= VIEW: CHAT ================= */}
          {currentView === "chat" && !isITSupport && (
            <div className="page-section active" style={{ height: "calc(100vh - 150px)", padding: 0 }}>
              <ChatView user={user} />
            </div>
          )}

          {/* ================= VIEW: PROFILE ================= */}
          {currentView === "profile" && (
            <ProfileTab
              employees={employees}
              user={user}
              handleProfilePictureUpload={handleProfilePictureUpload}
              renderProfileAvatar={renderProfileAvatar}
              setShowDeleteConfirm={setShowDeleteConfirm}
            />
          )}

          {/* ================= VIEW: DANGER ZONE ================= */}
          {currentView === "danger-zone" && !isITSupport && (
            <DangerZoneTab
              systems={systems}
              tickets={tickets}
              handleDangerDelete={handleDangerDelete}
            />
          )}

          {/* ================= VIEW: DASHBOARD ================= */}
          {currentView === "dashboard" && (
            <DashboardTab
              fastTestMode={fastTestMode}
              handleFastTestToggle={handleFastTestToggle}
              stats={stats}
              activeTickets={activeTickets}
              systems={systems}
              employees={employees}
              getTicketTimings={getTicketTimings}
              handleStartTicket={handleStartTicket}
              handleOpenResolveModal={handleOpenResolveModal}
              chartEntries={chartEntries}
              maxCount={maxCount}
            />
          )}

          {/* ================= VIEW: SYSTEMS / HARDWARE ================= */}
          {currentView === "systems" && (
            <SystemsTab
              handleExportSystemsToExcel={handleExportSystemsToExcel}
              setShowImportModal={setShowImportModal}
              setImportStatus={setImportStatus}
              setImportFile={setImportFile}
              setImportParsed={setImportParsed}
              setImportResult={setImportResult}
              handleOpenAddSysModal={handleOpenAddSysModal}
              sysSearch={sysSearch}
              setSysSearch={setSysSearch}
              setSysPage={setSysPage}
              sysFilterOS={sysFilterOS}
              setSysFilterOS={setSysFilterOS}
              sysFilterStatus={sysFilterStatus}
              setSysFilterStatus={setSysFilterStatus}
              currentSystems={currentSystems}
              employees={employees}
              handleOpenEditSysModal={handleOpenEditSysModal}
              handleOpenHistoryModal={handleOpenHistoryModal}
              userRole={userRole}
              handleRemoveSystem={handleRemoveSystem}
              sysPage={sysPage}
              totalSysPages={totalSysPages}
            />
          )}

          {/* ================= VIEW: EMPLOYEES / USERS ================= */}
          {currentView === "employees" && (
            <EmployeesTab
              handleExportEmployeesToExcel={handleExportEmployeesToExcel}
              setShowEmpImportModal={setShowEmpImportModal}
              setEmpImportStatus={setEmpImportStatus}
              setEmpImportFile={setEmpImportFile}
              setEmpImportParsed={setEmpImportParsed}
              setEmpImportResult={setEmpImportResult}
              setShowAddEmpModal={setShowAddEmpModal}
              empSearch={empSearch}
              setEmpSearch={setEmpSearch}
              setEmpPage={setEmpPage}
              empFilterDept={empFilterDept}
              setEmpFilterDept={setEmpFilterDept}
              availableEmpDepartments={availableEmpDepartments}
              empFilterRole={empFilterRole}
              setEmpFilterRole={setEmpFilterRole}
              availableEmpRoles={availableEmpRoles}
              currentEmployees={currentEmployees}
              systems={systems}
              setSelectedViewDept={setSelectedViewDept}
              setDeptModalTab={setDeptModalTab}
              setSelectedViewSystem={setSelectedViewSystem}
              handleOpenAssignModal={handleOpenAssignModal}
              handleOpenEditEmpModal={handleOpenEditEmpModal}
              handleOpenEmpReportModal={handleOpenEmpReportModal}
              handleToggleEmployeeStatus={handleToggleEmployeeStatus}
              handleRemoveEmployee={handleRemoveEmployee}
              totalEmpPages={totalEmpPages}
              empPage={empPage}
              router={router}
            />
          )}

          {/* ================= VIEW: TICKETS / RAISE RECORD ================= */}
          {currentView === "tickets" && (
            <TicketsTab
              handleExportTicketsToExcel={handleExportTicketsToExcel}
              ticketSearch={ticketSearch}
              setTicketSearch={setTicketSearch}
              setTicketPage={setTicketPage}
              ticketFilterStatus={ticketFilterStatus}
              setTicketFilterStatus={setTicketFilterStatus}
              ticketFilterSeverity={ticketFilterSeverity}
              setTicketFilterSeverity={setTicketFilterSeverity}
              currentAdminTickets={currentAdminTickets}
              systems={systems}
              employees={employees}
              handleStartTicket={handleStartTicket}
              handleOpenResolveModal={handleOpenResolveModal}
              totalAdminTicketPages={totalAdminTicketPages}
              ticketPage={ticketPage}
            />
          )}

          {/* ================= VIEW: DEPARTMENTS ================= */}
          {currentView === "departments" && !isITSupport && (
            <DepartmentsTab
              departments={departments}
              setDepartments={setDepartments}
              employees={employees}
              newDeptName={newDeptName}
              setNewDeptName={setNewDeptName}
              deptError={deptError}
              setDeptError={setDeptError}
              addDepartment={addDepartment}
              deleteDepartment={deleteDepartment}
              getDepartments={getDepartments}
              user={user}
              playBeep={playBeep}
              setSelectedViewDept={setSelectedViewDept}
              setDeptModalTab={setDeptModalTab}
            />
          )}

          {/* ================= VIEW: HISTORY / LOGS ================= */}
          {currentView === "history" && !isITSupport && (
            <HistoryTab
              handleExportHistoryToExcel={handleExportHistoryToExcel}
              historySearch={historySearch}
              setHistorySearch={setHistorySearch}
              setHistoryPage={setHistoryPage}
              currentHistory={currentHistory}
              employees={employees}
              totalHistoryPages={totalHistoryPages}
              historyPage={historyPage}
              filteredHistory={filteredHistory}
            />
          )}

          {/* ================= VIEW: TASKS ================= */}
          {currentView === "tasks" && !isITSupport && (
            <TasksTab
              isTeamLeader={isTeamLeader}
              leaderDepartment={leaderDepartment}
              handleExportTasksToCSV={handleExportTasksToCSV}
              setEmpReportTarget={setEmpReportTarget}
              setEmpReportFrom={setEmpReportFrom}
              setEmpReportTo={setEmpReportTo}
              setShowEmpReportModal={setShowEmpReportModal}
              employees={employees}
              setNewTaskTitle={setNewTaskTitle}
              setNewTaskDesc={setNewTaskDesc}
              setNewTaskAssignee={setNewTaskAssignee}
              setShowAddTaskModal={setShowAddTaskModal}
              setTaskPage={setTaskPage}
              taskSearch={taskSearch}
              setTaskSearch={setTaskSearch}
              currentTasks={currentTasks}
              now={now}
              setSelectedTaskDetails={setSelectedTaskDetails}
              setShowTaskDetailsModal={setShowTaskDetailsModal}
              setEditingTask={setEditingTask}
              setEditTaskTitle={setEditTaskTitle}
              setEditTaskDesc={setEditTaskDesc}
              setEditTaskAssignee={setEditTaskAssignee}
              setEditTaskStatus={setEditTaskStatus}
              setShowEditTaskModal={setShowEditTaskModal}
              handleDeleteTask={handleDeleteTask}
              totalTaskPages={totalTaskPages}
              taskPage={taskPage}
              filteredTasks={filteredTasks}
              perfChartTab={perfChartTab}
              setPerfChartTab={setPerfChartTab}
              performanceEmployees={performanceEmployees}
              tasks={tasks}
              currentPerfEmployees={currentPerfEmployees}
              totalPerfPages={totalPerfPages}
              perfPage={perfPage}
              setPerfPage={setPerfPage}
            />
          )}

          {/* ================= VIEW: LEAVE REQUESTS ================= */}
          {currentView === "leaves" && !isITSupport && (
            <LeaveRequestsTab
              leaveSummary={leaveSummary}
              leaveRequests={leaveRequests}
              leaveFilterStatus={leaveFilterStatus}
              setLeaveFilterStatus={setLeaveFilterStatus}
              leavePageSize={leavePageSize}
              leaveCurrentPage={leaveCurrentPage}
              setLeaveCurrentPage={setLeaveCurrentPage}
              employees={employees}
              setSelectedReasonModal={setSelectedReasonModal}
              handleViewLeave={handleViewLeave}
              handleReviewLeave={handleReviewLeave}
              leaveActionLoading={leaveActionLoading}
            />
          )}

          {/* ================= VIEW: EMPLOYEE COMPLAINT PORTAL ================= */}
          {currentView === "portal" && (
            <EmployeePortalTab
              handleComplaintSubmit={handleComplaintSubmit}
              portalEmployeeId={portalEmployeeId}
              handlePortalEmployeeChange={handlePortalEmployeeChange}
              employees={employees}
              portalSystemId={portalSystemId}
              setPortalSystemId={setPortalSystemId}
              systems={systems}
              portalCategory={portalCategory}
              setPortalCategory={setPortalCategory}
              portalSeverity={portalSeverity}
              setPortalSeverity={setPortalSeverity}
              portalDesc={portalDesc}
              setPortalDesc={setPortalDesc}
            />
          )}

        </main>
      </div>

      {/* ================= MODALS ================= */}
      <SystemModal
        showSysModal={showSysModal}
        setShowSysModal={setShowSysModal}
        editingSys={editingSys}
        setEditingSys={setEditingSys}
        handleSaveSystemSubmit={handleSaveSystemSubmit}
        empSearchQuery={empSearchQuery}
        setEmpSearchQuery={setEmpSearchQuery}
        showSearchDropdown={showSearchDropdown}
        setShowSearchDropdown={setShowSearchDropdown}
        employees={employees}
      />

      <AssignDeviceModal
        showAssignModal={showAssignModal}
        setShowAssignModal={setShowAssignModal}
        handleAssignSubmit={handleAssignSubmit}
        assigningEmp={assigningEmp}
        assigningSysId={assigningSysId}
        setAssigningSysId={setAssigningSysId}
        systems={systems}
      />

      <ResolveTicketModal
        showResolveModal={showResolveModal}
        setShowResolveModal={setShowResolveModal}
        handleResolveTicketSubmit={handleResolveTicketSubmit}
        resolveNotes={resolveNotes}
        setResolveNotes={setResolveNotes}
      />

      <TaskModals
        showAddTaskModal={showAddTaskModal}
        setShowAddTaskModal={setShowAddTaskModal}
        handleAddTaskSubmit={handleAddTaskSubmit}
        newTaskTitle={newTaskTitle}
        setNewTaskTitle={setNewTaskTitle}
        newTaskDesc={newTaskDesc}
        setNewTaskDesc={setNewTaskDesc}
        newTaskAssignee={newTaskAssignee}
        setNewTaskAssignee={setNewTaskAssignee}
        employees={employees}
        isTeamLeader={isTeamLeader}
        leaderDepartment={leaderDepartment}
        showEditTaskModal={showEditTaskModal}
        setShowEditTaskModal={setShowEditTaskModal}
        handleEditTaskSubmit={handleEditTaskSubmit}
        editTaskTitle={editTaskTitle}
        setEditTaskTitle={setEditTaskTitle}
        editTaskDesc={editTaskDesc}
        setEditTaskDesc={setEditTaskDesc}
        editTaskAssignee={editTaskAssignee}
        setEditTaskAssignee={setEditTaskAssignee}
        editTaskStatus={editTaskStatus}
        setEditTaskStatus={setEditTaskStatus}
        showTaskDetailsModal={showTaskDetailsModal}
        setShowTaskDetailsModal={setShowTaskDetailsModal}
        selectedTaskDetails={selectedTaskDetails}
        setSelectedTaskDetails={setSelectedTaskDetails}
        setPreviewMediaUrl={setPreviewMediaUrl}
      />

      <EmployeeModals
        showAddEmpModal={showAddEmpModal}
        setShowAddEmpModal={setShowAddEmpModal}
        handleAddEmployeeSubmit={handleAddEmployeeSubmit}
        newEmpName={newEmpName}
        setNewEmpName={setNewEmpName}
        newEmpEmail={newEmpEmail}
        setNewEmpEmail={setNewEmpEmail}
        newEmpPassword={newEmpPassword}
        setNewEmpPassword={setNewEmpPassword}
        showNewEmpPassword={showNewEmpPassword}
        setShowNewEmpPassword={setShowNewEmpPassword}
        newEmpRole={newEmpRole}
        setNewEmpRole={setNewEmpRole}
        newEmpDept={newEmpDept}
        setNewEmpDept={setNewEmpDept}
        departments={departments}
        newEmpLimit={newEmpLimit}
        setNewEmpLimit={setNewEmpLimit}
        showEditEmpModal={showEditEmpModal}
        setShowEditEmpModal={setShowEditEmpModal}
        handleEditEmployeeSubmit={handleEditEmployeeSubmit}
        editingEmp={editingEmp}
        setEditingEmp={setEditingEmp}
        showEmpReportModal={showEmpReportModal}
        setShowEmpReportModal={setShowEmpReportModal}
        empReportTarget={empReportTarget}
        setEmpReportTarget={setEmpReportTarget}
        empReportFrom={empReportFrom}
        setEmpReportFrom={setEmpReportFrom}
        empReportTo={empReportTo}
        setEmpReportTo={setEmpReportTo}
        handleDownloadEmpReport={handleDownloadEmpReport}
        employees={employees}
        systems={systems}
        assignmentHistory={assignmentHistory}
        tickets={tickets}
        tasks={tasks}
        showEmpImportModal={showEmpImportModal}
        setShowEmpImportModal={setShowEmpImportModal}
        empImportStatus={empImportStatus}
        setEmpImportStatus={setEmpImportStatus}
        empImportFile={empImportFile}
        setEmpImportFile={setEmpImportFile}
        empImportParsed={empImportParsed}
        setEmpImportParsed={setEmpImportParsed}
        empImportResult={empImportResult}
        handleDownloadEmpTemplate={handleDownloadEmpTemplate}
        handleEmpImportFileChange={handleEmpImportFileChange}
        handleConfirmEmpImport={handleConfirmEmpImport}
      />

      <DepartmentModals
        selectedViewDept={selectedViewDept}
        setSelectedViewDept={setSelectedViewDept}
        deptModalTab={deptModalTab}
        setDeptModalTab={setDeptModalTab}
        employees={employees}
        systems={systems}
      />

      <SystemHistoryModal
        isHistoryModalOpen={isHistoryModalOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        selectedHistorySys={selectedHistorySys}
        handleDownloadSystemReport={handleDownloadSystemReport}
        assignmentHistory={assignmentHistory}
        employees={employees}
        tickets={tickets}
      />

      <DeviceDetailsModal
        selectedViewSystem={selectedViewSystem}
        setSelectedViewSystem={setSelectedViewSystem}
        assignmentHistory={assignmentHistory}
        employees={employees}
      />

      <SystemImportModal
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        importFile={importFile}
        setImportFile={setImportFile}
        importParsed={importParsed}
        setImportParsed={setImportParsed}
        importResult={importResult}
        handleDownloadTemplate={handleDownloadTemplate}
        handleImportFileChange={handleImportFileChange}
        handleConfirmImport={handleConfirmImport}
      />

      <AuxiliaryModals
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        handleDeleteAccountConfirm={handleDeleteAccountConfirm}
        previewMediaUrl={previewMediaUrl}
        setPreviewMediaUrl={setPreviewMediaUrl}
        selectedReasonModal={selectedReasonModal}
        setSelectedReasonModal={setSelectedReasonModal}
      />



    </div>
  );
}
