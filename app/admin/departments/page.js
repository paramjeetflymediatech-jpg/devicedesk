'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiBriefcase, FiLink, FiArrowLeft, FiPlus } from 'react-icons/fi';
import { getDepartmentSlug } from '../../utils/slugUtils.js';
import Pagination from '../../components/Pagination.js';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link href={`/admin/departments/${deptSlug}`} className="btn-action start" style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}>
                        View Details &rarr;
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
      </div>
    </div>
  );
}

