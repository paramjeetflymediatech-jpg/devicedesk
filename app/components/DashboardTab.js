"use client";

import React from "react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";

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
  // Chart Colors
  const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  // Data mapping for Recharts
  const ramData = chartEntries.map(([name, value]) => ({ name, value }));

  const openCount = activeTickets.filter(t => t.status === "Open").length;
  const inProgressCount = activeTickets.filter(t => t.status === "In Progress").length;
  const resolvedCount = resolvedTickets ? resolvedTickets.length : 0;

  const ticketData = [
    { name: "Open", value: openCount, color: "#ef4444" },
    { name: "In Progress", value: inProgressCount, color: "#f59e0b" },
    { name: "Resolved", value: resolvedCount, color: "#10b981" }
  ].filter(d => d.value > 0);

  return (
    <div className="page-section active space-y-6">
      {/* Test Mode Banner */}
      <div className="test-mode-banner" style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="test-mode-text">
          <strong style={{ color: "var(--accent-purple)", fontSize: "1.1rem" }}>Fast Alert Test Mode</strong>
          <div className="test-mode-subtext" style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Shorten warning beep interval from 15 mins to 30 seconds for quick testing.
          </div>
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

      {/* Graphical Metrics Grid */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(10px)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "50px", height: "50px", background: "var(--accent-cyan)", filter: "blur(30px)", opacity: "0.2" }}></div>
          <span className="stat-label" style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Total Systems</span>
          <span className="stat-value" style={{ display: "block", fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)" }}>{stats.totalSystems}</span>
        </div>
        <div className="stat-card purple" style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(10px)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "50px", height: "50px", background: "var(--accent-purple)", filter: "blur(30px)", opacity: "0.2" }}></div>
          <span className="stat-label" style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Active Assignments</span>
          <span className="stat-value" style={{ display: "block", fontSize: "2rem", fontWeight: "700", color: "var(--accent-purple)" }}>{stats.activeAssignments}</span>
        </div>
        <div className="stat-card orange" style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(10px)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "50px", height: "50px", background: "var(--accent-orange)", filter: "blur(30px)", opacity: "0.2" }}></div>
          <span className="stat-label" style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Pending Complaints</span>
          <span className="stat-value" style={{ display: "block", fontSize: "2rem", fontWeight: "700", color: "var(--accent-orange)" }}>{stats.pendingComplaints}</span>
        </div>
        <div className="stat-card green" style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(10px)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "50px", height: "50px", background: "var(--accent-green)", filter: "blur(30px)", opacity: "0.2" }}></div>
          <span className="stat-label" style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Avg Resolve Time</span>
          <span className="stat-value" style={{ display: "block", fontSize: "1.5rem", fontWeight: "700", color: "var(--accent-green)" }}>{stats.avgResolutionTimeStr}</span>
        </div>
      </div>

      {/* Graphical Charts Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        
        {/* RAM Distribution Chart */}
        <div className="panel-card" style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "20px", border: "1px solid var(--glass-border)" }}>
          <div className="panel-header" style={{ marginBottom: "1rem" }}>
            <span className="panel-title" style={{ fontSize: "1.1rem", fontWeight: "600" }}>Hardware Distribution (RAM)</span>
          </div>
          <div style={{ height: "300px", width: "100%" }}>
            {ramData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ramData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={80} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="value" name="Systems" radius={[0, 4, 4, 0]}>
                    {ramData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-muted)" }}>No hardware data available</div>
            )}
          </div>
        </div>

        {/* Ticket Status Breakdown Chart */}
        <div className="panel-card" style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "20px", border: "1px solid var(--glass-border)" }}>
          <div className="panel-header" style={{ marginBottom: "1rem" }}>
            <span className="panel-title" style={{ fontSize: "1.1rem", fontWeight: "600" }}>Ticket Status Breakdown</span>
          </div>
          <div style={{ height: "300px", width: "100%" }}>
            {ticketData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {ticketData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-muted)" }}>No active or resolved tickets</div>
            )}
          </div>
        </div>

      </div>

      {/* Tickets Split View */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        
        {/* Left: Active Complaints Queue */}
        <div className="panel-card" style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "20px", border: "1px solid var(--glass-border)" }}>
          <div className="panel-header" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
            <span className="panel-title" style={{ fontSize: "1.1rem", fontWeight: "600" }}>Active Complaints Queue</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "12px" }}>Sorted by Severity</span>
          </div>
          <div className="ticket-list" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "500px", overflowY: "auto", paddingRight: "8px" }}>
            {activeTickets.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem 1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: "12px", border: "1px dashed rgba(16, 185, 129, 0.2)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✨</div>
                No active complaints. System functioning normally!
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
                  <div className="ticket-item" key={ticket.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "16px", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}>
                    <div className="ticket-details" style={{ width: "100%" }}>
                      <div className="ticket-meta" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px", alignItems: "center" }}>
                        <span className={`status-tag ${ticket.status.toLowerCase().replace(" ", "")}`}>
                          {ticket.status}
                        </span>
                        <span className={`status-tag ${ticket.severity.toLowerCase()}`}>
                          {ticket.severity}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          <strong style={{ color: "var(--text-primary)" }}>{sys ? sys.systemNumber : "N/A"}</strong> — {emp ? emp.name : "Unknown"}
                        </span>
                      </div>
                      <div className="ticket-desc" style={{ fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "12px" }}>{ticket.description}</div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span className={timerClass} style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "currentColor", animation: "pulse 2s infinite" }}></span>
                            {elapsedLabel}{activeElapsedStr}
                          </span>
                        </div>
                        <div className="ticket-actions">
                          {isOpen ? (
                            <button className="btn-action start" onClick={() => handleStartTicket(ticket.id)} style={{ background: "var(--accent-orange)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>
                              Start Work
                            </button>
                          ) : (
                            <button className="btn-action resolve" onClick={() => handleOpenResolveModal(ticket.id)} style={{ background: "var(--accent-green)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recently Resolved Tickets */}
        <div className="panel-card" style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "20px", border: "1px solid var(--glass-border)" }}>
          <div className="panel-header" style={{ marginBottom: "1rem" }}>
            <span className="panel-title" style={{ fontSize: "1.1rem", fontWeight: "600" }}>Recently Resolved</span>
          </div>
          <div className="ticket-list" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "500px", overflowY: "auto", paddingRight: "8px" }}>
            {!resolvedTickets || resolvedTickets.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem 1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "12px", border: "1px dashed var(--glass-border)" }}>
                No tickets resolved yet.
              </div>
            ) : (
              resolvedTickets.slice(0, 5).map(ticket => {
                const sys = systems.find(s => s.id === ticket.systemId);
                const emp = employees.find(e => e.id === ticket.employeeId);
                const timings = getTicketTimings(ticket);

                return (
                  <div className="ticket-item" key={ticket.id} style={{ background: "rgba(16, 185, 129, 0.03)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "12px", padding: "16px", opacity: 0.9 }}>
                    <div className="ticket-details" style={{ width: "100%" }}>
                      <div className="ticket-meta" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px", alignItems: "center" }}>
                        <span className={`status-tag resolved`} style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-green)", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }}>
                          ✓ Resolved
                        </span>
                        <span className={`status-tag ${ticket.severity.toLowerCase()}`}>
                          {ticket.severity}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          <strong style={{ color: "var(--text-primary)" }}>{sys ? sys.systemNumber : "N/A"}</strong> — {emp ? emp.name : "Unknown"}
                        </span>
                      </div>
                      <div className="ticket-desc" style={{ fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "8px" }}>
                        <strong>Issue:</strong> {ticket.description}
                      </div>
                      <div className="ticket-desc" style={{ color: "var(--accent-green)", fontStyle: "italic", padding: "8px 12px", background: "rgba(16, 185, 129, 0.08)", borderRadius: "8px", fontSize: "0.85rem" }}>
                        <strong>Resolution Notes:</strong> {ticket.notes || "No notes provided."}
                      </div>
                      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--accent-green)", fontWeight: "600" }}>
                          Time to Resolve: {timings.resolutionTimeStr}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleTimeString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
