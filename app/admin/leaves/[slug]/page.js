'use client';
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiCalendar, FiArrowLeft, FiUser, FiLink } from "react-icons/fi";
import { getEmployees } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";

export default function AdminLeavesSlugPage() {
  const params = useParams();
  const slug = params?.slug ? String(params.slug) : "";

  const [employee, setEmployee] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allEmps = getEmployees();
    const found = findEmployeeBySlug(allEmps, slug);
    setEmployee(found);

    if (found) {
      fetch("/api/leave/list?status=ALL")
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const userLeaves = (d.data || []).filter((l) => l.employeeId === found.id || l.employeeName === found.name);
            setLeaves(userLeaves);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [slug]);

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Leave Records...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <Link href="/admin/leaves" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
          <FiArrowLeft /> All Leaves
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0 0 1.5rem" }}>
          {employee ? employee.name : slug} &bull; Leave History
        </h1>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={{ padding: "14px 16px" }}>Type</th>
                <th style={{ padding: "14px 16px" }}>Dates</th>
                <th style={{ padding: "14px 16px" }}>Days</th>
                <th style={{ padding: "14px 16px" }}>Reason</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{l.leaveType}</td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>{l.fromDate} &rarr; {l.toDate}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 700 }}>{l.totalDays} d</td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>{l.reason || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span className={`status-tag ${l.status === "Approved" ? "resolved" : l.status === "Rejected" ? "open" : "inprogress"}`}>{l.status || "Pending"}</span>
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #64748b)" }}>No leaves on record.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
