"use client";

import React from "react";

export default function TaskModals({
  showAddTaskModal,
  setShowAddTaskModal,
  handleAddTaskSubmit,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDesc,
  setNewTaskDesc,
  newTaskAssignee,
  setNewTaskAssignee,
  employees,
  isTeamLeader,
  leaderDepartment,
  showEditTaskModal,
  setShowEditTaskModal,
  handleEditTaskSubmit,
  editTaskTitle,
  setEditTaskTitle,
  editTaskDesc,
  setEditTaskDesc,
  editTaskAssignee,
  setEditTaskAssignee,
  editTaskStatus,
  setEditTaskStatus,
  showTaskDetailsModal,
  setShowTaskDetailsModal,
  selectedTaskDetails,
  setSelectedTaskDetails,
  setPreviewMediaUrl
}) {
  return (
    <>
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Assign New Task</h3>
              <button className="modal-close" onClick={() => setShowAddTaskModal(false)}>
                &times;
              </button>
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
                  {employees
                    .filter(
                      e =>
                        e.role !== "Admin" &&
                        e.role !== "Management" &&
                        (!isTeamLeader || !leaderDepartment || e.department?.toLowerCase() === leaderDepartment.toLowerCase())
                    )
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                </select>
              </div>

              <div
                className="modal-footer"
                style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}
              >
                <button type="button" className="btn-secondary" onClick={() => setShowAddTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
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
                <label>Task Title</label>
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
                <label>Assign to Team Member</label>
                <select
                  className="form-control"
                  value={editTaskAssignee}
                  onChange={(e) => setEditTaskAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {employees
                    .filter(e => e.role !== "Admin" && e.role !== "Management")
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                </select>
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

              <div
                className="modal-footer"
                style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}
              >
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

      {/* View Task Details Modal */}
      {showTaskDetailsModal && (
        <div
          className="modal-overlay active"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--bg-primary)",
            zIndex: 1500,
            overflowY: "auto",
            display: "block",
            padding: "2rem"
          }}
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: "1rem",
                marginBottom: "1.5rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowTaskDetailsModal(false);
                    setSelectedTaskDetails(null);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", padding: "8px 16px" }}
                >
                  ⬅️ Back to Task Board
                </button>
                <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-primary)", fontWeight: "700" }}>
                  Task Details & Attachment Viewer
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowTaskDetailsModal(false);
                  setSelectedTaskDetails(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.8rem",
                  cursor: "pointer"
                }}
              >
                &times;
              </button>
            </div>

            {selectedTaskDetails && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
                {/* Left Column: Details Card */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "12px",
                    padding: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                  }}
                >
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
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>
                        Status
                      </span>
                      <span
                        className={`status-badge badge-${
                          selectedTaskDetails.status === "In Progress"
                            ? "progress"
                            : selectedTaskDetails.status === "Completed"
                            ? "resolved"
                            : "open"
                        }`}
                        style={{ marginTop: "6px", display: "inline-block" }}
                      >
                        {selectedTaskDetails.status}
                      </span>
                    </div>

                    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>
                        Time Spent
                      </span>
                      <span
                        style={{
                          color: "var(--accent-cyan)",
                          fontSize: "1.2rem",
                          fontFamily: "monospace",
                          fontWeight: "bold",
                          display: "block",
                          marginTop: "4px"
                        }}
                      >
                        {(() => {
                          let displayDuration = selectedTaskDetails.totalDuration || 0;
                          if (selectedTaskDetails.status === "In Progress" && selectedTaskDetails.startedAt) {
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
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>
                        Assigned To
                      </span>
                      <span style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: "600", display: "block", marginTop: "4px" }}>
                        {selectedTaskDetails.assignedToName || "Unassigned"}
                      </span>
                    </div>

                    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>
                        Assigned By
                      </span>
                      <span style={{ color: "var(--text-primary)", fontSize: "0.95rem", display: "block", marginTop: "4px" }}>
                        {selectedTaskDetails.assignedByName || "System"}
                      </span>
                    </div>

                    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "10px" }}>
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>
                        Created Date
                      </span>
                      <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", display: "block", marginTop: "4px" }}>
                        {selectedTaskDetails.createdAt ? new Date(selectedTaskDetails.createdAt).toLocaleString() : "—"}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600" }}>
                        Completed Date
                      </span>
                      <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", display: "block", marginTop: "4px" }}>
                        {selectedTaskDetails.completedAt ? new Date(selectedTaskDetails.completedAt).toLocaleString() : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Files & Galleries */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "12px",
                    padding: "2rem",
                    minHeight: "450px"
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 20px 0",
                      fontSize: "1.2rem",
                      color: "var(--text-primary)",
                      fontWeight: "600",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      paddingBottom: "10px"
                    }}
                  >
                    📁 Uploaded Attachments & Proofs Gallery
                  </h3>

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
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                          {urls.map((url, idx) => {
                            const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url);
                            const isVideo = /\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp)$/i.test(url);
                            const isAudio = /\.(mp3|wav|ogg|m4a|aac)$/i.test(url);
                            const isPdf = /\.pdf$/i.test(url);

                            return (
                              <div
                                key={idx}
                                style={{
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  borderRadius: "10px",
                                  padding: "16px",
                                  background: "rgba(255, 255, 255, 0.01)"
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "12px"
                                  }}
                                >
                                  <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: "600" }}>
                                    {isVideo
                                      ? "🎥 Video Attachment"
                                      : isImage
                                      ? "🖼️ Image Attachment"
                                      : isAudio
                                      ? "🎙️ Audio Attachment"
                                      : "📄 File Attachment"}{" "}
                                    #{idx + 1}
                                  </span>
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    {setPreviewMediaUrl && (
                                      <button
                                        onClick={() => setPreviewMediaUrl(url)}
                                        className="btn-primary"
                                        style={{
                                          padding: "6px 14px",
                                          fontSize: "0.8rem",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px"
                                        }}
                                      >
                                        👁️ View Fullscreen
                                      </button>
                                    )}
                                    <a
                                      href={url}
                                      download
                                      className="btn-secondary"
                                      style={{
                                        padding: "6px 14px",
                                        fontSize: "0.8rem",
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
                                      padding: "10px",
                                      cursor: "pointer"
                                    }}
                                    onClick={() => setPreviewMediaUrl && setPreviewMediaUrl(url)}
                                    title="Click to view fullscreen"
                                  >
                                    <img
                                      src={url}
                                      alt={`Attachment Proof ${idx + 1}`}
                                      style={{
                                        maxWidth: "100%",
                                        maxHeight: "500px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255, 255, 255, 0.05)",
                                        objectFit: "contain"
                                      }}
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
                                      padding: "10px"
                                    }}
                                  >
                                    <video
                                      src={url}
                                      controls
                                      preload="metadata"
                                      style={{
                                        width: "100%",
                                        maxHeight: "450px",
                                        borderRadius: "8px",
                                        background: "#000"
                                      }}
                                    />
                                  </div>
                                ) : isAudio ? (
                                  <div
                                    style={{
                                      padding: "12px",
                                      background: "rgba(255,255,255,0.02)",
                                      borderRadius: "8px",
                                      border: "1px solid rgba(255,255,255,0.05)"
                                    }}
                                  >
                                    <audio controls src={url} style={{ width: "100%" }} />
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "12px",
                                      padding: "16px",
                                      background: "rgba(255,255,255,0.02)",
                                      borderRadius: "8px",
                                      border: "1px solid rgba(255,255,255,0.05)",
                                      cursor: "pointer"
                                    }}
                                    onClick={() => setPreviewMediaUrl && setPreviewMediaUrl(url)}
                                  >
                                    <span style={{ fontSize: "2rem" }}>{isPdf ? "📕" : "📄"}</span>
                                    <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                                      <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: "500", wordBreak: "break-all" }}>
                                        {url.split("/").pop()}
                                      </span>
                                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "2px" }}>
                                        {isPdf
                                          ? "PDF Document — Click to preview"
                                          : "Document / File Attachment — Click to view"}
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
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "200px",
                        border: "1px dashed rgba(255,255,255,0.1)",
                        borderRadius: "12px"
                      }}
                    >
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
      )}
    </>
  );
}
