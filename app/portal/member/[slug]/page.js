"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getTasks, getSystems, getTickets } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiUser, FiArrowLeft, FiCheckSquare, FiFileText, FiClock, FiLink, FiUpload, FiSend, FiServer, FiAlertTriangle } from "react-icons/fi";

export default function TeamMemberSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assignedSystem, setAssignedSystem] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const allEmployees = getEmployees();
    const foundMember = findEmployeeBySlug(allEmployees, slug);
    setMember(foundMember);

    if (foundMember) {
      const allTasks = getTasks();
      const myTasks = allTasks.filter(
        (t) => t.assignedToId === foundMember.id || t.assignedToName === foundMember.name
      );
      setTasks(myTasks);

      const allSystems = getSystems();
      const mySys = allSystems.find((s) => s.assignedTo === foundMember.id);
      setAssignedSystem(mySys || null);

      const allTickets = getTickets();
      const myTickets = allTickets.filter((t) => t.employeeId === foundMember.id);
      setTickets(myTickets);

      fetchSubmissions(foundMember.id);
    }
    setLoading(false);
  }, [slug]);

  const fetchSubmissions = async (empId) => {
    try {
      const res = await fetch("/api/work-submissions");
      const data = await res.json();
      if (data.success) {
        setSubmissions((data.data || []).filter((s) => s.submitted_by === empId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!selectedTask || !member) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/work-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: selectedTask.id,
          project_id: selectedTask.project_id || "general",
          submitted_by: member.id,
          description,
          file_url: fileUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Work submitted successfully!");
        setDescription("");
        setFileUrl("");
        setSelectedTask(null);
        fetchSubmissions(member.id);
      } else {
        alert(data.error || "Failed to submit work");
      }
    } catch (err) {
      alert("Error submitting work");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Team Member Dashboard...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2>Team Member Not Found</h2>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>
            No team member matching slug &quot;{slug}&quot; was found.
          </p>
          <Link href="/portal/member" className="btn-primary" style={{ textDecoration: "none" }}>
            Return to Member Portal
          </Link>
        </div>
      </div>
    );
  }

  const memberSlug = getEmployeeSlug(member);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link
              href="/portal/member"
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
              <FiArrowLeft /> All Member Portals
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiUser style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {member.name} &bull; Member Dashboard
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{memberSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                {member.department || "General"} Department
              </span>
              <span className={`status-tag ${member.status === "Paused" ? "open" : "resolved"}`} style={{ fontSize: "0.75rem" }}>
                {member.status || "Active"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Assigned Tasks</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {tasks.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Completed Tasks</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
              {tasks.filter((t) => t.status === "Completed").length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Work Submissions</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-purple, #a855f7)", marginTop: "4px" }}>
              {submissions.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Assigned Hardware</span>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-cyan, #06b6d4)", marginTop: "8px" }}>
              {assignedSystem ? assignedSystem.systemNumber : "None"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiCheckSquare /> My Assigned Tasks
            </h2>
            {tasks.length === 0 ? (
              <p style={{ color: "var(--text-muted, #64748b)" }}>No tasks assigned yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    style={{
                      background: selectedTask?.id === t.id ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selectedTask?.id === t.id ? "var(--accent-cyan, #06b6d4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: "10px",
                      padding: "1rem",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <span className={`status-badge badge-${t.status === "In Progress" ? "progress" : t.status === "Completed" ? "resolved" : "open"}`}>
                        {t.status}
                      </span>
                    </div>
                    {t.description && (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: "6px" }}>
                        {t.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiSend /> Submit Task Work
            </h2>
            {selectedTask ? (
              <form onSubmit={handleSubmitWork}>
                <div style={{ marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Selected Task:</span>
                  <div style={{ fontWeight: 700, color: "var(--accent-cyan, #06b6d4)" }}>{selectedTask.title}</div>
                </div>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label>Work Description / Notes</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe deliverables, commits, PR link..."
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label>Deliverable Link or File URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://github.com/... or cloud link"
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted, #64748b)" }}>
                <p>Select a task from the list on the left to submit work.</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiFileText /> My Work Submissions History
          </h2>
          {submissions.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No work submissions made yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 600 }}>{sub.task_id}</td>
                      <td>{sub.description}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
                        {new Date(sub.created_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`status-tag ${sub.status === "Approved" ? "resolved" : sub.status === "Rejected" ? "open" : "inprogress"}`}>
                          {sub.status || "Pending Approval"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
