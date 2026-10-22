'use client';
import { useState, useEffect } from 'react';
import { FiList, FiCheck, FiX, FiUser, FiEye, FiDownload, FiExternalLink, FiFileText, FiImage, FiSearch } from 'react-icons/fi';
import Swal from 'sweetalert2';
import GoogleDriveBadge from '@/app/components/GoogleDriveBadge.js';
import Pagination from '@/app/components/Pagination.js';

function parseAttachments(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {}
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [trimmed].filter(Boolean);
  }
  return [];
}

function isImage(url) {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.webp') || clean.endsWith('.gif') || clean.startsWith('data:image/');
}

function isPdf(url) {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.pdf');
}

function getFileName(url) {
  if (!url) return 'Attachment';
  const clean = url.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || 'Attachment';
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingReqId, setEditingReqId] = useState(null);
  const [selectedTlId, setSelectedTlId] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);
  const [deliveryFiles, setDeliveryFiles] = useState([]);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);

  // Search and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (selectedReq) {
      setDeliveryFiles([]);
      fetch('/api/tasks')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const matchingTask = data.data.find(t => t.project_id === selectedReq.id);
            if (matchingTask && matchingTask.fileUrl) {
              const parsed = parseAttachments(matchingTask.fileUrl);
              setDeliveryFiles(parsed);
            }
          }
        })
        .catch(err => console.error("Error fetching tasks:", err));
    }
  }, [selectedReq]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
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

  const clientAttachments = selectedReq ? parseAttachments(selectedReq.attachment || selectedReq.file_url || selectedReq.fileUrl) : [];

  // Filter and Pagination logic
  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'Unassigned' && req.assigned_tl_id) return false;
    if (statusFilter === 'Assigned' && !req.assigned_tl_id) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const clientName = (req.client_name || '').toLowerCase();
    const clientId = (req.clientId || '').toLowerCase();
    const serviceType = (req.service_type || '').toLowerCase();
    const requirements = (req.requirements || '').toLowerCase();
    const tlName = (req.tl_name || getTLName(req.assigned_tl_id) || '').toLowerCase();

    return (
      clientName.includes(term) ||
      clientId.includes(term) ||
      serviceType.includes(term) ||
      requirements.includes(term) ||
      tlName.includes(term)
    );
  });

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfFirstReq = (safeCurrentPage - 1) * pageSize;
  const currentRequests = filteredRequests.slice(indexOfFirstReq, indexOfFirstReq + pageSize);

  const unassignedCount = requests.filter(r => !r.assigned_tl_id).length;
  const assignedCount = requests.filter(r => !!r.assigned_tl_id).length;

  return (
    <div className="page-container p-6">
      {/* Header with Title and Search/Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiList style={{ color: 'var(--accent-blue)' }} /> Client Service Requests
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage client service bookings, review requirements & attachments, and assign Team Leaders.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by client name, ID, service, or TL..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl outline-none transition-all"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              onClick={() => { setStatusFilter('All'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${statusFilter === 'All' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('Unassigned'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${statusFilter === 'Unassigned' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Unassigned ({unassignedCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('Assigned'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${statusFilter === 'Assigned' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Assigned ({assignedCount})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading requests...</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Client</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Requirements</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Attachments</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Assigned TL</th>
                </tr>
              </thead>
              <tbody>
                {currentRequests.map(req => {
                  const reqFiles = parseAttachments(req.attachment || req.file_url || req.fileUrl);
                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.9rem' }}>
                          {req.client_name || req.clientId}
                        </div>
                        {req.client_name && req.clientId && req.client_name !== req.clientId && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '2px' }}>
                            ID: {req.clientId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.service_type}: {req.requirements}
                          </span>
                          <button 
                            onClick={() => setSelectedReq(req)}
                            style={{ color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                            title="View Full Requirement & Attachments"
                          >
                            <FiEye size={15} /> View Details
                          </button>
                          <GoogleDriveBadge source={req} compact />
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {reqFiles.length > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                              📎 {reqFiles.length} {reqFiles.length === 1 ? 'file' : 'files'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>None</span>
                        )}
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
                            <button onClick={() => handleSaveTL(req.id)} style={{ color: 'var(--status-healthy)', background: 'none', border: 'none', cursor: 'pointer' }}><FiCheck size={18} /></button>
                            <button onClick={() => setEditingReqId(null)} style={{ color: 'var(--status-critical)', background: 'none', border: 'none', cursor: 'pointer' }}><FiX size={18} /></button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: req.assigned_tl_id ? 'var(--text-primary)' : 'var(--status-critical)', fontWeight: '500' }}>
                              {req.assigned_tl_id ? getTLName(req.assigned_tl_id) : '⚠️ Unassigned'}
                            </span>
                            <button 
                              onClick={() => { setEditingReqId(req.id); setSelectedTlId(req.assigned_tl_id || ''); }}
                              style={{ padding: '4px 8px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', borderRadius: '6px', fontSize: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                            >
                              {req.assigned_tl_id ? 'Reassign' : 'Assign TL'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {searchTerm || statusFilter !== 'All' 
                        ? `No requests match your search or filter.` 
                        : 'No client requests found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Universal Pagination */}
          <div className="mt-4">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredRequests.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemName="requests"
            />
          </div>
        </>
      )}

      {/* Modal for viewing full requirement & Interactive Attachment Viewer */}
      {selectedReq && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)', padding: '24px', borderRadius: '14px', width: '100%', maxWidth: '680px',
            border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            position: 'relative', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <button 
              onClick={() => setSelectedReq(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', fontSize: '1.4rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <FiX />
            </button>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Requirement Details & Attachments
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2px' }}>Client Name:</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{selectedReq.client_name || selectedReq.clientId}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2px' }}>Service Booked:</p>
                <p style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>{selectedReq.service_type}</p>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: '600' }}>Full Client Requirement Description:</p>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '8px', maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--glass-border)', lineHeight: '1.5' }}>
                {selectedReq.requirements}
              </div>
              <GoogleDriveBadge source={selectedReq} />
            </div>

            {/* Client Attachments Section */}
            <div style={{ marginTop: '18px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Client Attachments ({clientAttachments.length}):
              </p>
              {clientAttachments.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No attachments uploaded by client.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {clientAttachments.map((file, idx) => {
                    const isImg = isImage(file);
                    const isPdfFile = isPdf(file);
                    const fileName = getFileName(file);
                    return (
                      <div key={idx} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isImg ? (
                          <div 
                            onClick={() => setPreviewMediaUrl(file)}
                            style={{ width: '54px', height: '54px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                            title="Click to preview image"
                          >
                            <img src={file} alt={fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '54px', height: '54px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isPdfFile ? <FiFileText size={24} color="#3b82f6" /> : <FiFileText size={24} color="#94a3b8" />}
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                            {fileName}
                          </p>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isImg && (
                              <button
                                onClick={() => setPreviewMediaUrl(file)}
                                style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FiEye size={12} /> Preview
                              </button>
                            )}
                            <a
                              href={file}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', textDecoration: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <FiExternalLink size={12} /> Open
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Delivery Attachments Section */}
            {deliveryFiles.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Delivery Proof Attachments ({deliveryFiles.length}):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {deliveryFiles.map((file, idx) => {
                    const isImg = isImage(file);
                    const isPdfFile = isPdf(file);
                    const fileName = getFileName(file);
                    return (
                      <div key={idx} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isImg ? (
                          <div 
                            onClick={() => setPreviewMediaUrl(file)}
                            style={{ width: '54px', height: '54px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                            title="Click to preview image"
                          >
                            <img src={file} alt={fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '54px', height: '54px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isPdfFile ? <FiFileText size={24} color="#10b981" /> : <FiFileText size={24} color="#94a3b8" />}
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                            {fileName}
                          </p>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isImg && (
                              <button
                                onClick={() => setPreviewMediaUrl(file)}
                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FiEye size={12} /> Preview
                              </button>
                            )}
                            <a
                              href={file}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', textDecoration: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <FiExternalLink size={12} /> Open
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox on Web */}
      {previewMediaUrl && (
        <div 
          onClick={() => setPreviewMediaUrl(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewMediaUrl(null)}
              style={{ position: 'absolute', top: '-40px', right: '0px', color: '#ffffff', fontSize: '1.8rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <FiX />
            </button>
            <img 
              src={previewMediaUrl} 
              alt="Preview" 
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }} 
            />
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <a 
                href={previewMediaUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '6px' }}
              >
                <FiExternalLink size={14} /> Open Full Size in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
