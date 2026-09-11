'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FiGlobe, FiPlus, FiSearch, FiFilter, FiLink, FiEdit2, 
  FiTrash2, FiClock, FiAlertTriangle, FiCheckCircle, FiDollarSign, 
  FiMail, FiRefreshCw, FiExternalLink, FiCalendar, FiShield 
} from "react-icons/fi";
import { getDomainSlug } from "../../utils/slugUtils.js";

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, expiring_soon: 0, expired: 0, total_renewal_cost: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [checkingExpiry, setCheckingExpiry] = useState(false);
  const [alertSuccessMessage, setAlertSuccessMessage] = useState("");

  // Form State
  const initialForm = {
    domain_name: "",
    client_name: "",
    client_email: "",
    registrar: "GoDaddy",
    registration_date: "",
    expiry_date: "",
    auto_renew: false,
    renewal_cost: "15.99",
    notes: ""
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchDomains();
  }, [statusFilter]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (statusFilter !== "ALL") query.set("status", statusFilter);

      const res = await fetch(`/api/domains?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDomains(data.data || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDomains();
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (!formData.domain_name || !formData.expiry_date) {
        alert("Domain Name and Expiry Date are required.");
        return;
      }

      if (editingDomain) {
        // Update
        const res = await fetch(`/api/domains/${editingDomain.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
          setEditingDomain(null);
          setShowAddModal(false);
          setFormData(initialForm);
          fetchDomains();
        } else {
          alert(data.error || "Failed to update domain");
        }
      } else {
        // Create
        const res = await fetch("/api/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
          setShowAddModal(false);
          setFormData(initialForm);
          fetchDomains();
        } else {
          alert(data.error || "Failed to add domain");
        }
      }
    } catch (err) {
      alert("Error saving domain.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to remove domain "${name}" from tracking?`)) return;
    try {
      const res = await fetch(`/api/domains/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchDomains();
      } else {
        alert(data.error || "Failed to delete domain");
      }
    } catch (e) {
      alert("Error deleting domain");
    }
  };

  const handleTriggerExpiryCheck = async () => {
    setCheckingExpiry(true);
    setAlertSuccessMessage("");
    try {
      const res = await fetch("/api/domains/check-expiry", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAlertSuccessMessage(data.message || "Expiry alerts dispatched successfully!");
        fetchDomains();
        setTimeout(() => setAlertSuccessMessage(""), 6000);
      } else {
        alert(data.error || "Failed to run expiry check");
      }
    } catch (e) {
      alert("Error checking domain expiry");
    } finally {
      setCheckingExpiry(false);
    }
  };

  const openEditModal = (dom) => {
    setEditingDomain(dom);
    setFormData({
      domain_name: dom.domain_name || "",
      client_name: dom.client_name || "",
      client_email: dom.client_email || "",
      registrar: dom.registrar || "GoDaddy",
      registration_date: dom.registration_date || "",
      expiry_date: dom.expiry_date || "",
      auto_renew: Boolean(dom.auto_renew),
      renewal_cost: dom.renewal_cost || "0",
      notes: dom.notes || ""
    });
    setShowAddModal(true);
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FiGlobe style={{ color: "var(--accent-cyan, #06b6d4)" }} /> Domain Portfolio & Expiry Monitor
          </h1>
          <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", margin: "6px 0 0" }}>
            Manage client and corporate domains, track expiration dates, and automate pre-expiry alert dispatches.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleTriggerExpiryCheck}
            disabled={checkingExpiry}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiMail style={{ color: "#ec4899" }} /> {checkingExpiry ? "Checking Expiry..." : "Run Expiry Alert Scan"}
          </button>
          <button
            onClick={() => {
              setEditingDomain(null);
              setFormData(initialForm);
              setShowAddModal(true);
            }}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiPlus /> Add New Domain
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertSuccessMessage && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#10b981", padding: "12px 16px", borderRadius: "12px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <FiCheckCircle /> {alertSuccessMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Total Registered Domains</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan, #06b6d4)", marginTop: "4px" }}>
            {summary.total || 0}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Active Domains</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
            {summary.active || 0}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Expiring Soon (&le; 30 Days)</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
            {summary.expiring_soon || 0}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Expired Domains</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>
            {summary.expired || 0}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>Est. Renewal Value</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-purple, #a855f7)", marginTop: "4px" }}>
            ${Number(summary.total_renewal_cost || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: 1, maxWidth: "450px" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search domain name, client, registrar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-secondary">
            <FiSearch />
          </button>
        </form>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["ALL", "Active", "Expiring Soon", "Expired"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? "btn-primary" : "btn-secondary"}
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Domains Table */}
      <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
        <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
              <th style={{ padding: "14px 16px" }}>Domain Name</th>
              <th style={{ padding: "14px 16px" }}>Domain Slug</th>
              <th style={{ padding: "14px 16px" }}>Client / Owner</th>
              <th style={{ padding: "14px 16px" }}>Registrar</th>
              <th style={{ padding: "14px 16px" }}>Expiry Date</th>
              <th style={{ padding: "14px 16px" }}>Days Remaining</th>
              <th style={{ padding: "14px 16px" }}>Status</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((dom) => {
              const domSlug = getDomainSlug(dom);
              const daysLeft = dom.days_left;

              return (
                <tr key={dom.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                    <Link href={`/admin/domains/${domSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none" }}>
                      {dom.domain_name}
                    </Link>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <Link
                      href={`/admin/domains/${domSlug}`}
                      className="timer-badge"
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--accent-purple, #a855f7)",
                        borderColor: "rgba(168, 85, 247, 0.4)",
                        background: "rgba(168, 85, 247, 0.08)",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <FiLink style={{ fontSize: "0.65rem" }} /> @{domSlug}
                    </Link>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div>{dom.client_name || "Unassigned"}</div>
                    {dom.client_email && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>
                        {dom.client_email}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>
                    {dom.registrar || "GoDaddy"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem", fontWeight: 600 }}>
                    {dom.expiry_date}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {daysLeft !== null ? (
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: daysLeft < 0 ? "#ef4444" : daysLeft <= 30 ? "#f59e0b" : "#10b981"
                        }}
                      >
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft} days`}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      className={`status-tag ${
                        dom.status === "Active" ? "resolved" : dom.status === "Expiring Soon" ? "inprogress" : "open"
                      }`}
                      style={{ fontSize: "0.75rem" }}
                    >
                      {dom.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                      <Link
                        href={`/admin/domains/${domSlug}`}
                        className="btn-action start"
                        style={{ padding: "4px 8px", fontSize: "0.75rem", textDecoration: "none" }}
                      >
                        View &rarr;
                      </Link>
                      <button
                        onClick={() => openEditModal(dom)}
                        className="btn-action start"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        title="Edit Domain"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleDelete(dom.id, dom.domain_name)}
                        className="btn-action resolve"
                        style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#ef4444" }}
                        title="Delete Domain"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {domains.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted, #64748b)" }}>
                  {loading ? "Loading domain portfolio..." : "No domains found in the registry."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="modal-backdrop open" onClick={() => setShowAddModal(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div className="modal-content open" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "90%" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FiGlobe /> {editingDomain ? "Edit Domain Details" : "Register New Domain"}
              </h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateOrUpdate} style={{ padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Domain Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. flymediatech.com"
                    value={formData.domain_name}
                    onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Client / Owner Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Acme Corp"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Client Email (for Expiry Alerts)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. client@example.com"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Registrar</label>
                  <select
                    className="form-control"
                    value={formData.registrar}
                    onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                  >
                    <option value="GoDaddy">GoDaddy</option>
                    <option value="Namecheap">Namecheap</option>
                    <option value="Cloudflare">Cloudflare</option>
                    <option value="Hostinger">Hostinger</option>
                    <option value="AWS Route 53">AWS Route 53</option>
                    <option value="Google Domains">Google Domains</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Renewal Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="15.99"
                    value={formData.renewal_cost}
                    onChange={(e) => setFormData({ ...formData, renewal_cost: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Registration Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.registration_date}
                    onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="auto_renew"
                    checked={formData.auto_renew}
                    onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                  />
                  <label htmlFor="auto_renew" style={{ margin: 0, cursor: "pointer", fontSize: "0.85rem" }}>
                    Enable Auto-Renewal with Registrar
                  </label>
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Notes / Hosting Details</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="DNS pointers, nameservers, client contact details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingDomain ? "Save Changes" : "Register Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
