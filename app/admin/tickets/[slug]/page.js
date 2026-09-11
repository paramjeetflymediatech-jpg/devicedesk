'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiAlertCircle, FiArrowLeft, FiMonitor, FiUser, FiLink, FiCheckCircle } from "react-icons/fi";
import { getTickets, getEmployees, getSystems } from "../../../store.js";
import { getEmployeeSlug, getSystemSlug } from "../../../utils/slugUtils.js";

export default function AdminSingleTicketPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [ticket, setTicket] = useState(null);
  const [raisedUser, setRaisedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allTickets = getTickets();
    const found = allTickets.find((t) => `ticket-${t.id}` === slug || t.id === slug || t.title.toLowerCase().includes(slug.toLowerCase()));
    setTicket(found);

    if (found) {
      const allEmps = getEmployees();
      const emp = allEmps.find((e) => e.id === found.raisedBy);
      setRaisedUser(emp);
    }
    setLoading(false);
  }, [slug]);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Ticket...</div>;
  }

  if (!ticket) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2>Ticket Not Found</h2>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>No support ticket matching "{slug}" was found.</p>
          <Link href="/admin/tickets" className="btn-primary" style={{ textDecoration: "none" }}>Back to Tickets</Link>
        </div>
      </div>
    );
  }

  const empSlug = raisedUser ? getEmployeeSlug(raisedUser) : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link href="/admin/tickets" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> All Tickets
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiAlertCircle style={{ color: "#ef4444" }} /> {ticket.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @ticket-{ticket.id}
              </span>
              <span className={`status-tag ${ticket.status === "Resolved" ? "resolved" : "open"}`} style={{ fontSize: "0.75rem" }}>
                {ticket.status || "Open"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Description</h3>
          <p style={{ color: "var(--text-secondary, #94a3b8)", lineHeight: 1.6 }}>{ticket.description || "No description provided."}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>System Number</span>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>{ticket.systemNumber || "N/A"}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Raised By</span>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>
                {raisedUser ? (
                  <Link href={`/admin/users/${empSlug}`} style={{ color: "var(--accent-cyan, #06b6d4)", textDecoration: "none" }}>
                    {raisedUser.name}
                  </Link>
                ) : (
                  ticket.raisedByName || "Staff"
                )}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Severity</span>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>{ticket.severity || "Normal"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
