"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getTasks, getEmployees } from "../../../store.js";
import { findTaskBySlug, getTaskSlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiCheckSquare, FiArrowLeft, FiClock, FiUser, FiLink, FiCheck, FiPaperclip } from "react-icons/fi";

export default function TaskSlugDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [task, setTask] = useState(null);
  const [assignee, setAssignee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allTasks = getTasks();
    const foundTask = findTaskBySlug(allTasks, slug);
    setTask(foundTask);

    if (foundTask) {
      const allEmployees = getEmployees();
      const emp = allEmployees.find(
        (e) => e.id === foundTask.assignedToId || e.name === foundTask.assignedToName
      );
      setAssignee(emp || null);
    }
    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Task Details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2>Task Not Found</h2>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>
            No task matching slug &quot;{slug}&quot; was found.
          </p>
          <Link href="/admin/tasks" className="btn-primary" style={{ textDecoration: "none" }}>
            Return to Tasks Board
          </Link>
        </div>
      </div>
    );
  }

  const taskSlug = getTaskSlug(task);
  const assigneeSlug = assignee ? getEmployeeSlug(assignee) : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link
              href="/admin/tasks"
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
              <FiArrowLeft /> Back to Tasks Board
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiCheckSquare style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {task.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{taskSlug}
              </span>
              <span className={`status-badge badge-${task.status === "In Progress" ? "progress" : task.status === "Completed" ? "resolved" : "open"}`}>
                {task.status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1rem", color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Task Description
          </h3>
          <p style={{ fontSize: "1rem", lineHeight: "1.6", color: "var(--text-primary, #f8fafc)", whiteSpace: "pre-wrap" }}>
            {task.description || "No detailed description provided."}
          </p>

          <hr style={{ borderColor: "var(--glass-border, rgba(255,255,255,0.1))", margin: "1.5rem 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Assigned To</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <strong style={{ fontSize: "1rem" }}>{task.assignedToName || "Unassigned"}</strong>
                {assignee && (
                  <Link href={`/admin/users/${assigneeSlug}`} className="timer-badge" style={{ fontSize: "0.7rem", color: "var(--accent-purple, #a855f7)", textDecoration: "none" }}>
                    @{assigneeSlug}
                  </Link>
                )}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Assigned By</span>
              <div style={{ marginTop: "4px", fontWeight: 600 }}>{task.assignedByName || "System Admin"}</div>
            </div>

            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Created Date</span>
              <div style={{ marginTop: "4px", color: "var(--text-secondary, #94a3b8)" }}>
                {new Date(task.createdAt || Date.now()).toLocaleString()}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Time Tracked</span>
              <div style={{ marginTop: "4px", fontFamily: "monospace", color: "var(--accent-cyan, #06b6d4)", fontWeight: 700 }}>
                {task.totalDuration ? `${Math.floor(task.totalDuration / 60)} mins` : "0 mins"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
