'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { 
  FiMonitor, FiLink, FiArrowLeft, FiPlus, FiCpu, FiHardDrive, 
  FiSearch, FiEdit2, FiTrash2, FiUserCheck, FiX, FiCheck 
} from "react-icons/fi";
import { 
  getSystems, getEmployees, addSystem, updateSystem, 
  deleteSystem, assignSystemToEmployee 
} from "../../store.js";
import { getSystemSlug, getEmployeeSlug } from "../../utils/slugUtils.js";
import Pagination from "../../components/Pagination.js";
import { useAuth } from "../../auth/AuthContext";
import { isSuperAdminUser, isITSupportUser } from "../../utils/authTokens.js";

export default function AdminSystemsPage() {
  const { user } = useAuth();
  const isITSupport = !isSuperAdminUser(user) && isITSupportUser(user);
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // System Modal State (Add / Edit)
  const [showSysModal, setShowSysModal] = useState(false);
  const [editingSys, setEditingSys] = useState({
    id: "",
    systemNumber: "",
    model: "",
    cpu: "",
    gpu: "",
    ram: "16 GB DDR4",
    storage: "512 GB SSD",
    os: "Windows 11 Pro",
    status: "Active",
    assignedTo: "",
    remarks: ""
  });

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningSys, setAssigningSys] = useState(null);
  const [selectedEmpId, setSelectedEmpId] = useState("");

  useEffect(() => {
    setSystems(getSystems());
    setEmployees(getEmployees());
  }, []);

  const handleOpenAdd = () => {
    const nextNum = systems.length + 1;
    setEditingSys({
      id: "",
      systemNumber: `SN${nextNum < 10 ? '0' + nextNum : nextNum}`,
      model: "",
      cpu: "",
      gpu: "Integrated Graphics",
      ram: "16 GB DDR4",
      storage: "512 GB SSD",
      os: "Windows 11 Pro",
      status: "Active",
      assignedTo: "",
      remarks: ""
    });
    setShowSysModal(true);
  };

  const handleOpenEdit = (sys) => {
    setEditingSys({
      ...sys,
      assignedTo: sys.assignedTo || ""
    });
    setShowSysModal(true);
  };

  const handleSaveSystem = (e) => {
    e.preventDefault();
    const operator = user?.name || "IT Engineer";
    if (!editingSys.systemNumber.trim()) {
      Swal.fire("Validation", "System Number is required.", "warning");
      return;
    }

    if (editingSys.id) {
      const oldSys = systems.find(s => s.id === editingSys.id);
      const oldAssignee = oldSys?.assignedTo || "";
      const newAssignee = editingSys.assignedTo || "";
      if (oldAssignee !== newAssignee) {
        assignSystemToEmployee(editingSys.id, newAssignee || null, operator);
      }
      updateSystem({ ...editingSys, assignedTo: newAssignee || null }, operator);
      Swal.fire({
        icon: 'success',
        title: 'System Updated',
        text: `System ${editingSys.systemNumber} specifications have been saved.`,
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      const added = addSystem({ ...editingSys, assignedTo: null }, operator);
      if (editingSys.assignedTo) {
        assignSystemToEmployee(added.id, editingSys.assignedTo, operator);
      }
      Swal.fire({
        icon: 'success',
        title: 'System Added',
        text: `New system ${editingSys.systemNumber} added to fleet.`,
        timer: 1500,
        showConfirmButton: false
      });
    }

    setSystems(getSystems());
    setShowSysModal(false);
  };

  const handleOpenAssign = (sys) => {
    setAssigningSys(sys);
    setSelectedEmpId(sys.assignedTo || "");
    setShowAssignModal(true);
  };

  const handleSaveAssign = (e) => {
    e.preventDefault();
    if (!assigningSys) return;
    const operator = user?.name || "IT Engineer";
    const emp = employees.find(e => e.id === selectedEmpId);
    
    assignSystemToEmployee(assigningSys.id, selectedEmpId || null, operator);
    setSystems(getSystems());
    setShowAssignModal(false);

    Swal.fire({
      icon: 'success',
      title: selectedEmpId ? 'Hardware Assigned' : 'Hardware Unassigned',
      text: selectedEmpId 
        ? `System ${assigningSys.systemNumber || assigningSys.id} assigned to ${emp?.name || 'employee'}.`
        : `System ${assigningSys.systemNumber || assigningSys.id} is now unassigned inventory.`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  const handleDeleteSystem = (sys) => {
    const operator = user?.name || "IT Engineer";
    const sn = sys.systemNumber || sys.id;
    Swal.fire({
      title: `Delete System ${sn}?`,
      text: 'This will permanently remove this machine from the fleet inventory and clear its assignments.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteSystem(sys.id, operator);
        setSystems(getSystems());
        Swal.fire('Deleted!', `System ${sn} has been deleted.`, 'success');
      }
    });
  };

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
              Manage systems, allocate machines to staff, and configure hardware fleet specifications ({filteredSystems.length} machines).
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-primary text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <FiPlus size={16} /> Add New System
          </button>
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

                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <div className="text-xs">
                    <span className="text-[var(--text-muted,#64748b)] block text-[11px]">Assigned To</span>
                    {assigned ? (
                      isITSupport ? (
                        <span className="text-[var(--accent-cyan,#06b6d4)] font-semibold">
                          {assigned.name}
                        </span>
                      ) : (
                        <Link href={`/admin/users/${empSlug}`} className="text-[var(--accent-cyan,#06b6d4)] font-semibold hover:underline">
                          {assigned.name}
                        </Link>
                      )
                    ) : (
                      <span className="text-[var(--text-muted,#64748b)] italic">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenAssign(sys)}
                      className="btn-action start text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      title="Assign hardware"
                    >
                      <FiUserCheck size={12} /> Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sys)}
                      className="btn-action start text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      title="Edit specifications"
                    >
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSystem(sys)}
                      className="btn-action resolve text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--status-critical, #ef4444)", borderColor: "rgba(239, 68, 68, 0.4)" }}
                      title="Delete system"
                    >
                      <FiTrash2 size={12} /> Delete
                    </button>
                    <Link 
                      href={`/admin/systems/${sysSlug}`} 
                      className="btn-secondary text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1"
                    >
                      Details &rarr;
                    </Link>
                  </div>
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
                          isITSupport ? (
                            <span className="text-[var(--accent-cyan,#06b6d4)] text-xs font-semibold">
                              {assigned.name}
                            </span>
                          ) : (
                            <Link href={`/admin/users/${empSlug}`} className="text-[var(--accent-cyan,#06b6d4)] text-xs font-semibold hover:underline">
                              {assigned.name}
                            </Link>
                          )
                        ) : (
                          <span className="text-[var(--text-muted,#64748b)] text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`status-tag ${sys.status === "Active" ? "resolved" : "open"} text-xs px-2.5 py-1 rounded-full`}>
                          {sys.status || "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAssign(sys)}
                            className="btn-action start text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer"
                            title="Assign or reassign hardware"
                          >
                            <FiUserCheck size={12} /> Assign
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sys)}
                            className="btn-action start text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer"
                            title="Edit specifications"
                          >
                            <FiEdit2 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSystem(sys)}
                            className="btn-action resolve text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer"
                            style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--status-critical, #ef4444)", borderColor: "rgba(239, 68, 68, 0.4)" }}
                            title="Delete system"
                          >
                            <FiTrash2 size={12} /> Delete
                          </button>
                          <Link href={`/admin/systems/${sysSlug}`} className="btn-secondary text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                            Details &rarr;
                          </Link>
                        </div>
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

      {/* ========================================================== */}
      {/* 1. ADD / EDIT SYSTEM MODAL                                 */}
      {/* ========================================================== */}
      {showSysModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)"
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary, #1e293b)",
              borderRadius: "16px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid var(--glass-border, rgba(255,255,255,0.1))",
              padding: "1.5rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary, #f8fafc)" }}>
                <FiMonitor style={{ color: "var(--accent-cyan, #06b6d4)" }} />
                {editingSys.id ? `Edit Machine: ${editingSys.systemNumber}` : "Add New Hardware System"}
              </h3>
              <button
                type="button"
                onClick={() => setShowSysModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSystem} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    System Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSys.systemNumber}
                    onChange={(e) => setEditingSys({ ...editingSys, systemNumber: e.target.value })}
                    placeholder="e.g. SN12"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    Model / Motherboard
                  </label>
                  <input
                    type="text"
                    value={editingSys.model}
                    onChange={(e) => setEditingSys({ ...editingSys, model: e.target.value })}
                    placeholder="e.g. Dell OptiPlex 7090"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    Processor (CPU)
                  </label>
                  <input
                    type="text"
                    value={editingSys.cpu}
                    onChange={(e) => setEditingSys({ ...editingSys, cpu: e.target.value })}
                    placeholder="e.g. Intel Core i7-12700"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    Graphics (GPU)
                  </label>
                  <input
                    type="text"
                    value={editingSys.gpu}
                    onChange={(e) => setEditingSys({ ...editingSys, gpu: e.target.value })}
                    placeholder="e.g. NVIDIA RTX 3060"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    RAM (Memory)
                  </label>
                  <input
                    type="text"
                    value={editingSys.ram}
                    onChange={(e) => setEditingSys({ ...editingSys, ram: e.target.value })}
                    placeholder="e.g. 16 GB DDR4"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    Storage
                  </label>
                  <input
                    type="text"
                    value={editingSys.storage}
                    onChange={(e) => setEditingSys({ ...editingSys, storage: e.target.value })}
                    placeholder="e.g. 512 GB NVMe SSD"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    Operating System
                  </label>
                  <input
                    type="text"
                    value={editingSys.os}
                    onChange={(e) => setEditingSys({ ...editingSys, os: e.target.value })}
                    placeholder="e.g. Windows 11 Pro"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                    Fleet Status
                  </label>
                  <select
                    value={editingSys.status}
                    onChange={(e) => setEditingSys({ ...editingSys, status: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                  Assign to Employee (Optional)
                </label>
                <select
                  value={editingSys.assignedTo}
                  onChange={(e) => setEditingSys({ ...editingSys, assignedTo: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.3)",
                    color: "#fff",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value="">-- Unassigned Inventory --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role} &bull; {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={editingSys.remarks || ""}
                  onChange={(e) => setEditingSys({ ...editingSys, remarks: e.target.value })}
                  placeholder="Hardware notes, serials, purchase details..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.3)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    resize: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowSysModal(false)}
                  className="btn-secondary"
                  style={{ padding: "8px 16px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "8px 20px", cursor: "pointer" }}
                >
                  {editingSys.id ? "Save Changes" : "Create System"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. QUICK ASSIGN MODAL                                      */}
      {/* ========================================================== */}
      {showAssignModal && assigningSys && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)"
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary, #1e293b)",
              borderRadius: "16px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid var(--glass-border, rgba(255,255,255,0.1))",
              padding: "1.5rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary, #f8fafc)" }}>
                <FiUserCheck style={{ color: "var(--accent-cyan, #06b6d4)" }} />
                Assign Hardware: {assigningSys.systemNumber || assigningSys.id}
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAssign} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <div>Machine Specs: <strong>{assigningSys.cpu || "Standard CPU"}</strong> &bull; {assigningSys.ram || "RAM"}</div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                  Select Employee Allocation
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.3)",
                    color: "#fff",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value="">-- Unassigned (Available in Fleet) --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role} &bull; {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn-secondary"
                  style={{ padding: "8px 16px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "8px 20px", cursor: "pointer" }}
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
