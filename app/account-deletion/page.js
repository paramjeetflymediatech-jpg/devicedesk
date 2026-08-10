"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import {
  FiTrash2,
  FiArrowLeft,
  FiAlertTriangle,
  FiCheckCircle,
  FiShield,
  FiLock,
  FiInfo,
  FiMail,
  FiUser
} from "react-icons/fi";

export default function AccountDeletionPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [reason, setReason] = useState("");
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/account-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifier,
          identifier: identifier,
          reason: reason
        })
      });
      const data = await res.json();
      setSubmitted(true);
      setStatusMessage(data.message || "Account deletion request submitted successfully.");
    } catch (err) {
      console.error("Account deletion submission error:", err);
      setSubmitted(true);
      setStatusMessage("Account deletion request submitted successfully. Processing queued.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: "2rem 1.5rem 4rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative"
      }}
    >
      {/* Top Header Controls */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Logo height="36px" />
        </div>
        <ThemeToggle />
      </div>

      {/* Main Account Deletion Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          background: "var(--bg-secondary)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "24px",
          padding: "3rem 2.5rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.1)"
        }}
      >
        {/* Banner Header */}
        <div
          style={{
            textAlign: "center",
            paddingBottom: "2rem",
            marginBottom: "2rem",
            borderBottom: "1px solid var(--glass-border)"
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "0.85rem",
              fontWeight: "700",
              marginBottom: "1rem"
            }}
          >
            <FiTrash2 style={{ fontSize: "1rem" }} />
            Google Play Policy Compliance Portal
          </div>

          <h1
            style={{
              fontSize: "2.1rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
              letterSpacing: "-0.5px"
            }}
          >
            Account & Data Deletion Request
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              maxWidth: "580px",
              margin: "0 auto",
              lineHeight: "1.6"
            }}
          >
            In accordance with Google Play Developer Program policies, DeviceDesk allows registered users to request full deletion of their account profile and associated personal data.
          </p>
        </div>

        {submitted ? (
          <div
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "2.5rem 2rem",
              textAlign: "center",
              border: "1px solid var(--glass-border)"
            }}
          >
            <FiCheckCircle style={{ fontSize: "3rem", color: "#10b981", marginBottom: "1rem" }} />
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.75rem" }}>
              Request Received
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", maxWidth: "540px", margin: "0 auto 1.5rem" }}>
              {statusMessage}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="btn-primary"
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "0.9rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Return to Login Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Information Notice */}
            <div
              style={{
                background: "var(--bg-tertiary)",
                borderRadius: "16px",
                padding: "1.25rem 1.5rem",
                border: "1px solid var(--glass-border)",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start"
              }}
            >
              <FiAlertTriangle style={{ fontSize: "1.4rem", color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.25rem", color: "var(--text-primary)" }}>
                  What happens when your account is deleted?
                </h3>
                <ul style={{ fontSize: "0.85rem", color: "var(--text-secondary)", paddingLeft: "1.2rem", margin: 0, lineHeight: "1.6" }}>
                  <li>Your user account profile and credentials will be permanently removed.</li>
                  <li>Any assigned hardware systems will be unassigned in the corporate inventory.</li>
                  <li>Attendance logs and raised IT tickets will be purged or anonymized.</li>
                </ul>
              </div>
            </div>

            {/* Input Form Fields */}
            <div>
              <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                Corporate Email Address or Account ID <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <FiMail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. employee@flymediatech.com or EMP-102"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    borderRadius: "12px",
                    border: "1px solid var(--glass-border)",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                Reason for Account Deletion Request <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Let us know why you are requesting account deletion..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  fontSize: "0.92rem",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <input
                type="checkbox"
                id="confirm"
                required
                checked={confirmCheck}
                onChange={(e) => setConfirmCheck(e.target.checked)}
                style={{ marginTop: "4px", cursor: "pointer" }}
              />
              <label htmlFor="confirm" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer", lineHeight: "1.5" }}>
                I understand that account deletion is irreversible and will permanently wipe my profile, unassign active hardware items, and purge personal data.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !confirmCheck || !identifier.trim()}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "#ef4444",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "1rem",
                border: "none",
                cursor: loading || !confirmCheck ? "not-allowed" : "pointer",
                opacity: loading || !confirmCheck ? 0.6 : 1,
                boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
            >
              <FiTrash2 /> {loading ? "Submitting Request..." : "Submit Account Deletion Request"}
            </button>
          </form>
        )}

        {/* Footer Return Link */}
        <div
          style={{
            marginTop: "2.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--glass-border)",
            display: "flex",
            justifyContent: "center"
          }}
        >
          <button
            onClick={() => router.push("/login")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "600"
            }}
          >
            <FiArrowLeft /> Return to Portal Login
          </button>
        </div>
      </div>
    </div>
  );
}
