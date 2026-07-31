"use client";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import AttendanceWidget from "./AttendanceWidget";
import { FiDownload, FiPlus, FiX } from "react-icons/fi";

export default function AttendanceTab({ user }) {
  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "management";

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [selectedDay, setSelectedDay] = useState(""); // e.g. "2025-07-31"

  // Regularize Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regData, setRegData] = useState({
    recordId: "",
    employeeId: "",
    employeeName: "",
    date: "",
    punchInTime: "",
    punchOutTime: "",
    status: "Present",
    reason: "",
    remarks: "",
  });
  const [regSubmitting, setRegSubmitting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/list?month=${selectedMonth}&status=${statusFilter}`;
      if (!isAdmin && user?.id) {
        url += `&employeeId=${encodeURIComponent(user.id)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setRecords(data.records || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load attendance logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => fetchLogs());
  }, [selectedMonth, statusFilter, user?.id, isAdmin]);

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    if (!regData.employeeId || !regData.date || !regData.punchInTime || !regData.reason) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Form",
        text: "Please fill in all required fields including reason.",
        background: "#161b22",
        color: "#f0f6fc"
      });
      return;
    }

    setRegSubmitting(true);
    try {
      const res = await fetch("/api/attendance/regularize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...regData,
          adminName: user.name || "Admin",
        }),
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: data.message,
          background: "#161b22",
          color: "#f0f6fc"
        });
        setShowRegModal(false);
        fetchLogs();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
          background: "#161b22",
          color: "#f0f6fc"
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Could not submit regularization request",
        background: "#161b22",
        color: "#f0f6fc"
      });
    } finally {
      setRegSubmitting(false);
    }
  };

  const exportToCSV = () => {
    if (!records.length) {
      Swal.fire({
        icon: "info",
        title: "No Data",
        text: "No attendance records to export.",
        background: "#161b22",
        color: "#f0f6fc"
      });
      return;
    }

    const headers = ["Employee ID", "Employee Name", "Date", "Punch In", "Punch Out", "Status", "Work Mins", "Break Mins", "Net Work Mins", "IP Address", "Modified By"];
    const rows = records.map(r => [
      r.employeeId,
      `"${r.employeeName || ''}"`,
      r.date,
      r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString() : '',
      r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString() : '',
      r.status,
      r.totalWorkMinutes,
      r.totalBreakMinutes,
      r.netWorkMinutes,
      r.ipAddress || '',
      r.modifiedBy || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(r => {
    // Day filter
    if (selectedDay && r.date !== selectedDay) return false;
    // Employee search
    if (!searchEmployee) return true;
    const term = searchEmployee.toLowerCase();
    return (
      (r.employeeName && r.employeeName.toLowerCase().includes(term)) ||
      (r.employeeId && r.employeeId.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header & Quick Action Widget */}
      <AttendanceWidget user={user} onStatusChange={() => fetchLogs()} />

      {/* Analytics Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div
          style={{
            background: "var(--bg-secondary)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>Days Logged</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--accent-cyan)", marginTop: "4px" }}>
            {summary?.totalRecords || 0}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-secondary)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--status-resolved)", fontWeight: "600" }}>Present Days</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--status-resolved)", marginTop: "4px" }}>
            {summary?.presentCount || 0}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-secondary)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            }}
        >
          <div style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: "600" }}>Late Days</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#f59e0b", marginTop: "4px" }}>
            {summary?.lateCount || 0}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-secondary)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--accent-purple)", fontWeight: "600" }}>Total Work Hours</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--accent-purple)", marginTop: "4px", lineHeight: 1 }}>
            {(() => {
              const mins = summary?.totalNetMinutes ?? Math.round((parseFloat(summary?.totalWorkHours || 0)) * 60);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return (
                <>
                  {h}<span style={{ fontSize: "1rem", fontWeight: "600" }}>h </span>
                  {m}<span style={{ fontSize: "1rem", fontWeight: "600" }}>m</span>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div
        style={{
          background: "var(--bg-secondary)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          overflow: "hidden",
          }}
      >
        {/* Filter Toolbar */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--glass-border)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDay(""); }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-main)"
                }}
              />
            </div>

            {/* Day filter */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Day
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-main)"
                  }}
                />
                {selectedDay && (
                  <button
                    title="Clear day filter"
                    onClick={() => setSelectedDay("")}
                    style={{
                      background: "none",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "6px",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "6px 8px",
                      fontSize: "0.9rem",
                      lineHeight: 1
                    }}
                  >✕</button>
                )}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(0, 0, 0, 0.3)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-main)"
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Completed">Completed</option>
                <option value="Overtime">Overtime</option>
              </select>
            </div>

            {isAdmin && (
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Search Employee
                </label>
                <input
                  type="text"
                  placeholder="Filter name or ID..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border)",
                    background: "rgba(0, 0, 0, 0.3)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-main)"
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={exportToCSV}
              className="btn-secondary"
              style={{
                padding: "8px 14px",
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <FiDownload /> Export CSV
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setRegData({
                    recordId: "",
                    employeeId: "",
                    employeeName: "",
                    date: new Date().toISOString().split("T")[0],
                    punchInTime: "",
                    punchOutTime: "",
                    status: "Present",
                    reason: "",
                    remarks: "",
                  });
                  setShowRegModal(true);
                }}
                className="btn-primary"
                style={{
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <FiPlus /> Regularize / Add Log
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--glass-border)" }}>
                <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Date</th>
                {isAdmin && <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Employee</th>}
                <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Punch In</th>
                <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Punch Out</th>
                <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Status</th>
                <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Break Time</th>
                <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Net Work Time</th>
                <th style={{ padding: "12px 16px", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No attendance records found for this period.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const _netMins = r.netWorkMinutes || 0;
                  const _netH = Math.floor(_netMins / 60);
                  const _netM = _netMins % 60;
                  const netDisplay = `${_netH}h ${_netM}m`;
                  const inTimeStr = r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                  const outTimeStr = r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (r.punchInTime ? 'Active' : '-');

                  return (
                    <tr 
                      key={r.id}
                      style={{ 
                        borderBottom: "1px solid var(--glass-border)", 
                        transition: "background 0.2s" 
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontWeight: "600", color: "var(--text-primary)" }}>
                        {r.date}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{r.employeeName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{r.employeeId}</div>
                        </td>
                      )}
                      <td style={{ padding: "14px 16px", fontFamily: "monospace" }}>
                        {inTimeStr}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace" }}>
                        {outTimeStr}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background: 
                              r.status === "Late" ? "rgba(245, 158, 11, 0.15)" :
                              r.status === "Half Day" ? "rgba(239, 68, 68, 0.15)" :
                              r.status === "Overtime" ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                            color:
                              r.status === "Late" ? "#f59e0b" :
                              r.status === "Half Day" ? "var(--status-critical)" :
                              r.status === "Overtime" ? "var(--accent-purple)" : "var(--status-resolved)",
                            border:
                              r.status === "Late" ? "1px solid rgba(245, 158, 11, 0.3)" :
                              r.status === "Half Day" ? "1px solid rgba(239, 68, 68, 0.3)" :
                              r.status === "Overtime" ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)"
                          }}
                        >
                          {r.status}
                        </span>
                        {r.modifiedBy && (
                          <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Modified by {r.modifiedBy}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                        {r.totalBreakMinutes || 0} mins
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontWeight: "700", color: "var(--accent-cyan)" }}>
                        {netDisplay}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setRegData({
                                recordId: r.id,
                                employeeId: r.employeeId,
                                employeeName: r.employeeName,
                                date: r.date,
                                punchInTime: r.punchInTime ? r.punchInTime.substring(0, 16) : "",
                                punchOutTime: r.punchOutTime ? r.punchOutTime.substring(0, 16) : "",
                                status: r.status,
                                reason: "",
                                remarks: r.remarks || "",
                              });
                              setShowRegModal(true);
                            }}
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Regularization Modal */}
      {showRegModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={() => setShowRegModal(false)}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "1.5rem",
              maxWidth: "520px",
              width: "100%",
                            color: "var(--text-primary)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0, color: "var(--accent-cyan)" }}>
                {regData.recordId ? "Edit / Regularize Attendance Log" : "Add Manual Attendance Log"}
              </h3>
              <button
                onClick={() => setShowRegModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <FiX />
              </button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              All manual changes will be permanently logged with your admin username.
            </p>

            <form onSubmit={handleRegularizeSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.employeeId}
                    onChange={(e) => setRegData({ ...regData, employeeId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--glass-border)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Employee Name
                  </label>
                  <input
                    type="text"
                    value={regData.employeeName}
                    onChange={(e) => setRegData({ ...regData, employeeName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--glass-border)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={regData.date}
                    onChange={(e) => setRegData({ ...regData, date: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--glass-border)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Status
                  </label>
                  <select
                    value={regData.status}
                    onChange={(e) => setRegData({ ...regData, status: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--glass-border)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem"
                    }}
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Completed">Completed</option>
                    <option value="Overtime">Overtime</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Punch In Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={regData.punchInTime}
                    onChange={(e) => setRegData({ ...regData, punchInTime: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--glass-border)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Punch Out Time
                  </label>
                  <input
                    type="datetime-local"
                    value={regData.punchOutTime}
                    onChange={(e) => setRegData({ ...regData, punchOutTime: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--glass-border)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Reason for Adjustment *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Employee forgot to punch in due to network outage..."
                  value={regData.reason}
                  onChange={(e) => setRegData({ ...regData, reason: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border)",
                    background: "rgba(0, 0, 0, 0.3)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-main)"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="btn-primary"
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  {regSubmitting ? "Saving..." : "Save Regularization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
