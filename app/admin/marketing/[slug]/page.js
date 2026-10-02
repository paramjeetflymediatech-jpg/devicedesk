'use client';
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiMapPin, FiTrash2 } from "react-icons/fi";
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

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Marketing Tracking...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <Link href="/admin/marketing" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
          <FiArrowLeft /> Back to Marketing Overview
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0 0 1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <FiMapPin style={{ color: "var(--accent-cyan, #06b6d4)" }} /> Field Trips for {slug}
        </h1>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          {attendance.length === 0 ? (
            <p style={{ color: "var(--text-secondary, #94a3b8)" }}>No field trips logged for this employee.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Going To</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>GPS Pin</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
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
                      <td style={{ textAlign: "right" }}>
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
          )}
        </div>
      </div>
    </div>
  );
}
