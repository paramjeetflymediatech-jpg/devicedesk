'use client';

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiGlobe, FiArrowLeft, FiClock, FiCalendar, FiDollarSign, 
  FiUser, FiMail, FiCheckCircle, FiAlertTriangle, FiLink, 
  FiRefreshCw, FiEdit2, FiShield 
} from "react-icons/fi";
import { getDomainSlug } from "../../../utils/slugUtils.js";

export default function SingleDomainSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [domain, setDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSentNotice, setAlertSentNotice] = useState("");

  useEffect(() => {
    fetchDomainDetail();
  }, [slug]);

  const fetchDomainDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/domains/${slug}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDomain(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSingleAlert = async () => {
    if (!domain) return;
    setSendingAlert(true);
    try {
      const res = await fetch("/api/domains/check-expiry", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAlertSentNotice("Expiration alert dispatched to client and super admin!");
        setTimeout(() => setAlertSentNotice(""), 6000);
      } else {
        alert(data.error || "Failed to dispatch email");
      }
    } catch (e) {
      alert("Error sending alert email");
    } finally {
      setSendingAlert(false);
    }
  };

  const handleQuickRenew = async () => {
    if (!domain) return;
    const currentExp = domain.expiry_date ? new Date(domain.expiry_date) : new Date();
    currentExp.setFullYear(currentExp.getFullYear() + 1);
    const newExpDateStr = currentExp.toISOString().split("T")[0];

    if (!confirm(`Extend expiry date for "${domain.domain_name}" to ${newExpDateStr}?`)) return;

    try {
      const res = await fetch(`/api/domains/${domain.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiry_date: newExpDateStr,
          status: "Active"
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchDomainDetail();
      } else {
        alert(data.error || "Failed to renew domain");
      }
    } catch (e) {
      alert("Error updating renewal date");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Domain Specifications (@{slug})...</p>
      </div>
    );
  }

  if (!domain) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <h2>Domain Record Not Found</h2>
        <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>
          No domain matching slug "{slug}" was found in the portfolio.
        </p>
        <Link href="/admin/domains" className="btn-primary" style={{ textDecoration: "none" }}>
          Return to Domains Directory
        </Link>
      </div>
    );
  }

  const domSlug = getDomainSlug(domain);
  const daysLeft = domain.days_left;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <Link
            href="/admin/domains"
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
            <FiArrowLeft /> All Domains
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FiGlobe style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {domain.domain_name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
              <FiLink style={{ marginRight: "3px" }} /> @{domSlug}
            </span>
            <span
              className={`status-tag ${
                domain.status === "Active" ? "resolved" : domain.status === "Expiring Soon" ? "inprogress" : "open"
              }`}
              style={{ fontSize: "0.75rem" }}
            >
              {domain.status}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleSendSingleAlert}
            disabled={sendingAlert}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiMail style={{ color: "#ec4899" }} /> {sendingAlert ? "Sending Alert..." : "Send Expiry Alert Email"}
          </button>
          <button
            onClick={handleQuickRenew}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiRefreshCw /> +1 Year Quick Renew
          </button>
        </div>
      </div>

      {alertSentNotice && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#10b981", padding: "12px 16px", borderRadius: "12px", marginBottom: "1.5rem" }}>
          <FiCheckCircle style={{ marginRight: "8px" }} /> {alertSentNotice}
        </div>
      )}

      {/* Main Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Left Column: Domain Specs & Countdown */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiClock /> Expiration & Renewal Details
          </h2>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Days Until Expiry</span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  marginTop: "4px",
                  color: daysLeft < 0 ? "#ef4444" : daysLeft <= 30 ? "#f59e0b" : "#10b981"
                }}
              >
                {daysLeft < 0 ? `${Math.abs(daysLeft)} Days Expired` : `${daysLeft} Days Remaining`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Expiry Date</span>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "4px" }}>{domain.expiry_date}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Registrar</span>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>{domain.registrar || "GoDaddy"}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Registration Date</span>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>{domain.registration_date || "—"}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Estimated Renewal Cost</span>
              <div style={{ fontWeight: 700, marginTop: "4px", color: "var(--accent-purple, #a855f7)" }}>
                ${domain.renewal_cost || "0.00"}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Auto-Renewal</span>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>{domain.auto_renew ? "Enabled (Auto)" : "Disabled (Manual)"}</div>
            </div>
          </div>

          {domain.notes && (
            <div style={{ marginTop: "1.25rem", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Technical Notes & DNS Details</span>
              <p style={{ margin: "6px 0 0", fontSize: "0.85rem", lineHeight: 1.5 }}>{domain.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column: Client / Owner Card */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiUser /> Client & Owner Details
          </h2>

          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Client Name</span>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>{domain.client_name || "Unassigned Corporate Domain"}</div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Client Alert Email</span>
            <div style={{ fontSize: "0.95rem", color: "var(--accent-cyan, #06b6d4)", fontWeight: 600, marginTop: "2px" }}>
              {domain.client_email || "No Email Specified"}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Last Notification Dispatched</span>
            <div style={{ fontSize: "0.85rem", marginTop: "2px" }}>
              {domain.last_notified_at ? new Date(domain.last_notified_at).toLocaleString() : "Never notified"}
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <a
              href={`https://${domain.domain_name}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ width: "100%", justifyContent: "center", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FiExternalLink /> Visit Live Website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
