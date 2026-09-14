'use client';
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import AttendanceTab from "../../components/AttendanceTab.js";

export default function AdminAttendancePage() {
  const { user } = useAuth();

  return (
    <div style={{ paddingBottom: "2rem" }}>
      <AttendanceTab user={user} />
    </div>
  );
}

