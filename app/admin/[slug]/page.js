'use client';

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getSystems, getTickets, getTasks, getDepartments } from "../../store.js";
import { findEmployeeBySlug, findSystemBySlug, findDepartmentBySlug, getEmployeeSlug, getSystemSlug } from "../../utils/slugUtils.js";
import { 
  FiShield, FiArrowLeft, FiUsers, FiMonitor, FiBriefcase, 
  FiCheckSquare, FiAlertCircle, FiClock, FiCalendar, FiLink, 
  FiActivity, FiLayers 
} from "react-icons/fi";

export default function AdminDynamicSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [loading, setLoading] = useState(true);
  const [targetType, setTargetType] = useState("unknown");
  const [dataItem, setDataItem] = useState(null);

  // Check what the slug represents
  useEffect(() => {
    const s = slug.toLowerCase().trim();

    // 1. Direct tab slugs redirect
    const tabMap = {
      "dashboard": "/",
      "employees": "/admin/users",
      "users": "/admin/users",
      "systems": "/admin/systems",
      "hardware": "/admin/systems",
      "departments": "/admin/departments",
      "tasks": "/admin/tasks",
      "tickets": "/admin/tickets",
      "attendance": "/admin/attendance",
      "leaves": "/admin/leaves",
      "projects": "/admin/projects",
      "domains": "/admin/domains",
      "domain": "/admin/domains",
      "marketing": "/admin/marketing",
      "submissions": "/admin/submissions",
      "audit-logs": "/admin/audit-logs",
      "audit": "/admin/audit-logs"
    };

    if (tabMap[s]) {
      router.replace(tabMap[s]);
      return;
    }

    // 2. Check if slug matches a User / Employee
    const allEmps = getEmployees();
    const foundEmp = findEmployeeBySlug(allEmps, slug);
    if (foundEmp) {
      setTargetType("user");
      setDataItem(foundEmp);
      setLoading(false);
      return;
    }

    // 3. Check if slug matches a Hardware System
    const allSystems = getSystems();
    const foundSys = findSystemBySlug(allSystems, slug);
    if (foundSys) {
      setTargetType("system");
      setDataItem(foundSys);
      setLoading(false);
      return;
    }

    // 4. Check if slug matches a Department
    const allDepts = getDepartments();
    const foundDept = findDepartmentBySlug(allDepts, slug);
    if (foundDept) {
      setTargetType("department");
      setDataItem(foundDept);
      setLoading(false);
      return;
    }

    setTargetType("not_found");
    setLoading(false);
  }, [slug, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Resolving Admin Slug Route (@{slug})...</p>
      </div>
    );
  }

  // 1. User Slug View
  if (targetType === "user" && dataItem) {
    const userSlug = getEmployeeSlug(dataItem);
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <Link href="/admin/users" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
            <FiArrowLeft /> All Users
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FiUsers style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {dataItem.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
              <FiLink style={{ marginRight: "3px" }} /> @{userSlug}
            </span>
            <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
              {dataItem.role || "Team Member"} &bull; {dataItem.department || "General"}
            </span>
          </div>

          <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Staff Information</h3>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
                <div><strong>Email:</strong> {dataItem.email}</div>
                <div style={{ marginTop: "8px" }}><strong>Status:</strong> {dataItem.status || "Active"}</div>
                <div style={{ marginTop: "8px" }}><strong>Ticket Limit:</strong> {dataItem.ticketLimit || 5} tickets</div>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Quick Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Link href={`/admin/attendance/${userSlug}`} className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.8rem", textAlign: "center" }}>
                  View Attendance History
                </Link>
                <Link href={`/admin/leaves/${userSlug}`} className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.8rem", textAlign: "center" }}>
                  View Leave Records
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Hardware System Slug View
  if (targetType === "system" && dataItem) {
    const sysSlug = getSystemSlug(dataItem);
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <Link href="/admin/systems" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
            <FiArrowLeft /> All Hardware Systems
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FiMonitor style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {dataItem.systemNumber || dataItem.id}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
              <FiLink style={{ marginRight: "3px" }} /> @{sysSlug}
            </span>
          </div>

          <div style={{ marginTop: "2rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Specifications</h3>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
              <div><strong>Processor (CPU):</strong> {dataItem.cpu || "N/A"}</div>
              <div style={{ marginTop: "6px" }}><strong>Memory (RAM):</strong> {dataItem.ram || "N/A"}</div>
              <div style={{ marginTop: "6px" }}><strong>Storage:</strong> {dataItem.storage || "N/A"}</div>
              <div style={{ marginTop: "6px" }}><strong>OS:</strong> {dataItem.os || "N/A"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Fallback / Not Found
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        <h2>Admin Slug Route Not Found</h2>
        <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>
          No admin view, user, system, or department matching &quot;{slug}&quot; was found.
        </p>
        <Link href="/admin" className="btn-primary" style={{ textDecoration: "none" }}>
          Return to Admin Hub
        </Link>
      </div>
    </div>
  );
}
