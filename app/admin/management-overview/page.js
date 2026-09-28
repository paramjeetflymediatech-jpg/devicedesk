'use client';
import { useState, useEffect } from 'react';
import { FiActivity, FiUsers, FiClipboard, FiCheckSquare, FiClock, FiAlertTriangle, FiUser, FiRefreshCw, FiSearch } from 'react-icons/fi';

const STATUS_COLORS = {
  'Pending': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  'Pending Assignment': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  'Assigned': { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'In Progress': { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
  'For TL Review': { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
  'Completed': { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
};

export default function ManagementOverviewPage() {
  const [requests, setRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [reqRes, taskRes, empRes] = await Promise.all([
        fetch('/api/client-services/requests'),
        fetch('/api/tasks'),
        fetch('/api/employees'),
      ]);
      const [reqData, taskData, empData] = await Promise.all([
        reqRes.json(), taskRes.json(), empRes.json()
      ]);
      if (reqData.success) setRequests(reqData.data || []);
      if (taskData.success) setTasks(taskData.data || []);
      if (empData.success) setEmployees(empData.data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isTL = (role) => {
    const r = (role || '').toLowerCase();
    return r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead';
  };

  const teamLeaders = employees.filter(e => isTL(e.role));

  // Build enriched request rows with full chain info
  const enrichedRequests = requests.map(req => {
    const relatedTasks = tasks.filter(t => t.project_id === req.id);
    const tlEmployee = employees.find(e => e.id === req.assigned_tl_id);
    return { ...req, relatedTasks, tlEmployee };
  });

  const filtered = enrichedRequests.filter(req => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (req.client_name || req.clientId || '').toLowerCase().includes(q) ||
      (req.service_type || '').toLowerCase().includes(q) ||
      (req.tl_name || '').toLowerCase().includes(q) ||
      (req.requirements || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'All' || req.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalRequests = requests.length;
  const pendingAssignment = requests.filter(r => !r.assigned_tl_id).length;
  const inProgress = requests.filter(r => ['Assigned', 'In Progress', 'For TL Review'].includes(r.status)).length;
  const completed = requests.filter(r => r.status === 'Completed').length;

  const StatusBadge = ({ status }) => {
    const s = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };
    return (
      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
        {status || 'Pending'}
      </span>
    );
  };

  return (
    <div className="page-container p-6">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: '700' }}>
          <FiActivity /> Management Overview
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent-cyan)', color: '#000', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem' }}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Requests', value: totalRequests, icon: <FiClipboard />, color: '#6366f1' },
          { label: 'Awaiting TL', value: pendingAssignment, icon: <FiAlertTriangle />, color: '#f59e0b' },
          { label: 'In Progress', value: inProgress, icon: <FiClock />, color: '#8b5cf6' },
          { label: 'Completed', value: completed, icon: <FiCheckSquare />, color: '#10b981' },
          { label: 'Team Leaders', value: teamLeaders.length, icon: <FiUsers />, color: '#06b6d4' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${stat.color}22`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TL Summary Row */}
      <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
          Team Leaders — Assigned Requests
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {teamLeaders.length === 0 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No team leaders found.</span>
          )}
          {teamLeaders.map(tl => {
            const tlRequests = requests.filter(r => r.assigned_tl_id === tl.id);
            const tlTasks = tasks.filter(t => tlRequests.some(r => r.id === t.project_id));
            const tlEmployees = employees.filter(e => e.tl_id === tl.id);
            return (
              <div key={tl.id} style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '12px 16px', minWidth: '200px' }}>
                <div style={{ fontWeight: '700', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <FiUser size={13} /> {tl.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>👥 {tlEmployees.length} Employees</span>
                  <span>📋 {tlRequests.length} Requests</span>
                  <span>✅ {tlTasks.filter(t => t.status === 'Completed').length} Tasks Done</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by client, service, TL..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' }}
        >
          {['All', 'Pending', 'Assigned', 'In Progress', 'For TL Review', 'Completed'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Full Interaction Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading overview...</div>
      ) : (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                  {['Client', 'Service', 'Requirement', 'Assigned TL', 'Employees on Task', 'Request Status', 'Task Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => {
                  const assignees = req.relatedTasks.map(t => t.assignedToName).filter(Boolean);
                  const uniqueAssignees = [...new Set(assignees)];
                  const taskStatuses = [...new Set(req.relatedTasks.map(t => t.status))];
                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {req.client_name || req.clientId || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                          {req.service_type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.requirements}>
                        {req.requirements}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        {req.tl_name ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                            <FiUser size={12} /> {req.tl_name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--status-critical)', fontSize: '0.8rem' }}>⚠ Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {uniqueAssignees.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {uniqueAssignees.map(name => (
                              <span key={name} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No tasks yet</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <StatusBadge status={req.status} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {taskStatuses.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {taskStatuses.map(s => <StatusBadge key={s} status={s} />)}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
