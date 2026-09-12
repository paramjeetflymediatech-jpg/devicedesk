'use client';
import { useState } from 'react';
import { FiCheckSquare, FiMessageSquare, FiMenu, FiX, FiFileText, FiSend, FiClock } from 'react-icons/fi';

export default function TeamMemberDashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  // MOCK DATA
  const [myTasks] = useState([
    { id: 'TSK-101', title: 'SEO Keyword Analysis', client: 'Acme Corp', status: 'In Progress', deadline: 'Today 5:00 PM', desc: 'Compile list of top 50 keywords.' },
    { id: 'TSK-102', title: 'Backlink Audit', client: 'Acme Corp', status: 'Completed', deadline: 'Yesterday', desc: 'Identify toxic backlinks.' }
  ]);

  const [eodReport, setEodReport] = useState('');
  const [eodSubmitted, setEodSubmitted] = useState(false);

  const [tlChats, setTlChats] = useState([
    { sender: 'You', msg: 'Hey boss, the backlink audit is done. Uploaded to the drive.', time: '02:15 PM' },
    { sender: 'TL', msg: 'Great job Alice. Make sure to include it in your EOD report so I can forward it to Acme.', time: '02:20 PM' }
  ]);
  const [newTlMsg, setNewTlMsg] = useState('');

  const handleSendTlChat = (e) => {
    e.preventDefault();
    if (!newTlMsg.trim()) return;
    setTlChats([...tlChats, { sender: 'You', msg: newTlMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    setNewTlMsg('');
  };

  const handleEodSubmit = (e) => {
    e.preventDefault();
    if (!eodReport.trim()) return;
    setEodSubmitted(true);
    // In a real app, this sends a POST request to save the EOD for the TL to review
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 border-r border-slate-200">
      <div className="p-6 border-b border-slate-200 flex items-center space-x-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
          M
        </div>
        <div>
          <h2 className="font-bold text-lg text-slate-900 leading-tight">Member Portal</h2>
          <p className="text-xs text-slate-500 font-medium">Alice Smith</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 px-3">My Work</div>
        <button onClick={() => setActiveTab('tasks')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'tasks' ? 'bg-emerald-500/10 text-emerald-700' : 'hover:bg-slate-200 hover:text-slate-900'}`}>
          <FiCheckSquare size={20} /><span>My Tasks</span>
        </button>
        <button onClick={() => setActiveTab('eod')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'eod' ? 'bg-emerald-500/10 text-emerald-700' : 'hover:bg-slate-200 hover:text-slate-900'}`}>
          <FiFileText size={20} /><span>Daily EOD Report</span>
        </button>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Team Comms</div>
        <button onClick={() => setActiveTab('tl-chat')} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'tl-chat' ? 'bg-emerald-500/10 text-emerald-700' : 'hover:bg-slate-200 hover:text-slate-900'}`}>
          <FiMessageSquare size={20} /><span>Chat with TL</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <p className="text-[10px] text-center text-slate-400 mb-2 px-4 uppercase font-bold">Client communication is disabled for member accounts.</p>
        <button onClick={() => window.location.href = '/login'} className="w-full text-center p-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col md:flex-row w-full">
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-sm bg-slate-100">
        <SidebarContent />
      </aside>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-100 z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-200 rounded-full text-slate-600"><FiX size={20} /></button>
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
             <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shadow-sm">AS</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
          
          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-emerald-900 mb-2">My Assigned Tasks</h3>
                <p className="text-sm text-emerald-700">Complete these tasks and remember to log your progress in your EOD report at the end of the day.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myTasks.map(task => (
                  <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400">{task.id} • {task.client}</span>
                        <h4 className="font-bold text-lg text-slate-800">{task.title}</h4>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{task.status}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{task.desc}</p>
                    <div className="flex items-center text-xs font-semibold text-slate-500 bg-slate-50 p-2 rounded-lg inline-flex">
                      <FiClock className="mr-1" /> Deadline: {task.deadline}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EOD TAB */}
          {activeTab === 'eod' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold">Submit Daily EOD Report</h3>
                <p className="text-sm text-slate-500">Your TL will review this before sending an official update to the client.</p>
              </div>
              <div className="p-6">
                {eodSubmitted ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><FiCheckSquare /></div>
                    <h4 className="text-xl font-bold text-slate-800 mb-2">EOD Submitted Successfully!</h4>
                    <p className="text-slate-500">Your Team Leader has received your update. Great work today!</p>
                  </div>
                ) : (
                  <form onSubmit={handleEodSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">What did you accomplish today?</label>
                      <textarea 
                        value={eodReport}
                        onChange={e => setEodReport(e.target.value)}
                        placeholder="e.g., Completed keyword analysis for Acme Corp. Started working on..."
                        className="w-full border border-slate-200 rounded-xl p-4 min-h-[200px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 flex items-center">
                      <FiSend className="mr-2" /> Submit to TL
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TL CHAT TAB */}
          {activeTab === 'tl-chat' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">Chat with Team Leader</h3>
                  <p className="text-xs text-slate-500">Ask questions or provide quick updates.</p>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {tlChats.map((chat, idx) => (
                  <div key={idx} className={`flex flex-col ${chat.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-400 mb-1 mx-1">{chat.sender} • {chat.time}</span>
                    <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${chat.sender === 'You' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                      {chat.msg}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendTlChat} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input type="text" value={newTlMsg} onChange={e=>setNewTlMsg(e.target.value)} placeholder="Message your TL..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                <button type="submit" className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700"><FiSend /></button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
