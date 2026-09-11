'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiAlertCircle, FiLink, FiArrowLeft, FiPlus, FiCheckCircle } from "react-icons/fi";
import { getTickets, getEmployees } from "../../store.js";
import { getEmployeeSlug } from "../../utils/slugUtils.js";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    setTickets(getTickets());
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
              <FiAlertCircle style={{ color: "#ef4444" }} /> Support Tickets Pipeline
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              Track hardware issues, support tickets, and resolution metrics.
            </p>
          </div>
        </div>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={{ padding: "14px 16px" }}>Ticket Title</th>
                <th style={{ padding: "14px 16px" }}>Ticket Slug</th>
                <th style={{ padding: "14px 16px" }}>System #</th>
                <th style={{ padding: "14px 16px" }}>Raised By</th>
                <th style={{ padding: "14px 16px" }}>Severity</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const ticketSlug = `ticket-${t.id}`;
                const raisedEmp = employees.find((e) => e.id === t.raisedBy);
                const empSlug = raisedEmp ? getEmployeeSlug(raisedEmp) : "";

                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      <Link href={`/admin/tickets/${ticketSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none" }}>
                        {t.title}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/admin/tickets/${ticketSlug}`}
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
                        <FiLink style={{ fontSize: "0.65rem" }} /> @{ticketSlug}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--accent-cyan, #06b6d4)" }}>
                      {t.systemNumber || "N/A"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {raisedEmp ? (
                        <Link href={`/admin/users/${empSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none", fontSize: "0.85rem" }}>
                          {raisedEmp.name}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.85rem" }}>{t.raisedByName || "Staff"}</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`status-tag ${t.severity === "High" ? "open" : t.severity === "Medium" ? "inprogress" : "resolved"}`} style={{ fontSize: "0.75rem" }}>
                        {t.severity || "Normal"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`status-tag ${t.status === "Resolved" ? "resolved" : "open"}`} style={{ fontSize: "0.75rem" }}>
                        {t.status || "Open"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link href={`/admin/tickets/${ticketSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                        View &rarr;
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
