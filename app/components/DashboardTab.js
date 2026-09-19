"use client";

import React from "react";

export default function DashboardTab({
  fastTestMode,
  handleFastTestToggle,
  stats,
  activeTickets,
  resolvedTickets,
  systems,
  employees,
  getTicketTimings,
  handleStartTicket,
  handleOpenResolveModal,
  chartEntries,
  maxCount
}) {
  return (
    <div className="page-section active space-y-6">
      {/* Test Mode Banner */}
      <div className="test-mode-banner">
        <div className="test-mode-text">
          <strong>Fast Alert Test Mode</strong>
          <span className="test-mode-subtext">
            Shorten warning beep interval from 15 mins to 30 seconds for quick testing.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--accent-purple)" }}>
            {fastTestMode ? "30 seconds" : "15 minutes"}
          </span>
          <label className="toggle-switch">
            <input type="checkbox" checked={fastTestMode} onChange={handleFastTestToggle} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Systems</span>
          <span className="stat-value">{stats.totalSystems}</span>
        </div>
        <div className="stat-card purple">
          <span className="stat-label">Active Assignments</span>
          <span className="stat-value">{stats.activeAssignments}</span>
        </div>
        <div className="stat-card orange">
          <span className="stat-label">Pending Complaints</span>
          <span className="stat-value">{stats.pendingComplaints}</span>
        </div>
        <div className="stat-card green">
          <span className="stat-label">Avg Resolve Time</span>
          <span className="stat-value">{stats.avgResolutionTimeStr}</span>
        </div>
      </div>

      {/* Split Screen */}
      <div className="dashboard-split">
        {/* Active Tickets Queue */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">Active Complaints Queue</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sorted by Severity</span>
          </div>
          <div className="ticket-list">
            {activeTickets.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                No active complaints. System functioning normally! ⚡
              </div>
            ) : (
              activeTickets.map(ticket => {
                const sys = systems.find(s => s.id === ticket.systemId);
                const emp = employees.find(e => e.id === ticket.employeeId);
                const timings = getTicketTimings(ticket);
                const isOpen = ticket.status === "Open";

                let timerClass = "timer-badge ticking";
                if (isOpen) {
                  const limit = fastTestMode ? 30 * 1000 : 15 * 60 * 1000;
                  const elapsed = Date.now() - new Date(ticket.createdAt).getTime();
                  if (elapsed >= limit) {
                    timerClass = "timer-badge alert-escalated";
                  }
                }

                const activeElapsedStr = isOpen ? timings.totalDowntimeStr : timings.resolutionTimeStr;
                const elapsedLabel = isOpen ? "Open: " : "Working: ";

                return (
                  <div className="ticket-item" key={ticket.id}>
                    <div className="ticket-details">
                      <div className="ticket-meta">
                        <span className={`status-tag ${ticket.status.toLowerCase().replace(" ", "")}`}>
                          {ticket.status}
                        </span>
                        <span className={`status-tag ${ticket.severity.toLowerCase()}`}>
                          {ticket.severity}
                        </span>
                        <span>
                          <strong>{sys ? sys.systemNumber : "N/A"}</strong> - {emp ? emp.name : "Unknown"}
                        </span>
                      </div>
                      <div className="ticket-desc">{ticket.description}</div>
                      <div style={{ marginTop: "6px", display: "flex", gap: "10px" }}>
                        <span className={timerClass}>
                          {elapsedLabel}
                          {activeElapsedStr}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Logged: {new Date(ticket.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="ticket-actions">
                      {isOpen ? (
                        <button className="btn-action start" onClick={() => handleStartTicket(ticket.id)}>
                          Start Work
                        </button>
                      ) : (
                        <button className="btn-action resolve" onClick={() => handleOpenResolveModal(ticket.id)}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recently Resolved Tickets */}
        {resolvedTickets && resolvedTickets.length > 0 && (
          <div className="panel-card" style={{ marginTop: "1rem" }}>
            <div className="panel-header">
              <span className="panel-title">Recently Resolved</span>
            </div>
            <div className="ticket-list">
              {resolvedTickets.slice(0, 5).map(ticket => {
                const sys = systems.find(s => s.id === ticket.systemId);
                const emp = employees.find(e => e.id === ticket.employeeId);
                const timings = getTicketTimings(ticket);

                return (
                  <div className="ticket-item" key={ticket.id} style={{ opacity: 0.85 }}>
                    <div className="ticket-details" style={{ width: "100%" }}>
                      <div className="ticket-meta">
                        <span className={`status-tag resolved`}>
                          Resolved
                        </span>
                        <span className={`status-tag ${ticket.severity.toLowerCase()}`}>
                          {ticket.severity}
                        </span>
                        <span>
                          <strong>{sys ? sys.systemNumber : "N/A"}</strong> - {emp ? emp.name : "Unknown"}
                        </span>
                      </div>
                      <div className="ticket-desc" style={{ marginBottom: "4px" }}>
                        <strong>Issue:</strong> {ticket.description}
                      </div>
                      <div className="ticket-desc" style={{ color: "var(--accent-green)", fontStyle: "italic", padding: "4px 8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px" }}>
                        <strong>Resolution Notes:</strong> {ticket.notes || "No notes provided."}
                      </div>
                      <div style={{ marginTop: "6px", display: "flex", gap: "10px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--accent-green)", fontWeight: "600" }}>
                          Time to Resolve: {timings.resolutionTimeStr}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Resolved At: {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleTimeString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RAM Capacity distribution charts */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">RAM Capacity Distribution</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {chartEntries.map(([ram, count]) => {
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div style={{ margin: "10px 0" }} key={ram}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                    <span>{ram}</span>
                    <span style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>
                      {count} system{count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "4px",
                      overflow: "hidden",
                      marginBottom: "6px"
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        background: "linear-gradient(to right, var(--accent-cyan), var(--accent-blue))",
                        borderRadius: "4px"
                      }}
                    ></div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {systems.filter(s => (s.ram || "Unknown") === ram).map(s => (
                      <span key={s.id} style={{ 
                        fontSize: "0.7rem", 
                        background: "rgba(6, 182, 212, 0.1)", 
                        color: "var(--accent-cyan)", 
                        padding: "2px 6px", 
                        borderRadius: "4px",
                        border: "1px solid rgba(6, 182, 212, 0.2)"
                      }}>
                        {s.systemNumber}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}
