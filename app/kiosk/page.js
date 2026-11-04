"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiCamera, FiMaximize, FiMinimize, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { Html5Qrcode } from "html5-qrcode";

export default function AttendanceKioskPage() {
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const dismissTimerRef = useRef(null);
  const bufferTimeoutRef = useRef(null);
  const processScanRef = useRef(null);
  const scannerRef = useRef(null);
  const lastScannedCodeRef = useRef("");
  const lastScanTimestampRef = useRef(0);

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
      setDateStr(now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Chime synthesizer
  const playChime = (type = "success") => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === "warn") {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  // Submit scan to backend
  const handleProcessScan = useCallback(async (rawCode) => {
    if (!rawCode || isProcessing) return;
    const clean = rawCode.trim();
    if (!clean) return;

    // Throttle identical scans within 4 seconds (debounce rapid camera frames)
    const nowMs = Date.now();
    if (clean === lastScannedCodeRef.current && nowMs - lastScanTimestampRef.current < 4000) {
      return;
    }
    lastScannedCodeRef.current = clean;
    lastScanTimestampRef.current = nowMs;

    setIsProcessing(true);

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: clean, source: "QR_CARD" })
      });

      const data = await res.json();

      if (data.success) {
        if (data.action === "ALREADY_PUNCHED") {
          playChime("warn");
        } else {
          playChime("success");
        }

        setLastResult({
          success: true,
          ...data
        });

        // Add to recent ticker
        if (data.employee && data.action !== "ALREADY_PUNCHED") {
          setRecentLogs(prev => [
            {
              id: Date.now(),
              name: data.employee.name,
              dept: data.employee.department,
              time: data.time,
              action: data.action,
              status: data.status,
              workHours: data.workHours
            },
            ...prev.slice(0, 4)
          ]);
        }
      } else {
        playChime("error");
        setLastResult({
          success: false,
          message: data.message || "Card scan failed."
        });
      }

      // Auto-dismiss confirmation card after 4.5 seconds
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setLastResult(null);
      }, 4500);

    } catch (err) {
      playChime("error");
      setLastResult({
        success: false,
        message: "Server network error. Please try again."
      });
    } finally {
      setIsProcessing(false);
      setManualCode("");
    }
  }, [isProcessing]);

  useEffect(() => {
    processScanRef.current = handleProcessScan;
  }, [handleProcessScan]);

  // Global listener for USB Barcode / QR Scanners (HID Keyboard emulation)
  useEffect(() => {
    let currentBuffer = "";

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing inside the manual input field
      if (document.activeElement && document.activeElement.tagName === "INPUT") {
        return;
      }

      if (e.key === "Enter") {
        if (currentBuffer.length > 2) {
          if (processScanRef.current) {
            processScanRef.current(currentBuffer);
          }
          currentBuffer = "";
        }
      } else if (e.key.length === 1) {
        currentBuffer += e.key;

        // Reset buffer if no keys received within 300ms
        if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
        bufferTimeoutRef.current = setTimeout(() => {
          currentBuffer = "";
        }, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    };
  }, []);

  // Initialize Camera Scanner Viewfinder
  useEffect(() => {
    if (!cameraActive) {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      setCameraError("");
      try {
        const availableDevices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!availableDevices || availableDevices.length === 0) {
          setCameraError("No webcam found on this device.");
          return;
        }

        setCameras(availableDevices);
        const deviceToUse = selectedCameraId || availableDevices[0].id;

        // Create scanner instance
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("kiosk-camera-reader");
        }

        const config = {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        };

        await scannerRef.current.start(
          deviceToUse,
          config,
          (decodedText) => {
            if (processScanRef.current) {
              processScanRef.current(decodedText);
            }
          },
          () => {
            // Per-frame error, ignore quietly
          }
        );
      } catch (err) {
        if (isMounted) {
          console.warn("Camera init warning:", err);
          setCameraError(err.message || "Camera access denied or unavailable.");
        }
      }
    };

    // Small delay to ensure DOM container #kiosk-camera-reader is mounted
    const timer = setTimeout(startScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, [cameraActive, selectedCameraId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px",
        boxSizing: "border-box",
        position: "relative",
        userSelect: "none"
      }}
    >
      <style jsx global>{`
        #kiosk-camera-reader {
          border: none !important;
          position: relative !important;
        }
        #kiosk-camera-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 16px !important;
        }
        #kiosk-camera-reader__scan_region {
          background: transparent !important;
          min-height: unset !important;
        }
        #kiosk-camera-reader__scan_region img {
          display: none !important;
        }
        #kiosk-camera-reader__dashboard, #kiosk-camera-reader__dashboard_section_csr {
          display: none !important;
        }
      `}</style>
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              boxShadow: "0 4px 14px rgba(37,99,235,0.4)"
            }}
          >
            🪪
          </div>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "0.5px" }}>
              Flymedia Technology
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Attendance Kiosk • DeviceDesk
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Camera Toggle */}
          <button
            onClick={() => setCameraActive(prev => !prev)}
            style={{
              background: cameraActive ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
              border: `1px solid ${cameraActive ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.15)"}`,
              color: cameraActive ? "#34d399" : "#cbd5e1",
              padding: "8px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            <FiCamera />
            {cameraActive ? "Camera ON" : "Camera OFF"}
          </button>

          {/* Switch Camera if multiple */}
          {cameraActive && cameras.length > 1 && (
            <button
              onClick={() => {
                const nextIdx = (cameras.findIndex(c => c.id === selectedCameraId) + 1) % cameras.length;
                setSelectedCameraId(cameras[nextIdx].id);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                padding: "8px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem"
              }}
              title="Switch Camera (Front/Back)"
            >
              <FiRefreshCw /> Switch
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#cbd5e1",
              padding: "8px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem"
            }}
          >
            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* Center Main Stage */}
      <div
        style={{
          maxWidth: "800px",
          width: "100%",
          margin: "20px auto",
          textAlign: "center"
        }}
      >
        {/* Large Digital Clock */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "clamp(3rem, 7vw, 4.8rem)",
              fontWeight: 800,
              letterSpacing: "-1.5px",
              lineHeight: 1,
              background: "linear-gradient(180deg, #ffffff 40%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            {time || "--:--:--"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "#60a5fa", marginTop: "8px", fontWeight: 600 }}>
            {dateStr || "Loading..."}
          </div>
        </div>

        {/* Scan Status Card OR Camera Viewfinder */}
        {lastResult ? (
          <div
            style={{
              background: lastResult.success
                ? lastResult.action === "ALREADY_PUNCHED"
                  ? "rgba(234, 179, 8, 0.15)"
                  : "rgba(16, 185, 129, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
              border: `2px solid ${
                lastResult.success
                  ? lastResult.action === "ALREADY_PUNCHED"
                    ? "#eab308"
                    : "#10b981"
                  : "#ef4444"
              }`,
              borderRadius: "24px",
              padding: "28px 32px",
              maxWidth: "480px",
              margin: "0 auto",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.3s ease-out"
            }}
          >
            {lastResult.success ? (
              <div>
                <div style={{ fontSize: "3.2rem", marginBottom: "8px" }}>
                  {lastResult.action === "PUNCH_IN" ? "🟢" : lastResult.action === "PUNCH_OUT" ? "🔴" : "⏳"}
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "4px" }}>
                  {lastResult.employee?.name}
                </div>
                <div style={{ fontSize: "0.95rem", color: "#94a3b8", marginBottom: "14px" }}>
                  {lastResult.employee?.department}
                </div>
                <div
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    padding: "12px 18px",
                    borderRadius: "12px",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: lastResult.action === "PUNCH_IN" ? "#34d399" : "#f87171"
                  }}
                >
                  {lastResult.message}
                </div>
                {lastResult.workHours && (
                  <div style={{ marginTop: "12px", fontSize: "0.9rem", color: "#cbd5e1" }}>
                    Total Shift Duration: <strong>{lastResult.workHours}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "2.8rem", color: "#ef4444", marginBottom: "8px" }}>
                  <FiAlertCircle style={{ margin: "0 auto" }} />
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fca5a5" }}>
                  Scan Rejected
                </div>
                <div style={{ fontSize: "0.95rem", color: "#cbd5e1", marginTop: "8px" }}>
                  {lastResult.message}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "2px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "24px",
              padding: "24px 20px",
              maxWidth: "460px",
              margin: "0 auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}
          >
            {/* Live Camera Viewfinder if enabled */}
            {cameraActive ? (
              <div>
                <div
                  style={{
                    width: "280px",
                    height: "280px",
                    margin: "0 auto 16px",
                    borderRadius: "20px",
                    overflow: "hidden",
                    border: "3px solid #3b82f6",
                    boxShadow: "0 0 25px rgba(59, 130, 246, 0.35)",
                    position: "relative",
                    background: "#000000"
                  }}
                >
                  <div id="kiosk-camera-reader" style={{ width: "100%", height: "100%" }} />

                  {/* Corner Target Markers */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderRadius: "16px",
                      margin: "24px"
                    }}
                  />
                </div>

                {cameraError && (
                  <div style={{ fontSize: "0.82rem", color: "#f87171", marginBottom: "10px" }}>
                    {cameraError}
                  </div>
                )}

                <div style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "4px" }}>
                  Hold Card in Front of Camera
                </div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  Or use a USB barcode scanner gun at any time.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "3.5rem", marginBottom: "10px" }}>🪪</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "6px" }}>
                  USB Scanner Ready
                </div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", maxWidth: "340px", margin: "0 auto" }}>
                  Flash the QR code on your employee card in front of the scanner.
                </div>
              </div>
            )}

            {/* Manual Entry Fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessScan(manualCode);
              }}
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "8px",
                maxWidth: "340px",
                margin: "18px auto 0"
              }}
            >
              <input
                type="text"
                placeholder="Or enter Card / Emp ID..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.4)",
                  color: "#ffffff",
                  fontSize: "0.88rem"
                }}
              />
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  padding: "9px 15px",
                  borderRadius: "10px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.88rem"
                }}
              >
                {isProcessing ? "..." : "Scan"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Live Activity Ticker */}
      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
          margin: "0 auto",
          background: "rgba(15, 23, 42, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "14px 20px"
        }}
      >
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          Live Entrance Logs
        </div>

        {recentLogs.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
            Ready for employee scans today.
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", overflowX: "auto" }}>
            {recentLogs.map(log => (
              <div
                key={log.id}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  fontSize: "0.82rem",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>{log.action === "PUNCH_IN" ? "🟢" : "🔴"}</span>
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>{log.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    {log.action === "PUNCH_IN" ? "Checked In" : "Checked Out"} at {log.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
