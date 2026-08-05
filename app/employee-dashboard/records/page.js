"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getTickets } from "../../store";
import { FiClipboard } from "react-icons/fi";

export default function MyRecordsPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const ticketsPerPage = 5; // raised to 5 for better layout since it's a dedicated page

  const refreshData = () => {
    setTickets(getTickets());
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  // Listen for database changes to keep sync
  useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener("devicedesk_db_synced", handleSync);
    return () => window.removeEventListener("devicedesk_db_synced", handleSync);
  }, []);

  if (!mounted || !user) return null;

  const employeeTickets = tickets.filter((t) => t.employeeId === user.id);

  // Filter based on search query
  const filteredTickets = employeeTickets.filter((ticket) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      ticket.id.toLowerCase().includes(query) ||
      ticket.category.toLowerCase().includes(query) ||
      ticket.severity.toLowerCase().includes(query) ||
      ticket.status.toLowerCase().includes(query) ||
      (ticket.description && ticket.description.toLowerCase().includes(query))
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto" }}>
      <div className="page-section active">
        <div className="emp-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiClipboard /> Your Raise Records (Past & Present)
          </h3>

          {employeeTickets.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "3rem 0" }}>
              No tickets raised yet.
            </p>
          ) : (
            <>
              {/* Search Field */}
              <div style={{ marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by ID, Category, Severity, Status, or Description..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--glass-border)",
                    padding: "10px",
                    borderRadius: "8px",
                    color: "var(--text-primary)"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {currentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "12px",
                      padding: "1.25rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>ID: {ticket.id}</span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          padding: "4px 8px",
                          borderRadius: "20px",
                          textTransform: "uppercase",
                          background:
                            ticket.status === "Resolved"
                              ? "rgba(16, 185, 129, 0.15)"
                              : ticket.status === "In Progress"
                              ? "rgba(59, 130, 246, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                          color:
                            ticket.status === "Resolved"
                              ? "var(--status-resolved)"
                              : ticket.status === "In Progress"
                              ? "var(--status-progress)"
                              : "var(--status-open)"
                        }}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <div style={{ marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginRight: "0.5rem" }}>Category:</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{ticket.category}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0.5rem" }}>|</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginRight: "0.5rem" }}>Severity:</span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color:
                            ticket.severity === "Critical" || ticket.severity === "High"
                              ? "var(--status-critical)"
                              : "var(--text-primary)"
                        }}
                      >
                        {ticket.severity}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                      {ticket.description}
                    </p>

                    {ticket.status === "Resolved" && ticket.notes && (
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.05)",
                          borderLeft: "3px solid var(--status-resolved)",
                          padding: "8px 12px",
                          borderRadius: "0 6px 6px 0",
                          fontSize: "0.85rem",
                          marginTop: "0.5rem"
                        }}
                      >
                        <strong style={{ color: "var(--status-resolved)" }}>IT Resolution Note:</strong> {ticket.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  className="pagination-controls"
                  style={{ paddingTop: "1rem", borderTop: "1px solid var(--glass-border)", marginTop: "1rem" }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.85rem",
                      opacity: currentPage === 1 ? 0.5 : 1,
                      cursor: currentPage === 1 ? "not-allowed" : "pointer"
                    }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.85rem",
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
