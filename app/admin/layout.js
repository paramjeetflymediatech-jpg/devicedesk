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
  FiGlobe,
  FiTrash2,
  FiMenu,
  FiActivity,
  FiBox
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const navGroups = [
    {
      title: "Core Workspace",
      items: [
        { name: "Dashboard", path: "/", icon: <FiGrid />, exact: true },
        { name: "Chat Workspace", path: "/?tab=chat", icon: <FiMessageSquare />, badge: unreadChatCount },
        { name: "Task Board", path: "/admin/tasks", icon: <FiCheckSquare /> },
        { name: "Screenshots", path: "/?tab=screenshots", icon: <FiEye /> }
      ]
    },
    {
      title: "Client Management",
      items: [
        { name: "Client Records", path: "/admin/client", icon: <FiUsers /> },
        { name: "Domain Portfolio", path: "/admin/domains", icon: <FiGlobe /> },
        { name: "Packages", path: "/admin/packages", icon: <FiBox /> }
      ]
    },
    {
      title: "Marketing",
      items: [
        { name: "Marketing Hub", path: "/admin/marketing", icon: <FiTrendingUp /> }
      ]
    },
    {
      title: "Operations & Projects",
      items: [
        { name: "Projects", path: "/admin/projects", icon: <FiFolder /> },
        { name: "Work Submissions", path: "/admin/submissions", icon: <FiLayers /> }
      ]
    },
    {
      title: "Organization & HR",
      items: [
        { name: "Team Directory", path: "/admin/users", icon: <FiUser /> },
        { name: "Departments", path: "/admin/departments", icon: <FiBriefcase /> },
        { name: "Attendance", path: "/admin/attendance", icon: <FiClock /> },
        { name: "Leave Requests", path: "/admin/leaves", icon: <FiCalendar />, badge: leaveCount }
      ]
    },
    {
      title: "IT & Infrastructure",
      items: [
        { name: "Systems Inventory", path: "/admin/systems", icon: <FiServer /> },
        { name: "Raise Records", path: "/admin/tickets", icon: <FiTag /> }
      ]
    },
    {
      title: "Security & Auditing",
      items: [
        { name: "System Logs", path: "/admin/audit-logs", icon: <FiFileText /> },
        { name: "Activity Log", path: "/admin/activity-log", icon: <FiActivity /> }
      ]
    }
  ];

  const isNavActive = (item) => {
    if (item.exact) return pathname === "/admin" || pathname === "/";
    return pathname.startsWith(item.path);
  };

  return (
    <div style={{ display: "contents" }}>
      {/* Sidebar Navigation (Desktop) */}
      <aside className="sidebar desktop-only" style={{ width: isCollapsed ? '80px' : '260px', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: 'var(--bg-secondary)', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', borderBottom: '1px solid var(--glass-border)' }}>
          {!isCollapsed && (
            <Link href="/" style={{ textDecoration: "none" }}>
              <Logo height="28px" />
            </Link>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px' }} className="hover:bg-white/5 transition-colors">
            <FiMenu size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: '16px 0', overflowX: 'hidden' }}>
          {navGroups.map((group, idx) => (
            <div key={idx} style={{ marginBottom: '20px' }}>
              {!isCollapsed && <div style={{ padding: '0 24px', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>{group.title}</div>}
              {isCollapsed && <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', margin: '8px 0', opacity: 0.5 }} />}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {group.items.map((item) => {
                  const active = isNavActive(item);
                  return (
                    <li key={item.name} style={{ padding: '0 12px', marginBottom: '4px' }}>
                      <Link href={item.path} style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? 'center' : 'flex-start', padding: '10px 12px', borderRadius: '10px', textDecoration: "none", color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)', background: active ? 'rgba(6, 182, 212, 0.1)' : 'transparent', transition: 'all 0.2s ease', position: 'relative' }} className="hover:bg-white/5">
                        <span style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>
                        {!isCollapsed && <span style={{ marginLeft: '14px', fontSize: '0.85rem', fontWeight: active ? 600 : 500, whiteSpace: 'nowrap' }}>{item.name}</span>}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span style={{ position: isCollapsed ? 'absolute' : 'static', top: isCollapsed ? '4px' : 'auto', right: isCollapsed ? '4px' : 'auto', marginLeft: isCollapsed ? '0' : 'auto', background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.65rem", fontWeight: "700" }}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid var(--glass-border)", background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', background: 'rgba(255,255,255,0.03)', padding: isCollapsed ? '10px' : '10px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {renderProfileAvatar(empDetails, "32px")}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '110px' }}>{empDetails.name?.split(' ')[0]}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '110px' }}>{empDetails.role || 'Admin'}</span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button onClick={() => { logout(); router.push("/login"); }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:bg-red-500/20 transition-colors" title="Sign Out">
                <FiLogOut size={16} />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button onClick={() => { logout(); router.push("/login"); }} style={{ width: '100%', marginTop: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:bg-red-500/20 transition-colors" title="Sign Out">
              <FiLogOut size={18} />
            </button>
          )}
        </div>
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
          {navGroups.flatMap(g => g.items).map((item) => {
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
                    <Link href="/admin/leave" className={`nav-link flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${pathname === '/admin/leave' ? 'bg-[var(--glass-bg)] border-l-4 border-[var(--accent-cyan)] text-[var(--accent-cyan)] shadow-[var(--neon-glow)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'}`}>
                      <FiCalendar size={20} /><span>Leaves</span>
                    </Link>
                    <Link href="/admin/client" className={`nav-link flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${pathname === '/admin/client' ? 'bg-[var(--glass-bg)] border-l-4 border-[var(--accent-cyan)] text-[var(--accent-cyan)] shadow-[var(--neon-glow)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'}`}>
                      <FiUsers size={20} /><span>Clients</span>
                    </Link>
                    <Link href="/admin/activity-log" className={`nav-link flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${pathname === '/admin/activity-log' ? 'bg-[var(--glass-bg)] border-l-4 border-[var(--accent-cyan)] text-[var(--accent-cyan)] shadow-[var(--neon-glow)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'}`}>
                      <FiActivity size={20} /><span>Activity Log</span>
                    </Link>
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
