"use client";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import AttendanceWidget from "./AttendanceWidget";
import { FiDownload, FiPlus, FiX } from "react-icons/fi";

export default function AttendanceTab({ user }) {
  const userDbRole = (user?.dbRole || '').toLowerCase();
  const userEmail = (user?.email || '').toLowerCase();
  // Full Admin privileges (viewing all company logs) reserved strictly for Root Admin, Executive Management, HR, and Superadmin
  const isFullAdmin = 
    ['admin', 'management', 'hr', 'superadmin', 'executive'].includes(userDbRole) ||
    ['admin@yopmail.com', 'pravi@yopmail.com'].includes(userEmail);
  const isAdmin = isFullAdmin;

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState("monthly"); // all | monthly | daily | weekly | yearly | custom
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
  });
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchEmployee, setSearchEmployee] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const getWeekRange = (dateStr) => {
    if (!dateStr) return { startDate: "", endDate: "" };
    const curr = new Date(dateStr);
    const day = curr.getDay();
    const firstday = new Date(curr.getTime() - day * 24 * 60 * 60 * 1000);
    const lastday = new Date(firstday.getTime() + 6 * 24 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    return {
      startDate: formatDate(firstday),
      endDate: formatDate(lastday)
    };
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/list?status=${encodeURIComponent(statusFilter)}`;
      
      if (filterType === "daily") {
        url += `&date=${encodeURIComponent(selectedDate)}`;
      } else if (filterType === "weekly") {
        const { startDate, endDate } = getWeekRange(selectedWeekDate);
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      } else if (filterType === "monthly" && selectedMonth) {
        url += `&month=${encodeURIComponent(selectedMonth)}`;
      } else if (filterType === "yearly" && selectedYear) {
        url += `&year=${encodeURIComponent(selectedYear)}`;
      } else if (filterType === "custom" && fromDate && toDate) {
        url += `&startDate=${encodeURIComponent(fromDate)}&endDate=${encodeURIComponent(toDate)}`;
      }

      if (searchEmployee.trim()) {
        url += `&search=${encodeURIComponent(searchEmployee.trim())}`;
      }

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
  }, [selectedMonth, selectedDate, selectedWeekDate, selectedYear, fromDate, toDate, filterType, statusFilter, searchEmployee, user?.id, isAdmin]);

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
    // 1. Status Filter check
    if (statusFilter && statusFilter !== "ALL") {
      if ((r.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Month Filter check (client fallback)
    if (filterType === "monthly" && selectedMonth) {
      if (r.date && !r.date.startsWith(selectedMonth)) {
        return false;
      }
    }

    // 3. Daily Filter check (client fallback)
    if (filterType === "daily" && selectedDate) {
      if (r.date !== selectedDate) {
        return false;
      }
    }

    // 4. Employee & Search Filter check
    if (searchEmployee.trim()) {
      const term = searchEmployee.trim().toLowerCase();
      const nameMatch = r.employeeName && r.employeeName.toLowerCase().includes(term);
      const idMatch = r.employeeId && r.employeeId.toLowerCase().includes(term);
      const dateMatch = r.date && r.date.toLowerCase().includes(term);
      const remarksMatch = r.remarks && r.remarks.toLowerCase().includes(term);
      const statusMatch = r.status && r.status.toLowerCase().includes(term);
      const ipMatch = r.ipAddress && r.ipAddress.toLowerCase().includes(term);

      if (!nameMatch && !idMatch && !dateMatch && !remarksMatch && !statusMatch && !ipMatch) {
        return false;
      }
    }

    return true;
  });

  const summaryStats = React.useMemo(() => {
    let totalNetMinutes = 0;
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;

    filteredRecords.forEach(r => {
      totalNetMinutes += (r.netWorkMinutes || 0);
      const st = (r.status || '').toLowerCase().trim();
      const rem = (r.remarks || '').toLowerCase();

      let isLate = st.includes('late') || rem.includes('late');

      if (!isLate && r.punchInTime) {
        try {
          const pDate = new Date(r.punchInTime);
          const hrs = pDate.getHours();
          const mins = pDate.getMinutes();
          if (hrs * 60 + mins > 580) { // Punched in after 09:40 AM
            isLate = true;
          }
        } catch (e) {}
      }

      if (isLate) {
        lateCount++;
        presentCount++;
      } else if (st === 'present' || st === 'completed' || st === 'overtime' || st === 'active') {
        presentCount++;
      } else if (st.includes('half')) {
        halfDayCount++;
      }
    });

    if (summary && filteredRecords.length === records.length) {
      presentCount = Math.max(presentCount, summary.presentCount || 0);
      lateCount = Math.max(lateCount, summary.lateCount || 0);
      if (summary.totalNetMinutes && summary.totalNetMinutes > totalNetMinutes) {
        totalNetMinutes = summary.totalNetMinutes;
      }
    }

    return {
      totalRecords: filteredRecords.length,
      presentCount,
      lateCount,
      halfDayCount,
      totalNetMinutes
    };
  }, [filteredRecords, summary, records.length]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRecords.length);
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 1. Header Banner & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏱️</span> Attendance Management & Team Logs
          </h1>
          <p style={{ color: 'var(--text-secondary, #64748b)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Monitor team daily attendance, work durations, break logs, and regularization approvals
          </p>
        </div>
      </div>

      {/* Employee Punch In/Out Widget (Only for non-Admin team members) */}
      {!isAdmin && <AttendanceWidget user={user} onStatusChange={() => fetchLogs()} />}

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
            {summaryStats.totalRecords}
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
            {summaryStats.presentCount}
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
            {summaryStats.lateCount}
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
            {Math.floor(summaryStats.totalNetMinutes / 60)}<span style={{ fontSize: "1rem", fontWeight: "600" }}>h </span>
            {summaryStats.totalNetMinutes % 60}<span style={{ fontSize: "1rem", fontWeight: "600" }}>m</span>
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
            {/* Period Type Selector */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Filter Period
              </label>
              <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.2)", borderRadius: "8px", padding: "2px", border: "1px solid var(--glass-border)", flexWrap: "wrap" }}>
                {["all", "monthly", "daily", "weekly", "yearly", "custom"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: filterType === type ? "var(--accent-purple)" : "transparent",
                      color: filterType === type ? "#fff" : "var(--text-secondary)",
                      border: "none",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      textTransform: "capitalize",
                      transition: "all 0.2s"
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {filterType === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    From Date 📅
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
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

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    To Date 📅
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
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
              </div>
            )}

            {/* Daily Picker */}
            {filterType === "daily" && (
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
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
            )}

            {/* Weekly Picker */}
            {filterType === "weekly" && (
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Select Week (via Date)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="date"
                    value={selectedWeekDate}
                    onChange={(e) => setSelectedWeekDate(e.target.value)}
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
                  {selectedWeekDate && (
                    <span style={{
                      fontSize: "0.8rem",
                      color: "var(--accent-cyan)",
                      background: "rgba(0, 240, 255, 0.08)",
                      border: "1px solid rgba(0, 240, 255, 0.2)",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      📅 {getWeekRange(selectedWeekDate).startDate} to {getWeekRange(selectedWeekDate).endDate}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Monthly Picker */}
            {filterType === "monthly" && (
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
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
            )}

            {/* Yearly Picker */}
            {filterType === "yearly" && (
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Select Year
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-main)",
                    width: "90px"
                  }}
                />
              </div>
            )}

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

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Search Logs
              </label>
              <input
                type="text"
                placeholder={isAdmin ? "Search name, ID, date..." : "Search date, status, notes..."}
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(0, 0, 0, 0.3)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-main)",
                  minWidth: "160px"
                }}
              />
            </div>
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
                paginatedRecords.map((r) => {
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
                        <div>{inTimeStr}</div>
                        {r.punchInLatitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${r.punchInLatitude},${r.punchInLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "2px", marginTop: "4px" }}
                            title={`Lat: ${r.punchInLatitude}, Lng: ${r.punchInLongitude}`}
                          >
                            📍 Map Pin
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace" }}>
                        <div>{outTimeStr}</div>
                        {r.punchOutLatitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${r.punchOutLatitude},${r.punchOutLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "2px", marginTop: "4px" }}
                            title={`Lat: ${r.punchOutLatitude}, Lng: ${r.punchOutLongitude}`}
                          >
                            📍 Map Pin
                          </a>
                        )}
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

        {/* Pagination Bar - Automatically shows after 10 records */}
        {filteredRecords.length > 10 && (
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
              Showing <strong style={{ color: "var(--text-primary)" }}>{startIndex + 1}</strong> to{" "}
              <strong style={{ color: "var(--text-primary)" }}>{endIndex}</strong> of{" "}
              <strong style={{ color: "var(--text-primary)" }}>{filteredRecords.length}</strong> attendance records
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  opacity: safePage <= 1 ? 0.5 : 1,
                  cursor: safePage <= 1 ? "not-allowed" : "pointer"
                }}
              >
                ← Previous
              </button>

              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                className="btn-secondary"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  opacity: safePage >= totalPages ? 0.5 : 1,
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
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
