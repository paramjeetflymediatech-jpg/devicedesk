"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import {
  FiHelpCircle,
  FiMail,
  FiPhone,
  FiMessageSquare,
  FiClock,
  FiCheckCircle,
  FiArrowLeft,
  FiShield,
  FiSend,
  FiFileText,
  FiUser,
  FiAlertCircle,
  FiLock,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";

export default function SupportPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    category: "general",
    subject: "",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.message) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How do I report a hardware or device issue in the app?",
      a: "Open the DeviceDesk app, navigate to Complaints / Tickets, tap 'Create New Complaint', select your assigned device, describe the issue, and submit. Our IT support team will review and update your ticket status in real time."
    },
    {
      q: "How do I request account deletion or data removal?",
      a: "You can request full account and data deletion directly in the mobile app under Settings > Delete Account, or visit our dedicated Web Data Deletion Portal at /account-deletion."
    },
    {
      q: "Who should I contact if I am locked out of my corporate account?",
      a: "If you cannot sign in or need password reset support, please email support@flymediatech.com or submit an inquiry using the support form below with your registered work email."
    },
    {
      q: "What user-generated content does DeviceDesk store?",
      a: "DeviceDesk stores user-submitted hardware complaint logs, technical support tickets, employee attendance notes, and account profile details strictly for internal enterprise IT operations."
    }
  ];

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

      {/* Main Support Card */}
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
        {/* Hero Header */}
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
            <FiHelpCircle style={{ fontSize: "1rem" }} />
            Official App & Customer Support Center
          </div>

          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
              letterSpacing: "-0.5px"
            }}
          >
            DeviceDesk Help & Support Desk
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              maxWidth: "580px",
              margin: "0 auto"
            }}
          >
            Need assistance with DeviceDesk mobile or web portal? Contact our official support desk, browse FAQs, or send us a direct inquiry.
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
              <FiClock /> Response Time: &lt; 24 Hours
            </span>
            <span>•</span>
            <span
              style={{
                background: "var(--bg-tertiary)",
                padding: "2px 8px",
                borderRadius: "6px",
                fontWeight: "600",
                color: "#10b981"
              }}
            >
              24/7 Enterprise Support Active
            </span>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
          <div
            style={{
              background: "var(--bg-tertiary)",
              padding: "1.25rem",
              borderRadius: "16px",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
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
                <FiMail />
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", margin: 0 }}>Support Email</h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Direct email line for technical queries & app support.
            </p>
            <a
              href="mailto:support@flymediatech.com"
              style={{
                fontSize: "0.9rem",
                color: "var(--accent-cyan)",
                fontWeight: "700",
                textDecoration: "none"
              }}
            >
              support@flymediatech.com
            </a>
          </div>

          <div
            style={{
              background: "var(--bg-tertiary)",
              padding: "1.25rem",
              borderRadius: "16px",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
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
                <FiPhone />
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", margin: 0 }}>Customer Care Line</h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Enterprise IT Helpdesk Phone & Helpline.
            </p>
            <span style={{ fontSize: "0.9rem", color: "var(--accent-blue)", fontWeight: "700" }}>
              +91 (161) 500-1000 / IT-Desk
            </span>
          </div>

          <div
            style={{
              background: "var(--bg-tertiary)",
              padding: "1.25rem",
              borderRadius: "16px",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
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
              <h3 style={{ fontSize: "1rem", fontWeight: "700", margin: 0 }}>Publisher Info</h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              <strong>Fly Media Technology</strong>
              <br />
              Official App Developer & Service Operator
            </p>
          </div>
        </div>

        {/* Support Inquiry Form */}
        <section
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: "20px",
            padding: "2rem",
            border: "1px solid var(--glass-border)",
            marginBottom: "2.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(147, 51, 234, 0.12)",
                color: "var(--accent-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem"
              }}
            >
              <FiMessageSquare />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>Submit Support Request</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                Have an inquiry or issue with the app? Fill out the form below.
              </p>
            </div>
          </div>

          {submitted ? (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "14px",
                padding: "1.75rem",
                textAlign: "center"
              }}
            >
              <FiCheckCircle style={{ fontSize: "2.5rem", color: "#10b981", marginBottom: "0.75rem" }} />
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: "0 0 0.5rem" }}>
                Support Request Received!
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                Thank you for contacting DeviceDesk support. Our support team will review your inquiry and respond to <strong>{formData.email}</strong> within 24 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                style={{
                  marginTop: "1.25rem",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                    Your Name
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiUser style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 36px",
                        borderRadius: "10px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                        fontSize: "0.9rem"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                    Contact Email Address *
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiMail style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 36px",
                        borderRadius: "10px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                        fontSize: "0.9rem"
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                    Inquiry Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem"
                    }}
                  >
                    <option value="general">General Support & Question</option>
                    <option value="account">Account Sign-in & Authentication</option>
                    <option value="bug">Mobile App Bug / Crash Report</option>
                    <option value="content">User-Generated Content & Complaints</option>
                    <option value="privacy">Privacy & Account Deletion</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brief description of inquiry"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe how we can help you..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    resize: "vertical"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 15px rgba(2, 132, 199, 0.25)"
                }}
              >
                <FiSend /> {loading ? "Sending Support Request..." : "Submit Support Inquiry"}
              </button>
            </form>
          )}
        </section>

        {/* FAQs Section */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiHelpCircle style={{ color: "var(--accent-cyan)" }} /> Frequently Asked Questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)",
                  overflow: "hidden"
                }}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: "100%",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {activeFaq === idx && (
                  <div
                    style={{
                      padding: "0 1.25rem 1rem",
                      fontSize: "0.88rem",
                      color: "var(--text-secondary)",
                      lineHeight: "1.6"
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Resource Links */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "center",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--glass-border)"
          }}
        >
          <a
            href="/privacy-policy"
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <FiShield /> Privacy Policy & Terms
          </a>
          <span style={{ color: "var(--text-muted)" }}>•</span>
          <a
            href="/account-deletion"
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <FiLock /> Account & Data Deletion
          </a>
        </div>

        {/* Action Footer */}
        <div
          style={{
            marginTop: "2rem",
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
              boxShadow: "0 4px 15px rgba(2, 132, 199, 0.25)"
            }}
          >
            <FiArrowLeft style={{ fontSize: "1.1rem" }} /> Return to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
