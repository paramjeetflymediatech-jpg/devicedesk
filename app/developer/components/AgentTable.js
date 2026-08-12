"use client";

import { FiTrash2 } from "react-icons/fi";
import { useDeveloper } from "../DeveloperContext";

export default function AgentTable({ agents, title, hideActions = false }) {
  const { loading, handleDelete, fetchData } = useDeveloper();

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold capitalize" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>
        <button 
          onClick={fetchData} 
          className="px-4 py-2 rounded-lg flex items-center gap-2 border-none cursor-pointer font-semibold transition-colors w-full sm:w-auto justify-center"
          style={{ background: "var(--accent-cyan)", color: "#fff" }}
        >
          Refresh Data
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden overflow-x-auto w-full shadow-xl" style={{ background: "var(--bg-secondary)", borderColor: "var(--glass-border)" }}>
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead style={{ background: "rgba(128,128,128,0.1)", color: "var(--text-muted)" }} className="text-sm">
            <tr>
              <th className="p-4 font-medium">Employee</th>
              <th className="p-4 font-medium">System / Platform</th>
              <th className="p-4 font-medium">IP Address</th>
              <th className="p-4 font-medium">Last Seen / Status</th>
              {!hideActions && <th className="p-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ divideColor: "var(--glass-border)" }}>
            {loading ? (
              <tr><td colSpan={hideActions ? "4" : "5"} className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : agents.length === 0 ? (
              <tr><td colSpan={hideActions ? "4" : "5"} className="p-8 text-center" style={{ color: "var(--text-muted)" }}>No agents found for this filter.</td></tr>
            ) : agents.map(agent => (
              <tr key={agent.id} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ borderTop: "1px solid var(--glass-border)" }}>
                <td className="p-4">
                  <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{agent.employeeName}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{agent.employeeId}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium" style={{ color: "var(--text-primary)" }}>{agent.systemNumber}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--status-resolved)" }}>{agent.osPlatform}</div>
                </td>
                <td className="p-4 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{agent.ipAddress}</td>
                <td className="p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <div>{new Date(agent.lastSeenAt).toLocaleString()}</div>
                  {agent.status && agent.status !== 'ACTIVE' && (
                    <div className="mt-1 font-semibold text-xs" style={{ color: "var(--status-critical)" }}>{agent.status}</div>
                  )}
                </td>
                {!hideActions && (
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(agent.id, agent.employeeName)}
                      className="px-3 py-1.5 border rounded-md cursor-pointer inline-flex items-center gap-1.5 transition-colors font-medium text-sm hover:bg-red-500/10"
                      style={{ color: "var(--status-critical)", borderColor: "var(--status-critical)", background: "transparent" }}
                    >
                      <FiTrash2 size={14} /> Kill
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
