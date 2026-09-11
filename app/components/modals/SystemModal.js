"use client";

import React from "react";

export default function SystemModal({
  showSysModal,
  setShowSysModal,
  editingSys,
  setEditingSys,
  handleSaveSystemSubmit,
  empSearchQuery,
  setEmpSearchQuery,
  showSearchDropdown,
  setShowSearchDropdown,
  employees
}) {
  if (!showSysModal) return null;

  return (
    <div className={`modal-overlay ${showSysModal ? "active" : ""}`}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">
            {editingSys.id ? "Edit Hardware Details" : "Add Hardware System"}
          </h3>
          <button className="modal-close" onClick={() => setShowSysModal(false)}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSaveSystemSubmit}>
          <div className="form-group">
            <label>System Number</label>
            <input
              type="text"
              className="form-control"
              value={editingSys.systemNumber || ""}
              onChange={(e) => setEditingSys({ ...editingSys, systemNumber: e.target.value })}
              placeholder="e.g. SN15"
              required
            />
          </div>

          <div className="form-group">
            <label>Model / Motherboard</label>
            <input
              type="text"
              className="form-control"
              value={editingSys.model || ""}
              onChange={(e) => setEditingSys({ ...editingSys, model: e.target.value })}
              placeholder="e.g. MSI MS-7D48"
            />
          </div>

          <div className="modal-form-grid">
            <div className="form-group">
              <label>CPU Spec</label>
              <input
                type="text"
                className="form-control"
                value={editingSys.cpu || ""}
                onChange={(e) => setEditingSys({ ...editingSys, cpu: e.target.value })}
                placeholder="e.g. Core i5"
                required
              />
            </div>
            <div className="form-group">
              <label>Graphic Card (GPU)</label>
              <input
                type="text"
                className="form-control"
                value={editingSys.gpu || ""}
                onChange={(e) => setEditingSys({ ...editingSys, gpu: e.target.value })}
                placeholder="e.g. NVIDIA RTX 4060 / Integrated"
              />
            </div>
          </div>

          <div className="modal-form-grid">
            <div className="form-group">
              <label>RAM Installed</label>
              <input
                type="text"
                className="form-control"
                value={editingSys.ram || ""}
                onChange={(e) => setEditingSys({ ...editingSys, ram: e.target.value })}
                placeholder="e.g. 16 GB DDR4"
                required
              />
            </div>
          </div>

          <div className="modal-form-grid">
            <div className="form-group">
              <label>Storage Drive</label>
              <input
                type="text"
                className="form-control"
                value={editingSys.storage || ""}
                onChange={(e) => setEditingSys({ ...editingSys, storage: e.target.value })}
                placeholder="e.g. 512 GB SSD"
                required
              />
            </div>
            <div className="form-group">
              <label>Operating System</label>
              <input
                type="text"
                className="form-control"
                value={editingSys.os || ""}
                onChange={(e) => setEditingSys({ ...editingSys, os: e.target.value })}
                placeholder="e.g. Windows 11 Pro"
                required
              />
            </div>
          </div>

          <div className="form-group searchable-select-container">
            <label>Assigned Employee</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search & select employee..."
                value={empSearchQuery}
                onChange={(e) => {
                  setEmpSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                  if (!e.target.value) {
                    setEditingSys({ ...editingSys, assignedTo: null });
                  }
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSearchDropdown(false);
                  }, 250);
                }}
              />
              {editingSys.assignedTo && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSys({ ...editingSys, assignedTo: null });
                    setEmpSearchQuery("");
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
                    padding: "4px"
                  }}
                >
                  &times;
                </button>
              )}

              {showSearchDropdown && (
                <div className="searchable-select-dropdown">
                  <div
                    className="searchable-select-item"
                    onClick={() => {
                      setEditingSys({ ...editingSys, assignedTo: null });
                      setEmpSearchQuery("");
                      setShowSearchDropdown(false);
                    }}
                    style={{ fontStyle: "italic", color: "var(--text-secondary)" }}
                  >
                    -- Unassigned --
                  </div>
                  {employees
                    .filter(emp => (emp.name || "").toLowerCase().includes(empSearchQuery.toLowerCase()))
                    .map(emp => (
                      <div
                        key={emp.id}
                        className="searchable-select-item"
                        onClick={() => {
                          setEditingSys({ ...editingSys, assignedTo: emp.id });
                          setEmpSearchQuery(emp.name);
                          setShowSearchDropdown(false);
                        }}
                      >
                        <strong>{emp.name}</strong>{" "}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          ({emp.role} - {emp.department})
                        </span>
                      </div>
                    ))}
                  {employees.filter(emp =>
                    (emp.name || "").toLowerCase().includes(empSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div
                      className="searchable-select-item"
                      style={{ color: "var(--text-muted)", pointerEvents: "none" }}
                    >
                      No matching employees found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={editingSys.status || "Active"}
              onChange={(e) => setEditingSys({ ...editingSys, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Idle">Idle</option>
              <option value="In Repair">In Repair</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div className="form-group">
            <label>Remarks & Maintenance Notes</label>
            <textarea
              className="form-control"
              value={editingSys.remarks || ""}
              onChange={(e) => setEditingSys({ ...editingSys, remarks: e.target.value })}
              placeholder="Upgrade logs, repair dates..."
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
