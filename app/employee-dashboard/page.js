"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { getSystems, getTickets, getEmployees, getAssignmentHistory } from "../store";
import AttendanceWidget from "../components/AttendanceWidget.js";
import { FiMonitor, FiPieChart, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
import { FaWindows, FaUbuntu, FaApple } from "react-icons/fa";

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

  const [agentStatus, setAgentStatus] = useState({ installed: false, lastCapturedAt: null });
  const [showRedownload, setShowRedownload] = useState(false);

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

  useEffect(() => {
    async function checkAgentStatus() {
      if (!user) return;
      try {
        const empId = user.id || user.employeeId;
        const res = await fetch(`/api/screenshots/list?employeeId=${empId}&limit=1`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAgentStatus({ installed: true, lastCapturedAt: data.data[0].capturedAt });
        }
      } catch (err) {
        console.warn('Check agent status notice:', err);
      }
    }
    checkAgentStatus();
  }, [user]);

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

        {/* Option A: Employee ALREADY Has Desktop Agent Installed & Active */}
        {agentStatus.installed && !showRedownload ? (
          <div style={{
            backgroundColor: "var(--card-bg, #ffffff)",
            border: "1px solid #bbf7d0",
            borderRadius: "16px",
            padding: "20px 24px",
            margin: "24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: "0 4px 16px rgba(34,197,94,0.06)",
            background: "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(16,185,129,0.03) 100%)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "1 1 300px" }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
                flexShrink: 0
              }}>
                🛡️
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#14532d", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  DeviceDesk Desktop Agent Active
                  <span style={{ backgroundColor: "#dcfce7", color: "#15803d", fontSize: "0.72rem", padding: "3px 10px", borderRadius: "12px", fontWeight: "800", border: "1px solid #86efac" }}>
                    ● Live Sync Active
                  </span>
                </h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.86rem", color: "#166534" }}>
                  Your desktop agent is running in system tray. Last background capture recorded at <strong>{agentStatus.lastCapturedAt ? new Date(agentStatus.lastCapturedAt).toLocaleTimeString() : 'Recently'}</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRedownload(true)}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #16a34a",
                color: "#15803d",
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.83rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
              }}
            >
              🔄 Re-download / Change PC
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: "var(--card-bg, #ffffff)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: "16px",
            padding: "20px 24px",
            margin: "24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            background: "linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(124,58,237,0.04) 100%)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "1 1 300px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                flexShrink: 0
              }}>
                💻
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary, #0f172a)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  Download DeviceDesk Desktop Activity Agent
                  <span style={{ backgroundColor: "#dbeafe", color: "#1e40af", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>Cross-Platform</span>
                </h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.86rem", color: "var(--text-secondary, #64748b)" }}>
                  Install once on your computer to run continuous background desktop screen activity monitoring automatically.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <a
                href="/download/DeviceDeskAgent-Setup.exe"
                download="DeviceDeskAgent-Setup.exe"
                target="_blank"
                rel="noreferrer"
                title="Download for Windows"
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.84rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
                }}
              >
                <FaWindows style={{ fontSize: "1rem" }} /> Windows (.exe)
              </a>

              <a
                href="/download/DeviceDeskAgent.deb"
                download="DeviceDeskAgent.deb"
                target="_blank"
                rel="noreferrer"
                title="Download for Ubuntu / Debian Linux (.deb)"
                style={{
                  backgroundColor: "#e05206",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.84rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(224,82,6,0.3)"
                }}
              >
                <FaUbuntu style={{ fontSize: "1rem" }} /> Ubuntu (.deb)
              </a>

              <a
                href="/download/DeviceDeskAgent.dmg"
                download="DeviceDeskAgent.dmg"
                target="_blank"
                rel="noreferrer"
                title="Download for macOS"
                style={{
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.84rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(15,23,42,0.3)"
                }}
              >
                <FaApple style={{ fontSize: "1.05rem" }} /> macOS (.dmg)
              </a>

              {agentStatus.installed && (
                <button
                  onClick={() => setShowRedownload(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Hide
                </button>
              )}
            </div>
          </div>
        )}

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
