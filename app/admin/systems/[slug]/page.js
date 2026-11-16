'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { 
  FiMonitor, FiArrowLeft, FiCpu, FiHardDrive, FiUser, FiLink, 
  FiLayers, FiActivity, FiEdit2, FiTrash2, FiUserCheck, FiX, FiCheck 
} from "react-icons/fi";
import { 
  getSystems, getEmployees, getTickets, updateSystem, 
  deleteSystem, assignSystemToEmployee 
} from "../../../store.js";
import { findSystemBySlug, getSystemSlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { useAuth } from "../../../auth/AuthContext";
import { isSuperAdminUser, isITSupportUser } from "../../../utils/authTokens.js";

export default function AdminSingleSystemPage() {
  const { user } = useAuth();
  const isITSupport = !isSuperAdminUser(user) && isITSupportUser(user);
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [system, setSystem] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [assignedEmp, setAssignedEmp] = useState(null);
  const [systemTickets, setSystemTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSys, setEditingSys] = useState(null);

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");

  const refreshSystemData = () => {
    const allSystems = getSystems();
    const found = findSystemBySlug(allSystems, slug);
    setSystem(found);

    const allEmps = getEmployees();
    setEmployees(allEmps);

    if (found) {
      const emp = allEmps.find((e) => e.id === found.assignedTo);
      setAssignedEmp(emp);

      const allTickets = getTickets();
      const tkts = allTickets.filter((t) => t.systemId === found.id || t.systemNumber === found.systemNumber);
      setSystemTickets(tkts);
    }
  };

  useEffect(() => {
    refreshSystemData();
    setLoading(false);
  }, [slug]);

  const handleOpenEdit = () => {
    if (!system) return;
    setEditingSys({
      ...system,
      assignedTo: system.assignedTo || ""
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingSys) return;
    const operator = user?.name || "IT Engineer";

    if (!editingSys.systemNumber.trim()) {
      Swal.fire("Validation", "System Number is required.", "warning");
      return;
    }

    const oldAssignee = system.assignedTo || "";
    const newAssignee = editingSys.assignedTo || "";
    if (oldAssignee !== newAssignee) {
      assignSystemToEmployee(editingSys.id, newAssignee || null, operator);
    }
    updateSystem({ ...editingSys, assignedTo: newAssignee || null }, operator);

    Swal.fire({
      icon: 'success',
      title: 'Machine Updated',
      text: `System ${editingSys.systemNumber} specifications saved.`,
      timer: 1500,
      showConfirmButton: false
    });

    setShowEditModal(false);
    refreshSystemData();
  };

  const handleOpenAssign = () => {
    if (!system) return;
    setSelectedEmpId(system.assignedTo || "");
    setShowAssignModal(true);
  };

  const handleSaveAssign = (e) => {
    e.preventDefault();
    if (!system) return;
    const operator = user?.name || "IT Engineer";
    const emp = employees.find(e => e.id === selectedEmpId);

    assignSystemToEmployee(system.id, selectedEmpId || null, operator);
    setShowAssignModal(false);
    refreshSystemData();

    Swal.fire({
      icon: 'success',
      title: selectedEmpId ? 'Hardware Assigned' : 'Hardware Unassigned',
      text: selectedEmpId 
        ? `System ${system.systemNumber || system.id} assigned to ${emp?.name || 'employee'}.`
        : `System ${system.systemNumber || system.id} is now unassigned inventory.`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  const handleDeleteSystem = () => {
    if (!system) return;
    const operator = user?.name || "IT Engineer";
    const sn = system.systemNumber || system.id;

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
        deleteSystem(system.id, operator);
        Swal.fire('Deleted!', `System ${sn} has been deleted.`, 'success');
        router.push('/admin/systems');
      }
    });
  };

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

        {/* Machine Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAssign}
            className="btn-action start text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <FiUserCheck size={14} /> Assign Machine
          </button>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="btn-action start text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <FiEdit2 size={14} /> Edit Specs
          </button>
          <button
            type="button"
            onClick={handleDeleteSystem}
            className="btn-action resolve text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 font-bold cursor-pointer"
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--status-critical, #ef4444)", borderColor: "rgba(239, 68, 68, 0.4)" }}
          >
            <FiTrash2 size={14} /> Delete
          </button>
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
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[var(--text-primary,#f8fafc)] flex items-center gap-2">
              <FiUser className="text-[var(--accent-purple,#a855f7)]" /> Assigned Employee
            </h2>
            <button
              type="button"
              onClick={handleOpenAssign}
              className="text-xs font-bold text-[var(--accent-cyan,#06b6d4)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FiUserCheck size={12} /> {assignedEmp ? "Reassign" : "Assign"}
            </button>
          </div>
          {assignedEmp ? (
            <div className="space-y-3">
              <div>
                <div className="text-base font-bold text-[var(--text-primary,#f8fafc)]">{assignedEmp.name}</div>
                <div className="text-xs text-[var(--text-secondary,#94a3b8)] mt-0.5">
                  {assignedEmp.role} &bull; {assignedEmp.department}
                </div>
              </div>
              {!isITSupport && (
                <div className="pt-2">
                  <Link 
                    href={`/admin/users/${empSlug}`} 
                    className="btn-secondary text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 w-full justify-center"
                  >
                    <FiLink /> View User Profile (@{empSlug})
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted,#64748b)]">
                This system is currently unallocated in the fleet inventory.
              </p>
              <button
                type="button"
                onClick={handleOpenAssign}
                className="btn-primary text-xs px-3 py-1.5 rounded-lg w-full cursor-pointer"
              >
                + Assign to Employee
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingSys && (
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
                Edit Machine: {editingSys.systemNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                  Assign to Employee
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
                  onClick={() => setShowEditModal(false)}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
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
                Assign Hardware: {system.systemNumber || system.id}
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
                <div>Machine Specs: <strong>{system.cpu || "Standard CPU"}</strong> &bull; {system.ram || "RAM"}</div>
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
