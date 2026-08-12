"use client";

import ScreenshotsTab from "../../components/ScreenshotsTab";

export default function DeveloperScreenshotsPage() {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Activity Screenshots & Work Logs</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>View real-time screenshots and productivity logs from active agents.</p>
        </div>
      </div>
      
      <div className="rounded-xl border p-4 sm:p-6 shadow-xl" style={{ background: "var(--bg-secondary)", borderColor: "var(--glass-border)" }}>
        {/* Reusing the existing global ScreenshotsTab component */}
        <ScreenshotsTab />
      </div>
    </div>
  );
}
