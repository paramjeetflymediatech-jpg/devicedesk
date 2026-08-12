"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FiActivity, FiLogOut, FiCode, FiWifi, FiWifiOff, FiGrid, FiMenu, FiX, FiEye, FiTrash2 } from "react-icons/fi";
import { FaWindows, FaApple, FaLinux } from "react-icons/fa";
import { useAuth } from "../auth/AuthContext";
import { DeveloperProvider, useDeveloper } from "./DeveloperContext";
import ThemeToggle from "../components/ThemeToggle";

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { stats, logs } = useDeveloper();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    try {
      if (logout) logout();
    } catch(e) {}
    router.push('/login');
  };

  const SidebarItem = ({ href, icon, label, count, colorClass }) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href}
        onClick={() => setMobileMenuOpen(false)}
        className="flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 no-underline"
        style={{
          background: isActive ? "var(--accent-cyan)" : "transparent",
          color: isActive ? "#fff" : "var(--text-secondary)",
          fontWeight: isActive ? "600" : "500",
        }}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{label}</span>
        </div>
        {count !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClass && !isActive ? colorClass : ""}`}
            style={{ background: isActive ? "rgba(255,255,255,0.2)" : "rgba(128,128,128,0.1)", color: isActive ? "#fff" : "" }}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Header (Hamburger) */}
      <div className="md:hidden flex items-center justify-between p-4 border-b" style={{ background: "var(--bg-secondary)", borderColor: "var(--glass-border)", color: "var(--text-primary)" }}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-cyan)", color: "#fff" }}>
            <FiCode size={18} />
          </div>
          <span className="font-bold text-lg">Dev Console</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
            {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Dynamic Sidebar */}
      <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[280px] lg:w-[300px] flex-shrink-0 border-b md:border-b-0 md:border-r p-6 md:min-h-screen`} style={{ background: "var(--bg-secondary)", borderColor: "var(--glass-border)" }}>
        {/* Logo / Header (Desktop only) */}
        <div className="hidden md:flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-cyan)" }}>
              <FiCode size={22} color="#fff" />
            </div>
            <div>
              <h2 className="text-lg font-bold m-0 leading-tight" style={{ color: "var(--text-primary)" }}>Dev Console</h2>
              <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>Agent Management</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-wider mb-1 mt-2 font-bold" style={{ color: "var(--text-muted)" }}>Views</div>
          <SidebarItem href="/developer/dashboard" icon={<FiGrid size={18} />} label="All Agents" count={stats.total} />
          <SidebarItem href="/developer/screenshots" icon={<FiEye size={18} />} label="Activity Screenshots" />
          <SidebarItem href="/developer/logs" icon={<FiActivity size={18} />} label="Activity Logs" count={logs.length} />
          <SidebarItem href="/developer/uninstalled" icon={<FiTrash2 size={18} />} label="Uninstalled / Killed" count={stats.deleted} colorClass="text-red-500" />
          
          <div className="text-[10px] uppercase tracking-wider mb-1 mt-6 font-bold" style={{ color: "var(--text-muted)" }}>Live Status</div>
          <SidebarItem href="/developer/online" icon={<FiWifi size={18} />} label="Online (Live)" count={stats.online} colorClass="text-green-500" />
          <SidebarItem href="/developer/offline" icon={<FiWifiOff size={18} />} label="Offline" count={stats.offline} colorClass="text-red-500" />

          <div className="text-[10px] uppercase tracking-wider mb-1 mt-6 font-bold" style={{ color: "var(--text-muted)" }}>Systems</div>
          <SidebarItem href="/developer/windows" icon={<FaWindows size={18} />} label="Windows" count={stats.windows} colorClass="text-blue-500" />
          <SidebarItem href="/developer/mac" icon={<FaApple size={18} />} label="macOS" count={stats.mac} colorClass="text-purple-500" />
          <SidebarItem href="/developer/linux" icon={<FaLinux size={18} />} label="Linux" count={stats.linux} colorClass="text-orange-500" />
        </nav>

        {/* Logout */}
        <div className="mt-8 md:mt-auto pt-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full bg-transparent border-none cursor-pointer rounded-lg font-semibold text-base transition-all hover:bg-red-500/10"
            style={{ color: "var(--status-critical)" }}
          >
            <FiLogOut size={18} />
            <span>Secure Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function DeveloperLayout({ children }) {
  return (
    <DeveloperProvider>
      <div className="flex flex-col md:flex-row min-h-screen w-full" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <SidebarContent />
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </div>
      </div>
    </DeveloperProvider>
  );
}
