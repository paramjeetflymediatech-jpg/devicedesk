"use client";

import React from "react";
import { FiUser, FiLink } from "react-icons/fi";
import { getEmployeeSlug } from "../utils/slugUtils.js";

export default function EmployeesTab({
  handleExportEmployeesToExcel,
  setShowEmpImportModal,
  setEmpImportStatus,
  setEmpImportFile,
  setEmpImportParsed,
  setEmpImportResult,
  setShowAddEmpModal,
  empSearch,
  setEmpSearch,
  setEmpPage,
  empFilterDept,
  setEmpFilterDept,
  availableEmpDepartments,
  empFilterRole,
  setEmpFilterRole,
  availableEmpRoles,
  currentEmployees,
  systems,
  setSelectedViewDept,
  setDeptModalTab,
  setSelectedViewSystem,
  handleOpenAssignModal,
  handleOpenEditEmpModal,
  handleOpenEmpReportModal,
  handleToggleEmployeeStatus,
  handleRemoveEmployee,
  totalEmpPages,
  empPage,
  router
}) {
  return (
    <div className="page-section active">
      <div className="section-header">
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Team Member Assignments</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={handleExportEmployeesToExcel}>
            📥 Export Team Members
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setShowEmpImportModal(true);
              setEmpImportStatus(null);
              setEmpImportFile(null);
              setEmpImportParsed([]);
              setEmpImportResult(null);
            }}
            style={{
              background: "linear-gradient(135deg,#1a3a6b,#2260d4)",
              color: "#fff",
              border: "none"
            }}
          >
            📤 Import Excel
          </button>
          <button className="btn-primary" onClick={() => setShowAddEmpModal(true)}>
            + Add Team Member
          </button>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div
        className="filter-row"
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <div style={{ flexGrow: 1, minWidth: "240px", position: "relative" }}>
          <input
            type="text"
            className="form-control search-box"
            placeholder="Search by Team Member name, department, role, or slug..."
            value={empSearch}
            onChange={(e) => {
              setEmpSearch(e.target.value);
              setEmpPage(1);
            }}
            style={{ width: "100%", paddingRight: "35px" }}
          />
          {empSearch && (
            <button
              type="button"
              onClick={() => {
                setEmpSearch("");
                setEmpPage(1);
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
                padding: "4px",
                lineHeight: 1
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Filter by Department */}
        <div style={{ minWidth: "180px" }}>
          <select
            className="form-control"
            value={empFilterDept}
            onChange={(e) => {
              setEmpFilterDept(e.target.value);
              setEmpPage(1);
            }}
            style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", width: "100%" }}
          >
            <option value="all">All Departments</option>
            {availableEmpDepartments.map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Role */}
        <div style={{ minWidth: "160px" }}>
          <select
            className="form-control"
            value={empFilterRole}
            onChange={(e) => {
              setEmpFilterRole(e.target.value);
              setEmpPage(1);
            }}
            style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", width: "100%" }}
          >
            <option value="all">All Roles</option>
            {availableEmpRoles.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table — Desktop */}
      <div className="table-wrapper desktop-only">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Team Member Name</th>
              <th>User Slug</th>
              <th>Department</th>
              <th>Role</th>
              <th>Assigned Devices</th>
              <th>Ticket Limit</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  No team members match your selected department or role filters.
                </td>
              </tr>
            ) : (
              currentEmployees.map(emp => {
                const assigned = systems.filter(s => s.assignedTo === emp.id);
                const userSlug = getEmployeeSlug(emp);

                return (
                  <tr key={emp.id}>
                    <td>
                      <strong
                        style={{ cursor: "pointer", color: "var(--text-primary)" }}
                        onClick={() => handleOpenEmpReportModal(emp)}
                        title="Click to view performance report"
                      >
                        {emp.name}
                      </strong>
                      {emp.status === "Paused" && (
                        <span
                          className="status-tag open"
                          style={{
                            marginLeft: "8px",
                            fontSize: "0.65rem",
                            padding: "2px 6px",
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "var(--status-critical)",
                            borderColor: "var(--status-critical)"
                          }}
                        >
                          Paused
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className="timer-badge"
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--accent-purple)",
                          borderColor: "rgba(139, 92, 246, 0.4)",
                          background: "rgba(139, 92, 246, 0.08)",
                          cursor: "pointer",
                          userSelect: "all"
                        }}
                        onClick={() => {
                          if (router) {
                            router.push(`/admin/users/${userSlug}`);
                          } else {
                            handleOpenEmpReportModal(emp);
                          }
                        }}
                        title={`User slug: ${userSlug} — Click to view profile page`}
                      >
                        <FiLink style={{ marginRight: "3px", verticalAlign: "middle" }} />
                        {userSlug}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-tag resolved"
                        style={{ cursor: "pointer", transition: "transform 0.2s" }}
                        onClick={() => {
                          setSelectedViewDept(emp.department);
                          setDeptModalTab("members");
                        }}
                        title={`View details of ${emp.department} department`}
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
                            style={{
                              color: "var(--accent-cyan)",
                              borderColor: "var(--accent-cyan)",
                              marginRight: "4px",
                              cursor: "pointer"
                            }}
                            key={s.id}
                            onClick={() => setSelectedViewSystem(s)}
                            title="Click to view details"
                          >
                            {s.systemNumber}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>None</span>
                      )}
                    </td>
                    <td>{emp.ticketLimit || 5}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button
                          className="btn-action start"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleOpenAssignModal(emp)}
                        >
                          Assign Device
                        </button>
                        <button
                          className="btn-action start"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "var(--accent-cyan)",
                            borderColor: "var(--accent-cyan)"
                          }}
                          onClick={() => handleOpenEditEmpModal(emp)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-action start"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "rgba(139, 92, 246, 0.15)",
                            color: "var(--accent-purple)",
                            borderColor: "var(--accent-purple)"
                          }}
                          onClick={() => handleOpenEmpReportModal(emp)}
                        >
                          View Report
                        </button>
                        {!["Admin"].includes(emp.role) && (
                          <>
                            <button
                              className="btn-action start"
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                background:
                                  emp.status === "Paused"
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : "rgba(245, 158, 11, 0.15)",
                                color:
                                  emp.status === "Paused"
                                    ? "var(--status-resolved)"
                                    : "var(--status-open)",
                                borderColor:
                                  emp.status === "Paused"
                                    ? "var(--status-resolved)"
                                    : "var(--status-open)"
                              }}
                              onClick={() => handleToggleEmployeeStatus(emp)}
                            >
                              {emp.status === "Paused" ? "Activate" : "Pause"}
                            </button>
                            <button
                              className="btn-action resolve"
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "var(--status-critical)",
                                borderColor: "var(--status-critical)"
                              }}
                              onClick={() => handleRemoveEmployee(emp.id)}
                            >
                              Remove
                            </button>
                          </>
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
        {currentEmployees.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
            No team members match your selected department or role filters.
          </p>
        ) : (
          currentEmployees.map(emp => {
            const assigned = systems.filter(s => s.assignedTo === emp.id);
            const userSlug = getEmployeeSlug(emp);

            return (
              <div className="mobile-card" key={emp.id}>
                <div className="mobile-card-header">
                  <span className="mobile-card-title">
                    <FiUser style={{ fontSize: "0.85rem", verticalAlign: "middle", marginRight: "4px" }} />
                    {emp.name}
                    {emp.status === "Paused" && (
                      <span
                        className="status-tag open"
                        style={{
                          marginLeft: "6px",
                          fontSize: "0.65rem",
                          padding: "1px 5px",
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "var(--status-critical)",
                          borderColor: "var(--status-critical)"
                        }}
                      >
                        Paused
                      </span>
                    )}
                  </span>
                  <span
                    className="status-tag resolved"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedViewDept(emp.department);
                      setDeptModalTab("members");
                    }}
                    title={`View all devices in ${emp.department}`}
                  >
                    {emp.department}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">User Slug</span>
                  <span
                    className="mobile-card-value"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--accent-purple)",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      if (router) {
                        router.push(`/admin/users/${userSlug}`);
                      } else {
                        handleOpenEmpReportModal(emp);
                      }
                    }}
                  >
                    <FiLink style={{ marginRight: "3px", verticalAlign: "middle" }} />
                    {userSlug}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Role</span>
                  <span className="mobile-card-value">{emp.role}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Devices</span>
                  <span className="mobile-card-value">
                    {assigned.length > 0 ? (
                      assigned.map(s => (
                        <span
                          key={s.id}
                          className="timer-badge"
                          style={{
                            color: "var(--accent-cyan)",
                            borderColor: "var(--accent-cyan)",
                            marginRight: "4px",
                            cursor: "pointer"
                          }}
                          onClick={() => setSelectedViewSystem(s)}
                          title="Click to view details"
                        >
                          {s.systemNumber}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>None</span>
                    )}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Ticket Limit</span>
                  <span className="mobile-card-value">{emp.ticketLimit || 5}</span>
                </div>
                <div className="mobile-card-actions">
                  <button className="btn-action start" onClick={() => handleOpenAssignModal(emp)}>
                    Assign
                  </button>
                  <button
                    className="btn-action start"
                    style={{
                      background: "rgba(59,130,246,0.15)",
                      color: "var(--accent-cyan)",
                      borderColor: "var(--accent-cyan)"
                    }}
                    onClick={() => handleOpenEditEmpModal(emp)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-action start"
                    style={{
                      background: "rgba(139,92,246,0.15)",
                      color: "var(--accent-purple)",
                      borderColor: "var(--accent-purple)"
                    }}
                    onClick={() => handleOpenEmpReportModal(emp)}
                  >
                    Report
                  </button>
                  {!["Admin"].includes(emp.role) && (
                    <>
                      <button
                        className="btn-action start"
                        style={{
                          background:
                            emp.status === "Paused"
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                          color:
                            emp.status === "Paused"
                              ? "var(--status-resolved)"
                              : "var(--status-open)",
                          borderColor:
                            emp.status === "Paused"
                              ? "var(--status-resolved)"
                              : "var(--status-open)"
                        }}
                        onClick={() => handleToggleEmployeeStatus(emp)}
                      >
                        {emp.status === "Paused" ? "Activate" : "Pause"}
                      </button>
                      <button
                        className="btn-action resolve"
                        style={{
                          background: "rgba(239,68,68,0.15)",
                          color: "var(--status-critical)",
                          borderColor: "var(--status-critical)"
                        }}
                        onClick={() => handleRemoveEmployee(emp.id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Employees Pagination Controls */}
      {totalEmpPages > 1 && (
        <div className="pagination-controls">
          <button
            className="btn-secondary"
            onClick={() => setEmpPage(prev => Math.max(prev - 1, 1))}
            disabled={empPage === 1}
            style={{
              padding: "6px 12px",
              opacity: empPage === 1 ? 0.5 : 1,
              cursor: empPage === 1 ? "not-allowed" : "pointer"
            }}
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
            style={{
              padding: "6px 12px",
              opacity: empPage === totalEmpPages ? 0.5 : 1,
              cursor: empPage === totalEmpPages ? "not-allowed" : "pointer"
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
