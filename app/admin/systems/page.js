'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiMonitor, FiLink, FiArrowLeft, FiPlus, FiCpu, FiHardDrive, FiSearch } from "react-icons/fi";
import { getSystems, getEmployees } from "../../store.js";
import { getSystemSlug, getEmployeeSlug } from "../../utils/slugUtils.js";
import Pagination from "../../components/Pagination.js";

export default function AdminSystemsPage() {
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setSystems(getSystems());
    setEmployees(getEmployees());
  }, []);

  const filteredSystems = systems.filter((sys) => {
    const sysSlug = getSystemSlug(sys).toLowerCase();
    const sysNum = (sys.systemNumber || sys.id || "").toLowerCase();
    const cpu = (sys.cpu || "").toLowerCase();
    const assigned = employees.find((e) => e.id === sys.assignedTo);
    const assignedName = (assigned ? assigned.name : "").toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = sysSlug.includes(q) || sysNum.includes(q) || cpu.includes(q) || assignedName.includes(q);
    const matchesStatus = statusFilter === "All" || (sys.status || "Active").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSystems.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSystems = filteredSystems.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiMonitor style={{ color: "var(--accent-cyan, #06b6d4)" }} /> Hardware Fleet Management
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              Manage systems, hardware specifications, and system routing slugs.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          marginBottom: "1.5rem", 
          background: "rgba(255, 255, 255, 0.02)", 
          padding: "1rem", 
          borderRadius: "12px", 
          border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <div style={{ position: "relative", flex: "1", minWidth: "260px" }}>
            <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }} />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search by system number, slug, CPU, or assigned employee..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: "36px", width: "100%", height: "40px" }}
            />
          </div>
          <select 
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ minWidth: "140px", height: "40px" }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={{ padding: "14px 16px" }}>System Number</th>
                <th style={{ padding: "14px 16px" }}>System Slug</th>
                <th style={{ padding: "14px 16px" }}>Processor / CPU</th>
                <th style={{ padding: "14px 16px" }}>Memory & Storage</th>
                <th style={{ padding: "14px 16px" }}>Assigned To</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSystems.map((sys) => {
                const sysSlug = getSystemSlug(sys);
                const assigned = employees.find((e) => e.id === sys.assignedTo);
                const empSlug = assigned ? getEmployeeSlug(assigned) : "";

                return (
                  <tr key={sys.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                      <Link href={`/admin/systems/${sysSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none" }}>
                        {sys.systemNumber || sys.id}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/admin/systems/${sysSlug}`}
                        className="timer-badge"
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--accent-purple, #a855f7)",
                          borderColor: "rgba(168, 85, 247, 0.4)",
                          background: "rgba(168, 85, 247, 0.08)",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <FiLink style={{ fontSize: "0.65rem" }} /> @{sysSlug}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
                      {sys.cpu || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>
                      {sys.ram || "N/A"} / {sys.storage || "N/A"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {assigned ? (
                        <Link href={`/admin/users/${empSlug}`} style={{ color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
                          {assigned.name}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-muted, #64748b)", fontSize: "0.85rem" }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`status-tag ${sys.status === "Active" ? "resolved" : "open"}`} style={{ fontSize: "0.75rem" }}>
                        {sys.status || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link href={`/admin/systems/${sysSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredSystems.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    No systems found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredSystems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="systems"
        />
      </div>
    </div>
  );
}
