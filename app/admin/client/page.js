'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiUsers, FiArrowLeft, FiEdit2, FiTrash2, FiPlus, FiDownload, FiSearch, FiKey, FiCheck, FiX, FiLayout, FiDollarSign, FiBox, FiEye, FiEyeOff } from 'react-icons/fi';
import Pagination from '../../components/Pagination.js';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('../../components/Editor'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

export default function ClientManagementPage() {
  const [clients, setClients] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showViewPackagesModal, setShowViewPackagesModal] = useState(false);
  
  const [viewingClientPackages, setViewingClientPackages] = useState([]);
  const [viewingClientName, setViewingClientName] = useState('');
  const [clientSpecificPackages, setClientSpecificPackages] = useState([]);

  const openPricingModal = async (client) => {
    setPricingForm({ client_id: client.id, client_name: client.name, package_id: '', custom_price: '', custom_name: '', custom_description: '', custom_billing_cycle: '', custom_features: '' });
    setShowPricingModal(true);
    try {
      const res = await fetch(`/api/packages?client_id=${client.id}`);
      const data = await res.json();
      if (data.success) {
        setClientSpecificPackages(data.packages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewPackages = async (client) => {
    try {
      const res = await fetch(`/api/packages?client_id=${client.id}`);
      const data = await res.json();
      if (data.success) {
        setViewingClientPackages(data.packages || []);
        setViewingClientName(client.name);
        setShowViewPackagesModal(true);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to fetch packages', 'error');
    }
  };
  
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
  const [pricingForm, setPricingForm] = useState({ client_id: '', client_name: '', package_id: '', custom_price: '' });
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    fetchClients();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/packages');
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (err) {}
  };

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

  const handlePricingSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/packages/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: pricingForm.client_id,
          package_id: pricingForm.package_id,
          custom_price: parseFloat(pricingForm.custom_price),
          custom_name: pricingForm.custom_name,
          custom_description: pricingForm.custom_description,
          custom_billing_cycle: pricingForm.custom_billing_cycle,
          custom_features: pricingForm.custom_features
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Success', 'Custom price saved successfully!', 'success');
        setShowPricingModal(false);
        setPricingForm({ client_id: '', client_name: '', package_id: '', custom_price: '' });
      } else {
        Swal.fire('Error', data.error || 'Failed to save custom price', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error', 'error');
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
        Swal.fire('Success', 'Client added successfully', 'success');
      } else {
        Swal.fire('Error', data.error || 'Failed to add client', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error adding client', 'error');
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
      Swal.fire('Error', 'Failed to load client details', 'error');
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
        Swal.fire('Success', 'Client updated successfully', 'success');
      } else {
        Swal.fire('Error', data.error || 'Failed to update client', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error updating client', 'error');
    }
  };

  const handleDeleteClient = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this! This will permanently delete the client.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            fetchClients();
            Swal.fire('Deleted!', 'The client has been deleted.', 'success');
          } else {
            Swal.fire('Error', data.error || 'Failed to delete client', 'error');
          }
        } catch (err) {
          Swal.fire('Error', 'Error deleting client', 'error');
        }
      }
    });
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
        Swal.fire('Success', 'Password reset successfully!', 'success');
        setShowResetModal(false);
        setResetForm({ id: '', name: '', newPassword: '' });
      } else {
        Swal.fire('Error', data.error || 'Failed to reset password', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error resetting password', 'error');
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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedClients = filteredClients.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <select 
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
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
                paginatedClients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {client.createdAt || client.created_at ? new Date(client.createdAt || client.created_at).toLocaleDateString() : 'N/A'}
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
                        <button 
                          onClick={() => openPricingModal(client)}
                          style={{ padding: '6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
                          title="Custom Package Pricing"
                        >
                          <FiDollarSign />
                        </button>
                        <button 
                          onClick={() => handleViewPackages(client)}
                          style={{ padding: '6px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="View Active Packages"
                        >
                          <FiBox />
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

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredClients.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="clients"
        />
      </div>

      {/* Add Modal */}
      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay active" style={{ zIndex: 1000, overflowY: 'auto', padding: '2rem 0' }}>
          <div className="modal-card" style={{ maxWidth: "800px", margin: "auto" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: "1.4rem" }}>Add New Client</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddClient} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
              
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--accent-cyan)", fontSize: "1rem", fontWeight: "600" }}>
                  Account Details
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" placeholder="John Doe" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" placeholder="client@example.com" required value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Temporary Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} placeholder="Secure Password" required value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} className="form-control" style={{ width: '100%', paddingRight: '40px' }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" placeholder="+1 234 567 8900" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp Number</label>
                    <input type="text" placeholder="+1 234 567 8900" value={addForm.whatsapp} onChange={e => setAddForm({...addForm, whatsapp: e.target.value})} className="form-control" />
                  </div>
                </div>
              </div>
              
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--accent-cyan)", fontSize: "1rem", fontWeight: "600" }}>
                  Business Details
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input type="text" placeholder="Acme Corp" value={addForm.company_name} onChange={e => setAddForm({...addForm, company_name: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>GST Number</label>
                    <input type="text" placeholder="GSTIN..." value={addForm.gst_number} onChange={e => setAddForm({...addForm, gst_number: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Website URL</label>
                    <input type="text" placeholder="https://example.com" value={addForm.website_url} onChange={e => setAddForm({...addForm, website_url: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label>Full Address</label>
                    <input type="text" placeholder="123 Business St..." value={addForm.address} onChange={e => setAddForm({...addForm, address: e.target.value})} className="form-control" />
                  </div>
                </div>
              </div>
              
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--accent-cyan)", fontSize: "1rem", fontWeight: "600" }}>
                  Project Info
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Primary Service</label>
                    <select value={addForm.primary_service} onChange={e => setAddForm({...addForm, primary_service: e.target.value})} className="form-control">
                      <option value="SEO">SEO</option>
                      <option value="SMO">SMO</option>
                      <option value="Paid Ads">Paid Ads</option>
                      <option value="Website Development">Website Development</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Internal Notes</label>
                    <textarea placeholder="Any additional context..." value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} className="form-control" style={{ resize: 'vertical', minHeight: '80px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, padding: '12px', borderRadius: '8px', justifyContent: "center" }}>Create Client & Send Welcome Email</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay active" style={{ zIndex: 1000, overflowY: 'auto', padding: '2rem 0' }}>
          <div className="modal-card" style={{ maxWidth: "800px", margin: "auto" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: "1.4rem" }}>Edit Client Details</h3>
              <button type="button" className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateClient} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
              
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--accent-cyan)", fontSize: "1rem", fontWeight: "600" }}>
                  Account Details
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" placeholder="John Doe" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" placeholder="client@example.com" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Account Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="form-control">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" placeholder="+1 234 567 8900" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp Number</label>
                    <input type="text" placeholder="+1 234 567 8900" value={editForm.whatsapp} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})} className="form-control" />
                  </div>
                </div>
              </div>
              
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--accent-cyan)", fontSize: "1rem", fontWeight: "600" }}>
                  Business Details
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input type="text" placeholder="Acme Corp" value={editForm.company_name} onChange={e => setEditForm({...editForm, company_name: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>GST Number</label>
                    <input type="text" placeholder="GSTIN..." value={editForm.gst_number} onChange={e => setEditForm({...editForm, gst_number: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Website URL</label>
                    <input type="text" placeholder="https://example.com" value={editForm.website_url} onChange={e => setEditForm({...editForm, website_url: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label>Full Address</label>
                    <input type="text" placeholder="123 Business St..." value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="form-control" />
                  </div>
                </div>
              </div>
              
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--accent-cyan)", fontSize: "1rem", fontWeight: "600" }}>
                  Project Info
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Primary Service</label>
                    <select value={editForm.primary_service} onChange={e => setEditForm({...editForm, primary_service: e.target.value})} className="form-control">
                      <option value="SEO">SEO</option>
                      <option value="SMO">SMO</option>
                      <option value="Paid Ads">Paid Ads</option>
                      <option value="Website Development">Website Development</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Internal Notes</label>
                    <textarea placeholder="Any additional context..." value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="form-control" style={{ resize: 'vertical', minHeight: '80px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, padding: '12px', borderRadius: '8px', justifyContent: "center" }}>Save Changes</button>
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
      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="modal-overlay active" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: "500px", margin: "auto" }}>
            <div className="modal-header">
              <h3 className="modal-title">Custom Pricing for {pricingForm.client_name}</h3>
              <button type="button" className="modal-close" onClick={() => setShowPricingModal(false)}>&times;</button>
            </div>
            <form onSubmit={handlePricingSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              <div className="form-group">
                <label>Select Base Package</label>
                <select 
                  className="form-control"
                  required
                  value={pricingForm.package_id}
                  onChange={(e) => {
                    try {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setPricingForm({
                          ...pricingForm,
                          package_id: '',
                          custom_price: '',
                          custom_name: '',
                          custom_description: '',
                          custom_billing_cycle: 'Monthly',
                          custom_features: ''
                        });
                        return;
                      }

                      const clientPkg = clientSpecificPackages ? clientSpecificPackages.find(p => String(p.id) === String(selectedId)) : null;
                      const basePkg = packages ? packages.find(p => String(p.id) === String(selectedId)) : null;
                      const selectedPkg = clientPkg || basePkg;

                      let newFeatures = '';
                      if (selectedPkg && selectedPkg.features) {
                        if (Array.isArray(selectedPkg.features)) {
                          // Check if it's already HTML (from DB fallback)
                          if (selectedPkg.features.length === 1 && selectedPkg.features[0] && selectedPkg.features[0].includes('<')) {
                            newFeatures = selectedPkg.features[0];
                          } else {
                            newFeatures = selectedPkg.features.map(f => `<p>${f}</p>`).join('');
                          }
                        } else {
                          newFeatures = selectedPkg.features;
                        }
                      }

                      setPricingForm({
                        ...pricingForm, 
                        package_id: selectedId,
                        custom_price: selectedPkg ? selectedPkg.price : '',
                        custom_name: selectedPkg ? selectedPkg.name : '',
                        custom_description: selectedPkg ? (selectedPkg.description || '') : '',
                        custom_billing_cycle: selectedPkg ? (selectedPkg.billing_cycle || 'Monthly') : '',
                        custom_features: newFeatures
                      });
                    } catch (err) {
                      console.error("Error in package selection:", err);
                    }
                  }}
                >
                  <option value="">-- Select Package --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Base: ${p.price})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Custom Name</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={pricingForm.custom_name || ''}
                    onChange={(e) => setPricingForm({...pricingForm, custom_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Custom Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    className="form-control"
                    value={pricingForm.custom_price || ''}
                    onChange={(e) => setPricingForm({...pricingForm, custom_price: e.target.value})}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Billing Cycle</label>
                  <select 
                    className="form-control"
                    value={pricingForm.custom_billing_cycle || 'Monthly'}
                    onChange={(e) => setPricingForm({...pricingForm, custom_billing_cycle: e.target.value})}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="One-Time">One-Time</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Custom Description</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={pricingForm.custom_description || ''}
                    onChange={(e) => setPricingForm({...pricingForm, custom_description: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '100px' }}>
                <label>Custom Features (Rich Text)</label>
                <Editor 
                  value={pricingForm.custom_features || ''}
                  onChange={(data) => setPricingForm({...pricingForm, custom_features: data})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowPricingModal(false)} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px', justifyContent: 'center' }}>Save Custom Price</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Packages Modal */}
      {showViewPackagesModal && (
        <div className="modal-overlay active" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: "800px", margin: "auto", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3 className="modal-title">Active Packages for {viewingClientName}</h3>
              <button type="button" className="modal-close" onClick={() => setShowViewPackagesModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {viewingClientPackages.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No packages assigned.</p>
              ) : (
                viewingClientPackages.map(pkg => (
                  <div key={pkg.id} style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>{pkg.name}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{pkg.description}</p>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                      ${pkg.price} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {pkg.billing_cycle}</span>
                    </div>
                    <div className="ck-content">
                      {Array.isArray(pkg.features) ? (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                          {pkg.features.map((f, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{f}</li>)}
                        </ul>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: pkg.features }} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', borderTop: '1px solid var(--glass-border)' }}>
              <button onClick={() => setShowViewPackagesModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
