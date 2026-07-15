"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { findEmployeeByEmail, sendMockEmail } from "../store";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    let targetEmail = email.trim();
    if (!targetEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (targetEmail.toLowerCase() === "admin") {
      targetEmail = "admin@devicedesk.com";
    }

    // Check if it matches an employee, or is default admin email
    const isDefaultAdmin = targetEmail.toLowerCase() === "admin@devicedesk.com";
    const emp = findEmployeeByEmail(targetEmail);

    if (emp || isDefaultAdmin) {
      // Generate reset URL link
      const host = window.location.origin || "http://localhost:3000";
      const resetLink = `${host}/reset-password?email=${encodeURIComponent(targetEmail)}`;

      // Send Mock email
      sendMockEmail(
        targetEmail,
        "Reset your DeviceDesk Password",
        `Hello,\n\nYou requested a password reset for your DeviceDesk account.\n\nPlease click the link below to set a new password:\n\n${resetLink}\n\nIf you did not request this reset, you can safely ignore this email.\n\nBest Regards,\nIT Support Team`
      );

      setSuccess("A password reset link has been mock-sent to your email. Check the Email Toast notification at the bottom right!");
      setEmail("");
    } else {
      setError("No account found with this email address.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        padding: "1.5rem",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--bg-secondary)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "24px",
          padding: "2.5rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              color: "var(--bg-primary)",
              boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)",
              margin: "0 auto 1rem auto",
            }}
          >
            DD
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem" }}>
            Forgot Password
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Enter your registered email to receive a password reset link
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. sarabjot@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--status-critical)",
                color: "var(--status-critical)",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                textAlign: "center",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid var(--status-resolved)",
                color: "var(--status-resolved)",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                textAlign: "left",
                lineHeight: "1.4"
              }}
            >
              ✓ {success}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: "100%", padding: "12px", borderRadius: "10px" }}>
            Send Reset Link
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <button
            onClick={() => router.push("/login")}
            className="btn-secondary"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "10px",
              width: "100%",
              border: "1px dashed var(--glass-border)",
              background: "none"
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
