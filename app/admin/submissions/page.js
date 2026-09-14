'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiFileText, FiSearch } from 'react-icons/fi';
import Pagination from '../../components/Pagination.js';

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/work-submissions');
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideStatus = async (id, newStatus) => {
    if (!window.confirm(`Are you sure you want to force status to ${newStatus}?`)) return;
    
    try {
      const res = await fetch(`/api/work-submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          new_status: newStatus,
          comment: 'Admin Status Override',
          changed_by: 'admin_sys'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchSubmissions();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error overriding status');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = (s.id || '').toLowerCase().includes(q) || (s.project_id || '').toLowerCase().includes(q) || (s.task_id || '').toLowerCase().includes(q) || (s.submitted_by || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || (s.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSubmissions.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSubmissions = filteredSubmissions.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '8px' }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiFileText style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Global Work Submissions
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Inspect, review, and override submitted work artifacts across all departments.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '1.5rem', 
          background: 'rgba(255, 255, 255, 0.02)', 
          padding: '1rem', 
          borderRadius: '12px', 
          border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #64748b)' }} />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search by submission ID, project, task, or user..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px', width: '100%', height: '40px' }}
            />
          </div>
          <select 
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ minWidth: '140px', height: '40px' }}
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Published">Published</option>
            <option value="Changes Requested">Changes Requested</option>
          </select>
        </div>

        <div className="table-wrapper" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Sub ID</th>
                <th style={{ padding: '14px 16px' }}>Project ID</th>
                <th style={{ padding: '14px 16px' }}>Task ID</th>
                <th style={{ padding: '14px 16px' }}>Submitted By</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions / Override</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubmissions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>{sub.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{sub.project_id || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>{sub.task_id || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>{sub.submitted_by}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-tag ${
                      sub.status === 'Approved' ? 'resolved' : 
                      sub.status === 'Published' ? 'completed' :
                      sub.status === 'Changes Requested' ? 'open' : 'inprogress'
                    }`}>
                      {sub.status || 'Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {sub.file_url && (
                        <a href={sub.file_url} target="_blank" rel="noreferrer" className="btn-action start" style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                          View File
                        </a>
                      )}
                      
                      {/* Admin Override Controls */}
                      <select 
                        className="form-control"
                        style={{ padding: '2px 6px', fontSize: '0.75rem', width: 'auto', height: '28px' }}
                        onChange={(e) => {
                          if (e.target.value) handleOverrideStatus(sub.id, e.target.value);
                          e.target.value = '';
                        }}
                      >
                        <option value="">Force Status...</option>
                        <option value="Draft">Draft</option>
                        <option value="Changes Requested">Changes Requested</option>
                        <option value="Approved">Approved</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSubmissions.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No submissions found.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading submissions...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredSubmissions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="submissions"
        />
      </div>
    </div>
  );
}
