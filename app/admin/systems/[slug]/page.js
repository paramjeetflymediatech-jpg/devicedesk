'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiMonitor, FiArrowLeft, FiCpu, FiHardDrive, FiUser, FiLink, FiLayers, FiActivity } from "react-icons/fi";
import { getSystems, getEmployees, getTickets } from "../../../store.js";
import { findSystemBySlug, getSystemSlug, getEmployeeSlug } from "../../../utils/slugUtils.js";

export default function AdminSingleSystemPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [system, setSystem] = useState(null);
  const [assignedEmp, setAssignedEmp] = useState(null);
  const [systemTickets, setSystemTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allSystems = getSystems();
    const found = findSystemBySlug(allSystems, slug);
    setSystem(found);

    if (found) {
      const allEmps = getEmployees();
      const emp = allEmps.find((e) => e.id === found.assignedTo);
      setAssignedEmp(emp);

      const allTickets = getTickets();
      const tkts = allTickets.filter((t) => t.systemId === found.id || t.systemNumber === found.systemNumber);
      setSystemTickets(tkts);
    }
    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-[var(--text-secondary,#94a3b8)] text-sm">
        Loading System Details...
      </div>
    );
  }

  if (!system) {
    return (
      <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold text-[var(--text-primary,#f8fafc)]">Hardware System Not Found</h2>
        <p className="text-sm text-[var(--text-secondary,#94a3b8)]">No machine matching slug &quot;{slug}&quot; was found.</p>
        <Link href="/admin/systems" className="btn-primary inline-block text-xs px-4 py-2 rounded-lg">
          Back to Fleet
        </Link>
      </div>
    );
  }

  const sysSlug = getSystemSlug(system);
  const empSlug = assignedEmp ? getEmployeeSlug(assignedEmp) : "";

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link 
            href="/admin/systems" 
            className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-cyan,#06b6d4)] hover:underline mb-2"
          >
            <FiArrowLeft /> All Hardware Systems
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary,#f8fafc)] flex flex-wrap items-center gap-2.5">
            <FiMonitor className="text-[var(--accent-cyan,#06b6d4)]" /> {system.systemNumber || system.id}
            <span className="text-base font-normal text-[var(--text-muted,#64748b)] hidden sm:inline">&bull;</span>
            <span className="text-sm sm:text-base font-medium text-[var(--text-secondary,#94a3b8)]">Specifications</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="timer-badge text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold text-[var(--accent-purple,#a855f7)] bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)]">
              <FiLink className="text-[10px]" /> @{sysSlug}
            </span>
            <span className={`status-tag ${system.status === "Active" ? "resolved" : "open"} text-xs px-2.5 py-0.5 rounded-full`}>
              {system.status || "Active"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Specifications */}
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 bg-white/[0.02] border border-[var(--glass-border,rgba(255,255,255,0.08))] space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary,#f8fafc)] flex items-center gap-2">
            <FiCpu className="text-[var(--accent-cyan,#06b6d4)]" /> Hardware Specifications
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-xs text-[var(--text-secondary,#94a3b8)] block">Processor (CPU)</span>
              <div className="text-sm font-bold text-[var(--text-primary,#f8fafc)] mt-1">{system.cpu || "N/A"}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-xs text-[var(--text-secondary,#94a3b8)] block">Memory (RAM)</span>
              <div className="text-sm font-bold text-[var(--text-primary,#f8fafc)] mt-1">{system.ram || "N/A"}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-xs text-[var(--text-secondary,#94a3b8)] block">Storage</span>
              <div className="text-sm font-bold text-[var(--text-primary,#f8fafc)] mt-1">{system.storage || "N/A"}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-xs text-[var(--text-secondary,#94a3b8)] block">Operating System</span>
              <div className="text-sm font-bold text-[var(--text-primary,#f8fafc)] mt-1">{system.os || "N/A"}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-xs text-[var(--text-secondary,#94a3b8)] block">Motherboard / Model</span>
              <div className="text-sm font-bold text-[var(--text-primary,#f8fafc)] mt-1">{system.model || "N/A"}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-xs text-[var(--text-secondary,#94a3b8)] block">Remarks</span>
              <div className="text-xs font-medium text-[var(--text-secondary,#94a3b8)] mt-1">{system.remarks || "—"}</div>
            </div>
          </div>
        </div>

        {/* Assigned Employee & Activity */}
        <div className="rounded-2xl p-5 sm:p-6 bg-white/[0.02] border border-[var(--glass-border,rgba(255,255,255,0.08))] space-y-4 h-fit">
          <h2 className="text-lg font-bold text-[var(--text-primary,#f8fafc)] flex items-center gap-2">
            <FiUser className="text-[var(--accent-purple,#a855f7)]" /> Assigned Employee
          </h2>
          {assignedEmp ? (
            <div className="space-y-3">
              <div>
                <div className="text-base font-bold text-[var(--text-primary,#f8fafc)]">{assignedEmp.name}</div>
                <div className="text-xs text-[var(--text-secondary,#94a3b8)] mt-0.5">
                  {assignedEmp.role} &bull; {assignedEmp.department}
                </div>
              </div>
              <div className="pt-2">
                <Link 
                  href={`/admin/users/${empSlug}`} 
                  className="btn-secondary text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 w-full justify-center"
                >
                  <FiLink /> View User Profile (@{empSlug})
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted,#64748b)]">
              This system is currently unallocated in the fleet inventory.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
