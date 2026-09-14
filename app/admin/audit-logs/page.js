'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiActivity, FiArrowLeft, FiSearch } from "react-icons/fi";
import Pagination from "../../components/Pagination";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetch("/api/reports/audit-logs")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLogs(d.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const entity = String(log.submission_id || "").toLowerCase();
    const changer = String(log.employee_name || log.changed_by || "").toLowerCase();
    const status = String(log.new_status || "").toLowerCase();
    const notes = String(log.comment || "").toLowerCase();
    return entity.includes(q) || changer.includes(q) || status.includes(q) || notes.includes(q);
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedLogs = filteredLogs.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiActivity style={{ color: "#f43f5e" }} /> System Audit Trail & Logs
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              Comprehensive event logging and state transition history.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ position: "relative", minWidth: "260px" }}>
              <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }} />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.6rem 1rem 0.6rem 2.4rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "0.875rem"
                }}
              />
            </div>
          </div>
        </div>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={{ padding: "14px 16px" }}>Timestamp</th>
                <th style={{ padding: "14px 16px" }}>Submission / Entity</th>
                <th style={{ padding: "14px 16px" }}>Changed By</th>
                <th style={{ padding: "14px 16px" }}>Status Change</th>
                <th style={{ padding: "14px 16px" }}>Notes</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #64748b)" }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  const logSlug = `log-${log.id}`;
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 600 }}>{log.submission_id}</td>
                      <td style={{ padding: "14px 16px" }}>{log.employee_name || log.changed_by}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ color: "var(--text-muted, #64748b)", marginRight: "4px" }}>{log.old_status || "None"}</span>
                        &rarr; <span style={{ color: "var(--accent-cyan, #06b6d4)", fontWeight: 600 }}>{log.new_status}</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>{log.comment || "—"}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <Link href={`/admin/audit-logs/${logSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #64748b)" }}>
                    {search ? "No audit logs matching search criteria." : "No audit records registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemName="logs"
        />
      </div>
    </div>
  );
}
