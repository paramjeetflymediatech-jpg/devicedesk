"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees, getTasks, getDepartments } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiUser, FiArrowLeft, FiCheckCircle, FiClock, FiFileText, FiUsers, FiLink, FiCheck, FiX, FiLayers } from "react-icons/fi";

export default function TeamLeaderSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departmentMembers, setDepartmentMembers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [departmentTasks, setDepartmentTasks] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const allEmployees = getEmployees();
    const foundLeader = findEmployeeBySlug(allEmployees, slug);
    setLeader(foundLeader);

    if (foundLeader) {
      const dept = (foundLeader.department || "").toLowerCase();
      const members = allEmployees.filter(
        (e) => (e.department || "").toLowerCase() === dept
      );
      setDepartmentMembers(members);

      const allTasks = getTasks();
      const deptTasks = allTasks.filter(
        (t) =>
          members.some((m) => m.id === t.assignedToId || m.name === t.assignedToName) ||
          (t.department || "").toLowerCase() === dept
      );
      setDepartmentTasks(deptTasks);

      fetchSubmissions();
    }
    setLoading(false);
  }, [slug]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/work-submissions");
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedSub || !leader) return;

    setActionLoading(true);
    try {
      const res = await fetch(, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_status: newStatus,
          comment,
          changed_by: leader.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setComment("");
        setSelectedSub(null);
        fetchSubmissions();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      alert("Error updating status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Team Leader Dashboard...</p>
      </div>
    );
  }

  if (!leader) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2>Team Leader Not Found</h2>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>
            No team leader matching slug &quot;{slug}&quot; was found.
          </p>
          <Link href="/portal/leader" className="btn-primary" style={{ textDecoration: "none" }}>
            Return to Leader Portal
          </Link>
        </div>
      </div>
    );
  }

  const leaderSlug = getEmployeeSlug(leader);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Navigation / Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link
              href="/portal/leader"
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
              <FiArrowLeft /> All Leader Portals
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiUsers style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {leader.name} &bull; Team Leader Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{leaderSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                {leader.department || "General"} Department
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Department Members</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
              {departmentMembers.length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Tasks</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-purple, #a855f7)", marginTop: "4px" }}>
              {departmentTasks.filter((t) => t.status !== "Completed").length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "14px", padding: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Submissions Pending</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
              {submissions.filter((s) => s.status === "Pending Approval").length}
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiUsers /> Team Members in {leader.department || "Department"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {departmentMembers.map((member) => {
              const memSlug = getEmployeeSlug(member);
              return (
                <div key={member.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{member.name}</div>
                    <Link
                      href={}
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--accent-purple, #a855f7)",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        marginTop: "2px"
                      }}
                      title={[m[m[0m[H[2J[24;1H"member" [New][2;1H[1m[34m~                                                                               [3;1H~                                                                               [4;1H~                                                                               [5;1H~                                                                               [6;1H~                                                                               [7;1H~                                                                               [8;1H~                                                                               [9;1H~                                                                               [10;1H~                                                                               [11;1H~                                                                               [12;1H~                                                                               [13;1H~                                                                               [14;1H~                                                                               [15;1H~                                                                               [16;1H~                                                                               [17;1H~                                                                               [18;1H~                                                                               [19;1H~                                                                               [20;1H~                                                                               [21;1H~                                                                               [22;1H~                                                                               [23;1H~                                                                               [1;1H[24;1H[0mVim: Error reading input, exiting...
Vim: Finished.
[24;1H
3 files to edit}
                    >
                      <FiLink style={{ fontSize: "0.65rem" }} /> @{memSlug}
                    </Link>
                  </div>
                  <span className={} style={{ fontSize: "0.7rem" }}>
                    {member.role || "Member"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submissions Queue */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiCheckCircle /> Work Submissions for Review
          </h2>
          {submissions.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)" }}>No work submissions logged yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Task / Project</th>
                    <th>Submitted By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const submitter = departmentMembers.find((m) => m.id === sub.submitted_by) || { name: sub.submitted_by || "Member" };
                    const subSlug = getEmployeeSlug(submitter);

                    return (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{sub.task_id || "General Task"}</div>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>
                            {sub.description || "No description"}
                          </span>
                        </td>
                        <td>
                          <div>{submitter.name}</div>
                          {submitter.id && (
                            <Link href={} style={{ fontSize: "0.72rem", color: "var(--accent-purple, #a855f7)", textDecoration: "none" }}>
                              @{subSlug}
                            </Link>
                          )}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
                          {new Date(sub.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={}>
                            {sub.status || "Pending Approval"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => { setSelectedSub(sub); handleUpdateStatus("Approved"); }}
                              className="btn-action start"
                              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            >
                              <FiCheck /> Approve
                            </button>
                            <button
                              onClick={() => { setSelectedSub(sub); handleUpdateStatus("Rejected"); }}
                              className="btn-action resolve"
                              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            >
                              <FiX /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
