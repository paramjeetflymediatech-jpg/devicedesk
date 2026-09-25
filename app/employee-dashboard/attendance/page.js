"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import AttendanceTab from "../../components/AttendanceTab.js";

export default function AttendancePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  const dbRoleStr = (user?.dbRole || '').toLowerCase().trim();
  const deptStr = (user?.department || '').toLowerCase().trim();
  const isDnsManager = dbRoleStr === 'dns manager' || deptStr === 'dns manager';

  if (isDnsManager) {
    return (
      <div className="page-container emp-container" style={{ overflowY: "auto", padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Attendance tracking is not applicable for the DNS Manager role.</p>
      </div>
    );
  }

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto" }}>
      <div className="page-section active">
        <AttendanceTab user={user} mode="personal" />
      </div>
    </div>
  );
}
