"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth/AuthContext";
import { getEmployees, getTickets } from "../store";
import ThemeToggle from "../components/ThemeToggle.js";
import Logo from "../components/Logo.js";
import {
  FiGrid,
  FiServer,
  FiUsers,
  FiTag,
  FiBriefcase,
  FiFileText,
  FiCheckSquare,
  FiClock,
  FiMessageSquare,
  FiUser,
  FiAlertTriangle,
  FiLogOut,
  FiEye,
  FiShield,
  FiCalendar,
  FiFolder,
  FiTrendingUp,
  FiLayers,
  FiTrash2
} from "react-icons/fi";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaveCount, setLeaveCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    setEmployees(getEmployees());
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leave/list?status=Pending");
      const data = await res.json();
      if (data.success) {
        setLeaveCount((data.data || []).length);
      }
    } catch (e) {}
  };

  // Sync unread chat count
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devicedesk_unread_chat_count");
      if (stored) setUnreadChatCount(Number(stored));

      const handleUnreadChange = (e) => {
        setUnreadChatCount(Number(e.detail || 0));
      };

      window.addEventListener("devicedesk_unread_chat_changed", handleUnreadChange);
      return () => {
        window.removeEventListener("devicedesk_unread_chat_changed", handleUnreadChange);
      };
    }
  }, []);

  // Auth check
  useEffect(() => {
    if (mounted) {
      if (!user) {
        router.push("/login");
      }
    }
  }, [user, mounted, router]);

  // Handle body click to close profile dropdown
  useEffect(() => {
    const handleBodyClick = () => {
      setUserDropdownOpen(false);
    };
    window.addEventListener("click", handleBodyClick);
    return () => window.removeEventListener("click", handleBodyClick);
  }, []);

  if (!mounted || !user) {
    return null;
  }

  const empDetails = employees.find((e) => e.id === user?.id) || user || {};

  const renderProfileAvatar = (emp, size = "24px") => {
    const getInitials = (name) => {
      if (!name) return "AD";
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    };

    if (emp?.avatarUrl) {
      return (
        <img
          src={emp.avatarUrl}
          alt={emp.name}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover"
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          fontSize: size === "24px" ? "0.7rem" : "1rem",
          color: "#000"
        }}
      >
        {getInitials(emp?.name || "Admin")}
      </div>
    );
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: <FiGrid />, exact: true },
    { name: "Systems Inventory", path: "/admin/systems", icon: <FiServer /> },
    { name: "Team Member Directory", path: "/admin/users", icon: <FiUsers /> },
    { name: "Raise Records", path: "/admin/tickets", icon: <FiTag /> },
    { name: "Departments", path: "/admin/departments", icon: <FiBriefcase /> },
    { name: "System Logs & Audit", path: "/admin/audit-logs", icon: <FiFileText /> },
    { name: "Task Board", path: "/admin/tasks", icon: <FiCheckSquare /> },
    { name: "Attendance", path: "/admin/attendance", icon: <FiClock /> },
    { name: "Activity Screenshots", path: "/?tab=screenshots", icon: <FiEye /> },
    {
      name: "Chat Workspace",
      path: "/?tab=chat",
      icon: <FiMessageSquare />,
      badge: unreadChatCount
    },
    {
      name: "Leave Requests",
      path: "/admin/leaves",
      icon: <FiCalendar />,
      badge: leaveCount
    },
    { name: "Projects", path: "/admin/projects", icon: <FiFolder /> },
    { name: "Marketing", path: "/admin/marketing", icon: <FiTrendingUp /> },
    { name: "Work Submissions", path: "/admin/submissions", icon: <FiLayers /> },
    { name: "My Profile", path: "/?tab=profile", icon: <FiUser /> }
  ];

  const isNavActive = (item) => {
    if (item.exact) return pathname === "/admin" || pathname === "/";
    return pathname.startsWith(item.path);
  };

  return (
    <div style={{ display: "contents" }}>
      {/* Sidebar Navigation (Desktop) */}
      <aside className="sidebar">
        <div className="logo-container">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo height="36px" />
          </Link>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
          <ul className="nav-links">
            {navItems.map((item) => {
              const active = isNavActive(item);
              return (
                <li key={item.name} className={`nav-item ${active ? "active" : ""}`}>
                  <Link href={item.path} style={{ display: "flex", alignItems: "center", width: "100%", textDecoration: "none" }}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.name}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        style={{
                          background: "var(--status-critical)",
                          color: "#fff",
                          borderRadius: "50%",
                          padding: "2px 6px",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          marginLeft: "auto"
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <FiLogOut style={{ fontSize: "1.1rem" }} /> Sign Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <Logo height="32px" />
          <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>
            ✕
          </button>
        </div>
        <div style={{ padding: "0.5rem 0 1rem", borderBottom: "1px solid var(--glass-border)", marginBottom: "0.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Logged in as</p>
          <p style={{ fontWeight: "600", color: "var(--accent-cyan)" }}>{empDetails.name}</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{empDetails.role || "Administrator"}</p>
        </div>
        <nav className="mobile-drawer-nav">
          {navItems.map((item) => {
            const active = isNavActive(item);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`mobile-drawer-item ${active ? "active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textDecoration: "none" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "inline-flex" }}>{item.icon}</span>
                  {item.name}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      background: "var(--status-critical)",
                      color: "#fff",
                      borderRadius: "50%",
                      padding: "2px 6px",
                      fontSize: "0.7rem",
                      fontWeight: "700"
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mobile-drawer-footer" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "10px", background: "var(--bg-tertiary)", border: "1px solid var(--glass-border)" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Theme Mode</span>
            <ThemeToggle />
          </div>
          <button
            className="mobile-drawer-logout"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <FiLogOut /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Container Wrapper */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="hamburger-btn" onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(true); }} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <div className="header-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Logo height="28px" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="desktop-only">
              <ThemeToggle />
            </div>
            {/* Clickable User Capsule & Dropdown */}
            <div style={{ position: "relative" }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setUserDropdownOpen(!userDropdownOpen);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: userDropdownOpen ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                  border: "1px solid var(--glass-border)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.2s ease"
                }}
              >
                {renderProfileAvatar(empDetails, "24px")}
                <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: "600" }}>
                  {empDetails?.name}
                </span>
                <span
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-secondary)",
                    transition: "transform 0.2s ease",
                    transform: userDropdownOpen ? "rotate(180deg)" : "none"
                  }}
                >
                  ▼
                </span>
              </div>

              {/* Glassmorphism Dropdown */}
              {userDropdownOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "42px",
                    right: "0",
                    width: "200px",
                    background: "var(--bg-secondary)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "12px",
                    padding: "12px",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <div style={{ padding: "4px 8px 8px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "6px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Signed in as</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-cyan)", wordBreak: "break-all" }}>
                      {empDetails?.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {empDetails?.role || "Administrator"}
                    </div>
                  </div>

                  <Link
                    href="/?tab=profile"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-primary)",
                      padding: "8px",
                      borderRadius: "6px",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      textDecoration: "none",
                      transition: "background 0.2s"
                    }}
                    className="dropdown-link-btn"
                  >
                    <FiUser style={{ fontSize: "1rem", flexShrink: 0 }} /> My Profile
                  </Link>

                  <Link
                    href="/privacy-policy"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-primary)",
                      padding: "8px",
                      borderRadius: "6px",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      textDecoration: "none",
                      transition: "background 0.2s"
                    }}
                    className="dropdown-link-btn"
                  >
                    <FiShield style={{ fontSize: "1rem", flexShrink: 0 }} /> Privacy & Terms
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      router.push("/login");
                    }}
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "#ef4444",
                      padding: "8px",
                      borderRadius: "6px",
                      textAlign: "center",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      width: "100%",
                      marginTop: "6px",
                      fontWeight: "600",
                      transition: "background 0.2s"
                    }}
                  >
                    <FiLogOut style={{ fontSize: "1rem", flexShrink: 0 }} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic nested contents inside */}
        <main style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        .dropdown-link-btn:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
