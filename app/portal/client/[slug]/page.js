"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiLayout, FiMessageSquare, FiFileText, FiClock, FiArrowLeft, FiLink, FiCheckCircle } from "react-icons/fi";
import ProjectChat from "../../../components/ProjectChat.js";

export default function ClientSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const allEmployees = getEmployees();
    const foundClient = findEmployeeBySlug(allEmployees, slug);
    setClient(foundClient);

    if (foundClient) {
      fetchProjects(foundClient.id);
    }
    setLoading(false);
  }, [slug]);

  const fetchProjects = async (clientId) => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading Client Portal...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2>Client Not Found</h2>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: "1rem 0 2rem" }}>
            No client matching slug &quot;{slug}&quot; was found.
          </p>
          <Link href="/portal/client" className="btn-primary" style={{ textDecoration: "none" }}>
            Return to Client Portal
          </Link>
        </div>
      </div>
    );
  }

  const clientSlug = getEmployeeSlug(client);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link
              href="/portal/client"
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
              <FiArrowLeft /> All Clients
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiLayout style={{ color: "var(--accent-cyan, #06b6d4)" }} /> {client.name} &bull; Client Portal
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="timer-badge" style={{ color: "var(--accent-purple, #a855f7)", borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}>
                <FiLink style={{ marginRight: "3px" }} /> @{clientSlug}
              </span>
              <span className="status-tag inprogress" style={{ fontSize: "0.75rem" }}>
                Client Account
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setActiveTab("overview")}
              className="btn-action start"
              style={{
                background: activeTab === "overview" ? "var(--accent-cyan, #06b6d4)" : "rgba(255,255,255,0.05)",
                color: activeTab === "overview" ? "#000" : "#fff"
              }}
            >
              <FiLayout /> Overview
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className="btn-action start"
              style={{
                background: activeTab === "chat" ? "var(--accent-cyan, #06b6d4)" : "rgba(255,255,255,0.05)",
                color: activeTab === "chat" ? "#000" : "#fff"
              }}
            >
              <FiMessageSquare /> Project Chat
            </button>
          </div>
        </div>

        {activeTab === "overview" ? (
          <div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiCheckCircle /> Active Projects & Deliverables
              </h2>
              {projects.length === 0 ? (
                <p style={{ color: "var(--text-muted, #64748b)" }}>No active projects under this client account.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
                  {projects.map((proj) => (
                    <div key={proj.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan, #06b6d4)", margin: "0 0 6px 0" }}>
                        {proj.name}
                      </h3>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "12px" }}>
                        {proj.description || "Full-stack web application development"}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="status-tag inprogress" style={{ fontSize: "0.7rem" }}>
                          {proj.status || "In Progress"}
                        </span>
                        <Link href={`/admin/projects/${proj.id}`} style={{ fontSize: "0.8rem", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none" }}>
                          View Details &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "1.5rem", minHeight: "500px" }}>
            <ProjectChat projectId={projects[0]?.id || "proj_general"} user={{ ...client, role: "client" }} />
          </div>
        )}
      </div>
    </div>
  );
}
