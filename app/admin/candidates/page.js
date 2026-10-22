'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FiUsers, FiSearch, FiMessageSquare, FiPlus, FiX, FiTrash2, FiMail, FiPhone, FiCalendar } from 'react-icons/fi';
import Pagination from '../../components/Pagination.js';

export default function CandidatesPoolPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', role_applied: '', resume_url: '' });
  const [feedbackForm, setFeedbackForm] = useState({ id: '', name: '', status: 'Pending', feedback: '' });

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/candidates-pool');
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/candidates-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Success', 'Candidate added to pool!', 'success');
        setShowAddModal(false);
        setAddForm({ name: '', email: '', phone: '', role_applied: '', resume_url: '' });
        fetchCandidates();
      } else {
        Swal.fire('Error', data.error || 'Failed to add candidate', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error', 'error');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/candidates-pool', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: feedbackForm.id,
          status: feedbackForm.status,
          feedback: feedbackForm.feedback
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Success', 'Feedback saved successfully!', 'success');
        setShowFeedbackModal(false);
        fetchCandidates();
      } else {
        Swal.fire('Error', data.error || 'Failed to save feedback', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error', 'error');
    }
  };

  const handleDeleteCandidate = async (candidate) => {
    const result = await Swal.fire({
      title: 'Delete Candidate?',
      html: `Are you sure you want to remove <b>${candidate.name || 'this candidate'}</b> from the pool?<br/><small style="color: #ef4444;">This action cannot be undone.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/candidates-pool?id=${candidate.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          title: 'Deleted!',
          text: 'Candidate has been removed from the pool.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
        fetchCandidates();
      } else {
        Swal.fire('Error', data.error || 'Failed to delete candidate', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error occurred', 'error');
    }
  };

  // Filter and Pagination
  const filtered = candidates.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selected': return <span className="status-tag resolved">Selected</span>;
      case 'Rejected': return <span className="status-tag closed">Rejected</span>;
      default: return <span className="status-tag open">Pending</span>;
    }
  };

  return (
    <div className="admin-content" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUsers className="title-icon" /> Candidate Pool
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Manage potential hires, track status, and store feedback for future opportunities.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}
        >
          <FiPlus /> Add Candidate
        </button>
      </div>

      <div className="controls-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search candidates by name or email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          className="form-control"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ width: '180px' }}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Selected">Selected</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="cand-desktop-view">
        <div className="table-wrapper" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'rgba(128,128,128,0.05)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Date Added</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Name & Contact</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Role Applied</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)', minWidth: '190px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading candidates...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No candidates found in pool.</td>
                </tr>
              ) : (
                paginated.map((cand) => (
                  <tr key={cand.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(cand.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cand.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cand.email}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cand.phone}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                      {cand.role_applied || '-'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {getStatusBadge(cand.status)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <button
                          onClick={() => {
                            setFeedbackForm({ id: cand.id, name: cand.name, status: cand.status || 'Pending', feedback: cand.feedback || '' });
                            setShowFeedbackModal(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '7px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', lineHeight: 1 }}
                          title="Evaluate candidate and edit feedback"
                        >
                          <FiMessageSquare style={{ fontSize: '0.95rem', flexShrink: 0 }} /> Feedback
                        </button>
                        <button
                          onClick={() => handleDeleteCandidate(cand)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '7px 12px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                            lineHeight: 1,
                            transition: 'all 0.2s ease'
                          }}
                          title="Permanently remove candidate from pool"
                        >
                          <FiTrash2 style={{ fontSize: '0.95rem', flexShrink: 0 }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="cand-mobile-view">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading candidates...</div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No candidates found in pool.</div>
        ) : (
          paginated.map((cand) => (
            <div key={cand.id} className="cand-card">
              <div className="cand-card-header">
                <div>
                  <div className="cand-card-title">{cand.name}</div>
                  <div className="cand-card-meta">
                    <FiCalendar style={{ flexShrink: 0 }} /> {new Date(cand.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  {getStatusBadge(cand.status)}
                </div>
              </div>

              {cand.role_applied && (
                <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>
                  💼 {cand.role_applied}
                </div>
              )}

              <div className="cand-card-row">
                {cand.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMail style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                    <span style={{ wordBreak: 'break-all' }}>{cand.email}</span>
                  </div>
                )}
                {cand.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiPhone style={{ color: '#10b981', flexShrink: 0 }} />
                    <span>{cand.phone}</span>
                  </div>
                )}
                {cand.feedback && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '6px', marginTop: '4px', fontStyle: 'italic', lineHeight: '1.4' }}>
                    💬 "{cand.feedback}"
                  </div>
                )}
              </div>

              <div className="cand-card-actions">
                <button
                  onClick={() => {
                    setFeedbackForm({ id: cand.id, name: cand.name, status: cand.status || 'Pending', feedback: cand.feedback || '' });
                    setShowFeedbackModal(true);
                  }}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    lineHeight: 1
                  }}
                >
                  <FiMessageSquare style={{ fontSize: '1rem', flexShrink: 0 }} /> Feedback
                </button>
                <button
                  onClick={() => handleDeleteCandidate(cand)}
                  style={{
                    flex: 1,
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    lineHeight: 1
                  }}
                >
                  <FiTrash2 style={{ fontSize: '1rem', flexShrink: 0 }} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ padding: '15px 0' }}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add Candidate to Pool</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" required className="form-control" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" className="form-control" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Role Applied For</label>
                <input type="text" className="form-control" value={addForm.role_applied} onChange={e => setAddForm({ ...addForm, role_applied: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback & Status Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Evaluate: {feedbackForm.name}</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Candidate Status</label>
                <select className="form-control" value={feedbackForm.status} onChange={e => setFeedbackForm({ ...feedbackForm, status: e.target.value })}>
                  <option value="Pending">Pending</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group">
                <label>HR Feedback / Notes</label>
                <textarea
                  className="form-control"
                  rows="6"
                  placeholder="Enter evaluation details, interview feedback, and reasons for selection/rejection..."
                  value={feedbackForm.feedback}
                  onChange={e => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Desktop vs Mobile display */
        .cand-desktop-view {
          display: block;
        }
        .cand-mobile-view {
          display: none !important;
        }

        /* Mobile Card Styles */
        .cand-card {
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cand-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .cand-card-title {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .cand-card-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
        .cand-card-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .cand-card-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 4px;
          padding-top: 10px;
          border-top: 1px solid var(--glass-border);
        }
        .cand-card-actions button {
          min-height: 38px;
        }

        @media (min-width: 769px) {
          .cand-mobile-view {
            display: none !important;
          }
          .cand-desktop-view {
            display: block !important;
          }
        }

        @media (max-width: 768px) {
          .admin-content {
            padding: 1rem !important;
          }
          .page-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .controls-bar {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .controls-bar > div {
            max-width: 100% !important;
          }
          .controls-bar select {
            width: 100% !important;
          }
          .cand-desktop-view {
            display: none !important;
          }
          .cand-mobile-view {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
        }
      ` }} />
    </div>
  );
}
