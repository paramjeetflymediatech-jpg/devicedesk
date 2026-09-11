"use client";

import React from "react";
import Swal from "sweetalert2";
import { FiEye, FiEyeOff, FiLink } from "react-icons/fi";
import { getEmployeeSlug } from "../../utils/slugUtils.js";

export default function EmployeeModals({
  // Add Employee Modal
  showAddEmpModal,
  setShowAddEmpModal,
  handleAddEmployeeSubmit,
  newEmpName,
  setNewEmpName,
  newEmpEmail,
  setNewEmpEmail,
  newEmpPassword,
  setNewEmpPassword,
  showNewEmpPassword,
  setShowNewEmpPassword,
  newEmpRole,
  setNewEmpRole,
  newEmpDept,
  setNewEmpDept,
  departments,
  newEmpLimit,
  setNewEmpLimit,

  // Edit Employee Modal
  showEditEmpModal,
  setShowEditEmpModal,
  handleEditEmployeeSubmit,
  editingEmp,
  setEditingEmp,

  // Performance Report Modal
  showEmpReportModal,
  setShowEmpReportModal,
  empReportTarget,
  setEmpReportTarget,
  empReportFrom,
  setEmpReportFrom,
  empReportTo,
  setEmpReportTo,
  handleDownloadEmpReport,
  employees,
  systems,
  assignmentHistory,
  tickets,
  tasks,

  // Bulk Import Modal
  showEmpImportModal,
  setShowEmpImportModal,
  empImportStatus,
  setEmpImportStatus,
  empImportFile,
  setEmpImportFile,
  empImportParsed,
  setEmpImportParsed,
  empImportResult,
  handleDownloadEmpTemplate,
  handleEmpImportFileChange,
  handleConfirmEmpImport
}) {
  return (
    <>
      {/* ================= MODAL: ADD EMPLOYEE ================= */}
      {showAddEmpModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add New Team Member</h3>
              <button className="modal-close" onClick={() => setShowAddEmpModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAddEmployeeSubmit}>
              <div className="form-group">
                <label>Team Member Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="Please enter name"
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
                  placeholder="Please enter your company email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewEmpPassword ? "text" : "password"}
                    className="form-control"
                    value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    placeholder="e.g. password123"
                    required
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewEmpPassword(!showNewEmpPassword)}
                    aria-label={showNewEmpPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px"
                    }}
                  >
                    {showNewEmpPassword ? (
                      <FiEyeOff style={{ fontSize: "1.1rem" }} />
                    ) : (
                      <FiEye style={{ fontSize: "1.1rem" }} />
                    )}
                  </button>
                </div>
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
                    <option value={dept.name} key={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ticket Limit (Raise limit)</label>
                <input
                  type="number"
                  className="form-control"
                  value={newEmpLimit}
                  onChange={(e) => setNewEmpLimit(parseInt(e.target.value) || 100)}
                  min="1"
                  max="99999"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              >
                Add Team Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT EMPLOYEE ================= */}
      {showEditEmpModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Edit Team Member Profile</h3>
              <button className="modal-close" onClick={() => setShowEditEmpModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEditEmployeeSubmit}>
              <div className="form-group">
                <label>Team Member Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingEmp.name || ""}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                  placeholder="Please enter name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={editingEmp.email || ""}
                  onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                  placeholder="Please enter your company email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  className="form-control"
                  value={editingEmp.role || "Team Member"}
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
                  value={editingEmp.department || ""}
                  onChange={(e) => setEditingEmp({ ...editingEmp, department: e.target.value })}
                >
                  {departments.map(dept => (
                    <option value={dept.name} key={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ticket Limit (Raise limit)</label>
                <input
                  type="number"
                  className="form-control"
                  value={editingEmp.ticketLimit || 5}
                  onChange={(e) =>
                    setEditingEmp({ ...editingEmp, ticketLimit: parseInt(e.target.value) || 100 })
                  }
                  min="1"
                  max="99999"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EMPLOYEE PERFORMANCE REPORT ================= */}
      {showEmpReportModal &&
        (() => {
          const from = empReportFrom ? new Date(empReportFrom + "T00:00:00") : null;
          const to = empReportTo ? new Date(empReportTo + "T23:59:59") : null;

          const currentDevices = empReportTarget ? systems.filter(s => s.assignedTo === empReportTarget.id) : [];

          const empLogs = empReportTarget
            ? assignmentHistory.filter(h => {
                if (h.employeeId !== empReportTarget.id) return false;
                if (!h.timestamp) return false;
                const ts = new Date(h.timestamp);
                if (from && ts < from) return false;
                if (to && ts > to) return false;
                return true;
              })
            : [];

          const empTickets = empReportTarget
            ? tickets.filter(t => {
                const matchEmp = t.raisedBy === empReportTarget.id || t.employeeId === empReportTarget.id;
                if (!matchEmp) return false;
                if (!t.createdAt) return false;
                const ts = new Date(t.createdAt);
                if (from && ts < from) return false;
                if (to && ts > to) return false;
                return true;
              })
            : [];

          const empTasks = empReportTarget
            ? tasks.filter(t => {
                if (t.assignedTo !== empReportTarget.id) return false;
                if (!t.createdAt) return false;
                const ts = new Date(t.createdAt);
                if (from && ts < from) return false;
                if (to && ts > to) return false;
                return true;
              })
            : [];

          const userSlug = empReportTarget ? getEmployeeSlug(empReportTarget) : "";

          return (
            <div className="modal-overlay active">
              <div className="modal-card" style={{ maxWidth: "850px", width: "95%" }}>
                <div className="modal-header" style={{ paddingBottom: "10px" }}>
                  <h3 className="modal-title">📊 Team Member Performance Report</h3>
                  <button className="modal-close" onClick={() => setShowEmpReportModal(false)}>
                    &times;
                  </button>
                </div>

                {/* Selection & Filters Banner */}
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
                  <div style={{ flex: "1 1 200px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        marginBottom: "4px"
                      }}
                    >
                      Select Team Member
                    </label>
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
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.department} - {emp.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: "1 1 150px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        marginBottom: "4px"
                      }}
                    >
                      From Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={empReportFrom}
                      onChange={(e) => setEmpReportFrom(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 150px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        marginBottom: "4px"
                      }}
                    >
                      To Date
                    </label>
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
                          Swal.fire({
                            icon: "warning",
                            title: "Selection Required",
                            text: "Please select a team member first."
                          });
                          return;
                        }
                        handleDownloadEmpReport(empReportTarget, empReportFrom, empReportTo);
                      }}
                      className="btn-action start"
                      style={{
                        padding: "8px 14px",
                        background: "var(--accent-cyan)",
                        color: "#000",
                        fontWeight: "600",
                        whiteSpace: "nowrap"
                      }}
                    >
                      📥 Download CSV Report
                    </button>
                  </div>
                </div>

                {/* Modal body */}
                <div
                  className="modal-body"
                  style={{ maxHeight: "55vh", overflowY: "auto", paddingRight: "6px" }}
                >
                  {!empReportTarget ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem 1rem",
                        color: "var(--text-muted)",
                        fontStyle: "italic"
                      }}
                    >
                      Please select a team member from the dropdown list above to generate their performance and
                      activity report.
                    </div>
                  ) : (
                    <>
                      {/* Employee Info Details Banner */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "10px",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          marginBottom: "20px",
                          padding: "10px",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: "8px"
                        }}
                      >
                        <div>
                          <strong>Dept:</strong> {empReportTarget.department || "N/A"}
                        </div>
                        <div>
                          <strong>Role:</strong> {empReportTarget.role || "N/A"}
                        </div>
                        <div>
                          <strong>Email:</strong> {empReportTarget.email || "N/A"}
                        </div>
                        <div>
                          <strong>Slug:</strong>{" "}
                          <span style={{ color: "var(--accent-purple)", fontWeight: "600" }}>
                            <FiLink style={{ verticalAlign: "middle", marginRight: "3px" }} />
                            {userSlug}
                          </span>
                        </div>
                        <div>
                          <strong>Ticket Limit:</strong> {empReportTarget.ticketLimit || 5}
                        </div>
                      </div>

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
                          <span>🖥️ Assigned Devices ({currentDevices.length})</span>
                        </h4>
                        {currentDevices.length === 0 ? (
                          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                            No devices currently assigned to this team member.
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
                                {currentDevices.map(s => (
                                  <tr key={s.id}>
                                    <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>
                                      {s.systemNumber}
                                    </td>
                                    <td>{s.model || "Generic PC"}</td>
                                    <td>{s.os || "Windows 11"}</td>
                                    <td>
                                      {s.cpu} / {s.ram} / {s.storage}
                                    </td>
                                    <td>
                                      <span
                                        className={`status-tag ${
                                          s.status?.toLowerCase() === "active" ? "resolved" : "open"
                                        }`}
                                      >
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
                        <h5
                          style={{
                            marginTop: "12px",
                            marginBottom: "8px",
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)"
                          }}
                        >
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
                                {empLogs.map(log => (
                                  <tr key={log.id}>
                                    <td>
                                      <span
                                        className={`status-tag ${
                                          log.action.toLowerCase().includes("assign") ? "resolved" : "open"
                                        }`}
                                      >
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
                            No issues or complaints registered by this team member during this period.
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
                                {empTickets.map(t => (
                                  <tr key={t.id}>
                                    <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{t.id}</td>
                                    <td>{t.category}</td>
                                    <td
                                      style={{
                                        maxWidth: "220px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap"
                                      }}
                                      title={t.description}
                                    >
                                      {t.description}
                                    </td>
                                    <td>
                                      <span className={`status-tag ${t.severity.toLowerCase()}`}>
                                        {t.severity}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`status-tag ${t.status.toLowerCase().replace(" ", "")}`}>
                                        {t.status}
                                      </span>
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
                            No tasks assigned to this team member during this period.
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
                                {empTasks.map(t => {
                                  const durationMins = t.totalDuration ? Math.round(t.totalDuration / 60) : 0;
                                  return (
                                    <tr key={t.id}>
                                      <td>
                                        <strong>{t.title}</strong>
                                      </td>
                                      <td
                                        style={{
                                          maxWidth: "220px",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap"
                                        }}
                                        title={t.description}
                                      >
                                        {t.description || "—"}
                                      </td>
                                      <td>
                                        <span className={`status-tag ${t.status.toLowerCase().replace(" ", "")}`}>
                                          {t.status}
                                        </span>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ================= MODAL: BULK IMPORT EMPLOYEES ================= */}
      {showEmpImportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "780px",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px"
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  📤 Bulk Import Employees
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "4px" }}>
                  Upload an Excel (.xlsx) or CSV file — passwords will be bcrypt encrypted automatically
                </p>
              </div>
              <button
                onClick={() => setShowEmpImportModal(false)}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Template download */}
            <div
              style={{
                background: "rgba(34,96,212,0.08)",
                border: "1px solid rgba(34,96,212,0.3)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>📋</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: "600", color: "var(--text-primary)", fontSize: "0.88rem" }}>
                  Download Import Template
                </p>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                  Columns: Name, Email, Password, Role, Department, Ticket Limit — passwords auto-encrypted
                </p>
              </div>
              <button
                onClick={handleDownloadEmpTemplate}
                style={{
                  background: "linear-gradient(135deg,#1a3a6b,#2260d4)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.82rem",
                  whiteSpace: "nowrap"
                }}
              >
                ⬇ Get Template
              </button>
            </div>

            {/* File picker */}
            {empImportStatus !== "done" && (
              <div
                style={{
                  border: "2px dashed var(--glass-border)",
                  borderRadius: "10px",
                  padding: "24px",
                  textAlign: "center",
                  marginBottom: "18px",
                  background: "var(--bg-tertiary)"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>👥</div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "12px" }}>
                  {empImportFile ? `Selected: ${empImportFile.name}` : "Choose your Excel (.xlsx) or CSV file"}
                </p>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleEmpImportFileChange}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      background: "var(--accent-cyan)",
                      color: "#0d1117",
                      fontWeight: "700",
                      borderRadius: "8px",
                      padding: "8px 20px",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    Browse File
                  </span>
                </label>
              </div>
            )}

            {/* Preview table */}
            {empImportStatus === "preview" && empImportParsed.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "8px" }}>
                  📊 Preview —{" "}
                  <strong style={{ color: "var(--text-primary)" }}>{empImportParsed.length} rows</strong> detected.
                  Review before importing.
                </p>
                <div
                  style={{
                    overflowX: "auto",
                    maxHeight: "220px",
                    overflowY: "auto",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border)"
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-tertiary)", position: "sticky", top: 0 }}>
                        {Object.keys(empImportParsed[0])
                          .slice(0, 6)
                          .map(h => (
                            <th
                              key={h}
                              style={{
                                padding: "6px 10px",
                                textAlign: "left",
                                color: "var(--accent-cyan)",
                                borderBottom: "1px solid var(--glass-border)",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {h}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {empImportParsed.slice(0, 20).map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {Object.values(row)
                            .slice(0, 6)
                            .map((val, j) => (
                              <td
                                key={j}
                                style={{
                                  padding: "5px 10px",
                                  color: j === 2 ? "#888" : "var(--text-secondary)",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {j === 2 ? "••••••••" : String(val)}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {empImportParsed.length > 20 && (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "6px" }}>
                    ...and {empImportParsed.length - 20} more rows
                  </p>
                )}
                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button
                    onClick={() => {
                      setEmpImportFile(null);
                      setEmpImportParsed([]);
                      setEmpImportStatus(null);
                    }}
                    style={{
                      padding: "9px 18px",
                      borderRadius: "8px",
                      border: "1px solid var(--glass-border)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "0.85rem"
                    }}
                  >
                    ↩ Change File
                  </button>
                  <button
                    onClick={handleConfirmEmpImport}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg,#1a3a6b,#2260d4)",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "0.85rem"
                    }}
                  >
                    ✅ Confirm & Import {empImportParsed.length} Employees
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {empImportStatus === "loading" && (
              <div style={{ textAlign: "center", padding: "30px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
                <p style={{ color: "var(--text-secondary)" }}>Encrypting passwords & importing employees...</p>
              </div>
            )}

            {/* Result */}
            {empImportStatus === "done" && empImportResult && (
              <div>
                <div
                  style={{
                    background: "rgba(34,96,212,0.1)",
                    border: "1px solid rgba(34,96,212,0.4)",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "14px"
                  }}
                >
                  <h3 style={{ color: "#4d90fe", margin: "0 0 6px 0", fontSize: "1.05rem" }}>
                    ✅ Import Complete!
                  </h3>
                  <p style={{ color: "var(--text-primary)", margin: 0, fontSize: "0.88rem" }}>
                    <strong>{empImportResult.imported}</strong> employees imported successfully with encrypted
                    passwords.
                  </p>
                </div>

                {empImportResult.duplicates?.length > 0 && (
                  <div
                    style={{
                      background: "rgba(255,168,0,0.08)",
                      border: "1px solid rgba(255,168,0,0.35)",
                      borderRadius: "10px",
                      padding: "14px",
                      marginBottom: "10px"
                    }}
                  >
                    <p style={{ color: "#ffa800", fontWeight: "700", margin: "0 0 6px 0", fontSize: "0.88rem" }}>
                      ⚠️ {empImportResult.duplicates.length} Duplicate(s) Skipped
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
