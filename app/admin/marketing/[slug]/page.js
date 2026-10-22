'use client';
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiMapPin, FiTrash2, FiExternalLink, FiCompass } from "react-icons/fi";
import Swal from "sweetalert2";

export default function AdminMarketingSlugPage() {
  const params = useParams();
  const slug = params?.slug ? String(params.slug) : "";

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = () => {
    fetch(`/api/marketing/attendance?employee_id=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAttendance(d.data || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttendance();
  }, [slug]);

  const handleDeleteTrip = async (tripId) => {
    const confirm = await Swal.fire({
      title: "Delete Trip Record?",
      text: "Are you sure you want to permanently delete this field trip record and its GPS path? This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete Record"
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/marketing/attendance?id=${encodeURIComponent(tripId)}`, {
          method: "DELETE"
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Trip record deleted successfully.",
            timer: 1500,
            showConfirmButton: false
          });
          setAttendance((prev) => prev.filter((t) => t.id !== tripId));
        } else {
          Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text: data.error || "Failed to delete record."
          });
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.message || "Server error while deleting."
        });
      }
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", background: "transparent", color: "var(--text-primary, #f8fafc)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid rgba(6, 182, 212, 0.2)", borderTopColor: "#06b6d4", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.85rem" }}>Loading Field Trips...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: "var(--text-primary, #f8fafc)", padding: "1rem" }} className="sm:p-6 lg:p-8">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Link href="/admin/marketing" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "12px", fontWeight: 600 }}>
          <FiArrowLeft /> Back to Marketing Overview
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FiMapPin style={{ color: "var(--accent-cyan, #06b6d4)" }} /> Field Trips for {slug}
          </h1>
          <span style={{ background: "rgba(6, 182, 212, 0.12)", color: "#06b6d4", border: "1px solid rgba(6, 182, 212, 0.25)", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700 }}>
            {attendance.length} Total Records
          </span>
        </div>

        <div style={{ background: "var(--bg-card, rgba(255, 255, 255, 0.03))", border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))", borderRadius: "16px", padding: "1.25rem" }} className="sm:p-6">
          {attendance.length === 0 ? (
            <p style={{ color: "var(--text-secondary, #94a3b8)", textAlign: "center", padding: "2rem" }}>No field trips logged for this employee.</p>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="block md:hidden space-y-3.5">
                {attendance.map((a) => {
                  const isOngoing = a.status === "Checked In";
                  return (
                    <div
                      key={a.id}
                      style={{
                        background: "rgba(0, 0, 0, 0.2)",
                        border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                        borderRadius: "14px",
                        padding: "1rem"
                      }}
                      className="space-y-3"
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)", fontFamily: "monospace" }}>
                          Trip #{a.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isOngoing ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-gray-500/15 text-gray-400 border border-gray-500/20"
                        }`}>
                          {a.status || "Checked Out"}
                        </span>
                      </div>

                      <div style={{ background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px", padding: "10px", fontSize: "0.8rem" }} className="space-y-2">
                        <div>
                          <span style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.7rem", fontWeight: 700, display: "block" }}>FROM</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary, #f8fafc)", wordBreak: "break-word" }}>{a.from_location || "-"}</span>
                          {a.check_in_at && (
                            <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted, #64748b)", marginTop: "2px" }}>
                              {new Date(a.check_in_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                        </div>

                        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "6px" }}>
                          <span style={{ color: "#06b6d4", fontSize: "0.7rem", fontWeight: 700, display: "block" }}>TO</span>
                          <span style={{ fontWeight: 700, color: "#22d3ee", wordBreak: "break-word" }}>{a.to_location || "-"}</span>
                          {a.check_out_at && (
                            <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted, #64748b)", marginTop: "2px" }}>
                              {new Date(a.check_out_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", paddingTop: "4px" }}>
                        {a.check_in_latitude && a.check_in_longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${a.check_in_latitude},${a.check_in_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "#06b6d4",
                              background: "rgba(6, 182, 212, 0.12)",
                              border: "1px solid rgba(6, 182, 212, 0.25)",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textDecoration: "none"
                            }}
                          >
                            <FiCompass size={12} /> View GPS Pin
                          </a>
                        ) : <span />}

                        <button
                          type="button"
                          onClick={() => handleDeleteTrip(a.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#ef4444",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700
                          }}
                        >
                          <FiTrash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto w-full max-w-full">
                <table className="w-full text-left" style={{ borderCollapse: "separate", borderSpacing: "0" }}>
                  <thead>
                    <tr style={{ background: "rgba(0, 0, 0, 0.2)", borderBottom: "1px solid var(--glass-border, rgba(255, 255, 255, 0.1))" }}>
                      <th style={{ padding: "12px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase" }}>From</th>
                      <th style={{ padding: "12px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase" }}>Going To</th>
                      <th style={{ padding: "12px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Check-In</th>
                      <th style={{ padding: "12px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Check-Out</th>
                      <th style={{ padding: "12px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", whiteSpace: "nowrap" }}>GPS Pin</th>
                      <th style={{ padding: "12px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ padding: "12px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <td style={{ padding: "12px 14px", fontSize: "0.85rem", fontWeight: 600, maxWidth: "200px", wordBreak: "break-word" }}>{a.from_location || "-"}</td>
                        <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: "var(--accent-cyan, #06b6d4)", fontWeight: 700, maxWidth: "200px", wordBreak: "break-word" }}>{a.to_location || "-"}</td>
                        <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "var(--text-secondary, #94a3b8)", whiteSpace: "nowrap" }}>{a.check_in_at ? new Date(a.check_in_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}</td>
                        <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "var(--text-secondary, #94a3b8)", whiteSpace: "nowrap" }}>{a.check_out_at ? new Date(a.check_out_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}</td>
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
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
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            a.status === "Checked In" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-gray-500/15 text-gray-400 border border-gray-500/20"
                          }`}>
                            {a.status || "Checked Out"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteTrip(a.id)}
                            title="Delete Record (Superadmin)"
                            style={{
                              background: "rgba(239, 68, 68, 0.12)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              color: "#ef4444",
                              padding: "6px 10px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700
                            }}
                          >
                            <FiTrash2 size={13} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
