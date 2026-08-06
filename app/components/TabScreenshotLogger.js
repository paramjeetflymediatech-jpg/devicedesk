"use client";
import React, { useEffect, useRef } from 'react';

export default function TabScreenshotLogger({ user, isPunchedIn, activeShiftId }) {
  const loggerRef = useRef(null);

  // Web Tab fallback capture loop (Native OS Desktop screenshots are handled automatically by DeviceDeskAgent.exe)
  const captureAndUpload = async () => {
    if (!user || user.role === 'Admin' || !isPunchedIn) return;

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

        const base64Image = canvas.toDataURL('image/jpeg', 0.65);
        if (!base64Image) return;

        // Send web tab snapshot to backend API
        await fetch('/api/screenshots/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: user.id || user.employeeId || 'EMP-UNKNOWN',
            employeeName: user.name || user.employeeName || 'Employee',
            department: user.department || 'General',
            shiftId: activeShiftId || null,
            base64Image,
            captureType: 'WEB_TAB',
            systemNumber: user.assignedSystem || user.systemNumber || 'WEB-CLIENT',
            activityScore: 95
          })
        });
      }
    } catch (err) {
      console.warn('Web Tab capture notice:', err.message);
    }
  };

  useEffect(() => {
    if (!user || user.role === 'Admin' || !isPunchedIn) {
      if (loggerRef.current) clearInterval(loggerRef.current);
      return;
    }

    // Initial web tab capture after 6 seconds
    const initialTimer = setTimeout(captureAndUpload, 6000);

    // Periodic capture every 3 minutes (180,000 ms)
    loggerRef.current = setInterval(captureAndUpload, 180000);

    return () => {
      clearTimeout(initialTimer);
      if (loggerRef.current) clearInterval(loggerRef.current);
    };
  }, [user, isPunchedIn, activeShiftId]);

  // Clean UI rendering — no modals, popups, or floating desktop share bars
  return null;
}
