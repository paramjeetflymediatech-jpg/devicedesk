'use client';
import { useState, useEffect } from 'react';
import { FiLayout, FiMessageSquare, FiFileText, FiClock, FiMenu, FiX } from 'react-icons/fi';
import ProjectChat from '../../components/ProjectChat';

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Assuming client context
  const myClientId = 'emp_demo_client_1789113315702'; // Mock ID

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isMobileMenuOpen]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200">
          C
        </div>
        <div>
          <h2 className="font-bold text-lg text-gray-800 leading-tight">Client Portal</h2>
          <p className="text-xs text-gray-500">Demo Client</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2">
        <button 
          onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
          className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <FiLayout size={20} />
          <span>Project Overview</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
          className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'chat' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <FiMessageSquare size={20} />
          <span>Project Chat</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={() => window.location.href = '/login'}
          className="w-full text-center p-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row w-full">
      
      {/* Desktop Sidebar (Fixed on left) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-sm bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar Panel */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600">
             <FiX size={20} />
           </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content Wrapper (Offsets the fixed desktop sidebar) */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full relative">
        
        {/* Mobile Header (Sticky) */}
        <header className="bg-white border-b px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 mr-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiMenu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              {activeTab === 'overview' ? 'Overview' : 'Communication'}
            </h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">DC</div>
        </header>

        {/* Desktop Header (Sticky) */}
        <header className="hidden md:flex bg-white/80 border-b px-8 py-6 justify-between items-center sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            {activeTab === 'overview' ? 'Project Overview' : 'Project Communication'}
          </h1>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 font-medium">Welcome back, Demo Client</span>
             <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm shadow-indigo-100">DC</div>
          </div>
        </header>

        {/* Scrollable Content Area (Natural body scroll) */}
        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex items-start space-x-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                    <FiFileText />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Active Projects</p>
                    <p className="text-3xl font-bold text-gray-900">2</p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex items-start space-x-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                    <FiClock />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Pending Approvals</p>
                    <p className="text-3xl font-bold text-gray-900">1</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                   <h3 className="text-lg font-bold text-gray-800">Recent Submissions for Review</h3>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project Phase</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                           <p className="text-sm font-medium text-gray-800">Website Redesign (Draft)</p>
                           <p className="text-xs text-gray-500 mt-1">Submitted 2 hours ago</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                             <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                             Client Review
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">
                             Review Submission &rarr;
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-0 md:p-2 min-h-[500px] h-[calc(100vh-200px)] animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col w-full">
              <ProjectChat 
                projectId="proj_mock_1" 
                departmentId="dept_mock_1" 
                currentUserId={myClientId} 
                currentUserName="Demo Client" 
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
