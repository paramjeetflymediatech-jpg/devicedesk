'use client';
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiFolder, FiArrowLeft, FiLink, FiLayers, FiUsers, FiPlus } from "react-icons/fi";

export default function AdminProjectsSlugPage() {
  const params = useParams();
  const slug = params?.slug ? String(params.slug) : "";

  const [project, setProject] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectData();
    fetchDropdownData();
  }, [slug]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const projRes = await fetch("/api/projects");
      const projData = await projRes.json();
      if (projData.success) {
        const found = (projData.data || []).find(
          (p) => p.id === slug || (p.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug
        );
        const resolvedProj = found || { id: slug, name: "Project " + slug, status: "Active" };
        setProject(resolvedProj);

        if (resolvedProj.id) {
          const deptRes = await fetch(`/api/projects/${resolvedProj.id}/departments`);
          const deptData = await deptRes.json();
          if (deptData.success) setDepartments(deptData.data || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/employees")
      ]);
      const deptData = await deptRes.json();
      const empData = await empRes.json();
      if (deptData.success) setAllDepartments(deptData.data || []);
      if (empData.success) setEmployees(empData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    if (!selectedDept || !project?.id) return alert("Select a department");

    try {
      const res = await fetch(`/api/projects/${project.id}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department_id: selectedDept, team_leader_id: selectedLeader })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDept("");
        setSelectedLeader("");
        fetchProjectData();
      } else {
        alert(data.error || "Failed to assign department");
      }
    } catch (err) {
      alert("Error assigning department");
    }
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Project...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <Link href="/admin/projects" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
          <FiArrowLeft /> All Projects
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0 0 1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <FiFolder style={{ color: "#6366f1" }} /> {project?.name || slug} &bull; Project Console
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
          {/* Assign Department */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Assign Department</h2>
            <form onSubmit={handleAssignDepartment}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "4px" }}>Department</label>
                <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} required className="form-control" style={{ width: "100%" }}>
                  <option value="">Select...</option>
                  {allDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "4px" }}>Team Leader (Optional)</label>
                <select value={selectedLeader} onChange={(e) => setSelectedLeader(e.target.value)} className="form-control" style={{ width: "100%" }}>
                  <option value="">None</option>
                  {employees.filter((e) => (e.role || "").includes("leader") || (e.role || "").includes("Admin")).map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%" }}>Assign Department</button>
            </form>
          </div>

          {/* Assigned Departments */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Assigned Project Units</h2>
            {departments.length === 0 ? (
              <p style={{ color: "var(--text-muted, #64748b)" }}>No departments assigned yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {departments.map((d) => (
                  <div key={d.id || d.department_id} style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{d.department_name || d.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Lead: {d.team_leader_name || "Unassigned"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
