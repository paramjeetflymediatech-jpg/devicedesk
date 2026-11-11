'use client';
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FiShield,
  FiActivity,
  FiArrowLeft,
  FiSearch,
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
  FiX,
  FiUser,
  FiChevronRight
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
  const renderStatusBadge = (status) => {
    const s = String(status || "INFO").toUpperCase();
    if (s === "SUCCESS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <FiCheckCircle size={12} /> SUCCESS
        </span>
      );
    }
    if (s === "FAILURE" || s === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <FiXCircle size={12} /> FAILED
        </span>
      );
    }
    if (s === "BLOCKED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <FiLock size={12} /> BLOCKED
        </span>
      );
    }
    if (s === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
          <FiAlertTriangle size={12} /> CRITICAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {s}
      </span>
    );
  };

  // Helper for Category styling
  const renderCategoryBadge = (cat) => {
    const c = String(cat || "SECURITY").toUpperCase();
    if (c === "AUTH") {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
          AUTH
        </span>
      );
    }
    if (c === "PASSWORD_RESET") {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          RESET
        </span>
      );
    }
    if (c === "ADMIN_PANEL") {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          ADMIN
        </span>
      );
    }
    if (c === "ACCESS_CONTROL") {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          SECURITY
        </span>
      );
    }
    if (c === "DANGER_ZONE") {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          DANGER
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {c}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-slate-900 dark:text-slate-100">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 text-xs font-semibold mb-2"
          >
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-xl shadow-md">
              <FiShield size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Security Audit & Activity Logs
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Track logins, password resets, admin panel actions, device forensics & IP activity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === "security") fetchSecurityLogs();
              else fetchSubmissionLogs();
            }}
            disabled={loadingSecurity || loadingSubmissions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={loadingSecurity || loadingSubmissions ? "animate-spin" : ""} size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Logged Events
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {securityPagination.total || 0}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Registered security actions
            </p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800">
            <FiLayers size={22} />
          </div>
        </div>

        {/* Failed Logins (24h) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Failed Logins (24h)
            </p>
            <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {securityStats.failedLogins24h || 0}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Wrong credentials provided
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800">
            <FiXCircle size={22} />
          </div>
        </div>

        {/* Password Resets (24h) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Password Resets (24h)
            </p>
            <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {securityStats.passwordResets24h || 0}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Reset requests & changes
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800">
            <FiKey size={22} />
          </div>
        </div>

        {/* Blocked Accounts (24h) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Blocked Attempts (24h)
            </p>
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {securityStats.blockedAttempts24h || 0}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Paused or inactive accounts
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
            <FiLock size={22} />
          </div>
        </div>
      </div>

      {/* Suspicious IP Warning Alert */}
      {securityStats.suspiciousIps && securityStats.suspiciousIps.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <FiAlertTriangle size={18} />
            <span>High-Priority Security Warning: Repeated Failed Attempts Detected</span>
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 mb-3">
            The following IP addresses have recorded 3 or more failed or blocked login attempts in the past 24 hours:
          </p>
          <div className="flex flex-wrap gap-2">
            {securityStats.suspiciousIps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedIpFilter(s.ip);
                  setSecurityPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 shadow-sm transition-all cursor-pointer"
              >
                <FiGlobe size={13} />
                <span>{s.ip} {s.country ? `(${s.country})` : ""}</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-[10px]">
                  {s.attempts} attempts
                </span>
                <FiChevronRight size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("security")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "security"
              ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FiShield size={16} />
          <span>Security & Auth Logs</span>
        </button>

        <button
          onClick={() => setActiveTab("submissions")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "submissions"
              ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FiActivity size={16} />
          <span>Task Submissions Trail</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SECURITY AUDIT LOGS */}
      {/* ======================================================== */}
      {activeTab === "security" && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search IP, user email, identifier, action..."
                  value={securitySearch}
                  onChange={(e) => {
                    setSecuritySearch(e.target.value);
                    setSecurityPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category */}
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSecurityPage(1);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="AUTH">Authentication (Logins & 2FA)</option>
                  <option value="PASSWORD_RESET">Password Resets</option>
                  <option value="ADMIN_PANEL">Admin Panel Actions</option>
                  <option value="ACCESS_CONTROL">Access Control & Blocks</option>
                  <option value="DANGER_ZONE">Danger Zone Purges</option>
                </select>

                {/* Status */}
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setSecurityPage(1);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="FAILURE">Failed Attempts</option>
                  <option value="BLOCKED">Blocked Accounts</option>
                  <option value="SUCCESS">Success Only</option>
                  <option value="CRITICAL">Critical Events</option>
                </select>

                {/* Timeframe */}
                <select
                  value={selectedTimeframe}
                  onChange={(e) => {
                    setSelectedTimeframe(e.target.value);
                    setSecurityPage(1);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today Only</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>

                {/* Clear Active IP filter */}
                {selectedIpFilter && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    <span>IP: <strong>{selectedIpFilter}</strong></span>
                    <button
                      onClick={() => {
                        setSelectedIpFilter("");
                        setSecurityPage(1);
                      }}
                      className="hover:opacity-75 cursor-pointer ml-1"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Action & Category</th>
                    <th className="py-3.5 px-4">User / Identifier</th>
                    <th className="py-3.5 px-4">Network & IP</th>
                    <th className="py-3.5 px-4">Browser & Device</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs sm:text-sm">
                  {loadingSecurity ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <FiRefreshCw className="animate-spin mx-auto mb-2 text-cyan-600" size={24} />
                        <span className="font-medium">Loading security audit records...</span>
                      </td>
                    </tr>
                  ) : securityLogs.length > 0 ? (
                    securityLogs.map((log) => {
                      const isFailure = log.status === "FAILURE" || log.status === "BLOCKED";
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isFailure ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                          }`}
                        >
                          {/* Timestamp */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white text-xs">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              {new Date(log.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Action & Category */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {log.action}
                            </div>
                            <div className="mt-1">
                              {renderCategoryBadge(log.category)}
                            </div>
                          </td>

                          {/* User / Identifier */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {log.user_name || log.identifier || "—"}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              {log.user_role ? log.user_role : log.identifier && log.user_name ? log.identifier : "Unauthenticated"}
                            </div>
                          </td>

                          {/* Network & IP */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400">
                                {log.ip_address || "127.0.0.1"}
                              </span>
                              {log.country && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                  {log.country}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedIpFilter(log.ip_address);
                                setSecurityPage(1);
                              }}
                              className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer block mt-0.5"
                            >
                              Filter by IP
                            </button>
                          </td>

                          {/* Browser & Device */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                              <FiMonitor size={13} className="text-slate-400" />
                              <span>{log.browser || "Unknown"}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {log.os || "Unknown OS"} · {log.device || "Desktop"}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderStatusBadge(log.status)}
                          </td>

                          {/* Details Button */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setActiveDetailLog(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-300 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 transition-colors shadow-sm cursor-pointer"
                            >
                              <FiEye size={12} />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">
                        <FiCheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                        <div className="font-bold text-slate-800 dark:text-slate-200">No security logs match this filter.</div>
                        <div className="text-xs text-slate-400 mt-1">All authentication and admin events in this range are clear.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TASK SUBMISSIONS TRAIL (Legacy) */}
      {/* ======================================================== */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative max-w-md">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search submission ID, employee, notes..."
                value={submissionSearch}
                onChange={(e) => {
                  setSubmissionSearch(e.target.value);
                  setSubmissionPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Submission / Entity</th>
                    <th className="py-3.5 px-4">Changed By</th>
                    <th className="py-3.5 px-4">Status Change</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs sm:text-sm">
                  {loadingSubmissions ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-400">
                        Loading submission trail...
                      </td>
                    </tr>
                  ) : paginatedSubmissionLogs.length > 0 ? (
                    paginatedSubmissionLogs.map((log) => {
                      const logSlug = `log-${log.id}`;
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-xs">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {log.submission_id}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                            {log.employee_name || log.changed_by}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-400 line-through mr-1.5">{log.old_status || "None"}</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">{log.new_status}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {log.comment || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/admin/audit-logs/${logSlug}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <span>View</span>
                              <FiChevronRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-400">
                        No submission logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. FORENSICS DETAILS MODAL */}
      {/* ======================================================== */}
      {activeDetailLog && (
        <div
          onClick={() => setActiveDetailLog(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-xl shadow-md">
                  <FiShield size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Security Event Forensics
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ID #{activeDetailLog.id} · Registered on {new Date(activeDetailLog.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDetailLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Event Action */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Action Event
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                    {activeDetailLog.action}
                  </span>
                  <div className="mt-1.5">
                    {renderCategoryBadge(activeDetailLog.category)}
                  </div>
                </div>

                {/* Status */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Result Status
                  </span>
                  <div className="mt-2">
                    {renderStatusBadge(activeDetailLog.status)}
                  </div>
                </div>

                {/* User / Identifier */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Target / Actor
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                    {activeDetailLog.user_name || activeDetailLog.identifier || "Anonymous / Unauthenticated"}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    {activeDetailLog.user_role ? `Role: ${activeDetailLog.user_role}` : "No active session"}
                  </span>
                </div>

                {/* IP Address & Network */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Network IP & Origin
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1 block">
                    {activeDetailLog.ip_address || "127.0.0.1"} {activeDetailLog.country ? `(${activeDetailLog.country})` : ""}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Method: {activeDetailLog.method || "POST"} · {activeDetailLog.path || "/api/..."}
                  </span>
                </div>

                {/* Browser & OS */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Client Platform
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white mt-1 block">
                    {activeDetailLog.browser || "Unknown Browser"} on {activeDetailLog.os || "Unknown OS"} ({activeDetailLog.device || "Desktop"})
                  </span>
                </div>
              </div>

              {/* Parsed JSON Details Payload */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Audit Payload & Specific Reason
                </span>
                <div className="bg-slate-900 text-cyan-300 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-56 border border-slate-800">
                  {(() => {
                    try {
                      const parsed = JSON.parse(activeDetailLog.details);
                      return (
                        <pre className="whitespace-pre-wrap word-break-all">
                          {JSON.stringify(parsed, null, 2)}
                        </pre>
                      );
                    } catch (e) {
                      return <span>{activeDetailLog.details || "No custom payload parameters provided."}</span>;
                    }
                  })()}
                </div>
              </div>

              {/* Raw User Agent Header */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Raw User-Agent Header
                </span>
                <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 break-all border border-slate-200 dark:border-slate-700">
                  {activeDetailLog.user_agent || "Header not provided"}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
              <button
                onClick={() => setActiveDetailLog(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition-colors cursor-pointer"
              >
                Close Forensics
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
