"use client";

import React from "react";
import { FiEye, FiCheck, FiX } from "react-icons/fi";

export default function LeaveRequestsTab({
  leaveSummary,
  leaveRequests,
  leaveFilterStatus,
  setLeaveFilterStatus,
  leavePageSize,
  leaveCurrentPage,
  setLeaveCurrentPage,
  employees,
  setSelectedReasonModal,
  handleViewLeave,
  handleReviewLeave,
  leaveActionLoading
}) {
  return (
    <div className="page-section active">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem"
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.4rem", margin: 0 }}>📅 Leave Requests Management</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Manage and review team member leave applications
          </p>
        </div>
      </div>

      {/* Leave Statistics Summary Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem"
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--glass-border)",
            padding: "1.25rem",
            borderRadius: "12px",
            textAlign: "center"
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: "0 0 4px 0" }}>
            Total Applications
          </p>
          <p style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
            {leaveSummary?.total || 0}
          </p>
        </div>
        <div
          style={{
            background: "rgba(240, 136, 62, 0.1)",
            border: "1px solid rgba(240, 136, 62, 0.2)",
            padding: "1.25rem",
            borderRadius: "12px",
            textAlign: "center"
          }}
        >
          <p style={{ color: "#f0883e", fontSize: "0.8rem", margin: "0 0 4px 0" }}>Pending Review</p>
          <p style={{ fontSize: "1.8rem", fontWeight: "700", color: "#f0883e", margin: 0 }}>
            {leaveSummary?.pending || 0}
          </p>
        </div>
        <div
          style={{
            background: "rgba(46, 160, 67, 0.1)",
            border: "1px solid rgba(46, 160, 67, 0.2)",
            padding: "1.25rem",
            borderRadius: "12px",
            textAlign: "center"
          }}
        >
          <p style={{ color: "var(--status-resolved)", fontSize: "0.8rem", margin: "0 0 4px 0" }}>
            Approved Leaves
          </p>
          <p style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--status-resolved)", margin: 0 }}>
            {leaveSummary?.approved || 0}
          </p>
        </div>
        <div
          style={{
            background: "rgba(248, 81, 73, 0.1)",
            border: "1px solid rgba(248, 81, 73, 0.2)",
            padding: "1.25rem",
            borderRadius: "12px",
            textAlign: "center"
          }}
        >
          <p style={{ color: "var(--status-critical)", fontSize: "0.8rem", margin: "0 0 4px 0" }}>
            Rejected Leaves
          </p>
          <p style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--status-critical)", margin: 0 }}>
            {leaveSummary?.rejected || 0}
          </p>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.01)",
          border: "1px solid var(--glass-border)",
          padding: "12px 18px",
          borderRadius: "10px",
          marginBottom: "1rem"
        }}
      >
        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Showing {leaveRequests.length} leave application(s)
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Status Filter:</span>
          <select
            value={leaveFilterStatus}
            onChange={(e) => setLeaveFilterStatus(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              outline: "none",
              fontSize: "0.85rem"
            }}
          >
            <option value="ALL">All Status</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table Wrapper */}
      {leaveRequests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            background: "rgba(255,255,255,0.01)",
            borderRadius: "12px",
            border: "1px dashed var(--glass-border)",
            color: "var(--text-muted)"
          }}
        >
          <p style={{ fontSize: "1rem", margin: 0 }}>No leave applications found matching the filter.</p>
        </div>
      ) : (
        (() => {
          const totalLeavePages = Math.max(1, Math.ceil(leaveRequests.length / (leavePageSize || 10)));
          const safeLeavePage = Math.min(leaveCurrentPage || 1, totalLeavePages);
          const leaveStartIndex = (safeLeavePage - 1) * (leavePageSize || 10);
          const leaveEndIndex = Math.min(leaveStartIndex + (leavePageSize || 10), leaveRequests.length);
          const paginatedLeaveRequests = leaveRequests.slice(leaveStartIndex, leaveEndIndex);

          return (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Team Member</th>
                    <th>Leave Type</th>
                    <th>Dates & Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions / Review</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeaveRequests.map(req => {
                    const emp = employees.find(e => e.id === req.employeeId);
                    return (
                      <tr key={req.id}>
                        <td>
                          <strong>{req.employeeName}</strong>
                          {emp && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              {emp.role} • {emp.department}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{req.leaveType}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: "500" }}>
                            {req.fromDate} to {req.toDate}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Total: {req.totalDays} {req.totalDays === 1 ? "day" : "days"}
                          </div>
                        </td>
                        <td style={{ minWidth: "240px", maxWidth: "320px" }}>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                              lineHeight: "1.4"
                            }}
                          >
                            <div
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                wordBreak: "break-word"
                              }}
                            >
                              {req.reason || "No reason provided."}
                            </div>
                            {req.reason && (req.reason.length > 70 || req.reason.includes("\n")) && (
                              <button
                                onClick={() => setSelectedReasonModal(req)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#2563eb",
                                  fontSize: "0.78rem",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  padding: 0,
                                  marginTop: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                📄 Read Full Reason
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-badge badge-${
                              req.status === "Approved"
                                ? "resolved"
                                : req.status === "Rejected"
                                ? "critical"
                                : "progress"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {req.status === "Pending" ? (
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => handleViewLeave(req)}
                                className="btn-action"
                                title="View Details"
                                style={{
                                  padding: "6px 10px",
                                  background: "rgba(0, 240, 255, 0.15)",
                                  color: "var(--accent-cyan)",
                                  borderColor: "var(--accent-cyan)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <FiEye style={{ fontSize: "1rem" }} />
                              </button>
                              <button
                                onClick={() => handleReviewLeave(req.id, "Approved")}
                                disabled={leaveActionLoading === req.id}
                                className="btn-action resolve"
                                title="Approve"
                                style={{
                                  padding: "6px 10px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <FiCheck style={{ fontSize: "1.05rem" }} />
                              </button>
                              <button
                                onClick={() => handleReviewLeave(req.id, "Rejected")}
                                disabled={leaveActionLoading === req.id}
                                className="btn-action"
                                title="Reject"
                                style={{
                                  padding: "6px 10px",
                                  background: "rgba(239, 68, 68, 0.15)",
                                  color: "var(--status-critical)",
                                  borderColor: "var(--status-critical)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <FiX style={{ fontSize: "1.05rem" }} />
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                                justifyContent: "flex-end"
                              }}
                            >
                              <button
                                onClick={() => handleViewLeave(req)}
                                className="btn-action"
                                title="View Details"
                                style={{
                                  padding: "6px 10px",
                                  background: "rgba(0, 240, 255, 0.15)",
                                  color: "var(--accent-cyan)",
                                  borderColor: "var(--accent-cyan)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <FiEye style={{ fontSize: "1rem" }} />
                              </button>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "right" }}>
                                {req.status === "Rejected" && req.rejectionReason && (
                                  <div
                                    style={{
                                      color: "var(--status-critical)",
                                      fontSize: "0.75rem",
                                      fontStyle: "italic",
                                      marginBottom: "2px",
                                      maxWidth: "200px"
                                    }}
                                  >
                                    Reason: "{req.rejectionReason}"
                                  </div>
                                )}
                                <div>
                                  By {req.reviewedBy} on {new Date(req.reviewedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Leave Pagination Controls Bar */}
              {leaveRequests.length > 10 && (
                <div
                  className="pagination-controls"
                  style={{
                    padding: "1rem 1.5rem",
                    borderTop: "1px solid var(--glass-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    background: "rgba(0, 0, 0, 0.15)"
                  }}
                >
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>
                    Showing <strong style={{ color: "var(--text-primary)" }}>{leaveStartIndex + 1}</strong> to{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{leaveEndIndex}</strong> of{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{leaveRequests.length}</strong> leave applications
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={safeLeavePage <= 1}
                      onClick={() => setLeaveCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.82rem",
                        opacity: safeLeavePage <= 1 ? 0.5 : 1,
                        cursor: safeLeavePage <= 1 ? "not-allowed" : "pointer"
                      }}
                    >
                      ← Previous
                    </button>

                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                      Page {safeLeavePage} of {totalLeavePages}
                    </span>

                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={safeLeavePage >= totalLeavePages}
                      onClick={() => setLeaveCurrentPage(prev => Math.min(totalLeavePages, prev + 1))}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.82rem",
                        opacity: safeLeavePage >= totalLeavePages ? 0.5 : 1,
                        cursor: safeLeavePage >= totalLeavePages ? "not-allowed" : "pointer"
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
