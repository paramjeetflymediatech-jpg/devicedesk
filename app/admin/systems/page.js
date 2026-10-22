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
    <div className="w-full max-w-full font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-cyan,#06b6d4)] hover:underline mb-2">
              <FiArrowLeft /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary,#f8fafc)] flex items-center gap-3">
              <FiMonitor className="text-[var(--accent-cyan,#06b6d4)]" /> Hardware Fleet Management
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary,#94a3b8)] mt-1">
              Manage systems, hardware specifications, and system routing slugs ({filteredSystems.length} machines).
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-[var(--glass-border,rgba(255,255,255,0.08))]">
          <div className="relative flex-1 min-w-0">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted,#64748b)]" />
            <input 
              type="text" 
              className="form-control w-full pl-10 pr-4 h-10 text-sm rounded-lg bg-[var(--bg-tertiary,#1e293b)] text-[var(--text-primary,#f8fafc)] border border-[var(--glass-border,rgba(255,255,255,0.1))]"
              placeholder="Search by system number, slug, CPU, or assigned employee..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select 
            className="form-control w-full sm:w-44 h-10 text-sm rounded-lg px-3 bg-[var(--bg-tertiary,#1e293b)] text-[var(--text-primary,#f8fafc)] border border-[var(--glass-border,rgba(255,255,255,0.1))]"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        {/* Mobile View: Cards */}
        <div className="block md:hidden space-y-3">
          {paginatedSystems.map((sys) => {
            const sysSlug = getSystemSlug(sys);
            const assigned = employees.find((e) => e.id === sys.assignedTo);
            const empSlug = assigned ? getEmployeeSlug(assigned) : "";

            return (
              <div 
                key={sys.id} 
                className="p-4 rounded-xl bg-white/[0.03] border border-[var(--glass-border,rgba(255,255,255,0.08))] space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <Link href={`/admin/systems/${sysSlug}`} className="text-base font-bold text-[var(--text-primary,#f8fafc)] hover:text-[var(--accent-cyan,#06b6d4)]">
                      {sys.systemNumber || sys.id}
                    </Link>
                    <div className="mt-1">
                      <Link
                        href={`/admin/systems/${sysSlug}`}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold text-[var(--accent-purple,#a855f7)] bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)]"
                      >
                        <FiLink className="text-[10px]" /> @{sysSlug}
                      </Link>
                    </div>
                  </div>
                  <span className={`status-tag ${sys.status === "Active" ? "resolved" : "open"} text-xs px-2.5 py-1 rounded-full`}>
                    {sys.status || "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/[0.06]">
                  <div className="space-y-0.5">
                    <span className="text-[var(--text-muted,#64748b)] flex items-center gap-1">
                      <FiCpu className="text-[11px]" /> CPU
                    </span>
                    <span className="font-medium text-[var(--text-secondary,#94a3b8)] truncate block">
                      {sys.cpu || "—"}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[var(--text-muted,#64748b)] flex items-center gap-1">
                      <FiHardDrive className="text-[11px]" /> RAM / Storage
                    </span>
                    <span className="font-medium text-[var(--text-secondary,#94a3b8)] truncate block">
                      {sys.ram || "N/A"} / {sys.storage || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                  <div className="text-xs">
                    <span className="text-[var(--text-muted,#64748b)] block text-[11px]">Assigned To</span>
                    {assigned ? (
                      <Link href={`/admin/users/${empSlug}`} className="text-[var(--accent-cyan,#06b6d4)] font-semibold hover:underline">
                        {assigned.name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-muted,#64748b)]">Unassigned</span>
                    )}
                  </div>
                  <Link 
                    href={`/admin/systems/${sysSlug}`} 
                    className="btn-action start text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                  >
                    Details &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
          {filteredSystems.length === 0 && (
            <div className="text-center py-10 text-[var(--text-muted)] bg-white/[0.02] rounded-xl border border-[var(--glass-border)]">
              No systems found matching criteria.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block rounded-xl border border-[var(--glass-border,rgba(255,255,255,0.1))] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="custom-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.04] text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary,#94a3b8)] border-b border-white/[0.08]">
                  <th className="py-3.5 px-4">System Number</th>
                  <th className="py-3.5 px-4">System Slug</th>
                  <th className="py-3.5 px-4">Processor / CPU</th>
                  <th className="py-3.5 px-4">Memory & Storage</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {paginatedSystems.map((sys) => {
                  const sysSlug = getSystemSlug(sys);
                  const assigned = employees.find((e) => e.id === sys.assignedTo);
                  const empSlug = assigned ? getEmployeeSlug(assigned) : "";

                  return (
                    <tr key={sys.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[var(--text-primary,#f8fafc)] whitespace-nowrap">
                        <Link href={`/admin/systems/${sysSlug}`} className="hover:text-[var(--accent-cyan,#06b6d4)]">
                          {sys.systemNumber || sys.id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          href={`/admin/systems/${sysSlug}`}
                          className="timer-badge text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold text-[var(--accent-purple,#a855f7)] bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.4)]"
                        >
                          <FiLink className="text-[10px]" /> @{sysSlug}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--text-secondary,#94a3b8)] max-w-xs truncate">
                        {sys.cpu || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--text-secondary,#94a3b8)] whitespace-nowrap">
                        {sys.ram || "N/A"} / {sys.storage || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {assigned ? (
                          <Link href={`/admin/users/${empSlug}`} className="text-[var(--accent-cyan,#06b6d4)] text-xs font-semibold hover:underline">
                            {assigned.name}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-muted,#64748b)] text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`status-tag ${sys.status === "Active" ? "resolved" : "open"} text-xs px-2.5 py-1 rounded-full`}>
                          {sys.status || "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link href={`/admin/systems/${sysSlug}`} className="btn-action start text-xs px-3 py-1 rounded-md">
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filteredSystems.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[var(--text-muted)]">
                      No systems found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
