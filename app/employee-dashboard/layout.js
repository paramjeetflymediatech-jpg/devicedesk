"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { useAuth } from "../auth/AuthContext";
import { getEmployees, isSoundEnabled } from "../store";
import ThemeToggle from "../components/ThemeToggle.js";
import Logo from "../components/Logo.js";
import {
  FiGrid,
  FiClock,
  FiAlertCircle,
  FiClipboard,
  FiMessageSquare,
  FiCheckSquare,
  FiUser,
  FiLogOut,
  FiShield,
  FiCalendar
} from "react-icons/fi";

export default function EmployeeLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Audio state
  const audioCtxRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSoundOn(isSoundEnabled());
    setEmployees(getEmployees());
  }, []);

  // Listen for database syncs to refresh local employee details
  useEffect(() => {
    const handleSync = () => {
      setEmployees(getEmployees());
    };
    window.addEventListener("devicedesk_db_synced", handleSync);
    return () => window.removeEventListener("devicedesk_db_synced", handleSync);
  }, []);

  // Sync unread chat count
  useEffect(() => {
    const stored = localStorage.getItem("devicedesk_unread_chat_count");
    if (stored) setUnreadChatCount(Number(stored));

    const handleUnreadChange = (e) => {
      setUnreadChatCount(Number(e.detail || 0));
    };

    window.addEventListener("devicedesk_unread_chat_changed", handleUnreadChange);
    return () => {
      window.removeEventListener("devicedesk_unread_chat_changed", handleUnreadChange);
    };
  }, []);

  // Audio Context initialization
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    const enableAudio = () => {
      initAudio();
    };
    window.addEventListener("click", enableAudio, { once: true });
    return () => window.removeEventListener("click", enableAudio);
  }, []);

  // Auth & role check
  useEffect(() => {
    if (mounted) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "admin") {
        router.push("/");
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

  if (!mounted || !user || user.role === "admin") {
    return null;
  }

  const empDetails = employees.find((e) => e.id === user.id) || user;

  const renderProfileAvatar = (emp, size = "24px") => {
    const getInitials = (name) => {
      if (!name) return "";
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
        {getInitials(emp?.name || "")}
      </div>
    );
  };

  const navItems = [
    { name: "Overview", path: "/employee-dashboard", icon: <FiGrid /> },
    { name: "Attendance", path: "/employee-dashboard/attendance", icon: <FiClock /> },
    { name: "File Complaint", path: "/employee-dashboard/complaint", icon: <FiAlertCircle /> },
    { name: "My Records", path: "/employee-dashboard/records", icon: <FiClipboard /> },
    { name: "Task Board", path: "/employee-dashboard/tasks", icon: <FiCheckSquare /> },
    {
      name: "Chat Workspace",
      path: "/employee-dashboard/chat",
      icon: <FiMessageSquare />,
      badge: unreadChatCount
    },
    { name: "Apply Leave", path: "/employee-dashboard/leave", icon: <FiCalendar /> },
    { name: "My Profile", path: "/employee-dashboard/profile", icon: <FiUser /> }
  ];

  return (
    <div style={{ display: "contents" }}>
      {/* Sidebar Navigation (Desktop) */}
      <aside className="sidebar">
        <div className="logo-container">
          <Logo height="36px" />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ul className="nav-links">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path} className={`nav-item ${active ? "active" : ""}`}>
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
                          marginLeft: "8px"
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

      {/* ── Mobile Hamburger Drawer ── */}
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
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{empDetails.department || "General"}</p>
        </div>
        <nav className="mobile-drawer-nav">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
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
                      {empDetails?.department || "General"}
                    </div>
                  </div>

                  <Link
                    href="/employee-dashboard/profile"
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

        {/* Dynamic page contents nested inside */}
        {children}
      </div>

      <style jsx global>{`
        .dropdown-link-btn:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
