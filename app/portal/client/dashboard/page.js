'use client';
import { useState, useEffect } from 'react';
import { FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, FiGrid, FiFileText, FiImage, FiDollarSign, FiEdit3, FiArrowRight, FiActivity, FiClock, FiTrendingUp } from 'react-icons/fi';
import Link from 'next/link';

export default function DashboardPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const myClientId = 'emp_demo_client_1789113315702'; // Mock ID
  
  // Data States
  const [projects, setProjects] = useState([]);
  const [seoReports, setSeoReports] = useState([]);
  const [adsData, setAdsData] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [projRes, seoRes, adsRes, reqRes] = await Promise.all([
          fetch("/api/projects").catch(() => null),
          fetch(`/api/client-services/seo?clientId=${myClientId}`).catch(() => null),
          fetch(`/api/client-services/ads?clientId=${myClientId}`).catch(() => null),
          fetch(`/api/client-services/requests?clientId=${myClientId}`).catch(() => null)
        ]);

        if (projRes) { const d = await projRes.json(); if(d.success) setProjects(d.data || []); }
        if (seoRes) { const d = await seoRes.json(); if(d.success) setSeoReports(d.data || []); }
        if (adsRes) { const d = await adsRes.json(); if(d.success) setAdsData(d.data || []); }
        if (reqRes) { const d = await reqRes.json(); if(d.success) setRequests(d.data || []); }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const totalAdBudget = adsData.reduce((acc, ad) => acc + parseFloat(ad.total_budget || 0), 0);
  const totalAdSpent = adsData.reduce((acc, ad) => acc + parseFloat(ad.spent_amount || 0), 0);
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;
  const latestSEO = seoReports.length > 0 ? seoReports[0] : null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
          C
        </div>
        <div>
          <h2 className="font-bold text-lg text-gray-800 leading-tight">Client Portal</h2>
          <p className="text-xs text-gray-500 font-medium">Demo Client</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Main</div>
        <button onClick={() => window.location.href = '/portal/client/dashboard'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all bg-indigo-50 text-indigo-700">
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
        <button onClick={() => window.location.href = '/portal/client/seo'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
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
        <button onClick={() => window.location.href = '/login'} className="w-full text-center p-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans flex flex-col md:flex-row w-full">
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-sm bg-white">
        <SidebarContent />
      </aside>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600"><FiX size={20} /></button>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full relative">
        {/* Mobile Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-30">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg"><FiMenu size={24} /></button>
            <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm">DC</div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-gray-100 px-8 py-5 justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard Overview</h1>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 font-medium">Welcome back, Demo Client</span>
             <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold shadow-sm cursor-pointer">DC</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-cyan-50 opacity-50"></div>
            
            <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-800">Ready to grow your business?</h2>
                <p className="text-gray-500 text-base max-w-xl">Here's what's happening with your projects, ad campaigns, and SEO performance today.</p>
              </div>
              <button onClick={() => window.location.href = '/portal/client/book-service'} className="shrink-0 flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm">
                <FiEdit3 size={18} /> Book a New Service
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div> Loading your data...
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl shrink-0"><FiLayout /></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-0.5">Active Projects</p>
                    <h3 className="text-2xl font-bold text-gray-900">{projects.length}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl shrink-0"><FiDollarSign /></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-0.5">Total Ad Spend</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-2xl font-bold text-gray-900">${totalAdSpent.toLocaleString()}</h3>
                      <span className="text-xs text-gray-400 font-medium">/ ${totalAdBudget.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-xl shrink-0"><FiClock /></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-0.5">Pending Requests</p>
                    <h3 className="text-2xl font-bold text-gray-900">{pendingRequestsCount}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center text-xl shrink-0"><FiTrendingUp /></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-0.5">Latest SEO Report</p>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">{latestSEO ? `${latestSEO.month} ${latestSEO.year}` : 'N/A'}</h3>
                  </div>
                </div>

              </div>

              {/* Two Column Layout for Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Recent Service Requests */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Recent Requests</h3>
                    </div>
                    <Link href="/portal/client/book-service" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
                      View All <FiArrowRight className="ml-1" />
                    </Link>
                  </div>
                  <div className="p-0 flex-1">
                    {requests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-gray-400">
                        <p className="text-sm">No recent requests.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {requests.slice(0, 4).map(req => (
                          <li key={req.id} className="p-5 hover:bg-gray-50/50 transition-colors flex items-start gap-4">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${req.status === 'Pending' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                <h4 className="font-semibold text-gray-800 text-sm truncate pr-4">{req.service_type}</h4>
                                <span className="text-xs text-gray-400 shrink-0">{new Date(req.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-2">{req.requirements}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Active Paid Ads */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Campaign Spend</h3>
                    </div>
                    <Link href="/portal/client/ads" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
                      View All <FiArrowRight className="ml-1" />
                    </Link>
                  </div>
                  <div className="p-5 md:p-6 flex-1">
                    {adsData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-gray-400">
                        <p className="text-sm">No active campaigns.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {adsData.slice(0, 3).map(ad => {
                          const spentPercent = ad.total_budget > 0 ? (ad.spent_amount / ad.total_budget) * 100 : 0;
                          return (
                            <div key={ad.id}>
                              <div className="flex justify-between items-baseline mb-2">
                                <h4 className="font-medium text-gray-800 text-sm">{ad.platform}</h4>
                                <span className="text-xs text-gray-500">${parseFloat(ad.spent_amount).toLocaleString()} / ${parseFloat(ad.total_budget).toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${spentPercent > 90 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                  style={{ width: `${Math.min(spentPercent, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
