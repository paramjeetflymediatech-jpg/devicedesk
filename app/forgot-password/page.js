"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResetUrl("");
    setPreviewUrl("");
    setCopied(false);

    const target = identifier.trim();
    if (!target) {
      setError("Please enter your registered email or username.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || "A password reset link has been generated.");
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
        setIdentifier("");
      } else {
        setError(data.message || data.error || "No account found with this email or username.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (resetUrl) {
      navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
          maxWidth: "440px",
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
            Enter your email or username to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Email or Username
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. superadmin or user@devicedesk.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
                padding: "14px",
                borderRadius: "12px",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                textAlign: "left",
                lineHeight: "1.5"
              }}
            >
              <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>✓ {success}</div>
              
              {resetUrl && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(16, 185, 129, 0.3)" }}>
                  <button
                    type="button"
                    onClick={() => router.push(resetUrl.replace(/^https?:\/\/[^/]+/, ''))}
                    className="btn-primary"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      marginBottom: "8px"
                    }}
                  >
                    🔑 Click Here to Reset Password Now →
                  </button>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    style={{
                      width: "100%",
                      padding: "6px",
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    {copied ? "✓ Reset link copied to clipboard!" : "📋 Copy direct reset link"}
                  </button>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ width: "100%", padding: "12px", borderRadius: "10px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Generating Link..." : "Send Reset Link"}
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
