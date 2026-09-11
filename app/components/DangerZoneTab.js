"use client";

import React from "react";

export default function DangerZoneTab({
  systems,
  tickets,
  handleDangerDelete
}) {
  return (
    <div className="page-section active">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--status-critical)", margin: "0 0 6px 0" }}>
          ⚠️ Danger Zone
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
          All actions here are <strong style={{ color: "var(--status-critical)" }}>permanent and irreversible</strong>.
          You will be asked to confirm twice before any data is deleted.
        </p>
      </div>

      {/* Delete per section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        {/* Systems */}
        <div
          style={{
            background: "rgba(220,38,38,0.05)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: "12px",
            padding: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>🖥️</span>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>
              Delete All Systems
            </h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "14px", lineHeight: "1.5" }}>
            Permanently removes <strong>{systems.length}</strong> system records, clears all assignments and hardware
            inventory.
          </p>
          <button
            onClick={() => handleDangerDelete("systems", "Systems")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(220,38,38,0.5)",
              background: "rgba(220,38,38,0.1)",
              color: "#ef4444",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.82rem"
            }}
          >
            🗑️ Delete All Systems ({systems.length})
          </button>
        </div>

        {/* Tickets */}
        <div
          style={{
            background: "rgba(220,38,38,0.05)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: "12px",
            padding: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>🎫</span>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>
              Delete All Tickets
            </h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "14px", lineHeight: "1.5" }}>
            Permanently removes <strong>{tickets.length}</strong> IT complaint tickets and all resolution records.
          </p>
          <button
            onClick={() => handleDangerDelete("tickets", "Tickets")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(220,38,38,0.5)",
              background: "rgba(220,38,38,0.1)",
              color: "#ef4444",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.82rem"
            }}
          >
            🗑️ Delete All Tickets ({tickets.length})
          </button>
        </div>

        {/* History */}
        <div
          style={{
            background: "rgba(220,38,38,0.05)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: "12px",
            padding: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>📜</span>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>
              Delete Transfer Logs
            </h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "14px", lineHeight: "1.5" }}>
            Permanently removes all assignment history and transfer audit logs from the system.
          </p>
          <button
            onClick={() => handleDangerDelete("history", "Transfer Logs")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(220,38,38,0.5)",
              background: "rgba(220,38,38,0.1)",
              color: "#ef4444",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.82rem"
            }}
          >
            🗑️ Delete All Transfer Logs
          </button>
        </div>
      </div>

      {/* Nuclear option */}
      <div
        style={{
          background: "rgba(220,38,38,0.08)",
          border: "2px solid rgba(220,38,38,0.5)",
          borderRadius: "14px",
          padding: "24px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "2rem" }}>☢️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#ef4444" }}>Delete Everything</h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              Wipes all systems, employees, tickets and history in one action
            </p>
          </div>
        </div>
        <button
          onClick={() => handleDangerDelete("all", "All Data")}
          style={{
            padding: "12px 28px",
            borderRadius: "10px",
            border: "none",
            background: "var(--status-critical)",
            color: "#fff",
            fontWeight: "800",
            cursor: "pointer",
            fontSize: "0.9rem",
            boxShadow: "none"
          }}
        >
          ☢️ Wipe All Data — Full Reset
        </button>
      </div>
    </div>
  );
}
