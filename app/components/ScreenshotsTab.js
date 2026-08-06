"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  FiSearch, FiFilter, FiCalendar, FiUser, FiTv, FiTrash2,
  FiDownload, FiEye, FiClock, FiGrid, FiList, FiRefreshCw,
  FiShield, FiCheckCircle, FiActivity, FiLayers, FiX, FiZoomIn,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';

// Image load error fallback handler
function handleImageError(e, rawUrl) {
  if (!e || !e.currentTarget || !rawUrl) return;
  const currentSrc = e.currentTarget.src || '';
  const fileName = rawUrl.split('/').pop();
  if (!fileName) return;

  // Prevent infinite loop
  const count = parseInt(e.currentTarget.getAttribute('data-retry-count') || '0', 10);
  if (count >= 3) return;
  e.currentTarget.setAttribute('data-retry-count', (count + 1).toString());

  if (count === 0 && !currentSrc.includes('storage.flymediatech.com/uploads/screenshots/')) {
    e.currentTarget.src = `https://storage.flymediatech.com/uploads/screenshots/${fileName}`;
  } else if (count === 1 && !currentSrc.includes('storage.flymediatech.com/uploads/')) {
    e.currentTarget.src = `https://storage.flymediatech.com/uploads/${fileName}`;
  } else {
    e.currentTarget.src = `/api/uploads/${fileName}`;
  }
}

