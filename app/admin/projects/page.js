'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiFolder, FiPlus, FiSearch } from 'react-icons/fi';
import Pagination from '../../components/Pagination.js';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, client_id: clientId, description })
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setClientId('');
        setDescription('');
        fetchProjects();
      } else {
        alert(data.error || 'Failed to create project');
      }
    } catch (err) {
      alert('Error creating project');
    }
    setLoading(false);
  };

  const filteredProjects = projects.filter(p => {
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.client_id || '').toLowerCase().includes(q) || (p.status || '').toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = filteredProjects.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '8px' }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiFolder style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Project Management
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Create, configure, and monitor ongoing client projects.
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPlus /> Add New Project
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Project Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="form-control"
                placeholder="e.g. Acme Website Redesign"
              />
            </div>
            <div className="form-group">
              <label>Client ID / Slug</label>
              <input 
                type="text" 
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                required
                placeholder="emp_... or client slug"
                className="form-control"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="form-control"
                placeholder="Scope of work and project deliverables..."
                rows={3}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>

        {/* Search */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '1.5rem', 
          background: 'rgba(255, 255, 255, 0.02)', 
          padding: '1rem', 
          borderRadius: '12px', 
          border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #64748b)' }} />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search projects by name, client, or status..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px', width: '100%', height: '40px' }}
            />
          </div>
        </div>

        <div className="table-wrapper" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Project ID</th>
                <th style={{ padding: '14px 16px' }}>Name</th>
                <th style={{ padding: '14px 16px' }}>Client</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map((proj) => (
                <tr key={proj.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>{proj.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{proj.name}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>{proj.client_id}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="status-tag inprogress">{proj.status || 'Active'}</span>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No projects found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredProjects.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="projects"
        />
      </div>
    </div>
  );
}
