'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiTarget, FiUser, FiLogOut, FiUsers, FiLayers, FiShield, 
  FiCheckCircle, FiMenu, FiX, FiBriefcase, FiPlus, FiCalendar 
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import Logo from '@/app/components/Logo.js';
import ThemeToggle from '@/app/components/ThemeToggle.js';

export default function CrmPortalLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/crm/login' || pathname === '/portal/crm/login';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const stored = localStorage.getItem('crm_auth_user');
        if (!stored) {
          router.replace('/crm/login');
          return;
        }

        const parsed = JSON.parse(stored);
        if (!parsed || !parsed.id || parsed.role !== 'crm_agent') {
          router.replace('/crm/login');
          return;
        }

        setUser(parsed);

        // Fetch fresh verification from server
        const res = await fetch('/api/crm/auth/me');
        if (!res.ok) {
          localStorage.removeItem('crm_auth_user');
          localStorage.removeItem('crm_token');
          router.replace('/crm/login');
          return;
        }
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('crm_auth_user', JSON.stringify(data.user));
        }
      } catch (err) {
        console.error('Session verify error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, isLoginPage]);

  // Ensure full-width layout without sidebar margins
  useEffect(() => {
    if (isLoginPage) return;
    document.body.classList.add('page-standalone', 'page-full-width', 'crm-portal-active');
    return () => {
      document.body.classList.remove('page-standalone', 'page-full-width', 'crm-portal-active');
    };
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Sign Out?',
      text: 'Are you sure you want to exit your CRM session?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Sign Out',
      confirmButtonColor: '#4f46e5',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await fetch('/api/crm/auth/logout', { method: 'POST' });
      } catch (e) {}
      localStorage.removeItem('crm_auth_user');
      localStorage.removeItem('crm_token');
      router.replace('/crm/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <span>Verifying CRM Agent Session...</span>
        </div>
      </div>
    );
  }

  const assignedCount = user?.assigned_company_ids?.length || 0;
  const isFullAccess = user?.access_type === 'all';

  return (
    <div className="crm-portal-wrapper page-standalone w-full min-w-full flex-1 flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors min-h-screen">
      {/* Top Navbar matching Admin Panel header */}
      <header className="w-full shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-[100] transition-colors shadow-xs">
        <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Navigation */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/crm/leads" className="flex items-center gap-2.5 text-decoration-none">
              <Logo height="28px" />
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                CRM Portal
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="desktop-nav hidden md:flex items-center gap-1.5">
              <Link
                href="/crm/leads"
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  pathname === '/crm/leads'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FiTarget size={15} />
                <span>CRM Leads</span>
              </Link>

              <Link
                href="/crm/calendar"
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  pathname === '/crm/calendar'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FiCalendar size={15} />
                <span>Follow-up Calendar</span>
              </Link>

              <Link
                href="/crm/profile"
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  pathname === '/crm/profile'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FiUser size={15} />
                <span>My Profile</span>
              </Link>
            </nav>
          </div>

          {/* User Badges, Theme Switch, Quick Action & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Add Lead Button (Desktop Sticky) */}
            {pathname.startsWith('/crm/leads') && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('crm_open_add_lead'))}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                title="Create a new lead inquiry"
              >
                <FiPlus size={14} />
                <span>Add Lead</span>
              </button>
            )}

            {/* Access Scope Indicator */}
            <div className={`scope-badge hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
              isFullAccess
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : assignedCount > 0
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isFullAccess ? 'bg-emerald-500' : assignedCount > 0 ? 'bg-blue-500' : 'bg-amber-500'}`} />
              <span>{isFullAccess ? '🌐 Full Access' : assignedCount > 0 ? `🏢 ${assignedCount} ${assignedCount === 1 ? 'Company' : 'Companies'}` : '⚠️ No Company Assigned'}</span>
            </div>

            {/* Theme Toggle (Light / Dark mode switch matching Admin Panel) */}
            <ThemeToggle />

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                {(user?.name || 'A')[0].toUpperCase()}
              </div>
              <div className="leading-tight hidden sm:block">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[120px] truncate">
                  {user?.name || 'Agent'}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  CRM Specialist
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-bold transition-all cursor-pointer"
              title="Sign out of CRM session"
            >
              <FiLogOut size={13} />
              <span className="logout-text hidden sm:inline">Exit</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn block md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2.5 shadow-lg">
          <Link
            href="/crm/leads"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold ${
              pathname === '/crm/leads'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiTarget /> CRM Leads
          </Link>
          <Link
            href="/crm/calendar"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold ${
              pathname === '/crm/calendar'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiCalendar /> Follow-up Calendar
          </Link>
          <Link
            href="/crm/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold ${
              pathname === '/crm/profile'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiUser /> My Profile
          </Link>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* Page Content */}
      <main className="crm-main-content flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
