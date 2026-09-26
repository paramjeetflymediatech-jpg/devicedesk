'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiActivity, FiCheckSquare, FiUsers, FiMessageSquare, FiUser, FiMenu, FiX, FiBriefcase } from 'react-icons/fi';

export default function LeaderLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname() || '';
  
  const [requestsCount, setRequestsCount] = useState(0);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const resReq = await fetch('/api/client-services/requests');
        const dataReq = await resReq.json();
        if (dataReq.success) {
          setRequestsCount(dataReq.data.length);
        }
      } catch (err) {}
    }
    fetchRequests();
  }, []);

  const getPageTitle = () => {
    if (pathname.includes('client-requests')) return 'Client Requests';
    if (pathname.includes('team-chat')) return 'Team Chat Room';
    if (pathname.includes('team')) return 'Team & EODs';
    if (pathname.includes('client-chat')) return 'Client Chat Room';
    return 'Overview Dashboard';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-600 border-r border-slate-100">
      <div className="p-6 border-b border-slate-100 flex flex-col items-center justify-center space-y-3">
        <img src="/flymedia-logo.png" alt="Fly Media Technology" className="h-16 object-contain" />
        <div className="text-center w-full bg-slate-50 border border-slate-100 py-1.5 rounded-md mt-2">
           <span className="font-bold text-[10px] tracking-widest text-slate-500 uppercase">TL Portal</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 px-3">Main</div>
        
        <Link href="/portal/leader" className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${pathname === '/portal/leader' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <FiActivity size={20} /><span>Overview</span>
        </Link>
        
        <Link href="/portal/leader/client-requests" className={`flex items-center justify-between p-3 rounded-lg font-medium transition-all ${pathname.includes('client-requests') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <div className="flex items-center space-x-3">
            <FiCheckSquare size={20} /><span>Client Requests</span>
          </div>
          {requestsCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{requestsCount}</span>
          )}
        </Link>
        
        <Link href="/portal/leader/team" className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${pathname.includes('/team') && !pathname.includes('team-chat') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <FiUsers size={20} /><span>Team & EODs</span>
        </Link>

        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Communication</div>
        
        <Link href="/portal/leader/client-chat" className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${pathname.includes('client-chat') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <FiMessageSquare size={20} /><span>Client Chat Room</span>
        </Link>
        
        <Link href="/portal/leader/team-chat" className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${pathname.includes('team-chat') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <FiUsers size={20} /><span>Team Chat Room</span>
        </Link>

        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Personal</div>
        
        <button onClick={() => window.location.href = '/employee-dashboard'} className="w-full flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <FiUser size={20} /><span>My Employee Profile</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-100">
        <button onClick={() => window.location.href = '/login'} className="w-full text-center p-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col md:flex-row w-full selection:bg-slate-200 selection:text-slate-900">
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 bg-white">
        <SidebarContent />
      </aside>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/20 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 ease-out md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl shadow-slate-200' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 z-50">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><FiX size={18} /></button>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full relative">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-slate-600 hover:bg-slate-100 rounded-md md:hidden transition-colors"><FiMenu size={20} /></button>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
             <div className="hidden md:block text-right">
               <p className="text-sm font-medium text-slate-900">Active Session</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-medium text-sm">TL</div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 w-full max-w-7xl mx-auto flex flex-col animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
