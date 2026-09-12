'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiBox, FiArrowLeft, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState('Monthly');
  const [featuresText, setFeaturesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/packages');
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Parse features from comma separated or new lines
    const features = featuresText.split('\n').filter(f => f.trim() !== '');

    const payload = {
      name,
      description,
      price: parseFloat(price),
      billing_cycle: billingCycle,
      features
    };

    try {
      const url = editingId ? `/api/packages/${editingId}` : '/api/packages';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        fetchPackages();
      } else {
        alert(data.error || 'Failed to save package');
      }
    } catch (err) {
      alert('Error saving package');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      const res = await fetch(`/api/packages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchPackages();
      } else {
        alert(data.error || 'Failed to delete package');
      }
    } catch (err) {
      alert('Error deleting package');
    }
  };

  const handleEdit = (pkg) => {
    setEditingId(pkg.id);
    setName(pkg.name);
    setDescription(pkg.description || '');
    setPrice(pkg.price);
    setBillingCycle(pkg.billing_cycle || 'Monthly');
    setFeaturesText(Array.isArray(pkg.features) ? pkg.features.join('\n') : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setBillingCycle('Monthly');
    setFeaturesText('');
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
              <FiBox style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Package Management
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Create and manage subscription packages for clients.
            </p>
          </div>
        </div>

        {/* Add/Edit Package Form */}
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingId ? <FiEdit2 /> : <FiPlus />} {editingId ? 'Edit Package' : 'Create New Package'}
            </h2>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                Cancel Edit
              </button>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Package Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="form-control"
                placeholder="e.g. Pro SEO Plan"
              />
            </div>
            <div className="form-group">
              <label>Price</label>
              <input 
                type="number"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
                className="form-control"
                placeholder="e.g. 99.99"
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Billing Cycle</label>
              <select 
                value={billingCycle}
                onChange={e => setBillingCycle(e.target.value)}
                className="form-control"
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="One-Time">One-Time</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <input 
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="form-control"
                placeholder="Short tagline for the package"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Features (One per line)</label>
            <textarea 
              value={featuresText}
              onChange={e => setFeaturesText(e.target.value)}
              className="form-control"
              placeholder="10 Keywords Optimized&#10;Weekly Reporting&#10;Dedicated Manager"
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : editingId ? 'Update Package' : 'Create Package'}
          </button>
        </form>

        {/* Packages Table */}
        <div className="table-wrapper" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Package Info</th>
                <th style={{ padding: '14px 16px' }}>Price</th>
                <th style={{ padding: '14px 16px' }}>Features</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{pkg.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>{pkg.description || '—'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-green, #10b981)' }}>${pkg.price}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>{pkg.billing_cycle}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {Array.isArray(pkg.features) && pkg.features.slice(0, 3).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                      {Array.isArray(pkg.features) && pkg.features.length > 3 && (
                        <li>+{pkg.features.length - 3} more</li>
                      )}
                    </ul>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleEdit(pkg)} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan, #06b6d4)', cursor: 'pointer', padding: '6px', marginRight: '8px' }} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button onClick={() => handleDelete(pkg.id)} style={{ background: 'none', border: 'none', color: 'var(--status-critical, #ef4444)', cursor: 'pointer', padding: '6px' }} title="Delete">
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No packages found. Create one above.
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
