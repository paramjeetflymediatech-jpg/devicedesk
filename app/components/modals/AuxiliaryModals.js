"use client";

import React from "react";

export default function AuxiliaryModals({
  // Delete confirm
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDeleteAccountConfirm,

  // Media preview lightbox
  previewMediaUrl,
  setPreviewMediaUrl,

  // Leave reason modal
  selectedReasonModal,
  setSelectedReasonModal
}) {
  return (
    <>
      {/* Account Deletion Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "420px",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                border: "3px solid var(--status-critical)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 1rem auto"
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
              Are you sure?
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                lineHeight: "1.5",
                marginBottom: "1.5rem"
              }}
            >
              You will not be able to revert this account deletion! All assignments and tickets will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccountConfirm}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  border: "none",
                  background: "var(--status-critical)",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Yes, delete it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Lightbox Modal */}
      {previewMediaUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setPreviewMediaUrl(null)}
        >
          {/* Top Control Bar */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              zIndex: 1000000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={previewMediaUrl}
              download
              className="btn-secondary"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              📥 Download File
            </a>
            <button
              onClick={() => setPreviewMediaUrl(null)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#fff",
                fontSize: "1.4rem",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s"
              }}
              title="Close Preview (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Media Content Display */}
          <div
            style={{
              maxWidth: "92vw",
              maxHeight: "88vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp)$/i.test(previewMediaUrl) ? (
              <video
                src={previewMediaUrl}
                controls
                autoPlay
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  borderRadius: "12px",
                  outline: "none"
                }}
              />
            ) : /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(previewMediaUrl) ? (
              <img
                src={previewMediaUrl}
                alt="Media Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  borderRadius: "12px"
                }}
              />
            ) : /\.pdf$/i.test(previewMediaUrl) ? (
              <iframe
                src={previewMediaUrl}
                style={{
                  width: "82vw",
                  height: "82vh",
                  border: "none",
                  borderRadius: "12px",
                  background: "#fff"
                }}
                title="PDF Document Preview"
              />
            ) : (
              <div
                style={{
                  background: "#161b22",
                  padding: "2.5rem",
                  borderRadius: "16px",
                  textAlign: "center",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}
              >
                <span style={{ fontSize: "3.5rem" }}>📄</span>
                <h4 style={{ margin: "1rem 0 0.5rem 0" }}>File Preview</h4>
                <p style={{ margin: "0 0 1.5rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {previewMediaUrl.split("/").pop()}
                </p>
                <a
                  href={previewMediaUrl}
                  download
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  📥 Download Attachment
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Leave Reason Modal Inspector */}
      {selectedReasonModal &&
        (() => {
          const isLight =
            typeof document !== "undefined" &&
            document.documentElement.getAttribute("data-theme") === "light";
          const modalBg = isLight ? "#ffffff" : "#1e293b";
          const textColor = isLight ? "#0f172a" : "#f8fafc";
          const subTextColor = isLight ? "#64748b" : "#94a3b8";
          const reasonBoxBg = isLight ? "#f1f5f9" : "#0f172a";
          const borderCol = isLight ? "#cbd5e1" : "#334155";

          return (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.75)",
                backdropFilter: "blur(4px)",
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
              }}
            >
              <div
                style={{
                  backgroundColor: modalBg,
                  border: `1px solid ${borderCol}`,
                  borderRadius: "16px",
                  padding: "24px",
                  maxWidth: "580px",
                  width: "100%",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
                  color: textColor
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                    borderBottom: `1px solid ${borderCol}`,
                    paddingBottom: "12px"
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: textColor }}>
                      📄 Leave Application Details
                    </h3>
                    <span style={{ fontSize: "0.82rem", color: subTextColor }}>
                      Applicant: <strong style={{ color: textColor }}>{selectedReasonModal.employeeName}</strong> (
                      {selectedReasonModal.leaveType})
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedReasonModal(null)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.2rem",
                      color: subTextColor,
                      cursor: "pointer"
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: "800",
                    marginBottom: "8px",
                    color: textColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  Full Reason for Leave:
                </div>

                <div
                  style={{
                    maxHeight: "360px",
                    overflowY: "auto",
                    backgroundColor: reasonBoxBg,
                    padding: "16px",
                    borderRadius: "10px",
                    border: `1px solid ${borderCol}`,
                    fontSize: "0.92rem",
                    fontWeight: "500",
                    color: textColor,
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  {selectedReasonModal.reason || "No reason provided."}
                </div>

                <div style={{ marginTop: "20px", textAlign: "right" }}>
                  <button
                    onClick={() => setSelectedReasonModal(null)}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
