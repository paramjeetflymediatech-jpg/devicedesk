"use client";

import React from "react";

export default function DeviceDetailsModal({
  selectedViewSystem,
  setSelectedViewSystem,
  assignmentHistory,
  employees
}) {
  if (!selectedViewSystem) return null;

  const sysLogs = assignmentHistory.filter(h => h.systemId === selectedViewSystem.id);

  return (
    <div className="modal-overlay active">
      <div className="modal-card" style={{ maxWidth: "600px", width: "90%" }}>
        <div className="modal-header">
          <h3 className="modal-title">💻 Device Specification Details</h3>
          <button className="modal-close" onClick={() => setSelectedViewSystem(null)}>
            &times;
          </button>
        </div>
        <div style={{ color: "var(--text-primary)", padding: "1rem 0", maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>System Number:</strong>
              <span style={{ color: "var(--accent-blue)", fontWeight: "bold" }}>
                {selectedViewSystem.systemNumber}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>Model:</strong>
              <span>{selectedViewSystem.model}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>OS:</strong>
              <span>{selectedViewSystem.os}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>CPU:</strong>
              <span>{selectedViewSystem.cpu}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>GPU:</strong>
              <span>{selectedViewSystem.gpu || "N/A"}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>RAM:</strong>
              <span>{selectedViewSystem.ram}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>Storage:</strong>
              <span>{selectedViewSystem.storage}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>Status:</strong>
              <span
                className={`status-tag ${
                  selectedViewSystem.status === "Active" ? "resolved" : "progress"
                }`}
              >
                {selectedViewSystem.status}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem"
              }}
            >
              <strong style={{ color: "var(--text-muted)" }}>Remarks / Hardware Issues:</strong>
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  minHeight: "40px"
                }}
              >
                {selectedViewSystem.remarks || "No remarks or known hardware issues."}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.5rem" }}>
              <strong
                style={{
                  color: "var(--text-muted)",
                  borderBottom: "1px solid #30363d",
                  paddingBottom: "6px",
                  marginBottom: "8px"
                }}
              >
                📜 Device Assignment History (Past Users):
              </strong>
              {sysLogs.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0 }}>
                  No past assignment logs recorded for this machine.
                </p>
              ) : (
                <div
                  className="table-wrapper"
                  style={{ maxHeight: "150px", overflowY: "auto", marginTop: "4px" }}
                >
                  <table className="custom-table" style={{ fontSize: "0.8rem", width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Team Member</th>
                        <th>Timestamp</th>
                        <th>Assigned By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sysLogs.map(log => {
                        const emp = employees.find(e => e.id === log.employeeId);
                        return (
                          <tr key={log.id}>
                            <td>
                              <span
                                className={`status-tag ${
                                  log.action.toLowerCase() === "assigned" ? "resolved" : "open"
                                }`}
                                style={{ fontSize: "0.7rem", padding: "2px 6px" }}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td>
                              <strong style={{ fontSize: "0.8rem" }}>{emp ? emp.name : "Unknown"}</strong>
                            </td>
                            <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              {log.assignedBy || "System"}
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
        </div>
        <div
          style={{
            textAlign: "right",
            marginTop: "1rem",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "0.75rem"
          }}
        >
          <button className="btn-action start" onClick={() => setSelectedViewSystem(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
