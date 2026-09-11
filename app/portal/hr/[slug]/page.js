"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getDepartments } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { 
  FiUserCheck, FiArrowLeft, FiUsers, FiClock, FiCalendar, 
  FiFileText, FiLink, FiCheck, FiX, FiActivity 
} from "react-icons/fi";

export default function HRSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [hrUser, setHrUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const allEmps = getEmployees();
    const foundHr = findEmployeeBySlug(allEmps, slug) || {
      id: "hr-admin",
      name: "HR Executive",
      role: "HR Admin",
      department: "Human Resources",
      email: "hr@flymediatech.com"
    };
    setHrUser(foundHr);
    setEmployees(allEmps);
    fetchHRData();
    setLoading(false);
  }, [slug]);

  const fetchHRData = async () => {
    try {
      const [leaveRes, attRes] = await Promise.all([
        fetch("/api/leave/list?status=ALL"),
        fetch("/api/attendance/list")
      ]);
      const leaveData = await leaveRes.json();
      const attData = await attRes.json();
      if (leaveData.success) setLeaves(leaveData.data || []);
      if (attData.success) setTodayAttendance(attData.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewLeave = async (leaveId, newStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/leave/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status: newStatus,
          reviewedBy: hrUser?.name || "HR Officer"
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchHRData();
      } else {
        alert(data.error || "Failed to review leave");
      }
    } catch (e) {
      alert("Error updating leave status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading HR Administrator Portal...</p>
      </div>
    );
  }

  const hrSlug = hrUser ? getEmployeeSlug(hrUser) : slug;
  const pendingLeaves = leaves.filter((l) => (l.status || "").toLowerCase() === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link
              href="/portal/hr"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--accent-cyan, #06b6d4)",
                textDecoration: "none",
                fontSize: "0.85rem",
                marginBottom: "8px"
              }}
            >
              <FiArrowLeft /> All HR Consoles
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiUserCheck style={{ color: "#ec4899" }} /> {hrUser?.name || "HR Officer"} &bull; HR Management Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{hrSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                {hrUser?.role || "HR Officer"} &bull; Human Resources
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/admin/users" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiUsers /> Employees Directory
            </Link>
          </div>
        </div>

        {/* HR KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Employees</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {employees.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Pending Leaves</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
              {pendingLeaves.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Today Punches</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {todayAttendance.length}
            </div>
          </div>
        </div>

        {/* Pending Leaves Approval Table */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiCalendar /> Leave Requests & Approvals
          </h2>
          {leaves.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No leave requests submitted.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Review Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => {
                    const empObj = employees.find((e) => e.id === l.employeeId || e.name === l.employeeName);
                    const empSlug = empObj ? getEmployeeSlug(empObj) : "";
                    return (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.employeeName || l.employeeId}</div>
                          {empSlug && (
                            <Link href={`/admin/users/${empSlug}`} style={{ fontSize: "0.72rem", color: "var(--accent-purple, #a855f7)", textDecoration: "none" }}>
                              @{empSlug}
                            </Link>
                          )}
                        </td>
                        <td>{l.leaveType || "Casual Leave"}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
                          {l.fromDate} &rarr; {l.toDate}
                        </td>
                        <td style={{ fontWeight: 600 }}>{l.totalDays || 1} d</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>{l.reason || "-"}</td>
                        <td>
                          <span className={`status-tag ${l.status === "Approved" ? "resolved" : l.status === "Rejected" ? "open" : "inprogress"}`}>
                            {l.status || "Pending"}
                          </span>
                        </td>
                        <td>
                          {l.status === "Pending" ? (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => handleReviewLeave(l.id, "Approved")}
                                disabled={actionLoading}
                                className="btn-action start"
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                              >
                                <FiCheck /> Approve
                              </button>
                              <button
                                onClick={() => handleReviewLeave(l.id, "Rejected")}
                                disabled={actionLoading}
                                className="btn-action resolve"
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                              >
                                <FiX /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
                              Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
