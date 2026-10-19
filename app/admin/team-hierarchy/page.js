'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiUsers, FiEdit2, FiCheck, FiX, FiUser, FiPlus, FiShield,
  FiZap, FiSearch, FiChevronDown, FiChevronRight, FiTv, FiEye
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import ManageTeamScreenshotsModal from '../../components/modals/ManageTeamScreenshotsModal.js';

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

function isEmpAssignedToTL(emp, tlId) {
  if (!emp || !tlId) return false;
  if (Array.isArray(emp.tl_ids)) return emp.tl_ids.map(String).includes(String(tlId));
  const ids = (emp.tl_id || '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(String(tlId));
}

export default function TeamHierarchyPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageModalTlId, setManageModalTlId] = useState(null);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team-hierarchy');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.regularEmployees || []);
        if (data.teamLeaders) setTeamLeaders(data.teamLeaders);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const [teamLeaders, setTeamLeaders] = useState([]);

  const isTL = (role) => {
    const r = (role || '').toLowerCase();
    return r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead' || r === 'leader';
  };

  const EXCLUDED_ROLES = ['client', 'admin', 'management', 'hr management', 'dns manager', 'candidate', 'it engineer', 'it support'];
  const regularEmployees = employees.filter(emp => {
    const r = (emp.role || '').toLowerCase();
    return !isTL(emp.role) && emp.status !== 'Inactive' && !EXCLUDED_ROLES.includes(r) && !r.includes('marketing') && !r.includes('candidate');
  });

  const q = search.toLowerCase().trim();
  const matchSearch = (emp) => !q || (emp.name || '').toLowerCase().includes(q) || (emp.department || '').toLowerCase().includes(q);

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const totalAssigned = regularEmployees.filter(e => (e.tl_ids?.length > 0 || (e.tl_id && e.tl_id.trim() !== ''))).length;
  const unassignedAll = regularEmployees.filter(e => (!e.tl_ids || e.tl_ids.length === 0) && (!e.tl_id || e.tl_id.trim() === ''));
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

  const EmployeeRow = ({ emp, palette, currentTlId }) => {
    const allTlIds = emp.tl_ids || (emp.tl_id || '').split(',').map(s => s.trim()).filter(Boolean);
    const otherTlNames = allTlIds
      .filter(id => String(id) !== String(currentTlId))
      .map(id => teamLeaders.find(t => String(t.id) === String(id))?.name)
      .filter(Boolean);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: palette ? `${palette.accent}22` : 'rgba(245,158,11,0.12)', color: palette ? palette.accent : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.75rem', flexShrink: 0 }}>
          {getInitials(emp.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.88rem' }}>{emp.name}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{emp.department || emp.role}</span>
            {otherTlNames.length > 0 && (
              <span style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '1px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600' }}>
                Co-assigned with: {otherTlNames.join(', ')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setManageModalTlId(currentTlId || (teamLeaders[0]?.id || null));
            setIsManageModalOpen(true);
          }}
          style={{ padding: '4px 10px', borderRadius: '6px', background: palette ? `${palette.accent}14` : 'rgba(245,158,11,0.1)', color: palette ? palette.accent : '#f59e0b', fontSize: '0.75rem', fontWeight: '600', border: `1px solid ${palette ? palette.border : 'rgba(245,158,11,0.2)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
        >
          {allTlIds.length > 0 ? <><FiEdit2 size={11} /> Manage TLs ({allTlIds.length})</> : <><FiPlus size={11} /> Assign TL</>}
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <FiUsers /> Team Hierarchy & Screenshot Access
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {teamLeaders.length} TLs · {totalAssigned} assigned · {unassignedAll.length} unassigned · {regularEmployees.length} total members (supports multiple TLs per member)
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Decide TL Screenshot Access Button */}
          <button
            type="button"
            onClick={() => {
              setManageModalTlId(null);
              setIsManageModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.2) 100%)',
              color: '#38bdf8',
              border: '1px solid rgba(6,182,212,0.35)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <FiShield /> Decide TL Screenshot Access
          </button>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={14} />
            <input type="text" placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setUnassignedPage(1); }}
              style={{ width: '100%', padding: '8px 10px 8px 32px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* Unassigned Section (Collapsible) */}
      {unassignedAll.length > 0 && (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '14px', marginBottom: '20px', overflow: 'hidden' }}>
          <button onClick={() => toggleCollapse('unassigned')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', cursor: 'pointer', background: 'rgba(245,158,11,0.06)', border: 'none', borderBottom: collapsed['unassigned'] ? 'none' : '1px solid rgba(245,158,11,0.15)', color: 'var(--text-primary)', textAlign: 'left' }}>
            {collapsed['unassigned'] ? <FiChevronRight size={15} color="#f59e0b" /> : <FiChevronDown size={15} color="#f59e0b" />}
            <FiZap size={14} color="#f59e0b" />
            <span style={{ fontWeight: '700', fontSize: '0.9rem', flex: 1 }}>Unassigned Employees (Admin-only visibility)</span>
            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>{unassignedFiltered.length}</span>
          </button>
          {!collapsed['unassigned'] && (
            <div style={{ padding: '10px 14px 14px' }}>
              {unassignedPaged.map(emp => <EmployeeRow key={emp.id} emp={emp} palette={null} currentTlId={null} />)}
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
          const tlEmps = regularEmployees.filter(e => isEmpAssignedToTL(e, tl.id)).filter(matchSearch);
          const subTls = teamLeaders.filter(other => String(other.id) !== String(tl.id) && isEmpAssignedToTL(other, tl.id));
          const parentTlIds = tl.tl_ids || (tl.tl_id || '').split(',').map(s => s.trim()).filter(Boolean);
          const parentTlNames = parentTlIds.map(id => teamLeaders.find(t => String(t.id) === String(id))?.name).filter(Boolean);
          const isOpen = !collapsed[tl.id];

          return (
            <div key={tl.id} style={{ background: 'var(--glass-bg)', border: `1px solid ${palette.border}`, borderRadius: '14px', overflow: 'hidden' }}>
              {/* TL Header Card Bar */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: palette.bg,
                  borderBottom: isOpen ? `1px solid ${palette.border}` : 'none',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                {/* Left: Collapsible toggle trigger */}
                <div
                  onClick={() => toggleCollapse(tl.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: '220px'
                  }}
                >
                  {isOpen ? <FiChevronDown size={15} color={palette.accent} /> : <FiChevronRight size={15} color={palette.accent} />}
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${palette.accent}20`, color: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem', flexShrink: 0 }}>
                    {subTls.length > 0 ? '👑' : getInitials(tl.name)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', color: palette.accent }}>{tl.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Team Leader</span>
                      {subTls.length > 0 && (
                        <span style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '1px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700' }}>
                          👑 Senior TL (+{subTls.length} Subordinate TL{subTls.length === 1 ? '' : 's'})
                        </span>
                      )}
                      {parentTlNames.length > 0 && (
                        <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '1px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700' }}>
                          Reports to: {parentTlNames.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ background: `${palette.accent}18`, color: palette.accent, padding: '3px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', border: `1px solid ${palette.border}`, marginLeft: '8px' }}>
                    {tlEmps.length} {tlEmps.length === 1 ? 'Regular Member' : 'Regular Members'}
                  </span>
                </div>

                {/* Right: Quick Check & Decide Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Check Screenshots in Admin View */}
                  <Link
                    href={`/admin/screenshots?tlId=${tl.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#06b6d4',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      textDecoration: 'none'
                    }}
                    title="Check this Team Leader's screenshot view"
                  >
                    <FiTv size={12} /> Check Screenshots
                  </Link>

                  {/* Decide Screenshot Access for this TL */}
                  <button
                    type="button"
                    onClick={() => {
                      setManageModalTlId(tl.id);
                      setIsManageModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: `${palette.accent}22`,
                      color: palette.accent,
                      border: `1px solid ${palette.border}`,
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Decide which members this Team Leader can see"
                  >
                    <FiShield size={12} /> Decide Members
                  </button>
                </div>
              </div>

              {/* Members List */}
              {isOpen && (
                <div style={{ padding: '10px 14px 14px' }}>
                  {/* Subordinate Team Leaders (Senior/Main TL Oversight) */}
                  {subTls.length > 0 && (
                    <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.07)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>👑</span>
                        <span style={{ fontWeight: '800', fontSize: '0.82rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Subordinate Team Leaders ({subTls.length}) — Full Team Oversight Active
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {subTls.map(subTl => (
                          <div key={subTl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.2)', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.75rem' }}>
                                👑
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{subTl.name}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#b45309', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                    TL · {subTl.department || 'General'}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', background: 'rgba(2, 132, 199, 0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                    👥 {subTl.membersCount || 0} members
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  "{tl.name}" can view this TL's screenshots + all screenshots of their {subTl.membersCount || 0} team members.
                                </div>
                              </div>
                            </div>
                            <Link
                              href={`/admin/screenshots?tlId=${subTl.id}`}
                              style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '700', textDecoration: 'none', border: '1px solid rgba(245, 158, 11, 0.3)', whiteSpace: 'nowrap' }}
                            >
                              Check Screenshots →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {subTls.length > 0 && tlEmps.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 8px 4px' }}>
                      <FiUsers size={14} color="var(--text-secondary)" />
                      <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Directly Assigned Team Members ({tlEmps.length})
                      </span>
                    </div>
                  )}

                  {tlEmps.map(emp => <EmployeeRow key={emp.id} emp={emp} palette={palette} currentTlId={tl.id} />)}
                  {tlEmps.length === 0 && subTls.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      {q ? 'No matching members.' : 'No members assigned yet. Click "Decide Members" above to assign.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Decide TL Screenshot Access Modal */}
      <ManageTeamScreenshotsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        initialTlId={manageModalTlId}
        onSuccess={() => fetchEmployees()}
      />
    </div>
  );
}