export default function ScreenshotsTab() {
  const [screenshots, setScreenshots] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [stats, setStats] = useState({ todayCaptures: 0, todayMonitoredEmployees: 0, todayAvgActivity: 100 });
  const [loading, setLoading] = useState(true);

  // Collapsible Accordion State for 100+ Employee Cards
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Filters State
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'feed'

  // Modal Inspector State
  const [inspectModal, setInspectModal] = useState({ open: false, data: null });

  // Fetch Employees List for filter dropdown
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const empRes = await fetch('/api/employees/list');
        const empData = await empRes.json();
        if (empData.success && Array.isArray(empData.data)) {
          setEmployeesList(empData.data);
          const deptSet = new Set(empData.data.map(e => e.department).filter(Boolean));
          setDepartmentsList(Array.from(deptSet));
        }
      } catch (err) {
        console.warn('Could not load employees filter list:', err);
      }
    }
    loadFilterOptions();
  }, []);

  // Fetch Screenshots
  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedEmployee !== 'all') queryParams.append('employeeId', selectedEmployee);
      if (selectedDepartment !== 'all') queryParams.append('department', selectedDepartment);
      if (selectedDate) queryParams.append('date', selectedDate);
      if (searchQuery) queryParams.append('search', searchQuery);

      const res = await fetch(`/api/screenshots/list?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setScreenshots(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Fetch screenshots failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, [selectedEmployee, selectedDepartment, selectedDate]);

  // Group screenshots by Employee ID for "Grouped View"
  const groupedByEmployee = useMemo(() => {
    const map = {};
    screenshots.forEach(item => {
      const key = item.employeeId || 'EMP-UNKNOWN';
      if (!map[key]) {
        map[key] = {
          employeeId: item.employeeId,
          employeeName: item.employeeName || 'Unknown Employee',
          department: item.department || 'General',
          captures: []
        };
      }
      map[key].captures.push(item);
    });
    return Object.values(map);
  }, [screenshots]);

  // Accordion Toggle Handlers for 100+ Employees (Default: All Hidden/Collapsed)
  const toggleGroupCollapse = (empId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [empId]: prev[empId] === false ? true : false
    }));
  };

  const expandAllGroups = () => {
    const map = {};
    groupedByEmployee.forEach(g => {
      map[g.employeeId] = false; // false = expanded
    });
    setCollapsedGroups(map);
  };

  const collapseAllGroups = () => {
    const map = {};
    groupedByEmployee.forEach(g => {
      map[g.employeeId] = true; // true = collapsed
    });
    setCollapsedGroups(map);
  };

  // Delete Screenshot Handler
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this activity screenshot?')) return;

    try {
      const res = await fetch(`/api/screenshots/delete?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setScreenshots(prev => prev.filter(item => item.id !== id));
        if (inspectModal.data?.id === id) {
          setInspectModal({ open: false, data: null });
        }
      }
    } catch (err) {
      alert('Failed to delete screenshot: ' + err.message);
    }
  };

  // Delete All Screenshots Handler
  const handleDeleteAll = async () => {
    if (!confirm('⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE ALL activity screenshots and image files from the server? This action cannot be undone.')) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/screenshots/delete?deleteAll=true`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setScreenshots([]);
        setStats(prev => ({ ...prev, todayCaptures: 0, todayMonitoredEmployees: 0 }));
        if (inspectModal.open) setInspectModal({ open: false, data: null });
        alert('All screenshots have been permanently deleted from the server!');
      }
    } catch (err) {
      alert('Failed to delete all screenshots: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>

      {/* 1. Header Banner & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📸</span> Activity Screenshots & Work Logs
          </h1>
          <p style={{ color: 'var(--text-secondary, #64748b)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Real-time automated employee activity screenshots & desktop monitoring
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={fetchScreenshots}
            className="secondary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <FiRefreshCw className={loading ? 'spin-icon' : ''} /> Refresh Feeds
          </button>

          <a
            href="/download/DeviceDeskAgent-Setup.exe"
            download="DeviceDeskAgent-Setup.exe"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
          >
            <FiDownload /> Download Windows Agent (.exe)
          </a>

          <button
            onClick={handleDeleteAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: '700' }}
          >
            <FiTrash2 /> Delete All Screenshots
          </button>

          <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiShield /> 180-Day Retention Active
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
            <span>Today's Total Captures</span>
            <FiTv style={{ color: '#2563eb', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', marginTop: '8px' }}>
            {stats.todayCaptures}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: '600' }}>
            ✓ Recorded automatically during shifts
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
            <span>Monitored Employees Today</span>
            <FiUser style={{ color: '#0284c7', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', marginTop: '8px' }}>
            {stats.todayMonitoredEmployees} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>/ {employeesList.length || 100}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px', fontWeight: '600' }}>
            Identified by Employee ID & Shift
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
            <span>Average Work Activity</span>
            <FiActivity style={{ color: '#16a34a', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', marginTop: '8px' }}>
            {stats.todayAvgActivity}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
            Based on active window inputs
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
            <span>Storage Maintenance</span>
            <FiLayers style={{ color: '#9333ea', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', marginTop: '8px' }}>
            Auto-Purge (180 Days)
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
            Purges captures older than 6 months
          </div>
        </div>
      </div>

      {/* 3. Enterprise Filter & Controls Bar */}
      <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: Filter Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search Employee, ID, IP..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchScreenshots()}
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Employee Dropdown Filter (Crucial for 100+ employees) */}
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary, #0f172a)', backgroundColor: 'var(--card-bg, #fff)' }}
              >
                <option value="all">👤 All Employees ({employeesList.length})</option>
                {employeesList.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id}) - {emp.department || 'General'}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Dropdown Filter */}
            <div style={{ position: 'relative', minWidth: '160px' }}>
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary, #0f172a)', backgroundColor: 'var(--card-bg, #fff)' }}
              >
                <option value="all">🏢 All Departments</option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: '600' }}
              />
            </div>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Clear Date
              </button>
            )}
          </div>

          {/* Right: View Mode Toggle & Accordion Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {viewMode === 'grouped' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={expandAllGroups}
                  title="Expand All Employee Cards"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    color: 'var(--text-primary, #0f172a)',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FiChevronDown /> Expand All ({groupedByEmployee.length})
                </button>

                <button
                  onClick={collapseAllGroups}
                  title="Collapse All Employee Cards"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    color: 'var(--text-primary, #0f172a)',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FiChevronUp /> Collapse All
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-muted, #f1f5f9)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <button
                onClick={() => setViewMode('grouped')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'grouped' ? '#2563eb' : 'transparent',
                  color: viewMode === 'grouped' ? '#ffffff' : '#64748b',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FiGrid /> Grouped by Employee
              </button>
              <button
                onClick={() => setViewMode('feed')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'feed' ? '#2563eb' : 'transparent',
                  color: viewMode === 'feed' ? '#ffffff' : '#64748b',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FiList /> Timeline Feed
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Main Content Gallery */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <FiRefreshCw className="spin-icon" style={{ fontSize: '2rem', marginBottom: '12px', color: '#2563eb' }} />
          <p style={{ fontWeight: '600' }}>Loading activity screenshots...</p>
        </div>
      ) : screenshots.length === 0 ? (
        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '60px 20px', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📷</div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>No Activity Screenshots Found</h3>
          <p style={{ color: '#64748b', maxWidth: '480px', margin: '8px auto 0 auto', fontSize: '0.85rem' }}>
            No screen captures match your active filters. Captures occur automatically when employees punch in.
          </p>
        </div>
      ) : viewMode === 'grouped' ? (

        /* MODE A: Grouped by Employee with Collapsible Accordion Cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupedByEmployee.map(group => {
            const isCollapsed = collapsedGroups[group.employeeId] !== false; // Default: HIDDEN/COLLAPSED
            return (
              <div key={group.employeeId} style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s ease' }}>

                {/* Employee Group Header Bar (Clickable Accordion Trigger) */}
                <div
                  onClick={() => toggleGroupCollapse(group.employeeId)}
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '16px 20px',
                    backgroundColor: isCollapsed ? 'var(--card-bg, #ffffff)' : 'var(--bg-muted, #f8fafc)',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color, #f1f5f9)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.1rem', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}>
                      {group.employeeName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {group.employeeName}
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                          ID: {group.employeeId}
                        </span>
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
                        Dept: <strong>{group.department}</strong> • Total Captures: <strong>{group.captures.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right Corner Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                      Latest: {new Date(group.captures[0].capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(group.employeeId);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        backgroundColor: isCollapsed ? '#2563eb' : '#f1f5f9',
                        color: isCollapsed ? '#ffffff' : '#334155',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        border: isCollapsed ? 'none' : '1px solid #cbd5e1',
                        boxShadow: isCollapsed ? '0 4px 12px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>{isCollapsed ? `Show ${group.captures.length} Screenshots` : 'Hide Screenshots'}</span>
                      <span style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease', display: 'inline-block', fontSize: '0.75rem' }}>▼</span>
                    </button>
                  </div>
                </div>

                {/* Screenshot Grid for this employee */}
                {!isCollapsed && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                      {group.captures.map(item => (
                        <ScreenshotCard
                          key={item.id}
                          item={item}
                          onInspect={() => setInspectModal({ open: true, data: item })}
                          onDelete={(id, e) => handleDelete(id, e)}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

      ) : (

        /* MODE B: Chronological Feed View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
          {screenshots.map(item => (
            <ScreenshotCard
              key={item.id}
              item={item}
              showEmployeeHeader
              onInspect={() => setInspectModal({ open: true, data: item })}
              onDelete={(id, e) => handleDelete(id, e)}
            />
          ))}
        </div>

      )}

      {/* 5. Full Screen High-Res Modal Inspector */}
      {inspectModal.open && inspectModal.data && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '1200px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

            {/* Modal Top Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📷</span> Screenshot Inspector: {inspectModal.data.employeeName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Captured at: {new Date(inspectModal.data.capturedAt).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => setInspectModal({ open: false, data: null })}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <FiX />
              </button>
            </div>

            {/* Modal Main Body */}
            <div style={{ display: 'flex', flexWrap: 'wrap', flex: 1, overflow: 'hidden' }}>

              {/* Left Image View Area */}
              <div style={{ flex: '1 1 700px', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto', minHeight: '400px' }}>
                <img
                  src={inspectModal.data.imageUrl}
                  alt="Full Screen Capture"
                  onError={(e) => handleImageError(e, inspectModal.data.imageUrl)}
                  style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                />
              </div>

              {/* Right Details Sidebar */}
              <div style={{ flex: '1 1 300px', padding: '24px', backgroundColor: '#ffffff', borderLeft: '1px solid #e2e8f0', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Employee Metadata
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>EMPLOYEE NAME & ID</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{inspectModal.data.employeeName}</strong>
                    <span style={{ marginLeft: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>
                      {inspectModal.data.employeeId}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>DEPARTMENT</span>
                    <strong style={{ color: '#0f172a' }}>{inspectModal.data.department || 'General'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>TIMESTAMP</span>
                    <strong style={{ color: '#0f172a' }}>{new Date(inspectModal.data.capturedAt).toLocaleString()}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SYSTEM TAG & IP</span>
                    <strong style={{ color: '#2563eb' }}>{inspectModal.data.systemNumber || 'WEB-CLIENT'} ({inspectModal.data.ipAddress || '127.0.0.1'})</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>CAPTURE MODE</span>
                    <span style={{ display: 'inline-block', backgroundColor: inspectModal.data.captureType === 'FULL_DESKTOP' ? '#f0fdf4' : '#eff6ff', color: inspectModal.data.captureType === 'FULL_DESKTOP' ? '#16a34a' : '#2563eb', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', marginTop: '4px', border: '1px solid ' + (inspectModal.data.captureType === 'FULL_DESKTOP' ? '#bbf7d0' : '#bfdbfe') }}>
                      {inspectModal.data.captureType === 'FULL_DESKTOP' ? '💻 Full OS Desktop System Capture' : '🌐 Web Tab Capture'}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>ACTIVITY SCORE</span>
                    <span style={{ display: 'inline-block', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', marginTop: '4px' }}>
                      {inspectModal.data.activityScore || 100}% Active
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <a
                    href={inspectModal.data.imageUrl}
                    download={`screenshot_${inspectModal.data.employeeId}.jpg`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', backgroundColor: '#2563eb', color: '#ffffff', textAlign: 'center', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <FiDownload /> Download High-Res Image
                  </a>

                  <button
                    onClick={() => handleDelete(inspectModal.data.id)}
                    style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <FiTrash2 /> Delete Record Permanently
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Single Screenshot Thumbnail Card Sub-component
function ScreenshotCard({ item, showEmployeeHeader, onInspect, onDelete }) {
  return (
    <div
      onClick={onInspect}
      style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #cbd5e1)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        position: 'relative'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Optional Employee Header for Feed View */}
      {showEmployeeHeader && (
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-primary, #0f172a)' }}>
            {item.employeeName}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700' }}>
            {item.employeeId}
          </span>
        </div>
      )}

      {/* Image Thumbnail Box */}
      <div style={{ position: 'relative', height: '160px', backgroundColor: '#0f172a', overflow: 'hidden' }}>
        <img
          src={item.imageUrl}
          alt="Activity capture"
          onError={(e) => handleImageError(e, item.imageUrl)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Hover Inspect Badge */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0, transition: 'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
        >
          <span style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FiZoomIn /> Click to Inspect
          </span>
        </div>

        {/* Capture Type Badge */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: item.captureType === 'FULL_DESKTOP' ? 'rgba(22, 163, 74, 0.9)' : 'rgba(37, 99, 235, 0.9)',
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.65rem',
          fontWeight: '800',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {item.captureType === 'FULL_DESKTOP' ? '💻 FULL SYSTEM SCREEN' : '🌐 WEB TAB'}
        </div>

        {/* Timestamp Pill */}
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FiClock /> {new Date(item.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Card Bottom Meta */}
      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg, #fff)' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
          📅 {new Date(item.capturedAt).toLocaleDateString()}
        </span>

        <button
          onClick={e => onDelete(item.id, e)}
          title="Delete Screenshot"
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
        >
          <FiTrash2 style={{ fontSize: '0.9rem' }} />
        </button>
      </div>
    </div>
  );
}
