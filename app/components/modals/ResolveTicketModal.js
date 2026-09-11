"use client";

import React from "react";

export default function ResolveTicketModal({
  showResolveModal,
  setShowResolveModal,
  handleResolveTicketSubmit,
  resolveNotes,
  setResolveNotes
}) {
  if (!showResolveModal) return null;

  return (
    <div className={`modal-overlay ${showResolveModal ? "active" : ""}`}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Resolve Complaint Ticket</h3>
          <button className="modal-close" onClick={() => setShowResolveModal(false)}>
            &times;
          </button>
        </div>
        <form onSubmit={handleResolveTicketSubmit}>
          <div className="form-group">
            <label>IT Resolution & Repair Notes</label>
            <textarea
              className="form-control"
              rows="4"
              placeholder="Describe the fix (e.g. Upgraded RAM, reinstalled drivers...)"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              required
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "5px" }}>
              💡 Typing &quot;RAM&quot; in the notes will automatically update the system specs in the Hardware Directory.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
          >
            Mark as Fixed & Log Time
          </button>
        </form>
      </div>
    </div>
  );
}
