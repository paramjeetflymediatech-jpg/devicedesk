'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FiClock, FiMessageSquare, FiFileText, FiCheckSquare, FiFilter, FiArrowLeft, FiActivity } from 'react-icons/fi';
import Pagination from '../../components/Pagination.js';

export default function AdminActivityLog() {
  const [filter, setFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // MOCK MASTER LOG
  const logs = [
    { id: 1, type: 'CLIENT_REQUEST', user: 'Client: Acme Corp', action: 'Booked new SEO Service', time: '10:00 AM, Sep 12', details: 'Requirements: Need monthly keyword ranking.' },
    { id: 2, type: 'TL_ASSIGNMENT', user: 'TL: Marketing', action: 'Assigned TS-101 to Alice Smith', time: '10:15 AM, Sep 12', details: 'Task: SEO Keyword Analysis.' },
    { id: 3, type: 'MEMBER_CHAT', user: 'Member: Alice Smith', action: 'Sent message to TL', time: '02:15 PM, Sep 12', details: '"Hey boss, the backlink audit is done."' },
    { id: 4, type: 'MEMBER_EOD', user: 'Member: Alice Smith', action: 'Submitted Daily EOD', time: '04:30 PM, Sep 12', details: '"Completed keyword analysis for Acme Corp."' },
    { id: 5, type: 'TL_EOD_REVIEW', user: 'TL: Marketing', action: 'Reviewed EOD from Alice Smith', time: '04:45 PM, Sep 12', details: 'Status: Approved internally.' },
    { id: 6, type: 'CLIENT_CHAT', user: 'TL: Marketing', action: 'Sent EOD update to Acme Corp', time: '05:00 PM, Sep 12', details: '"Hi Acme! The backlink audit is complete."' }
  ];

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.type.includes(filter));

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getIcon = (type) => {
    if (type.includes('CLIENT')) return <FiCheckSquare style={{ color: '#06b6d4' }} />;
    if (type.includes('CHAT')) return <FiMessageSquare style={{ color: '#a855f7' }} />;
    if (type.includes('EOD')) return <FiFileText style={{ color: '#10b981' }} />;
    return <FiClock style={{ color: '#94a3b8' }} />;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/employee-dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '8px' }}>
              <FiArrowLeft /> Back to Dashboard
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiActivity style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Global Activity Log
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Full oversight of all Client, TL, and Member interactions.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
            <FiFilter style={{ color: 'var(--text-muted, #64748b)' }} />
            <select 
              value={filter} 
              onChange={e => { setFilter(e.target.value); setCurrentPage(1); }} 
              className="form-control"
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem' }}
            >
              <option value="ALL" style={{ background: '#0f172a' }}>All Activities</option>
              <option value="CLIENT" style={{ background: '#0f172a' }}>Client Actions</option>
              <option value="TL" style={{ background: '#0f172a' }}>TL Actions</option>
              <option value="MEMBER" style={{ background: '#0f172a' }}>Member Actions</option>
              <option value="CHAT" style={{ background: '#0f172a' }}>All Chats</option>
            </select>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', padding: '1.5rem', overflow: 'hidden' }}>
          <div style={{ position: 'relative', borderLeft: '2px solid rgba(255,255,255,0.1)', marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {paginatedLogs.map(log => (
              <div key={log.id} style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                <div style={{ position: 'absolute', left: '-15px', top: '2px', width: '28px', height: '28px', background: '#0f172a', border: '2px solid var(--glass-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getIcon(log.type)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary, #f8fafc)', fontSize: '0.9rem' }}>{log.user}</span>
                    <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>{log.action}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple, #a855f7)', marginLeft: 'auto', background: 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{log.time}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px 14px', marginTop: '6px' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', fontStyle: 'italic' }}>{log.details}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No activity logs recorded.</div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="activity logs"
        />
      </div>
    </div>
  );
}
