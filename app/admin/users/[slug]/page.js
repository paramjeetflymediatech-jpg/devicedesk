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
  FiAlertCircle
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

  const fetchDocs = async (empId) => {
    try {
      setLoadingDocs(true);
      const res = await fetch(`/api/employees/${empId}/documents`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDocuments(data.data);
      }
    } catch (err) {
      console.error("Error loading employee documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    try {
      const allEmployees = getEmployees();
      const emp = findEmployeeBySlug(allEmployees, slug);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmployee(emp || null);

      if (emp) {
        const allSystems = getSystems();
        const allTickets = getTickets();
        const allTasks = getTasks();
        const allLogs = getAssignmentHistory();

        setAssignedSystems(allSystems.filter(s => s.assignedTo === emp.id));
        const empTickets = allTickets.filter(t => t.employeeId === emp.id || t.raisedBy === emp.id);
        empTickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setUserTickets(empTickets);
        setTicketPage(1);
        setUserTasks(allTasks.filter(t => t.assignedTo === emp.id));
        setUserLogs(allLogs.filter(h => h.employeeId === emp.id));

        // Load documents
        fetchDocs(emp.id);
      }
    } catch (err) {
      console.error("Error loading user details:", err);
    } finally {
      setLoadingDocs(false);
      setLoading(false);
    }
  }, [slug]);

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

  if (loading) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading team member profile...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page-container" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <button onClick={() => router.push("/admin/users")} className="btn-secondary" style={{ marginBottom: "1.5rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <FiArrowLeft /> Back to Team Directory
        </button>
        <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "2rem", textAlign: "center" }}>
          <h2 style={{ color: "var(--status-critical)", marginBottom: "0.5rem" }}>Team Member Not Found</h2>
          <p style={{ color: "var(--text-secondary)" }}>No team member matching the slug &quot;<strong>{slug}</strong>&quot; was found.</p>
        </div>
      </div>
    );
  }

  const userSlug = getEmployeeSlug(employee);
  const completedTasks = userTasks.filter(t => t.status === "Completed").length;
  const pendingTasks = userTasks.length - completedTasks;
  const taskCompletionRate = userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0;

  // Ticket pagination calculations
  const totalTicketPages = Math.max(1, Math.ceil(userTickets.length / ticketPageSize));
  const safeTicketPage = Math.min(Math.max(1, ticketPage), totalTicketPages);
  const paginatedTickets = userTickets.slice((safeTicketPage - 1) * ticketPageSize, safeTicketPage * ticketPageSize);

  return (
    <div className="page-container" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header & Back Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <button
          onClick={() => router.push("/admin/users")}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
        >
          <FiArrowLeft /> Back to Team Directory
        </button>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="timer-badge" style={{ color: "var(--accent-purple)", borderColor: "rgba(139, 92, 246, 0.4)" }}>
            Slug: {userSlug}
          </span>
          <span className={`status-badge badge-${employee.status === "Paused" ? "open" : "resolved"}`}>
            {employee.status || "Active"}
          </span>
        </div>
      </div>

      {/* User Hero Banner */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "2rem",
          marginBottom: "2rem",
          display: "flex",
          gap: "2rem",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            color: "#fff",
            fontWeight: "bold"
          }}
        >
          {employee.name ? employee.name[0].toUpperCase() : "U"}
        </div>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <h1 style={{ margin: 0, fontSize: "1.8rem", color: "var(--text-primary)" }}>{employee.name}</h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {employee.role} • <span style={{ color: "var(--accent-cyan)" }}>{employee.department}</span>
          </p>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "12px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <span>📧 {employee.email || "No email"}</span>
            <span>📱 ID: {employee.id}</span>
            <span>🎫 Ticket Limit: {employee.ticketLimit || 5}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <span className="stat-label">Assigned Devices</span>
          <span className="stat-value">{assignedSystems.length}</span>
        </div>
        <div className="stat-card purple">
          <span className="stat-label">Total Tasks</span>
          <span className="stat-value">{userTasks.length}</span>
        </div>
        <div className="stat-card green">
          <span className="stat-label">Completed Tasks</span>
          <span className="stat-value">{completedTasks} ({taskCompletionRate}%)</span>
        </div>
        <div className="stat-card orange">
          <span className="stat-label">Tickets Raised</span>
          <span className="stat-value">{userTickets.length}</span>
        </div>
        <div className="stat-card" style={{ borderColor: "rgba(6, 182, 212, 0.4)", background: "rgba(6, 182, 212, 0.03)" }}>
          <span className="stat-label" style={{ color: "var(--accent-cyan)" }}>📁 Uploaded Documents</span>
          <span className="stat-value" style={{ color: "var(--accent-cyan)" }}>{documents.length}</span>
        </div>
      </div>

      {/* Team Member Documents & Verification Section */}
      <div className="panel-card" style={{ marginBottom: "2rem" }}>
        <div
          className="panel-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--glass-border)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span className="panel-title" style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <FiFolder style={{ color: "var(--accent-cyan)", fontSize: "1.3rem" }} />
              Team Member Documents & Verification
            </span>
            <span className="timer-badge" style={{ color: "var(--accent-cyan)", borderColor: "rgba(6, 182, 212, 0.4)" }}>
              {documents.length} File{documents.length === 1 ? "" : "s"}
            </span>
          </div>

          <button
            onClick={() => handleOpenAddDocModal("Resume / CV")}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "8px 16px" }}
          >
            <FiPlus /> Upload Document
          </button>
        </div>

        {/* Quick Document Status Checklist */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            padding: "1rem 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)"
          }}
        >
          {(() => {
            const hasResume = documents.some(d => (d.type || "").toLowerCase().includes("resume") || (d.type || "").toLowerCase().includes("cv"));
            const hasIdProof = documents.some(d => (d.type || "").toLowerCase().includes("id proof") || (d.type || "").toLowerCase().includes("government"));
            const hasAddressProof = documents.some(d => (d.type || "").toLowerCase().includes("address"));
            const hasOfferLetter = documents.some(d => (d.type || "").toLowerCase().includes("offer") || (d.type || "").toLowerCase().includes("appointment"));

            const resumeDoc = documents.find(d => (d.type || "").toLowerCase().includes("resume") || (d.type || "").toLowerCase().includes("cv"));
            const idDoc = documents.find(d => (d.type || "").toLowerCase().includes("id proof") || (d.type || "").toLowerCase().includes("government"));
            const addressDoc = documents.find(d => (d.type || "").toLowerCase().includes("address"));
            const offerDoc = documents.find(d => (d.type || "").toLowerCase().includes("offer") || (d.type || "").toLowerCase().includes("appointment"));

            return (
              <>
                {hasResume ? (
                  <button
                    onClick={() => setPreviewDoc(resumeDoc)}
                    className="status-badge badge-resolved"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                    title="Click to view attached Resume"
                  >
                    <FiCheck /> Resume Attached
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenAddDocModal("Resume / CV")}
                    style={{
                      background: "rgba(239, 68, 68, 0.06)",
                      border: "1px dashed rgba(239, 68, 68, 0.4)",
                      color: "#f87171",
                      borderRadius: "20px",
                      padding: "6px 12px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <FiPlus /> Add Resume
                  </button>
                )}

                {hasIdProof ? (
                  <button
                    onClick={() => setPreviewDoc(idDoc)}
                    className="status-badge badge-resolved"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                    title="Click to view attached ID Proof"
                  >
                    <FiCheck /> ID Proof Verified
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenAddDocModal("Government ID Proof")}
                    style={{
                      background: "rgba(239, 68, 68, 0.06)",
                      border: "1px dashed rgba(239, 68, 68, 0.4)",
                      color: "#f87171",
                      borderRadius: "20px",
                      padding: "6px 12px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <FiPlus /> Add ID Proof
                  </button>
                )}

                {hasAddressProof ? (
                  <button
                    onClick={() => setPreviewDoc(addressDoc)}
                    className="status-badge badge-resolved"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                    title="Click to view Address Proof"
                  >
                    <FiCheck /> Address Proof Attached
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenAddDocModal("Address Proof")}
                    style={{
                      background: "rgba(148, 163, 184, 0.1)",
                      border: "1px dashed rgba(148, 163, 184, 0.3)",
                      color: "var(--text-secondary)",
                      borderRadius: "20px",
                      padding: "6px 12px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <FiPlus /> Add Address Proof
                  </button>
                )}

                {hasOfferLetter ? (
                  <button
                    onClick={() => setPreviewDoc(offerDoc)}
                    className="status-badge badge-resolved"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                    title="Click to view Offer Letter"
                  >
                    <FiCheck /> Offer Letter Attached
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenAddDocModal("Offer / Appointment Letter")}
                    style={{
                      background: "rgba(148, 163, 184, 0.1)",
                      border: "1px dashed rgba(148, 163, 184, 0.3)",
                      color: "var(--text-secondary)",
                      borderRadius: "20px",
                      padding: "6px 12px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <FiPlus /> Add Offer Letter
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Category Filters */}
        {documents.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", padding: "1rem 0" }}>
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
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: active ? "1px solid var(--accent-cyan)" : "1px solid var(--glass-border)",
                    background: active ? "rgba(6, 182, 212, 0.15)" : "transparent",
                    color: active ? "var(--accent-cyan)" : "var(--text-secondary)"
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Documents Table / Grid */}
        <div className="table-wrapper" style={{ marginTop: "0.5rem" }}>
          {loadingDocs ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                background: "rgba(255, 255, 255, 0.01)",
                borderRadius: "12px",
                border: "1px dashed var(--glass-border)"
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(6, 182, 212, 0.1)",
                  color: "var(--accent-cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  margin: "0 auto 1rem auto"
                }}
              >
                <FiFolder />
              </div>
              <h4 style={{ margin: "0 0 6px 0", color: "var(--text-primary)", fontSize: "1.1rem" }}>
                No Documents Uploaded Yet
              </h4>
              <p style={{ margin: "0 0 1.5rem 0", color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                Upload official identity records, resume, signed offer letters, or education certificates for {employee.name}.
              </p>
              <button
                onClick={() => handleOpenAddDocModal("Resume / CV")}
                className="btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "8px 18px" }}
              >
                <FiUploadCloud /> Upload First Document
              </button>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Category</th>
                  <th>File Details</th>
                  <th>Uploaded Date</th>
                  <th>Uploaded By</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents
                  .filter(d => {
                    if (docCategoryFilter === "All") return true;
                    return (d.type || "").toLowerCase().includes(docCategoryFilter.toLowerCase().split(" / ")[0]);
                  })
                  .map(doc => {
                    const isPdf = (doc.fileName || doc.fileUrl || "").toLowerCase().endsWith(".pdf");
                    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileName || doc.fileUrl || "");

                    return (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                background: isPdf ? "rgba(239, 68, 68, 0.15)" : isImg ? "rgba(139, 92, 246, 0.15)" : "rgba(6, 182, 212, 0.15)",
                                color: isPdf ? "#ef4444" : isImg ? "#8b5cf6" : "#06b6d4",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1rem",
                                flexShrink: 0
                              }}
                            >
                              <FiFileText />
                            </span>
                            <div>
                              <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                                {doc.name || "Untitled"}
                              </strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {doc.fileName || "file"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getCategoryBadgeClass(doc.type)}`}>
                            {doc.type || "Document"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {doc.fileSize || "—"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          }) : "—"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {doc.uploadedBy || "Admin"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="btn-action"
                              style={{ padding: "6px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              title="Preview Document"
                            >
                              <FiEye /> View
                            </button>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="btn-action"
                              style={{ padding: "6px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
                              title="Download Document"
                            >
                              <FiDownload /> Download
                            </a>
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="btn-action resolve"
                              style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
                              title="Delete Document"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Split Details Section */}
      <div className="dashboard-split" style={{ marginBottom: "2rem" }}>
        {/* Assigned Hardware */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">🖥️ Assigned Devices ({assignedSystems.length})</span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>System Number</th>
                  <th>Status</th>
                  <th>Specs (RAM / OS)</th>
                </tr>
              </thead>
              <tbody>
                {assignedSystems.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                      No devices currently assigned.
                    </td>
                  </tr>
                ) : (
                  assignedSystems.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{s.systemNumber}</td>
                      <td>
                        <span className={`status-tag ${s.status.toLowerCase().replace(" ", "")}`}>{s.status}</span>
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>{s.ram || "—"} • {s.os || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">📋 Task Activity ({userTasks.length})</span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {userTasks.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                      No tasks assigned yet.
                    </td>
                  </tr>
                ) : (
                  userTasks.slice(0, 5).map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.title}</strong></td>
                      <td>
                        <span className={`status-badge badge-${t.status === "Completed" ? "resolved" : t.status === "In Progress" ? "progress" : "open"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket History */}
      <div className="panel-card">
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span className="panel-title">🎫 Complaint & Ticket History ({userTickets.length})</span>
          {userTickets.length > 0 && (
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Page {safeTicketPage} of {totalTicketPages}
            </span>
          )}
        </div>
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {userTickets.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                    No tickets on record.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ticket.id}</td>
                    <td>{ticket.category}</td>
                    <td><span className={`status-tag ${ticket.severity?.toLowerCase()}`}>{ticket.severity}</span></td>
                    <td><span className={`status-tag ${ticket.status?.toLowerCase().replace(" ", "")}`}>{ticket.status}</span></td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="tickets"
        />
      </div>

      {/* ================= MODAL: UPLOAD TEAM MEMBER DOCUMENT ================= */}
      {showDocModal && (
        <div
          className="modal-overlay active"
          onClick={() => setShowDocModal(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "540px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  style={{ width: "100%" }}
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
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Select File <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div
                  style={{
                    border: "2px dashed var(--glass-border)",
                    borderRadius: "12px",
                    padding: "1.5rem 1rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: docForm.file ? "rgba(6, 182, 212, 0.05)" : "rgba(255, 255, 255, 0.01)"
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
                      <div style={{ fontSize: "1.8rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                        <FiFileText />
                      </div>
                      <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "0.9rem", wordBreak: "break-all" }}>
                        {docForm.file.name}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {(docForm.file.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "2rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                        <FiUploadCloud />
                      </div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
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
                    borderRadius: "8px",
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
                  style={{ flex: "1 1 100px", padding: "11px", borderRadius: "8px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PREVIEW DOCUMENT ================= */}
      {previewDoc && (
        <div
          className="modal-overlay active"
          onClick={() => setPreviewDoc(null)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-card doc-preview-card"
            style={{
              maxWidth: "920px",
              width: "100%",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div
              style={{
                padding: "0.85rem 1.25rem",
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
                minHeight: "300px",
                maxHeight: "calc(92vh - 75px)",
                background: "var(--bg-card)"
              }}
            >
              {previewDoc.fileUrl && previewDoc.fileUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.fileUrl}
                  style={{
                    width: "100%",
                    height: "min(70vh, 600px)",
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
                      maxHeight: "min(70vh, 550px)",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 1rem", maxWidth: "460px", margin: "0 auto" }}>
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
                  <h5
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem"
                    }}
                  >
                    {previewDoc.name}
                  </h5>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      lineHeight: "1.5",
                      marginBottom: "1.5rem"
                    }}
                  >
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
    </div>
  );
}
