"use client";

import { FiRefreshCcw } from "react-icons/fi";
import { useDeveloper } from "../DeveloperContext";

export default function LogsPage() {
  const { logs, loading, fetchData } = useDeveloper();

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Agent Activity Logs</h1>
        <button 
          onClick={fetchData} 
          className="px-4 py-2 rounded-lg flex items-center gap-2 border-none cursor-pointer font-semibold transition-colors w-full sm:w-auto justify-center"
          style={{ background: "var(--accent-cyan)", color: "#fff" }}
        >
          <FiRefreshCcw /> Refresh Data
        </button>
      </div>

      <div className="rounded-xl border p-4 sm:p-6 shadow-xl" style={{ background: "var(--bg-secondary)", borderColor: "var(--glass-border)" }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>No agent logs available yet.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {logs.map(log => (
              <div key={log.id} className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-4 rounded-lg border-l-4 transition-colors"
                style={{ background: "rgba(128,128,128,0.05)", borderLeftColor: "var(--accent-cyan)" }}>
                <div className="sm:min-w-[160px] text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>{log.employeeName}</span> 
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>({log.employeeId})</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold ml-auto sm:ml-2"
                      style={{ background: "var(--accent-cyan)", color: "#fff" }}>
                      {log.action}
                    </span>
                  </div>
                  <p className="text-sm m-0 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
