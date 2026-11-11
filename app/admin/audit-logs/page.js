'use client';
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FiShield,
  FiActivity,
  FiArrowLeft,
  FiSearch,
  FiFilter,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiLock,
  FiKey,
  FiGlobe,
  FiMonitor,
  FiRefreshCw,
  FiEye,
  FiClock,
  FiLayers,
  FiX
} from "react-icons/fi";
import Pagination from "../../components/Pagination";

export default function AdminAuditLogsPage() {
  const [activeTab, setActiveTab] = useState("security"); // "security" | "submissions"

  // Security Logs State
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [securitySearch, setSecuritySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [selectedIpFilter, setSelectedIpFilter] = useState("");
  const [securityPage, setSecurityPage] = useState(1);
  const [securityLimit, setSecurityLimit] = useState(25);
  const [securityPagination, setSecurityPagination] = useState({ total: 0, totalPages: 1 });
  const [securityStats, setSecurityStats] = useState({
    failedLogins24h: 0,
    passwordResets24h: 0,
    blockedAttempts24h: 0,
    suspiciousIps: []
  });
  const [activeDetailLog, setActiveDetailLog] = useState(null);

  // Submissions Logs State (Legacy trail)
  const [submissionLogs, setSubmissionLogs] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionPageSize, setSubmissionPageSize] = useState(10);

  // Fetch Security Logs
  const fetchSecurityLogs = useCallback(async () => {
    setLoadingSecurity(true);
    try {
      const params = new URLSearchParams({
        page: String(securityPage),
        limit: String(securityLimit)
      });
      if (selectedCategory && selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (selectedStatus && selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (selectedTimeframe && selectedTimeframe !== "all") params.set("timeframe", selectedTimeframe);
      if (selectedIpFilter) params.set("ip", selectedIpFilter);
      if (securitySearch) params.set("search", securitySearch);

      const res = await fetch(`/api/admin/security-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSecurityLogs(data.data || []);
        setSecurityPagination(data.pagination || { total: 0, totalPages: 1 });
        if (data.stats) setSecurityStats(data.stats);
      }
    } catch (err) {
      console.error("Error loading security audit logs:", err);
    } finally {
      setLoadingSecurity(false);
    }
  }, [securityPage, securityLimit, selectedCategory, selectedStatus, selectedTimeframe, selectedIpFilter, securitySearch]);

  // Fetch Submissions Logs
  const fetchSubmissionLogs = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch("/api/reports/audit-logs");
      const data = await res.json();
      if (data.success) setSubmissionLogs(data.data || []);
    } catch (err) {
      console.error("Error loading submission logs:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityLogs();
  }, [fetchSecurityLogs]);

  useEffect(() => {
    if (activeTab === "submissions" && submissionLogs.length === 0) {
      fetchSubmissionLogs();
    }
  }, [activeTab, submissionLogs.length, fetchSubmissionLogs]);

  // Filter Submissions Logs locally
  const filteredSubmissionLogs = submissionLogs.filter((log) => {
    const q = submissionSearch.toLowerCase();
    const entity = String(log.submission_id || "").toLowerCase();
    const changer = String(log.employee_name || log.changed_by || "").toLowerCase();
    const status = String(log.new_status || "").toLowerCase();
    const notes = String(log.comment || "").toLowerCase();
    return entity.includes(q) || changer.includes(q) || status.includes(q) || notes.includes(q);
  });

  const submissionTotalPages = Math.ceil(filteredSubmissionLogs.length / submissionPageSize) || 1;
  const safeSubmissionPage = Math.min(Math.max(1, submissionPage), submissionTotalPages);
  const paginatedSubmissionLogs = filteredSubmissionLogs.slice((safeSubmissionPage - 1) * submissionPageSize, safeSubmissionPage * submissionPageSize);

  // Helper for Status Badge styling
  const getStatusBadge = (status) => {
    const s = String(status || "INFO").toUpperCase();
    if (s === "SUCCESS") {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
          <FiCheckCircle size={12} /> SUCCESS
        </span>
      );
    }
    if (s === "FAILURE" || s === "FAILED") {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          <FiXCircle size={12} /> FAILED
        </span>
      );
    }
    if (s === "BLOCKED") {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
          <FiLock size={12} /> BLOCKED
        </span>
      );
    }
    if (s === "CRITICAL") {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(220, 38, 38, 0.2)", color: "#f87171", border: "1px solid rgba(220, 38, 38, 0.4)" }}>
          <FiAlertTriangle size={12} /> CRITICAL
        </span>
      );
    }
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", border: "1px solid rgba(148, 163, 184, 0.3)" }}>
        {s}
      </span>
    );
  };

  // Helper for Category styling
  const getCategoryBadge = (cat) => {
    const c = String(cat || "SECURITY").toUpperCase();
    let bg = "rgba(100, 116, 139, 0.15)";
    let color = "#94a3b8";
    if (c === "AUTH") {
      bg = "rgba(6, 182, 212, 0.15)";
      color = "#06b6d4";
    } else if (c === "PASSWORD_RESET") {
      bg = "rgba(168, 85, 247, 0.15)";
      color = "#c084fc";
    } else if (c === "ADMIN_PANEL") {
      bg = "rgba(59, 130, 246, 0.15)";
      color = "#60a5fa";
    } else if (c === "ACCESS_CONTROL") {
      bg = "rgba(245, 158, 11, 0.15)";
      color = "#fbbf24";
    } else if (c === "DANGER_ZONE") {
      bg = "rgba(239, 68, 68, 0.2)";
      color = "#f87171";
    }
    return (
      <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, background: bg, color }}>
        {c}
      </span>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1350px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> Back to Dashboard
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiShield style={{ color: "#06b6d4" }} /> Security Audit & Activity Logs
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              Real-time security auditing: login attempts, password resets, admin panel actions, network forensics & IP tracing.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => {
                if (activeTab === "security") fetchSecurityLogs();
                else fetchSubmissionLogs();
              }}
              className="btn-action"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                color: "#f8fafc",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              <FiRefreshCw className={loadingSecurity || loadingSubmissions ? "animate-spin" : ""} /> Refresh Logs
            </button>
          </div>
        </div>

        {/* Security Metric Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>
              <span>Total Audit Events</span>
              <FiLayers style={{ color: "#06b6d4" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.5rem", color: "#f8fafc" }}>
              {securityPagination.total || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Registered system security events</div>
          </div>

          <div style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "14px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f87171", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>
              <span>Failed Logins (24h)</span>
              <FiXCircle style={{ color: "#ef4444" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.5rem", color: "#ef4444" }}>
              {securityStats.failedLogins24h || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#fca5a5", marginTop: "4px" }}>Wrong password or bad username</div>
          </div>

          <div style={{ background: "rgba(168, 85, 247, 0.06)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "14px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#c084fc", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>
              <span>Password Resets (24h)</span>
              <FiKey style={{ color: "#a855f7" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.5rem", color: "#c084fc" }}>
              {securityStats.passwordResets24h || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#d8b4fe", marginTop: "4px" }}>Dispatches & token validations</div>
          </div>

          <div style={{ background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "14px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fbbf24", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>
              <span>Blocked Attempts (24h)</span>
              <FiLock style={{ color: "#f59e0b" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.5rem", color: "#fbbf24" }}>
              {securityStats.blockedAttempts24h || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#fde68a", marginTop: "4px" }}>Paused or inactive accounts</div>
          </div>
        </div>

        {/* Suspicious IP Alert Banner */}
        {securityStats.suspiciousIps && securityStats.suspiciousIps.length > 0 && (
          <div style={{ marginBottom: "1.5rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "14px", padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ef4444", fontWeight: 700, fontSize: "0.95rem" }}>
              <FiAlertTriangle /> High-Priority Security Warning: Repeated Failed Attempts Detected
            </div>
            <p style={{ color: "#fca5a5", fontSize: "0.825rem", margin: "6px 0 10px 0" }}>
              The following IP addresses have recorded 3 or more failed or blocked login attempts in the past 24 hours:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {securityStats.suspiciousIps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedIpFilter(s.ip);
                    setSecurityPage(1);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fee2e2",
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  <FiGlobe size={13} />
                  <strong>{s.ip}</strong> ({s.country || "Unknown"}) — {s.attempts} attempts
                  <span style={{ fontSize: "0.7rem", color: "#f87171" }}>Filter &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", marginBottom: "1.5rem" }}>
          <button
            onClick={() => setActiveTab("security")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "security" ? "3px solid #06b6d4" : "3px solid transparent",
              color: activeTab === "security" ? "#06b6d4" : "#94a3b8",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <FiShield /> Security & Auth Audit Logs
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "submissions" ? "3px solid #06b6d4" : "3px solid transparent",
              color: activeTab === "submissions" ? "#06b6d4" : "#94a3b8",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <FiActivity /> Task Submissions Trail
          </button>
        </div>

        {/* TAB 1: SECURITY AUDIT LOGS */}
        {activeTab === "security" && (
          <div>
            {/* Filter Bar */}
            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                
                {/* Search */}
                <div style={{ position: "relative", flex: "1 1 240px" }}>
                  <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                  <input
                    type="text"
                    placeholder="Search IP, user email, identifier, action..."
                    value={securitySearch}
                    onChange={(e) => {
                      setSecuritySearch(e.target.value);
                      setSecurityPage(1);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                {/* Category Dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSecurityPage(1);
                    }}
                    style={{
                      background: "#1e293b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      fontSize: "0.85rem"
                    }}
                  >
                    <option value="ALL">All Categories</option>
                    <option value="AUTH">Authentication (Logins & 2FA)</option>
                    <option value="PASSWORD_RESET">Password Resets</option>
                    <option value="ADMIN_PANEL">Admin Panel Actions</option>
                    <option value="ACCESS_CONTROL">Access Control & Blocks</option>
                    <option value="DANGER_ZONE">Danger Zone Purges</option>
                  </select>
                </div>

                {/* Status Dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Status:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setSecurityPage(1);
                    }}
                    style={{
                      background: "#1e293b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      fontSize: "0.85rem"
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="FAILURE">Failed Attempts</option>
                    <option value="BLOCKED">Blocked Accounts</option>
                    <option value="SUCCESS">Success Only</option>
                    <option value="WARNING">Warnings</option>
                    <option value="CRITICAL">Critical Events</option>
                  </select>
                </div>

                {/* Timeframe Dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Time:</span>
                  <select
                    value={selectedTimeframe}
                    onChange={(e) => {
                      setSelectedTimeframe(e.target.value);
                      setSecurityPage(1);
                    }}
                    style={{
                      background: "#1e293b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      fontSize: "0.85rem"
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today Only</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>

                {/* Clear IP filter pill if active */}
                {selectedIpFilter && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(6, 182, 212, 0.2)", border: "1px solid rgba(6, 182, 212, 0.4)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", color: "#67e8f9" }}>
                    <span>IP: <strong>{selectedIpFilter}</strong></span>
                    <button
                      onClick={() => {
                        setSelectedIpFilter("");
                        setSecurityPage(1);
                      }}
                      style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Security Audit Table */}
            <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.08))", borderRadius: "14px", overflow: "hidden" }}>
              <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left", fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 14px" }}>Timestamp</th>
                    <th style={{ padding: "12px 14px" }}>Action & Category</th>
                    <th style={{ padding: "12px 14px" }}>User / Identifier</th>
                    <th style={{ padding: "12px 14px" }}>Network & IP</th>
                    <th style={{ padding: "12px 14px" }}>Browser & System</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSecurity ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                        <FiRefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 8px auto" }} />
                        <div>Loading security audit records...</div>
                      </td>
                    </tr>
                  ) : securityLogs.length > 0 ? (
                    securityLogs.map((log) => {
                      const isFail = log.status === "FAILURE" || log.status === "BLOCKED";
                      return (
                        <tr
                          key={log.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            background: isFail ? "rgba(239, 68, 68, 0.03)" : "transparent"
                          }}
                        >
                          <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                            <div style={{ color: "#f8fafc", fontWeight: 600 }}>
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {new Date(log.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f1f5f9" }}>
                              {log.action}
                            </div>
                            <div style={{ marginTop: "4px" }}>
                              {getCategoryBadge(log.category)}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f8fafc" }}>
                              {log.user_name || log.identifier || "—"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {log.user_role ? `${log.user_role}` : log.identifier && log.user_name ? log.identifier : "Unauthenticated"}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#38bdf8", fontWeight: 600 }}>
                                {log.ip_address || "127.0.0.1"}
                              </span>
                              {log.country && (
                                <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.1)", padding: "1px 5px", borderRadius: "4px", color: "#cbd5e1" }}>
                                  {log.country}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedIpFilter(log.ip_address);
                                setSecurityPage(1);
                              }}
                              style={{ background: "none", border: "none", padding: 0, color: "#94a3b8", fontSize: "0.7rem", cursor: "pointer", textDecoration: "underline", marginTop: "2px" }}
                            >
                              Trace IP history
                            </button>
                          </td>

                          <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "#cbd5e1" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <FiMonitor size={13} style={{ color: "#94a3b8" }} />
                              <span>{log.browser || "Unknown"}</span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                              {log.os || "Unknown OS"} • {log.device || "Desktop"}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            {getStatusBadge(log.status)}
                          </td>

                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <button
                              onClick={() => setActiveDetailLog(log)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 10px",
                                background: "rgba(6, 182, 212, 0.12)",
                                border: "1px solid rgba(6, 182, 212, 0.3)",
                                color: "#22d3ee",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              <FiEye size={12} /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                        <FiCheckCircle size={32} style={{ color: "#10b981", margin: "0 auto 8px auto" }} />
                        <div style={{ fontWeight: 600, color: "#cbd5e1" }}>No security events matching this criteria.</div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>All logins and activity within this filter are clear.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Security Logs */}
            <div style={{ marginTop: "1rem" }}>
              <Pagination
                currentPage={securityPage}
                totalPages={securityPagination.totalPages}
                totalItems={securityPagination.total}
                pageSize={securityLimit}
                onPageChange={setSecurityPage}
                onPageSizeChange={(newSize) => {
                  setSecurityLimit(newSize);
                  setSecurityPage(1);
                }}
                itemName="security logs"
              />
            </div>
          </div>
        )}

        {/* TAB 2: TASK SUBMISSIONS TRAIL (Legacy) */}
        {activeTab === "submissions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ position: "relative", minWidth: "280px" }}>
                <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Search task submissions..."
                  value={submissionSearch}
                  onChange={(e) => {
                    setSubmissionSearch(e.target.value);
                    setSubmissionPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 36px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem"
                  }}
                />
              </div>
            </div>

            <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", overflow: "hidden" }}>
              <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left", fontSize: "0.8rem", color: "#94a3b8" }}>
                    <th style={{ padding: "12px 14px" }}>Timestamp</th>
                    <th style={{ padding: "12px 14px" }}>Submission / Entity</th>
                    <th style={{ padding: "12px 14px" }}>Changed By</th>
                    <th style={{ padding: "12px 14px" }}>Status Change</th>
                    <th style={{ padding: "12px 14px" }}>Notes</th>
                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSubmissions ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        Loading audit trail...
                      </td>
                    </tr>
                  ) : paginatedSubmissionLogs.length > 0 ? (
                    paginatedSubmissionLogs.map((log) => {
                      const logSlug = `log-${log.id}`;
                      return (
                        <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "#94a3b8" }}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 600 }}>{log.submission_id}</td>
                          <td style={{ padding: "12px 14px" }}>{log.employee_name || log.changed_by}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ color: "#64748b", marginRight: "4px" }}>{log.old_status || "None"}</span>
                            &rarr; <span style={{ color: "#06b6d4", fontWeight: 600 }}>{log.new_status}</span>
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: "#94a3b8" }}>{log.comment || "—"}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <Link href={`/admin/audit-logs/${logSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                              View &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        {submissionSearch ? "No submission logs matching search criteria." : "No submission records registered yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <Pagination
                currentPage={safeSubmissionPage}
                totalPages={submissionTotalPages}
                totalItems={filteredSubmissionLogs.length}
                pageSize={submissionPageSize}
                onPageChange={setSubmissionPage}
                onPageSizeChange={(newSize) => {
                  setSubmissionPageSize(newSize);
                  setSubmissionPage(1);
                }}
                itemName="submissions"
              />
            </div>
          </div>
        )}

        {/* Detailed Inspection Modal */}
        {activeDetailLog && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "1rem"
            }}
          >
            <div
              style={{
                background: "#0f172a",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "650px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                padding: "1.5rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "12px", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiShield style={{ color: "#06b6d4" }} />
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Security Audit Forensics</h3>
                </div>
                <button
                  onClick={() => setActiveDetailLog(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                >
                  <FiX size={18} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem", fontSize: "0.85rem" }}>
                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>Event Action</div>
                  <div style={{ fontWeight: 700, color: "#f8fafc", marginTop: "2px" }}>{activeDetailLog.action}</div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>Status & Severity</div>
                  <div style={{ marginTop: "2px" }}>{getStatusBadge(activeDetailLog.status)}</div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>Target / Identifier</div>
                  <div style={{ fontWeight: 600, color: "#f8fafc", marginTop: "2px" }}>
                    {activeDetailLog.user_name || activeDetailLog.identifier || "None"}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>Role / Account Type</div>
                  <div style={{ color: "#cbd5e1", marginTop: "2px" }}>{activeDetailLog.user_role || "Unauthenticated User"}</div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>IP Address</div>
                  <div style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 700, marginTop: "2px" }}>
                    {activeDetailLog.ip_address} {activeDetailLog.country ? `(${activeDetailLog.country})` : ""}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>Timestamp</div>
                  <div style={{ color: "#cbd5e1", marginTop: "2px" }}>{new Date(activeDetailLog.created_at).toLocaleString()}</div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>Browser & Engine</div>
                  <div style={{ color: "#cbd5e1", marginTop: "2px" }}>{activeDetailLog.browser || "Unknown"}</div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>Operating System & Device</div>
                  <div style={{ color: "#cbd5e1", marginTop: "2px" }}>{activeDetailLog.os || "Unknown"} ({activeDetailLog.device || "Desktop"})</div>
                </div>
              </div>

              {/* Parsed JSON Details */}
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "6px" }}>Detailed Audit Payload</div>
                <pre
                  style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "12px",
                    color: "#a5f3fc",
                    fontSize: "0.8rem",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all"
                  }}
                >
                  {(() => {
                    try {
                      const parsed = JSON.parse(activeDetailLog.details);
                      return JSON.stringify(parsed, null, 2);
                    } catch (e) {
                      return activeDetailLog.details || "No additional metadata recorded.";
                    }
                  })()}
                </pre>
              </div>

              {/* Raw User Agent */}
              <div>
                <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "4px" }}>Raw User-Agent Header</div>
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    wordBreak: "break-all"
                  }}
                >
                  {activeDetailLog.user_agent || "Not provided"}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button
                  onClick={() => setActiveDetailLog(null)}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Close Forensics
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
