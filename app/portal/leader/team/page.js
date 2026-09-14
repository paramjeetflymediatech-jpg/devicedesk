'use client';
import { useState, useEffect } from 'react';
import { FiUsers, FiClock, FiCheck, FiSend } from 'react-icons/fi';

export default function TeamAndEODsPage() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const resEmp = await fetch('/api/employees');
        const dataEmp = await resEmp.json();
        if (dataEmp.success) {
          const members = dataEmp.data.filter(emp => emp.role === 'Team Member');
          const mappedMembers = members.map(m => ({
            id: m.id,
            name: m.name,
            role: m.department || 'Specialist',
            tasks: Math.floor(Math.random() * 5),
            eodStatus: Math.random() > 0.5 ? 'Submitted' : 'Pending',
            lastEOD: Math.random() > 0.5 ? 'Completed assigned workflow for today. All links updated in the main tracking sheet.' : null
          }));
          setTeamMembers(mappedMembers);
        }
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">End of Day (EOD) Review</h3>
        <p className="text-sm text-slate-500">Review member accomplishments and forward the final summary to your clients. Members cannot message clients directly.</p>
      </div>

      {teamMembers.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {teamMembers.map(member => (
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
                   <button className="text-sm bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors font-medium">Assign Task</button>
                   {member.eodStatus === 'Submitted' && (
                     <button className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5">
                       <FiSend size={14}/> Forward to Client
                     </button>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-16 text-center flex flex-col items-center shadow-sm">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center mb-4 border border-slate-100"><FiUsers size={20} /></div>
          <p className="font-medium text-slate-900">No team members</p>
          <p className="text-sm text-slate-500 mt-1">There are no Team Members assigned to your department yet.</p>
        </div>
      )}
    </div>
  );
}
