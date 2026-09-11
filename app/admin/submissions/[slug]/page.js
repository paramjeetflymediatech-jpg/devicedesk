'use client';
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiFileText, FiArrowLeft, FiLink } from "react-icons/fi";

export default function AdminSubmissionsSlugPage() {
  const params = useParams();
  const slug = params?.slug ? String(params.slug) : "";

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/work-submissions")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const found = (d.data || []).find((s) => s.id === slug || `sub-${s.id}` === slug);
          setSubmission(found || { id: slug, status: "Submitted" });
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Submission...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <Link href="/admin/submissions" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
          <FiArrowLeft /> All Work Submissions
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0 0 1.5rem" }}>
          Submission {submission?.id || slug}
        </h1>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <p style={{ color: "var(--text-secondary, #94a3b8)" }}>{submission?.description || "Work submission logs and deliverables."}</p>
          <div style={{ marginTop: "1rem" }}>
            <span className="status-tag resolved">{submission?.status || "Approved"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
