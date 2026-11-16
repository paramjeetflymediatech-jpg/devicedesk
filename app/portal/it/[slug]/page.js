"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { 
  getEmployees, getSystems, getTickets, 
  addSystem, updateSystem, deleteSystem, assignSystemToEmployee 
} from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug, getSystemSlug } from "../../../utils/slugUtils.js";
import { 
  FiCpu, FiArrowLeft, FiCheckCircle, FiTool, FiLayers, 
  FiLink, FiAlertCircle, FiMonitor, FiCheck, FiX, FiPlus,
  FiEdit2, FiTrash2, FiUserCheck, FiHardDrive
} from "react-icons/fi";

export default function ITSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [itUser, setItUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);

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
    const allEmps = getEmployees();
    const foundIt = findEmployeeBySlug(allEmps, slug) || {
      id: "it-engineer",
      name: "IT Support Engineer",
      role: "IT Engineer",
      department: "IT Support",
      email: "it@flymediatech.com"
    };
    setItUser(foundIt);
    setEmployees(allEmps);
    setSystems(getSystems());
    setTickets(getTickets());
    setLoading(false);
  }, [slug]);

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
    const operator = itUser?.name || "IT Engineer";
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
        timer: 1600,
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
        timer: 1600,
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
    const operator = itUser?.name || "IT Engineer";
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
    const operator = itUser?.name || "IT Engineer";
    const sn = sys.systemNumber || sys.id;
    Swal.fire({
      title: `Remove System ${sn}?`,
      text: 'This machine will be permanently removed from inventory and unallocated from any assigned user.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete system',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteSystem(sys.id, operator);
        setSystems(getSystems());
        Swal.fire('Deleted!', `System ${sn} removed from inventory.`, 'success');
      }
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading IT Infrastructure Console...</p>
      </div>
    );
  }

  const itSlug = itUser ? getEmployeeSlug(itUser) : slug;
  const openTickets = tickets.filter((t) => (t.status || "").toLowerCase() !== "resolved");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link
              href="/portal/it"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--accent-cyan, #06b6d4)",
                textDecoration: "none",
                fontSize: "0.85rem",
                marginBottom: "8px"
              }}
            >
              <FiArrowLeft /> All IT Consoles
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiCpu style={{ color: "#38bdf8" }} /> {itUser?.name || "IT Engineer"} &bull; IT Support Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{itSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                {itUser?.role || "IT Engineer"} &bull; IT Support
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleOpenAdd}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 16px", cursor: "pointer" }}
            >
              <FiPlus /> Add New System
            </button>
            <Link href="/admin/systems" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiMonitor /> Full Systems Inventory
            </Link>
          </div>
        </div>

        {/* IT KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Tracked Systems</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {systems.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Tickets</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>
              {openTickets.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Resolved Tickets</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {tickets.filter((t) => (t.status || "").toLowerCase() === "resolved").length}
            </div>
          </div>
        </div>

        {/* Hardware Systems Grid */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FiMonitor /> Hardware Fleet & Allocation ({systems.length} machines)
            </h2>
            <button
              onClick={handleOpenAdd}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "0.8rem",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              <FiPlus /> Add Machine
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.25rem" }}>
            {systems.map((sys) => {
              const assignedEmp = employees.find((e) => e.id === sys.assignedTo);
              const empSlug = assignedEmp ? getEmployeeSlug(assignedEmp) : "";
              return (
                <div key={sys.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary, #f8fafc)" }}>
                        {sys.systemNumber || sys.id}
                      </span>
                      <span className={`status-tag ${sys.status === "Active" ? "resolved" : "open"}`} style={{ fontSize: "0.7rem" }}>
                        {sys.status || "Active"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0" }}>
                      <div><strong>CPU:</strong> {sys.cpu || "N/A"}</div>
                      <div><strong>RAM:</strong> {sys.ram || "N/A"} &bull; <strong>Storage:</strong> {sys.storage || "N/A"}</div>
                      <div><strong>OS:</strong> {sys.os || "N/A"}</div>
                      {sys.model && <div><strong>Model:</strong> {sys.model}</div>}
                    </div>

                    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.8rem" }}>
                      {assignedEmp ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>Assigned: <strong>{assignedEmp.name}</strong></span>
                          <span style={{ color: "var(--accent-purple, #a855f7)", fontWeight: 600, fontSize: "0.75rem" }}>
                            @{empSlug}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted, #64748b)", fontStyle: "italic" }}>⚠️ Unassigned Inventory</span>
                      )}
                    </div>
                  </div>

                  {/* IT Engineer Actions */}
                  <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAssign(sys)}
                      className="btn-action start"
                      style={{ fontSize: "0.75rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                      title="Assign or unassign machine"
                    >
                      <FiUserCheck size={12} /> Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sys)}
                      className="btn-action start"
                      style={{ fontSize: "0.75rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                      title="Edit machine specs"
                    >
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSystem(sys)}
                      className="btn-action resolve"
                      style={{
                        fontSize: "0.75rem",
                        padding: "5px 10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(239, 68, 68, 0.15)",
                        color: "var(--status-critical, #ef4444)",
                        borderColor: "rgba(239, 68, 68, 0.4)",
                        cursor: "pointer"
                      }}
                      title="Delete machine"
                    >
                      <FiTrash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Queue */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiAlertCircle /> IT Support Tickets Queue
          </h2>
          {tickets.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No support tickets registered.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tickets.slice(0, 8).map((ticket) => (
                <div key={ticket.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{ticket.title}</span>
                    <span style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.75rem", marginLeft: "10px" }}>
                      Machine: <strong>{ticket.systemNumber || "N/A"}</strong>
                    </span>
                  </div>
                  <span className={`status-tag ${(ticket.status || "").toLowerCase() === "resolved" ? "resolved" : "open"}`} style={{ fontSize: "0.75rem" }}>
                    {ticket.status || "Open"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
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
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FiMonitor style={{ color: "#38bdf8" }} />
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
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FiUserCheck style={{ color: "#38bdf8" }} />
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
