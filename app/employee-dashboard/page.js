"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { getSystems, getTickets, getEmployees, getAssignmentHistory } from "../store";
import AttendanceWidget from "../components/AttendanceWidget.js";
import { FiMonitor, FiPieChart, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";

export default function OverviewPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);

  const refreshData = () => {
    setSystems(getSystems());
    setTickets(getTickets());
    setEmployees(getEmployees());
    setAssignmentHistory(getAssignmentHistory());
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  // Listen for database changes to keep sync
  useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener("devicedesk_db_synced", handleSync);
    return () => window.removeEventListener("devicedesk_db_synced", handleSync);
  }, []);

  if (!mounted || !user) return null;

  const activeSystems = systems.filter((s) => s.assignedTo === user.id);
  const empDetails = employees.find((e) => e.id === user.id) || user;
  const ticketLimit = empDetails.ticketLimit || 5;
  const employeeTickets = tickets.filter((t) => t.employeeId === user.id);
  const totalRaised = employeeTickets.length;
  const remainingTickets = Math.max(0, ticketLimit - totalRaised);
  const isLimitReached = totalRaised >= ticketLimit;
  const empHistory = assignmentHistory.filter((h) => h.employeeId === user.id);

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto" }}>
      <div className="page-section active space-y-6">
        {/* Quick Attendance Widget */}
        <AttendanceWidget user={user} />

        <div className="emp-overview-grid">
          {/* Active System Details */}
          <div className="emp-card">
            <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiMonitor /> Assigned System Info
            </h3>
            {activeSystems.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                No hardware system assigned to you at the moment.
              </p>
            ) : (
              activeSystems.map((sys) => (
                <div key={sys.id} className="emp-system-grid">
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>System Number:</span>
                    <p style={{ fontWeight: "600", color: "var(--accent-cyan)", fontSize: "1.1rem" }}>
                      {sys.systemNumber}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Model:</span>
                    <p style={{ fontWeight: "600" }}>{sys.model}</p>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>CPU:</span>
                    <p style={{ fontWeight: "600" }}>{sys.cpu}</p>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>RAM:</span>
                    <p style={{ fontWeight: "600" }}>{sys.ram}</p>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Storage:</span>
                    <p style={{ fontWeight: "600" }}>{sys.storage}</p>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>OS:</span>
                    <p style={{ fontWeight: "600" }}>{sys.os}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Limits and history stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Complaint limits */}
            <div className="emp-card">
              <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiPieChart /> Complaint Limits
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>Tickets Raised:</span>
                <span style={{ fontWeight: "700" }}>{totalRaised} / {ticketLimit}</span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: "10px",
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "5px",
                  overflow: "hidden",
                  marginBottom: "1rem",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (totalRaised / ticketLimit) * 100)}%`,
                    background: isLimitReached
                      ? "var(--status-critical)"
                      : "linear-gradient(to right, var(--accent-cyan), var(--accent-purple))",
                    borderRadius: "5px",
                    transition: "width 0.5s ease"
                  }}
                />
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4", display: "flex", alignItems: "center", gap: "6px" }}>
                {isLimitReached
                  ? <> <FiAlertTriangle style={{ color: "var(--status-critical)" }} /> You have reached your issue limits. Please contact IT support to extend your limit if necessary.</>
                  : `You can raise ${remainingTickets} more complaint ticket(s) before reaching your limit.`}
              </p>
            </div>

            {/* System Change history */}
            <div className="emp-card" style={{ maxHeight: "300px", overflowY: "auto" }}>
              <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiRefreshCw /> System Assignment History
              </h3>
              {empHistory.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.9rem" }}>
                  No assignment logs found.
                </p>
              ) : (
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {empHistory.map((h) => (
                    <li
                      key={h.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        fontSize: "0.85rem",
                        borderBottom: "1px dashed rgba(255,255,255,0.05)",
                        paddingBottom: "0.5rem"
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: h.action.includes("Assigned") ? "var(--status-resolved)" : "var(--status-critical)",
                            fontWeight: "600",
                            marginRight: "0.5rem"
                          }}
                        >
                          {h.action}
                        </span>
                        <span>
                          System: <strong>{h.systemNumber}</strong>
                        </span>
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {new Date(h.timestamp).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
