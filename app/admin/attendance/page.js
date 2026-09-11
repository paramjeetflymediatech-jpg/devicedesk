'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiClock, FiLink, FiArrowLeft, FiUserCheck, FiCalendar } from "react-icons/fi";
import { getEmployees } from "../../store.js";
import { getEmployeeSlug } from "../../utils/slugUtils.js";

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEmployees(getEmployees());
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/attendance/list?status=ALL&month=2026-09");
      const data = await res.json();
      if (data.success) {
        setAttendance(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiClock style={{ color: "#10b981" }} /> Attendance Overview & Logs
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              View live attendance punches and drill down by staff member slug.
            </p>
          </div>
        </div>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={{ padding: "14px 16px" }}>Employee</th>
                <th style={{ padding: "14px 16px" }}>User Slug</th>
                <th style={{ padding: "14px 16px" }}>Date</th>
                <th style={{ padding: "14px 16px" }}>Punch In</th>
                <th style={{ padding: "14px 16px" }}>Punch Out</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Log Details</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((rec) => {
                const emp = employees.find((e) => e.id === rec.employeeId || e.name === rec.employeeName);
                const empSlug = emp ? getEmployeeSlug(emp) : rec.employeeId;

                return (
                  <tr key={rec.id || `${rec.employeeId}-${rec.date}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      <Link href={`/admin/attendance/${empSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none" }}>
                        {rec.employeeName || rec.employeeId}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/admin/attendance/${empSlug}`}
                        className="timer-badge"
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--accent-purple, #a855f7)",
                          borderColor: "rgba(168, 85, 247, 0.4)",
                          background: "rgba(168, 85, 247, 0.08)",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <FiLink style={{ fontSize: "0.65rem" }} /> @{empSlug}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>{rec.date}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>{rec.punchInTime || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>{rec.punchOutTime || "—"}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`status-tag ${rec.status === "Present" ? "resolved" : "open"}`} style={{ fontSize: "0.75rem" }}>
                        {rec.status || "Present"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link href={`/admin/attendance/${empSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                        View Logs &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #64748b)" }}>
                    No attendance records loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
