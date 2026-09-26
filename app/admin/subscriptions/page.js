'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiList, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions');
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
              <FiList style={{ color: 'var(--accent-cyan, #06b6d4)' }} /> Client Subscriptions
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginTop: '4px' }}>
              Overview of all active and expired client packages.
            </p>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="table-wrapper" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Client Info</th>
                <th style={{ padding: '14px 16px' }}>Package Details</th>
                <th style={{ padding: '14px 16px' }}>Subscription Date</th>
                <th style={{ padding: '14px 16px' }}>Valid Until</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading subscriptions...</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No client subscriptions found.</td>
                </tr>
              ) : (
                subscriptions.map(sub => (
                  <tr key={sub.subscription_id} style={{ borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.1))', transition: 'background 0.2s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 'bold' }}>{sub.client_name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{sub.client_email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{sub.package_name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>₹{sub.price} / {sub.billing_cycle}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {sub.start_date_formatted}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiClock style={{ color: sub.is_expired ? '#ef4444' : '#f59e0b' }} />
                        <span style={{ color: sub.is_expired ? '#ef4444' : '#e2e8f0', fontWeight: sub.is_expired ? 'bold' : 'normal' }}>
                          {sub.valid_until_formatted}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        background: sub.is_expired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        color: sub.is_expired ? '#ef4444' : '#22c55e'
                      }}>
                        {sub.is_expired ? <FiXCircle /> : <FiCheckCircle />}
                        {sub.is_expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
