"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "../components/ThemeToggle.js";
import Logo from "../components/Logo.js";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: name.trim(), password })
      });
      const data = await res.json();

      if (data.success) {
        login(data.user);
        const dbRoleLower = (data.user?.dbRole || '').toLowerCase();
        const emailLower = (data.user?.email || '').toLowerCase();
        const deptLower = (data.user?.department || '').toLowerCase();

        // Root Admin / Executive Management has full unrestricted access to Admin Panel ('/')
        const isRootAdmin = 
          dbRoleLower === 'admin' ||
          dbRoleLower === 'management' ||
          dbRoleLower === 'executive' ||
          dbRoleLower === 'superadmin' ||
          emailLower === 'admin@yopmail.com' ||
          emailLower === 'pravi@yopmail.com';

        // IT Support staff (only non-Admin IT personnel)
        const isITSupport = !isRootAdmin && (
          dbRoleLower.includes('it') ||
          deptLower.includes('it')
        );

        if (isRootAdmin) {
          router.push('/');
        } else {
          router.push('/employee-dashboard');
        }
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
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
        position: "relative"
      }}
    >
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 100 }}>
        <ThemeToggle />
      </div>
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
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <Logo height="48px" />
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem" }}>
            DeviceDesk
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Sign in with your credentials to access your portal
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username / Team Member Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your email or username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px"
                }}
              >
                {showPassword ? <FiEyeOff style={{ fontSize: "1.1rem" }} /> : <FiEye style={{ fontSize: "1.1rem" }} />}
              </button>
            </div>
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

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "12px", borderRadius: "10px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer", alignItems:"center", justifyContent:"center", display:"flex"
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>


        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.75rem", display: "flex", justifyContent: "center", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => router.push("/forgot-password")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontWeight: "500",
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "var(--font-main)",
                fontSize: "0.85rem"
              }}
            >
              Forgot Password?
            </button>
            <span style={{ color: "var(--text-secondary)", opacity: 0.3 }}>|</span>
            <button
              type="button"
              onClick={() => router.push("/privacy-policy")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontWeight: "500",
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "var(--font-main)",
                fontSize: "0.85rem"
              }}
            >
              Privacy & Terms
            </button>
            <span style={{ color: "var(--text-secondary)", opacity: 0.3 }}>|</span>
            <button
              type="button"
              onClick={() => router.push("/account-deletion")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontWeight: "500",
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "var(--font-main)",
                fontSize: "0.85rem"
              }}
            >
              Account Deletion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
