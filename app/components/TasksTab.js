"use client";

import React from "react";
import Link from "next/link";
import { FiLink } from "react-icons/fi";
import { getEmployeeSlug } from "../utils/slugUtils.js";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export default function TasksTab({
  isTeamLeader,
  leaderDepartment,
  handleExportTasksToCSV,
  setEmpReportTarget,
  setEmpReportFrom,
  setEmpReportTo,
  setShowEmpReportModal,
  employees,
  setNewTaskTitle,
  setNewTaskDesc,
  setNewTaskAssignee,
  setShowAddTaskModal,
  setTaskPage,
  taskSearch,
  setTaskSearch,
  currentTasks,
  now,
  setSelectedTaskDetails,
  setShowTaskDetailsModal,
  setEditingTask,
  setEditTaskTitle,
  setEditTaskDesc,
  setEditTaskAssignee,
  setEditTaskStatus,
  setShowEditTaskModal,
  handleDeleteTask,
  totalTaskPages,
  taskPage,
  filteredTasks,
  perfChartTab,
  setPerfChartTab,
  performanceEmployees,
  tasks,
  currentPerfEmployees,
  totalPerfPages,
  perfPage,
  setPerfPage
}) {
  return (
    <div className="page-section active">
      <div
        className="section-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h2 style={{ fontSize: "1.4rem", margin: 0 }}>📅 Team Task Board</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            {isTeamLeader
              ? `Showing tasks for your department: ${leaderDepartment}`
              : "Assign tasks, view daily performance reports, and track employee task logs"}
          </p>
          {isTeamLeader && (
            <span
              style={{
                display: "inline-block",
                marginTop: "6px",
                padding: "2px 10px",
                background: "rgba(0,204,255,0.12)",
                border: "1px solid rgba(0,204,255,0.3)",
                borderRadius: "20px",
                fontSize: "0.75rem",
                color: "var(--accent-cyan)",
                fontWeight: "600"
              }}
            >
              🏷️ Dept: {leaderDepartment}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleExportTasksToCSV} className="btn-secondary">
            📥 Export All Tasks
          </button>
          <button
            onClick={() => {
              setEmpReportTarget(null);
              const today = new Date();
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(today.getDate() - 30);
              setEmpReportFrom(thirtyDaysAgo.toISOString().split("T")[0]);
              setEmpReportTo(today.toISOString().split("T")[0]);
              setShowEmpReportModal(true);
            }}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(139, 92, 246, 0.15)",
              color: "var(--accent-purple)",
              borderColor: "var(--accent-purple)"
            }}
          >
            📊 Performance Reports
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setNewTaskTitle("");
              setNewTaskDesc("");
              const assignableEmps = employees.filter(
                e =>
                  e.role !== "Admin" &&
                  e.role !== "Management" &&
                  (!isTeamLeader || !leaderDepartment || e.department?.toLowerCase() === leaderDepartment.toLowerCase())
              );
              setNewTaskAssignee(assignableEmps.length > 0 ? assignableEmps[0].id : "");
              setShowAddTaskModal(true);
            }}
          >
            + Assign New Task
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div
        className="tab-container"
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          paddingBottom: "10px"
        }}
      >
        <button
          onClick={() => setTaskPage(1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent-cyan)",
            fontWeight: "bold",
            borderBottom: "2px solid var(--accent-cyan)",
            paddingBottom: "5px",
            cursor: "pointer"
          }}
        >
          Tasks List
        </button>
      </div>

      {/* Filters */}
      <div className="filter-row" style={{ marginBottom: "1.5rem" }}>
        <div style={{ position: "relative", flexGrow: 1 }}>
          <input
            type="text"
            className="form-control search-box"
            placeholder="Search by task title, description, or assignee..."
            style={{ width: "100%", paddingRight: "35px" }}
            value={taskSearch}
            onChange={(e) => {
              setTaskSearch(e.target.value);
              setTaskPage(1);
            }}
          />
          {taskSearch && (
            <button
              type="button"
              onClick={() => {
                setTaskSearch("");
                setTaskPage(1);
              }}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "4px",
                lineHeight: 1
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Table — Tasks List */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Task Title</th>
              <th>Description</th>
              <th>Assigned To</th>
              <th>Assigned By</th>
              <th>Status</th>
              <th>Time Spent</th>
              <th>Created</th>
              <th>Completed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTasks.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  No tasks found.
                </td>
              </tr>
            ) : (
              currentTasks.map(t => {
                let displayDuration = t.totalDuration || 0;
                if (t.status === "In Progress" && t.startedAt) {
                  const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
                  displayDuration += Math.max(0, elapsed);
                }

                const formatTime = (secs) => {
                  const h = Math.floor(secs / 3600);
                  const m = Math.floor((secs % 3600) / 60);
                  const s = secs % 60;
                  return `${h}h ${m}m ${s}s`;
                };

                const emp = employees.find(e => e.id === t.assignedToId || e.name === t.assignedToName);

                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: "600" }}>{t.title}</td>
                    <td>{t.description || "—"}</td>
                    <td>
                      {emp ? (
                        <div>
                          <div>{emp.name}</div>
                          <Link
                            href={`/admin/users/${getEmployeeSlug(emp)}`}
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--accent-purple)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              textDecoration: "none"
                            }}
                            title={`View profile for ${getEmployeeSlug(emp)}`}
                          >
                            <FiLink style={{ fontSize: "0.65rem" }} /> {getEmployeeSlug(emp)}
                          </Link>
                        </div>
                      ) : (
                        <strong>{t.assignedToName || "Unassigned"}</strong>
                      )}
                    </td>
                    <td>{t.assignedByName || "System"}</td>
                    <td>
                      <span
                        className={`status-badge badge-${
                          t.status === "In Progress"
                            ? "progress"
                            : t.status === "Completed"
                            ? "resolved"
                            : "open"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", color: "var(--accent-cyan)" }}>
                      {formatTime(displayDuration)}
                    </td>
                    <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                    <td>{t.completedAt ? new Date(t.completedAt).toLocaleString() : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => {
                            setSelectedTaskDetails(t);
                            setShowTaskDetailsModal(true);
                          }}
                        >
                          👁️ View
                        </button>
                        <button
                          className="btn-action start"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "rgba(88, 166, 255, 0.15)",
                            color: "#58a6ff",
                            borderColor: "rgba(88, 166, 255, 0.3)"
                          }}
                          onClick={() => {
                            setEditingTask(t);
                            setEditTaskTitle(t.title);
                            setEditTaskDesc(t.description || "");
                            setEditTaskAssignee(t.assignedTo || "");
                            setEditTaskStatus(t.status || "Pending");
                            setShowEditTaskModal(true);
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-action resolve"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "var(--status-critical)",
                            borderColor: "rgba(239, 68, 68, 0.3)"
                          }}
                          onClick={() => handleDeleteTask(t.id, t.title)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Task Pagination Controls */}
      {totalTaskPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: "1rem" }}>
          <button
            className="btn-secondary"
            onClick={() => setTaskPage(prev => Math.max(prev - 1, 1))}
            disabled={taskPage === 1}
            style={{
              padding: "6px 12px",
              opacity: taskPage === 1 ? 0.5 : 1,
              cursor: taskPage === 1 ? "not-allowed" : "pointer"
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Page {taskPage} of {totalTaskPages} (Total {filteredTasks.length} tasks)
          </span>
          <button
            className="btn-secondary"
            onClick={() => setTaskPage(prev => Math.min(prev + 1, totalTaskPages))}
            disabled={taskPage === totalTaskPages}
            style={{
              padding: "6px 12px",
              opacity: taskPage === totalTaskPages ? 0.5 : 1,
              cursor: taskPage === totalTaskPages ? "not-allowed" : "pointer"
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Performance Summary section */}
      <div style={{ marginTop: "3rem" }}>
        {/* ── Chart Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "1.5rem"
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", color: "var(--accent-cyan)", margin: 0 }}>
              📊 Team Performance Chart
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Task completion rates per team member across time periods
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Tab Switcher */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                background: "rgba(255,255,255,0.04)",
                padding: "4px",
                borderRadius: "10px",
                border: "1px solid var(--glass-border)"
              }}
            >
              {["daily", "weekly", "monthly", "yearly"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setPerfChartTab(tab)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "7px",
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    background:
                      perfChartTab === tab
                        ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))"
                        : "transparent",
                    color: perfChartTab === tab ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                    boxShadow: perfChartTab === tab ? "0 2px 10px rgba(0,204,255,0.3)" : "none"
                  }}
                >
                  {tab === "daily" ? "Today" : tab === "weekly" ? "Week" : tab === "monthly" ? "Month" : "Year"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bar Chart ── */}
        {(() => {
          const now2 = new Date();
          const chartData = performanceEmployees
            .map(e => {
              let empTasks = tasks.filter(t => t.assignedTo === e.id);

              // Filter by time period
              if (perfChartTab === "daily") {
                empTasks = empTasks.filter(t => {
                  const d = new Date(t.createdAt || t.updatedAt || 0);
                  return d.toDateString() === now2.toDateString();
                });
              } else if (perfChartTab === "weekly") {
                const weekAgo = new Date(now2);
                weekAgo.setDate(weekAgo.getDate() - 7);
                empTasks = empTasks.filter(t => new Date(t.createdAt || t.updatedAt || 0) >= weekAgo);
              } else if (perfChartTab === "monthly") {
                empTasks = empTasks.filter(t => {
                  const d = new Date(t.createdAt || t.updatedAt || 0);
                  return d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear();
                });
              } else if (perfChartTab === "yearly") {
                empTasks = empTasks.filter(t => {
                  const d = new Date(t.createdAt || t.updatedAt || 0);
                  return d.getFullYear() === now2.getFullYear();
                });
              }

              const total = empTasks.length;
              const completed = empTasks.filter(t => t.status === "Completed").length;
              const pending = total - completed;
              const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
              const shortName = (e.name || "").split(" ")[0];
              return { name: shortName, Completed: completed, Pending: pending, Rate: rate, total };
            })
            .filter(d => d.total > 0 || true);

          const hasData = chartData.some(d => d.total > 0);

          return (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--glass-border)",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "2rem"
              }}
            >
              {!hasData ? (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📭</div>
                  <p style={{ margin: 0 }}>No tasks found for this time period.</p>
                </div>
              ) : (
                <>
                  {/* Stacked Bar Chart */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Tasks: Completed vs Pending
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(15,15,25,0.95)",
                            border: "1px solid var(--glass-border)",
                            borderRadius: "10px",
                            fontSize: "0.8rem"
                          }}
                          labelStyle={{ color: "var(--accent-cyan)", fontWeight: "bold" }}
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "10px" }} />
                        <Bar dataKey="Completed" stackId="a" fill="#00ccff" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Pending" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Completion Rate Bar Chart */}
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Completion Rate (%)
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {chartData.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              width: "90px",
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                              textAlign: "right",
                              flexShrink: 0
                            }}
                          >
                            {d.name}
                          </span>
                          <div
                            style={{
                              flex: 1,
                              background: "rgba(255,255,255,0.06)",
                              borderRadius: "20px",
                              height: "10px",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${d.Rate}%`,
                                background:
                                  d.Rate === 100
                                    ? "linear-gradient(90deg, #00ccff, #00ff99)"
                                    : d.Rate >= 50
                                    ? "linear-gradient(90deg, #00ccff, #a855f7)"
                                    : "linear-gradient(90deg, #f59e0b, #ef4444)",
                                borderRadius: "20px",
                                transition: "width 0.8s ease"
                              }}
                            />
                          </div>
                          <span
                            style={{
                              width: "38px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              color:
                                d.Rate === 100
                                  ? "#00ff99"
                                  : d.Rate >= 50
                                  ? "var(--accent-cyan)"
                                  : "#f59e0b",
                              textAlign: "left"
                            }}
                          >
                            {d.Rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        <h3 style={{ fontSize: "1.1rem", color: "var(--accent-cyan)", marginBottom: "1rem" }}>
          📈 Team Performance Table
        </h3>
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Department</th>
                <th>Role</th>
                <th style={{ textAlign: "center" }}>Total Assigned</th>
                <th style={{ textAlign: "center" }}>Completed</th>
                <th style={{ textAlign: "center" }}>Pending</th>
                <th>Total Time Spent</th>
                <th>Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              {currentPerfEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No team members found.
                  </td>
                </tr>
              ) : (
                currentPerfEmployees.map(e => {
                  const empTasks = tasks.filter(t => t.assignedTo === e.id);
                  const completed = empTasks.filter(t => t.status === "Completed");
                  const pending = empTasks.filter(t => t.status !== "Completed");

                  let totalTime = 0;
                  empTasks.forEach(t => {
                    let displayDuration = t.totalDuration || 0;
                    if (t.status === "In Progress" && t.startedAt) {
                      const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
                      displayDuration += Math.max(0, elapsed);
                    }
                    totalTime += displayDuration;
                  });

                  const formatTime = (secs) => {
                    const h = Math.floor(secs / 3600);
                    const m = Math.floor((secs % 3600) / 60);
                    const s = secs % 60;
                    return `${h}h ${m}m ${s}s`;
                  };

                  const rate =
                    empTasks.length > 0 ? Math.round((completed.length / empTasks.length) * 100) : 0;

                  return (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.name}</strong>
                      </td>
                      <td>{e.department || "Operations"}</td>
                      <td>{e.role}</td>
                      <td style={{ textAlign: "center" }}>{empTasks.length}</td>
                      <td style={{ textAlign: "center", color: "var(--status-resolved)" }}>{completed.length}</td>
                      <td style={{ textAlign: "center", color: "var(--status-progress)" }}>{pending.length}</td>
                      <td style={{ fontFamily: "monospace", color: "var(--accent-cyan)" }}>
                        {formatTime(totalTime)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: "bold",
                            color: rate === 100 ? "var(--status-resolved)" : "var(--text-primary)"
                          }}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Performance Report Pagination Controls */}
        {totalPerfPages > 1 && (
          <div className="pagination-controls" style={{ marginTop: "1rem" }}>
            <button
              className="btn-secondary"
              onClick={() => setPerfPage(prev => Math.max(prev - 1, 1))}
              disabled={perfPage === 1}
              style={{
                padding: "6px 12px",
                opacity: perfPage === 1 ? 0.5 : 1,
                cursor: perfPage === 1 ? "not-allowed" : "pointer"
              }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Page {perfPage} of {totalPerfPages} (Total {performanceEmployees.length} team members)
            </span>
            <button
              className="btn-secondary"
              onClick={() => setPerfPage(prev => Math.min(prev + 1, totalPerfPages))}
              disabled={perfPage === totalPerfPages}
              style={{
                padding: "6px 12px",
                opacity: perfPage === totalPerfPages ? 0.5 : 1,
                cursor: perfPage === totalPerfPages ? "not-allowed" : "pointer"
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
