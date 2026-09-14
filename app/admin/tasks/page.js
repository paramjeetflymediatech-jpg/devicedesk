'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiCheckSquare } from 'react-icons/fi';
import Pagination from '../../components/Pagination.js';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          description, 
          assignedTo, 
          project_id: projectId 
        })
      });
      const data = await res.json();
      if (data.success) {
        setTitle('');
        setDescription('');
        setAssignedTo('');
        setProjectId('');
        fetchTasks();
      } else {
        alert(data.error || 'Failed to create task');
      }
    } catch (err) {
      alert('Error creating task');
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTasks = tasks.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '8px' }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCheckSquare style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Task Management
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Create, assign, and manage department tasks.
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Task Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="form-control"
                placeholder="e.g. Implement OAuth Flow"
              />
            </div>
            <div className="form-group">
              <label>Project ID</label>
              <input 
                type="text" 
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="form-control"
                placeholder="Optional project identifier"
              />
            </div>
            <div className="form-group">
              <label>Assign To (Employee ID)</label>
              <input 
                type="text" 
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="form-control"
                placeholder="e.g. emp_12345"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="form-control"
                placeholder="Detailed instructions for the task..."
                rows={3}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </form>

        <div className="table-wrapper" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>ID</th>
                <th style={{ padding: '14px 16px' }}>Title</th>
                <th style={{ padding: '14px 16px' }}>Project</th>
                <th style={{ padding: '14px 16px' }}>Assigned To</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>{task.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{task.title}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>{task.project_id || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>{task.assignedTo || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-tag ${
                      task.status === 'Completed' ? 'resolved' : task.status === 'In Progress' ? 'inprogress' : 'open'
                    }`}>
                      {task.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No tasks found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={tasks.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="tasks"
        />
      </div>
    </div>
  );
}
