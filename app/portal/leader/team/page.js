'use client';
import { useState, useEffect } from 'react';
import { FiUsers, FiClock, FiCheck, FiSend, FiSearch, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

export default function TeamAndEODsPage() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resEmp, resTasks, resEod] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/tasks'),
        fetch('/api/eod-reports')
      ]);
      const dataEmp = await resEmp.json();
      const dataTasks = await resTasks.json();
      const dataEod = await resEod.json();
      
      if (dataEmp.success) {
        const members = (dataEmp.data || []).filter(emp => emp.role === 'Team Member' || emp.role === 'Employee');
        const tasksList = dataTasks.success ? dataTasks.data : (dataTasks.tasks || []);
        const eodList = dataEod.success ? dataEod.data : [];
        
        const mappedMembers = members.map(m => {
          const mTasks = tasksList.filter(t => t.assignedTo === m.id && t.status !== 'Completed');
          const today = new Date().toISOString().split('T')[0];
          const mEods = eodList.filter(e => e.employee_id === m.id && (e.submitted_at || '').startsWith(today));
          const latestEod = mEods.length > 0 ? mEods[0] : null;

          return {
            id: m.id,
            name: m.name,
            role: m.department || 'Specialist',
            tasks: mTasks.length,
            eodStatus: latestEod ? latestEod.status : 'Pending',
            lastEOD: latestEod ? latestEod.report_text : null,
            eodId: latestEod ? latestEod.id : null
          };
        });
        setTeamMembers(mappedMembers);
      }
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignClick = (emp) => {
    setSelectedEmp(emp);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setAssignModalOpen(true);
  };

  const submitAssignTask = async () => {
    if(!newTaskTitle.trim()) return Swal.fire('Error', 'Task title is required', 'error');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          assignedTo: selectedEmp.id,
          assignedToName: selectedEmp.name,
          assignedBy: 'TL',
          assignedByName: 'Team Leader'
        })
      });
      const d = await res.json();
      if(d.success) {
        Swal.fire('Success', 'Task assigned', 'success');
        setAssignModalOpen(false);
        fetchData();
      } else {
        Swal.fire('Error', d.error, 'error');
      }
    } catch(err) {
      Swal.fire('Error', 'Failed to assign', 'error');
    }
  };

  const handleForwardClient = async (member) => {
    const { value: clientEmail } = await Swal.fire({
      title: 'Forward EOD to Client',
      input: 'email',
      inputLabel: 'Client Email Address',
      inputPlaceholder: 'Enter client email',
      showCancelButton: true
    });
    
    if (clientEmail) {
      Swal.fire('Sent!', 'EOD report forwarded to ' + clientEmail, 'success');
    }
  };

  const filteredMembers = teamMembers.filter(m => {
    const q = search.toLowerCase();
    const n = String(m.name || "").toLowerCase();
    const r = String(m.role || "").toLowerCase();
    const s = String(m.eodStatus || "").toLowerCase();
    return n.includes(q) || r.includes(q) || s.includes(q);
  });

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedMembers = filteredMembers.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">End of Day (EOD) Review</h3>
          <p className="text-sm text-slate-500">Review member accomplishments and forward the final summary to your clients. Members cannot message clients directly.</p>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 text-slate-800"
          />
        </div>
      </div>

      {paginatedMembers.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {paginatedMembers.map(member => (
            <div key={member.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:border-slate-300 transition-colors">
              <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-lg text-slate-700 shadow-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{member.name}</h4>
                    <p className="text-xs font-medium text-slate-500">{member.role}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Active Tasks</span>
                    <span className="font-semibold text-slate-900">{member.tasks}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">EOD Status</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase tracking-wider ${member.eodStatus === 'Submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{member.eodStatus}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                   <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><FiClock size={14}/> Today's Report</h5>
                </div>
                
                <div className="flex-1">
                  {member.lastEOD ? (
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-md">
                      <p className="text-sm text-slate-700 leading-relaxed">{member.lastEOD}</p>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-md p-6">
                      <p className="text-sm text-slate-400 font-medium">No report submitted yet today.</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                   <button onClick={() => handleAssignClick(member)} className="text-sm bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors font-medium">Assign Task</button>
                   {member.eodStatus === 'Submitted' && (
                     <button onClick={() => handleForwardClient(member)} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5">
                       <FiSend size={14}/> Forward to Client
                     </button>
                   )}
                </div>
              </div>
            </div>
          ))}

          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredMembers.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemName="members"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-16 text-center flex flex-col items-center shadow-sm">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center mb-4 border border-slate-100"><FiUsers size={20} /></div>
          <p className="font-medium text-slate-900">{search ? "No matching team members" : "No team members"}</p>
          <p className="text-sm text-slate-500 mt-1">{search ? "Try adjusting your search terms." : "There are no Team Members assigned to your department yet."}</p>
        </div>
      )}

      {assignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">Assign Task to {selectedEmp?.name}</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}></textarea>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={submitAssignTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">Assign Task to {selectedEmp?.name}</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}></textarea>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={submitAssignTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
