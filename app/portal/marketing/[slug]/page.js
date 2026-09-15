"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { useAuth } from "../../../auth/AuthContext";
import { FiTrendingUp, FiArrowLeft, FiLink, FiMapPin, FiCalendar, FiLogOut, FiCheckCircle } from "react-icons/fi";

export default function MarketingSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";
  const { logout } = useAuth();

  const [marketer, setMarketer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);

  const handleSignOut = () => {
    if (logout) {
      logout();
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem("devicedesk_auth_user");
        localStorage.removeItem("devicedesk_employee_view");
        localStorage.removeItem("devicedesk_unread_chat_count");
        document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        window.location.href = "/login";
      }
    }
  };

  useEffect(() => {
    const allEmployees = getEmployees();
    const foundMarketer = findEmployeeBySlug(allEmployees, slug);
    setMarketer(foundMarketer);

    if (foundMarketer) {
      fetchMarketingData(foundMarketer.id);
    } else {
      setLoading(false);
    }
  }, [slug]);

  const fetchMarketingData = async (employeeId) => {
    try {
      const res = await fetch(`/api/marketing/attendance?employee_id=${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAttendance(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
  const activeVisit = attendance.find((a) => a.status === "Checked In");

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
              <FiMapPin style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {marketer.name} &bull; Marketing Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{marketerSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                Marketing Field Team
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.5rem 1rem",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#ef4444",
              borderColor: "rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.08)"
            }}
          >
            <FiLogOut /> Sign Out
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Total Field Visits</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {attendance.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Current Status</span>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: activeVisit ? "#10b981" : "#94a3b8", marginTop: "8px" }}>
              {activeVisit ? "Checked In (On Field)" : "Checked Out"}
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiMapPin /> Field Visits & GPS Attendance History
          </h2>
          {attendance.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No field visits recorded.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Going To</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>GPS Coordinates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.from_location || "-"}</td>
                      <td style={{ color: "var(--accent-cyan, #06b6d4)", fontWeight: 600 }}>{a.to_location || "-"}</td>
                      <td>{a.check_in_at ? new Date(a.check_in_at).toLocaleString() : "-"}</td>
                      <td>{a.check_out_at ? new Date(a.check_out_at).toLocaleString() : "-"}</td>
                      <td>
                        {a.check_in_latitude && a.check_in_longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${a.check_in_latitude},${a.check_in_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--accent-cyan, #06b6d4)", textDecoration: "underline", fontFamily: "monospace", fontSize: "0.8rem" }}
                          >
                            {Number(a.check_in_latitude).toFixed(4)}, {Number(a.check_in_longitude).toFixed(4)}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span className={`status-tag ${a.status === "Checked In" ? "inprogress" : "resolved"}`}>
                          {a.status || "Checked Out"}
                        </span>
                      </td>
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
