"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getEmployees, getDepartments } from "../../store.js";
import { getEmployeeSlug } from "../../utils/slugUtils.js";
import { 
  FiShield, FiArrowLeft, FiUsers, FiLink, FiActivity, 
  FiLayers, FiBriefcase, FiCpu, FiCheckCircle 
} from "react-icons/fi";

export default function AdminPortalsDirectory() {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    setEmployees(getEmployees());
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        fetch("/api/reports/analytics"),
        fetch("/api/reports/audit-logs")
      ]);
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();
      if (statsData.success) setStats(statsData.data);
      if (logsData.success) setAuditLogs(logsData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const superAdmins = employees.filter((e) =>
    (e.role || "").toLowerCase().includes("admin") ||
    (e.role || "").toLowerCase().includes("management") ||
    (e.department || "").toLowerCase() === "executive"
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link
              href="/"
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
              <FiArrowLeft /> Back to Workspace
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiShield style={{ color: "var(--accent-cyan, #06b6d4)" }} /> Executive & Super Admin Portals
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "6px 0 0" }}>
              Select an administrator profile to launch their personalized slug-based executive console.
            </p>
          </div>

          <Link href="/admin/users" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FiUsers /> User Management
          </Link>
        </div>

        {/* Super Admins with Slugs */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiShield /> Super Administrator Consoles
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* System Super Admin Default */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>System Super Admin</span>
                <span className="status-tag resolved" style={{ fontSize: "0.7rem" }}>Global Root</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                Complete administrative governance over all modules and roles.
              </p>
              <Link
                href="/portal/admin/super-admin"
                className="btn-secondary"
                style={{
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                <FiLink /> Launch Console (@super-admin)
              </Link>
            </div>

            {superAdmins.map((admin) => {
              const slug = getEmployeeSlug(admin);
              return (
                <div key={admin.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{admin.name}</span>
                    <span className="status-tag inprogress" style={{ fontSize: "0.7rem" }}>{admin.role || "Admin"}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                    {admin.department || "Executive"} Department &bull; {admin.email}
                  </p>
                  <Link
                    href={`/portal/admin/${slug}`}
                    className="btn-secondary"
                    style={{
                      textDecoration: "none",
                      fontSize: "0.8rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%",
                      justifyContent: "center"
                    }}
                  >
                    <FiLink /> Open Console (@{slug})
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Analytics Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Total Projects</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {stats?.projects || 0}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Departments</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-purple, #a855f7)", marginTop: "4px" }}>
              {stats?.departments || 0}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Tasks</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
              {stats?.tasks || 0}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Total Leads</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {stats?.leads || 0}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Campaigns</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>
              {stats?.active_campaigns || 0}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Work Submissions</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ec4899", marginTop: "4px" }}>
              {stats?.work_submissions || 0}
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiActivity /> Recent Activity Logs
          </h2>
          {auditLogs.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No recent activity logged.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Submission ID</th>
                    <th>User</th>
                    <th>Transition</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.submission_id}</td>
                      <td>{log.employee_name || log.changed_by}</td>
                      <td>
                        <span style={{ color: "var(--text-muted, #64748b)", marginRight: "6px" }}>{log.old_status || "None"}</span>
                        &rarr; <span style={{ color: "var(--accent-cyan, #06b6d4)", fontWeight: 600 }}>{log.new_status}</span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>{log.comment || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
