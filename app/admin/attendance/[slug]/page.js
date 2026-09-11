'use client';
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiClock, FiArrowLeft, FiUser, FiLink } from "react-icons/fi";
import { getEmployees } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";

export default function AdminAttendanceSlugPage() {
  const params = useParams();
  const slug = params?.slug ? String(params.slug) : "";

  const [employee, setEmployee] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allEmps = getEmployees();
    const found = findEmployeeBySlug(allEmps, slug);
    setEmployee(found);

    if (found) {
      fetch(`/api/attendance/list?status=ALL&month=2026-09`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const userLogs = (d.data || []).filter((r) => r.employeeId === found.id || r.employeeName === found.name);
            setLogs(userLogs);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [slug]);

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Attendance Records...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <Link href="/admin/attendance" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
          <FiArrowLeft /> All Attendance
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0 0 1.5rem" }}>
          {employee ? employee.name : slug} &bull; Attendance Timeline
        </h1>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={{ padding: "14px 16px" }}>Date</th>
                <th style={{ padding: "14px 16px" }}>Punch In</th>
                <th style={{ padding: "14px 16px" }}>Punch Out</th>
                <th style={{ padding: "14px 16px" }}>Duration (Net)</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: "14px 16px" }}>{l.date}</td>
                  <td style={{ padding: "14px 16px" }}>{l.punchInTime || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>{l.punchOutTime || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>{l.netWorkMinutes ? `${Math.floor(l.netWorkMinutes / 60)}h ${l.netWorkMinutes % 60}m` : "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span className={`status-tag ${l.status === "Present" ? "resolved" : "open"}`}>{l.status || "Present"}</span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #64748b)" }}>No attendance logs for this member.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
