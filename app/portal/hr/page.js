"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getEmployees, getDepartments } from "../../store.js";
import { getEmployeeSlug } from "../../utils/slugUtils.js";
import { 
  FiUsers, FiArrowLeft, FiCheckCircle, FiClock, FiCalendar, 
  FiFileText, FiLink, FiUserCheck, FiHeart 
} from "react-icons/fi";

export default function HRPortalsDirectory() {
  const [employees, setEmployees] = useState([]);
  const [leaveCount, setLeaveCount] = useState(0);

  useEffect(() => {
    const allEmps = getEmployees();
    setEmployees(allEmps);
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leave/list?status=ALL");
      const data = await res.json();
      if (data.success) {
        setLeaveCount((data.data || []).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const hrOfficers = employees.filter((e) =>
    (e.role || "").toLowerCase().includes("hr") ||
    (e.department || "").toLowerCase().includes("hr") ||
    (e.role || "").toLowerCase().includes("management") ||
    (e.role || "").toLowerCase().includes("admin")
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
              <FiUserCheck style={{ color: "#ec4899" }} /> Human Resources Portals & Directory
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "6px 0 0" }}>
              Access HR administrator consoles for attendance monitoring, leave approvals, and employee records.
            </p>
          </div>

          <Link href="/portal/admin" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FiUsers /> Admin Portals
          </Link>
        </div>

        {/* HR Officers List */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiUserCheck /> HR Administrators
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* General HR Portal */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>HR Department Lead</span>
                <span className="status-tag resolved" style={{ fontSize: "0.7rem" }}>HR Root</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                Centralized HR portal with full attendance tracking and leave management.
              </p>
              <Link
                href="/portal/hr/hr-admin"
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
                <FiLink /> Open Portal (@hr-admin)
              </Link>
            </div>

            {hrOfficers.map((officer) => {
              const slug = getEmployeeSlug(officer);
              return (
                <div key={officer.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{officer.name}</span>
                    <span className="status-tag inprogress" style={{ fontSize: "0.7rem" }}>{officer.role || "Officer"}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                    {officer.department || "Human Resources"} &bull; {officer.email}
                  </p>
                  <Link
                    href={`/portal/hr/${slug}`}
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

        {/* Quick HR Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Total Staff Onboard</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {employees.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Leave Requests Recorded</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ec4899", marginTop: "4px" }}>
              {leaveCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
