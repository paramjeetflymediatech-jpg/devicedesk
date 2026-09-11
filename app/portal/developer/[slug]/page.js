"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getTasks } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { 
  FiTerminal, FiArrowLeft, FiCode, FiActivity, 
  FiLink, FiServer, FiLayers, FiCpu, FiCheckCircle 
} from "react-icons/fi";

export default function DeveloperSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [devUser, setDevUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const allEmps = getEmployees();
    const foundDev = findEmployeeBySlug(allEmps, slug) || {
      id: "dev-lead",
      name: "Developer Specialist",
      role: "Software Engineer",
      department: "Development",
      email: "dev@flymediatech.com"
    };
    setDevUser(foundDev);
    const allTasks = getTasks();
    const myTasks = allTasks.filter((t) => t.assignedToId === foundDev.id || t.assignedToName === foundDev.name);
    setTasks(myTasks);
    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Engineering Console...</p>
      </div>
    );
  }

  const devSlug = devUser ? getEmployeeSlug(devUser) : slug;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link
              href="/portal/developer"
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
              <FiArrowLeft /> All Developer Consoles
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiTerminal style={{ color: "var(--accent-purple, #a855f7)" }} /> {devUser?.name || "Developer"} &bull; Engineering Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{devSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                {devUser?.role || "Developer"} &bull; {devUser?.department || "Development"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/developer/logs" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiActivity /> Agent Logs
            </Link>
            <Link href="/developer/dashboard" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiServer /> Agent Dashboard
            </Link>
          </div>
        </div>

        {/* Developer Tasks & Controls */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiCode /> Assigned Development Sprints & Tasks
          </h2>
          {tasks.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No pending development tasks assigned.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Status</th>
                    <th>Assigned By</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td>
                        <span className={`status-tag ${t.status === "Completed" ? "resolved" : "inprogress"}`}>
                          {t.status || "In Progress"}
                        </span>
                      </td>
                      <td>{t.assignedByName || "Lead"}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Recent"}
                      </td>
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
