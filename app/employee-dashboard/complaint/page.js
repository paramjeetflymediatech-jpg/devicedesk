"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getSystems, getTickets, getEmployees, createTicket } from "../../store";

export default function FileComplaintPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Form States
  const [category, setCategory] = useState("RAM/Speed");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const refreshData = () => {
    setSystems(getSystems());
    setTickets(getTickets());
    setEmployees(getEmployees());
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  if (!mounted || !user) return null;

  const activeSystems = systems.filter((s) => s.assignedTo === user.id);
  const empDetails = employees.find((e) => e.id === user.id) || user;
  const ticketLimit = empDetails.ticketLimit || 5;
  const employeeTickets = tickets.filter((t) => t.employeeId === user.id);
  const totalRaised = employeeTickets.length;
  const isLimitReached = totalRaised >= ticketLimit;

  const handleRaiseComplaint = (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (isLimitReached) {
      setFormError(`You have reached your ticket limit of ${ticketLimit} issues.`);
      return;
    }

    if (!description.trim()) {
      setFormError("Please describe the issue.");
      return;
    }

    // Default to first assigned system, or 'sys_none' if none
    const systemId = activeSystems.length > 0 ? activeSystems[0].id : "sys_none";

    createTicket(user.id, systemId, category, description, severity);
    setDescription("");
    setFormSuccess("Complaint ticket raised successfully!");
    refreshData();

    // Trigger a database sync event for other listening tabs/components
    if (typeof window !== "undefined") {
      const event = new CustomEvent("devicedesk_db_synced");
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto" }}>
      <div className="page-section active" style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
        <div className="emp-card">
          <h3 className="emp-card-title" style={{ color: "var(--accent-purple)" }}>
            🚨 File a Complaint / Raise Issue
          </h3>

          <form onSubmit={handleRaiseComplaint}>
            <div className="modal-form-grid">
              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  <option value="RAM/Speed">RAM/Speed</option>
                  <option value="Hardware">Hardware Failure</option>
                  <option value="OS/Crash">OS Crash/Lag</option>
                  <option value="Network">Wifi/Network</option>
                  <option value="Software">Software Install</option>
                </select>
              </div>
              <div className="form-group">
                <label>Severity Level</label>
                <select
                  className="form-control"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "0.5rem" }}>
              <label>Issue Description</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Describe your issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {formError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid var(--status-critical)",
                  color: "var(--status-critical)",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                  textAlign: "center"
                }}
              >
                {formError}
              </div>
            )}

            {formSuccess && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid var(--status-resolved)",
                  color: "var(--status-resolved)",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                  textAlign: "center"
                }}
              >
                {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isLimitReached}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                opacity: isLimitReached ? 0.5 : 1,
                cursor: isLimitReached ? "not-allowed" : "pointer"
              }}
            >
              File Ticket
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
