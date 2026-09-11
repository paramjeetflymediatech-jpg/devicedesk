"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getEmployees } from "../../store.js";
import { getEmployeeSlug } from "../../utils/slugUtils.js";
import { 
  FiTerminal, FiArrowLeft, FiCode, FiActivity, 
  FiLink, FiServer, FiLayers, FiCpu 
} from "react-icons/fi";

export default function DeveloperPortalsDirectory() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    setEmployees(getEmployees());
  }, []);

  const developers = employees.filter((e) =>
    (e.role || "").toLowerCase().includes("dev") ||
    (e.department || "").toLowerCase().includes("dev") ||
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
              <FiTerminal style={{ color: "var(--accent-purple, #a855f7)" }} /> Developer & Engineering Consoles
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "6px 0 0" }}>
              Access telemetry, background agent logs, system benchmarks, and developer controls.
            </p>
          </div>

          <Link href="/developer/dashboard" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FiServer /> Agent Dashboard
          </Link>
        </div>

        {/* Developers List */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiCode /> Developer Consoles
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* General Dev Console */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>Lead System Architect</span>
                <span className="status-tag resolved" style={{ fontSize: "0.7rem" }}>Engine Root</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                Full telemetry, API routes monitor, database migrations & agents.
              </p>
              <Link
                href="/portal/developer/dev-lead"
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
                <FiLink /> Open Console (@dev-lead)
              </Link>
            </div>

            {developers.map((dev) => {
              const slug = getEmployeeSlug(dev);
              return (
                <div key={dev.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{dev.name}</span>
                    <span className="status-tag inprogress" style={{ fontSize: "0.7rem" }}>{dev.role || "Developer"}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                    {dev.department || "Development"} &bull; {dev.email}
                  </p>
                  <Link
                    href={`/portal/developer/${slug}`}
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
