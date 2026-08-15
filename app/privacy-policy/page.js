"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import {
  FiShield,
  FiArrowLeft,
  FiInfo,
  FiLock,
  FiCheckCircle,
  FiTrash2,
  FiCpu,
  FiUsers,
  FiFileText,
  FiClock,
  FiMail,
  FiPhone,
  FiHelpCircle,
  FiMapPin,
  FiMessageSquare
} from "react-icons/fi";

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else if (user) {
      if (user.role === "admin" || user.role === "management") {
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
          maxWidth: "840px",
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

      {/* Main Privacy Container Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "840px",
          background: "var(--bg-secondary)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "24px",
          padding: "3rem 2.5rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.1)"
        }}
      >
        {/* Hero Banner Header */}
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
              background: "var(--glass-glow)",
              border: "1px solid var(--glass-border)",
              color: "var(--accent-cyan)",
              fontSize: "0.85rem",
              fontWeight: "700",
              marginBottom: "1rem"
            }}
          >
            <FiShield style={{ fontSize: "1rem" }} />
            Corporate Governance & Data Protection
          </div>

          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
              letterSpacing: "-0.5px"
            }}
          >
            Privacy Policy & Terms of Service
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              maxWidth: "560px",
              margin: "0 auto"
            }}
          >
            Standards governing device management, personnel inventory, complaint coordination, and corporate attendance tracking on DeviceDesk.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "15px",
              marginTop: "1.25rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)"
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <FiClock /> Last Updated: July 2026
            </span>
            <span>•</span>
            <span
              style={{
                background: "var(--bg-tertiary)",
                padding: "2px 8px",
                borderRadius: "6px",
                fontWeight: "600"
              }}
            >
              v2.4 Enterprise Compliance
            </span>
          </div>
        </div>

        {/* Content Sections Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Section 1 */}
          <section
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "1.5rem 1.75rem",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(2, 132, 199, 0.12)",
                  color: "var(--accent-cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <FiInfo />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                1. Overview & Platform Purpose
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7" }}>
              DeviceDesk is a private enterprise platform operated by Fly Media Technology to coordinate corporate computer inventories, hardware assignment logs, IT complaint resolution workflows, and employee attendance logs. Access is strictly restricted to authorized staff and contractors.
            </p>
          </section>

          {/* Section 2 */}
          <section
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "1.5rem 1.75rem",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(37, 99, 235, 0.12)",
                  color: "var(--accent-blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <FiLock />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                2. Information Collection Scope
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "1rem" }}>
              DeviceDesk captures minimal operational data required for asset inventory management, internal ticket routing, and attendance validation:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-cyan)" }}>
                  <FiCpu /> Hardware Specifications
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                  Processor CPU, Graphics GPU, RAM capacity, system serials, and OS build versions.
                </p>
              </div>

              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-blue)" }}>
                  <FiUsers /> Account Credentials
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                  Employee names, usernames, corporate email addresses, and departmental roles.
                </p>
              </div>

              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-purple)" }}>
                  <FiFileText /> Ticket Logs
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                  Hardware complaint reports, maintenance timelines, and technician resolution notes.
                </p>
              </div>

              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "#10b981" }}>
                  <FiClock /> Attendance Logs
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                  Daily Punch In/Out timestamps, break durations, and work hour calculations.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "1.5rem 1.75rem",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <FiShield />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                3. Enterprise Security & Encryption
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7" }}>
              All captured data is stored within private encrypted databases protected behind corporate firewall security rules. We strictly prohibit selling, renting, or transferring corporate device metrics or personnel data to third-party commercial entities.
            </p>
          </section>

          {/* Section 4 */}
          <section
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "1.5rem 1.75rem",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <FiCheckCircle />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                4. Permissible System Conduct
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7" }}>
              Users must submit accurate IT complaints and attendance entries. Any attempts to tamper with hardware serial numbers, alter system metrics, forge attendance logs, or access unauthorized administrative functions will trigger security flags and administrative review.
            </p>
          </section>

          {/* Section 5 */}
          <section
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "1.5rem 1.75rem",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "var(--status-critical)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <FiTrash2 />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                5. Account & Data Deletion Rights
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "1rem" }}>
              In compliance with Google Play Developer Program policies, all users have the right to request permanent deletion of their account profile, personal identifiers, and associated attendance/ticket data. You can delete your account in-app under Account Settings, or submit a request directly on our web portal:
            </p>
            <div style={{ marginTop: "0.5rem" }}>
              <a
                href="/account-deletion"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  border: "1px solid rgba(239, 68, 68, 0.3)"
                }}
              >
                <FiTrash2 /> Request Web Account & Data Deletion →
              </a>
            </div>
          </section>

          {/* Section 6 - Support & Contact Information */}
          <section
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "1.5rem 1.75rem",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(2, 132, 199, 0.12)",
                  color: "var(--accent-cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <FiHelpCircle />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                6. Official App Support & Contact Information
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "1rem" }}>
              If you have questions, require technical support, or need assistance with your DeviceDesk account or mobile application, our customer support team is available to help.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-cyan)" }}>
                  <FiMail /> Support Email
                </div>
                <a
                  href="mailto:support@flymediatech.com"
                  style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", textDecoration: "none", fontWeight: "600" }}
                >
                  support@flymediatech.com
                </a>
              </div>

              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-blue)" }}>
                  <FiMessageSquare /> Support Desk Portal
                </div>
                <a
                  href="/support"
                  style={{ fontSize: "0.85rem", color: "var(--accent-blue)", textDecoration: "none", fontWeight: "600" }}
                >
                  Visit DeviceDesk Support Center →
                </a>
              </div>

              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-purple)" }}>
                  <FiMapPin /> Company Headquarters
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                  Fly Media Technology, DeviceDesk Enterprise Operations
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Action Footer */}
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
            onClick={handleBack}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 28px",
              borderRadius: "12px",
              fontSize: "0.95rem",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(2, 132, 199, 0.25)",
              transition: "all 0.2s ease"
            }}
          >
            <FiArrowLeft style={{ fontSize: "1.1rem" }} /> Return to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
