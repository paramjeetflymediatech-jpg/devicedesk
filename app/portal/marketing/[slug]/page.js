"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiTrendingUp, FiArrowLeft, FiLink, FiUsers, FiMapPin, FiCalendar, FiDollarSign } from "react-icons/fi";

export default function MarketingSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [marketer, setMarketer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const allEmployees = getEmployees();
    const foundMarketer = findEmployeeBySlug(allEmployees, slug);
    setMarketer(foundMarketer);

    if (foundMarketer) {
      fetchMarketingData();
    }
    setLoading(false);
  }, [slug]);

  const fetchMarketingData = async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        fetch("/api/marketing/campaigns"),
        fetch("/api/marketing/leads")
      ]);
      const cData = await cRes.json();
      const lData = await lRes.json();
      if (cData.success) setCampaigns(cData.data || []);
      if (lData.success) setLeads(lData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Marketing Dashboard...</p>
      </div>
    );
  }

  if (!marketer) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2>Marketer Not Found</h2>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>
            No marketer matching slug &quot;{slug}&quot; was found.
          </p>
          <Link href="/portal/marketing" className="btn-primary" style={{ textDecoration: "none" }}>
            Return to Marketing Portal
          </Link>
        </div>
      </div>
    );
  }

  const marketerSlug = getEmployeeSlug(marketer);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link
              href="/portal/marketing"
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
              <FiArrowLeft /> All Marketing Portals
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiTrendingUp style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {marketer.name} &bull; Marketing Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{marketerSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                Marketing Team
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Total Campaigns</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {campaigns.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Leads</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {leads.length}
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiTrendingUp /> Active Marketing Campaigns
          </h2>
          {campaigns.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No active marketing campaigns.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Campaign Name</th>
                    <th>Platform</th>
                    <th>Status</th>
                    <th>Leads Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.platform || "Google / Meta"}</td>
                      <td>
                        <span className="status-tag resolved">{c.status || "Active"}</span>
                      </td>
                      <td style={{ color: "var(--accent-cyan, #06b6d4)", fontWeight: 700 }}>{c.leads_count || 0}</td>
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
