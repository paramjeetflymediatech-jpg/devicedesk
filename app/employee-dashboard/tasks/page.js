"use client";

import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { useAuth } from "../../auth/AuthContext";
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  startTask,
  stopTask,
  completeTask,
  getSystems,
  getTickets,
  getAssignmentHistory,
  isSoundEnabled
} from "../../store";

export default function TaskBoardPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [now, setNow] = useState(Date.now());

  // Performance report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  // Self Task States
  const [showSelfTaskModal, setShowSelfTaskModal] = useState(false);
  const [selfTaskTitle, setSelfTaskTitle] = useState("");
  const [selfTaskDesc, setSelfTaskDesc] = useState("");

  // Edit Task States
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("Pending");
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);

  // View Task Details States
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);

  // Sound play helper
  const audioCtxRef = useRef(null);
  const soundOn = typeof window !== "undefined" ? isSoundEnabled() : false;

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

  const refreshData = () => {
    setTasks(getTasks());
    setSystems(getSystems());
    setTickets(getTickets());
    setAssignmentHistory(getAssignmentHistory());
  };

  useEffect(() => {
    setMounted(true);
    refreshData();

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for database changes to keep sync
  useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener("devicedesk_db_synced", handleSync);
    return () => window.removeEventListener("devicedesk_db_synced", handleSync);
  }, []);

  if (!mounted || !user) return null;

  const handleOpenReportModal = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setReportFrom(thirtyDaysAgo.toISOString().split("T")[0]);
    setReportTo(today.toISOString().split("T")[0]);
    setShowReportModal(true);
  };

  const handleCreateSelfTaskSubmit = (e) => {
    e.preventDefault();
    if (!selfTaskTitle.trim()) {
      Swal.fire({ icon: "warning", title: "Validation", text: "Task title is required." });
      return;
    }

    addTask({
      title: selfTaskTitle,
      description: selfTaskDesc,
      assignedTo: user?.id,
      assignedToName: user?.name || "Employee",
      assignedBy: user?.id,
      assignedByName: user?.name || "Employee"
    });

    setShowSelfTaskModal(false);
    setSelfTaskTitle("");
    setSelfTaskDesc("");
    refreshData();
    playBeep(900, 0.1);
    Swal.fire({ icon: "success", title: "Created", text: "Task successfully created for yourself!" });
  };

  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      Swal.fire({ icon: "warning", title: "Validation", text: "Task title is required." });
      return;
    }

    const updatedTask = {
      ...editingTask,
      title: editTaskTitle.trim(),
      description: editTaskDesc.trim(),
      status: editTaskStatus
    };

    if (editTaskStatus === "Completed" && editingTask.status !== "Completed") {
      updatedTask.completedAt = new Date().toISOString();
    } else if (editTaskStatus !== "Completed") {
      updatedTask.completedAt = null;
    }

    updateTask(updatedTask, user?.name || "Employee");
    setShowEditTaskModal(false);
    setEditingTask(null);
    refreshData();
    playBeep(800, 0.1);
    Swal.fire({ icon: "success", title: "Updated", text: "Task successfully updated!" });
  };

  const handleDeleteSelfTask = (taskId, taskTitle) => {
    Swal.fire({
      title: `Delete Task?`,
      text: `Are you sure you want to delete task "${taskTitle}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#dc2626"
    }).then((result) => {
      if (result.isConfirmed) {
        deleteTask(taskId, user?.name || "Employee");
        refreshData();
        playBeep(400, 0.15, "sawtooth");
        Swal.fire("Deleted!", `Task "${taskTitle}" has been deleted.`, "success");
      }
    });
  };

  const handleDownloadReport = (fromDate, toDate) => {
    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;

    const userId = user?.id || "";
    const empLogs = assignmentHistory.filter((h) => {
      if (h.employeeId !== userId) return false;
      if (!h.timestamp) return false;
      const ts = new Date(h.timestamp);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const empTickets = tickets.filter((t) => {
      const matchEmp = t.raisedBy === userId || t.employeeId === userId;
      if (!matchEmp) return false;
      if (!t.createdAt) return false;
      const ts = new Date(t.createdAt);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const empTasks = tasks.filter((t) => {
      if (t.assignedTo !== userId) return false;
      if (!t.createdAt) return false;
      const ts = new Date(t.createdAt);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });

    const csvRows = [];
    csvRows.push(`MY PERFORMANCE & ACTIVITY REPORT,${user?.name || "Employee"}`);
    csvRows.push(`Role,${user?.role || "Team Member"}`);
    csvRows.push(`Report Range,${fromDate || "Start"} to ${toDate || "End"}`);
    csvRows.push("");

    csvRows.push("CURRENT ASSIGNED DEVICES");
    csvRows.push("System ID,System Number,Model,OS,Status");
    const currentDevices = systems.filter((s) => s.assignedTo === userId);
    currentDevices.forEach((s) => {
      csvRows.push(`${s.id},${s.systemNumber},${s.model || "N/A"},${s.os || "N/A"},${s.status || "Active"}`);
    });
    csvRows.push("");

    csvRows.push("DEVICE TRANSFER & ASSIGNMENT LOGS (IN RANGE)");
    csvRows.push("Log ID,Action,System Number,Timestamp,Assigned By");
    empLogs.forEach((log) => {
      csvRows.push(`${log.id},${log.action},${log.systemNumber},${new Date(log.timestamp).toLocaleString()},${log.assignedBy || "System"}`);
    });
    csvRows.push("");

    csvRows.push("ISSUES AND COMPLAINTS BOARD (IN RANGE)");
    csvRows.push("Ticket ID,Category,Description,Severity,Status,Created At,Resolved At,Notes");
    empTickets.forEach((t) => {
      const descEscaped = t.description ? `"${t.description.replace(/"/g, '""')}"` : "";
      const notesEscaped = t.resolutionRemarks || t.notes ? `"${(t.resolutionRemarks || t.notes).replace(/"/g, '""')}"` : "";
      csvRows.push(`${t.id},${t.category},${descEscaped},${t.severity},${t.status},${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : ""},${notesEscaped}`);
    });
    csvRows.push("");

    csvRows.push("ASSIGNED TASKS (IN RANGE)");
    csvRows.push("Task ID,Title,Description,Status,Created At,Started At,Completed At,Duration (mins)");
    empTasks.forEach((t) => {
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
      title: "Confirm Completion",
      text: `Are you sure you want to mark the task "${title}" as completed?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Complete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "var(--status-resolved)",
      cancelButtonColor: "#30363d",
      background: "#161b22",
      color: "#f0f6fc"
    });

    if (!confirm.isConfirmed) return;

    const { value: files } = await Swal.fire({
      title: "Upload Work Proof",
      html: `<div style="text-align: left; font-size: 0.9rem; color: #8b949e; margin-bottom: 10px;">
               <strong>Task:</strong> ${title}<br/>
               Upload files, images, or documents as proof (optional).
             </div>
             <input type="file" id="swal-multiple-files" class="swal2-file" multiple style="display: flex; margin: 15px auto;" />`,
      showCancelButton: true,
      confirmButtonText: "Complete Task ✅",
      confirmButtonColor: "var(--status-resolved)",
      cancelButtonColor: "#30363d",
      background: "#161b22",
      color: "#f0f6fc",
      preConfirm: () => {
        const fileInput = document.getElementById("swal-multiple-files");
        return fileInput ? Array.from(fileInput.files) : [];
      }
    });

    let fileUrl = null;
    if (files && files.length > 0) {
      Swal.fire({
        title: "Uploading files...",
        didOpen: () => {
          Swal.showLoading();
        },
        allowOutsideClick: false,
        background: "#161b22",
        color: "#f0f6fc"
      });

      try {
        const formData = new FormData();
        files.forEach((f) => {
          formData.append("files", f);
        });

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        fileUrl = JSON.stringify(data.fileUrls);
      } catch (err) {
        Swal.fire({ icon: "error", title: "Upload Failed", text: err.message, background: "#161b22", color: "#f0f6fc" });
        return;
      }
    }

    completeTask(taskId, user.name, fileUrl);
    refreshData();
    Swal.fire({
      icon: "success",
      title: "Completed",
      text: "Task marked as completed successfully!",
      background: "#161b22",
      color: "#f0f6fc"
    });
  };

  const userTasks = tasks.filter((t) => t.assignedTo === user.id);

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto" }}>
      <div className="container-card fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--accent-cyan)", margin: 0 }}>📅 My Task Board</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
              Manage and track your assigned work in real-time
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn-secondary"
              onClick={handleOpenReportModal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                background: "rgba(139, 92, 246, 0.15)",
                color: "var(--accent-purple)",
                borderColor: "var(--accent-purple)",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--accent-purple)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
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
          {userTasks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                background: "rgba(255,255,255,0.01)",
                borderRadius: "12px",
                border: "1px dashed var(--glass-border)"
              }}
            >
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
                  {userTasks
                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                    .map((t) => {
                      let displayDuration = t.totalDuration || 0;
                      if (t.status === "In Progress" && t.startedAt) {
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
                            <span
                              className={`status-badge badge-${
                                t.status === "In Progress" ? "progress" : t.status === "Completed" ? "resolved" : "open"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td style={{ fontFamily: "monospace", fontWeight: "600", color: "var(--accent-cyan)" }}>
                            {formatTime(displayDuration)}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "8px" }}>
                              {t.status === "Pending" && (
                                <button
                                  className="btn-action start"
                                  onClick={() => {
                                    startTask(t.id, user.name);
                                    refreshData();
                                  }}
                                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                  ▶️ Start
                                </button>
                              )}
                              {t.status === "In Progress" && (
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
                                    onClick={() => {
                                      stopTask(t.id, user.name);
                                      refreshData();
                                    }}
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
                              <button
                                className="btn-secondary"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.75rem",
                                  fontWeight: "500",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                                onClick={() => {
                                  setSelectedTaskDetails(t);
                                  setShowTaskDetailsModal(true);
                                }}
                              >
                                👁️ View
                              </button>
                              {t.status === "Completed" && (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                                  Done at {t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : "N/A"}
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

      {/* ================= MODAL: CREATE SELF TASK ================= */}
      {showSelfTaskModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">➕ Create Self Task</h3>
              <button className="modal-close" onClick={() => setShowSelfTaskModal(false)}>
                &times;
              </button>
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
                <button type="button" className="btn-secondary" onClick={() => setShowSelfTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SELF TASK ================= */}
      {showEditTaskModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Task Details</h3>
              <button className="modal-close" onClick={() => setShowEditTaskModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEditTaskSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input type="text" className="form-control" value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} required />
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
                <select className="form-control" value={editTaskStatus} onChange={(e) => setEditTaskStatus(e.target.value)} required>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MY PERFORMANCE & ACTIVITY REPORT ================= */}
      {showReportModal &&
        (() => {
          const from = reportFrom ? new Date(reportFrom + "T00:00:00") : null;
          const to = reportTo ? new Date(reportTo + "T23:59:59") : null;

          const currentDevices = systems.filter((s) => s.assignedTo === user.id);

          const empLogs = assignmentHistory.filter((h) => {
            if (h.employeeId !== user.id) return false;
            if (!h.timestamp) return false;
            const ts = new Date(h.timestamp);
            if (from && ts < from) return false;
            if (to && ts > to) return false;
            return true;
          });

          const empTickets = tickets.filter((t) => {
            const matchEmp = t.raisedBy === user.id || t.employeeId === user.id;
            if (!matchEmp) return false;
            if (!t.createdAt) return false;
            const ts = new Date(t.createdAt);
            if (from && ts < from) return false;
            if (to && ts > to) return false;
            return true;
          });

          const empTasks = tasks.filter((t) => {
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
                  <button className="modal-close" onClick={() => setShowReportModal(false)}>
                    &times;
                  </button>
                </div>

                {/* Employee Overview Info Banner */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    marginBottom: "15px",
                    padding: "10px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "8px"
                  }}
                >
                  <div>
                    <strong>Name:</strong> {user.name}
                  </div>
                  <div>
                    <strong>Role:</strong> {user.role || "Team Member"}
                  </div>
                  <div>
                    <strong>Email:</strong> {user.email || "N/A"}
                  </div>
                </div>

                {/* Date Filters & Download Button */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    alignItems: "flex-end",
                    marginBottom: "20px",
                    background: "rgba(255,255,255,0.01)",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border)"
                  }}
                >
                  <div style={{ flex: "1 1 180px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      From Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={reportFrom}
                      onChange={(e) => setReportFrom(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 180px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      To Date
                    </label>
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
                    <h4
                      style={{
                        color: "var(--accent-cyan)",
                        borderBottom: "1px solid var(--glass-border)",
                        paddingBottom: "6px",
                        marginBottom: "12px",
                        fontSize: "1rem"
                      }}
                    >
                      <span>🖥️ Current Assigned Devices ({currentDevices.length})</span>
                    </h4>
                    {currentDevices.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                        No devices currently assigned.
                      </p>
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
                            {currentDevices.map((s) => (
                              <tr key={s.id}>
                                <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{s.systemNumber}</td>
                                <td>{s.model || "Generic PC"}</td>
                                <td>{s.os || "Windows 11"}</td>
                                <td>
                                  {s.cpu} / {s.ram} / {s.storage}
                                </td>
                                <td>
                                  <span className={`status-tag ${s.status?.toLowerCase() === "active" ? "resolved" : "open"}`}>
                                    {s.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Device Assignment History Logs */}
                    <h5 style={{ marginTop: "12px", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Device Transfer Logs In Range ({empLogs.length})
                    </h5>
                    {empLogs.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                        No device assignment or transfer logs recorded for this period.
                      </p>
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
                            {empLogs.map((log) => (
                              <tr key={log.id}>
                                <td>
                                  <span className={`status-tag ${log.action.toLowerCase().includes("assign") ? "resolved" : "open"}`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td>
                                  <strong>{log.systemNumber}</strong>
                                </td>
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
                    <h4
                      style={{
                        color: "var(--accent-purple)",
                        borderBottom: "1px solid var(--glass-border)",
                        paddingBottom: "6px",
                        marginBottom: "12px",
                        fontSize: "1rem"
                      }}
                    >
                      📋 Issues & Complaints Raised In Range ({empTickets.length})
                    </h4>
                    {empTickets.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                        No issues or complaints registered by you during this period.
                      </p>
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
                            {empTickets.map((t) => (
                              <tr key={t.id}>
                                <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{t.id}</td>
                                <td>{t.category}</td>
                                <td
                                  style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                  title={t.description}
                                >
                                  {t.description}
                                </td>
                                <td>
                                  <span className={`status-tag ${t.severity.toLowerCase()}`}>{t.severity}</span>
                                </td>
                                <td>
                                  <span className={`status-tag ${t.status.toLowerCase().replace(" ", "")}`}>{t.status}</span>
                                </td>
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
                    <h4
                      style={{
                        color: "var(--accent-blue)",
                        borderBottom: "1px solid var(--glass-border)",
                        paddingBottom: "6px",
                        marginBottom: "12px",
                        fontSize: "1rem"
                      }}
                    >
                      📅 Assigned Tasks In Range ({empTasks.length})
                    </h4>
                    {empTasks.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                        No tasks assigned to you during this period.
                      </p>
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
                            {empTasks.map((t) => {
                              const durationMins = t.totalDuration ? Math.round(t.totalDuration / 60) : 0;
                              return (
                                <tr key={t.id}>
                                  <td>
                                    <strong>{t.title}</strong>
                                  </td>
                                  <td
                                    style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                    title={t.description}
                                  >
                                    {t.description || "—"}
                                  </td>
                                  <td>
                                    <span className={`status-tag ${t.status.toLowerCase().replace(" ", "")}`}>{t.status}</span>
                                  </td>
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

      {/* ================= MODAL: TASK DETAILS ================= */}
      {showTaskDetailsModal && selectedTaskDetails && (
        <div
          className={`modal-overlay ${showTaskDetailsModal ? "active" : ""}`}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: showTaskDetailsModal ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: "850px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRadius: "16px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div
              className="modal-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.2rem 1.5rem",
                borderBottom: "1px solid var(--glass-border)"
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                📂 Task Details & Proof Attachments
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowTaskDetailsModal(false);
                  setSelectedTaskDetails(null);
                }}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ flexGrow: 1, overflowY: "auto", padding: "1.5rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                  background: "rgba(255,255,255,0.02)",
                  padding: "1rem",
                  borderRadius: "10px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Title</label>
                  <p style={{ margin: "2px 0 0 0", fontWeight: "600", fontSize: "1rem" }}>{selectedTaskDetails.title}</p>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</label>
                  <div>
                    <span
                      className={`status-badge badge-${
                        selectedTaskDetails.status === "In Progress"
                          ? "progress"
                          : selectedTaskDetails.status === "Completed"
                          ? "resolved"
                          : "open"
                      }`}
                    >
                      {selectedTaskDetails.status}
                    </span>
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Description</label>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.9rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                    {selectedTaskDetails.description || "No description provided."}
                  </p>
                </div>
              </div>

              <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "var(--text-primary)" }}>📁 Task Attachments & Proofs</h4>
              {selectedTaskDetails.fileUrl ? (
                (() => {
                  let urls = [];
                  try {
                    if (selectedTaskDetails.fileUrl.startsWith("[")) {
                      urls = JSON.parse(selectedTaskDetails.fileUrl);
                    } else {
                      urls = [selectedTaskDetails.fileUrl];
                    }
                  } catch (e) {
                    urls = [selectedTaskDetails.fileUrl];
                  }

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {urls.map((url, idx) => {
                        const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url);
                        const isVideo = /\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp)$/i.test(url);
                        const isAudio = /\.(mp3|wav|ogg|m4a|aac)$/i.test(url);
                        const isPdf = /\.pdf$/i.test(url);

                        return (
                          <div
                            key={idx}
                            style={{
                              border: "1px solid var(--glass-border)",
                              borderRadius: "10px",
                              padding: "14px",
                              background: "rgba(255,255,255,0.01)"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                                {isVideo
                                  ? "🎥 Video Attachment"
                                  : isImage
                                  ? "🖼️ Image Attachment"
                                  : isAudio
                                  ? "🎙️ Audio Attachment"
                                  : "📄 File Attachment"}
                                #{idx + 1}
                              </span>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() => setPreviewMediaUrl(url)}
                                  className="btn-primary"
                                  style={{ padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                  👁️ View Fullscreen
                                </button>
                                <a
                                  href={url}
                                  download
                                  className="btn-secondary"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: "0.75rem",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}
                                >
                                  📥 Download
                                </a>
                              </div>
                            </div>

                            {isImage ? (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  background: "rgba(0,0,0,0.3)",
                                  borderRadius: "8px",
                                  padding: "8px",
                                  cursor: "pointer"
                                }}
                                onClick={() => setPreviewMediaUrl(url)}
                                title="Click to view fullscreen"
                              >
                                <img
                                  src={url}
                                  alt={`Attachment ${idx + 1}`}
                                  style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "6px", objectFit: "contain" }}
                                />
                              </div>
                            ) : isVideo ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  background: "rgba(0,0,0,0.4)",
                                  borderRadius: "8px",
                                  padding: "8px"
                                }}
                              >
                                <video
                                  src={url}
                                  controls
                                  preload="metadata"
                                  style={{ width: "100%", maxHeight: "400px", borderRadius: "6px", background: "#000" }}
                                />
                              </div>
                            ) : isAudio ? (
                              <div style={{ padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                                <audio controls src={url} style={{ width: "100%" }} />
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "12px",
                                  background: "rgba(255,255,255,0.02)",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                                onClick={() => setPreviewMediaUrl(url)}
                              >
                                <span style={{ fontSize: "1.8rem" }}>{isPdf ? "📄" : "📄"}</span>
                                <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                                  <span style={{ fontSize: "0.85rem", fontWeight: "500", wordBreak: "break-all" }}>
                                    {url.split("/").pop()}
                                  </span>
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                    {isPdf ? "PDF Document — Click to preview" : "Document / File — Click to view"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", border: "1px dashed var(--glass-border)", borderRadius: "10px" }}>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>No attachments uploaded for this task.</p>
                </div>
              )}
            </div>

            <div
              className="modal-footer"
              style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--glass-border)", textAlign: "right" }}
            >
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowTaskDetailsModal(false);
                  setSelectedTaskDetails(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-PAGE MEDIA LIGHTBOX VIEWER MODAL */}
      {previewMediaUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setPreviewMediaUrl(null)}
        >
          {/* Top Control Bar */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              zIndex: 1000000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={previewMediaUrl}
              download
              className="btn-secondary"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              📥 Download File
            </a>
            <button
              onClick={() => setPreviewMediaUrl(null)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#fff",
                fontSize: "1.4rem",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              &times;
            </button>
          </div>

          {/* Media Content Display */}
          <div
            style={{
              maxWidth: "92vw",
              maxHeight: "88vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp)$/i.test(previewMediaUrl) ? (
              <video
                src={previewMediaUrl}
                controls
                autoPlay
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  borderRadius: "12px",
                  outline: "none"
                }}
              />
            ) : /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(previewMediaUrl) ? (
              <img
                src={previewMediaUrl}
                alt="Media Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              />
            ) : /\.pdf$/i.test(previewMediaUrl) ? (
              <iframe
                src={previewMediaUrl}
                style={{
                  width: "82vw",
                  height: "82vh",
                  border: "none",
                  borderRadius: "12px",
                  background: "#fff"
                }}
              />
            ) : (
              <div
                style={{
                  color: "#fff",
                  background: "var(--bg-secondary)",
                  padding: "30px",
                  borderRadius: "12px",
                  textAlign: "center"
                }}
              >
                <p>Preview not available for this file type.</p>
                <a href={previewMediaUrl} download className="btn-primary" style={{ display: "inline-block", marginTop: "10px" }}>
                  Download instead
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
