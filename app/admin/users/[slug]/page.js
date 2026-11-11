"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { getEmployees, getSystems, getTickets, getTasks, getAssignmentHistory, updateEmployee } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import Pagination from "../../../components/Pagination.js";
import {
  FiUser,
  FiArrowLeft,
  FiServer,
  FiCheckSquare,
  FiFileText,
  FiClock,
  FiShield,
  FiFolder,
  FiPlus,
  FiDownload,
  FiTrash2,
  FiEye,
  FiX,
  FiCheck,
  FiUploadCloud,
  FiExternalLink,
  FiPaperclip,
  FiAlertCircle,
  FiCopy,
  FiMail,
  FiPhone,
  FiGrid,
  FiList,
  FiSearch,
  FiMonitor,
  FiCheckCircle,
  FiShare2,
  FiActivity,
  FiLayers,
  FiHardDrive,
  FiCalendar,
  FiUserCheck,
  FiUserX,
  FiEdit2
} from "react-icons/fi";

const DOCUMENT_CATEGORIES = [
  "Resume / CV",
  "Government ID Proof",
  "Address Proof",
  "Offer / Appointment Letter",
  "Academic / Degree Certificate",
  "Experience / Relieving Letter",
  "Bank / Salary Slip Document",
  "Other Document"
];

export function getMemberSince(emp) {
  if (!emp) return { dateStr: "", formatted: "N/A", relative: "" };
  let rawDate = emp.joining_date || emp.createdAt || emp.created_at;

  // Try extracting timestamp from ID if emp_1792038530085 format
  if (!rawDate && emp.id && String(emp.id).startsWith("emp_")) {
    const rawNum = String(emp.id).replace("emp_", "").split("_")[0];
    const ts = Number(rawNum);
    if (!isNaN(ts) && ts > 1000000000000 && ts < 2500000000000) {
      rawDate = new Date(ts).toISOString();
    }
  }

  if (!rawDate) return { dateStr: "", formatted: "Registered Staff", relative: "" };

  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return { dateStr: String(rawDate), formatted: String(rawDate), relative: "" };

  const formatted = d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let relative = "";
  if (diffDays < 1) {
    relative = "Joined today";
  } else if (diffDays === 1) {
    relative = "Joined yesterday";
  } else if (diffDays < 30) {
    relative = `${diffDays} days ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relative = `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    const years = (diffDays / 365).toFixed(1);
    relative = `${years} yrs tenure`;
  }

  return { dateStr: d.toISOString().slice(0, 10), formatted, relative };
}

export function getLeavingStatus(emp) {
  if (!emp) return { hasLeavingDate: false, dateStr: "", formatted: null, isPast: false, label: "Unknown" };
  const rawDate = emp.leaving_date;
  if (!rawDate || String(rawDate).trim() === "") {
    return {
      hasLeavingDate: false,
      dateStr: "",
      formatted: null,
      isPast: false,
      label: "Currently Active (No Leaving Date)"
    };
  }

  const d = new Date(rawDate);
  if (isNaN(d.getTime())) {
    return {
      hasLeavingDate: true,
      dateStr: String(rawDate),
      formatted: String(rawDate),
      isPast: false,
      label: `Leaving Date: ${rawDate}`
    };
  }

  const formatted = d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const now = new Date();
  const isPast = d <= now;

  return {
    hasLeavingDate: true,
    dateStr: d.toISOString().slice(0, 10),
    formatted,
    isPast,
    label: isPast ? `Left on ${formatted}` : `Leaving on ${formatted} (Notice Period)`
  };
}

