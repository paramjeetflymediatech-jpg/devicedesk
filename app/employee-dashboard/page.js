"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import {
  getSystems,
  getTickets,
  getEmployees,
  getAssignmentHistory,
  createTicket
} from "../store";

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Redirect if not authenticated or not an employee
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (user.role === "admin") {
      router.push("/");
    }
  }, [user, router]);

  // States
  const [currentView, setCurrentView] = useState("overview"); // overview, file-complaint, records
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  
  // Complaint Form States
  const [category, setCategory] = useState("RAM/Speed");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 3;
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const refreshData = () => {
    setSystems(getSystems());
    setTickets(getTickets());
    setEmployees(getEmployees());
    setAssignmentHistory(getAssignmentHistory());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('devicedesk_db_synced', refreshData);
    return () => {
      window.removeEventListener('devicedesk_db_synced', refreshData);
    };
  }, []);

  if (!user || user.role === "admin") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading session...</p>
      </div>
    );
  }

  // Get current employee details
  const empDetails = employees.find(e => e.id === user.id) || { name: user.name, ticketLimit: 5 };
  const employeeTickets = tickets.filter(t => t.employeeId === user.id);
  const activeSystems = systems.filter(s => s.assignedTo === user.id);
  const empHistory = assignmentHistory.filter(h => h.employeeId === user.id);

  // Filtered employee tickets
  const filteredTickets = employeeTickets.filter(t => {
    const query = searchQuery.toLowerCase();
    return t.category.toLowerCase().includes(query) ||
           t.severity.toLowerCase().includes(query) ||
           t.status.toLowerCase().includes(query) ||
           t.description.toLowerCase().includes(query) ||
           t.id.toLowerCase().includes(query);
  });

  // Paginated tickets calculation
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  // Issue raising limits
  const totalRaised = employeeTickets.length;
  const ticketLimit = empDetails.ticketLimit || 5;
  const remainingTickets = Math.max(0, ticketLimit - totalRaised);
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

    // Default to first assigned system, or 'sys_generic' if none
    const systemId = activeSystems.length > 0 ? activeSystems[0].id : "sys_none";

    createTicket(user.id, systemId, category, description, severity);
    setDescription("");
    setFormSuccess("Complaint ticket raised successfully!");
    setCurrentPage(1); // reset to page 1 to see the new ticket
    refreshData();
  };

  return (
    <div style={{ display: "contents" }}>
      {/* Sidebar Navigation (Desktop) */}
      <aside className="sidebar">
        <div className="logo-container">
          <img
            src="/flymedia-logo-white.png"
            alt="Fly Media Technology"
            style={{ height: "36px", objectFit: "contain" }}
          />
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ul className="nav-links">
            <li className={`nav-item ${currentView === "overview" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("overview")}><span className="nav-icon">📊</span> Overview</button>
            </li>
            <li className={`nav-item ${currentView === "file-complaint" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("file-complaint")}><span className="nav-icon">🚨</span> File Complaint</button>
            </li>
            <li className={`nav-item ${currentView === "records" ? "active" : ""}`}>
              <button onClick={() => setCurrentView("records")}><span className="nav-icon">📋</span> My Records</button>
            </li>
          </ul>
          
          <div className="role-badge-container">
            <span className="role-title">Logged in as</span>
            <div style={{ padding: "8px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "10px", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-cyan)" }}>{empDetails.name}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{empDetails.department || "General"}</span>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                style={{ padding: "6px", fontSize: "0.75rem", width: "100%", cursor: "pointer", border: "1px solid var(--glass-border)", borderRadius: "6px" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* ── Mobile Hamburger Drawer ── */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <img src="/flymedia-logo-white.png" alt="Fly Media Technology" style={{ height: "32px", objectFit: "contain" }} />
          <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        </div>
        <div style={{ padding: "0.5rem 0 1rem", borderBottom: "1px solid var(--glass-border)", marginBottom: "0.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Logged in as</p>
          <p style={{ fontWeight: "600", color: "var(--accent-cyan)" }}>{empDetails.name}</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{empDetails.department || "General"}</p>
        </div>
        <nav className="mobile-drawer-nav">
          <button className={`mobile-drawer-item ${currentView === "overview" ? "active" : ""}`}
            onClick={() => { setCurrentView("overview"); setMobileMenuOpen(false); }}>
            <span>📊</span> Overview
          </button>
          <button className={`mobile-drawer-item ${currentView === "file-complaint" ? "active" : ""}`}
            onClick={() => { setCurrentView("file-complaint"); setMobileMenuOpen(false); }}>
            <span>🚨</span> File Complaint
          </button>
          <button className={`mobile-drawer-item ${currentView === "records" ? "active" : ""}`}
            onClick={() => { setCurrentView("records"); setMobileMenuOpen(false); }}>
            <span>📋</span> My Records
          </button>
        </nav>
        <div className="mobile-drawer-footer">
          <button className="mobile-drawer-logout" onClick={() => { logout(); router.push("/login"); }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main Container Wrapper */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
          <div className="header-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/flymedia-logo-white.png"
              alt="Fly Media Technology"
              style={{ height: "28px", objectFit: "contain" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="mobile-logout-btn"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#ef4444",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "var(--font-main)",
                whiteSpace: "nowrap",
                display: "none"
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Container */}
        <div className="page-container emp-container">
          
          {/* VIEW: OVERVIEW */}
          {currentView === "overview" && (
            <div className="page-section active emp-overview-grid">
              
              {/* Active System Details */}
              <div className="emp-card">
                <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                  🖥️ Assigned System Info
                </h3>
                {activeSystems.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No hardware system assigned to you at the moment.</p>
                ) : (
                  activeSystems.map(sys => (
                    <div key={sys.id} className="emp-system-grid">
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>System Number:</span>
                        <p style={{ fontWeight: "600", color: "var(--accent-cyan)", fontSize: "1.1rem" }}>{sys.systemNumber}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Model:</span>
                        <p style={{ fontWeight: "600" }}>{sys.model}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>CPU:</span>
                        <p style={{ fontWeight: "600" }}>{sys.cpu}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>RAM:</span>
                        <p style={{ fontWeight: "600" }}>{sys.ram}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Storage:</span>
                        <p style={{ fontWeight: "600" }}>{sys.storage}</p>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>OS:</span>
                        <p style={{ fontWeight: "600" }}>{sys.os}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Limits and history stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                
                {/* Complaint limits */}
                <div className="emp-card">
                  <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                    📊 Complaint Limits
                  </h3>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                    <span>Tickets Raised:</span>
                    <span style={{ fontWeight: "700" }}>{totalRaised} / {ticketLimit}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ height: "10px", width: "100%", background: "rgba(0,0,0,0.3)", borderRadius: "5px", overflow: "hidden", marginBottom: "1rem", border: "1px solid var(--glass-border)" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (totalRaised / ticketLimit) * 100)}%`,
                        background: isLimitReached 
                          ? "var(--status-critical)" 
                          : "linear-gradient(to right, var(--accent-cyan), var(--accent-purple))",
                        borderRadius: "5px",
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>
                  
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {isLimitReached 
                      ? "⚠️ You have reached your issue limits. Please contact IT support to extend your limit if necessary."
                      : `You can raise ${remainingTickets} more complaint ticket(s) before reaching your limit.`
                    }
                  </p>
                </div>

                {/* System Change history */}
                <div className="emp-card" style={{ maxHeight: "300px", overflowY: "auto" }}>
                  <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                    🔄 System Assignment History
                  </h3>
                  {empHistory.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.9rem" }}>No assignment logs found.</p>
                  ) : (
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {empHistory.map(h => (
                        <li key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "start", fontSize: "0.85rem", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                          <div>
                            <span style={{
                              color: h.action.includes("Assigned") ? "var(--status-resolved)" : "var(--status-critical)",
                              fontWeight: "600",
                              marginRight: "0.5rem"
                            }}>
                              {h.action}
                            </span>
                            <span>System: <strong>{h.systemNumber}</strong></span>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {new Date(h.timestamp).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: FILE COMPLAINT */}
          {currentView === "file-complaint" && (
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
                    <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--status-critical)", color: "var(--status-critical)", padding: "10px", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--status-resolved)", color: "var(--status-resolved)", padding: "10px", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>
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
          )}

          {/* VIEW: MY RECORDS */}
          {currentView === "records" && (
            <div className="page-section active">
              <div className="emp-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 className="emp-card-title" style={{ color: "var(--accent-cyan)" }}>
                  📋 Your Raise Records (Past & Present)
                </h3>
                
                {employeeTickets.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "3rem 0" }}>No tickets raised yet.</p>
                ) : (
                  <>
                    {/* Search Field */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by ID, Category, Severity, Status, or Description..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--glass-border)", padding: "10px", borderRadius: "8px", color: "var(--text-primary)" }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {currentTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid var(--glass-border)",
                            borderRadius: "12px",
                            padding: "1.25rem",
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
                                  ticket.status === "Resolved" ? "rgba(16, 185, 129, 0.15)" :
                                  ticket.status === "In Progress" ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color:
                                  ticket.status === "Resolved" ? "var(--status-resolved)" :
                                  ticket.status === "In Progress" ? "var(--status-progress)" : "var(--status-open)"
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
                            <span style={{
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              color: 
                                ticket.severity === "Critical" || ticket.severity === "High" 
                                  ? "var(--status-critical)" : "var(--text-primary)"
                            }}>{ticket.severity}</span>
                          </div>

                          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>{ticket.description}</p>
                          
                          {ticket.status === "Resolved" && ticket.notes && (
                            <div style={{ background: "rgba(16, 185, 129, 0.05)", borderLeft: "3px solid var(--status-resolved)", padding: "8px 12px", borderRadius: "0 6px 6px 0", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                              <strong style={{ color: "var(--status-resolved)" }}>IT Resolution Note:</strong> {ticket.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="pagination-controls" style={{ paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          style={{ padding: "6px 12px", fontSize: "0.85rem", opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                        >
                          ← Previous
                        </button>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          style={{ padding: "6px 12px", fontSize: "0.85rem", opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
