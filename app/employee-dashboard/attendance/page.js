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

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto" }}>
      <div className="page-section active">
        <AttendanceTab user={user} />
      </div>
    </div>
  );
}
