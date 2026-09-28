'use client';
import { useState, useEffect } from 'react';
import { FiUsers, FiEdit2, FiCheck, FiX, FiUser, FiPlus, FiShield, FiZap, FiSearch, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import Swal from 'sweetalert2';

const TL_COLORS = [
  { accent: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)' },
  { accent: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)' },
  { accent: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  { accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  { accent: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)' },
  { accent: '#14b8a6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.25)' },
];

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function TeamHierarchyPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [selectedTlId, setSelectedTlId] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [unassignedPage, setUnassignedPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) setEmployees(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const isTL = (role) => {
    const r = (role || '').toLowerCase();
    return r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead';
  };

  const EXCLUDED_ROLES = ['client', 'admin', 'management', 'hr management', 'dns manager', 'candidate', 'it engineer', 'it support'];
  const teamLeaders = employees.filter(emp => isTL(emp.role) && emp.status !== 'Inactive');
  const regularEmployees = employees.filter(emp => {
    const r = (emp.role || '').toLowerCase();
    return !isTL(emp.role) && emp.status !== 'Inactive' && !EXCLUDED_ROLES.includes(r) && !r.includes('marketing') && !r.includes('candidate');
  });

  const q = search.toLowerCase().trim();
  const matchSearch = (emp) => !q || (emp.name || '').toLowerCase().includes(q) || (emp.department || '').toLowerCase().includes(q);

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSaveTL = async (empId) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tl_id: selectedTlId })
      });
      const data = await res.json();
      if (data.success) {
        setEditingEmpId(null);
        fetchEmployees();
      } else {
        Swal.fire('Error', data.error || 'Failed to update', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error', 'error');
    } finally { setSaving(false); }
  };

  const totalAssigned = regularEmployees.filter(e => e.tl_id).length;
  const unassignedAll = regularEmployees.filter(e => !e.tl_id);
  const unassignedFiltered = unassignedAll.filter(matchSearch);
  const unassignedTotalPages = Math.ceil(unassignedFiltered.length / PAGE_SIZE) || 1;
  const safePage = Math.min(unassignedPage, unassignedTotalPages);
  const unassignedPaged = unassignedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading hierarchy...</span>
      </div>
    );
  }

  const EmployeeRow = ({ emp, palette }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: palette ? `${palette.accent}22` : 'rgba(245,158,11,0.12)', color: palette ? palette.accent : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.7rem', flexShrink: 0 }}>
        {getInitials(emp.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{emp.name}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '8px' }}>{emp.department || emp.role}</span>
      </div>
      {editingEmpId === emp.id ? (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <select value={selectedTlId} onChange={e => setSelectedTlId(e.target.value)}
            style={{ padding: '4px 6px', borderRadius: '6px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', fontSize: '0.78rem', maxWidth: '130px' }}>
            <option value="">None</option>
            {teamLeaders.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
          </select>
          <button onClick={() => handleSaveTL(emp.id)} disabled={saving}
            style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}>
            <FiCheck size={12} />
          </button>
          <button onClick={() => setEditingEmpId(null)}
            style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
            <FiX size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => { setEditingEmpId(emp.id); setSelectedTlId(emp.tl_id || ''); }}
          style={{ padding: '4px 10px', borderRadius: '6px', background: palette ? `${palette.accent}14` : 'rgba(245,158,11,0.1)', color: palette ? palette.accent : '#f59e0b', fontSize: '0.75rem', fontWeight: '600', border: `1px solid ${palette ? palette.border : 'rgba(245,158,11,0.2)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          {emp.tl_id ? <><FiEdit2 size={11} /> Reassign</> : <><FiPlus size={11} /> Assign</>}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <FiUsers /> Team Hierarchy
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {teamLeaders.length} TLs · {totalAssigned} assigned · {unassignedAll.length} unassigned · {regularEmployees.length} total members
          </p>
        </div>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={14} />
          <input type="text" placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setUnassignedPage(1); }}
            style={{ width: '100%', padding: '8px 10px 8px 32px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Unassigned Section (Collapsible) */}
      {unassignedAll.length > 0 && (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '14px', marginBottom: '20px', overflow: 'hidden' }}>
          <button onClick={() => toggleCollapse('unassigned')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', cursor: 'pointer', background: 'rgba(245,158,11,0.06)', border: 'none', borderBottom: collapsed['unassigned'] ? 'none' : '1px solid rgba(245,158,11,0.15)', color: 'var(--text-primary)', textAlign: 'left' }}>
            {collapsed['unassigned'] ? <FiChevronRight size={15} color="#f59e0b" /> : <FiChevronDown size={15} color="#f59e0b" />}
            <FiZap size={14} color="#f59e0b" />
            <span style={{ fontWeight: '700', fontSize: '0.9rem', flex: 1 }}>Unassigned Employees</span>
            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>{unassignedFiltered.length}</span>
          </button>
          {!collapsed['unassigned'] && (
            <div style={{ padding: '10px 14px 14px' }}>
              {unassignedPaged.map(emp => <EmployeeRow key={emp.id} emp={emp} palette={null} />)}
              {unassignedFiltered.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {q ? 'No matching unassigned employees.' : 'All employees are assigned!'}
                </div>
              )}
              {/* Pagination */}
              {unassignedTotalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button disabled={safePage <= 1} onClick={() => setUnassignedPage(safePage - 1)}
                    style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: safePage <= 1 ? 'default' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1, fontSize: '0.8rem' }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Page {safePage} of {unassignedTotalPages}
                  </span>
                  <button disabled={safePage >= unassignedTotalPages} onClick={() => setUnassignedPage(safePage + 1)}
                    style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: safePage >= unassignedTotalPages ? 'default' : 'pointer', opacity: safePage >= unassignedTotalPages ? 0.4 : 1, fontSize: '0.8rem' }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TL Sections (Accordion) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {teamLeaders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
            <FiUsers size={36} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p style={{ fontWeight: '600' }}>No Team Leaders found.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Create employees with role "Team Leader" to see them here.</p>
          </div>
        )}

        {teamLeaders.map((tl, idx) => {
          const palette = TL_COLORS[idx % TL_COLORS.length];
          const tlEmps = regularEmployees.filter(e => e.tl_id === tl.id).filter(matchSearch);
          const isOpen = !collapsed[tl.id];

          return (
            <div key={tl.id} style={{ background: 'var(--glass-bg)', border: `1px solid ${palette.border}`, borderRadius: '14px', overflow: 'hidden' }}>
              {/* TL Header (clickable) */}
              <button onClick={() => toggleCollapse(tl.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', background: palette.bg, border: 'none', borderBottom: isOpen ? `1px solid ${palette.border}` : 'none', color: 'var(--text-primary)', textAlign: 'left' }}>
                {isOpen ? <FiChevronDown size={15} color={palette.accent} /> : <FiChevronRight size={15} color={palette.accent} />}
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${palette.accent}20`, color: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem', flexShrink: 0 }}>
                  {getInitials(tl.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: palette.accent }}>{tl.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginLeft: '8px' }}>Team Leader</span>
                </div>
                <span style={{ background: `${palette.accent}18`, color: palette.accent, padding: '3px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', border: `1px solid ${palette.border}` }}>
                  {tlEmps.length} {tlEmps.length === 1 ? 'Member' : 'Members'}
                </span>
              </button>

              {/* Members */}
              {isOpen && (
                <div style={{ padding: '10px 14px 14px' }}>
                  {tlEmps.map(emp => <EmployeeRow key={emp.id} emp={emp} palette={palette} />)}
                  {tlEmps.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      {q ? 'No matching members.' : 'No members assigned yet.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
