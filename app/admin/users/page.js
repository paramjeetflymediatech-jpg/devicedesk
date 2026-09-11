'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiUser, FiLink, FiArrowLeft, FiEdit2, FiCheck, FiX, FiShield } from 'react-icons/fi';
import { getEmployeeSlug } from '../../utils/slugUtils.js';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', department: '', status: '' });

  const roles = ['admin', 'client', 'marketing', 'dept_team_leader', 'dept_team_member'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.id);
    setEditForm({ role: user.role, department: user.department, status: user.status });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const res = await fetch(`/api/employees/${editingUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchUsers(); // Refresh data
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Error updating user');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link 
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--accent-cyan, #06b6d4)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                marginBottom: '8px'
              }}
            >
              <FiArrowLeft /> Back to Main Dashboard
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiUser style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> User & Role Management
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Direct access to all registered users, dynamic user slugs, and role permission assignments.
            </p>
          </div>
        </div>
        
        {/* Table Container */}
        <div className="table-wrapper" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Name</th>
                <th style={{ padding: '14px 16px' }}>User Slug</th>
                <th style={{ padding: '14px 16px' }}>Email</th>
                <th style={{ padding: '14px 16px' }}>Role</th>
                <th style={{ padding: '14px 16px' }}>Department</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const userSlug = getEmployeeSlug(user);

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      <Link 
                        href={`/admin/users/${userSlug}`}
                        style={{ color: 'var(--text-primary, #f8fafc)', textDecoration: 'none' }}
                      >
                        {user.name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link
                        href={`/admin/users/${userSlug}`}
                        className="timer-badge"
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--accent-purple, #a855f7)',
                          borderColor: 'rgba(168, 85, 247, 0.4)',
                          background: 'rgba(168, 85, 247, 0.08)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`View profile for ${userSlug}`}
                      >
                        <FiLink style={{ fontSize: '0.65rem' }} /> @{userSlug}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
                      {user.email}
                    </td>
                    
                    {editingUser === user.id ? (
                      <td colSpan="3" style={{ padding: '14px 16px' }}>
                        <form id={`edit-form-${user.id}`} onSubmit={handleUpdate} style={{ display: 'flex', gap: '8px' }}>
                          <select 
                            value={editForm.role} 
                            onChange={e => setEditForm({...editForm, role: e.target.value})}
                            className="form-control"
                            style={{ padding: '6px', fontSize: '0.85rem' }}
                          >
                            <option value="">Select Role</option>
                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <input 
                            type="text" 
                            value={editForm.department || ''} 
                            onChange={e => setEditForm({...editForm, department: e.target.value})}
                            className="form-control"
                            style={{ padding: '6px', fontSize: '0.85rem', width: '130px' }}
                            placeholder="Department"
                          />
                          <select 
                            value={editForm.status} 
                            onChange={e => setEditForm({...editForm, status: e.target.value})}
                            className="form-control"
                            style={{ padding: '6px', fontSize: '0.85rem' }}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td style={{ padding: '14px 16px' }}>
                          <span className="status-tag inprogress" style={{ fontSize: '0.75rem' }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary, #94a3b8)' }}>
                          {user.department || '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span className={`status-tag ${user.status === 'Active' ? 'resolved' : 'open'}`}>
                            {user.status || 'Active'}
                          </span>
                        </td>
                      </>
                    )}

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {editingUser === user.id ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            type="submit" 
                            form={`edit-form-${user.id}`} 
                            className="btn-action start"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <FiCheck /> Save
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setEditingUser(null)} 
                            className="btn-action resolve"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <FiX /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            onClick={() => handleEditClick(user)} 
                            className="btn-action start"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <FiEdit2 /> Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading user listings...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

