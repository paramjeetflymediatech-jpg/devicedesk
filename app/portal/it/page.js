"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getEmployees, getSystems, getTickets } from "../../store.js";
import { getEmployeeSlug, getSystemSlug } from "../../utils/slugUtils.js";
import { 
  FiCpu, FiArrowLeft, FiCheckCircle, FiTool, FiLayers, 
  FiLink, FiAlertCircle, FiMonitor 
} from "react-icons/fi";

export default function ITPortalsDirectory() {
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    setEmployees(getEmployees());
    setSystems(getSystems());
    setTickets(getTickets());
  }, []);

  const itEngineers = employees.filter((e) =>
    (e.role || "").toLowerCase().includes("it") ||
    (e.role || "").toLowerCase().includes("engineer") ||
    (e.department || "").toLowerCase().includes("it") ||
    (e.role || "").toLowerCase().includes("admin")
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--accent-cyan, #06b6d4)",
                textDecoration: "none",
                fontSize: "0.85rem",
                marginBottom: "8px"
              }}
            >
              <FiArrowLeft /> Back to Workspace
            </Link>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiCpu style={{ color: "#38bdf8" }} /> IT Support & Hardware Infrastructure
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "6px 0 0" }}>
              Select an IT engineer to access system allocations, hardware specs, and support ticket queues.
            </p>
          </div>

          <Link href="/portal/admin" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FiLayers /> Admin Console
          </Link>
        </div>

        {/* IT Engineers List */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiTool /> IT Support Engineers
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* General IT Helpdesk */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>IT Support Desk</span>
                <span className="status-tag resolved" style={{ fontSize: "0.7rem" }}>Helpdesk Root</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                Central hardware inventory, active troubleshooting tickets and system maintenance.
              </p>
              <Link
                href="/portal/it/it-engineer"
                className="btn-secondary"
                style={{
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                <FiLink /> Open Console (@it-engineer)
              </Link>
            </div>

            {itEngineers.map((eng) => {
              const slug = getEmployeeSlug(eng);
              return (
                <div key={eng.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{eng.name}</span>
                    <span className="status-tag inprogress" style={{ fontSize: "0.7rem" }}>{eng.role || "IT Engineer"}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                    {eng.department || "IT Support"} &bull; {eng.email}
                  </p>
                  <Link
                    href={`/portal/it/${slug}`}
                    className="btn-secondary"
                    style={{
                      textDecoration: "none",
                      fontSize: "0.8rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%",
                      justifyContent: "center"
                    }}
                  >
                    <FiLink /> Open Console (@{slug})
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
