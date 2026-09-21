'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiBriefcase, FiLink, FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getDepartmentSlug } from '../../utils/slugUtils.js';
import Pagination from '../../components/Pagination.js';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editDept, setEditDept] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setDescription('');
        fetchDepartments();
      } else {
        alert(data.error || 'Failed to create department');
      }
    } catch (err) {
      alert('Error creating department');
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(departments.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedDepartments = departments.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleDelete = async (id, deptName) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete department "${deptName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/departments', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Deleted!', 'Department deleted successfully.', 'success');
          fetchDepartments();
        } else {
          Swal.fire('Error', data.error || 'Failed to delete department', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Network error.', 'error');
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editDept.id, name: editDept.name, description: editDept.description })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Success', 'Department updated successfully', 'success');
        setEditDept(null);
        fetchDepartments();
      } else {
        Swal.fire('Error', data.error || 'Failed to update department', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error.', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
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
              <FiBriefcase style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Department Settings
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Manage company departments and view department metrics by slug.
            </p>
          </div>
        </div>

        {/* Add Department Form */}
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPlus /> Add New Department
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Department Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="form-control"
                placeholder="e.g. Mobile Engineering"
              />
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <input 
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="form-control"
                placeholder="Brief summary of department responsibilities"
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Department'}
          </button>
        </form>

        {/* Departments Table */}
        <div className="table-wrapper" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          overflowX: 'auto'
        }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Department Name</th>
                <th style={{ padding: '14px 16px' }}>Slug Badge</th>
                <th style={{ padding: '14px 16px' }}>Description</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDepartments.map((dept) => {
                const deptSlug = getDepartmentSlug(dept.name);

                return (
                  <tr key={dept.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      <Link href={`/admin/departments/${deptSlug}`} style={{ color: 'var(--text-primary, #f8fafc)', textDecoration: 'none' }}>
                        {dept.name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link
                        href={`/admin/departments/${deptSlug}`}
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
                        title={`View ${deptSlug} page`}
                      >
                        <FiLink style={{ fontSize: '0.65rem' }} /> @{deptSlug}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
                      {dept.description || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => setEditDept(dept)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FiEdit2 /> 
                      </button>
                      <button onClick={() => handleDelete(dept.id, dept.name)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <FiTrash2 /> 
                      </button>
                      <Link href={`/admin/departments/${deptSlug}`} className="btn-action start" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none', marginLeft: '8px' }}>
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {departments.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No departments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={departments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="departments"
        />
        {/* Edit Modal */}
        {editDept && (
          <div className="modal-overlay active" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="modal-content" style={{ background: 'var(--bg-primary)', width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '20px 25px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Edit Department</h3>
                <button onClick={() => setEditDept(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX /></button>
              </div>
              <div style={{ padding: '25px' }}>
                <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>Department Name *</label>
                    <input 
                      type="text"
                      required
                      value={editDept.name}
                      onChange={(e) => setEditDept({...editDept, name: e.target.value})}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>Description</label>
                    <textarea 
                      value={editDept.description || ''}
                      onChange={(e) => setEditDept({...editDept, description: e.target.value})}
                      rows="3"
                      style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setEditDept(null)} style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--accent-cyan)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

