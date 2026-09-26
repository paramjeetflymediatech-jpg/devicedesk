'use client';
import { useState, useEffect } from 'react';
import { FiCheckSquare, FiSearch, FiX, FiEye } from 'react-icons/fi';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

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
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const resReq = await fetch('/api/client-services/requests');
        const dataReq = await resReq.json();
        if (dataReq.success) {
          const mappedReqs = (dataReq.data || []).map(req => ({
            id: req.id,
            client: req.clientId || 'Unknown Client',
            service: req.service_type,
            details: req.requirements,
            date: new Date(req.created_at).toLocaleDateString(),
            status: req.status || 'Pending Assignment'
          }));
          setClientRequests(mappedReqs);
        }
      } catch (err) {
        console.error("Failed to fetch requests:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if(data.success) {
        const matchingTask = data.data.find(t => t.project_id === req.id);
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

          extraHtml = `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 8px;">Employee Work Submission</h4>
              <p style="margin-bottom: 5px;"><strong>Assigned To:</strong> ${matchingTask.assignedToName || 'Unknown'}</p>
              <p style="margin-bottom: 5px;"><strong>Task Status:</strong> ${matchingTask.status}</p>
              ${proofsHtml}
            </div>
          `;
        }
      }
    } catch(e) {
      console.error(e);
    }

    Swal.fire({
      title: `Client Request: ${req.service}`,
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p style="margin-bottom: 8px;"><strong>Client:</strong> ${req.client}</p>
          <p style="margin-bottom: 8px;"><strong>Status:</strong> ${req.status}</p>
          <p style="margin-bottom: 8px;"><strong>Requirements:</strong></p>
          <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; max-height: 250px; overflow-y: auto; white-space: pre-wrap; margin-top: 5px;">${req.details}</div>
          ${extraHtml}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#334155'
    });
  };

  const handleAssignClick = async (req) => {
    setSelectedReq(req);
    setIsAssignModalOpen(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setTeamMembers(data.data.filter(emp => emp.role === 'Team Member' || emp.role === 'Employee'));
      }
    } catch(err) {}
  };

  const handleAssignSubmit = async () => {
    if(!assigneeId) return Swal.fire('Error', 'Select an employee first', 'error');
    setAssigning(true);
    const emp = teamMembers.find(m => m.id === assigneeId);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Client Request: ${selectedReq.service}`,
          description: selectedReq.details,
          assignedTo: emp.id,
          assignedToName: emp.name,
          assignedBy: 'TL',
          assignedByName: 'Team Leader',
          project_id: selectedReq.id
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
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client ID</th>
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
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-sm truncate" title={req.details}>{req.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                      req.status==='Pending Assignment' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>{req.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => handleView(req)} className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-md transition-colors" title="View Details">
                        <FiEye size={16} />
                      </button>
                      {req.status === 'For TL Review' ? (
    <button onClick={async () => {
       const { isConfirmed } = await Swal.fire({
         title: 'Deliver to Client?',
         text: 'Are you sure you want to approve this work and deliver it to the client?',
         icon: 'question',
         showCancelButton: true
       });
       if(isConfirmed) {
         try {
           await fetch('/api/client-services/requests', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: req.id, status: 'Completed'})});
           Swal.fire('Success', 'Delivered to client!', 'success');
           setClientRequests(prev => prev.map(r => r.id === req.id ? {...r, status: 'Completed'} : r));
         } catch(e) {}
       }
    }} className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md transition-colors">Deliver Work</button>
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
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
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
    </div>
  );
}