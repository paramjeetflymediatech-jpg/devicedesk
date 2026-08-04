"use client";

import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  differenceInCalendarDays
} from "date-fns";
import { useAuth } from "../../auth/AuthContext";
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiPlusCircle,
  FiList,
  FiSearch,
  FiFilter,
  FiEye,
  FiUserCheck,
  FiChevronLeft,
  FiChevronRight,
  FiArrowRight,
  FiRotateCcw
} from "react-icons/fi";

function CustomRangeCalendar({ leaveFrom, leaveTo, onChange }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = useMemo(() => startOfDay(new Date()), []);

  const fromDate = useMemo(() => (leaveFrom ? new Date(leaveFrom + "T00:00:00") : null), [leaveFrom]);
  const toDate = useMemo(() => (leaveTo ? new Date(leaveTo + "T00:00:00") : null), [leaveTo]);

  // Generate grid days for the month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handleDayClick = (day) => {
    const dayStart = startOfDay(day);
    // Block clicks on past dates
    if (isBefore(dayStart, today)) return;

    const dayStr = format(day, "yyyy-MM-dd");

    if (!fromDate || (fromDate && toDate)) {
      // First click: select start date
      onChange(dayStr, "");
    } else if (fromDate && !toDate) {
      if (isBefore(day, fromDate)) {
        // Clicked date is before start: set as new start
        onChange(dayStr, "");
      } else {
        // Clicked date is after start: set end date
        onChange(leaveFrom, dayStr);
      }
    }
  };

  const setQuickPreset = (type) => {
    const todayObj = new Date();
    const todayStr = format(todayObj, "yyyy-MM-dd");

    if (type === "today") {
      onChange(todayStr, todayStr);
      setCurrentMonth(todayObj);
    } else if (type === "tomorrow") {
      const tom = addDays(todayObj, 1);
      const tomStr = format(tom, "yyyy-MM-dd");
      onChange(tomStr, tomStr);
      setCurrentMonth(tom);
    } else if (type === "next3") {
      const endStr = format(addDays(todayObj, 2), "yyyy-MM-dd");
      onChange(todayStr, endStr);
      setCurrentMonth(todayObj);
    } else if (type === "nextWeek") {
      const endStr = format(addDays(todayObj, 6), "yyyy-MM-dd");
      onChange(todayStr, endStr);
      setCurrentMonth(todayObj);
    }
  };

  const totalDaysCount = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    return Math.max(1, differenceInCalendarDays(toDate, fromDate) + 1);
  }, [fromDate, toDate]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{ width: "100%", maxWidth: "350px", boxSizing: "border-box" }}>
      {/* Quick Presets Bar */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setQuickPreset("today")}
          style={{
            padding: "5px 11px",
            fontSize: "0.76rem",
            fontWeight: "600",
            borderRadius: "20px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setQuickPreset("tomorrow")}
          style={{
            padding: "5px 11px",
            fontSize: "0.76rem",
            fontWeight: "600",
            borderRadius: "20px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => setQuickPreset("next3")}
          style={{
            padding: "5px 11px",
            fontSize: "0.76rem",
            fontWeight: "600",
            borderRadius: "20px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          3 Days
        </button>
        <button
          type="button"
          onClick={() => setQuickPreset("nextWeek")}
          style={{
            padding: "5px 11px",
            fontSize: "0.76rem",
            fontWeight: "600",
            borderRadius: "20px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          7 Days
        </button>
        {(leaveFrom || leaveTo) && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            style={{
              padding: "5px 10px",
              fontSize: "0.76rem",
              fontWeight: "600",
              borderRadius: "20px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--status-critical)",
              cursor: "pointer",
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <FiRotateCcw style={{ fontSize: "0.75rem" }} /> Clear
          </button>
        )}
      </div>

      {/* Main Custom Grid Calendar Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "1rem",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)"
        }}
      >
        {/* Month Header Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--accent-cyan)" }}>
            {format(currentMonth, "MMMM yyyy")}
          </h4>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        {/* 7-Column Weekday Header Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "6px" }}>
          {weekdays.map((day) => (
            <div
              key={day}
              style={{
                textAlign: "center",
                fontSize: "0.72rem",
                fontWeight: "700",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                padding: "6px 0",
                background: "var(--bg-tertiary)",
                borderRadius: "6px",
                border: "1px solid var(--glass-border)"
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 7-Column Days Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {calendarDays.map((day) => {
            const dayStart = startOfDay(day);
            const isPast = isBefore(dayStart, today);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const isStart = fromDate ? isSameDay(day, fromDate) : false;
            const isEnd = toDate ? isSameDay(day, toDate) : false;
            const isInRange =
              fromDate && toDate ? day >= fromDate && day <= toDate : false;

            let btnBg = "var(--bg-card)";
            let btnColor = isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)";
            let btnBorder = "1px solid var(--glass-border)";
            let btnWeight = "500";
            let opacityVal = isCurrentMonth ? 1 : 0.4;
            let cursorStyle = "pointer";

            if (isPast) {
              opacityVal = 0.22;
              cursorStyle = "not-allowed";
              btnColor = "var(--text-muted)";
            } else if (isStart || isEnd) {
              btnBg = "var(--accent-cyan)";
              btnColor = "#ffffff";
              btnBorder = "1px solid var(--accent-cyan)";
              btnWeight = "800";
            } else if (isInRange) {
              btnBg = "var(--glass-glow)";
              btnColor = "var(--accent-cyan)";
              btnBorder = "1px dashed var(--accent-cyan)";
            } else if (isToday) {
              btnBorder = "2px solid var(--accent-cyan)";
              btnWeight = "700";
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast}
                onClick={() => handleDayClick(day)}
                style={{
                  height: "36px",
                  borderRadius: "8px",
                  background: btnBg,
                  color: btnColor,
                  border: btnBorder,
                  fontWeight: btnWeight,
                  fontSize: "0.85rem",
                  cursor: cursorStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: opacityVal,
                  transition: "all 0.15s ease"
                }}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Range Status Banner */}
      <div
        style={{
          marginTop: "0.75rem",
          padding: "10px 14px",
          background: leaveFrom ? "var(--glass-glow)" : "var(--bg-tertiary)",
          border: leaveFrom ? "1px solid var(--accent-cyan)" : "1px dashed var(--glass-border)",
          borderRadius: "12px",
          fontSize: "0.82rem",
          color: "var(--text-secondary)"
        }}
      >
        {leaveFrom && leaveTo ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", width: "100%" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Selected Duration</span>
              <strong style={{ color: "var(--accent-cyan)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                {leaveFrom} <FiArrowRight style={{ fontSize: "0.8rem" }} /> {leaveTo}
              </strong>
            </div>
            <span
              style={{
                background: "var(--accent-cyan)",
                color: "#ffffff",
                padding: "3px 10px",
                borderRadius: "14px",
                fontWeight: "800",
                fontSize: "0.78rem"
              }}
            >
              {totalDaysCount} {totalDaysCount === 1 ? "Day" : "Days"}
            </span>
          </div>
        ) : leaveFrom ? (
          <div style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <strong>Start Date:</strong> {leaveFrom} <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>(Click end date to finish range)</span>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", textAlign: "center", fontSize: "0.8rem" }}>
            👇 Click start date and end date on calendar
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplyLeavePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("apply"); // 'apply' or 'history'
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFilterStatus, setLeaveFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);

  const fetchLeaveRequests = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/leave/list?employeeId=${user.id}&status=${leaveFilterStatus}`);
      const data = await res.json();
      if (data.success) {
        setLeaveRequests(data.requests || []);
        setLeaveSummary(data.summary || { total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error("Error fetching leave requests:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchLeaveRequests();
    }
  }, [user?.id, leaveFilterStatus]);

  useEffect(() => {
    const handleSync = () => {
      fetchLeaveRequests();
    };
    window.addEventListener("devicedesk_db_synced", handleSync);
    return () => window.removeEventListener("devicedesk_db_synced", handleSync);
  }, [user?.id, leaveFilterStatus]);

  if (!mounted || !user) return null;

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveFrom || !leaveTo || !leaveReason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Validation",
        text: "Please select leave dates and state your reason.",
        background: "var(--bg-card)",
        color: "var(--text-primary)"
      });
      return;
    }
    if (new Date(leaveFrom) > new Date(leaveTo)) {
      Swal.fire({
        icon: "warning",
        title: "Validation",
        text: "From Date cannot be after To Date.",
        background: "var(--bg-card)",
        color: "var(--text-primary)"
      });
      return;
    }
    setLeaveLoading(true);
    try {
      const res = await fetch("/api/leave/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user.id,
          employeeName: user.name,
          leaveType,
          fromDate: leaveFrom,
          toDate: leaveTo,
          reason: leaveReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Leave Requested",
          text: "Your leave application was submitted successfully!",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          confirmButtonColor: "var(--accent-cyan)"
        });
        setLeaveFrom("");
        setLeaveTo("");
        setLeaveReason("");
        fetchLeaveRequests();

        if (typeof window !== "undefined") {
          const event = new CustomEvent("devicedesk_db_synced");
          window.dispatchEvent(event);
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: data.message || "Failed to submit leave request.",
          background: "var(--bg-card)",
          color: "var(--text-primary)"
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Error", text: "Network/server error.", background: "var(--bg-card)", color: "var(--text-primary)" });
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleViewFullDescription = (req) => {
    Swal.fire({
      title: `<div style="display:flex;align-items:center;gap:8px;justify-content:center;"><span style="color:var(--accent-cyan)">📅 Leave Details</span></div>`,
      html: `
        <div style="text-align: left; font-family: var(--font-main); color: var(--text-primary); font-size: 0.9rem; line-height: 1.6; padding: 5px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; background: var(--bg-tertiary); padding: 10px; border-radius: 8px; border: 1px solid var(--glass-border);">
            <div><span style="color:var(--text-muted); font-size:0.78rem;">Leave Type</span><br/><strong style="color:var(--text-primary);">${req.leaveType}</strong></div>
            <div><span style="color:var(--text-muted); font-size:0.78rem;">Total Duration</span><br/><strong style="color:var(--text-primary);">${req.totalDays} ${req.totalDays === 1 ? 'day' : 'days'}</strong></div>
            <div><span style="color:var(--text-muted); font-size:0.78rem;">From Date</span><br/><span style="color:var(--text-primary);">${req.fromDate}</span></div>
            <div><span style="color:var(--text-muted); font-size:0.78rem;">To Date</span><br/><span style="color:var(--text-primary);">${req.toDate}</span></div>
          </div>

          <div style="margin-bottom: 6px; font-weight: 600; color: var(--text-primary);">Reason for Leave:</div>
          <div style="background: var(--bg-tertiary); border: 1px solid var(--glass-border); padding: 14px; border-radius: 10px; margin-bottom: 12px; max-height: 320px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; font-style: normal; text-align: left; font-size: 0.88rem; color: var(--text-primary); line-height: 1.6;">
            ${req.reason || "No reason provided."}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--glass-border); padding-top:10px;">
            <div><strong style="color:var(--text-primary);">Status:</strong> <span class="status-badge badge-${req.status === 'Approved' ? 'resolved' : (req.status === 'Rejected' ? 'critical' : 'progress')}" style="padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 0.75rem;">${req.status}</span></div>
            ${req.reviewedBy ? `<div style="font-size:0.75rem; color:var(--text-muted);">Reviewed by <strong style="color:var(--text-primary);">${req.reviewedBy}</strong></div>` : ''}
          </div>

          ${req.status === 'Rejected' && req.rejectionReason ? `
            <div style="margin-top: 10px; padding: 10px 12px; background: rgba(248, 81, 73, 0.1); border-left: 3px solid var(--status-critical); border-radius: 6px; color: var(--text-secondary); font-size: 0.82rem;">
              <strong style="color:var(--status-critical);">Rejection Reason:</strong> "${req.rejectionReason}"
            </div>
          ` : ''}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: 'var(--accent-cyan)',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)'
    });
  };

  const filteredHistory = leaveRequests.filter((req) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.leaveType.toLowerCase().includes(q) ||
      req.reason.toLowerCase().includes(q) ||
      req.fromDate.includes(q) ||
      req.toDate.includes(q)
    );
  });

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto", padding: "1rem" }}>
      {/* Header Banner */}
      <div className="container-card fade-in" style={{ marginBottom: "1.25rem", padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: "1 1 280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "var(--glass-glow)",
                  border: "1px solid var(--glass-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                  fontSize: "1.3rem",
                  flexShrink: 0
                }}
              >
                <FiCalendar />
              </div>
              <div>
                <h2 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: "700", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
                  Leave & Time-Off Management
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "3px", margin: 0 }}>
                  Apply for leave, track approval status, and manage time-off history
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "var(--bg-tertiary)",
              padding: "4px",
              borderRadius: "12px",
              border: "1px solid var(--glass-border)",
              flexWrap: "wrap",
              width: "100%",
              maxWidth: "340px"
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("apply")}
              style={{
                flex: "1 1 120px",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.2s ease",
                background: activeTab === "apply" ? "var(--accent-cyan)" : "transparent",
                color: activeTab === "apply" ? "#ffffff" : "var(--text-secondary)"
              }}
            >
              <FiPlusCircle /> Apply Leave
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              style={{
                flex: "1 1 120px",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.2s ease",
                background: activeTab === "history" ? "var(--accent-cyan)" : "transparent",
                color: activeTab === "history" ? "#ffffff" : "var(--text-secondary)"
              }}
            >
              <FiList /> History ({leaveRequests.length})
            </button>
          </div>
        </div>

        {/* Modern Statistics Summary Responsive Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.85rem",
            marginTop: "1.25rem"
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              padding: "1rem",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: "0 0 2px 0", fontWeight: "500" }}>Total Applied</p>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{leaveSummary.total}</h3>
            </div>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "1rem" }}>
              <FiFileText />
            </div>
          </div>

          <div
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              padding: "1rem",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <p style={{ color: "var(--status-open)", fontSize: "0.75rem", margin: "0 0 2px 0", fontWeight: "500" }}>Pending</p>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--status-open)", margin: 0 }}>{leaveSummary.pending}</h3>
            </div>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--status-open)", fontSize: "1rem" }}>
              <FiClock />
            </div>
          </div>

          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              padding: "1rem",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <p style={{ color: "var(--status-resolved)", fontSize: "0.75rem", margin: "0 0 2px 0", fontWeight: "500" }}>Approved</p>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--status-resolved)", margin: 0 }}>{leaveSummary.approved}</h3>
            </div>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--status-resolved)", fontSize: "1rem" }}>
              <FiCheckCircle />
            </div>
          </div>

          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              padding: "1rem",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <p style={{ color: "var(--status-critical)", fontSize: "0.75rem", margin: "0 0 2px 0", fontWeight: "500" }}>Rejected</p>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--status-critical)", margin: 0 }}>{leaveSummary.rejected}</h3>
            </div>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--status-critical)", fontSize: "1rem" }}>
              <FiXCircle />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "apply" ? (
        <div className="container-card fade-in" style={{ padding: "1.25rem 1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 1.25rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--accent-cyan)" }}>📝</span> Submit Leave Application
          </h3>

          <form onSubmit={handleApplyLeave}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
              {/* Form Controls Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "600" }}>
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: "10px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "600" }}>
                    Reason for Leave (Supports Paragraphs)
                  </label>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="State detailed reason for leave (multiple paragraphs or sections supported)..."
                    required
                    rows="6"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                      fontSize: "0.88rem",
                      outline: "none",
                      resize: "vertical",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6"
                    }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    💡 You can format reasons with section breaks. Click "Full View" in history to read full text.
                  </span>
                </div>
              </div>

              {/* Custom Grid Range Calendar Column */}
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "600" }}>
                  Select Leave Dates (Interactive Range Picker)
                </label>
                <CustomRangeCalendar
                  leaveFrom={leaveFrom}
                  leaveTo={leaveTo}
                  onChange={(from, to) => {
                    setLeaveFrom(from);
                    setLeaveTo(to);
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={leaveLoading}
                className="btn-primary"
                style={{
                  width: "100%",
                  maxWidth: "280px",
                  padding: "12px 24px",
                  fontSize: "0.92rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  borderRadius: "10px"
                }}
              >
                {leaveLoading ? "Submitting Application..." : "🚀 Submit Leave Application"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* History Tab */
        <div className="container-card fade-in" style={{ padding: "1.25rem 1.5rem" }}>
          {/* History Search & Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.85rem", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--accent-cyan)" }}>📋</span> Leave History
            </h3>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", width: "100%", maxWidth: "450px" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", flex: "1 1 180px" }}>
                <FiSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.9rem" }} />
                <input
                  type="text"
                  placeholder="Search reason or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 32px",
                    borderRadius: "8px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none"
                  }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "0 0 auto" }}>
                <FiFilter style={{ color: "var(--text-muted)", fontSize: "0.85rem" }} />
                <select
                  value={leaveFilterStatus}
                  onChange={(e) => setLeaveFilterStatus(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                    outline: "none",
                    fontSize: "0.82rem"
                  }}
                >
                  <option value="ALL">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Leave History Items List */}
          {filteredHistory.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                background: "var(--bg-tertiary)",
                borderRadius: "14px",
                border: "1px dashed var(--glass-border)",
                color: "var(--text-muted)"
              }}
            >
              <FiCalendar style={{ fontSize: "2rem", color: "var(--text-muted)", marginBottom: "8px" }} />
              <p style={{ fontSize: "0.92rem", margin: 0 }}>No leave applications found matching your criteria.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {filteredHistory.map((req) => {
                const isLongReason = req.reason && (req.reason.length > 90 || req.reason.includes("\n"));
                const snippet = req.reason
                  ? req.reason.split("\n")[0].slice(0, 90) + (req.reason.length > 90 || req.reason.includes("\n") ? "..." : "")
                  : "No reason provided.";

                return (
                  <div
                    key={req.id}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "14px",
                      padding: "1rem 1.15rem",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "1rem" }}>{req.leaveType}</span>
                          <span
                            style={{
                              background: "var(--glass-glow)",
                              color: "var(--accent-cyan)",
                              border: "1px solid var(--glass-border)",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.75rem",
                              fontWeight: "600"
                            }}
                          >
                            📅 {req.fromDate} ➔ {req.toDate} ({req.totalDays} {req.totalDays === 1 ? "Day" : "Days"})
                          </span>
                        </div>
                      </div>

                      <span
                        className={`status-badge badge-${
                          req.status === "Approved" ? "resolved" : req.status === "Rejected" ? "critical" : "progress"
                        }`}
                        style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: "14px", fontWeight: "700" }}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div style={{ marginTop: "10px", background: "var(--bg-tertiary)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0, fontStyle: "italic", lineHeight: "1.5" }}>
                        "{snippet}"
                      </p>
                      {isLongReason && (
                        <button
                          type="button"
                          onClick={() => handleViewFullDescription(req)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-cyan)",
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            padding: "4px 0 0 0",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                        >
                          <FiEye /> Read Full View
                        </button>
                      )}
                    </div>

                    {req.status === "Rejected" && req.rejectionReason && (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "8px 10px",
                          background: "rgba(248, 81, 73, 0.08)",
                          borderLeft: "3px solid var(--status-critical)",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)"
                        }}
                      >
                        <strong style={{ color: "var(--status-critical)" }}>Rejection Note:</strong> {req.rejectionReason}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--glass-border)", fontSize: "0.72rem", color: "var(--text-muted)", flexWrap: "wrap", gap: "4px" }}>
                      <span>Submitted on {new Date(req.appliedAt || Date.now()).toLocaleDateString()}</span>
                      {req.reviewedBy && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <FiUserCheck style={{ color: "var(--accent-cyan)" }} /> Reviewed by {req.reviewedBy}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
