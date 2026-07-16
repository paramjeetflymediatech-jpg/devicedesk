"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else if (user) {
      if (user.role === "admin") {
        router.push("/");
      } else {
        router.push("/employee-dashboard");
      }
    } else {
      router.push("/login");
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
        padding: "2rem 1.5rem",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "var(--bg-secondary)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "24px",
          padding: "2.5rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1.5rem" }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "800",
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.5rem"
          }}>
            Privacy Policy & Terms
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            DeviceDesk Corporate Resource Management Standards
          </p>
        </div>

        {/* Content sections */}
        <div
          style={{
            maxHeight: "50vh",
            overflowY: "auto",
            paddingRight: "10px",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            lineHeight: "1.7",
            marginBottom: "2rem",
          }}
        >
          <section style={{ marginBottom: "1.75rem" }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              1. Introduction & Overview
            </h3>
            <p>
              Welcome to DeviceDesk. DeviceDesk is a corporate inventory tracking and maintenance coordination platform used to manage computer systems, assign assets to personnel, and coordinate support tickets. This Privacy Policy and Terms of Service document outlines the rules, collection scope, and conditions governing system usage.
            </p>
          </section>

          <section style={{ marginBottom: "1.75rem" }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              2. Information Collection & Usage
            </h3>
            <p>
              DeviceDesk operates strictly within the corporate firewall boundaries. We collect and cache the following information:
            </p>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              <li><strong>Hardware Metrics:</strong> CPU type, Graphic Card (GPU) specifications, RAM capacity, storage sizes, operating system versions, and machine system serial/model numbers.</li>
              <li><strong>Employee Details:</strong> Account usernames, corporate email addresses, departmental assignments, and login validation credentials.</li>
              <li><strong>Support Issues:</strong> IT complaint logs, status timelines, resolution remarks, and hardware history logs.</li>
            </ul>
          </section>

          <section style={{ marginBottom: "1.75rem" }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              3. Data Protection & Security
            </h3>
            <p>
              Your data is secured locally on this application and synchronized periodically over an encrypted connection with the organization's dedicated host servers. We do not sell, license, share, or disclose your corporate usage habits or hardware details to external third-party advertisers or trackers.
            </p>
          </section>

          <section style={{ marginBottom: "1.75rem" }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              4. Permissible System Terms
            </h3>
            <p>
              By accessing this dashboard portal, you agree that you are an authorized employee or contractor of the managing organization. System resources must only be used to register and resolve legitimate computer issues. Attempts to bypass access rules, forge records, or modify other employees' assigned system configurations without direct authorization is strictly prohibited.
            </p>
          </section>

          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              5. Account & History Deletion
            </h3>
            <p>
              Employees are entitled to request account deletion. Deleting an account will unassign any active inventory systems, remove support logs, and clear active user session profiles. Administrator actions, system logs, and transfer history are audited and may be retained by your corporate IT manager in accordance with internal corporate retention guidelines.
            </p>
          </section>
        </div>

        {/* Back Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleBack}
            className="btn-primary"
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              fontSize: "0.9rem",
              fontWeight: "700",
              cursor: "pointer",
              width: "100%",
            }}
          >
            ← Back to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
