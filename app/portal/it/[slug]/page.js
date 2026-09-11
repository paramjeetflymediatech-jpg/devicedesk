"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getSystems, getTickets } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug, getSystemSlug } from "../../../utils/slugUtils.js";
import { 
  FiCpu, FiArrowLeft, FiCheckCircle, FiTool, FiLayers, 
  FiLink, FiAlertCircle, FiMonitor, FiCheck, FiX 
} from "react-icons/fi";

export default function ITSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [itUser, setItUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const allEmps = getEmployees();
    const foundIt = findEmployeeBySlug(allEmps, slug) || {
      id: "it-engineer",
      name: "IT Support Engineer",
      role: "IT Engineer",
      department: "IT Support",
      email: "it@flymediatech.com"
    };
    setItUser(foundIt);
    setEmployees(allEmps);
    setSystems(getSystems());
    setTickets(getTickets());
    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading IT Infrastructure Console...</p>
      </div>
    );
  }

  const itSlug = itUser ? getEmployeeSlug(itUser) : slug;
  const openTickets = tickets.filter((t) => (t.status || "").toLowerCase() !== "resolved");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link
              href="/portal/it"
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
              <FiArrowLeft /> All IT Consoles
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiCpu style={{ color: "#38bdf8" }} /> {itUser?.name || "IT Engineer"} &bull; IT Support Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{itSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                {itUser?.role || "IT Engineer"} &bull; IT Support
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiMonitor /> System Tracking
            </Link>
          </div>
        </div>

        {/* IT KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Tracked Systems</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {systems.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Tickets</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>
              {openTickets.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Resolved Tickets</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {tickets.filter((t) => (t.status || "").toLowerCase() === "resolved").length}
            </div>
          </div>
        </div>

        {/* Hardware Systems Grid */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiMonitor /> Hardware Fleet & Allocation
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {systems.map((sys) => {
              const assignedEmp = employees.find((e) => e.id === sys.assignedTo);
              const empSlug = assignedEmp ? getEmployeeSlug(assignedEmp) : "";
              return (
                <div key={sys.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>{sys.systemNumber || sys.id}</span>
                    <span className={`status-tag ${sys.status === "Active" ? "resolved" : "open"}`} style={{ fontSize: "0.7rem" }}>
                      {sys.status || "Active"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "6px 0" }}>
                    <div><strong>CPU:</strong> {sys.cpu || "N/A"}</div>
                    <div><strong>RAM:</strong> {sys.ram || "N/A"} &bull; <strong>Storage:</strong> {sys.storage || "N/A"}</div>
                    <div><strong>OS:</strong> {sys.os || "N/A"}</div>
                  </div>
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.75rem" }}>
                    {assignedEmp ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Assigned to: <strong>{assignedEmp.name}</strong></span>
                        <Link href={`/admin/users/${empSlug}`} style={{ color: "var(--accent-purple, #a855f7)", textDecoration: "none" }}>
                          @{empSlug}
                        </Link>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted, #64748b)" }}>Unassigned Inventory</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Queue */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiAlertCircle /> IT Support Tickets Queue
          </h2>
          {tickets.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No support tickets registered.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Title & Issue</th>
                    <th>System Number</th>
                    <th>Raised By</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div>{t.title}</div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>{t.description || "-"}</span>
                      </td>
                      <td>{t.systemNumber || "N/A"}</td>
                      <td>{t.raisedByName || t.raisedBy || "Staff"}</td>
                      <td>
                        <span className={`status-tag ${t.severity === "High" ? "open" : t.severity === "Medium" ? "inprogress" : "resolved"}`}>
                          {t.severity || "Normal"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-tag ${t.status === "Resolved" ? "resolved" : "open"}`}>
                          {t.status || "Open"}
                        </span>
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
