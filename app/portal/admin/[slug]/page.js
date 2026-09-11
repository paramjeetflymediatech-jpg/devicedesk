"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getSystems, getTickets, getTasks, getDepartments } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug, getDepartmentSlug } from "../../../utils/slugUtils.js";
import { 
  FiShield, FiArrowLeft, FiUsers, FiLayers, FiCheckCircle, 
  FiActivity, FiLink, FiCpu, FiAlertTriangle, FiFileText, FiCompass, FiBriefcase
} from "react-icons/fi";

export default function SuperAdminSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const allEmps = getEmployees();
    const foundAdmin = findEmployeeBySlug(allEmps, slug) || {
      id: "super-admin",
      name: "Super Administrator",
      role: "Super Admin",
      department: "Executive",
      email: "admin@flymediatech.com"
    };
    setAdminUser(foundAdmin);
    setEmployees(allEmps);
    setSystems(getSystems());
    setTickets(getTickets());
    setTasks(getTasks());
    setDepartments(getDepartments());

    fetchAnalyticsAndLogs();
    setLoading(false);
  }, [slug]);

  const fetchAnalyticsAndLogs = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch("/api/reports/analytics"),
        fetch("/api/reports/audit-logs")
      ]);
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();
      if (statsData.success) setAnalytics(statsData.data);
      if (logsData.success) setAuditLogs(logsData.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Super Admin Console...</p>
      </div>
    );
  }

  const adminSlug = adminUser ? getEmployeeSlug(adminUser) : slug;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link
              href="/portal/admin"
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
              <FiArrowLeft /> All Admin Consoles
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiShield style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {adminUser?.name || "Super Admin"} &bull; Executive Command
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{adminSlug}
              </span>
              <span className="status-tag resolved" style={{ fontSize: "0.75rem" }}>
                {adminUser?.role || "Super Admin"} &bull; Full Permissions
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiLayers /> Main Workspace
            </Link>
            <Link href="/admin/users" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiUsers /> Manage Users
            </Link>
          </div>
        </div>

        {/* Global KPI Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Total Employees</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {employees.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Departments</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-purple, #a855f7)", marginTop: "4px" }}>
              {departments.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Hardware Systems</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>
              {systems.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Tasks</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
              {tasks.filter((t) => t.status !== "Completed").length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Open Tickets</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>
              {tickets.filter((t) => t.status !== "Resolved").length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Work Submissions</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {analytics?.work_submissions || 0}
            </div>
          </div>
        </div>

        {/* Quick Portal Switcher Grid */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiCompass /> Quick Role & Department Portal Navigation
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            <Link href="/portal/leader" style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 600, color: "var(--accent-cyan, #06b6d4)" }}>Leader Portals</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>Review departmental work & approvals</div>
            </Link>
            <Link href="/portal/hr" style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 600, color: "#ec4899" }}>HR Portal</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>Attendance, leaves & employee records</div>
            </Link>
            <Link href="/portal/it" style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 600, color: "#3b82f6" }}>IT Support Portal</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>Hardware specs, diagnostics & tickets</div>
            </Link>
            <Link href="/portal/marketing" style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 600, color: "#10b981" }}>Marketing Portal</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>Campaigns, field tracker & leads</div>
            </Link>
            <Link href="/portal/client" style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 600, color: "#f59e0b" }}>Client Portals</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>Project status & deliverables tracker</div>
            </Link>
            <Link href="/portal/developer" style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 600, color: "var(--accent-purple, #a855f7)" }}>Developer Console</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>Background agents & server telemetry</div>
            </Link>
          </div>
        </div>

        {/* Departments Overview */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiBriefcase /> Departments & Slug Routing
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
            {departments.map((dept) => {
              const deptSlug = getDepartmentSlug(dept);
              const deptMembers = employees.filter((e) => (e.department || "").toLowerCase() === (dept.name || dept || "").toLowerCase());
              return (
                <div key={dept.id || dept.name} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>{dept.name || dept}</span>
                    <span className="status-tag resolved" style={{ fontSize: "0.7rem" }}>{deptMembers.length} staff</span>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <Link
                      href={`/admin/departments/${deptSlug}`}
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--accent-cyan, #06b6d4)",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <FiLink /> /admin/departments/{deptSlug}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Logs Trail */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiActivity /> Live System Audit Trail
          </h2>
          {auditLogs.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No audit logs recorded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Submission ID</th>
                    <th>Initiated By</th>
                    <th>Status Transition</th>
                    <th>Remarks</th>
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
