/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FiCamera,
  FiMaximize,
  FiMinimize,
  FiAlertCircle,
  FiRefreshCw,
  FiLock,
  FiUnlock,
  FiShield,
  FiCheckCircle,
  FiDelete
} from "react-icons/fi";
import { Html5Qrcode } from "html5-qrcode";

export default function AttendanceKioskPage() {
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Security & Authentication States
  // "checking" | "ip_blocked" | "locked" | "unlocked"
  const [authStatus, setAuthStatus] = useState("checking");
  const [clientIp, setClientIp] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const dismissTimerRef = useRef(null);
  const bufferTimeoutRef = useRef(null);
  const processScanRef = useRef(null);
  const unlockWithPinRef = useRef(null);
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
  const playChime = useCallback((type = "success") => {
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
  }, []);

  // Check Kiosk Security (IP & PIN Token) on mount
  const verifyKioskSecurity = async () => {
    try {
      const savedToken = typeof window !== "undefined" ? localStorage.getItem("devicedesk_kiosk_token") || "" : "";
      const url = `/api/kiosk/auth${savedToken ? `?token=${encodeURIComponent(savedToken)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      setClientIp(data.clientIp || "");

      // 1. IP check: If strict office IP is configured and device is outside office network
      if (data.isIpConfigured && !data.isOfficeIp) {
        setAuthStatus("ip_blocked");
        return;
      }

      // 2. PIN token check: Device must be unlocked
      if (data.isUnlocked) {
        setAuthStatus("unlocked");
      } else {
        setAuthStatus("locked");
      }
    } catch (err) {
      console.error("Kiosk security check error:", err);
      setAuthStatus("locked");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const savedToken = typeof window !== "undefined" ? localStorage.getItem("devicedesk_kiosk_token") || "" : "";
        const url = `/api/kiosk/auth${savedToken ? `?token=${encodeURIComponent(savedToken)}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isMounted) return;
        setClientIp(data.clientIp || "");

        if (data.isIpConfigured && !data.isOfficeIp) {
          setAuthStatus("ip_blocked");
        } else if (data.isUnlocked) {
          setAuthStatus("unlocked");
        } else {
          setAuthStatus("locked");
        }
      } catch (err) {
        if (isMounted) setAuthStatus("locked");
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle PIN Unlock
  const handleUnlockWithPin = useCallback(async (pinValue) => {
    const pin = pinValue !== undefined ? pinValue : pinInput;
    if (!pin) {
      setPinError("Please enter the Admin PIN.");
      return;
    }

    setIsVerifyingPin(true);
    setPinError("");

    try {
      const res = await fetch("/api/kiosk/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("devicedesk_kiosk_token", data.token);
        setAuthStatus("unlocked");
        setPinInput("");
        setPinError("");
        playChime("success");
      } else {
        playChime("error");
        if (data.errorType === "IP_RESTRICTED") {
          setAuthStatus("ip_blocked");
          setClientIp(data.clientIp);
        } else {
          setPinError(data.message || "Incorrect PIN. Try again.");
          setPinInput("");
        }
      }
    } catch (e) {
      setPinError("Network error. Could not verify PIN.");
    } finally {
      setIsVerifyingPin(false);
    }
  }, [pinInput, playChime]);

  useEffect(() => {
    unlockWithPinRef.current = handleUnlockWithPin;
  }, [handleUnlockWithPin]);

  // Re-lock Terminal
  const handleLockTerminal = () => {
    localStorage.removeItem("devicedesk_kiosk_token");
    setAuthStatus("locked");
    setPinInput("");
    setPinError("");
    setLastResult(null);
  };

  // Keyboard support for PIN entry when locked
  useEffect(() => {
    if (authStatus !== "locked") return;

    const handlePinKey = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        setPinInput(prev => {
          if (prev.length < 8) {
            const next = prev + e.key;
            if (next.length === 4 && unlockWithPinRef.current) {
              unlockWithPinRef.current(next);
            }
            return next;
          }
          return prev;
        });
      } else if (e.key === "Backspace") {
        setPinInput(prev => prev.slice(0, -1));
      } else if (e.key === "Enter" && unlockWithPinRef.current) {
        unlockWithPinRef.current();
      }
    };

    window.addEventListener("keydown", handlePinKey);
    return () => window.removeEventListener("keydown", handlePinKey);
  }, [authStatus]);

  // Submit scan to backend with Kiosk Token
  const handleProcessScan = useCallback(async (rawCode) => {
    if (!rawCode || isProcessing || authStatus !== "unlocked") return;
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
      const savedToken = localStorage.getItem("devicedesk_kiosk_token") || "";

      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-token": savedToken
        },
        body: JSON.stringify({ identifier: clean, source: "QR_CARD", kioskToken: savedToken })
      });

      const data = await res.json();

      // If terminal became unauthorized or locked
      if (res.status === 401 || data.isLocked) {
        handleLockTerminal();
        return;
      }

      // If IP restricted
      if (res.status === 403 && data.errorType === "IP_RESTRICTED") {
        setAuthStatus("ip_blocked");
        setClientIp(data.clientIp || "");
        return;
      }

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
  }, [isProcessing, authStatus, playChime]);

  useEffect(() => {
    processScanRef.current = handleProcessScan;
  }, [handleProcessScan]);

  // Global listener for USB Barcode / QR Scanners (HID Keyboard emulation)
  useEffect(() => {
    if (authStatus !== "unlocked") return;

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
  }, [authStatus]);

  // Initialize Camera Scanner Viewfinder only when unlocked
  useEffect(() => {
    if (authStatus !== "unlocked" || !cameraActive) {
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
          qrbox: { width: 200, height: 200 },
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
          () => {}
        );
      } catch (err) {
        if (isMounted) {
          console.warn("Camera init warning:", err);
          setCameraError(err.message || "Camera access denied or unavailable.");
        }
      }
    };

    const timer = setTimeout(startScanner, 250);

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
  }, [authStatus, cameraActive, selectedCameraId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Shared Full-Screen Viewport Container with Background Image & Balanced Overlay
  const fullScreenContainerStyle = {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 9999,
    overflowY: "auto",
    overflowX: "hidden",
    backgroundImage: "linear-gradient(135deg, rgba(15, 23, 42, 0.65) 0%, rgba(2, 6, 23, 0.8) 100%), url('/kiosk-bg.jpg')",
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box"
  };

  // =========================================================================
  // VIEW 1: LOADING STATE
  // =========================================================================
  if (authStatus === "checking") {
    return (
      <div
        style={{
          ...fullScreenContainerStyle,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "20px",
            padding: "28px 36px",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
            maxWidth: "90%",
            boxSizing: "border-box"
          }}
        >
          <div style={{ fontSize: "2.4rem", marginBottom: "12px", animation: "spin 1.5s linear infinite" }}>
            🔄
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>Verifying Terminal Security...</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
            Checking office network & device credentials
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: OFFICE IP BLOCKED SCREEN
  // =========================================================================
  if (authStatus === "ip_blocked") {
    return (
      <div
        style={{
          ...fullScreenContainerStyle,
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(24px)",
            border: "2px solid #ef4444",
            borderRadius: "20px",
            padding: "24px 20px",
            boxShadow: "0 25px 60px rgba(239, 68, 68, 0.25)",
            textAlign: "center",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              margin: "0 auto 12px",
              boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)"
            }}
          >
            <FiShield />
          </div>

          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 6px", color: "#f87171" }}>
            Office Network Required
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.4, margin: "0 0 16px" }}>
            This Attendance Kiosk is restricted to the office Wi-Fi network. Scanning attendance outside the office is not permitted.
          </p>

          <div
            style={{
              background: "rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "10px 14px",
              marginBottom: "16px",
              textAlign: "left"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
              <span style={{ color: "#94a3b8" }}>Current Detected IP:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#fca5a5" }}>
                {clientIp || "Unknown"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
              <span style={{ color: "#94a3b8" }}>Status:</span>
              <span style={{ fontWeight: 600, color: "#f87171" }}>Outside Office Range</span>
            </div>
          </div>

          <button
            onClick={verifyKioskSecurity}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "0.86rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 15px rgba(37,99,235,0.4)"
            }}
          >
            <FiRefreshCw /> Refresh & Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ADMIN KIOSK PIN LOCK SCREEN (CENTERED & RESPONSIVE)
  // =========================================================================
  if (authStatus === "locked") {
    return (
      <div
        style={{
          ...fullScreenContainerStyle,
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          userSelect: "none"
        }}
      >
        <div
          style={{
            maxWidth: "340px",
            width: "100%",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "20px",
            padding: "18px 20px 14px",
            textAlign: "center",
            boxShadow: "0 25px 60px -10px rgba(0, 0, 0, 0.75)",
            boxSizing: "border-box"
          }}
        >
          {/* Top Brand Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              padding: "3px 10px",
              borderRadius: "16px",
              marginBottom: "8px",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            <span style={{ fontSize: "0.75rem" }}>🪪</span>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.5px", color: "#e2e8f0" }}>
              FLYMEDIA TECHNOLOGY
            </span>
          </div>

          {/* Header Title with Small Glow Lock */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "2px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                boxShadow: "0 0 10px rgba(37, 99, 235, 0.6)"
              }}
            >
              <FiLock />
            </div>
            <h2 style={{ fontSize: "1.08rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Entrance Terminal Locked
            </h2>
          </div>

          <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "0 0 10px" }}>
            Enter Admin PIN to unlock scanning on this office terminal
          </p>

          {/* PIN Indicator Dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                style={{
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  border: "2px solid #3b82f6",
                  background: pinInput.length > idx ? "#3b82f6" : "transparent",
                  boxShadow: pinInput.length > idx ? "0 0 8px #3b82f6" : "none",
                  transition: "all 0.15s ease"
                }}
              />
            ))}
          </div>

          {/* Error Message */}
          {pinError && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                padding: "4px 8px",
                fontSize: "0.7rem",
                marginBottom: "8px",
                fontWeight: 600
              }}
            >
              {pinError}
            </div>
          )}

          {/* Compact Interactive On-Screen Keypad */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "6px",
              maxWidth: "220px",
              margin: "0 auto 10px"
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  if (pinInput.length < 8) {
                    const next = pinInput + String(num);
                    setPinInput(next);
                    if (next.length === 4) {
                      handleUnlockWithPin(next);
                    }
                  }
                }}
                style={{
                  padding: "8px 0",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.07)",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.12s ease"
                }}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPinInput("")}
              style={{
                padding: "8px 0",
                fontSize: "0.7rem",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "#94a3b8",
                cursor: "pointer"
              }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => {
                if (pinInput.length < 8) {
                  const next = pinInput + "0";
                  setPinInput(next);
                  if (next.length === 4) {
                    handleUnlockWithPin(next);
                  }
                }
              }}
              style={{
                padding: "8px 0",
                fontSize: "1.1rem",
                fontWeight: 700,
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(255, 255, 255, 0.07)",
                color: "#ffffff",
                cursor: "pointer"
              }}
            >
              0
            </button>

            <button
              type="button"
              onClick={() => setPinInput(prev => prev.slice(0, -1))}
              style={{
                padding: "8px 0",
                fontSize: "1rem",
                fontWeight: 700,
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "#94a3b8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FiDelete />
            </button>
          </div>

          {/* Unlock Submit Button */}
          <button
            type="button"
            onClick={() => handleUnlockWithPin()}
            disabled={isVerifyingPin || !pinInput}
            style={{
              width: "100%",
              padding: "9px",
              borderRadius: "10px",
              background: pinInput ? "#2563eb" : "rgba(37, 99, 235, 0.35)",
              color: "#ffffff",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: pinInput ? "pointer" : "not-allowed",
              boxShadow: pinInput ? "0 4px 15px rgba(37,99,235,0.4)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            <FiUnlock /> {isVerifyingPin ? "Verifying..." : "Unlock Terminal"}
          </button>

          <div style={{ marginTop: "6px", fontSize: "0.66rem", color: "#94a3b8" }}>
            Terminal IP: {clientIp || "Local LAN"} • DeviceDesk Shield
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: UNLOCKED FULL KIOSK SCANNER (FULLY RESPONSIVE)
  // =========================================================================
  return (
    <div
      style={{
        ...fullScreenContainerStyle,
        justifyContent: "space-between",
        padding: "14px"
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

        /* Responsive Layout Styles */
        .kiosk-nav-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 10px 16px;
          box-sizing: border-box;
          gap: 10px;
        }

        .kiosk-controls-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 680px) {
          .kiosk-nav-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 10px 12px !important;
            gap: 10px !important;
          }
          .kiosk-controls-group {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .kiosk-controls-group button {
            padding: 6px 4px !important;
            font-size: 0.72rem !important;
            justify-content: center !important;
            white-space: nowrap !important;
          }
          .kiosk-camera-view-box {
            width: min(200px, 55vw) !important;
            height: min(200px, 55vw) !important;
          }
          .kiosk-clock-time {
            font-size: clamp(2rem, 7vw, 3.2rem) !important;
          }
        }

        @media (max-width: 440px) {
          .kiosk-controls-group {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .kiosk-brand-status-text {
            display: none !important;
          }
        }
      `}</style>

      {/* Responsive Top Bar */}
      <div className="kiosk-nav-bar">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/flymedia-logo-white.png"
              alt="Flymedia"
              style={{ height: "26px", objectFit: "contain" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.5px" }}>
                Flymedia Technology
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Attendance Kiosk</span>
                <span className="kiosk-brand-status-text">•</span>
                <span className="kiosk-brand-status-text" style={{ color: "#34d399", display: "inline-flex", alignItems: "center", gap: "3px", fontWeight: 600 }}>
                  <FiCheckCircle style={{ fontSize: "0.75rem" }} /> Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Control Buttons */}
        <div className="kiosk-controls-group">
          {/* Camera Toggle */}
          <button
            onClick={() => setCameraActive(prev => !prev)}
            style={{
              background: cameraActive ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
              border: `1px solid ${cameraActive ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.15)"}`,
              color: cameraActive ? "#34d399" : "#cbd5e1",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.78rem",
              fontWeight: 600
            }}
          >
            <FiCamera />
            {cameraActive ? "Camera ON" : "Camera OFF"}
          </button>

          {/* Switch Camera */}
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
                padding: "6px 10px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "0.78rem"
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
              padding: "6px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.78rem"
            }}
          >
            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>

          {/* Lock Terminal Button */}
          <button
            onClick={handleLockTerminal}
            style={{
              background: "rgba(239, 68, 68, 0.18)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#f87171",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.78rem",
              fontWeight: 600
            }}
            title="Lock Kiosk Terminal"
          >
            <FiLock /> Lock
          </button>
        </div>
      </div>

      {/* Center Main Stage */}
      <div
        style={{
          maxWidth: "800px",
          width: "100%",
          margin: "10px auto",
          textAlign: "center",
          boxSizing: "border-box"
        }}
      >
        {/* Large Digital Clock */}
        <div style={{ marginBottom: "10px" }}>
          <div
            className="kiosk-clock-time"
            style={{
              fontSize: "clamp(2.4rem, 5.5vw, 3.8rem)",
              fontWeight: 800,
              letterSpacing: "-1.5px",
              lineHeight: 1,
              background: "linear-gradient(180deg, #ffffff 40%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 4px 20px rgba(0,0,0,0.5)"
            }}
          >
            {time || "--:--:--"}
          </div>
          <div style={{ fontSize: "0.95rem", color: "#60a5fa", marginTop: "4px", fontWeight: 600 }}>
            {dateStr || "Loading..."}
          </div>
        </div>

        {/* Scan Status Card OR Camera Viewfinder */}
        {lastResult ? (
          <div
            style={{
              background: lastResult.success
                ? lastResult.action === "ALREADY_PUNCHED"
                  ? "rgba(234, 179, 8, 0.18)"
                  : "rgba(16, 185, 129, 0.18)"
                : "rgba(239, 68, 68, 0.18)",
              backdropFilter: "blur(20px)",
              border: `2px solid ${
                lastResult.success
                  ? lastResult.action === "ALREADY_PUNCHED"
                    ? "#eab308"
                    : "#10b981"
                  : "#ef4444"
              }`,
              borderRadius: "18px",
              padding: "18px 22px",
              maxWidth: "420px",
              margin: "0 auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
              animation: "fadeIn 0.3s ease-out",
              boxSizing: "border-box"
            }}
          >
            {lastResult.success ? (
              <div>
                <div style={{ fontSize: "2.6rem", marginBottom: "4px" }}>
                  {lastResult.action === "PUNCH_IN" ? "🟢" : lastResult.action === "PUNCH_OUT" ? "🔴" : "⏳"}
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "2px" }}>
                  {lastResult.employee?.name}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "8px" }}>
                  {lastResult.employee?.department}
                </div>
                <div
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "0.98rem",
                    fontWeight: 700,
                    color: lastResult.action === "PUNCH_IN" ? "#34d399" : "#f87171"
                  }}
                >
                  {lastResult.message}
                </div>
                {lastResult.workHours && (
                  <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#cbd5e1" }}>
                    Total Shift Duration: <strong>{lastResult.workHours}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "2.2rem", color: "#ef4444", marginBottom: "4px" }}>
                  <FiAlertCircle style={{ margin: "0 auto" }} />
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fca5a5" }}>
                  Scan Rejected
                </div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: "4px" }}>
                  {lastResult.message}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "18px",
              padding: "16px 14px",
              maxWidth: "400px",
              margin: "0 auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              boxSizing: "border-box"
            }}
          >
            {/* Live Camera Viewfinder */}
            {cameraActive ? (
              <div>
                <div
                  className="kiosk-camera-view-box"
                  style={{
                    width: "210px",
                    height: "210px",
                    margin: "0 auto 10px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "3px solid #3b82f6",
                    boxShadow: "0 0 25px rgba(59, 130, 246, 0.4)",
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
                      borderRadius: "12px",
                      margin: "16px"
                    }}
                  />
                </div>

                {cameraError && (
                  <div style={{ fontSize: "0.72rem", color: "#f87171", marginBottom: "6px" }}>
                    {cameraError}
                  </div>
                )}

                <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "2px" }}>
                  Hold Card in Front of Camera
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  Or flash your QR code with a USB scanner gun.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "2.8rem", marginBottom: "4px" }}>🪪</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "2px" }}>
                  USB Scanner Ready
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", maxWidth: "280px", margin: "0 auto" }}>
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
                marginTop: "12px",
                display: "flex",
                gap: "6px",
                maxWidth: "280px",
                margin: "12px auto 0"
              }}
            >
              <input
                type="text"
                placeholder="Or enter Card / Emp ID..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.5)",
                  color: "#ffffff",
                  fontSize: "0.8rem"
                }}
              />
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.8rem"
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
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: "8px 14px",
          boxSizing: "border-box"
        }}
      >
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          Live Entrance Logs
        </div>

        {recentLogs.length === 0 ? (
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
            Ready for employee scans today.
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
            {recentLogs.map(log => (
              <div
                key={log.id}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "0.75rem",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>{log.action === "PUNCH_IN" ? "🟢" : "🔴"}</span>
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>{log.name}</div>
                  <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
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
