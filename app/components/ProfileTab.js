"use client";

import React from "react";
import { FiUser } from "react-icons/fi";

export default function ProfileTab({
  employees,
  user,
  handleProfilePictureUpload,
  renderProfileAvatar,
  setShowDeleteConfirm
}) {
  const empDetails = employees.find(e => e.id === user?.id);

  return (
    <div className="page-section active">
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "700",
          color: "var(--accent-cyan)",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <FiUser /> Admin Profile Details
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", marginBottom: "2rem" }}>
        {/* User card info */}
        <div
          style={{
            flex: "1 1 300px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "1.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div
              onClick={handleProfilePictureUpload}
              style={{ position: "relative", cursor: "pointer" }}
              title="Change Profile Picture"
            >
              {renderProfileAvatar ? renderProfileAvatar(empDetails || { name: user?.name || "A" }, "60px") : null}
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  background: "var(--accent-cyan)",
                  borderRadius: "50%",
                  width: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  color: "#000",
                  border: "2px solid var(--bg-tertiary)"
                }}
              >
                📷
              </div>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>{user?.name || "Administrator"}</h3>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>Root Admin Access</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                paddingBottom: "6px"
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Email:</span>
              <span>{user?.email || "admin@devicedesk.com"}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                paddingBottom: "6px"
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Access Level:</span>
              <span style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>Full Owner</span>
            </div>
          </div>
        </div>

        {/* Account Actions card */}
        <div
          style={{
            flex: "1 1 300px",
            background: "rgba(239, 68, 68, 0.03)",
            border: "1px dashed rgba(239, 68, 68, 0.3)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}
        >
          <h4
            style={{
              color: "var(--status-critical)",
              fontSize: "1.1rem",
              fontWeight: "700",
              marginBottom: "0.75rem"
            }}
          >
            ⚠️ Permanent Account Deletion
          </h4>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              lineHeight: "1.5",
              marginBottom: "1.5rem"
            }}
          >
            Deleting your account will permanently wipe your profile record, delete your raised tickets, and unassign
            any active inventory assets. This action is irreversible.
          </p>
          <button
            onClick={() => {
              if (user?.id === "admin") {
                alert("Default root admin account cannot be deleted.");
              } else {
                setShowDeleteConfirm(true);
              }
            }}
            className="btn-danger"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: "700",
              cursor: "pointer",
              border: "none",
              backgroundColor: "var(--status-critical)",
              color: "#fff",
              alignSelf: "flex-start"
            }}
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
