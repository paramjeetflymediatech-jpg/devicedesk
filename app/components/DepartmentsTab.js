"use client";

import React from "react";
import Link from "next/link";
import { FiLink, FiExternalLink } from "react-icons/fi";
import { getDepartmentSlug } from "../utils/slugUtils.js";

export default function DepartmentsTab({
  departments,
  setDepartments,
  employees,
  newDeptName,
  setNewDeptName,
  deptError,
  setDeptError,
  addDepartment,
  deleteDepartment,
  getDepartments,
  user,
  playBeep,
  setSelectedViewDept,
  setDeptModalTab
}) {
  return (
    <div className="page-section active">
      <div className="section-header">
        <h2 style={{ fontSize: "1.4rem" }}>Department Settings</h2>
      </div>

      <div className="dashboard-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Add Department Form */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">Add Department</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newDeptName.trim()) return;
              const added = addDepartment(newDeptName, user?.name || "Admin");
              if (added) {
                setNewDeptName("");
                setDeptError("");
                setDepartments(getDepartments());
                if (playBeep) playBeep(600, 0.1);
              } else {
                setDeptError("Department already exists or name is invalid.");
                if (playBeep) playBeep(400, 0.2);
              }
            }}
          >
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Department Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Sales, Marketing, HR"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                required
              />
            </div>
            {deptError && (
              <div style={{ color: "var(--status-critical)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                ⚠️ {deptError}
              </div>
            )}
            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Add Department
            </button>
          </form>
        </div>

        {/* Departments List */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">Existing Departments</span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      No departments configured.
                    </td>
                  </tr>
                ) : (
                  departments.map(dept => {
                    const count = employees.filter(
                      e => e.department && e.department.toLowerCase() === dept.name.toLowerCase()
                    ).length;
                    const deptSlug = getDepartmentSlug(dept.name);

                    return (
                      <tr key={dept.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span
                              style={{ cursor: "pointer", color: "var(--accent-cyan)", textDecoration: "underline" }}
                              onClick={() => {
                                setSelectedViewDept(dept.name);
                                setDeptModalTab("members");
                              }}
                              title={`View details of ${dept.name} department`}
                            >
                              {dept.name}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              ({count} employees)
                            </span>
                            <Link
                              href={`/admin/departments/${deptSlug}`}
                              className="timer-badge"
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--accent-purple, #a855f7)",
                                borderColor: "rgba(168, 85, 247, 0.4)",
                                background: "rgba(168, 85, 247, 0.08)",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "2px 6px"
                              }}
                              title={`Go to /admin/departments/${deptSlug}`}
                            >
                              <FiLink style={{ fontSize: "0.6rem" }} /> @{deptSlug}
                            </Link>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                            <Link
                              href={`/admin/departments/${deptSlug}`}
                              className="btn-action start"
                              style={{ padding: "4px 8px", fontSize: "0.75rem", textDecoration: "none" }}
                            >
                              View Slug &rarr;
                            </Link>
                            <button
                              type="button"
                              className="btn-action resolve"
                              onClick={() => {
                                if (count > 0) {
                                  alert(
                                    `Cannot delete department "${dept.name}" because it is currently assigned to ${count} employee(s).`
                                  );
                                  if (playBeep) playBeep(400, 0.2);
                                  return;
                                }
                                if (confirm(`Are you sure you want to delete the department "${dept.name}"?`)) {
                                  deleteDepartment(dept.id, user?.name || "Admin");
                                  setDepartments(getDepartments());
                                  if (playBeep) playBeep(700, 0.1);
                                }
                              }}
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "var(--status-critical)",
                                borderColor: "var(--status-critical)"
                              }}
                            >
                              Remove
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
        </div>
      </div>
    </div>
  );
}
