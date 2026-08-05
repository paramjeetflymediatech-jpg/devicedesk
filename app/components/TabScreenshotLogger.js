"use client";
import React, { useState, useEffect, useRef } from 'react';

// Helper function to check if captured canvas is pure black
function isCanvasBlack(canvas, ctx) {
  try {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return true;
    
    // Sample center 20x20 pixels
    const sampleX = Math.floor(w / 2) - 10;
    const sampleY = Math.floor(h / 2) - 10;
    const imgData = ctx.getImageData(Math.max(0, sampleX), Math.max(0, sampleY), 20, 20).data;
    
    let totalBrightness = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      totalBrightness += imgData[i] + imgData[i + 1] + imgData[i + 2];
    }
    return totalBrightness < 50; // Pure black image threshold
  } catch (e) {
    return false;
  }
}

export default function TabScreenshotLogger({ user, isPunchedIn, activeShiftId }) {
  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const mediaStreamRef = useRef(null);
  const videoElementRef = useRef(null);
  const loggerRef = useRef(null);
  const bufferIntervalRef = useRef(null);
  const latestDesktopFrameRef = useRef(null);

  // Initialize off-screen GPU-active video element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '640px';
      video.style.height = '360px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);
      videoElementRef.current = video;

      return () => {
        if (video.parentNode) video.parentNode.removeChild(video);
      };
    }
  }, []);

  // Auto-prompt modal if desktop stream is not active
  useEffect(() => {
    if (user && user.role !== 'Admin' && isPunchedIn && !streamActive) {
      const wasRequested = sessionStorage.getItem('devicedesk_desktop_stream_requested');
      const timer = setTimeout(() => {
        if (!streamActive) setPromptModalOpen(true);
      }, wasRequested ? 1000 : 2500);
      return () => clearTimeout(timer);
    }
  }, [user, isPunchedIn, streamActive]);

  // Continuously buffer active GPU desktop frames into latestDesktopFrameRef
  useEffect(() => {
    if (streamActive && mediaStreamRef.current) {
      bufferIntervalRef.current = setInterval(async () => {
        try {
          const track = mediaStreamRef.current?.getVideoTracks()[0];
          if (!track || track.readyState !== 'live') return;

          let frameData = null;

          // Method 1: ImageCapture API
          if (typeof window !== 'undefined' && 'ImageCapture' in window) {
            try {
              const imageCapture = new window.ImageCapture(track);
              const bitmap = await imageCapture.grabFrame();
              const canvas = document.createElement('canvas');
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

              if (!isCanvasBlack(canvas, ctx)) {
                frameData = canvas.toDataURL('image/jpeg', 0.75);
              }
            } catch (e) { /* ignore */ }
          }

          // Method 2: Video Element Canvas
          if (!frameData && videoElementRef.current) {
            const video = videoElementRef.current;
            if (video.readyState >= 2 && video.videoWidth > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              if (!isCanvasBlack(canvas, ctx)) {
                frameData = canvas.toDataURL('image/jpeg', 0.75);
              }
            }
          }

          if (frameData) {
            latestDesktopFrameRef.current = frameData;
          }
        } catch (err) {
          console.warn('Frame buffer warning:', err);
        }
      }, 2000); // Buffer every 2 seconds
    } else {
      if (bufferIntervalRef.current) clearInterval(bufferIntervalRef.current);
    }

    return () => {
      if (bufferIntervalRef.current) clearInterval(bufferIntervalRef.current);
    };
  }, [streamActive]);

  // Request Full OS Desktop Monitor Stream (Captures all tabs, taskbar, external windows)
  const requestDesktopStream = async () => {
    setStreamError('');
    setPromptModalOpen(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setStreamError('Screen Capture API is not supported on this browser.');
        return false;
      }

      sessionStorage.setItem('devicedesk_desktop_stream_requested', 'true');

      // Prompt browser for ENTIRE MONITOR SCREEN (Tabs, Taskbar, External Apps)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always'
        },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        try {
          await videoElementRef.current.play();
        } catch (e) {
          console.warn('Video play notice:', e);
        }
      }

      // Handle user stopping screen share from browser banner
      stream.getVideoTracks()[0].onended = () => {
        setStreamActive(false);
        mediaStreamRef.current = null;
        latestDesktopFrameRef.current = null;
      };

      setStreamActive(true);
      // Immediately take a capture upon starting full desktop stream
      setTimeout(captureAndUpload, 1500);
      return true;

    } catch (err) {
      console.warn('Desktop Screen share request cancelled/failed:', err);
      setStreamError('Full Desktop Capture not permitted.');
      setStreamActive(false);
      return false;
    }
  };

  // Capture frame function
  const captureAndUpload = async () => {
    if (!user || user.role === 'Admin' || !isPunchedIn) return;

    let base64Image = null;
    let captureType = 'WEB_TAB';

    // 1. Use Full OS Desktop Capture from stream buffer if stream is active
    if (streamActive && latestDesktopFrameRef.current) {
      base64Image = latestDesktopFrameRef.current;
      captureType = 'FULL_DESKTOP';
    }

    // 2. Fallback to Web Tab capture ONLY IF full desktop stream was never requested
    if (!base64Image && !sessionStorage.getItem('devicedesk_desktop_stream_requested')) {
      try {
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule.default || html2canvasModule;
        const targetElement = document.body;
        if (targetElement && html2canvas) {
          const canvas = await html2canvas(targetElement, {
            scale: 0.6,
            useCORS: true,
            logging: false,
            ignoreElements: (element) => element.classList?.contains('no-screen-capture')
          });
          base64Image = canvas.toDataURL('image/jpeg', 0.65);
          captureType = 'WEB_TAB';
        }
      } catch (err) {
        console.warn('Web Tab capture fallback error:', err);
      }
    }

    if (!base64Image) return;

    // Send payload to backend API
    try {
      await fetch('/api/screenshots/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id || user.employeeId || 'EMP-UNKNOWN',
          employeeName: user.name || user.employeeName || 'Employee',
          department: user.department || 'General',
          shiftId: activeShiftId || null,
          base64Image,
          captureType,
          systemNumber: user.assignedSystem || user.systemNumber || 'DESKTOP-CLIENT',
          activityScore: 95
        })
      });
    } catch (uploadErr) {
      console.warn('Screenshot upload API error:', uploadErr);
    }
  };

  // Main Effect loop
  useEffect(() => {
    if (!user || user.role === 'Admin' || !isPunchedIn) {
      if (loggerRef.current) clearInterval(loggerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
        setStreamActive(false);
      }
      return;
    }

    // Initial capture after 6 seconds
    const initialTimer = setTimeout(captureAndUpload, 6000);

    // Periodic capture every 3 minutes (180,000 ms)
    loggerRef.current = setInterval(captureAndUpload, 180000);

    return () => {
      clearTimeout(initialTimer);
      if (loggerRef.current) clearInterval(loggerRef.current);
    };
  }, [user, isPunchedIn, activeShiftId, streamActive]);

  if (!user || user.role === 'Admin' || !isPunchedIn) return null;

  return (
    <>
      {/* Auto Prompt Modal for Full Desktop Stream */}
      {promptModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💻</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
              Full Desktop & Browser Tabs Screen Logger
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '20px' }}>
              To capture your <strong>entire computer screen</strong> (all browser tabs, address bar, taskbar, and external applications), please click <strong>"Start Desktop Share"</strong> and select <strong>"Entire Screen"</strong>.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={requestDesktopStream}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
                }}
              >
                Start Desktop Share 💻
              </button>

              <button
                onClick={() => setPromptModalOpen(false)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Remind Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Widget */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 99999,
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: streamActive ? '2px solid #16a34a' : '2px solid #ef4444',
        borderRadius: '30px',
        padding: '8px 16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.82rem',
        fontWeight: '700',
        color: 'var(--text-primary, #0f172a)'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: streamActive ? '#16a34a' : '#ef4444',
          boxShadow: streamActive ? '0 0 8px #16a34a' : '0 0 8px #ef4444'
        }} />

        <span>
          {streamActive ? '💻 Full Desktop Monitoring Active' : '⚠️ Desktop Stream Paused'}
        </span>

        {!streamActive && (
          <button
            onClick={requestDesktopStream}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '16px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(220,38,38,0.4)'
            }}
          >
            Enable Desktop Share 💻
          </button>
        )}
      </div>
    </>
  );
}
