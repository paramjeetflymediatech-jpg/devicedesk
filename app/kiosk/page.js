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
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function AttendanceKioskPage() {
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
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
        // On failed scan, clear throttle lock after 1.2s so user can re-align screen and try again immediately
        setTimeout(() => {
          lastScannedCodeRef.current = "";
        }, 1200);
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
      setTimeout(() => {
        lastScannedCodeRef.current = "";
      }, 1200);
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
    let isMounted = true;

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (e) {
          console.warn("Camera stop warning:", e);
        }
        scannerRef.current = null;
      }
    };

    if (authStatus !== "unlocked" || !cameraActive) {
      stopScanner();
      return;
    }

    const startScanner = async () => {
      setCameraError("");
      try {
        const availableDevices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!availableDevices || availableDevices.length === 0) {
          setCameraError("No webcam found on this device.");
          setIsSwitchingCamera(false);
          return;
        }

        setCameras(availableDevices);

        // Determine device to use
        let deviceToUse = selectedCameraId;
        const exists = availableDevices.some((c) => c.id === selectedCameraId);
        if (!exists) {
          deviceToUse = availableDevices[0].id;
          setSelectedCameraId(availableDevices[0].id);
        }

        // Cleanly stop any existing scanner before starting a new one
        await stopScanner();
        if (!isMounted) return;

        // Create scanner instance with high-performance QR-only options
        const qrFormat = typeof Html5QrcodeSupportedFormats !== "undefined" && Html5QrcodeSupportedFormats.QR_CODE !== undefined
          ? Html5QrcodeSupportedFormats.QR_CODE
          : 0;

        const scanner = new Html5Qrcode("kiosk-camera-reader", {
          formatsToSupport: [qrFormat],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
        scannerRef.current = scanner;

        // High responsiveness & large scan area (90% box for easy capture of phone/laptop screens)
        const config = {
          fps: 24,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(160, Math.floor(minEdge * 0.90));
            return { width: edgeSize, height: edgeSize };
          },
          videoConstraints: {
            deviceId: { exact: deviceToUse },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            focusMode: "continuous",
            advanced: [{ focusMode: "continuous" }]
          }
        };

        await scanner.start(
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
      } finally {
        if (isMounted) {
          setIsSwitchingCamera(false);
        }
      }
    };

    const timer = setTimeout(startScanner, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [authStatus, cameraActive, selectedCameraId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // =========================================================================
  // VIEW 1: LOADING STATE
  // =========================================================================
  if (authStatus === "checking") {
    return (
      <div
        className="fixed inset-0 w-full h-full z-50 flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(2, 6, 23, 0.9) 100%), url('/kiosk-bg.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      >
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 text-center shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
          <div className="text-4xl mb-3 animate-spin">🔄</div>
          <div className="text-base sm:text-lg font-bold text-white">Verifying Terminal Security...</div>
          <div className="text-xs text-slate-400 mt-1">Checking office network & device credentials</div>
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
        className="fixed inset-0 w-full h-full overflow-y-auto z-50 flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(2, 6, 23, 0.9) 100%), url('/kiosk-bg.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      >
        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl border-2 border-red-500 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(239,68,68,0.3)] text-center my-auto">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-2xl mx-auto mb-3 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <FiShield />
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-red-400 mb-1.5">
            Office Network Required
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
            This Attendance Kiosk is restricted to the office Wi-Fi network. Scanning attendance outside the office is not permitted.
          </p>

          <div className="bg-black/50 border border-white/10 rounded-xl p-3 mb-4 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Detected IP:</span>
              <span className="font-mono font-bold text-red-300">{clientIp || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="font-semibold text-red-400">Outside Office Range</span>
            </div>
          </div>

          <button
            type="button"
            onClick={verifyKioskSecurity}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-98"
          >
            <FiRefreshCw /> Refresh & Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ADMIN KIOSK PIN LOCK SCREEN
  // =========================================================================
  if (authStatus === "locked") {
    return (
      <div
        className="fixed inset-0 w-full h-full overflow-y-auto z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950 text-slate-100 font-sans select-none"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(2, 6, 23, 0.9) 100%), url('/kiosk-bg.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      >
        <div className="max-w-[340px] w-full bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-5 text-center shadow-2xl my-auto">
          {/* Top Brand Pill */}
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full mb-2 border border-white/10 text-[10px] font-bold tracking-wider text-slate-200">
            <span>🪪</span>
            <span>FLYMEDIA TECHNOLOGY</span>
          </div>

          {/* Header Title with Small Glow Lock */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-[0_0_10px_rgba(37,99,235,0.6)]">
              <FiLock />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Entrance Terminal Locked
            </h2>
          </div>

          <p className="text-[11px] text-slate-400 mb-2.5">
            Enter Admin PIN to unlock scanning on this office terminal
          </p>

          {/* PIN Indicator Dots */}
          <div className="flex justify-center gap-2.5 mb-2.5">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full border-2 border-blue-500 transition-all ${
                  pinInput.length > idx ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-transparent"
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {pinError && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl py-1 px-2 text-xs mb-2 font-semibold">
              {pinError}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5 max-w-[210px] mx-auto mb-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
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
                className="py-2 text-base font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPinInput("")}
              className="py-2 text-[11px] font-semibold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 transition-all active:scale-95 cursor-pointer"
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
              className="py-2 text-base font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={() => setPinInput((prev) => prev.slice(0, -1))}
              className="py-2 text-sm font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
            >
              <FiDelete />
            </button>
          </div>

          {/* Unlock Submit Button */}
          <button
            type="button"
            onClick={() => handleUnlockWithPin()}
            disabled={isVerifyingPin || !pinInput}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${
              pinInput
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer"
                : "bg-blue-600/30 text-slate-400 cursor-not-allowed"
            }`}
          >
            <FiUnlock /> {isVerifyingPin ? "Verifying..." : "Unlock Terminal"}
          </button>

          <div className="mt-1.5 text-[10px] text-slate-500">
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
      className="fixed inset-0 w-full h-full min-h-screen overflow-y-auto overflow-x-hidden z-50 flex flex-col justify-between p-2.5 sm:p-5 text-slate-100 font-sans select-none box-border"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(2, 6, 23, 0.88) 100%), url('/kiosk-bg.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat"
      }}
    >
      <style>{`
        #kiosk-camera-reader {
          border: none !important;
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
        }
        #kiosk-camera-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 14px !important;
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
        @keyframes scanLaser {
          0% { top: 6%; opacity: 0.8; }
          50% { top: 92%; opacity: 1; }
          100% { top: 6%; opacity: 0.8; }
        }
        .scan-laser-line {
          position: absolute;
          left: 6%;
          right: 6%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf8, #60a5fa, #38bdf8, transparent);
          box-shadow: 0 0 12px #38bdf8, 0 0 4px #60a5fa;
          animation: scanLaser 2.2s ease-in-out infinite;
          pointer-events: none;
          z-index: 10;
        }
      `}</style>

      {/* Responsive Top Bar */}
      <header className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 sm:px-5 sm:py-3 shadow-2xl shrink-0">
        {/* Left: Brand Identity */}
        <div className="flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
          <img
            src="/flymedia-logo-white.png"
            alt="Flymedia"
            className="h-6 sm:h-7 object-contain shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="text-left min-w-0">
            <div className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
              Flymedia Technology
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400">
              <span className="truncate">Attendance Kiosk</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 shrink-0">
                <FiCheckCircle className="text-xs" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls (Camera Toggle, Switch, Fullscreen, Lock) */}
        <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">
          {/* Camera Toggle */}
          <button
            type="button"
            onClick={() => setCameraActive((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              cameraActive
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            <FiCamera className="text-sm shrink-0" />
            <span>{cameraActive ? "Camera ON" : "Camera OFF"}</span>
          </button>

          {/* Switch Camera */}
          {cameraActive && cameras.length > 1 && (
            <button
              type="button"
              disabled={isSwitchingCamera}
              onClick={() => {
                if (cameras.length <= 1 || isSwitchingCamera) return;
                setIsSwitchingCamera(true);
                const currentIdx = cameras.findIndex((c) => c.id === selectedCameraId);
                const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % cameras.length : 1;
                setSelectedCameraId(cameras[nextIdx].id);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
              title="Flip / Switch Camera"
            >
              <FiRefreshCw className={`text-sm shrink-0 ${isSwitchingCamera ? "animate-spin text-cyan-400" : ""}`} />
              <span>{isSwitchingCamera ? "Flipping..." : "Flip"}</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <FiMinimize className="text-sm shrink-0" /> : <FiMaximize className="text-sm shrink-0" />}
            <span className="hidden xs:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>

          {/* Lock Terminal */}
          <button
            type="button"
            onClick={handleLockTerminal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/20 border border-red-500/35 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
            title="Lock Kiosk Terminal"
          >
            <FiLock className="text-sm shrink-0" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Center Main Stage */}
      <main className="w-full max-w-md mx-auto my-auto flex flex-col items-center justify-center text-center py-2 sm:py-4">
        {/* Large Digital Clock */}
        <div className="mb-2 sm:mb-3">
          <div className="text-3xl sm:text-5xl font-black tracking-tight leading-none bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-md">
            {time || "--:--:--"}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-blue-400 mt-1 sm:mt-1.5 tracking-wide">
            {dateStr || "Loading..."}
          </div>
        </div>

        {/* Scan Status Card OR Camera Viewfinder */}
        {lastResult ? (
          <div
            className={`w-full rounded-2xl p-4 sm:p-5 backdrop-blur-2xl border-2 shadow-2xl transition-all duration-300 box-border ${
              lastResult.success
                ? lastResult.action === "ALREADY_PUNCHED"
                  ? "bg-amber-500/20 border-amber-500"
                  : "bg-emerald-500/20 border-emerald-500"
                : "bg-red-500/20 border-red-500"
            }`}
          >
            {lastResult.success ? (
              <div>
                <div className="text-3xl sm:text-4xl mb-1">
                  {lastResult.action === "PUNCH_IN" ? "🟢" : lastResult.action === "PUNCH_OUT" ? "🔴" : "⏳"}
                </div>
                <div className="text-lg sm:text-xl font-black text-white">
                  {lastResult.employee?.name}
                </div>
                <div className="text-xs text-slate-300 mb-2">
                  {lastResult.employee?.department}
                </div>
                <div
                  className={`p-2 rounded-xl text-sm sm:text-base font-bold bg-black/50 ${
                    lastResult.action === "PUNCH_IN" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {lastResult.message}
                </div>
                {lastResult.workHours && (
                  <div className="mt-1.5 text-xs text-slate-300">
                    Total Shift Duration: <strong>{lastResult.workHours}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-3xl sm:text-4xl text-red-500 mb-1">
                  <FiAlertCircle className="mx-auto" />
                </div>
                <div className="text-base sm:text-lg font-bold text-red-300">
                  Scan Rejected
                </div>
                <div className="text-xs text-slate-200 mt-1">
                  {lastResult.message}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 sm:p-5 shadow-2xl box-border">
            {/* Live Camera Viewfinder */}
            {cameraActive ? (
              <div className="flex flex-col items-center">
                <div className="w-[210px] h-[210px] sm:w-[260px] sm:h-[260px] rounded-2xl overflow-hidden border-2 sm:border-3 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.45)] relative bg-black shrink-0 mx-auto">
                  <div id="kiosk-camera-reader" className="w-full h-full" />
                  
                  {/* Active Laser Scanning Beam */}
                  {!isProcessing && !isSwitchingCamera && !cameraError && (
                    <div className="scan-laser-line" />
                  )}

                  {/* Corner Target Markers */}
                  <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-xl m-2.5 z-10" />

                  {/* Processing Overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
                      <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-cyan-300">Processing Scan...</span>
                    </div>
                  )}

                  {/* Switching Camera Overlay */}
                  {isSwitchingCamera && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
                      <FiRefreshCw className="text-2xl text-blue-400 animate-spin" />
                      <span className="text-xs font-semibold text-slate-300">Switching Camera...</span>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="text-xs text-red-400 mt-1.5 font-medium">
                    {cameraError}
                  </div>
                )}

                <div className="text-xs sm:text-sm font-bold text-white mt-2">
                  Hold Card or Phone/Screen in Front of Camera
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400">
                  Aim QR code into viewfinder or use USB scanner gun.
                </div>
              </div>
            ) : (
              <div className="py-2 sm:py-4">
                <div className="text-3xl sm:text-4xl mb-1">🪪</div>
                <div className="text-sm sm:text-base font-bold text-white mb-0.5">
                  USB Scanner Ready
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
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
              className="mt-2.5 sm:mt-3 flex gap-1.5 max-w-xs w-full mx-auto"
            >
              <input
                type="text"
                placeholder="Or enter Card / Emp ID..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs sm:text-sm bg-black/50 border border-white/15 rounded-xl text-white placeholder-slate-400 outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
              >
                {isProcessing ? "..." : "Scan"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Live Activity Ticker */}
      <footer className="w-full max-w-4xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 sm:px-4 sm:py-2.5 shadow-xl shrink-0">
        <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Live Entrance Logs</span>
          {recentLogs.length > 0 && (
            <span className="text-slate-500 lowercase font-normal">{recentLogs.length} recent</span>
          )}
        </div>

        {recentLogs.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-0.5">
            Ready for employee scans today.
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs shrink-0"
              >
                <span>{log.action === "PUNCH_IN" ? "🟢" : "🔴"}</span>
                <div className="text-left">
                  <div className="font-semibold text-slate-100">{log.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {log.action === "PUNCH_IN" ? "Checked In" : "Checked Out"} at {log.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
