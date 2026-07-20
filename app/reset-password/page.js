"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setTokenValid(false);
      setError("No reset token provided. Please request a password reset link from your mobile app or login screen.");
      return;
    }

    let isMounted = true;
    async function validateToken() {
      try {
        const res = await fetch(`/api/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (isMounted) {
          setIsValidating(false);
          if (data.valid) {
            setTokenValid(true);
            setEmail(data.email || "");
          } else {
            setTokenValid(false);
            setError(data.message || "This password reset link is invalid or has expired.");
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsValidating(false);
          setTokenValid(false);
          setError("Failed to validate reset link. Please check your network connection.");
        }
      }
    }

    validateToken();
    return () => { isMounted = false; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password.trim()) {
      setError("Please enter a new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Password updated successfully! Redirecting you back to login...");
        setPassword("");
        setConfirmPassword("");
        setTokenValid(false); // Link is now used
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.message || "Failed to reset password.");
      }
    } catch (err) {
      setError("Server error while resetting password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>Validating your reset link...</p>;
  }

  if (!tokenValid && !success) {
    return (
      <div>
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--status-critical)",
            color: "var(--status-critical)",
            padding: "14px",
            borderRadius: "12px",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
            textAlign: "center",
            lineHeight: "1.4",
          }}
        >
          ⚠️ {error || "This password reset link is invalid, expired, or has already been used."}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {email ? (
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
            Account Email
          </label>
          <input
            type="email"
            className="form-control"
            value={email}
            disabled
            style={{ opacity: 0.7, background: "rgba(0,0,0,0.3)" }}
          />
        </div>
      ) : null}

      <div className="form-group" style={{ marginBottom: "1.25rem" }}>
        <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
          New Password
        </label>
        <input
          type="password"
          className="form-control"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
        <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
          Confirm New Password
        </label>
        <input
          type="password"
          className="form-control"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isSubmitting}
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
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid var(--status-resolved)",
            color: "var(--status-resolved)",
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "0.85rem",
            marginBottom: "1.25rem",
            textAlign: "center",
          }}
        >
          ✓ {success}
        </div>
      )}

      <button 
        type="submit" 
        className="btn-primary" 
        style={{ width: "100%", padding: "12px", borderRadius: "10px", opacity: isSubmitting ? 0.7 : 1 }}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Updating Password..." : "Update Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();

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
            Set New Password
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Enter your new credentials below
          </p>
        </div>

        <Suspense fallback={<p style={{ color: "var(--text-secondary)", textAlign: "center" }}>Loading parameters...</p>}>
          <ResetPasswordForm />
        </Suspense>

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
