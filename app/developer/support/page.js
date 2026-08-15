"use client";

import React, { useState, useEffect } from "react";
import {
  FiHelpCircle,
  FiMail,
  FiUser,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiAlertCircle,
  FiGlobe,
  FiFileText,
  FiMessageSquare,
  FiTag
} from "react-icons/fi";

export default function DeveloperSupportEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      if (res.ok && data.success) {
        setEnquiries(data.enquiries || []);
      } else {
        setError(data.error || "Failed to load support enquiries.");
      }
    } catch (err) {
      console.error("Error fetching support enquiries:", err);
      setError("Network connection error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Filtered enquiries
  const filteredEnquiries = enquiries.filter((item) => {
    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.message || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      (item.category || "").toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: "1.75rem", width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: "800",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--text-primary)"
            }}
          >
            <FiHelpCircle style={{ color: "var(--accent-cyan)" }} /> Support Enquiries
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            Review customer support tickets and inquiries submitted from the website & mobile app.
          </p>
        </div>

        <button
          onClick={fetchEnquiries}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "10px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
            fontWeight: "600",
            fontSize: "0.88rem",
            cursor: "pointer"
          }}
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh List
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          background: "var(--bg-secondary)",
          padding: "1rem 1.25rem",
          borderRadius: "16px",
          border: "1px solid var(--glass-border)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: "1 1 280px",
            position: "relative"
          }}
        >
          <FiSearch
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--text-muted)",
              fontSize: "1rem"
            }}
          />
          <input
            type="text"
            placeholder="Search by name, email, subject, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              fontSize: "0.88rem"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FiFilter style={{ color: "var(--text-muted)" }} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              fontSize: "0.88rem",
              fontWeight: "600"
            }}
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="account">Account</option>
            <option value="bug">Bug / Crash</option>
            <option value="content">User Content</option>
            <option value="privacy">Privacy</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          <FiRefreshCw className="animate-spin" style={{ fontSize: "2rem", marginBottom: "1rem" }} />
          <p>Loading support enquiries...</p>
        </div>
      ) : error ? (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            padding: "1.25rem",
            borderRadius: "12px",
            textAlign: "center"
          }}
        >
          <FiAlertCircle style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }} />
          <p style={{ margin: 0, fontWeight: "600" }}>{error}</p>
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "3rem 1.5rem",
            textAlign: "center",
            color: "var(--text-secondary)"
          }}
        >
          <FiHelpCircle style={{ fontSize: "2.5rem", color: "var(--text-muted)", marginBottom: "0.75rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: "0 0 0.4rem", color: "var(--text-primary)" }}>
            No Support Enquiries Found
          </h3>
          <p style={{ fontSize: "0.88rem", margin: 0 }}>
            {searchTerm || categoryFilter !== "all"
              ? "No enquiries match your search filters."
              : "When users submit support forms, their messages will appear here."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selectedEnquiry ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>
          {/* Table List */}
          <div
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "16px",
              border: "1px solid var(--glass-border)",
              overflow: "hidden"
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-tertiary)",
                      borderBottom: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                      textTransform: "uppercase"
                    }}
                  >
                    <th style={{ padding: "12px 16px" }}>Sender</th>
                    <th style={{ padding: "12px 16px" }}>Subject & Category</th>
                    <th style={{ padding: "12px 16px" }}>Submitted At</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnquiries.map((item) => {
                    const isSelected = selectedEnquiry?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedEnquiry(item)}
                        style={{
                          borderBottom: "1px solid var(--glass-border)",
                          background: isSelected ? "var(--bg-tertiary)" : "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s ease"
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{item.name || "Anonymous"}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--accent-cyan)" }}>{item.email}</div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "var(--text-primary)",
                              maxWidth: "260px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                          >
                            {item.subject || "No Subject"}
                          </div>
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: "4px",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(2, 132, 199, 0.12)",
                              color: "var(--accent-cyan)",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              textTransform: "uppercase"
                            }}
                          >
                            {item.category || "General"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                          {item.created_at || "N/A"}
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEnquiry(item);
                            }}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "var(--accent-cyan)",
                              color: "#fff",
                              border: "none",
                              fontWeight: "600",
                              fontSize: "0.8rem",
                              cursor: "pointer"
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Modal / Panel */}
          {selectedEnquiry && (
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "16px",
                border: "1px solid var(--glass-border)",
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                position: "sticky",
                top: "1.5rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                  Enquiry Details
                </h3>
                <button
                  onClick={() => setSelectedEnquiry(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "700"
                  }}
                >
                  ✕ Close
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiUser style={{ color: "var(--accent-cyan)" }} />
                  <strong>Sender:</strong> {selectedEnquiry.name || "N/A"}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiMail style={{ color: "var(--accent-cyan)" }} />
                  <strong>Email:</strong>{" "}
                  <a href={`mailto:${selectedEnquiry.email}`} style={{ color: "var(--accent-cyan)", textDecoration: "none", fontWeight: "600" }}>
                    {selectedEnquiry.email}
                  </a>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiTag style={{ color: "var(--accent-purple)" }} />
                  <strong>Category:</strong> {(selectedEnquiry.category || "General").toUpperCase()}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiClock style={{ color: "var(--text-muted)" }} />
                  <strong>Submitted:</strong> {selectedEnquiry.created_at}
                </div>

                {selectedEnquiry.ipAddress && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FiGlobe style={{ color: "var(--text-muted)" }} />
                    <strong>IP Address:</strong> {selectedEnquiry.ipAddress}
                  </div>
                )}
              </div>

              <div
                style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                  Subject: {selectedEnquiry.subject}
                </div>
                <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {selectedEnquiry.message}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
                <a
                  href={`mailto:${selectedEnquiry.email}?subject=Re: ${encodeURIComponent(selectedEnquiry.subject || "Support Inquiry")}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "var(--accent-cyan)",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: "700",
                    fontSize: "0.88rem"
                  }}
                >
                  <FiMail /> Reply via Email
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
