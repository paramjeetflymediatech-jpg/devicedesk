'use client';
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiActivity, FiArrowLeft, FiLink } from "react-icons/fi";

export default function AdminAuditLogsSlugPage() {
  const params = useParams();
  const slug = params?.slug ? String(params.slug) : "";

  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/audit-logs")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const found = (d.data || []).find((l) => `log-${l.id}` === slug || String(l.id) === slug);
          setLog(found || { id: slug, comment: "Audit record for " + slug });
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Log Record...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <Link href="/admin/audit-logs" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
          <FiArrowLeft /> All Audit Logs
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0 0 1.5rem" }}>
          Log Entry {log?.id || slug}
        </h1>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary, #94a3b8)" }}>
            <div><strong>Timestamp:</strong> {log?.created_at ? new Date(log.created_at).toLocaleString() : "Recent"}</div>
            <div style={{ marginTop: "6px" }}><strong>Changed By:</strong> {log?.employee_name || log?.changed_by || "System"}</div>
            <div style={{ marginTop: "6px" }}><strong>Transition:</strong> {log?.old_status || "None"} &rarr; {log?.new_status}</div>
            <div style={{ marginTop: "6px" }}><strong>Comment:</strong> {log?.comment || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
