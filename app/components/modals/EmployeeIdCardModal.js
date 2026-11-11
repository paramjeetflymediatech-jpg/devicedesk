/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { FiPrinter, FiDownload, FiX, FiCheck } from "react-icons/fi";

export default function EmployeeIdCardModal({ employee, isOpen, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [cardLayout, setCardLayout] = useState("horizontal"); // "horizontal" (Landscape) or "vertical" (Portrait)
  const [showLargeQr, setShowLargeQr] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!employee || !isOpen) return;

    const payload = JSON.stringify({
      id: employee.id,
      bioId: employee.biometric_id || employee.id,
      name: employee.name,
      dept: employee.department || "",
      type: "DEVICEDESK_CARD"
    });

    QRCode.toDataURL(payload, {
      width: 500,
      margin: 3,
      color: {
        dark: "#000000",
        light: "#ffffff"
      },
      errorCorrectionLevel: "M"
    }).then(url => {
      setQrDataUrl(url);
    }).catch(err => {
      console.error("QR Code Generation Error:", err);
    });
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `${employee.name.replace(/\s+/g, "_")}_Attendance_QR.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const cardIdentifier = employee.biometric_id || employee.id;

  return (
    <div
      className="modal-overlay active"
      style={{
        zIndex: 9999,
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto"
      }}
      onClick={onClose}
    >
      {/* Print-only CSS rules */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-id-card, #printable-id-card * {
            visibility: visible !important;
          }
          #printable-id-card {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modal Dialog Card */}
      <div
        className="modal-card"
        style={{
          width: "100%",
          maxWidth: "540px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "18px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.55)",
          margin: "auto",
          background: "var(--bg-card, #ffffff)",
          border: "1px solid var(--glass-border, rgba(0, 0, 0, 0.12))",
          color: "var(--text-primary, #0f172a)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--glass-border, rgba(0, 0, 0, 0.08))",
            background: "var(--bg-secondary, rgba(0, 0, 0, 0.02))"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>🪪</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>
                Employee ID & Attendance Card
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--text-muted, #64748b)" }}>
                Official scannable credential for kiosk & biometric punches
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="modal-close"
            style={{
              background: "rgba(100, 116, 139, 0.1)",
              border: "none",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-primary, #0f172a)",
              fontSize: "1.1rem",
              transition: "background 0.2s"
            }}
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </div>

        {/* Card Layout Switcher Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 20px 4px",
            background: "var(--bg-card, #ffffff)"
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "rgba(100, 116, 139, 0.1)",
              padding: "4px",
              borderRadius: "10px",
              gap: "4px",
              border: "1px solid var(--glass-border, rgba(0,0,0,0.06))"
            }}
          >
            <button
              type="button"
              onClick={() => setCardLayout("horizontal")}
              style={{
                border: "none",
                borderRadius: "7px",
                padding: "6px 16px",
                fontSize: "0.78rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                background: cardLayout === "horizontal" ? "#2563eb" : "transparent",
                color: cardLayout === "horizontal" ? "#ffffff" : "var(--text-primary, #0f172a)",
                boxShadow: cardLayout === "horizontal" ? "0 2px 6px rgba(37, 99, 235, 0.3)" : "none",
                transition: "all 0.18s ease"
              }}
            >
              <span>💳</span> Landscape Card
            </button>
            <button
              type="button"
              onClick={() => setCardLayout("vertical")}
              style={{
                border: "none",
                borderRadius: "7px",
                padding: "6px 16px",
                fontSize: "0.78rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                background: cardLayout === "vertical" ? "#2563eb" : "transparent",
                color: cardLayout === "vertical" ? "#ffffff" : "var(--text-primary, #0f172a)",
                boxShadow: cardLayout === "vertical" ? "0 2px 6px rgba(37, 99, 235, 0.3)" : "none",
                transition: "all 0.18s ease"
              }}
            >
              <span>🪪</span> Portrait Badge
            </button>
          </div>
        </div>

        {/* Modal Body / Card Preview Canvas */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflowY: "auto",
            minHeight: 0,
            maxHeight: "calc(86vh - 200px)",
            background: "var(--bg-card, #ffffff)"
          }}
        >
          {showLargeQr ? (
            /* ================= SCREEN SCAN MODE (LARGE HIGH-CONTRAST QR) ================= */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "24px 28px",
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                borderRadius: "18px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 15px 35px rgba(0, 0, 0, 0.45)",
                maxWidth: "380px",
                width: "100%"
              }}
            >
              <div style={{ color: "#38bdf8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                📱 Kiosk Screen Scanner
              </div>
              <h4 style={{ margin: "0 0 14px", color: "#ffffff", fontSize: "1.1rem", fontWeight: 700 }}>
                {employee.name}
              </h4>

              <div
                style={{
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "16px",
                  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4)",
                  display: "inline-block",
                  marginBottom: "14px"
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Employee Attendance QR Code"
                    style={{ width: "230px", height: "230px", display: "block" }}
                  />
                ) : (
                  <div style={{ color: "#64748b", padding: "40px 20px" }}>Generating QR...</div>
                )}
              </div>

              <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginBottom: "8px", fontWeight: 500 }}>
                Point this screen directly at the <strong>Kiosk Camera</strong> to punch.
              </div>

              <div style={{
                fontSize: "0.72rem",
                fontFamily: "monospace",
                color: "#94a3b8",
                background: "rgba(255,255,255,0.08)",
                padding: "4px 12px",
                borderRadius: "6px"
              }}>
                ID: {cardIdentifier}
              </div>
            </div>
          ) : cardLayout === "horizontal" ? (
            /* ================= 1. LANDSCAPE ID CARD ================= */
            <div
              id="printable-id-card"
              ref={cardRef}
              style={{
                width: "440px",
                maxWidth: "100%",
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
                overflow: "hidden",
                color: "#ffffff",
                fontFamily: "system-ui, -apple-system, sans-serif"
              }}
            >
              {/* Card Top Brand Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                  padding: "8px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                  FLYMEDIA TECHNOLOGY
                </div>
                <div style={{ fontSize: "0.62rem", opacity: 0.95, letterSpacing: "0.5px", fontWeight: 600 }}>
                  OFFICIAL ID CARD
                </div>
              </div>

              {/* Card Content Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  gap: "12px"
                }}
              >
                {/* Left: Avatar + Details */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: employee.avatarUrl
                        ? `url(${employee.avatarUrl}) center/cover no-repeat`
                        : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      border: "2px solid #ffffff",
                      boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.35rem",
                      fontWeight: 700,
                      color: "#ffffff",
                      flexShrink: 0
                    }}
                  >
                    {!employee.avatarUrl && (employee.name ? employee.name[0].toUpperCase() : "E")}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "#f8fafc",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {employee.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#60a5fa", fontWeight: 600, marginTop: "1px" }}>
                      {employee.role || "Team Member"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "1px" }}>
                      {employee.department || "General"}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: "5px",
                        fontSize: "0.66rem",
                        fontFamily: "monospace",
                        color: "#cbd5e1",
                        background: "rgba(255, 255, 255, 0.08)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px dashed rgba(255, 255, 255, 0.18)"
                      }}
                    >
                      ID: {cardIdentifier}
                    </div>
                  </div>
                </div>

                {/* Right: QR Code */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div
                    onClick={() => setShowLargeQr(true)}
                    title="Click to enlarge QR for screen scanning"
                    style={{
                      background: "#ffffff",
                      padding: "6px",
                      borderRadius: "10px",
                      width: "100px",
                      height: "100px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      cursor: "pointer",
                      transition: "transform 0.15s ease"
                    }}
                  >
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Employee Attendance QR Code"
                        style={{ width: "88px", height: "88px", display: "block" }}
                      />
                    ) : (
                      <div style={{ color: "#64748b", fontSize: "0.62rem" }}>Generating QR...</div>
                    )}
                  </div>
                  <div
                    onClick={() => setShowLargeQr(true)}
                    style={{ fontSize: "0.62rem", color: "#60a5fa", marginTop: "4px", fontWeight: 600, cursor: "pointer" }}
                  >
                    🔍 Enlarge QR
                  </div>
                </div>
              </div>

              {/* Bottom Security Footer */}
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  padding: "5px 16px",
                  fontSize: "0.58rem",
                  color: "#94a3b8",
                  textAlign: "center",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)"
                }}
              >
                DeviceDesk Attendance System • Non-Transferable
              </div>
            </div>
          ) : (
            /* ================= 2. PORTRAIT BADGE ================= */
            <div
              id="printable-id-card"
              ref={cardRef}
              style={{
                width: "250px",
                maxWidth: "100%",
                background: "linear-gradient(145deg, #1e293b, #0f172a)",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
                overflow: "hidden",
                color: "#ffffff",
                fontFamily: "system-ui, -apple-system, sans-serif"
              }}
            >
              {/* Lanyard Slot Simulation */}
              <div style={{ background: "#0f172a", padding: "6px 0 2px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "32px", height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.18)" }} />
              </div>

              <div style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", padding: "7px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                  FLYMEDIA TECHNOLOGY
                </div>
                <div style={{ fontSize: "0.56rem", opacity: 0.95, letterSpacing: "0.4px" }}>OFFICIAL IDENTITY CARD</div>
              </div>

              <div style={{ padding: "12px 14px 10px", textAlign: "center" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: employee.avatarUrl ? `url(${employee.avatarUrl}) center/cover no-repeat` : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    margin: "0 auto 6px",
                    border: "2px solid #ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "#ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
                  }}
                >
                  {!employee.avatarUrl && (employee.name ? employee.name[0].toUpperCase() : "E")}
                </div>

                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc" }}>
                  {employee.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#60a5fa", fontWeight: 600, marginTop: "1px" }}>
                  {employee.role || "Team Member"}
                </div>
                <div style={{ fontSize: "0.66rem", color: "#94a3b8", marginBottom: "8px" }}>
                  {employee.department || "General"}
                </div>

                <div
                  onClick={() => setShowLargeQr(true)}
                  title="Click to enlarge QR for screen scanning"
                  style={{
                    background: "#ffffff",
                    padding: "6px",
                    borderRadius: "10px",
                    width: "100px",
                    height: "100px",
                    margin: "0 auto 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    cursor: "pointer",
                    transition: "transform 0.15s ease"
                  }}
                >
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="QR Code" style={{ width: "88px", height: "88px", display: "block" }} />
                  )}
                </div>

                <div
                  onClick={() => setShowLargeQr(true)}
                  style={{ fontSize: "0.62rem", color: "#60a5fa", marginBottom: "4px", fontWeight: 600, cursor: "pointer" }}
                >
                  🔍 Enlarge QR
                </div>
                <div style={{
                  fontSize: "0.64rem",
                  fontFamily: "monospace",
                  color: "#cbd5e1",
                  background: "rgba(255,255,255,0.06)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  display: "inline-block"
                }}>
                  ID: {cardIdentifier}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  padding: "4px 12px",
                  fontSize: "0.55rem",
                  color: "#94a3b8",
                  textAlign: "center",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)"
                }}
              >
                DeviceDesk Attendance • Non-Transferable
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--glass-border, rgba(0, 0, 0, 0.08))",
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            alignItems: "center",
            background: "var(--bg-secondary, rgba(0, 0, 0, 0.02))"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{
              padding: "7px 14px",
              fontSize: "0.78rem",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => setShowLargeQr((prev) => !prev)}
            style={{
              padding: "7px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid #3b82f6",
              background: showLargeQr ? "rgba(59, 130, 246, 0.15)" : "transparent",
              color: "#3b82f6",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {showLargeQr ? "🪪 View ID Card" : "📱 Enlarge QR for Kiosk"}
          </button>

          <button
            type="button"
            onClick={handleDownloadQR}
            style={{
              padding: "7px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid var(--glass-border, #cbd5e1)",
              background: "var(--bg-card, #ffffff)",
              color: "var(--text-primary, #0f172a)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <FiDownload /> Download QR
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary"
            style={{
              padding: "7px 16px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(37, 99, 235, 0.25)"
            }}
          >
            <FiPrinter /> Print Card Badge
          </button>
        </div>
      </div>
    </div>
  );
}
