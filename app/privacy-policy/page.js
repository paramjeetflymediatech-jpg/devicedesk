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
  FiMessageSquare,
  FiCamera,
  FiMic,
  FiNavigation,
  FiBell,
  FiExternalLink,
  FiAlertCircle
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
          maxWidth: "880px",
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
          maxWidth: "880px",
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
            Google Play User Data & Corporate Privacy Compliance
          </div>

          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
              letterSpacing: "-0.5px"
            }}
          >
            Device Desk Privacy Policy & Terms of Service
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              maxWidth: "680px",
              margin: "0 auto",
              lineHeight: "1.6"
            }}
          >
            This Privacy Policy governs the collection, usage, processing, storage, and deletion of user data for the <strong>Device Desk</strong> application (also known as <strong>DeviceDesk</strong>), developed and operated by <strong>Fly Media Technology</strong>.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "15px",
              marginTop: "1.25rem",
              fontSize: "0.85rem",
              color: "var(--text-muted)"
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <FiClock /> Effective Date / Last Updated: October 5, 2026
            </span>
            <span>•</span>
            <span
              style={{
                background: "var(--bg-tertiary)",
                padding: "3px 10px",
                borderRadius: "6px",
                fontWeight: "600",
                color: "var(--accent-cyan)"
              }}
            >
              Application: Device Desk (DeviceDesk)
            </span>
            <span>•</span>
            <span
              style={{
                background: "var(--bg-tertiary)",
                padding: "3px 10px",
                borderRadius: "6px",
                fontWeight: "600"
              }}
            >
              Developer: Fly Media Technology
            </span>
          </div>
        </div>

        {/* Content Sections Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Quick Action Support & Data Deletion Banner */}
          <div
            style={{
              background: "rgba(2, 132, 199, 0.08)",
              border: "1px solid rgba(2, 132, 199, 0.25)",
              borderRadius: "16px",
              padding: "1.25rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "var(--accent-cyan)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  flexShrink: 0
                }}
              >
                <FiHelpCircle />
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", margin: "0 0 2px", color: "var(--text-primary)" }}>
                  Questions, Inquiries or Data Deletion Requests?
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Contact our Data Protection Officer at <a href="mailto:support@flymediatech.com" style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>support@flymediatech.com</a> or visit our online portals below.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a
                href="/account-deletion"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  textDecoration: "none"
                }}
              >
                <FiTrash2 /> Data Deletion Portal
              </a>
              <a
                href="/support"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "var(--accent-cyan)",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  textDecoration: "none"
                }}
              >
                Support Center →
              </a>
            </div>
          </div>
          
          {/* Section 1: Overview & Developer Identity */}
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
                1. Overview & Developer Information
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", margin: 0 }}>
              <strong>Device Desk</strong> (also referred to as <strong>DeviceDesk</strong>) is a corporate enterprise mobility and IT operations suite engineered and maintained by <strong>Fly Media Technology</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). The platform allows organizations to manage hardware inventories, process internal IT support complaints, streamline workplace attendance records, and coordinate employee workflows. Access is intended solely for authorized employees, contractors, and administrators of registered organizations.
            </p>
          </section>

          {/* Section 2: Data Collection Scope */}
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
                2. Types of User Data Collected & Device Permissions
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "1.25rem" }}>
              In accordance with Google Play Developer Program policies and global data protection standards, we disclose all categories of personal and sensitive user data collected by the Device Desk mobile application and desktop agents:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              {/* Account / Personal Identifiers */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.9rem", marginBottom: "0.4rem", color: "var(--accent-blue)" }}>
                  <FiUsers /> Personal & Account Information
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Employee Full Name, corporate email address, phone number, employee identification code, job designation, and role permissions.
                </p>
              </div>

              {/* Location Data */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.9rem", marginBottom: "0.4rem", color: "#10b981" }}>
                  <FiNavigation /> Location Data (Foreground & Background)
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Approximate and precise GPS coordinates accessed during attendance punch-in/punch-out for geofencing validation, and for authorized field marketing executives during active on-duty working shifts only.
                </p>
              </div>

              {/* Camera & Storage */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.9rem", marginBottom: "0.4rem", color: "var(--accent-cyan)" }}>
                  <FiCamera /> Camera & Photos / Media
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Camera access and photo uploads used solely to capture images of damaged hardware/assets for IT complaint tickets, proof-of-work documentation, and internal team chat attachments.
                </p>
              </div>

              {/* Microphone / Audio */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.9rem", marginBottom: "0.4rem", color: "var(--accent-purple)" }}>
                  <FiMic /> Microphone & Audio
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Microphone access used exclusively when a user actively records and transmits voice messages in the internal workplace chat module.
                </p>
              </div>

              {/* Device Specs & Hardware */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.9rem", marginBottom: "0.4rem", color: "#f59e0b" }}>
                  <FiCpu /> Device Specs & Identifiers
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Device model, operating system build, CPU/RAM/GPU capacity, system serial numbers (for assigned corporate hardware), and battery/network connectivity status.
                </p>
              </div>

              {/* Push Notifications & FCM */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.9rem", marginBottom: "0.4rem", color: "#ec4899" }}>
                  <FiBell /> Push Notifications (FCM Tokens)
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Firebase Cloud Messaging (FCM) device registration tokens used to deliver shift alerts, ticket status updates, company announcements, and emergency notices.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Purpose of Data Processing */}
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
                <FiCheckCircle />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                3. Purpose and Legal Basis of Data Processing
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "0.75rem" }}>
              We collect and process your information exclusively for legitimate workplace operational purposes:
            </p>
            <ul style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.7", paddingLeft: "1.5rem", margin: 0 }}>
              <li><strong>Corporate Inventory Management:</strong> Assigning, tracking, and auditing company laptops, desktops, and accessories to employees.</li>
              <li><strong>IT Helpdesk & Ticketing:</strong> Routing maintenance requests, hardware repairs, and technical support between employees and technicians.</li>
              <li><strong>Attendance & Shift Verification:</strong> Validating workplace presence during punch in/punch out to eliminate attendance fraud and calculate work hours.</li>
              <li><strong>Internal Communication:</strong> Enabling real-time task coordination, notifications, and team messaging within the organization.</li>
              <li><strong>Security & Asset Protection:</strong> Preventing unauthorized access, hardware theft, and malicious alteration of system telemetry.</li>
            </ul>
          </section>

          {/* Section 4: Third-Party SDKs & No-Sale Guarantee */}
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
                  background: "rgba(139, 92, 246, 0.12)",
                  color: "#8b5cf6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <FiShield />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                4. Third-Party Service Providers & No-Sale Guarantee
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "0.75rem" }}>
              We utilize trusted, enterprise-grade third-party service providers and SDKs solely for infrastructure and operational functionality:
            </p>
            <ul style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.7", paddingLeft: "1.5rem", marginBottom: "1rem" }}>
              <li><strong>Google Firebase Cloud Messaging (FCM):</strong> Used to deliver push notifications to Android and iOS mobile devices.</li>
              <li><strong>OpenStreetMap / Map Routing APIs:</strong> Used for map visualizations and geocoding coordinates for field team routing.</li>
              <li><strong>Cloud Infrastructure & Database Hosting:</strong> Stored on secure, dedicated cloud servers with firewalls and access restrictions.</li>
            </ul>
            <div
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                color: "#10b981",
                fontSize: "0.88rem",
                fontWeight: "600"
              }}
            >
              🔒 Absolute Commitment: We do NOT sell, lease, monetize, or rent any employee or device data to third-party advertisers, data brokers, or marketing networks.
            </div>
          </section>

          {/* Section 5: Data Security & Encryption */}
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
                <FiLock />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                5. Data Security, Storage & Retention
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "0.75rem" }}>
              All network transmissions between the Device Desk mobile apps, desktop agents, and backend servers are strictly encrypted in transit using industry-standard <strong>Transport Layer Security (TLS 1.3 / HTTPS)</strong> protocols. Data at rest is safeguarded using <strong>AES-256 encryption</strong> within enterprise-grade relational databases protected by role-based authentication rules.
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", margin: 0 }}>
              <strong>Retention Policy:</strong> Personal data and operational telemetry are retained only as long as necessary to provide service to your organization or to comply with applicable statutory employment and auditing obligations. Once an employee departs or an account deletion request is finalized, records are permanently expunged or anonymized in accordance with our deletion policy.
            </p>
          </section>

          {/* Section 6: Account Deletion & User Rights (MANDATORY GOOGLE PLAY SECTION) */}
          <section
            style={{
              background: "var(--bg-tertiary)",
              borderRadius: "16px",
              padding: "1.5rem 1.75rem",
              border: "2px solid rgba(239, 68, 68, 0.3)"
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
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                6. Account Deletion, Data Portability & User Rights
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "1rem" }}>
              In full compliance with Google Play Developer Program policies and global privacy frameworks (GDPR, CCPA), users have comprehensive rights regarding their personal data, including the right to access, rectify, or request permanent deletion of their account and all associated data.
            </p>

            <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "1.25rem", border: "1px solid var(--glass-border)", marginBottom: "1.25rem" }}>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>
                How to Request Account and Data Deletion:
              </h4>
              <ul style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "1.7", paddingLeft: "1.3rem", margin: "0 0 1rem" }}>
                <li><strong>In-App Self-Service:</strong> Open the Device Desk mobile app &rarr; Tap on Profile / Settings &rarr; Select <em>&ldquo;Delete My Account&rdquo;</em> &rarr; Confirm password/identity to permanently delete.</li>
                <li><strong>Public Web Deletion Portal:</strong> Visit our dedicated web-based deletion portal at <a href="https://devicedesk.flymediatech.com/account-deletion" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>https://devicedesk.flymediatech.com/account-deletion</a>, enter your registered email address, and submit a deletion request.</li>
                <li><strong>Direct Email Request:</strong> Email our privacy department at <a href="mailto:support@flymediatech.com?subject=Account%20and%20Data%20Deletion%20Request" style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>support@flymediatech.com</a> with the subject <em>&ldquo;Account and Data Deletion Request&rdquo;</em>.</li>
              </ul>
              
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a
                  href="/account-deletion"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "#ef4444",
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: "0.88rem",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
                  }}
                >
                  <FiTrash2 /> Open Web Account & Data Deletion Portal →
                </a>
              </div>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6", margin: 0 }}>
              <strong>What happens upon deletion:</strong> Upon submission and administrative verification, your user profile, authentication credentials, personal identifiers, and uploaded attachments are permanently erased from active production databases within 30 days. Hardware assignment tags are unlinked and reassigned to corporate inventory.
            </p>
          </section>

          {/* Section 7: Children's Privacy */}
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
                <FiAlertCircle />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                7. Children&rsquo;s Privacy Protection (COPPA / GDPR)
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", margin: 0 }}>
              Device Desk is exclusively a corporate business application intended for adult enterprise personnel and authorized corporate staff (ages 18 and older). We do not target, market to, or knowingly collect any personal information from children under the age of 13 (or under the age of 16 in applicable European jurisdictions). If we discover that personal data of a minor has inadvertently been collected, we will promptly delete it from our servers.
            </p>
          </section>

          {/* Section 8: Policy Updates */}
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
                <FiClock />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                8. Changes to this Privacy Policy
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", margin: 0 }}>
              We may update this Privacy Policy periodically to reflect enhancements to the Device Desk platform, shifts in statutory requirements, or Google Play policy updates. We will notify users of any significant modifications by revising the &ldquo;Last Updated&rdquo; date at the top of this document and delivering in-app announcements where appropriate.
            </p>
          </section>

          {/* Section 9: Official Contact Information */}
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
                9. Official Developer Contact Information
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "1.25rem" }}>
              For legal inquiries, privacy questions, compliance requests, or technical support regarding Device Desk, please reach out to:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-cyan)" }}>
                  <FiMail /> Official Support Email
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
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-blue)" }}>
                  <FiMessageSquare /> Online Support Desk
                </div>
                <a
                  href="/support"
                  style={{ fontSize: "0.85rem", color: "var(--accent-blue)", textDecoration: "none", fontWeight: "600" }}
                >
                  https://devicedesk.flymediatech.com/support
                </a>
              </div>

              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.4rem", color: "var(--accent-purple)" }}>
                  <FiMapPin /> Corporate Entity
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                  Fly Media Technology (Device Desk Team)
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
