"use client";

import { useState } from "react";
import { FiRefreshCcw, FiSearch } from "react-icons/fi";
import { useDeveloper } from "../DeveloperContext";
import Pagination from "../../components/Pagination";

export default function LogsPage() {
  const { logs, loading, fetchData } = useDeveloper();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredLogs = (logs || []).filter(log => {
    const q = search.toLowerCase();
    const name = String(log.employeeName || "").toLowerCase();
    const empId = String(log.employeeId || "").toLowerCase();
    const action = String(log.action || "").toLowerCase();
    const details = String(log.details || "").toLowerCase();
    return name.includes(q) || empId.includes(q) || action.includes(q) || details.includes(q);
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedLogs = filteredLogs.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Agent Activity Logs</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Real-time event stream from desktop client agents</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)"
              }}
            />
          </div>
          <button 
            onClick={fetchData} 
            className="px-4 py-2 rounded-lg flex items-center gap-2 border-none cursor-pointer font-semibold transition-colors justify-center"
            style={{ background: "var(--accent-cyan)", color: "#fff" }}
          >
            <FiRefreshCcw /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-4 sm:p-6 shadow-xl" style={{ background: "var(--bg-secondary)", borderColor: "var(--glass-border)" }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
            {search ? "No logs matching search criteria." : "No agent logs available yet."}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {paginatedLogs.map(log => (
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

            <div style={{ marginTop: "1rem" }}>
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={filteredLogs.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                itemName="logs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
