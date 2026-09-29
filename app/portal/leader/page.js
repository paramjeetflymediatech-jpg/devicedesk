'use client';
import { useState, useEffect } from 'react';
import { FiCheckSquare, FiUsers, FiClock, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import { useAuth } from '../../auth/AuthContext';

export default function LeaderOverviewPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const [resEmp, resReq, resEod] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/client-services/requests'),
          fetch('/api/eod-reports')
        ]);
        
        const dataEmp = await resEmp.json();
        const dataReq = await resReq.json();
        const dataEod = await resEod.json();
        
        if (dataEmp.success) {
          const eodList = dataEod.success ? dataEod.data : [];
          const members = dataEmp.data.filter(emp => 
            (emp.role === 'Team Member' || emp.role === 'Employee' || emp.role === 'team member') && 
            emp.tl_id === user.id
          );
          const today = new Date().toISOString().split('T')[0];
          
          const mappedMembers = members.map(m => {
            const mEods = eodList.filter(e => e.employee_id === m.id && (e.submitted_at || '').startsWith(today));
            const latestEod = mEods.length > 0 ? mEods[0] : null;
            return {
              id: m.id,
              name: m.name,
              eodStatus: latestEod ? (latestEod.status || 'Submitted') : 'Pending',
            };
          });
          setTeamMembers(mappedMembers);
        }

        if (dataReq.success) {
          const reqs = dataReq.data.filter(r => r.assigned_tl_id === user.id);
          setClientRequests(reqs);
        }
      } catch (err) {
        console.error("Failed to fetch TL data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Card 1 */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600">Total Requests</h3>
            <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center"><FiCheckSquare size={16} /></div>
          </div>
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{clientRequests.length}</h2>
            <Link href="/portal/leader/client-requests" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">View all <FiArrowRight size={14}/></Link>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600">Active Team</h3>
            <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center"><FiUsers size={16} /></div>
          </div>
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{teamMembers.length}</h2>
            <Link href="/portal/leader/team" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">Manage <FiArrowRight size={14}/></Link>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600">EODs Submitted</h3>
            <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center"><FiClock size={16} /></div>
          </div>
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {teamMembers.filter(m=>m.eodStatus==='Submitted').length} 
              <span className="text-lg text-slate-400 font-medium ml-1">/ {teamMembers.length}</span>
            </h2>
            <Link href="/portal/leader/team" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">Review <FiArrowRight size={14}/></Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Standard Operating Procedure</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-lg border border-slate-100 bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center mb-3 text-sm">1</div>
              <h4 className="font-semibold text-slate-900 mb-2 text-sm">Review Client Requests</h4>
              <p className="text-sm text-slate-600 leading-relaxed">Check the Client Requests tab for incoming jobs from the booking portal.</p>
            </div>
            
            <div className="p-5 rounded-lg border border-slate-100 bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center mb-3 text-sm">2</div>
              <h4 className="font-semibold text-slate-900 mb-2 text-sm">Assign Tasks to Team</h4>
              <p className="text-sm text-slate-600 leading-relaxed">Delegate the work to your team members and track their active tasks.</p>
            </div>
            
            <div className="p-5 rounded-lg border border-slate-100 bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center mb-3 text-sm">3</div>
              <h4 className="font-semibold text-slate-900 mb-2 text-sm">Review EODs & Finalize</h4>
              <p className="text-sm text-slate-600 leading-relaxed">At EOD, review member submissions and forward the final EOD Update to the Client.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
