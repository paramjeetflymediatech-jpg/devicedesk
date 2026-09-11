"use client";

import React from "react";
import Link from "next/link";
import { FiLink } from "react-icons/fi";
import { getEmployeeSlug } from "../../utils/slugUtils.js";

export default function DepartmentModals({
  selectedViewDept,
  setSelectedViewDept,
  deptModalTab,
  setDeptModalTab,
  employees,
  systems
}) {
  if (!selectedViewDept) return null;

  const deptEmployees = employees.filter(
    e => (e.department || "").toLowerCase() === selectedViewDept.toLowerCase()
  );
  const deptSystems = systems.filter(s => deptEmployees.some(e => e.id === s.assignedTo));

  return (
    <div className="modal-overlay active">
      <div className="modal-card" style={{ maxWidth: "800px", width: "95%" }}>
        <div className="modal-header">
          <h3 className="modal-title">🏢 {selectedViewDept} Department Details</h3>
          <button className="modal-close" onClick={() => setSelectedViewDept(null)}>
            &times;
          </button>
        </div>
        <div style={{ color: "var(--text-primary)", padding: "1rem 0" }}>
          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "10px",
              marginBottom: "15px"
            }}
          >
            <button
              onClick={() => setDeptModalTab("members")}
              className="btn-action start"
              style={{
                background: deptModalTab === "members" ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                color: deptModalTab === "members" ? "#fff" : "var(--text-secondary)",
                borderColor: deptModalTab === "members" ? "var(--accent-blue)" : "var(--border-color)",
                padding: "6px 12px",
                fontSize: "0.85rem"
              }}
            >
              👥 Team Members ({deptEmployees.length})
            </button>
            <button
              onClick={() => setDeptModalTab("devices")}
              className="btn-action start"
              style={{
                background: deptModalTab === "devices" ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                color: deptModalTab === "devices" ? "#fff" : "var(--text-secondary)",
                borderColor: deptModalTab === "devices" ? "var(--accent-blue)" : "var(--border-color)",
                padding: "6px 12px",
                fontSize: "0.85rem"
              }}
            >
              🖥️ Assigned Devices ({deptSystems.length})
            </button>
          </div>

          {/* Tab Content */}
          {deptModalTab === "members" ? (
            deptEmployees.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                No team members are currently assigned to the {selectedViewDept} department.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Assigned Devices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptEmployees.map(emp => {
                      const empSystems = systems.filter(s => s.assignedTo === emp.id);
                      return (
                        <tr key={emp.id}>
                          <td>
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
                          </td>
                          <td>{emp.email}</td>
                          <td>{emp.role}</td>
                          <td>
                            <span className={`status-tag ${emp.status === "Active" ? "resolved" : "open"}`}>
                              {emp.status || "Active"}
                            </span>
                          </td>
                          <td>
                            {empSystems.length > 0 ? (
                              empSystems.map(s => (
                                <span
                                  className="timer-badge"
                                  style={{
                                    color: "var(--accent-cyan)",
                                    borderColor: "var(--accent-cyan)",
                                    marginRight: "4px"
                                  }}
                                  key={s.id}
                                >
                                  {s.systemNumber}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : deptSystems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              No systems are currently assigned to team members in the {selectedViewDept} department.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>System Number</th>
                    <th>Model</th>
                    <th>Specs (CPU/RAM/GPU)</th>
                    <th>Assigned Team Member</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deptSystems.map(sys => {
                    const assignee = employees.find(e => e.id === sys.assignedTo);
                    return (
                      <tr key={sys.id}>
                        <td>
                          <strong style={{ color: "var(--accent-blue)" }}>{sys.systemNumber}</strong>
                        </td>
                        <td>{sys.model}</td>
                        <td>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            CPU: {sys.cpu} | RAM: {sys.ram} | GPU: {sys.gpu || "N/A"}
                          </div>
                        </td>
                        <td>{assignee ? `${assignee.name} (${assignee.email})` : "Unassigned"}</td>
                        <td>
                          <span
                            className={`status-tag ${
                              sys.status === "Active" ? "resolved" : "progress"
                            }`}
                          >
                            {sys.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", marginTop: "1rem" }}>
          <button className="btn-action start" onClick={() => setSelectedViewDept(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
