/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect } from 'react';
import { FiCheckSquare, FiSearch, FiX, FiEye, FiImage, FiRefreshCw, FiSend, FiEdit3, FiExternalLink, FiZap } from 'react-icons/fi';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';
import { useAuth } from '../../../auth/AuthContext';

function extractFirstImg(val) {
  if (!val) return null;
  let urls = [];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try { urls = JSON.parse(trimmed); } catch (e) { urls = [trimmed]; }
    } else {
      urls = [trimmed];
    }
  } else if (Array.isArray(val)) {
    urls = val;
  }
  for (const u of urls) {
    if (typeof u === 'string' && /\.(jpeg|jpg|png|webp|svg|gif)($|\?)/i.test(u)) {
      return u;
    }
  }
  return urls[0] || null;
}

export default function ClientRequestsPage() {
  const [clientRequests, setClientRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  // TL Review & Delivery Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewReq, setSelectedReviewReq] = useState(null);
  const [reviewCaption, setReviewCaption] = useState("");
  const [reviewHashtags, setReviewHashtags] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const resReq = await fetch('/api/client-services/requests');
        const dataReq = await resReq.json();
        if (dataReq.success) {
          const mappedReqs = (dataReq.data || []).map(req => ({
            id: req.id,
            client: req.client_name || req.clientId || 'Unknown Client',
            assigned_tl_id: req.assigned_tl_id,
            service: req.service_type,
            details: req.requirements,
            date: new Date(req.created_at).toLocaleDateString(),
            status: req.status || 'Pending Assignment',
            attachment: req.attachment,
            drive_url: req.drive_url,
            revision_notes: req.revision_notes || null,
            caption: req.caption || '',
            hashtags: req.hashtags || '',
            deliverable_files: req.deliverable_files || null,
            deliverable_note: req.deliverable_note || null,
            delivered_at: req.delivered_at || null,
            specialist_name: req.specialist_name || null
          }));
          const isAdmin = ['admin', 'superadmin'].includes((user?.role || '').toLowerCase());
          setClientRequests(
            !user ? [] : isAdmin ? mappedReqs : mappedReqs.filter(r => String(r.assigned_tl_id) === String(user.id))
          );
        }
      } catch (err) {
        console.error("Failed to fetch requests:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const filteredRequests = clientRequests.filter(req => {
    const q = search.toLowerCase();
    const c = String(req.client || "").toLowerCase();
    const s = String(req.service || "").toLowerCase();
    const d = String(req.details || "").toLowerCase();
    const st = String(req.status || "").toLowerCase();
    return c.includes(q) || s.includes(q) || d.includes(q) || st.includes(q);
  });

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRequests = filteredRequests.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleView = async (req) => {
    let extraHtml = '';
    const isPending = req.status === 'Pending' || req.status === 'Pending Assignment';
    if (!isPending) {
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if(data.success) {
          const matchingTask = data.data.find(t => 
            t.project_id && String(t.project_id) === String(req.id)
          );
          if(matchingTask) {
          let proofsHtml = '<p style="margin-bottom: 5px; color: #64748b;"><em>No proof files uploaded by the employee.</em></p>';
          if(matchingTask.fileUrl) {
            try {
              const parsedUrls = JSON.parse(matchingTask.fileUrl);
              if(Array.isArray(parsedUrls) && parsedUrls.length > 0) {
                proofsHtml = '<p style="margin-bottom: 5px;"><strong>Work Proofs:</strong><br/>' + parsedUrls.map((u, i) => `<a href="${u}" target="_blank" style="color: #2563eb; text-decoration: underline; margin-right: 10px;">Proof ${i+1}</a>`).join('') + '</p>';
              } else if(typeof parsedUrls === 'string') {
                proofsHtml = `<p style="margin-bottom: 5px;"><strong>Work Proof:</strong> <a href="${parsedUrls}" target="_blank" style="color: #2563eb; text-decoration: underline;">View Uploaded Proof</a></p>`;
              }
            } catch(err) {
              proofsHtml = `<p style="margin-bottom: 5px;"><strong>Work Proof:</strong> <a href="${matchingTask.fileUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">View Uploaded Proof</a></p>`;
            }
          }

          const noteHtml = matchingTask.completion_note || matchingTask.notes ? `
            <div style="margin-top: 8px; margin-bottom: 8px; padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px;">
              <p style="color: #065f46; font-weight: 700; font-size: 0.85rem; margin-bottom: 3px;">📝 Employee Completion Note (TL Only):</p>
              <p style="color: #1e293b; font-size: 0.88rem; margin: 0; white-space: pre-wrap;">${matchingTask.completion_note || matchingTask.notes}</p>
            </div>
          ` : '';

          const displayTaskStatus = req.status === 'Completed' ? 'Completed' : (matchingTask.status || 'In Progress');
          const statusColor = displayTaskStatus === 'Completed' ? '#059669' : '#2563eb';

            extraHtml = `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 8px;">Employee Work Submission</h4>
                <p style="margin-bottom: 5px;"><strong>Assigned To:</strong> ${matchingTask.assignedToName || 'Specialist'}</p>
                <p style="margin-bottom: 5px;"><strong>Task Status:</strong> <span style="font-weight: 700; color: ${statusColor};">${displayTaskStatus}</span></p>
                ${noteHtml}
                ${proofsHtml}
              </div>
            `;
          }
        }
      } catch(e) {
        console.error(e);
      }
    }

    Swal.fire({
      title: `Client Request: ${req.service}`,
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p style="margin-bottom: 8px;"><strong>Client:</strong> ${req.client}</p>
          <p style="margin-bottom: 8px;"><strong>Status:</strong> ${req.status}</p>
          <p style="margin-bottom: 8px;"><strong>Requirements:</strong></p>
          <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; max-height: 250px; overflow-y: auto; white-space: pre-wrap; margin-top: 5px;">${req.details}</div>
          ${req.revision_notes ? `
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 12px; margin-top: 12px;">
            <p style="color: #92400e; font-weight: 700; margin: 0 0 4px; font-size: 0.9rem;">⚠️ Client Requested Revisions:</p>
            <p style="color: #78350f; font-size: 0.88rem; margin: 0; white-space: pre-wrap;">${req.revision_notes}</p>
          </div>` : ''}
          ${req.drive_url ? `<p style="margin-top: 15px; margin-bottom: 5px;"><strong>Google Drive Requirements Folder:</strong></p>
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px; border-radius: 6px;"><a href="${req.drive_url}" target="_blank" rel="noopener noreferrer" style="color: #059669; font-weight: 600; text-decoration: underline;">📁 Open Google Drive Requirements Folder ↗</a></div>` : ''}
          ${req.attachment ? `<p style="margin-top: 15px; margin-bottom: 5px;"><strong>Client Attachment:</strong></p>
          <div style="background: #e0f2fe; padding: 10px; border-radius: 6px;"><a href="${req.attachment}" target="_blank" style="color: #2563eb; text-decoration: underline;">View Attached File</a></div>` : ''}
          ${req.caption ? `
          <div style="background: #faf5ff; border: 1.5px solid #d8b4fe; border-radius: 8px; padding: 12px; margin-top: 12px;">
            <p style="color: #6b21a8; font-weight: 700; margin: 0 0 4px; font-size: 0.9rem;">✨ AI Social Media Caption:</p>
            <p style="color: #3b0764; font-size: 0.88rem; margin: 0; white-space: pre-wrap;">${req.caption}</p>
            ${req.hashtags ? `<p style="color: #7e22ce; font-weight: 600; font-size: 0.82rem; margin-top: 6px;">${req.hashtags}</p>` : ''}
          </div>` : ''}
          ${extraHtml}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#334155'
    });
  };

  const handleAssignClick = async (req) => {
    setSelectedReq(req);
    setAssigneeId("");
    setAssignNote("");
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success && user?.id) {
        const isTLRole = (role) => {
          const r = (role || '').toLowerCase();
          return r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead' || r === 'leader';
        };
        const allEmps = data.data || [];
        const currentTlId = String(user.id);
        const isAdmin = ['admin', 'superadmin'].includes((user.role || '').toLowerCase());

        // Find directly assigned employees (handles comma-separated tl_id)
        const directAssignees = allEmps.filter(emp =>
          (emp.tl_id || '').split(',').map(s => s.trim()).includes(currentTlId)
        );

        // Find subordinate TLs under this TL
        const subTlIds = new Set(directAssignees.filter(e => isTLRole(e.role)).map(e => String(e.id)));

        // Include directly assigned members + members under subordinate TLs
        let myTeam = allEmps.filter(emp => {
          if (String(emp.id) === currentTlId) return false;
          if (emp.status === 'Inactive') return false;
          const assignedTls = (emp.tl_id || '').split(',').map(s => s.trim());
          return assignedTls.includes(currentTlId) || assignedTls.some(id => subTlIds.has(String(id)));
        });

        // Fallback for admin testing
        if (isAdmin && myTeam.length === 0) {
          myTeam = allEmps.filter(emp =>
            String(emp.id) !== currentTlId &&
            emp.status !== 'Inactive' &&
            !['admin', 'superadmin', 'client'].includes((emp.role || '').toLowerCase())
          );
        }

        if (myTeam.length === 0) {
          Swal.fire('No Team Members', 'You have no employees assigned to you yet. Ask admin to assign employees under you via Team Hierarchy.', 'info');
          return;
        }

        setTeamMembers(myTeam);
        setIsAssignModalOpen(true);
      } else {
        Swal.fire('Error', 'Unable to load employees. Please refresh and try again.', 'error');
      }
    } catch(err) {
      console.error("Failed to load team members:", err);
      Swal.fire('Error', 'Failed to load team members.', 'error');
    }
  };

  const handleAssignSubmit = async () => {
    if(!assigneeId) return Swal.fire('Error', 'Select an employee first', 'error');
    setAssigning(true);
    const emp = teamMembers.find(m => String(m.id) === String(assigneeId));
    if (!emp) {
      setAssigning(false);
      return Swal.fire('Error', 'Selected employee not found', 'error');
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Client Request: ${selectedReq.service}`,
          description: assignNote.trim() ? `${selectedReq.details}\n\n**TL Note:**\n${assignNote}` : selectedReq.details,
          assignedTo: emp.id,
          assignedToName: emp.name,
          assignedBy: 'TL',
          assignedByName: user?.name || 'Team Leader',
          project_id: selectedReq.id,
          attachment: selectedReq.attachment || null,
          fileUrl: null
        })
      });
      const data = await res.json();
      if(data.success) {
        Swal.fire('Success', 'Task assigned successfully!', 'success');
        setIsAssignModalOpen(false);
        // Refresh requests or update status locally
        setClientRequests(prev => prev.map(r => r.id === selectedReq.id ? {...r, status: 'Assigned'} : r));
      } else {
        Swal.fire('Error', data.error || 'Failed to assign', 'error');
      }
    } catch(err) {
      Swal.fire('Error', 'Network error', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const openReviewDeliverModal = (req) => {
    setSelectedReviewReq(req);
    const existingCaption = req.caption || '';
    const existingHashtags = req.hashtags || '#Flymedia #SocialMedia #Trending';
    setReviewCaption(existingCaption);
    setReviewHashtags(existingHashtags);
    setIsReviewModalOpen(true);
    if (!existingCaption.trim()) {
      generateCaptionForReq(req.id);
    }
  };

  const generateCaptionForReq = async (reqId) => {
    try {
      setIsRegenerating(true);
      const res = await fetch('/api/client-services/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reqId,
          action: 'regenerate_caption'
        })
      });
      const data = await res.json();
      if (data.success && data.caption) {
        setReviewCaption(data.caption);
        if (data.hashtags) setReviewHashtags(data.hashtags);
        setClientRequests(prev => prev.map(r => r.id === reqId ? {
          ...r,
          caption: data.caption,
          hashtags: data.hashtags || r.hashtags
        } : r));
      }
    } catch (err) {
      console.error('Caption generation error:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateCaption = async () => {
    if (!selectedReviewReq?.id) return;
    try {
      setIsRegenerating(true);
      const res = await fetch('/api/client-services/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReviewReq.id,
          action: 'regenerate_caption'
        })
      });
      const data = await res.json();
      if (data.success && data.caption) {
        setReviewCaption(data.caption);
        if (data.hashtags) setReviewHashtags(data.hashtags);
        setClientRequests(prev => prev.map(r => r.id === selectedReviewReq.id ? {
          ...r,
          caption: data.caption,
          hashtags: data.hashtags || r.hashtags
        } : r));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '✨ Fresh AI caption generated!',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to regenerate caption', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApproveAndDeliver = async () => {
    if (!selectedReviewReq?.id) return;
    try {
      setIsDelivering(true);
      const res = await fetch('/api/client-services/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReviewReq.id,
          status: 'Completed',
          caption: reviewCaption,
          hashtags: reviewHashtags
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsReviewModalOpen(false);
        setClientRequests(prev => prev.map(r => r.id === selectedReviewReq.id ? {
          ...r,
          status: 'Completed',
          caption: reviewCaption,
          hashtags: reviewHashtags
        } : r));
        Swal.fire({
          icon: 'success',
          title: 'Delivered Successfully! 🎉',
          text: 'The approved banner along with the finalized social media caption and hashtags are now available in the Client Portal for review and posting.',
          confirmButtonColor: '#9333ea'
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to deliver work', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsDelivering(false);
    }
  };

  const reviewBannerImg = selectedReviewReq ? (
    extractFirstImg(selectedReviewReq.deliverable_files) || 
    extractFirstImg(selectedReviewReq.attachment) || 
    extractFirstImg(selectedReviewReq.drive_url)
  ) : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-lg flex-wrap gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Incoming Bookings</h3>
          <p className="text-sm text-slate-500 mt-1">Review and assign new client service requests to your team.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 text-slate-800"
            />
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            {filteredRequests.length} Total Requests
          </div>
        </div>
      </div>
      
      {paginatedRequests.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Requirements</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.client}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{req.service}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-sm">
                    <div className="truncate" title={req.details}>{req.details}</div>
                    {req.revision_notes && (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-snug">
                        <span className="font-bold text-amber-800 block">⚠️ Client Revision Request:</span>
                        <span>{req.revision_notes}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                      req.status === 'Revision Requested'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                        : req.status === 'Pending Assignment' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>{req.status === 'Revision Requested' ? '⚠️ Revision Requested' : req.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => handleView(req)} className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-md transition-colors" title="View Details">
                        <FiEye size={16} />
                      </button>
                      {req.status === 'For TL Review' ? (
                        <button 
                          onClick={() => openReviewDeliverModal(req)} 
                          className="text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3 py-1.5 rounded-md transition-all font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                          title="Review banner deliverable, edit/regenerate AI caption, and deliver to client"
                        >
                          <FiZap size={13} className="text-amber-300" />
                          <span>Review & Deliver</span>
                        </button>
                      ) : req.status === 'Revision Requested' ? (
                        <button 
                          onClick={() => handleAssignClick(req)} 
                          className="text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-md transition-colors font-semibold text-xs flex items-center gap-1 shadow-sm"
                        >
                          ⚠️ Re-Assign / Review
                        </button>
                      ) : req.status === 'Completed' ? (
    <button disabled className="text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md cursor-not-allowed">Delivered</button>
  ) : req.status === 'Assigned' || req.status === 'In Progress' ? (
    <button disabled className="text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md cursor-not-allowed">Working...</button>
  ) : (
    <button onClick={() => handleAssignClick(req)} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">Assign</button>
  )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-16 text-center text-slate-500 flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center mb-4 border border-slate-100"><FiCheckSquare size={20} /></div>
          <p className="font-medium text-slate-900">{search ? "No matching requests" : "No pending requests"}</p>
          <p className="text-sm mt-1">{search ? "Try adjusting your search terms." : "There are no client requests in the system currently."}</p>
        </div>
      )}

      {filteredRequests.length > 0 && (
        <div className="p-4 border-t border-slate-200">
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
      )}
    
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">Assign Request</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Service</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium">
                  {selectedReq?.service}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Team Member</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">-- Choose Employee --</option>
                  {teamMembers.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || emp.role || 'Member'})</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Attach a Note (Optional)</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows="3"
                  placeholder="E.g., Please prioritize this task and follow the client's guidelines..."
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                ></textarea>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={handleAssignSubmit} disabled={assigning || !assigneeId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReviewModalOpen && selectedReviewReq && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-purple-600 text-white rounded-md text-[10px] font-bold tracking-wider uppercase px-2 shadow-xs">TL Review</span>
                  <h3 className="font-bold text-slate-900 text-base">Review Work Deliverable & Social Caption</h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Client: <span className="font-semibold text-slate-800">{selectedReviewReq.client}</span> • Service: <span className="font-semibold text-slate-800">{selectedReviewReq.service}</span>
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
                title="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body: 2-column layout */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
              {/* Left Column: Work Deliverable Proof */}
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FiImage className="text-purple-600" /> Specialist Work Proof
                    </label>
                    {selectedReviewReq.specialist_name && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        By {selectedReviewReq.specialist_name}
                      </span>
                    )}
                  </div>

                  {/* Image Preview Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col items-center justify-center p-3 relative group min-h-[220px]">
                    {reviewBannerImg ? (
                      <div className="w-full flex flex-col items-center">
                        <img
                          src={reviewBannerImg}
                          alt="Uploaded Banner Deliverable"
                          className="max-h-64 max-w-full object-contain rounded-lg shadow-sm border border-slate-200"
                        />
                        <div className="mt-3 flex gap-2">
                          <a
                            href={reviewBannerImg}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md border border-purple-200 transition-colors"
                          >
                            <FiExternalLink size={13} /> View Full Size
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-400">
                        <FiImage size={36} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-500">No image preview available</p>
                        {selectedReviewReq.deliverable_files && (
                          <a
                            href={selectedReviewReq.deliverable_files}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline"
                          >
                            Open Attachment
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Specialist Note if provided */}
                {selectedReviewReq.deliverable_note && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                    <span className="font-bold text-emerald-900 block mb-1">📝 Specialist Completion Note:</span>
                    <p className="text-emerald-800 whitespace-pre-wrap">{selectedReviewReq.deliverable_note}</p>
                  </div>
                )}

                {/* Client Requirements Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="font-bold text-slate-700 block mb-1">📋 Original Client Brief:</span>
                  <p className="text-slate-600 max-h-28 overflow-y-auto whitespace-pre-wrap">{selectedReviewReq.details}</p>
                </div>
              </div>

              {/* Right Column: AI Caption & Hashtags (Editable + Auto-Regenerate) */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FiEdit3 className="text-purple-600" /> Social Media Caption
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateCaption}
                    disabled={isRegenerating || isDelivering}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-md transition-all shadow-xs disabled:opacity-50"
                    title="Automatically regenerate caption and hashtags with Gemini AI"
                  >
                    <FiRefreshCw size={12} className={isRegenerating ? "animate-spin" : ""} />
                    {isRegenerating ? "Generating with AI..." : "🔄 Regenerate with AI"}
                  </button>
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={reviewCaption}
                    onChange={(e) => setReviewCaption(e.target.value)}
                    placeholder="Post caption will appear here. You can freely edit or regenerate it..."
                    className="w-full border border-slate-300 rounded-xl p-3 text-xs leading-relaxed text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none font-sans"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>You can edit this caption before delivering to the client.</span>
                    <span>{reviewCaption.length} chars</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Trending Hashtags
                  </label>
                  <input
                    type="text"
                    value={reviewHashtags}
                    onChange={(e) => setReviewHashtags(e.target.value)}
                    placeholder="#Brand #SocialMedia #Trending"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                  <span className="text-base">💡</span>
                  <p className="leading-snug">
                    This caption was automatically generated when the specialist submitted work. You can edit any line or click <strong>Regenerate with AI</strong> before clicking <strong>Approve & Deliver</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                disabled={isDelivering}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
              >
                Cancel / Keep in Review
              </button>

              <button
                type="button"
                onClick={handleApproveAndDeliver}
                disabled={isDelivering || isRegenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isDelivering ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Delivering to Client...</span>
                  </>
                ) : (
                  <>
                    <FiSend size={14} />
                    <span>Approve & Deliver to Client</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}