"use client";

import React from "react";

export default function SystemHistoryModal({
  isHistoryModalOpen,
  setIsHistoryModalOpen,
  selectedHistorySys,
  handleDownloadSystemReport,
  assignmentHistory,
  employees,
  tickets
}) {
  if (!isHistoryModalOpen || !selectedHistorySys) return null;

  return (
    <div className="modal-overlay active">
      <div className="modal-card" style={{ maxWidth: "750px", width: "90%" }}>
        <div className="modal-header">
          <h3 className="modal-title">🖥️ System History: {selectedHistorySys.systemNumber}</h3>
          <button className="modal-close" onClick={() => setIsHistoryModalOpen(false)}>
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: "65vh", overflowY: "auto", paddingRight: "6px" }}>
          {/* Spec Overview */}
          <div className="panel-card" style={{ marginBottom: "15px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ margin: 0, color: "var(--accent-cyan)", fontSize: "1.1rem" }}>
                  {selectedHistorySys.model || "Generic PC"}
                </h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  CPU: {selectedHistorySys.cpu} | GPU: {selectedHistorySys.gpu || "Integrated"} | RAM:{" "}
                  {selectedHistorySys.ram} | Storage: {selectedHistorySys.storage} | OS: {selectedHistorySys.os}
                </p>
              </div>
              <button
                onClick={() => handleDownloadSystemReport(selectedHistorySys)}
                className="btn-action start"
                style={{ padding: "8px 14px", background: "var(--accent-cyan)", color: "#000" }}
              >
                📥 Download Report
              </button>
            </div>
          </div>

          {/* Assignment logs section */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ borderBottom: "1px solid #30363d", paddingBottom: "6px", marginBottom: "10px" }}>
              Assignment History Logs
            </h4>
            {assignmentHistory.filter(h => h.systemId === selectedHistorySys.id).length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No assignment logs recorded for this machine.
              </p>
            ) : (
              <div className="table-wrapper" style={{ maxHeight: "180px", overflowY: "auto" }}>
                <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Team Member</th>
                      <th>Timestamp</th>
                      <th>Assigned By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentHistory
                      .filter(h => h.systemId === selectedHistorySys.id)
                      .map(log => {
                        const emp = employees.find(e => e.id === log.employeeId);
                        return (
                          <tr key={log.id}>
                            <td>
                              <span
                                className={`status-tag ${
                                  log.action.toLowerCase() === "assigned" ? "resolved" : "open"
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td>
                              <strong>{emp ? emp.name : "Unknown"}</strong>
                            </td>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                            <td>{log.assignedBy || "System"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Related Tickets section */}
          <div>
            <h4 style={{ borderBottom: "1px solid #30363d", paddingBottom: "6px", marginBottom: "10px" }}>
              Related IT Issues & Complaints
            </h4>
            {tickets.filter(t => t.systemId === selectedHistorySys.id).length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No issues raised for this machine.</p>
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
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets
                      .filter(t => t.systemId === selectedHistorySys.id)
                      .map(t => (
                        <tr key={t.id}>
                          <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{t.id}</td>
                          <td>{t.category}</td>
                          <td
                            style={{
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                            title={t.description}
                          >
                            {t.description}
                          </td>
                          <td>
                            <span className={`status-tag ${t.severity.toLowerCase()}`}>{t.severity}</span>
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
        </div>
      </div>
    </div>
  );
}
