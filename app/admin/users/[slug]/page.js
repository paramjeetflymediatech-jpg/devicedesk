"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getSystems, getTickets, getTasks, getAssignmentHistory } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiUser, FiArrowLeft, FiServer, FiCheckSquare, FiFileText, FiClock, FiShield } from "react-icons/fi";

export default function UserSlugDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignedSystems, setAssignedSystems] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [userLogs, setUserLogs] = useState([]);

  useEffect(() => {
    if (!slug) return;
    try {
      const allEmployees = getEmployees();
      const emp = findEmployeeBySlug(allEmployees, slug);
      setEmployee(emp || null);

      if (emp) {
        const allSystems = getSystems();
        const allTickets = getTickets();
        const allTasks = getTasks();
        const allLogs = getAssignmentHistory();

        setAssignedSystems(allSystems.filter(s => s.assignedTo === emp.id));
        setUserTickets(allTickets.filter(t => t.employeeId === emp.id || t.raisedBy === emp.id));
        setUserTasks(allTasks.filter(t => t.assignedTo === emp.id));
        setUserLogs(allLogs.filter(h => h.employeeId === emp.id));
      }
    } catch (err) {
      console.error("Error loading user details:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading team member profile...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page-container" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <button onClick={() => router.push("/")} className="btn-secondary" style={{ marginBottom: "1.5rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "2rem", textAlign: "center" }}>
          <h2 style={{ color: "var(--status-critical)", marginBottom: "0.5rem" }}>Team Member Not Found</h2>
          <p style={{ color: "var(--text-secondary)" }}>No team member matching the slug &quot;<strong>{slug}</strong>&quot; was found.</p>
        </div>
      </div>
    );
  }

  const userSlug = getEmployeeSlug(employee);
  const completedTasks = userTasks.filter(t => t.status === "Completed").length;
  const pendingTasks = userTasks.length - completedTasks;
  const taskCompletionRate = userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0;

  return (
    <div className="page-container" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header & Back Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <button
          onClick={() => router.push("/")}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
        >
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="timer-badge" style={{ color: "var(--accent-purple)", borderColor: "rgba(139, 92, 246, 0.4)" }}>
            Slug: {userSlug}
          </span>
          <span className={`status-badge badge-${employee.status === "Paused" ? "open" : "resolved"}`}>
            {employee.status || "Active"}
          </span>
        </div>
      </div>

      {/* User Hero Banner */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "2rem",
          marginBottom: "2rem",
          display: "flex",
          gap: "2rem",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            color: "#fff",
            fontWeight: "bold"
          }}
        >
          {employee.name ? employee.name[0].toUpperCase() : "U"}
        </div>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <h1 style={{ margin: 0, fontSize: "1.8rem", color: "var(--text-primary)" }}>{employee.name}</h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {employee.role} • <span style={{ color: "var(--accent-cyan)" }}>{employee.department}</span>
          </p>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "12px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <span>📧 {employee.email || "No email"}</span>
            <span>📱 ID: {employee.id}</span>
            <span>🎫 Ticket Limit: {employee.ticketLimit || 5}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <span className="stat-label">Assigned Devices</span>
          <span className="stat-value">{assignedSystems.length}</span>
        </div>
        <div className="stat-card purple">
          <span className="stat-label">Total Tasks</span>
          <span className="stat-value">{userTasks.length}</span>
        </div>
        <div className="stat-card green">
          <span className="stat-label">Completed Tasks</span>
          <span className="stat-value">{completedTasks} ({taskCompletionRate}%)</span>
        </div>
        <div className="stat-card orange">
          <span className="stat-label">Tickets Raised</span>
          <span className="stat-value">{userTickets.length}</span>
        </div>
      </div>

      {/* Split Details Section */}
      <div className="dashboard-split" style={{ marginBottom: "2rem" }}>
        {/* Assigned Hardware */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">🖥️ Assigned Devices ({assignedSystems.length})</span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>System Number</th>
                  <th>Status</th>
                  <th>Specs (RAM / OS)</th>
                </tr>
              </thead>
              <tbody>
                {assignedSystems.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                      No devices currently assigned.
                    </td>
                  </tr>
                ) : (
                  assignedSystems.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>{s.systemNumber}</td>
                      <td>
                        <span className={`status-tag ${s.status.toLowerCase().replace(" ", "")}`}>{s.status}</span>
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>{s.ram || "—"} • {s.os || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">📋 Task Activity ({userTasks.length})</span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {userTasks.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                      No tasks assigned yet.
                    </td>
                  </tr>
                ) : (
                  userTasks.slice(0, 5).map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.title}</strong></td>
                      <td>
                        <span className={`status-badge badge-${t.status === "Completed" ? "resolved" : t.status === "In Progress" ? "progress" : "open"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket History */}
      <div className="panel-card">
        <div className="panel-header">
          <span className="panel-title">🎫 Complaint & Ticket History ({userTickets.length})</span>
        </div>
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {userTickets.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                    No tickets on record.
                  </td>
                </tr>
              ) : (
                userTickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ticket.id}</td>
                    <td>{ticket.category}</td>
                    <td><span className={`status-tag ${ticket.severity?.toLowerCase()}`}>{ticket.severity}</span></td>
                    <td><span className={`status-tag ${ticket.status?.toLowerCase().replace(" ", "")}`}>{ticket.status}</span></td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
