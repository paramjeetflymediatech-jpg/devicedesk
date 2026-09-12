'use client';
import { useState, useEffect } from 'react';
import { FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, FiGrid, FiFileText, FiImage, FiDollarSign, FiDownload, FiSend, FiEdit3 } from 'react-icons/fi';

export default function SEOReportsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const myClientId = 'emp_demo_client_1789113315702'; // Mock ID
  const [seoReports, setSeoReports] = useState([]);

  useEffect(() => {
    const fetchSEO = async () => {
      try {
        const res = await fetch(`/api/client-services/seo?clientId=${myClientId}`);
        const data = await res.json();
        if (data.success) setSeoReports(data.data);
      } catch (err) {}
    };
    fetchSEO();
  }, []);

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
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Main</div>
        <button onClick={() => window.location.href = '/portal/client/dashboard'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiGrid size={20} /><span>Dashboard</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiLayout size={20} /><span>Project Overview</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/chat'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiMessageSquare size={20} /><span>Project Chat</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/book-service'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiEdit3 size={20} /><span>Book Service</span>
        </button>

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Projects</div>
        <button onClick={() => window.location.href = '/portal/client/seo'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all bg-indigo-50 text-indigo-700">
          <FiFileText size={20} /><span>SEO Reports</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/smo'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiImage size={20} /><span>SMO Graphics</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/ads'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiDollarSign size={20} /><span>PAID Ads</span>
        </button>

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Billing & Packages</div>
        <button onClick={() => window.location.href = '/portal/client/packages'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiBox size={20} /><span>Packages</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/billing'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiCreditCard size={20} /><span>Billing</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <button onClick={() => window.location.href = '/login'} className="w-full text-center p-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row w-full">
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-sm bg-white">
        <SidebarContent />
      </aside>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600"><FiX size={20} /></button>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full relative">
        <header className="bg-white border-b px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg"><FiMenu size={24} /></button>
            <h1 className="text-xl font-bold text-gray-800">SEO Reports</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">DC</div>
        </header>

        <header className="hidden md:flex bg-white/80 border-b px-8 py-6 justify-between items-center sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">SEO Reports</h1>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 font-medium">Welcome back, Demo Client</span>
             <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm shadow-indigo-100">DC</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Monthly SEO Reports</h3>
                <p className="text-sm text-gray-500 mt-1">Download and review your website's search engine performance.</p>
              </div>
            </div>
            <div className="p-6">
              {seoReports.length === 0 ? <div className="text-center py-10 text-gray-400">No SEO reports available yet.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seoReports.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col justify-between h-full bg-white relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg"><FiFileText /></div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">New</span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{report.month} {report.year}</h4>
                        <p className="text-sm text-gray-500 mb-6">Complete SEO performance report</p>
                      </div>
                      <a href={report.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full py-2.5 bg-gray-50 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg transition-colors border border-gray-200 group-hover:border-indigo-200">
                        <FiDownload className="mr-2" /> Download PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
