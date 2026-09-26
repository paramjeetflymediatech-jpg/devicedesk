"use client";

import { useState, useEffect } from "react";
import { FiX, FiCheckCircle } from "react-icons/fi";

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

  // Auto-dismiss after 10 seconds if active
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
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1rem",
        zIndex: 99999,
        maxWidth: "380px",
        width: "100%",
        color: "#1e293b",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        fontFamily: "'Inter', sans-serif"
      }}
      className="animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ background: "#dcfce7", color: "#16a34a", padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FiCheckCircle size={18} />
          </div>
          <div>
            <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#0f172a", display: "block" }}>
              Email Dispatched
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Automated System Notification</span>
          </div>
        </div>
        <button
          onClick={() => setToast(null)}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
          onMouseOut={(e) => e.currentTarget.style.background = "none"}
        >
          <FiX size={18} />
        </button>
      </div>
      
      <div style={{ fontSize: "0.85rem", lineHeight: "1.5" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ color: "#64748b", minWidth: "50px" }}>To:</span>
            <span style={{ fontWeight: "500", color: "#0f172a" }}>{toast.to}</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ color: "#64748b", minWidth: "50px" }}>Subject:</span>
            <span style={{ fontWeight: "500", color: "#0f172a" }}>{toast.subject}</span>
          </div>
        </div>
        
        <div 
          style={{ 
            padding: "10px", 
            background: "#f8fafc", 
            border: "1px solid #f1f5f9",
            borderRadius: "8px", 
            fontSize: "0.8rem", 
            whiteSpace: "pre-line", 
            color: "#475569",
            maxHeight: "120px",
            overflowY: "auto"
          }}
        >
          {toast.body}
        </div>

        {toast.url && (
          <div style={{ marginTop: "12px" }}>
            <a 
              href={toast.url} 
              target="_blank" 
              rel="noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                padding: "8px 12px",
                background: "#fdf2f8",
                color: "#db2777",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "0.85rem",
                borderRadius: "6px",
                border: "1px solid #fbcfe8",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#fce7f3"}
              onMouseOut={(e) => e.currentTarget.style.background = "#fdf2f8"}
            >
              Open Attached File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
