'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { 
  FiUser, 
  FiUsers,
  FiLink, 
  FiArrowLeft, 
  FiEdit2, 
  FiTrash2, 
  FiKey,
  FiCheck, 
  FiX, 
  FiShield, 
  FiPlus, 
  FiUserPlus, 
  FiSearch, 
  FiEye, 
  FiEyeOff, 
  FiDownload 
} from 'react-icons/fi';
import { getEmployeeSlug } from '../../utils/slugUtils.js';

const ROLES = [
  'Team Member',
  'Team Leader',
  'IT Engineer',
  'Management',
  'Admin',
  'Client',
  'Marketing',
  'Dept Team Leader',
  'Dept Team Member'
];

const DEFAULT_DEPARTMENTS = [
  'Development',
  'Design',
  'Marketing',
  'Sales',
  'HR',
  'IT Support',
  'Operations',
  'Management'
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms state
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Team Member',
    department: 'Development',
    ticketLimit: 100,
  });

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'Team Member',
    department: 'Development',
    ticketLimit: 100,
    status: 'Active'
  });

  const [resetForm, setResetForm] = useState({
    id: '',
    name: '',
    newPassword: ''
  });

  const refreshUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setLoading(true);
        const [usersRes, deptsRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/departments')
        ]);
        const usersData = await usersRes.json();
        const deptsData = await deptsRes.json();

        if (isMounted) {
          if (usersData.success) {
            setUsers(usersData.data);
          }
          if (deptsData.success && deptsData.data && deptsData.data.length > 0) {
            setDepartments(deptsData.data.map(d => d.name));
          } else {
            setDepartments(DEFAULT_DEPARTMENTS);
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        if (isMounted) {
          setDepartments(DEFAULT_DEPARTMENTS);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required Field', text: 'Please enter team member name.' });
      return;
    }
    if (!addForm.email.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required Field', text: 'Please enter email address.' });
      return;
    }
    if (!addForm.password.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required Field', text: 'Please enter a password.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();

      if (res.ok && (data.success || data.employee)) {
        Swal.fire({
          icon: 'success',
          title: 'Created!',
          text: `Team member "${addForm.name}" created successfully.`,
          timer: 2000,
          showConfirmButton: false
        });
        setShowAddModal(false);
        setAddForm({
          name: '',
          email: '',
          password: '',
          role: 'Team Member',
          department: departments[0] || 'Development',
          ticketLimit: 100
        });
        setShowAddPassword(false);
        refreshUsers();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to add team member' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error creating user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (user) => {
    setEditForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'Team Member',
      department: user.department || 'Development',
      ticketLimit: user.ticketLimit || 100,
      status: user.status || 'Active'
    });
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.id) return;
    if (!editForm.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Team member name cannot be empty.' });
      return;
    }
    if (!editForm.email.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Email address cannot be empty.' });
      return;
    }
    
    try {
      setSubmitting(true);
      const res = await fetch(`/api/employees/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          department: editForm.department,
          ticketLimit: editForm.ticketLimit,
          status: editForm.status
        })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Team member details updated successfully.',
          timer: 1500,
          showConfirmButton: false
        });
        setShowEditModal(false);
        refreshUsers();
      } else {
        Swal.fire({ icon: 'error', title: 'Failed', text: data.error || 'Failed to update user' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error updating user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetClick = (user) => {
    setResetForm({
      id: user.id,
      name: user.name || 'Team Member',
      newPassword: ''
    });
    setShowResetPassword(false);
    setShowResetModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetForm.newPassword.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a new password.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/employees/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resetForm.id,
          newPassword: resetForm.newPassword.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Password Reset',
          text: `Password for ${resetForm.name} updated successfully.`,
          timer: 2000,
          showConfirmButton: false
        });
        setShowResetModal(false);
        setResetForm({ id: '', name: '', newPassword: '' });
      } else {
        Swal.fire({ icon: 'error', title: 'Failed', text: data.error || 'Failed to reset password' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error resetting password' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const result = await Swal.fire({
      title: `Delete ${user.name}?`,
      text: "This will permanently remove the user, unassign their systems, and clear their permissions. This cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/employees/${user.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          Swal.fire({ icon: 'success', title: 'Deleted', text: 'User has been deleted.', timer: 1500, showConfirmButton: false });
          refreshUsers();
        } else {
          Swal.fire({ icon: 'error', title: 'Failed', text: data.error || 'Failed to delete user' });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete user' });
      }
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'User Slug', 'Email', 'Role', 'Department', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => 
        `"${u.id}","${u.name}","${getEmployeeSlug(u)}","${u.email}","${u.role || ''}","${u.department || ''}","${u.status || 'Active'}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const allDepts = Array.from(new Set([...departments, ...DEFAULT_DEPARTMENTS, ...users.map(u => u.department).filter(Boolean)])).sort();
  const allRoles = Array.from(new Set([...ROLES, ...users.map(u => u.role).filter(Boolean)])).sort();

  // Filter users list
  const filteredUsers = users.filter(u => {
    const slug = getEmployeeSlug(u).toLowerCase();
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const dept = (u.department || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = name.includes(q) || email.includes(q) || slug.includes(q) || dept.includes(q) || role.includes(q);
    const matchesRole = roleFilter === 'All' || role === roleFilter.toLowerCase();
    const matchesDept = deptFilter === 'All' || dept === deptFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? u.status !== 'Inactive' : u.status === 'Inactive');

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem' }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
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
              <FiUsers style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> User & Role Management
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Direct access to all registered users, dynamic user slugs, team member creation, and role permission assignments.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={exportCSV} 
              className="btn-secondary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <FiDownload /> Export CSV
            </button>
            <button 
              onClick={() => {
                setAddForm(prev => ({
                  ...prev,
                  department: allDepts[0] || 'Development'
                }));
                setShowAddPassword(false);
                setShowAddModal(true);
              }} 
              className="btn-primary" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '9px 18px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.25)'
              }}
            >
              <FiUserPlus style={{ fontSize: '1.05rem' }} /> + Add Team Member
            </button>
          </div>
        </div>

        {/* Search & Filters Toolbar */}
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
              placeholder="Search by name, email, @slug, department, or role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%', height: '40px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select 
              className="form-control"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ minWidth: '130px', height: '40px' }}
            >
              <option value="All">All Roles</option>
              {allRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select 
              className="form-control"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ minWidth: '140px', height: '40px' }}
            >
              <option value="All">All Departments</option>
              {allDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '120px', height: '40px' }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
              {filteredUsers.map((user) => {
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
                    <td style={{ padding: '14px 16px' }}>
                      <span className="status-tag inprogress" style={{ fontSize: '0.75rem' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary, #94a3b8)' }}>
                      {user.department || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`status-tag ${user.status === 'Inactive' ? 'open' : 'resolved'}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => handleResetClick(user)} 
                          style={{
                            padding: '6px 9px',
                            background: 'rgba(234, 179, 8, 0.1)',
                            color: '#eab308',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem'
                          }}
                          title="Reset Password"
                        >
                          <FiKey />
                        </button>
                        <button 
                          onClick={() => handleEditClick(user)} 
                          className="btn-action start"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Edit Team Member"
                        >
                          <FiEdit2 /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)} 
                          className="btn-action resolve"
                          style={{ padding: '6px 9px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="Delete User"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No team members found matching your search and filter criteria.
                  </td>
                </tr>
              )}
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

      {/* ================= MODAL: ADD TEAM MEMBER ================= */}
      {showAddModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.7)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{ 
            background: 'var(--bg-card, #1e293b)', 
            padding: '2rem', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '480px', 
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUserPlus style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Add New Team Member
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', fontSize: '1.25rem', cursor: 'pointer', padding: '4px' }}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                  Team Member Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  required 
                  value={addForm.name} 
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })} 
                  className="form-control" 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="email" 
                  placeholder="e.g. john@company.com" 
                  required 
                  value={addForm.email} 
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })} 
                  className="form-control" 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showAddPassword ? 'text' : 'password'} 
                    placeholder="Create a secure password" 
                    required 
                    value={addForm.password} 
                    onChange={e => setAddForm({ ...addForm, password: e.target.value })} 
                    className="form-control" 
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary, #94a3b8)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                    title={showAddPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showAddPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={addForm.role} 
                    onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  >
                    {allRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Department <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={addForm.department} 
                    onChange={e => setAddForm({ ...addForm, department: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  >
                    {allDepts.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                  Ticket Limit
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="9999" 
                  value={addForm.ticketLimit} 
                  onChange={e => setAddForm({ ...addForm, ticketLimit: parseInt(e.target.value) || 100 })} 
                  className="form-control" 
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="btn-primary" 
                  style={{ 
                    flex: 1, 
                    padding: '11px', 
                    borderRadius: '8px', 
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Creating...' : '+ Create Team Member'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '11px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT TEAM MEMBER ================= */}
      {showEditModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.7)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{ 
            background: 'var(--bg-card, #1e293b)', 
            padding: '2rem', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '480px', 
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiEdit2 style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Edit Team Member
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', fontSize: '1.25rem', cursor: 'pointer', padding: '4px' }}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                  Team Member Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  className="form-control" 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="email" 
                  required 
                  value={editForm.email} 
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                  className="form-control" 
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={editForm.role} 
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  >
                    {allRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Department <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={editForm.department} 
                    onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  >
                    {allDepts.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Status <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={editForm.status} 
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Ticket Limit
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="9999" 
                    value={editForm.ticketLimit} 
                    onChange={e => setEditForm({ ...editForm, ticketLimit: parseInt(e.target.value) || 100 })} 
                    className="form-control" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="btn-primary" 
                  style={{ 
                    flex: 1, 
                    padding: '11px', 
                    borderRadius: '8px', 
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '11px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {showResetModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.7)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{ 
            background: 'var(--bg-card, #1e293b)', 
            padding: '2rem', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '420px', 
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiKey /> Reset Password
              </h3>
              <button 
                onClick={() => setShowResetModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', fontSize: '1.25rem', cursor: 'pointer', padding: '4px' }}
              >
                <FiX />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Resetting password for: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{resetForm.name}</strong>
            </p>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showResetPassword ? 'text' : 'password'} 
                  placeholder="Enter new password" 
                  required 
                  value={resetForm.newPassword} 
                  onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} 
                  className="form-control" 
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary, #94a3b8)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showResetPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showResetPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '0.75rem' }}>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    flex: 1, 
                    padding: '10px', 
                    borderRadius: '8px', 
                    background: '#eab308', 
                    color: '#0f172a', 
                    fontWeight: 700, 
                    border: 'none', 
                    cursor: submitting ? 'not-allowed' : 'pointer' 
                  }}
                >
                  {submitting ? 'Updating...' : 'Set Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowResetModal(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '10px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
