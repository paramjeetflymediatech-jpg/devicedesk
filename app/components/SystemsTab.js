"use client";

import React from "react";
import Link from "next/link";
import { FiLink } from "react-icons/fi";
import { getEmployeeSlug } from "../utils/slugUtils.js";

export default function SystemsTab({
  handleExportSystemsToExcel,
  setShowImportModal,
  setImportStatus,
  setImportFile,
  setImportParsed,
  setImportResult,
  handleOpenAddSysModal,
  sysSearch,
  setSysSearch,
  setSysPage,
  sysFilterOS,
  setSysFilterOS,
  sysFilterStatus,
  setSysFilterStatus,
  currentSystems,
  employees,
  handleOpenEditSysModal,
  handleOpenHistoryModal,
  userRole,
  handleRemoveSystem,
  sysPage,
  totalSysPages
}) {
  return (
    <div className="page-section active">
      <div className="section-header">
        <h2 style={{ fontSize: "1.4rem" }}>Hardware Directory</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={handleExportSystemsToExcel}>
            📥 Export Systems
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setShowImportModal(true);
              setImportStatus(null);
              setImportFile(null);
              setImportParsed([]);
              setImportResult(null);
            }}
            style={{
              background: "linear-gradient(135deg,#1a6b3c,#22a05a)",
              color: "#fff",
              border: "none"
            }}
          >
            📤 Import Excel
          </button>
          <button className="btn-primary" onClick={handleOpenAddSysModal}>
            + Add New System
          </button>
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
            onChange={(e) => {
              setSysSearch(e.target.value);
              setSysPage(1);
            }}
            style={{ width: "100%", paddingRight: "35px" }}
          />
          {sysSearch && (
            <button
              type="button"
              onClick={() => {
                setSysSearch("");
                setSysPage(1);
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
        <select
          className="form-control select-filter"
          value={sysFilterOS}
          onChange={(e) => {
            setSysFilterOS(e.target.value);
            setSysPage(1);
          }}
        >
          <option value="all">All OS</option>
          <option value="Windows 11">Windows 11</option>
          <option value="Windows 10">Windows 10</option>
          <option value="macOS">macOS</option>
          <option value="Ubuntu">Ubuntu</option>
        </select>
        <select
          className="form-control select-filter"
          value={sysFilterStatus}
          onChange={(e) => {
            setSysFilterStatus(e.target.value);
            setSysPage(1);
          }}
        >
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
              <tr>
                <td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No matching systems found.
                </td>
              </tr>
            ) : (
              currentSystems.map(sys => {
                const emp = employees.find(e => e.id === sys.assignedTo);
                return (
                  <tr key={sys.id}>
                    <td style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{sys.systemNumber}</td>
                    <td>
                      <span className={`status-tag ${sys.status.toLowerCase().replace(" ", "")}`}>
                        {sys.status}
                      </span>
                    </td>
                    <td>
                      {emp ? (
                        <div>
                          <div>{emp.name}</div>
                          <Link
                            href={`/admin/users/${getEmployeeSlug(emp)}`}
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--accent-purple)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              textDecoration: "none"
                            }}
                            title={`View profile for ${getEmployeeSlug(emp)}`}
                          >
                            <FiLink style={{ fontSize: "0.65rem" }} /> {getEmployeeSlug(emp)}
                          </Link>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Unassigned</span>
                      )}
                    </td>
                    <td>{sys.cpu}</td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{sys.gpu || "—"}</span>
                    </td>
                    <td>
                      <span className="timer-badge">{sys.ram}</span>
                    </td>
                    <td>{sys.storage}</td>
                    <td>{sys.os}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <button
                          className="btn-action start"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleOpenEditSysModal(sys)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-action resolve"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleOpenHistoryModal(sys)}
                        >
                          History
                        </button>
                        {userRole === "admin" && (
                          <button
                            className="btn-action resolve"
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "var(--status-critical)",
                              borderColor: "var(--status-critical)"
                            }}
                            onClick={() => handleRemoveSystem(sys.id, sys.systemNumber)}
                          >
                            Delete
                          </button>
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
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
            No matching systems found.
          </p>
        ) : (
          currentSystems.map(sys => {
            const emp = employees.find(e => e.id === sys.assignedTo);
            return (
              <div className="mobile-card" key={sys.id}>
                <div className="mobile-card-header">
                  <span className="mobile-card-title">🖥️ {sys.systemNumber}</span>
                  <span className={`status-tag ${sys.status.toLowerCase().replace(" ", "")}`}>{sys.status}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Assigned To</span>
                  <span className="mobile-card-value">
                    {emp ? (
                      <span>
                        {emp.name}{" "}
                        <Link
                          href={`/admin/users/${getEmployeeSlug(emp)}`}
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--accent-purple)",
                            textDecoration: "none",
                            marginLeft: "4px"
                          }}
                        >
                          (@{getEmployeeSlug(emp)})
                        </Link>
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Unassigned</span>
                    )}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">CPU</span>
                  <span className="mobile-card-value">{sys.cpu || "—"}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">GPU</span>
                  <span className="mobile-card-value">{sys.gpu || "—"}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">RAM</span>
                  <span className="mobile-card-value">{sys.ram || "—"}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Storage</span>
                  <span className="mobile-card-value">{sys.storage || "—"}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">OS</span>
                  <span className="mobile-card-value">{sys.os || "—"}</span>
                </div>
                <div className="mobile-card-actions" style={{ display: "flex", gap: "8px" }}>
                  <button className="btn-action start" onClick={() => handleOpenEditSysModal(sys)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-action resolve" onClick={() => handleOpenHistoryModal(sys)}>
                    📜 History
                  </button>
                  {userRole === "admin" && (
                    <button
                      className="btn-action resolve"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "var(--status-critical)",
                        borderColor: "var(--status-critical)"
                      }}
                      onClick={() => handleRemoveSystem(sys.id, sys.systemNumber)}
                    >
                      🗑️ Delete
                    </button>
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
            style={{
              padding: "6px 12px",
              opacity: sysPage === 1 ? 0.5 : 1,
              cursor: sysPage === 1 ? "not-allowed" : "pointer"
            }}
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
            style={{
              padding: "6px 12px",
              opacity: sysPage === totalSysPages ? 0.5 : 1,
              cursor: sysPage === totalSysPages ? "not-allowed" : "pointer"
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
