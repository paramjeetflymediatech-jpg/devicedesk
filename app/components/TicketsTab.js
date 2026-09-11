"use client";

import React from "react";
import Link from "next/link";
import { FiLink } from "react-icons/fi";
import { getEmployeeSlug } from "../utils/slugUtils.js";

export default function TicketsTab({
  handleExportTicketsToExcel,
  ticketSearch,
  setTicketSearch,
  setTicketPage,
  ticketFilterStatus,
  setTicketFilterStatus,
  ticketFilterSeverity,
  setTicketFilterSeverity,
  currentAdminTickets,
  systems,
  employees,
  handleStartTicket,
  handleOpenResolveModal,
  totalAdminTicketPages,
  ticketPage
}) {
  return (
    <div className="page-section active">
      <div
        className="section-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Raise Records (All Tickets)</h2>
        <button
          onClick={handleExportTicketsToExcel}
          className="btn-action start"
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
        >
          Export Reports
        </button>
      </div>

      {/* Filters & Search */}
      <div className="filter-row">
        <div style={{ flexGrow: 1, minWidth: "250px", position: "relative" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by Employee, System, ID, Description..."
            value={ticketSearch}
            onChange={(e) => {
              setTicketSearch(e.target.value);
              setTicketPage(1);
            }}
            style={{ width: "100%", paddingRight: "35px" }}
          />
          {ticketSearch && (
            <button
              type="button"
              onClick={() => {
                setTicketSearch("");
                setTicketPage(1);
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
                padding: "4px",
                lineHeight: 1
              }}
            >
              &times;
            </button>
          )}
        </div>
        <div>
          <select
            className="form-control"
            value={ticketFilterStatus}
            onChange={(e) => {
              setTicketFilterStatus(e.target.value);
              setTicketPage(1);
            }}
            style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-primary)" }}
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <div>
          <select
            className="form-control"
            value={ticketFilterSeverity}
            onChange={(e) => {
              setTicketFilterSeverity(e.target.value);
              setTicketPage(1);
            }}
            style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-primary)" }}
          >
            <option value="all">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Table — Desktop */}
      <div className="table-wrapper desktop-only">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Date Logged</th>
              <th>Updated At</th>
              <th>Employee</th>
              <th>System</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Notes</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentAdminTickets.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  No tickets match your filters.
                </td>
              </tr>
            ) : (
              currentAdminTickets.map(ticket => {
                const sys = systems.find(s => s.id === ticket.systemId);
                const emp = employees.find(e => e.id === ticket.employeeId);
                const isOpen = ticket.status === "Open";
                const updatedDate = ticket.updatedAt || ticket.resolvedAt || ticket.startedAt || ticket.createdAt;
                return (
                  <tr key={ticket.id}>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ticket.id}</td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {new Date(ticket.createdAt).toLocaleDateString()}{" "}
                      {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", fontWeight: "600" }}>
                      {updatedDate
                        ? `${new Date(updatedDate).toLocaleDateString()} ${new Date(updatedDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "N/A"}
                    </td>
                    <td>
                      {emp ? (
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
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Unknown</span>
                      )}
                    </td>
                    <td style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>
                      {sys ? sys.systemNumber : "N/A"}
                    </td>
                    <td>{ticket.category}</td>
                    <td>
                      <span className={`status-tag ${ticket.severity.toLowerCase()}`}>{ticket.severity}</span>
                    </td>
                    <td>
                      <span className={`status-tag ${ticket.status.toLowerCase().replace(" ", "")}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                      title={ticket.notes || ""}
                    >
                      {ticket.notes || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>None</span>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        {isOpen ? (
                          <button className="btn-action start" onClick={() => handleStartTicket(ticket.id)}>
                            Start Work
                          </button>
                        ) : ticket.status === "In Progress" ? (
                          <button className="btn-action resolve" onClick={() => handleOpenResolveModal(ticket.id)}>
                            Resolve
                          </button>
                        ) : (
                          <span style={{ color: "var(--status-resolved)", fontSize: "0.85rem", fontWeight: "600" }}>
                            Resolved
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — Mobile */}
      <div className="mobile-card-list mobile-only">
        {currentAdminTickets.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
            No tickets match your filters.
          </p>
        ) : (
          currentAdminTickets.map(ticket => {
            const sys = systems.find(s => s.id === ticket.systemId);
            const emp = employees.find(e => e.id === ticket.employeeId);
            const isOpen = ticket.status === "Open";
            const updatedDate = ticket.updatedAt || ticket.resolvedAt || ticket.startedAt || ticket.createdAt;
            return (
              <div className="mobile-card" key={ticket.id}>
                <div className="mobile-card-header">
                  <span className="mobile-card-title">{emp ? emp.name : "Unknown"}</span>
                  <span className={`status-tag ${ticket.status.toLowerCase().replace(" ", "")}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">System</span>
                  <span className="mobile-card-value" style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                    {sys ? sys.systemNumber : "N/A"}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Employee</span>
                  <span className="mobile-card-value">
                    {emp ? (
                      <span>
                        {emp.name}{" "}
                        <Link
                          href={`/admin/users/${getEmployeeSlug(emp)}`}
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--accent-purple)",
                            textDecoration: "none",
                            marginLeft: "4px"
                          }}
                        >
                          (@{getEmployeeSlug(emp)})
                        </Link>
                      </span>
                    ) : (
                      "Unknown"
                    )}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Category</span>
                  <span className="mobile-card-value">{ticket.category}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Severity</span>
                  <span className="mobile-card-value">
                    <span className={`status-tag ${ticket.severity.toLowerCase()}`}>{ticket.severity}</span>
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Date Logged</span>
                  <span className="mobile-card-value" style={{ fontSize: "0.8rem" }}>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Updated At</span>
                  <span className="mobile-card-value" style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                    {updatedDate
                      ? `${new Date(updatedDate).toLocaleDateString()} ${new Date(updatedDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "N/A"}
                  </span>
                </div>
                {ticket.notes && (
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Notes</span>
                    <span className="mobile-card-value" style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
                      {ticket.notes}
                    </span>
                  </div>
                )}
                <div className="mobile-card-actions">
                  {isOpen ? (
                    <button className="btn-action start" onClick={() => handleStartTicket(ticket.id)}>
                      Start Work
                    </button>
                  ) : ticket.status === "In Progress" ? (
                    <button className="btn-action resolve" onClick={() => handleOpenResolveModal(ticket.id)}>
                      Resolve
                    </button>
                  ) : (
                    <span style={{ color: "var(--status-resolved)", fontWeight: 600, padding: "6px 0" }}>
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      {totalAdminTicketPages > 1 && (
        <div className="pagination-controls">
          <button
            className="btn-secondary"
            onClick={() => setTicketPage(prev => Math.max(prev - 1, 1))}
            disabled={ticketPage === 1}
            style={{
              padding: "6px 12px",
              opacity: ticketPage === 1 ? 0.5 : 1,
              cursor: ticketPage === 1 ? "not-allowed" : "pointer"
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Page {ticketPage} of {totalAdminTicketPages}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setTicketPage(prev => Math.min(prev + 1, totalAdminTicketPages))}
            disabled={ticketPage === totalAdminTicketPages}
            style={{
              padding: "6px 12px",
              opacity: ticketPage === totalAdminTicketPages ? 0.5 : 1,
              cursor: ticketPage === totalAdminTicketPages ? "not-allowed" : "pointer"
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
