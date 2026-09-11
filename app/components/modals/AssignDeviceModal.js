"use client";

import React from "react";

export default function AssignDeviceModal({
  showAssignModal,
  setShowAssignModal,
  handleAssignSubmit,
  assigningEmp,
  assigningSysId,
  setAssigningSysId,
  systems
}) {
  if (!showAssignModal || !assigningEmp) return null;

  return (
    <div className={`modal-overlay ${showAssignModal ? "active" : ""}`}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Device Assignment</h3>
          <button className="modal-close" onClick={() => setShowAssignModal(false)}>
            &times;
          </button>
        </div>
        <form onSubmit={handleAssignSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            Assigning hardware device for employee:{" "}
            <strong style={{ color: "var(--accent-cyan)" }}>{assigningEmp.name}</strong>
          </div>

          <div className="form-group">
            <label>Select System Device</label>
            <select
              className="form-control"
              value={assigningSysId}
              onChange={(e) => setAssigningSysId(e.target.value)}
            >
              <option value="">-- Unassign All Devices --</option>
              {systems.map(sys => {
                if (!sys.assignedTo || sys.assignedTo === assigningEmp.id) {
                  return (
                    <option value={sys.id} key={sys.id}>
                      {sys.systemNumber} - {sys.cpu} ({sys.ram})
                    </option>
                  );
                }
                return null;
              })}
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
          >
            Confirm Assignment
          </button>
        </form>
      </div>
    </div>
  );
}
