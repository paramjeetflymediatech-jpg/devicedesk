"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getSystems, getTasks, getDepartments } from "../../../store.js";
import { findDepartmentBySlug, getDepartmentSlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiBriefcase, FiArrowLeft, FiUsers, FiServer, FiCheckSquare, FiLink } from "react-icons/fi";

export default function DepartmentSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [deptName, setDeptName] = useState("");
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [deptSystems, setDeptSystems] = useState([]);
  const [deptTasks, setDeptTasks] = useState([]);

  useEffect(() => {
    const allDepts = getDepartments();
    const foundDept = findDepartmentBySlug(allDepts, slug);
    
    let resolvedName = "";
    if (foundDept) {
      setDepartment(foundDept);
      resolvedName = typeof foundDept === "string" ? foundDept : foundDept.name;
    } else {
      resolvedName = decodeURIComponent(slug).replace(/-/g, " ");
    }
    setDeptName(resolvedName);

    const allEmployees = getEmployees();
    const deptEmployees = allEmployees.filter(
      (e) => (e.department || "").toLowerCase() === resolvedName.toLowerCase()
    );
    setMembers(deptEmployees);

    const allSystems = getSystems();
    const sysList = allSystems.filter((s) =>
      deptEmployees.some((e) => e.id === s.assignedTo)
    );
    setDeptSystems(sysList);

    const allTasks = getTasks();
    const taskList = allTasks.filter(
      (t) =>
        deptEmployees.some((e) => e.id === t.assignedToId || e.name === t.assignedToName) ||
        (t.department || "").toLowerCase() === resolvedName.toLowerCase()
    );
    setDeptTasks(taskList);

    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Department Details...</p>
      </div>
    );
  }

  const deptSlug = getDepartmentSlug(deptName);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link
              href="/admin/departments"
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
              <FiArrowLeft /> All Departments
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiBriefcase style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {deptName} Department
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{deptSlug}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Team Members</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {members.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Assigned Hardware</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-purple, #a855f7)", marginTop: "4px" }}>
              {deptSystems.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Tasks</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {deptTasks.length}
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiUsers /> Team Members in {deptName}
          </h2>
          {members.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No team members assigned to this department.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>User Slug</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const mSlug = getEmployeeSlug(m);
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td>
                          <Link href={`/admin/users/${mSlug}`} className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", textDecoration: "none" }}>
                            @{mSlug}
                          </Link>
                        </td>
                        <td style={{ color: "var(--text-secondary, #94a3b8)" }}>{m.email}</td>
                        <td>
                          <span className="status-tag inprogress">{m.role || "Member"}</span>
                        </td>
                        <td>
                          <span className={`status-tag ${m.status === "Paused" ? "open" : "resolved"}`}>{m.status || "Active"}</span>
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
