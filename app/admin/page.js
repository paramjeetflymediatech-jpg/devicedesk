'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiUsers, FiMonitor, FiBriefcase, FiCheckSquare, FiAlertCircle, 
  FiCalendar, FiClock, FiLayers, FiActivity, FiArrowRight, 
  FiTrendingUp, FiFolder, FiFileText, FiShield, FiLink 
} from 'react-icons/fi';
import { getEmployees, getSystems, getTickets, getTasks, getDepartments } from '../store.js';

export default function AdminMainDashboard() {
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    setEmployees(getEmployees());
    setSystems(getSystems());
    setTickets(getTickets());
    setTasks(getTasks());
    setDepartments(getDepartments());
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/reports/analytics');
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const adminNavSections = [
    { title: 'Users & Staff', desc: 'Manage employees, roles & profile slugs', icon: FiUsers, href: '/admin/users', count: employees.length, color: 'var(--accent-cyan, #06b6d4)' },
    { title: 'Hardware Fleet', desc: 'Specs, allocations & hardware system slugs', icon: FiMonitor, href: '/admin/systems', count: systems.length, color: '#38bdf8' },
    { title: 'Departments', desc: 'Department units, settings & metrics', icon: FiBriefcase, href: '/admin/departments', count: departments.length, color: 'var(--accent-purple, #a855f7)' },
    { title: 'Tasks & Sprints', desc: 'Task assignment, tracking & duration', icon: FiCheckSquare, href: '/admin/tasks', count: tasks.length, color: '#f59e0b' },
    { title: 'Support Tickets', desc: 'IT issues, resolution status & system logs', icon: FiAlertCircle, href: '/admin/tickets', count: tickets.length, color: '#ef4444' },
    { title: 'Attendance Log', desc: 'Daily punches, work hours & regularizations', icon: FiClock, href: '/admin/attendance', count: 'Realtime', color: '#10b981' },
    { title: 'Leave Requests', desc: 'Staff leave applications & review queue', icon: FiCalendar, href: '/admin/leaves', count: 'Active', color: '#ec4899' },
    { title: 'Client Projects', desc: 'Project timelines, budgets & client links', icon: FiFolder, href: '/admin/projects', count: analytics?.projects || 0, color: '#6366f1' },
    { title: 'Marketing', desc: 'Campaign tracking, leads & field logs', icon: FiTrendingUp, href: '/admin/marketing', count: analytics?.leads || 0, color: '#14b8a6' },
    { title: 'Work Submissions', desc: 'Departmental deliverables & approvals', icon: FiFileText, href: '/admin/submissions', count: analytics?.work_submissions || 0, color: '#8b5cf6' },
    { title: 'Audit Trail', desc: 'System activity history & change logs', icon: FiActivity, href: '/admin/audit-logs', count: 'Logs', color: '#f43f5e' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', fontSize: '0.85rem', marginBottom: '8px' }}>
              <FiShield /> Administration Control Center
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiLayers style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Admin Panel & Module Routing
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.95rem', margin: '6px 0 0' }}>
              Direct modular routing matching user routing across all platform entities and slug bases.
            </p>
          </div>

          <Link href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <FiLayers /> Main App View
          </Link>
        </div>

        {/* Modules Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {adminNavSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.title}
                href={sec.href}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--glass-border, rgba(255,255,255,0.1))';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${sec.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon style={{ color: sec.color, fontSize: '1.25rem' }} />
                    </div>
                    <span className="status-tag resolved" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      {sec.count}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary, #f8fafc)' }}>
                    {sec.title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
                    {sec.desc}
                  </p>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: sec.color, fontWeight: 600 }}>
                  <span>Explore Route</span>
                  <FiArrowRight />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
