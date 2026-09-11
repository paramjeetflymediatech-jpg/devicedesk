"use client";

import React from "react";

export default function HistoryTab({
  handleExportHistoryToExcel,
  historySearch,
  setHistorySearch,
  setHistoryPage,
  currentHistory,
  employees,
  totalHistoryPages,
  historyPage,
  filteredHistory
}) {
  return (
    <div className="page-section active">
      <div
        className="section-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>System Tracking & Audit Logs</h2>
        <button
          onClick={handleExportHistoryToExcel}
          className="btn-action start"
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
        >
          Export Audit Logs
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
            onChange={(e) => {
              setHistorySearch(e.target.value);
              setHistoryPage(1);
            }}
          />
          {historySearch && (
            <button
              type="button"
              onClick={() => {
                setHistorySearch("");
                setHistoryPage(1);
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
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No matching audit logs found.
                </td>
              </tr>
            ) : (
              currentHistory.map(log => {
                const emp = employees.find(e => e.id === log.employeeId);
                const act = (log.action || "").toLowerCase();
                let statusClass = "open";
                if (act === "assigned") statusClass = "resolved";
                else if (act === "unassigned") statusClass = "open";
                else if (act.includes("added") || act.includes("add")) statusClass = "progress";
                else if (act.includes("updated") || act.includes("update")) statusClass = "open";
                else if (act.includes("removed") || act.includes("delete") || act.includes("unassigned"))
                  statusClass = "critical";

                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{log.id}</td>
                    <td>
                      <span className={`status-tag ${statusClass}`}>{log.action}</span>
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: log.systemNumber ? "var(--accent-cyan)" : "var(--text-muted)"
                      }}
                    >
                      {log.systemNumber || "N/A"}
                    </td>
                    <td>
                      <strong>
                        {emp
                          ? emp.name
                          : log.employeeId
                          ? log.employeeId.startsWith("emp_")
                            ? "Unknown"
                            : log.employeeId
                          : "N/A"}
                      </strong>
                    </td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <span className="timer-badge">{log.assignedBy || "System"}</span>
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
        {currentHistory.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
            No audit logs found.
          </p>
        ) : (
          currentHistory.map(log => {
            const emp = employees.find(e => e.id === log.employeeId);
            const act = (log.action || "").toLowerCase();
            let statusClass = "open";
            if (act === "assigned") statusClass = "resolved";
            else if (act === "unassigned") statusClass = "open";
            else if (act.includes("added") || act.includes("add")) statusClass = "progress";
            else if (act.includes("updated") || act.includes("update")) statusClass = "open";
            else if (act.includes("removed") || act.includes("delete") || act.includes("unassigned"))
              statusClass = "critical";

            let title = "Audit Log";
            if (log.systemNumber) title = log.systemNumber;
            else if (act.includes("employee")) title = "Employee Log";
            else if (act.includes("department")) title = "Department Log";

            return (
              <div className="mobile-card" key={log.id}>
                <div className="mobile-card-header">
                  <span className="mobile-card-title">{title}</span>
                  <span className={`status-tag ${statusClass}`}>{log.action}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Employee</span>
                  <span className="mobile-card-value">
                    {emp
                      ? emp.name
                      : log.employeeId
                      ? log.employeeId.startsWith("emp_")
                        ? "Unknown"
                        : log.employeeId
                      : "N/A"}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Timestamp</span>
                  <span className="mobile-card-value">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Performed By</span>
                  <span className="mobile-card-value">{log.assignedBy || "System"}</span>
                </div>
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
            style={{
              padding: "6px 12px",
              opacity: historyPage === 1 ? 0.5 : 1,
              cursor: historyPage === 1 ? "not-allowed" : "pointer"
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Page {historyPage} of {totalHistoryPages} (Total {filteredHistory?.length || 0} logs)
          </span>
          <button
            className="btn-secondary"
            onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
            disabled={historyPage === totalHistoryPages}
            style={{
              padding: "6px 12px",
              opacity: historyPage === totalHistoryPages ? 0.5 : 1,
              cursor: historyPage === totalHistoryPages ? "not-allowed" : "pointer"
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
