'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiMonitor, FiLink, FiArrowLeft, FiPlus, FiCpu, FiHardDrive } from "react-icons/fi";
import { getSystems, getEmployees } from "../../store.js";
import { getSystemSlug, getEmployeeSlug } from "../../utils/slugUtils.js";

export default function AdminSystemsPage() {
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    setSystems(getSystems());
    setEmployees(getEmployees());
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiMonitor style={{ color: "var(--accent-cyan, #06b6d4)" }} /> Hardware Fleet Management
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              Manage systems, hardware specifications, and system routing slugs.
            </p>
          </div>
        </div>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={{ padding: "14px 16px" }}>System Number</th>
                <th style={{ padding: "14px 16px" }}>System Slug</th>
                <th style={{ padding: "14px 16px" }}>Processor / CPU</th>
                <th style={{ padding: "14px 16px" }}>Memory & Storage</th>
                <th style={{ padding: "14px 16px" }}>Assigned To</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((sys) => {
                const sysSlug = getSystemSlug(sys);
                const assigned = employees.find((e) => e.id === sys.assignedTo);
                const empSlug = assigned ? getEmployeeSlug(assigned) : "";

                return (
                  <tr key={sys.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                      <Link href={`/admin/systems/${sysSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none" }}>
                        {sys.systemNumber || sys.id}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/admin/systems/${sysSlug}`}
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
                        <FiLink style={{ fontSize: "0.65rem" }} /> @{sysSlug}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
                      {sys.cpu || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>
                      {sys.ram || "N/A"} / {sys.storage || "N/A"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {assigned ? (
                        <Link href={`/admin/users/${empSlug}`} style={{ color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
                          {assigned.name}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-muted, #64748b)", fontSize: "0.85rem" }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`status-tag ${sys.status === "Active" ? "resolved" : "open"}`} style={{ fontSize: "0.75rem" }}>
                        {sys.status || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link href={`/admin/systems/${sysSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
