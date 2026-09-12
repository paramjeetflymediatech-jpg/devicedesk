'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiUsers, FiArrowLeft, FiEdit2, FiTrash2, FiPlus, FiDownload, FiSearch, FiKey, FiCheck, FiX, FiLayout } from 'react-icons/fi';

export default function ClientManagementPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  // Forms
  const [addForm, setAddForm] = useState({ 
    name: '', email: '', password: '', role: 'client', department: 'N/A',
    company_name: '', phone: '', whatsapp: '', address: '', 
    gst_number: '', website_url: '', primary_service: 'SEO', notes: '' 
  });
  const [editForm, setEditForm] = useState({ 
    id: '', name: '', email: '', status: '',
    company_name: '', phone: '', whatsapp: '', address: '', 
    gst_number: '', website_url: '', primary_service: '', notes: ''
  });
  const [resetForm, setResetForm] = useState({ id: '', name: '', newPassword: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        // Filter only clients
        const clientList = data.data.filter(u => u.role?.toLowerCase() === 'client');
        setClients(clientList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setAddForm({ 
          name: '', email: '', password: '', role: 'client', department: 'N/A',
          company_name: '', phone: '', whatsapp: '', address: '', 
          gst_number: '', website_url: '', primary_service: 'SEO', notes: '' 
        });
        fetchClients();
      } else {
        alert(data.error || 'Failed to add client');
      }
    } catch (err) {
      alert('Error adding client');
    }
  };

  const handleEditClick = async (client) => {
    try {
      const res = await fetch(`/api/employees/${client.id}`);
      const data = await res.json();
      if (data.success) {
        const fullClient = data.data;
        setEditForm({
          id: fullClient.id,
          name: fullClient.name || '',
          email: fullClient.email || '',
          status: fullClient.status || 'Active',
          company_name: fullClient.company_name || '',
          phone: fullClient.phone || '',
          whatsapp: fullClient.whatsapp || '',
          address: fullClient.address || '',
          gst_number: fullClient.gst_number || '',
          website_url: fullClient.website_url || '',
          primary_service: fullClient.primary_service || '',
          notes: fullClient.notes || ''
        });
        setShowEditModal(true);
      }
    } catch (err) {
      alert('Failed to load client details');
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/employees/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editForm.name, email: editForm.email, status: editForm.status,
          company_name: editForm.company_name, phone: editForm.phone, whatsapp: editForm.whatsapp,
          address: editForm.address, gst_number: editForm.gst_number, website_url: editForm.website_url,
          primary_service: editForm.primary_service, notes: editForm.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchClients();
      } else {
        alert(data.error || 'Failed to update client');
      }
    } catch (err) {
      alert('Error updating client');
    }
  };

  const handleDeleteClient = async (id) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchClients();
      } else {
        alert(data.error || 'Failed to delete client');
      }
    } catch (err) {
      alert('Error deleting client');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetForm.id, newPassword: resetForm.newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert('Password reset successfully!');
        setShowResetModal(false);
        setResetForm({ id: '', name: '', newPassword: '' });
      } else {
        alert(data.error || 'Failed to reset password');
      }
    } catch (err) {
      alert('Error resetting password');
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Status', 'Joined Date'];
    const csvContent = [
      headers.join(','),
      ...filteredClients.map(c => 
        `"${c.id}","${c.name}","${c.email}","${c.status || 'Active'}","${new Date(c.created_at).toLocaleDateString()}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // Filter & Sort
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? c.status !== 'Inactive' : c.status === 'Inactive');
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
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
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
              <FiUsers style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Client Directory
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Manage all client portals, reset passwords, and export client lists.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportCSV} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
              <FiDownload /> Export CSV
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
              <FiPlus /> Add Client
            </button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search clients by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <select 
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Table Container */}
        <div className="table-wrapper" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(128,128,128,0.05)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Date Joined</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Name</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Email</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading clients...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No clients found.</td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(client.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {client.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {client.email}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`status-tag ${client.status === 'Inactive' ? 'open' : 'resolved'}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}>
                        {client.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => { setResetForm({ id: client.id, name: client.name, newPassword: '' }); setShowResetModal(true); }}
                          style={{ padding: '6px', background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
                          title="Reset Password"
                        >
                          <FiKey />
                        </button>
                        <Link 
                          href={`/admin/client/${client.id}`}
                          style={{ padding: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Manage Services"
                        >
                          <FiLayout />
                        </Link>
                        <button 
                          onClick={() => handleEditClick(client)}
                          style={{ padding: '6px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
                          title="Edit Client"
                        >
                          <FiEdit2 />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(client.id)}
                          style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <FiTrash2 />
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

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '700px', border: '1px solid var(--glass-border)', margin: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Advanced Setup: Add New Client</h3>
            <form onSubmit={handleAddClient} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Account Details */}
              <div style={{ gridColumn: '1 / -1' }}><h4 style={{ margin: 0, color: 'var(--accent-cyan)' }}>Account Details</h4></div>
              <input type="text" placeholder="Full Name *" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="form-control" />
              <input type="email" placeholder="Email Address *" required value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="form-control" />
              <input type="password" placeholder="Temporary Password *" required value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} className="form-control" />
              <input type="text" placeholder="Phone Number" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="form-control" />
              <input type="text" placeholder="WhatsApp Number" value={addForm.whatsapp} onChange={e => setAddForm({...addForm, whatsapp: e.target.value})} className="form-control" />
              
              {/* Business Details */}
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}><h4 style={{ margin: 0, color: 'var(--accent-cyan)' }}>Business Details</h4></div>
              <input type="text" placeholder="Company Name" value={addForm.company_name} onChange={e => setAddForm({...addForm, company_name: e.target.value})} className="form-control" />
              <input type="text" placeholder="GST Number" value={addForm.gst_number} onChange={e => setAddForm({...addForm, gst_number: e.target.value})} className="form-control" />
              <input type="text" placeholder="Website URL" value={addForm.website_url} onChange={e => setAddForm({...addForm, website_url: e.target.value})} className="form-control" />
              <input type="text" placeholder="Full Address" value={addForm.address} onChange={e => setAddForm({...addForm, address: e.target.value})} className="form-control" />
              
              {/* Project Info */}
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}><h4 style={{ margin: 0, color: 'var(--accent-cyan)' }}>Project Info</h4></div>
              <select value={addForm.primary_service} onChange={e => setAddForm({...addForm, primary_service: e.target.value})} className="form-control">
                <option value="SEO">SEO</option>
                <option value="SMO">SMO</option>
                <option value="Paid Ads">Paid Ads</option>
                <option value="Website Development">Website Development</option>
                <option value="Other">Other</option>
              </select>
              <textarea placeholder="Internal Notes" value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} className="form-control" style={{ resize: 'none', height: '42px' }} />

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Create Client & Send Welcome Email</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '700px', border: '1px solid var(--glass-border)', margin: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Edit Client Details</h3>
            <form onSubmit={handleUpdateClient} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Account Details */}
              <div style={{ gridColumn: '1 / -1' }}><h4 style={{ margin: 0, color: 'var(--accent-cyan)' }}>Account Details</h4></div>
              <input type="text" placeholder="Full Name *" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="form-control" />
              <input type="email" placeholder="Email Address *" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="form-control" />
              <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="form-control">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <input type="text" placeholder="Phone Number" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="form-control" />
              <input type="text" placeholder="WhatsApp Number" value={editForm.whatsapp} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})} className="form-control" />
              
              {/* Business Details */}
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}><h4 style={{ margin: 0, color: 'var(--accent-cyan)' }}>Business Details</h4></div>
              <input type="text" placeholder="Company Name" value={editForm.company_name} onChange={e => setEditForm({...editForm, company_name: e.target.value})} className="form-control" />
              <input type="text" placeholder="GST Number" value={editForm.gst_number} onChange={e => setEditForm({...editForm, gst_number: e.target.value})} className="form-control" />
              <input type="text" placeholder="Website URL" value={editForm.website_url} onChange={e => setEditForm({...editForm, website_url: e.target.value})} className="form-control" />
              <input type="text" placeholder="Full Address" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="form-control" />
              
              {/* Project Info */}
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}><h4 style={{ margin: 0, color: 'var(--accent-cyan)' }}>Project Info</h4></div>
              <select value={editForm.primary_service} onChange={e => setEditForm({...editForm, primary_service: e.target.value})} className="form-control">
                <option value="SEO">SEO</option>
                <option value="SMO">SMO</option>
                <option value="Paid Ads">Paid Ads</option>
                <option value="Website Development">Website Development</option>
                <option value="Other">Other</option>
              </select>
              <textarea placeholder="Internal Notes" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="form-control" style={{ resize: 'none', height: '42px' }} />

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Save Changes</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#ffc107' }}>Reset Password</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>For client: <strong style={{ color: 'var(--text-primary)' }}>{resetForm.name}</strong></p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Enter new secure password" required value={resetForm.newPassword} onChange={e => setResetForm({...resetForm, newPassword: e.target.value})} className="form-control" />
              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#ffc107', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Reset Password</button>
                <button type="button" onClick={() => setShowResetModal(false)} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '8px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
