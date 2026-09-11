"use client";

import React from "react";

export default function EmployeePortalTab({
  handleComplaintSubmit,
  portalEmployeeId,
  handlePortalEmployeeChange,
  employees,
  portalSystemId,
  setPortalSystemId,
  systems,
  portalCategory,
  setPortalCategory,
  portalSeverity,
  setPortalSeverity,
  portalDesc,
  setPortalDesc
}) {
  return (
    <div className="page-section active">
      <div className="mobile-device-frame">
        <div className="complaint-card">
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>IT Desk Complaint Box</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Report a hardware or software issue with your system.
            </p>
          </div>

          <form onSubmit={handleComplaintSubmit}>
            <div className="form-group">
              <label>My Name</label>
              <select
                className="form-control"
                value={portalEmployeeId}
                onChange={(e) => handlePortalEmployeeChange(e.target.value)}
                required
              >
                <option value="">-- Choose Your Name --</option>
                {employees.map(emp => (
                  <option value={emp.id} key={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>My Assigned System</label>
              <select
                className="form-control"
                value={portalSystemId}
                onChange={(e) => setPortalSystemId(e.target.value)}
                required
                disabled={!portalEmployeeId}
              >
                <option value="">
                  {portalEmployeeId ? "-- Select System --" : "-- Select Team Member First --"}
                </option>
                {portalEmployeeId &&
                  (() => {
                    const assigned = systems.filter(s => s.assignedTo === portalEmployeeId);
                    if (assigned.length === 0) {
                      return (
                        <>
                          <option value="">No system assigned. Choose other:</option>
                          {systems.map(s => (
                            <option value={s.id} key={s.id}>
                              {s.systemNumber} - ({s.cpu})
                            </option>
                          ))}
                        </>
                      );
                    }
                    return assigned.map(s => (
                      <option value={s.id} key={s.id}>
                        {s.systemNumber} - {s.model}
                      </option>
                    ));
                  })()}
              </select>
            </div>

            <div className="form-group">
              <label>Issue Category</label>
              <select
                className="form-control"
                value={portalCategory}
                onChange={(e) => setPortalCategory(e.target.value)}
                required
              >
                <option value="RAM/Speed">System Slow / Lagging (RAM/CPU)</option>
                <option value="Hardware">Physical Hardware Fault (Keyboard/Mouse/SSD)</option>
                <option value="Display">Monitor / Screen Flickering</option>
                <option value="Network">Internet / Wi-Fi Connection</option>
                <option value="Software">Software Crash / License Expired</option>
                <option value="Other">Other Issues</option>
              </select>
            </div>

            <div className="form-group">
              <label>Issue Severity</label>
              <select
                className="form-control"
                value={portalSeverity}
                onChange={(e) => setPortalSeverity(e.target.value)}
                required
              >
                <option value="Low">Low - Cosmetic issue, system usable</option>
                <option value="Medium">Medium - Distracting issue, work delayed</option>
                <option value="High">High - Major blocker, critical apps failing</option>
                <option value="Critical">Critical - System crash, unable to work</option>
              </select>
            </div>

            <div className="form-group">
              <label>Problem Description</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Provide details..."
                value={portalDesc}
                onChange={(e) => setPortalDesc(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
            >
              🚨 Send IT Complaint
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
