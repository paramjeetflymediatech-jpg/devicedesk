'use client';
import { useState, useEffect } from 'react';
import { FiList, FiCheck, FiX, FiUser, FiEye } from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingReqId, setEditingReqId] = useState(null);
  const [selectedTlId, setSelectedTlId] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both requests and TLs in parallel
      const [reqRes, empRes] = await Promise.all([
        fetch('/api/client-services/requests'),
        fetch('/api/employees')
      ]);
      const reqData = await reqRes.json();
      const empData = await empRes.json();

      if (reqData.success) {
        setRequests(reqData.data || []);
      }
      if (empData.success) {
        const tls = (empData.data || []).filter(e => {
          const r = (e.role || '').toLowerCase();
          return (r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead') && e.status !== 'Inactive';
        });
        setTeamLeaders(tls);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTLName = (tlId) => {
    const tl = teamLeaders.find(t => t.id === tlId);
    return tl ? tl.name : 'Unassigned';
  };

  const handleSaveTL = async (reqId) => {
    try {
      const res = await fetch(`/api/client-services/requests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reqId, assigned_tl_id: selectedTlId })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          title: 'Success',
          text: 'Request assigned successfully',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        setEditingReqId(null);
        fetchData();
      } else {
        Swal.fire('Error', data.error || 'Failed to assign TL', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Network error', 'error');
    }
  };

  return (
    <div className="page-container p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiList /> Client Requests (All)
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading requests...</div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Client</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Requirements</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Assigned TL</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>{req.client_name || req.clientId}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {req.service_type}: {req.requirements}
                      </span>
                      <button 
                        onClick={() => setSelectedReq(req)}
                        style={{ color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                        title="View Full Requirement"
                      >
                        <FiEye size={16} />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{new Date(req.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '16px' }}>
                    {editingReqId === req.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          value={selectedTlId} 
                          onChange={(e) => setSelectedTlId(e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                        >
                          <option value="">Select TL</option>
                          {teamLeaders.map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name}</option>
                          ))}
                        </select>
                        <button onClick={() => handleSaveTL(req.id)} style={{ color: 'var(--status-healthy)' }}><FiCheck /></button>
                        <button onClick={() => setEditingReqId(null)} style={{ color: 'var(--status-critical)' }}><FiX /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: req.assigned_tl_id ? 'var(--text-primary)' : 'var(--status-critical)', fontWeight: '500' }}>
                          {req.assigned_tl_id ? getTLName(req.assigned_tl_id) : 'Unassigned'}
                        </span>
                        <button 
                          onClick={() => { setEditingReqId(req.id); setSelectedTlId(req.assigned_tl_id || ''); }}
                          style={{ padding: '4px 8px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', borderRadius: '6px', fontSize: '0.75rem' }}
                        >
                          {req.assigned_tl_id ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No client requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for viewing full requirement */}
      {selectedReq && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '600px',
            border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedReq(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', fontSize: '1.2rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <FiX />
            </button>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Requirement Details
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Client:</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedReq.client_name || selectedReq.clientId}</p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Service Type:</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedReq.service_type}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Full Requirement:</p>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {selectedReq.requirements}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
