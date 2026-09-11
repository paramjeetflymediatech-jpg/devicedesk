'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiCalendar, FiLink, FiArrowLeft, FiCheck, FiX } from "react-icons/fi";
import { getEmployees } from "../../store.js";
import { getEmployeeSlug } from "../../utils/slugUtils.js";

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEmployees(getEmployees());
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leave/list?status=ALL");
      const data = await res.json();
      if (data.success) {
        setLeaves(data.data || []);
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
              <FiCalendar style={{ color: "#ec4899" }} /> Leave Management & Approvals
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              Review staff leave requests and view leave history by user slug.
            </p>
          </div>
        </div>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={{ padding: "14px 16px" }}>Employee</th>
                <th style={{ padding: "14px 16px" }}>User Slug</th>
                <th style={{ padding: "14px 16px" }}>Leave Type</th>
                <th style={{ padding: "14px 16px" }}>Duration</th>
                <th style={{ padding: "14px 16px" }}>Days</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>History</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => {
                const emp = employees.find((e) => e.id === l.employeeId || e.name === l.employeeName);
                const empSlug = emp ? getEmployeeSlug(emp) : l.employeeId;

                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      <Link href={`/admin/leaves/${empSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none" }}>
                        {l.employeeName || l.employeeId}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/admin/leaves/${empSlug}`}
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
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>{l.leaveType || "Casual Leave"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>{l.fromDate} &rarr; {l.toDate}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>{l.totalDays || 1} d</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`status-tag ${l.status === "Approved" ? "resolved" : l.status === "Rejected" ? "open" : "inprogress"}`}>
                        {l.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link href={`/admin/leaves/${empSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #64748b)" }}>
                    No leave requests found.
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
