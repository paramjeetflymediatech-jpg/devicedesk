"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordByEmail } from "../store";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Invalid or missing email parameter in URL.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const result = resetPasswordByEmail(email, password);

    if (result.success) {
      setSuccess("Password updated successfully! Redirecting you back to login...");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      setError(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Account Email</label>
        <input
          type="email"
          className="form-control"
          value={email}
          disabled
          style={{ opacity: 0.6, background: "rgba(0,0,0,0.2)" }}
        />
      </div>

      <div className="form-group">
        <label>New Password</label>
        <input
          type="password"
          className="form-control"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
        <label>Confirm New Password</label>
        <input
          type="password"
          className="form-control"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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

      <button type="submit" className="btn-primary" style={{ width: "100%", padding: "12px", borderRadius: "10px" }}>
        Update Password
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
