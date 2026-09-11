'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiMonitor, FiArrowLeft, FiCpu, FiHardDrive, FiUser, FiLink, FiLayers, FiActivity } from "react-icons/fi";
import { getSystems, getEmployees, getTickets } from "../../../store.js";
import { findSystemBySlug, getSystemSlug, getEmployeeSlug } from "../../../utils/slugUtils.js";

export default function AdminSingleSystemPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [system, setSystem] = useState(null);
  const [assignedEmp, setAssignedEmp] = useState(null);
  const [systemTickets, setSystemTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allSystems = getSystems();
    const found = findSystemBySlug(allSystems, slug);
    setSystem(found);

    if (found) {
      const allEmps = getEmployees();
      const emp = allEmps.find((e) => e.id === found.assignedTo);
      setAssignedEmp(emp);

      const allTickets = getTickets();
      const tkts = allTickets.filter((t) => t.systemId === found.id || t.systemNumber === found.systemNumber);
      setSystemTickets(tkts);
    }
    setLoading(false);
  }, [slug]);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading System Details...</div>;
  }

  if (!system) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2>Hardware System Not Found</h2>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>No machine matching slug "{slug}" was found.</p>
          <Link href="/admin/systems" className="btn-primary" style={{ textDecoration: "none" }}>Back to Fleet</Link>
        </div>
      </div>
    );
  }

  const sysSlug = getSystemSlug(system);
  const empSlug = assignedEmp ? getEmployeeSlug(assignedEmp) : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link href="/admin/systems" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> All Hardware Systems
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiMonitor style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {system.systemNumber || system.id} &bull; System Specifications
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{sysSlug}
              </span>
              <span className={`status-tag ${system.status === "Active" ? "resolved" : "open"}`} style={{ fontSize: "0.75rem" }}>
                {system.status || "Active"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiCpu /> Hardware Specifications
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Processor (CPU)</span>
                <div style={{ fontWeight: 700, marginTop: "4px" }}>{system.cpu || "N/A"}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Memory (RAM)</span>
                <div style={{ fontWeight: 700, marginTop: "4px" }}>{system.ram || "N/A"}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Storage</span>
                <div style={{ fontWeight: 700, marginTop: "4px" }}>{system.storage || "N/A"}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Operating System</span>
                <div style={{ fontWeight: 700, marginTop: "4px" }}>{system.os || "N/A"}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Motherboard / Model</span>
                <div style={{ fontWeight: 700, marginTop: "4px" }}>{system.model || "N/A"}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Remarks</span>
                <div style={{ fontWeight: 500, marginTop: "4px", fontSize: "0.85rem" }}>{system.remarks || "—"}</div>
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiUser /> Assigned Employee
            </h2>
            {assignedEmp ? (
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{assignedEmp.name}</div>
                <div style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.85rem", marginTop: "2px" }}>{assignedEmp.role} &bull; {assignedEmp.department}</div>
                <div style={{ marginTop: "1rem" }}>
                  <Link href={`/admin/users/${empSlug}`} className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <FiLink /> View User Profile (@{empSlug})
                  </Link>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted, #64748b)", fontSize: "0.85rem" }}>This system is currently unallocated in the inventory.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
