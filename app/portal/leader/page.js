'use client';
import { useState, useEffect } from 'react';
import { FiLayout, FiUsers, FiMessageSquare, FiMenu, FiX, FiCheckSquare, FiClock, FiActivity, FiArrowRight, FiUser, FiSend } from 'react-icons/fi';
import ProjectChat from '../../components/ProjectChat';

export default function TeamLeaderDashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await fetch('/api/departments');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setDepartments(data.data);
          setSelectedDeptId(data.data[0].id);
        }
      } catch (err) {}
    }
    fetchDepartments();
  }, []);

  // MOCK DATA
  const [clientRequests] = useState([
    { id: 'REQ-001', client: 'Acme Corp', service: 'SEO', details: 'Need monthly keyword ranking report and backlink analysis.', date: '2026-09-12', status: 'Pending Assignment' },
    { id: 'REQ-002', client: 'TechFlow', service: 'SMO', details: 'Create 4 graphics for Instagram summer campaign.', date: '2026-09-11', status: 'In Progress' }
  ]);

  const [teamMembers] = useState([
    { id: 'MEM-01', name: 'Alice Smith', role: 'SEO Specialist', tasks: 3, eodStatus: 'Submitted', lastEOD: 'Completed all keyword research for Acme Corp. Started backlink audit.' },
    { id: 'MEM-02', name: 'Bob Jones', role: 'Graphic Designer', tasks: 2, eodStatus: 'Pending', lastEOD: null },
    { id: 'MEM-03', name: 'Charlie Day', role: 'Ads Manager', tasks: 5, eodStatus: 'Submitted', lastEOD: 'Optimized bidding strategy for TechFlow. CPC reduced by 12%.' }
  ]);

  const [clientChats, setClientChats] = useState([
    { sender: 'Client (Acme)', msg: 'Hi, when can we expect the SEO report?', time: '10:30 AM' },
    { sender: 'You', msg: 'Hi Acme! My team is wrapping up the backlink audit today. I will send the EOD update shortly.', time: '10:45 AM' }
  ]);
  const [newClientMsg, setNewClientMsg] = useState('');

  const [teamChats, setTeamChats] = useState([
    { sender: 'Alice Smith', msg: 'Hey boss, the backlink audit is done. Uploaded to the drive.', time: '02:15 PM' },
    { sender: 'You', msg: 'Great job Alice. Make sure to include it in your EOD report so I can forward it to Acme.', time: '02:20 PM' }
  ]);
  const [newTeamMsg, setNewTeamMsg] = useState('');

  const handleSendClientChat = (e) => {
    e.preventDefault();
    if (!newClientMsg.trim()) return;
    setClientChats([...clientChats, { sender: 'You', msg: newClientMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    setNewClientMsg('');
  };

  const handleSendTeamChat = (e) => {
    e.preventDefault();
    if (!newTeamMsg.trim()) return;
    setTeamChats([...teamChats, { sender: 'You', msg: newTeamMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    setNewTeamMsg('');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
          TL
        </div>
        <div>
          <h2 className="font-bold text-lg text-white leading-tight">Leader Portal</h2>
          <p className="text-xs text-indigo-300 font-medium">Marketing Dept</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2 px-3">Management</div>
        <button onClick={() => setActiveTab('dashboard')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}>
          <FiActivity size={20} /><span>TL Dashboard</span>
        </button>
        <button onClick={() => setActiveTab('client-requests')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'client-requests' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}>
          <FiCheckSquare size={20} /><span>Client Requests</span>
        </button>
        <button onClick={() => setActiveTab('team')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'team' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}>
          <FiUsers size={20} /><span>Team & EODs</span>
        </button>

        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-3">Communications</div>
        <button onClick={() => setActiveTab('client-chat')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'client-chat' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}>
          <FiMessageSquare size={20} /><span>Chat with Clients</span>
        </button>
        <button onClick={() => setActiveTab('team-chat')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'team-chat' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}>
          <FiMessageSquare size={20} /><span>Chat with Team</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <button onClick={() => window.location.href = '/login'} className="w-full text-center p-3 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row w-full">
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-xl bg-slate-900">
        <SidebarContent />
      </aside>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-300"><FiX size={20} /></button>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full relative">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"><FiMenu size={24} /></button>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight capitalize">{activeTab.replace('-', ' ')}</h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shadow-sm">TL</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-xl"><FiCheckSquare /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Pending Requests</p>
                    <h3 className="text-2xl font-bold">{clientRequests.filter(r=>r.status==='Pending Assignment').length}</h3>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl"><FiUsers /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Active Members</p>
                    <h3 className="text-2xl font-bold">{teamMembers.length}</h3>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl"><FiClock /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">EODs Submitted</p>
                    <h3 className="text-2xl font-bold">{teamMembers.filter(m=>m.eodStatus==='Submitted').length} / {teamMembers.length}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold">Today's Workflow</h3></div>
                <div className="p-6 text-slate-600 space-y-4">
                  <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">1</div><p>Review new <strong>Client Requests</strong> from the booking portal.</p></div>
                  <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">2</div><p>Assign tasks to your <strong>Team Members</strong>.</p></div>
                  <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">3</div><p>At EOD, review member submissions and forward the final <strong>EOD Update to the Client</strong> via chat.</p></div>
                </div>
              </div>
            </div>
          )}

          {/* CLIENT REQUESTS TAB */}
          {activeTab === 'client-requests' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold">Incoming Client Service Bookings</h3></div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Client</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Service</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Requirements</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientRequests.map(req => (
                    <tr key={req.id}>
                      <td className="p-4 font-bold text-sm">{req.client}</td>
                      <td className="p-4 text-sm font-medium text-indigo-600">{req.service}</td>
                      <td className="p-4 text-sm text-slate-600">{req.details}</td>
                      <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${req.status==='Pending Assignment' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{req.status}</span></td>
                      <td className="p-4"><button className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-100 font-medium">Assign Task</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TEAM & EODs TAB */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-2">End of Day (EOD) Review</h3>
                <p className="text-sm text-indigo-700">Review what your team accomplished today before summarizing it for the client. Team members do not interact directly with clients.</p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {teamMembers.map(member => (
                  <div key={member.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                    <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50 flex flex-col justify-center">
                      <h4 className="font-bold text-lg">{member.name}</h4>
                      <p className="text-sm text-slate-500">{member.role}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm font-medium">Active Tasks: {member.tasks}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${member.eodStatus === 'Submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{member.eodStatus} EOD</span>
                      </div>
                    </div>
                    <div className="p-6 flex-1">
                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Today's EOD Report</h5>
                      {member.lastEOD ? (
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">{member.lastEOD}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No report submitted yet today.</p>
                      )}
                      <div className="mt-4 flex gap-2">
                         <button className="text-sm bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium">Assign New Task</button>
                         {member.eodStatus === 'Submitted' && <button className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">Forward to Client</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLIENT CHAT TAB */}
          {activeTab === 'client-chat' && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full font-semibold transition-all text-sm ${
                      selectedDeptId === dept.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>

              {selectedDeptId ? (
                <ProjectChat 
                  key={selectedDeptId} 
                  projectId="proj_mock_1" 
                  departmentId={selectedDeptId} 
                  currentUserId="emp_mock_tl_1" 
                  currentUserName="Team Leader" 
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-500">
                  Loading departments...
                </div>
              )}
            </div>
          )}

          {/* TEAM CHAT TAB */}
          {activeTab === 'team-chat' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">Team Marketing Chat</h3>
                  <p className="text-xs text-slate-500">Internal communication only.</p>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {teamChats.map((chat, idx) => (
                  <div key={idx} className={`flex flex-col ${chat.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-400 mb-1 mx-1">{chat.sender} • {chat.time}</span>
                    <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${chat.sender === 'You' ? 'bg-slate-800 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                      {chat.msg}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendTeamChat} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input type="text" value={newTeamMsg} onChange={e=>setNewTeamMsg(e.target.value)} placeholder="Type internal message to team..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500" />
                <button type="submit" className="bg-slate-800 text-white p-3 rounded-xl hover:bg-slate-900"><FiSend /></button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