export default function UserSlugDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignedSystems, setAssignedSystems] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [userLogs, setUserLogs] = useState([]);

  // Tab & View States
  const [activeTab, setActiveTab] = useState("overview"); // overview, documents, hardware, tasks, tickets, history
  const [docViewMode, setDocViewMode] = useState("grid"); // grid | list
  const [docSearch, setDocSearch] = useState("");
  const [copiedField, setCopiedField] = useState(null);

  // Ticket History Pagination
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPageSize, setTicketPageSize] = useState(5);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docCategoryFilter, setDocCategoryFilter] = useState("All");
  const [docForm, setDocForm] = useState({
    type: "Resume / CV",
    name: "",
    file: null
  });
  const [previewDoc, setPreviewDoc] = useState(null);

  // Employment Dates State
  const [showDateModal, setShowDateModal] = useState(false);
  const [savingDates, setSavingDates] = useState(false);
  const [dateForm, setDateForm] = useState({
    joining_date: "",
    leaving_date: "",
    status: "Active"
  });

  const fetchLiveEmployee = async (empId) => {
    try {
      const res = await fetch(`/api/employees/${empId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setEmployee(prev => ({
          ...(prev || {}),
          ...data.data
        }));
      }
    } catch (err) {
      console.error("Error fetching live employee details:", err);
    }
  };

  const fetchDocs = async (empId) => {
    try {
      setLoadingDocs(true);
      setDocuments([]);
      const res = await fetch(`/api/employees/${empId}/documents`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDocuments(data.data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Error loading employee documents:", err);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    try {
      const allEmployees = getEmployees();
      const emp = findEmployeeBySlug(allEmployees, slug);
      setEmployee(emp || null);

      if (emp) {
        const allSystems = getSystems();
        const allTickets = getTickets();
        const allTasks = getTasks();
        const allLogs = getAssignmentHistory();

        setAssignedSystems(allSystems.filter(s => String(s.assignedTo) === String(emp.id)));
        const empTickets = allTickets.filter(t => String(t.employeeId) === String(emp.id) || String(t.raisedBy) === String(emp.id));
        empTickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setUserTickets(empTickets);
        setTicketPage(1);
        setUserTasks(allTasks.filter(t => String(t.assignedTo) === String(emp.id)));
        setUserLogs(allLogs.filter(h => String(h.employeeId) === String(emp.id)));

        // Load live employee data from server DB & load documents
        fetchLiveEmployee(emp.id);
        fetchDocs(emp.id);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Error loading user details:", err);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const handleSync = () => {
      if (!slug) return;
      const allEmployees = getEmployees();
      const emp = findEmployeeBySlug(allEmployees, slug);
      if (emp && !employee) {
        setEmployee(emp);
        const allSystems = getSystems();
        const allTickets = getTickets();
        const allTasks = getTasks();
        const allLogs = getAssignmentHistory();

        setAssignedSystems(allSystems.filter(s => String(s.assignedTo) === String(emp.id)));
        const empTickets = allTickets.filter(t => String(t.employeeId) === String(emp.id) || String(t.raisedBy) === String(emp.id));
        empTickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setUserTickets(empTickets);
        setUserTasks(allTasks.filter(t => String(t.assignedTo) === String(emp.id)));
        setUserLogs(allLogs.filter(h => String(h.employeeId) === String(emp.id)));
        fetchLiveEmployee(emp.id);
        fetchDocs(emp.id);
      }
    };

    window.addEventListener('devicedesk_db_synced', handleSync);
    return () => window.removeEventListener('devicedesk_db_synced', handleSync);
  }, [slug, employee]);

  const handleOpenDateModal = () => {
    const rawJoin = employee?.joining_date || employee?.createdAt || employee?.created_at;
    let initialJoin = "";
    if (rawJoin) {
      try {
        const d = new Date(rawJoin);
        if (!isNaN(d.getTime())) {
          initialJoin = d.toISOString().slice(0, 10);
        }
      } catch (e) {}
    } else if (employee?.id && String(employee.id).startsWith("emp_")) {
      const rawNum = String(employee.id).replace("emp_", "").split("_")[0];
      const ts = Number(rawNum);
      if (!isNaN(ts) && ts > 1000000000000 && ts < 2500000000000) {
        try {
          initialJoin = new Date(ts).toISOString().slice(0, 10);
        } catch (e) {}
      }
    }

    let initialLeave = "";
    if (employee?.leaving_date) {
      try {
        const d = new Date(employee.leaving_date);
        if (!isNaN(d.getTime())) {
          initialLeave = d.toISOString().slice(0, 10);
        } else {
          initialLeave = String(employee.leaving_date);
        }
      } catch (e) {}
    }

    setDateForm({
      joining_date: initialJoin,
      leaving_date: initialLeave,
      status: employee?.status || "Active"
    });
    setShowDateModal(true);
  };

  const handleSaveDates = async (e) => {
    e.preventDefault();
    if (!employee?.id) return;
    try {
      setSavingDates(true);
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joining_date: dateForm.joining_date || null,
          leaving_date: dateForm.leaving_date || null,
          status: dateForm.status
        })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message || !data.error)) {
        Swal.fire({
          icon: "success",
          title: "Dates Updated",
          text: "Employment & tenancy dates updated successfully.",
          timer: 1800,
          showConfirmButton: false,
          background: "#161b22",
          color: "#f0f6fc"
        });
        setEmployee(prev => ({
          ...prev,
          joining_date: dateForm.joining_date || null,
          leaving_date: dateForm.leaving_date || null,
          status: dateForm.status
        }));
        updateEmployee(employee.id, {
          joining_date: dateForm.joining_date || null,
          leaving_date: dateForm.leaving_date || null,
          status: dateForm.status
        });
        setShowDateModal(false);
      } else {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: data.error || "Failed to update employment dates",
          background: "#161b22",
          color: "#f0f6fc"
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to update employment dates",
        background: "#161b22",
        color: "#f0f6fc"
      });
    } finally {
      setSavingDates(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenAddDocModal = (presetCategory = "Resume / CV") => {
    setDocForm({
      type: presetCategory,
      name: presetCategory.split(" / ")[0],
      file: null
    });
    setShowDocModal(true);
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.file) {
      Swal.fire({
        icon: "warning",
        title: "File Required",
        text: "Please select a file to upload.",
        background: "#161b22",
        color: "#f0f6fc"
      });
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", docForm.file);
      formData.append("type", docForm.type);
      formData.append("name", docForm.name.trim() || docForm.file.name);
      formData.append("uploadedBy", "Admin");

      const res = await fetch(`/api/employees/${employee.id}/documents`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Document Uploaded",
          text: `"${docForm.name || docForm.file.name}" has been uploaded successfully.`,
          timer: 2000,
          showConfirmButton: false,
          background: "#161b22",
          color: "#f0f6fc"
        });
        setDocuments(data.documents || []);
        setShowDocModal(false);
        setDocForm({ type: "Resume / CV", name: "", file: null });

        // Update local store as well
        updateEmployee(employee.id, { documents: data.documents });
      } else {
        Swal.fire({
          icon: "error",
          title: "Upload Failed",
          text: data.error || "Failed to upload document",
          background: "#161b22",
          color: "#f0f6fc"
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to upload file.",
        background: "#161b22",
        color: "#f0f6fc"
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = (doc) => {
    Swal.fire({
      title: "Delete Document?",
      text: `Are you sure you want to remove "${doc.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6e7881",
      background: "#161b22",
      color: "#f0f6fc"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/employees/${employee.id}/documents?docId=${doc.id}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setDocuments(data.documents || []);
            updateEmployee(employee.id, { documents: data.documents });
            Swal.fire({
              icon: "success",
              title: "Deleted",
              text: "Document removed successfully.",
              timer: 1500,
              showConfirmButton: false,
              background: "#161b22",
              color: "#f0f6fc"
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: data.error || "Failed to delete document",
              background: "#161b22",
              color: "#f0f6fc"
            });
          }
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message || "Network error",
            background: "#161b22",
            color: "#f0f6fc"
          });
        }
      }
    });
  };

  const getCategoryBadgeClass = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("resume") || t.includes("cv")) return "badge-progress";
    if (t.includes("id proof") || t.includes("government")) return "badge-resolved";
    if (t.includes("offer") || t.includes("appointment")) return "badge-open";
    if (t.includes("address")) return "badge-progress";
    return "badge-open";
  };

  const getDocTypeIcon = (fileName, type = "") => {
    const ext = (fileName || "").split(".").pop().toLowerCase();
    if (ext === "pdf") return { icon: "📄", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", label: "PDF" };
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return { icon: "🖼️", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", label: "IMG" };
    if (["doc", "docx"].includes(ext)) return { icon: "📝", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", label: "DOC" };
    if (["xls", "xlsx", "csv"].includes(ext)) return { icon: "📊", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", label: "XLS" };
    if (["zip", "rar", "7z"].includes(ext)) return { icon: "📦", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", label: "ZIP" };
    return { icon: "📁", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", label: "FILE" };
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "42px", height: "42px", border: "3px solid var(--glass-border)", borderTopColor: "var(--accent-cyan)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Loading team member profile...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page-container" style={{ padding: "clamp(1rem, 3vw, 2.5rem)", maxWidth: "800px", margin: "0 auto" }}>
        <button onClick={() => router.push("/admin/users")} className="btn-secondary" style={{ marginBottom: "1.5rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <FiArrowLeft /> Back to Team Directory
        </button>
        <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "16px", padding: "2.5rem 1.5rem", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", margin: "0 auto 1rem auto" }}>
            <FiAlertCircle />
          </div>
          <h2 style={{ color: "var(--status-critical)", marginBottom: "0.5rem", fontSize: "1.3rem" }}>Team Member Not Found</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No team member matching the slug &quot;<strong>{slug}</strong>&quot; was found.</p>
        </div>
      </div>
    );
  }

  const userSlug = getEmployeeSlug(employee);
  const memberSinceInfo = getMemberSince(employee);
  const leavingInfo = getLeavingStatus(employee);
  const completedTasks = userTasks.filter(t => t.status === "Completed").length;
  const pendingTasks = userTasks.length - completedTasks;
  const taskCompletionRate = userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0;

  // Onboarding Checklist Verification
  const checklist = [
    {
      category: "Resume / CV",
      label: "Resume / CV",
      doc: documents.find(d => (d.type || "").toLowerCase().includes("resume") || (d.type || "").toLowerCase().includes("cv")),
      required: true
    },
    {
      category: "Government ID Proof",
      label: "Govt ID Proof",
      doc: documents.find(d => (d.type || "").toLowerCase().includes("id proof") || (d.type || "").toLowerCase().includes("government")),
      required: true
    },
    {
      category: "Address Proof",
      label: "Address Proof",
      doc: documents.find(d => (d.type || "").toLowerCase().includes("address")),
      required: false
    },
    {
      category: "Offer / Appointment Letter",
      label: "Offer Letter",
      doc: documents.find(d => (d.type || "").toLowerCase().includes("offer") || (d.type || "").toLowerCase().includes("appointment")),
      required: true
    }
  ];

  const verifiedCount = checklist.filter(c => !!c.doc).length;
  const verificationPercent = Math.round((verifiedCount / checklist.length) * 100);

  // Filtered documents
  const filteredDocuments = documents.filter(d => {
    const matchesCategory = docCategoryFilter === "All" || (d.type || "").toLowerCase().includes(docCategoryFilter.toLowerCase().split(" / ")[0]);
    const matchesSearch = !docSearch.trim() || 
      (d.name || "").toLowerCase().includes(docSearch.toLowerCase()) || 
      (d.fileName || "").toLowerCase().includes(docSearch.toLowerCase()) ||
      (d.type || "").toLowerCase().includes(docSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Ticket pagination calculations
  const totalTicketPages = Math.max(1, Math.ceil(userTickets.length / ticketPageSize));
  const safeTicketPage = Math.min(Math.max(1, ticketPage), totalTicketPages);
  const paginatedTickets = userTickets.slice((safeTicketPage - 1) * ticketPageSize, safeTicketPage * ticketPageSize);

  return (
    <div className="user-profile-page">
      <style>{`
        .user-profile-page {
          padding: clamp(1rem, 2.5vw, 2.5rem);
          max-width: 1280px;
          margin: 0 auto;
          color: var(--text-primary);
        }

        /* Top Bar */
        .profile-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.85rem;
        }

        /* Hero Banner */
        .profile-hero-card {
          position: relative;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: clamp(1.25rem, 3vw, 2rem);
          margin-bottom: 1.75rem;
          backdrop-filter: blur(12px);
          overflow: hidden;
          // box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }

        .profile-hero-card::before {
          content: "";
          position: absolute;
          top: -60px;
          right: -60px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-inner {
          display: flex;
          align-items: center;
          gap: clamp(1rem, 2.5vw, 2rem);
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }

        .hero-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .hero-avatar {
          width: clamp(72px, 10vw, 92px);
          height: clamp(72px, 10vw, 92px);
          border-radius: 24px;
          background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          color: #ffffff;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(6, 182, 212, 0.25);
          border: 2px solid rgba(255, 255, 255, 0.15);
          overflow: hidden;
        }

        .hero-status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid var(--bg-primary, #0a0b10);
        }

        .hero-info {
          flex: 1 1 280px;
          min-width: 0;
        }

        .hero-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .hero-name {
          margin: 0;
          font-size: clamp(1.4rem, 2.4vw, 1.85rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }

        .hero-role-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 700;
          background: rgba(6, 182, 212, 0.12);
          color: var(--accent-cyan);
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        .hero-dept-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
          background: rgba(139, 92, 246, 0.12);
          color: var(--accent-purple);
          border: 1px solid rgba(139, 92, 246, 0.25);
        }

        .hero-meta-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .meta-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--accent-cyan);
          color: var(--text-primary);
        }

        /* Verification Readiness Panel */
        .verification-card {
          flex: 1 1 260px;
          max-width: 340px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-bar-bg {
          width: 100%;
          height: 7px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 99px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Bento Stats Grid */
        .bento-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .bento-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .bento-card:hover {
          transform: translateY(-2px);
          border-color: rgba(6, 182, 212, 0.35);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .bento-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
        }

        /* Tab Navigation Bar */
        .tab-nav-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--glass-border);
          scrollbar-width: thin;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px 12px 0 0;
          font-size: 0.88rem;
          font-weight: 600;
          background: transparent;
          color: var(--text-secondary);
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          position: relative;
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.03);
        }

        .tab-btn.active {
          color: var(--accent-cyan);
          background: rgba(6, 182, 212, 0.08);
        }

        .tab-btn.active::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-cyan);
          border-radius: 2px 2px 0 0;
        }

        .tab-count {
          padding: 1px 7px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.07);
          color: var(--text-muted);
        }

        .tab-btn.active .tab-count {
          background: rgba(6, 182, 212, 0.2);
          color: var(--accent-cyan);
        }

        /* Document Grid & Cards */
        .doc-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1rem;
        }

        .doc-item-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 1.1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .doc-item-card:hover {
          border-color: rgba(6, 182, 212, 0.35);
          background: rgba(255, 255, 255, 0.03);
          transform: translateY(-2px);
        }

        /* Mobile Card list style for hardware, tasks, tickets */
        .mobile-card-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mobile-item-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .desktop-only-table {
            display: none !important;
          }
          .mobile-only-cards {
            display: flex !important;
          }
          .verification-card {
            max-width: 100%;
          }
        }

        @media (min-width: 769px) {
          .desktop-only-table {
            display: table !important;
          }
          .mobile-only-cards {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header & Navigation Bar */}
      <div className="profile-top-bar">
        <button
          onClick={() => router.push("/admin/users")}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "10px" }}
        >
          <FiArrowLeft /> Back to Directory
        </button>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleOpenDateModal}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", fontSize: "0.85rem", borderColor: "rgba(6, 182, 212, 0.4)" }}
            title="Edit Joining & Leaving Dates"
          >
            <FiCalendar style={{ color: "var(--accent-cyan)" }} /> Manage Dates
          </button>

          <button
            onClick={() => copyToClipboard(window.location.href, "link")}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", fontSize: "0.85rem" }}
            title="Copy URL"
          >
            {copiedField === "link" ? (
              <>
                <FiCheck style={{ color: "#10b981" }} /> Copied!
              </>
            ) : (
              <>
                <FiShare2 /> Share Profile
              </>
            )}
          </button>

          <button
            onClick={() => handleOpenAddDocModal("Resume / CV")}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "8px 18px", borderRadius: "10px" }}
          >
            <FiUploadCloud /> Upload Document
          </button>
        </div>
      </div>

      {/* Executive Profile Hero Banner */}
      <div className="profile-hero-card">
        <div className="hero-inner">
          {/* Avatar with Status Ring */}
          <div className="hero-avatar-wrap">
            <div className="hero-avatar">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                employee.name ? employee.name[0].toUpperCase() : "U"
              )}
            </div>
            <div
              className="hero-status-dot"
              style={{
                background: employee.status === "Active" ? "#10b981" : employee.status === "Paused" ? "#f59e0b" : "#94a3b8",
                boxShadow: employee.status === "Active" ? "0 0 10px #10b981" : "none"
              }}
              title={`Status: ${employee.status || "Active"}`}
            />
          </div>

          {/* Identity details */}
          <div className="hero-info">
            <div className="hero-title-row">
              <h1 className="hero-name">{employee.name}</h1>
              <span className="hero-role-pill">
                <FiShield size={12} /> {employee.role}
              </span>
              <span className="hero-dept-pill">
                {employee.department}
              </span>
            </div>

            <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              Registered Staff Member • {employee.status || "Active"} Account
            </p>

            <div className="hero-meta-row">
              {employee.email && (
                <div
                  className="meta-chip"
                  onClick={() => copyToClipboard(employee.email, "email")}
                  title="Click to copy email address"
                >
                  <FiMail size={13} style={{ color: "var(--accent-cyan)" }} />
                  <span>{employee.email}</span>
                  {copiedField === "email" ? <FiCheck size={12} style={{ color: "#10b981" }} /> : <FiCopy size={12} style={{ opacity: 0.6 }} />}
                </div>
              )}

              <div
                className="meta-chip"
                onClick={() => copyToClipboard(employee.id, "id")}
                title="Click to copy Employee ID"
              >
                <FiUser size={13} style={{ color: "var(--accent-purple)" }} />
                <span>ID: {employee.id}</span>
                {copiedField === "id" ? <FiCheck size={12} style={{ color: "#10b981" }} /> : <FiCopy size={12} style={{ opacity: 0.6 }} />}
              </div>

              {/* Member Since Chip */}
              <div
                className="meta-chip"
                onClick={handleOpenDateModal}
                style={{ cursor: "pointer", borderColor: "rgba(6, 182, 212, 0.4)", background: "rgba(6, 182, 212, 0.08)" }}
                title="Click to edit Joining Date / Member Since"
              >
                <FiCalendar size={13} style={{ color: "var(--accent-cyan)" }} />
                <span><strong>Member Since:</strong> {memberSinceInfo.formatted}</span>
                {memberSinceInfo.relative && (
                  <span style={{ fontSize: "0.74rem", opacity: 0.85, color: "var(--accent-cyan)" }}>
                    • {memberSinceInfo.relative}
                  </span>
                )}
                <FiEdit2 size={11} style={{ opacity: 0.6, marginLeft: "3px" }} />
              </div>

              {/* Leaving Date / Currently Working Chip */}
              <div
                className="meta-chip"
                onClick={handleOpenDateModal}
                style={{
                  cursor: "pointer",
                  borderColor: leavingInfo.hasLeavingDate ? "rgba(239, 68, 68, 0.45)" : "rgba(16, 185, 129, 0.45)",
                  background: leavingInfo.hasLeavingDate ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)"
                }}
                title="Click to set or clear Leaving Date"
              >
                {leavingInfo.hasLeavingDate ? (
                  <>
                    <FiClock size={13} style={{ color: "#ef4444" }} />
                    <span style={{ color: "#f87171" }}>
                      <strong>Leaving Date:</strong> {leavingInfo.formatted}
                    </span>
                    <span style={{ fontSize: "0.72rem", background: "rgba(239,68,68,0.2)", padding: "1px 6px", borderRadius: "8px", color: "#fca5a5" }}>
                      {leavingInfo.isPast ? "Relieved" : "Notice Period"}
                    </span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={13} style={{ color: "#10b981" }} />
                    <span style={{ color: "#10b981" }}>
                      <strong>Currently Working</strong> (No Leaving Date)
                    </span>
                  </>
                )}
                <FiEdit2 size={11} style={{ opacity: 0.6, marginLeft: "3px" }} />
              </div>

              {employee.ticketLimit !== undefined && (
                <div className="meta-chip" style={{ cursor: "default" }}>
                  <span>🎫 Ticket Limit: {employee.ticketLimit}</span>
                </div>
              )}

              {employee.biometric_id && (
                <div className="meta-chip" style={{ cursor: "default" }}>
                  <span>⏱️ Biometric: #{employee.biometric_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verification Status Gauge */}
          <div className="verification-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Identity & Documents
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: verificationPercent === 100 ? "#10b981" : "#f59e0b",
                  background: verificationPercent === 100 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  padding: "2px 8px",
                  borderRadius: "12px"
                }}
              >
                {verificationPercent}% Verified
              </span>
            </div>

            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${verificationPercent}%`,
                  background: verificationPercent === 100 ? "linear-gradient(90deg, #10b981, #06b6d4)" : "linear-gradient(90deg, #f59e0b, #eab308)"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              <span>{verifiedCount} of {checklist.length} core files verified</span>
              {verificationPercent === 100 ? (
                <span style={{ color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                  <FiCheckCircle size={12} /> Compliance Met
                </span>
              ) : (
                <span style={{ color: "#f59e0b", fontWeight: 600 }}>Action Needed</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Employment Status & Tenancy Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
          border: "1px solid var(--glass-border)",
          borderRadius: "14px",
          padding: "14px 18px",
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: leavingInfo.hasLeavingDate ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
              color: leavingInfo.hasLeavingDate ? "#ef4444" : "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
              flexShrink: 0
            }}
          >
            {leavingInfo.hasLeavingDate ? <FiUserX /> : <FiUserCheck />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {leavingInfo.hasLeavingDate
                  ? (leavingInfo.isPast ? "Relieved / Former Team Member" : "Departing Staff (Notice Period)")
                  : "Active Staff Member"}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: leavingInfo.hasLeavingDate ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  color: leavingInfo.hasLeavingDate ? "#f87171" : "#10b981",
                  border: `1px solid ${leavingInfo.hasLeavingDate ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`
                }}
              >
                {leavingInfo.hasLeavingDate ? (leavingInfo.isPast ? "Leaving Date Set" : "Notice Period") : "Currently Working"}
              </span>
            </div>
            <div style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginTop: "4px", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
              <span>
                📅 <strong>Member Since:</strong>{" "}
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{memberSinceInfo.formatted}</span>{" "}
                {memberSinceInfo.relative ? `(${memberSinceInfo.relative})` : ""}
              </span>
              <span>•</span>
              <span>
                🚪 <strong>Leaving Date:</strong>{" "}
                {leavingInfo.hasLeavingDate ? (
                  <span style={{ color: "#f87171", fontWeight: 700 }}>{leavingInfo.formatted}</span>
                ) : (
                  <span style={{ color: "#10b981", fontWeight: 600 }}>Currently Active (No Leaving Date)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenDateModal}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", padding: "7px 14px", borderRadius: "8px" }}
        >
          <FiEdit2 size={13} /> Update Dates
        </button>
      </div>

      {/* Quick Document Status Checklist Bar */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--glass-border)",
          borderRadius: "14px",
          padding: "12px 16px",
          marginBottom: "1.75rem",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between"
        }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Required Records:
        </span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
          {checklist.map(item => {
            const isDone = !!item.doc;
            return isDone ? (
              <button
                key={item.category}
                onClick={() => setPreviewDoc(item.doc)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10b981",
                  borderRadius: "20px",
                  padding: "5px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                title={`Click to view verified ${item.label}`}
              >
                <FiCheckCircle size={13} /> {item.label} Attached
              </button>
            ) : (
              <button
                key={item.category}
                onClick={() => handleOpenAddDocModal(item.category)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: item.required ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
                  border: item.required ? "1px dashed rgba(239, 68, 68, 0.35)" : "1px dashed var(--glass-border)",
                  color: item.required ? "#f87171" : "var(--text-secondary)",
                  borderRadius: "20px",
                  padding: "5px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                title={`Click to upload ${item.label}`}
              >
                <FiPlus size={13} /> Add {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="bento-stats">
        {/* Hardware Devices */}
        <div className="bento-card" onClick={() => setActiveTab("hardware")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Assigned Devices</span>
            <div className="bento-icon-wrap" style={{ background: "rgba(6, 182, 212, 0.12)", color: "#06b6d4" }}>
              <FiMonitor />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              {assignedSystems.length}
            </div>
            <span style={{ fontSize: "0.75rem", color: assignedSystems.length > 0 ? "#10b981" : "var(--text-muted)" }}>
              {assignedSystems.length > 0 ? "Hardware operational" : "No devices linked"}
            </span>
          </div>
        </div>

        {/* Task Velocity */}
        <div className="bento-card" onClick={() => setActiveTab("tasks")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Task Activity</span>
            <div className="bento-icon-wrap" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
              <FiCheckSquare />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>{completedTasks}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/ {userTasks.length} tasks</span>
            </div>
            <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", margin: "6px 0" }}>
              <div style={{ width: `${taskCompletionRate}%`, height: "100%", background: "#8b5cf6", borderRadius: "2px" }} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "#8b5cf6" }}>{taskCompletionRate}% completion rate</span>
          </div>
        </div>

        {/* Tickets / Complaints */}
        <div className="bento-card" onClick={() => setActiveTab("tickets")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Tickets Raised</span>
            <div className="bento-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
              <FiAlertCircle />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {userTickets.length}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {userTickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length} active tickets
            </span>
          </div>
        </div>

        {/* Document Vault Total */}
        <div className="bento-card" onClick={() => setActiveTab("documents")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Document Vault</span>
            <div className="bento-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
              <FiFolder />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {documents.length}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#10b981" }}>
              {verifiedCount} verified compliance files
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation Header */}
      <div className="tab-nav-wrapper">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <FiLayers size={15} /> All Sections
        </button>
        <button
          className={`tab-btn ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          <FiFolder size={15} /> Document Vault
          <span className="tab-count">{documents.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "hardware" ? "active" : ""}`}
          onClick={() => setActiveTab("hardware")}
        >
          <FiMonitor size={15} /> Assigned Hardware
          <span className="tab-count">{assignedSystems.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          <FiCheckSquare size={15} /> Tasks
          <span className="tab-count">{userTasks.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "tickets" ? "active" : ""}`}
          onClick={() => setActiveTab("tickets")}
        >
          <FiAlertCircle size={15} /> Complaints & Tickets
          <span className="tab-count">{userTickets.length}</span>
        </button>
        {userLogs.length > 0 && (
          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <FiActivity size={15} /> Assignment Log
            <span className="tab-count">{userLogs.length}</span>
          </button>
        )}
      </div>

      {/* TAB CONTENT: DOCUMENTS VAULT */}
      {(activeTab === "documents" || activeTab === "overview") && (
        <div className="panel-card" style={{ marginBottom: "2rem" }}>
          {/* Header with Search, Filter & View Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <FiFolder style={{ color: "var(--accent-cyan)", fontSize: "1.2rem" }} /> Document Repository
              </span>
              <span className="timer-badge" style={{ color: "var(--accent-cyan)", borderColor: "rgba(6, 182, 212, 0.4)" }}>
                {filteredDocuments.length} File{filteredDocuments.length === 1 ? "" : "s"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {/* Live Search */}
              <div style={{ position: "relative" }}>
                <FiSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }} />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  style={{
                    padding: "6px 12px 6px 30px",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    width: "160px"
                  }}
                />
              </div>

              {/* View Toggle */}
              <div style={{ display: "inline-flex", background: "rgba(255, 255, 255, 0.04)", borderRadius: "8px", padding: "2px", border: "1px solid var(--glass-border)" }}>
                <button
                  onClick={() => setDocViewMode("grid")}
                  style={{
                    padding: "5px 9px",
                    borderRadius: "6px",
                    background: docViewMode === "grid" ? "rgba(6, 182, 212, 0.2)" : "transparent",
                    color: docViewMode === "grid" ? "var(--accent-cyan)" : "var(--text-muted)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center"
                  }}
                  title="Grid View"
                >
                  <FiGrid size={14} />
                </button>
                <button
                  onClick={() => setDocViewMode("list")}
                  style={{
                    padding: "5px 9px",
                    borderRadius: "6px",
                    background: docViewMode === "list" ? "rgba(6, 182, 212, 0.2)" : "transparent",
                    color: docViewMode === "list" ? "var(--accent-cyan)" : "var(--text-muted)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center"
                  }}
                  title="List View"
                >
                  <FiList size={14} />
                </button>
              </div>

              <button
                onClick={() => handleOpenAddDocModal("Resume / CV")}
                className="btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", padding: "7px 14px", borderRadius: "8px" }}
              >
                <FiPlus /> Upload
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          {documents.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {["All", ...DOCUMENT_CATEGORIES].map(cat => {
                const count = cat === "All"
                  ? documents.length
                  : documents.filter(d => (d.type || "").toLowerCase().includes(cat.toLowerCase().split(" / ")[0])).length;

                if (cat !== "All" && count === 0) return null;
                const active = docCategoryFilter === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setDocCategoryFilter(cat)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "16px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: active ? "1px solid var(--accent-cyan)" : "1px solid var(--glass-border)",
                      background: active ? "rgba(6, 182, 212, 0.15)" : "transparent",
                      color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Files Presentation */}
          <div style={{ marginTop: "1rem" }}>
            {loadingDocs ? (
              <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
                Loading documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "rgba(255,255,255,0.01)", borderRadius: "12px", border: "1px dashed var(--glass-border)" }}>
                <FiFolder style={{ fontSize: "2rem", color: "var(--text-muted)", marginBottom: "8px" }} />
                <h5 style={{ margin: "0 0 4px 0", color: "var(--text-primary)" }}>No Documents Match Filter</h5>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {docSearch ? `No records found matching "${docSearch}"` : `No records under "${docCategoryFilter}".`}
                </p>
              </div>
            ) : docViewMode === "grid" ? (
              /* Modern Grid Card View */
              <div className="doc-cards-grid">
                {filteredDocuments.map(doc => {
                  const meta = getDocTypeIcon(doc.fileName || doc.fileUrl, doc.type);
                  return (
                    <div key={doc.id} className="doc-item-card">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: meta.bg,
                            color: meta.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                            flexShrink: 0
                          }}
                        >
                          {meta.icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong
                            style={{
                              display: "block",
                              color: "var(--text-primary)",
                              fontSize: "0.9rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                            title={doc.name}
                          >
                            {doc.name || "Untitled"}
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.fileName || "file"}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <span className={`status-badge ${getCategoryBadgeClass(doc.type)}`} style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                          {doc.type}
                        </span>
                        <span>{doc.fileSize || "—"}</span>
                      </div>

                      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="btn-action"
                          style={{ flex: 1, padding: "6px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                        >
                          <FiEye size={13} /> View
                        </button>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="btn-action"
                          style={{ flex: 1, padding: "6px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px", textDecoration: "none" }}
                        >
                          <FiDownload size={13} /> Download
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="btn-action resolve"
                          style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
                          title="Delete Document"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Clean Table View */
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Category</th>
                      <th>Size</th>
                      <th>Date</th>
                      <th>Uploader</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "1.2rem" }}>{getDocTypeIcon(doc.fileName).icon}</span>
                            <div>
                              <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "0.88rem" }}>{doc.name}</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{doc.fileName}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getCategoryBadgeClass(doc.type)}`} style={{ fontSize: "0.72rem" }}>
                            {doc.type}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{doc.fileSize || "—"}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{doc.uploadedBy || "Admin"}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button onClick={() => setPreviewDoc(doc)} className="btn-action" style={{ padding: "5px 9px", fontSize: "0.75rem" }}>
                              <FiEye /> View
                            </button>
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" download className="btn-action" style={{ padding: "5px 9px", fontSize: "0.75rem", textDecoration: "none" }}>
                              <FiDownload /> Download
                            </a>
                            <button onClick={() => handleDeleteDocument(doc)} className="btn-action resolve" style={{ padding: "5px 7px", color: "#ef4444" }}>
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ASSIGNED HARDWARE */}
      {(activeTab === "hardware" || activeTab === "overview") && (
        <div className="panel-card" style={{ marginBottom: "2rem" }}>
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FiMonitor style={{ color: "var(--accent-cyan)" }} /> Assigned Devices ({assignedSystems.length})
            </span>
            <span className="timer-badge" style={{ color: "var(--accent-cyan)" }}>
              {assignedSystems.length} Unit{assignedSystems.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="table-wrapper desktop-only-table">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>System Asset ID</th>
                  <th>Status</th>
                  <th>Specifications</th>
                  <th>IP Address</th>
                  <th>Location / Dept</th>
                </tr>
              </thead>
              <tbody>
                {assignedSystems.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      No devices currently assigned to this team member.
                    </td>
                  </tr>
                ) : (
                  assignedSystems.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>
                        <Link href={`/admin/systems/${encodeURIComponent(s.systemNumber || s.id)}`} style={{ color: "inherit", textDecoration: "underline" }}>
                          {s.systemNumber}
                        </Link>
                      </td>
                      <td>
                        <span className={`status-tag ${(s.status || "active").toLowerCase().replace(" ", "")}`}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>{s.ram || "—"} • {s.os || "—"}</td>
                      <td style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "var(--text-muted)" }}>{s.ipAddress || "Dynamic"}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{s.department || "Office Floor"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-list mobile-only-cards">
            {assignedSystems.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>No devices assigned.</p>
            ) : (
              assignedSystems.map(s => (
                <div key={s.id} className="mobile-item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "var(--accent-cyan)", fontSize: "0.95rem" }}>{s.systemNumber}</strong>
                    <span className={`status-tag ${(s.status || "active").toLowerCase().replace(" ", "")}`}>
                      {s.status}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{s.ram || "Standard RAM"} • {s.os || "OS Standard"}</span>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <span>IP: {s.ipAddress || "DHCP"}</span>
                    <span>{s.department || "HQ"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TASKS */}
      {(activeTab === "tasks" || activeTab === "overview") && (
        <div className="panel-card" style={{ marginBottom: "2rem" }}>
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FiCheckSquare style={{ color: "var(--accent-purple)" }} /> Task Activity & Assignments ({userTasks.length})
            </span>
            <span className="timer-badge" style={{ color: "#8b5cf6", borderColor: "rgba(139, 92, 246, 0.4)" }}>
              {completedTasks} of {userTasks.length} Completed
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="table-wrapper desktop-only-table">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Status</th>
                  <th>Assigned Date</th>
                  <th>Completed Date</th>
                  <th>Assigned By</th>
                </tr>
              </thead>
              <tbody>
                {userTasks.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      No tasks assigned yet.
                    </td>
                  </tr>
                ) : (
                  userTasks.slice(0, 10).map(t => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.title}</strong>
                        {t.description && (
                          <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.description}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge badge-${t.status === "Completed" ? "resolved" : t.status === "In Progress" ? "progress" : "open"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        {t.assignedByName || "System"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-list mobile-only-cards">
            {userTasks.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>No tasks assigned.</p>
            ) : (
              userTasks.slice(0, 8).map(t => (
                <div key={t.id} className="mobile-item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{t.title}</strong>
                    <span className={`status-badge badge-${t.status === "Completed" ? "resolved" : t.status === "In Progress" ? "progress" : "open"}`} style={{ fontSize: "0.7rem" }}>
                      {t.status}
                    </span>
                  </div>
                  {t.description && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                      {t.description}
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    <span>Assigned: {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</span>
                    <span>By: {t.assignedByName || "TL"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TICKETS & COMPLAINTS */}
      {(activeTab === "tickets" || activeTab === "overview") && (
        <div className="panel-card" style={{ marginBottom: "2rem" }}>
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FiAlertCircle style={{ color: "var(--status-open)" }} /> Complaint & Ticket History ({userTickets.length})
            </span>
            {userTickets.length > 0 && (
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Page {safeTicketPage} of {totalTicketPages}
              </span>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="table-wrapper desktop-only-table">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Date Raised</th>
                </tr>
              </thead>
              <tbody>
                {userTickets.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      No tickets on record for this user.
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map(ticket => (
                    <tr key={ticket.id}>
                      <td style={{ fontSize: "0.82rem", fontFamily: "monospace", color: "var(--text-muted)" }}>{ticket.id}</td>
                      <td><strong>{ticket.category}</strong></td>
                      <td><span className={`status-tag ${ticket.severity?.toLowerCase()}`}>{ticket.severity}</span></td>
                      <td><span className={`status-tag ${ticket.status?.toLowerCase().replace(" ", "")}`}>{ticket.status}</span></td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-list mobile-only-cards">
            {userTickets.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>No tickets recorded.</p>
            ) : (
              paginatedTickets.map(ticket => (
                <div key={ticket.id} className="mobile-item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-muted)" }}>{ticket.id}</span>
                    <span className={`status-tag ${ticket.status?.toLowerCase().replace(" ", "")}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{ticket.category}</strong>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span className={`status-tag ${ticket.severity?.toLowerCase()}`} style={{ fontSize: "0.7rem" }}>
                      {ticket.severity}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={safeTicketPage}
            totalPages={totalTicketPages}
            totalItems={userTickets.length}
            pageSize={ticketPageSize}
            onPageChange={setTicketPage}
            onPageSizeChange={(newSize) => {
              setTicketPageSize(newSize);
              setTicketPage(1);
            }}
            pageSizeOptions={[5, 10, 20]}
            itemName="tickets"
          />
        </div>
      )}

      {/* TAB CONTENT: ASSIGNMENT HISTORY LOG */}
      {(activeTab === "history" || (activeTab === "overview" && userLogs.length > 0)) && (
        <div className="panel-card" style={{ marginBottom: "2rem" }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FiClock style={{ color: "var(--accent-cyan)" }} /> Assignment & Asset History ({userLogs.length})
            </span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action / Event</th>
                  <th>Device Assigned</th>
                  <th>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {userLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                      No assignment logs found.
                    </td>
                  </tr>
                ) : (
                  userLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                      </td>
                      <td><strong>{log.action || "Hardware Allocation"}</strong></td>
                      <td style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{log.systemNumber || "—"}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{log.assignedBy || "Admin"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: UPLOAD TEAM MEMBER DOCUMENT ================= */}
      {showDocModal && (
        <div
          className="modal-overlay active"
          onClick={() => setShowDocModal(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "540px", width: "100%", borderRadius: "18px", padding: "1.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: "1rem" }}>
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.2rem" }}>
                <FiUploadCloud style={{ color: "var(--accent-cyan)" }} /> Upload Document
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDocModal(false)}
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleDocumentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Document Category <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={docForm.type}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setDocForm(prev => ({
                      ...prev,
                      type: cat,
                      name: prev.name && prev.name !== prev.type ? prev.name : cat.split(" / ")[0]
                    }));
                  }}
                  className="form-control"
                  style={{ width: "100%", borderRadius: "8px", padding: "9px 12px" }}
                  required
                >
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Document Title / Label <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aadhaar Card, B.Tech Degree, Offer Letter"
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  className="form-control"
                  style={{ width: "100%", borderRadius: "8px", padding: "9px 12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Select File <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div
                  style={{
                    border: "2px dashed var(--glass-border)",
                    borderRadius: "14px",
                    padding: "1.75rem 1rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: docForm.file ? "rgba(6, 182, 212, 0.05)" : "rgba(255, 255, 255, 0.01)",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => document.getElementById("admin-user-doc-file-input")?.click()}
                >
                  <input
                    id="admin-user-doc-file-input"
                    type="file"
                    style={{ display: "none" }}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDocForm(prev => ({
                          ...prev,
                          file,
                          name: prev.name.trim() ? prev.name : file.name.replace(/\.[^/.]+$/, "")
                        }));
                      }
                    }}
                  />
                  {docForm.file ? (
                    <div>
                      <div style={{ fontSize: "2rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                        <FiFileText />
                      </div>
                      <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "0.92rem", wordBreak: "break-all" }}>
                        {docForm.file.name}
                      </strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px", display: "inline-block" }}>
                        {(docForm.file.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "2.2rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                        <FiUploadCloud />
                      </div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 600 }}>
                        Click to browse or drag file here
                      </p>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Supported formats: PDF, PNG, JPG, DOC, DOCX, ZIP (Max 100MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="btn-primary"
                  style={{
                    flex: "1 1 180px",
                    padding: "11px",
                    borderRadius: "10px",
                    fontWeight: 600,
                    cursor: uploadingDoc ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {uploadingDoc ? (
                    <>
                      <span className="spinner" style={{ width: "16px", height: "16px" }} /> Uploading...
                    </>
                  ) : (
                    <>
                      <FiUploadCloud /> Upload & Save Document
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="btn-secondary"
                  style={{ flex: "1 1 100px", padding: "11px", borderRadius: "10px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PREVIEW DOCUMENT LIGHTBOX ================= */}
      {previewDoc && (
        <div
          className="modal-overlay active"
          onClick={() => setPreviewDoc(null)}
          style={{ zIndex: 9999, padding: "clamp(8px, 2vw, 24px)" }}
        >
          <div
            className="modal-card doc-preview-card"
            style={{
              maxWidth: "960px",
              width: "100%",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
              borderRadius: "18px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div
              style={{
                padding: "0.9rem 1.4rem",
                borderBottom: "1px solid var(--glass-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                background: "var(--bg-secondary)"
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <h4
                  style={{
                    margin: 0,
                    color: "var(--text-primary)",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                  title={previewDoc.name}
                >
                  {previewDoc.name}
                </h4>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{previewDoc.type}</span>
                  {previewDoc.fileName && (
                    <>
                      <span>•</span>
                      <span style={{ opacity: 0.9 }}>{previewDoc.fileName}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.82rem",
                      padding: "6px 12px",
                      textDecoration: "none",
                      borderRadius: "8px"
                    }}
                  >
                    <FiDownload /> Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="modal-close"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--text-primary)"
                  }}
                  title="Close preview"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div
              style={{
                flex: 1,
                padding: "1rem",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "320px",
                maxHeight: "calc(92vh - 75px)",
                background: "var(--bg-card)"
              }}
            >
              {previewDoc.fileUrl && previewDoc.fileUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.fileUrl}
                  style={{
                    width: "100%",
                    height: "min(72vh, 650px)",
                    minHeight: "350px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#ffffff"
                  }}
                  title={previewDoc.name}
                />
              ) : previewDoc.fileUrl && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(previewDoc.fileUrl) ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem" }}>
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "min(72vh, 600px)",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", maxWidth: "460px", margin: "0 auto" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "16px",
                      background: "rgba(6, 182, 212, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.25rem auto",
                      color: "var(--accent-cyan)",
                      fontSize: "2rem"
                    }}
                  >
                    <FiFileText />
                  </div>
                  <h5 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    {previewDoc.name}
                  </h5>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
                    This document format ({previewDoc.type || "file"}) cannot be previewed directly in the inline viewer. Please download the file to inspect its full contents.
                  </p>
                  {previewDoc.fileUrl && (
                    <a
                      href={previewDoc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="btn-primary"
                      style={{
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        borderRadius: "10px",
                        fontWeight: 600,
                        fontSize: "0.9rem"
                      }}
                    >
                      <FiDownload /> Download Document File
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Employment & Tenancy Dates */}
      {showDateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "var(--bg-card, #161b22)",
              padding: "1.75rem",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.6)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiCalendar style={{ color: "var(--accent-cyan)" }} /> Employment & Tenancy Dates
              </h3>
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.2rem", cursor: "pointer", padding: "4px" }}
              >
                <FiX />
              </button>
            </div>

            <p style={{ margin: "0 0 1.25rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Manage employment joining date and leaving status for <strong>{employee?.name}</strong>.
            </p>

            <form onSubmit={handleSaveDates} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Joining Date (Member Since)
                </label>
                <input
                  type="date"
                  value={dateForm.joining_date}
                  onChange={(e) => setDateForm({ ...dateForm, joining_date: e.target.value })}
                  className="form-control"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  The date this member joined or was registered.
                </span>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
                    Leaving Date
                  </label>
                  {dateForm.leaving_date && (
                    <button
                      type="button"
                      onClick={() => setDateForm({ ...dateForm, leaving_date: "", status: "Active" })}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--accent-cyan)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0
                      }}
                    >
                      Clear Date (Currently Working)
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={dateForm.leaving_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDateForm({
                      ...dateForm,
                      leaving_date: val,
                      status: val ? (new Date(val) <= new Date() ? "Inactive" : dateForm.status) : "Active"
                    });
                  }}
                  className="form-control"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  {dateForm.leaving_date
                    ? "Leaving date is set. Account marked with departure record."
                    : "Leave blank if currently working (No leaving date)."}
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Account Status
                </label>
                <select
                  value={dateForm.status}
                  onChange={(e) => setDateForm({ ...dateForm, status: e.target.value })}
                  className="form-control"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px" }}
                >
                  <option value="Active">Active (Currently Employed)</option>
                  <option value="Inactive">Inactive (Relieved / Left)</option>
                  <option value="Paused">Paused (Suspended)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingDates}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 600, display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                >
                  <FiCheck /> {savingDates ? "Saving..." : "Save Employment Dates"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDateModal(false)}
                  className="btn-secondary"
                  style={{ padding: "10px 18px", borderRadius: "8px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
