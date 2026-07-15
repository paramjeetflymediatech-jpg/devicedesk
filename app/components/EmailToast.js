"use client";

import { useState, useEffect } from "react";

export default function EmailToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleEmail = (e) => {
      const email = e.detail;
      setToast(email);
    };

    const handleUrl = (e) => {
      const { id, url } = e.detail;
      setToast(prev => {
        if (prev && prev.id === id) {
          return { ...prev, url };
        }
        return prev;
      });
    };

    window.addEventListener("devicedesk_mock_email", handleEmail);
    window.addEventListener("devicedesk_email_url", handleUrl);
    return () => {
      window.removeEventListener("devicedesk_mock_email", handleEmail);
      window.removeEventListener("devicedesk_email_url", handleUrl);
    };
  }, []);

  // Auto-dismiss after 10 seconds if active (extended to give time to click URL)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        background: "rgba(23, 23, 37, 0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--accent-cyan)",
        borderRadius: "16px",
        padding: "1.25rem",
        boxShadow: "0 10px 30px rgba(0, 240, 255, 0.15)",
        zIndex: 99999,
        maxWidth: "360px",
        color: "var(--text-primary)",
        fontFamily: "var(--font-main)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "6px" }}>
          ✉️ Email Dispatched (Nodemailer)
        </span>
        <button
          onClick={() => setToast(null)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "1.25rem",
            cursor: "pointer",
            padding: 0,
            lineHeight: 1
          }}
        >
          &times;
        </button>
      </div>
      <div style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
        <p style={{ margin: "2px 0" }}><strong>To:</strong> {toast.to}</p>
        <p style={{ margin: "2px 0" }}><strong>Subject:</strong> {toast.subject}</p>
        <div 
          style={{ 
            marginTop: "8px", 
            padding: "8px", 
            background: "rgba(255,255,255,0.03)", 
            borderRadius: "8px", 
            fontSize: "0.8rem", 
            whiteSpace: "pre-line", 
            color: "var(--text-secondary)",
            maxHeight: "120px",
            overflowY: "auto"
          }}
        >
          {toast.body}
        </div>

        {toast.url && (
          <div style={{ marginTop: "12px", textAlign: "right" }}>
            <a
              href={toast.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.8rem",
                color: "var(--accent-cyan)",
                fontWeight: "700",
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              🔗 Open in Ethereal Mailbox →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
