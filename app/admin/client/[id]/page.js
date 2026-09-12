'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSearch, FiFileText, FiImage, FiDollarSign, FiPlus, FiSave } from 'react-icons/fi';

export default function ClientServicesAdmin() {
  const params = useParams();
  const id = params?.id ? String(params.id) : '';

  const [activeTab, setActiveTab] = useState('seo');
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [seoReports, setSeoReports] = useState([]);
  const [smoRequests, setSmoRequests] = useState([]);
  const [adsData, setAdsData] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  // Form states
  const [seoForm, setSeoForm] = useState({ month: '', year: new Date().getFullYear().toString(), file_url: '' });
  const [adsForm, setAdsForm] = useState({ platform: 'Google Ads', total_budget: 0, spent_amount: 0, pending_balance: 0 });

  useEffect(() => {
    if (id) {
      fetchClientDetails();
      fetchSEO();
      fetchSMO();
      fetchAds();
      fetchServiceRequests();
    }
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      const res = await fetch(`/api/employees/${id}`);
      const data = await res.json();
      if (data.success) setClient(data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchSEO = async () => {
    try {
      const res = await fetch(`/api/client-services/seo?clientId=${id}`);
      const data = await res.json();
      if (data.success) setSeoReports(data.data);
    } catch (err) {}
  };

  const fetchSMO = async () => {
    try {
      const res = await fetch(`/api/client-services/smo?clientId=${id}`);
      const data = await res.json();
      if (data.success) setSmoRequests(data.data);
    } catch (err) {}
  };

  const fetchAds = async () => {
    try {
      const res = await fetch(`/api/client-services/ads?clientId=${id}`);
      const data = await res.json();
      if (data.success) setAdsData(data.data);
    } catch (err) {}
  };

  const fetchServiceRequests = async () => {
    try {
      const res = await fetch(`/api/client-services/requests?clientId=${id}`);
      const data = await res.json();
      if (data.success) setServiceRequests(data.data);
    } catch (err) {}
  };

  const handleAddSEO = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/client-services/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id, ...seoForm })
      });
      const data = await res.json();
      if (data.success) {
        setSeoForm({ month: '', year: new Date().getFullYear().toString(), file_url: '' });
        fetchSEO();
      } else {
        alert(data.error);
      }
    } catch (err) {}
  };

  const handleUpdateAds = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/client-services/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id, ...adsForm })
      });
      const data = await res.json();
      if (data.success) {
        alert('Ads data updated successfully');
        fetchAds();
      } else {
        alert(data.error);
      }
    } catch (err) {}
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading client details...</div>;
  if (!client) return <div style={{ padding: '2rem' }}>Client not found.</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link 
            href="/admin/client"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '8px' }}
          >
            <FiArrowLeft /> Back to Client Directory
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Manage Services for: {client.name}
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => setActiveTab('seo')}
            style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'seo' ? '2px solid var(--accent-cyan)' : '2px solid transparent', color: activeTab === 'seo' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiFileText /> SEO Reports
          </button>
          <button 
            onClick={() => setActiveTab('smo')}
            style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'smo' ? '2px solid var(--accent-cyan)' : '2px solid transparent', color: activeTab === 'smo' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiImage /> SMO Graphics
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'ads' ? '2px solid var(--accent-cyan)' : '2px solid transparent', color: activeTab === 'ads' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiDollarSign /> PAID Ads
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'requests' ? '2px solid var(--accent-cyan)' : '2px solid transparent', color: activeTab === 'requests' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiSearch /> Service Requests
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '2rem' }}>
          
          {/* SEO TAB */}
          {activeTab === 'seo' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiPlus /> Upload New SEO Report
              </h2>
              <form onSubmit={handleAddSEO} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '1rem', alignItems: 'end', marginBottom: '3rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Month</label>
                  <select className="form-control" required value={seoForm.month} onChange={e => setSeoForm({...seoForm, month: e.target.value})}>
                    <option value="">Select Month</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Year</label>
                  <input type="number" className="form-control" required value={seoForm.year} onChange={e => setSeoForm({...seoForm, year: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Report File URL (PDF/Link)</label>
                  <input type="url" className="form-control" placeholder="https://..." required value={seoForm.file_url} onChange={e => setSeoForm({...seoForm, file_url: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 20px', borderRadius: '8px' }}>Save Report</button>
              </form>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Past Reports</h3>
              {seoReports.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No reports found.</p> : (
                <div className="table-wrapper">
                  <table className="custom-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'rgba(128,128,128,0.05)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Month/Year</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seoReports.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '12px' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.month} {r.year}</td>
                          <td style={{ padding: '12px' }}><span className="status-tag resolved">{r.status}</span></td>
                          <td style={{ padding: '12px' }}><a href={r.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>View Report</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SMO TAB */}
          {activeTab === 'smo' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Graphic Requirements (SMO)</h2>
              {smoRequests.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No requests submitted yet.</p> : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {smoRequests.map(r => (
                    <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Submitted: {new Date(r.created_at).toLocaleString()}</span>
                        <span className={`status-tag ${r.status === 'Pending' ? 'open' : 'resolved'}`}>{r.status}</span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{r.requirements}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PAID ADS TAB */}
          {activeTab === 'ads' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiDollarSign /> Update Ads Spend
              </h2>
              <form onSubmit={handleUpdateAds} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '1rem', alignItems: 'end', marginBottom: '3rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Platform</label>
                  <select className="form-control" value={adsForm.platform} onChange={e => setAdsForm({...adsForm, platform: e.target.value})}>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="LinkedIn Ads">LinkedIn Ads</option>
                    <option value="Instagram Ads">Instagram Ads</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Total Budget ($)</label>
                  <input type="number" step="0.01" className="form-control" required value={adsForm.total_budget} onChange={e => setAdsForm({...adsForm, total_budget: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Spent Amount ($)</label>
                  <input type="number" step="0.01" className="form-control" required value={adsForm.spent_amount} onChange={e => setAdsForm({...adsForm, spent_amount: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Pending Balance ($)</label>
                  <input type="number" step="0.01" className="form-control" required value={adsForm.pending_balance} onChange={e => setAdsForm({...adsForm, pending_balance: parseFloat(e.target.value)})} />
                </div>
                <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 20px', borderRadius: '8px' }}>Update Data</button>
              </form>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Current Ads Data</h3>
              {adsData.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No ads data configured.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  {adsData.map(d => (
                    <div key={d.id} style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(168,85,247,0.1))', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '12px' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>{d.platform}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Budget:</span>
                        <span style={{ fontWeight: 600 }}>${parseFloat(d.total_budget).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Spent:</span>
                        <span style={{ fontWeight: 600, color: '#ef4444' }}>${parseFloat(d.spent_amount).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Balance:</span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>${parseFloat(d.pending_balance).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SERVICE REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiSearch /> Client Booked Services
              </h2>
              {serviceRequests.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No service requests found.</p> : (
                <div className="table-wrapper">
                  <table className="custom-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'rgba(128,128,128,0.05)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Service Type</th>
                        <th style={{ padding: '12px', width: '50%' }}>Requirements</th>
                        <th style={{ padding: '12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceRequests.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '12px' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.service_type}</td>
                          <td style={{ padding: '12px' }}>{r.requirements}</td>
                          <td style={{ padding: '12px' }}>
                            <span className={`status-tag ${r.status === 'Pending' ? 'open' : 'resolved'}`}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
