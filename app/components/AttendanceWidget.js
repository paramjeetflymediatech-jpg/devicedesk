"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import { FiClock, FiCoffee, FiLogIn, FiPlayCircle, FiStopCircle, FiPlay, FiX } from "react-icons/fi";

export default function AttendanceWidget({ user, onStatusChange }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState("Tea Break");

  // Local live tick timer states
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  const timerRef = useRef(null);

  const fetchStatus = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/attendance/status?employeeId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
        setWorkSeconds(data.elapsedWorkSeconds || 0);
        setBreakSeconds(data.elapsedBreakSeconds || 0);
        if (onStatusChange) onStatusChange(data);
      }
    } catch (err) {
      console.error("Failed to fetch attendance status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => fetchStatus());
  }, [user?.id]);

  // Live timer interval (ticks every second when punched in)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (statusData?.punchedIn) {
      timerRef.current = setInterval(() => {
        if (statusData.onBreak) {
          setBreakSeconds((prev) => prev + 1);
        } else {
          setWorkSeconds((prev) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [statusData?.punchedIn, statusData?.onBreak]);

  const handlePunch = async (action, extraData = {}) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user.id,
          employeeName: user.name,
          action,
          ...extraData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Attendance Updated",
          text: data.message,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
          background: "#161b22",
          color: "#f0f6fc"
        });
        await fetchStatus();
      } else {
        Swal.fire({
          icon: "error",
          title: "Action Restricted",
          text: data.message,
          background: "#161b22",
          color: "#f0f6fc"
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not reach attendance server.",
        background: "#161b22",
        color: "#f0f6fc"
      });
    } finally {
      setSubmitting(false);
      setShowBreakModal(false);
    }
  };

  const formatHMS = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div 
        style={{
          background: "var(--bg-secondary)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ width: "120px", height: "20px", borderRadius: "6px", background: "rgba(255,255,255,0.05)" }} />
        </div>
        <div style={{ width: "100px", height: "36px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }} />
      </div>
    );
  }

  const punchedIn = statusData?.punchedIn;
  const onBreak = statusData?.onBreak;
  const activeRecord = statusData?.activeRecord;

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)",
        borderRadius: "16px",
        padding: "1.25rem 1.5rem",
                marginBottom: "1.5rem"
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem"
        }}
      >
        {/* Left: Status Badge & Live Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              background: onBreak
                ? "rgba(245, 158, 11, 0.15)"
                : punchedIn
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(255, 255, 255, 0.04)",
              border: onBreak
                ? "1px solid rgba(245, 158, 11, 0.3)"
                : punchedIn
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid var(--glass-border)",
              boxShadow: punchedIn ? "0 0 15px rgba(16, 185, 129, 0.2)" : "none"
            }}
          >
            {onBreak ? <FiCoffee style={{ color: "#f59e0b" }} /> : punchedIn ? <FiClock style={{ color: "#10b981" }} /> : <FiLogIn style={{ color: "var(--accent-cyan)" }} />}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" }}>
                Daily Attendance
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  background: onBreak
                    ? "rgba(245, 158, 11, 0.18)"
                    : punchedIn
                    ? "rgba(16, 185, 129, 0.18)"
                    : "rgba(255, 255, 255, 0.05)",
                  color: onBreak
                    ? "#f59e0b"
                    : punchedIn
                    ? "#10b981"
                    : "var(--text-secondary)",
                  border: onBreak
                    ? "1px solid rgba(245, 158, 11, 0.3)"
                    : punchedIn
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid var(--glass-border)"
                }}
              >
                {onBreak
                  ? `On Break (${activeRecord?.breakType || "Break"})`
                  : punchedIn
                  ? "Working"
                  : "Not Punched In"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "4px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span>
                Net Work Time:{" "}
                <strong style={{ color: "var(--accent-cyan)", fontFamily: "monospace", fontSize: "0.95rem" }}>
                  {formatHMS(workSeconds)}
                </strong>
              </span>
              {punchedIn && (
                <span>
                  Break Time:{" "}
                  <strong style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: "0.95rem" }}>
                    {formatHMS(breakSeconds)}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {!punchedIn ? (
            <button
              onClick={() => handlePunch("PUNCH_IN")}
              disabled={submitting}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                                transition: "all 0.2s ease",
                opacity: submitting ? 0.6 : 1
              }}
            >
              <FiPlayCircle style={{ fontSize: "1.1rem" }} /> Punch In
            </button>
          ) : (
            <>
              {onBreak ? (
                <button
                  onClick={() => handlePunch("END_BREAK")}
                  disabled={submitting}
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                                        transition: "all 0.2s ease"
                  }}
                >
                  <FiPlay style={{ fontSize: "1rem" }} /> Resume Work
                </button>
              ) : (
                <button
                  onClick={() => setShowBreakModal(true)}
                  disabled={submitting}
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <FiCoffee style={{ fontSize: "1rem" }} /> Take Break
                </button>
              )}

              <button
                onClick={() => handlePunch("PUNCH_OUT")}
                disabled={submitting}
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                                    transition: "all 0.2s ease"
                }}
              >
                <FiStopCircle style={{ fontSize: "1rem" }} /> Punch Out
              </button>
            </>
          )}
        </div>
      </div>

      {/* BREAK TYPE SELECTION MODAL (Rendered on document.body via Portal to prevent card clipping/overlapping) */}
      {showBreakModal && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={() => setShowBreakModal(false)}
        >
          <div
            className="modal-card fade-in"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              borderRadius: "20px",
              padding: "1.75rem",
              maxWidth: "420px",
              width: "100%",
                            color: "var(--text-primary)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "10px" }}>
                <FiCoffee style={{ fontSize: "1.3rem" }} /> Select Break Type
              </h3>
              <button
                onClick={() => setShowBreakModal(false)}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  transition: "all 0.2s"
                }}
              >
                <FiX />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", marginTop: 0 }}>
              Choose your break category before stepping away from work:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.5rem" }}>
              {[
                { type: "Tea Break", icon: "☕", desc: "Short 15-min tea/coffee refresh" },
                { type: "Lunch Break", icon: "🍱", desc: "Meal break during work shift" },
                { type: "Personal Break", icon: "⏸️", desc: "Quick personal step away" }
              ].map(({ type, icon, desc }) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: selectedBreakType === type ? "var(--bg-tertiary)" : "var(--bg-primary)",
                    border: selectedBreakType === type ? "2px solid var(--accent-cyan)" : "1px solid var(--glass-border)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <input
                    type="radio"
                    name="breakType"
                    value={type}
                    checked={selectedBreakType === type}
                    onChange={(e) => setSelectedBreakType(e.target.value)}
                    style={{ width: "18px", height: "18px", accentColor: "var(--accent-cyan)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "1.3rem" }}>{icon}</span>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>{type}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                onClick={() => setShowBreakModal(false)}
                style={{ padding: "10px 18px", fontSize: "0.85rem", borderRadius: "10px" }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handlePunch("START_BREAK", { breakType: selectedBreakType })}
                style={{ padding: "10px 22px", fontSize: "0.85rem", borderRadius: "10px", fontWeight: "700" }}
              >
                Start Break
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
