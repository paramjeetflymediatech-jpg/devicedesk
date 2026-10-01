'use client';
import { useState, useEffect } from 'react';
import { FiLayout, FiMessageSquare, FiFileText, FiClock, FiMenu, FiX, FiBox, FiCreditCard, FiGrid, FiImage, FiDollarSign, FiDownload, FiSend, FiEdit3, FiUser, FiActivity } from 'react-icons/fi';

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePackages, setActivePackages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = requests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  
  const getClientId = () => {
    let clientId = 'emp_1789113315702'; // Fallback
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
      if (user && user.id) clientId = user.id;
    }
    return clientId;
  };

  useEffect(() => {
    fetchActivePackages();
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const clientId = getClientId();
      const res = await fetch(`/api/client-services/requests?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivePackages = async () => {
    try {
      const clientId = getClientId();
      const res = await fetch(`/api/client-services/my-packages?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setActivePackages(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center space-y-3">
        <img src="/flymedia-logo.png" alt="Fly Media Technology" className="h-16 object-contain" />
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Main</div>
        <button onClick={() => window.location.href = '/portal/client/dashboard'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiGrid size={20} /><span>Dashboard</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all bg-pink-50 text-pink-700">
          <FiLayout size={20} /><span>Project Overview</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/notes'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiMessageSquare size={20} /><span>Project Notes</span>
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
      
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Account</div>
        <button onClick={() => window.location.href = '/portal/client/profile'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiUser size={20} /><span>Profile Settings</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <button onClick={() => { localStorage.removeItem('devicedesk_auth_user'); sessionStorage.clear(); document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax"; document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax"; window.location.href = '/login'; }} className="w-full text-center p-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600">
             <FiX size={20} />
           </button>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative overflow-x-hidden">
        <header className="bg-white border-b px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <FiMenu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Overview</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">DC</div>
        </header>

        <header className="hidden md:flex bg-white/80 border-b px-8 py-6 justify-between items-center sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Project Overview</h1>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 font-medium">Welcome back, Demo Client</span>
             <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold shadow-sm shadow-pink-100">DC</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8">
              
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-1">Welcome back</h2>
                <p className="text-gray-500 text-sm">Overview of your active subscriptions and recent project submissions.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-lg border border-gray-200 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                    <FiActivity />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '-' : activePackages.length}</p>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-lg border border-gray-200 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                    <FiClock />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Approvals</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '-' : requests.filter(r => r.status === 'Pending').length}</p>
                  </div>
                </div>
              </div>

              {activePackages.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-2">Current Package Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activePackages.map(pkg => (
                      <div key={pkg.override_id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-base font-semibold text-gray-800">{pkg.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{pkg.billing_cycle}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${pkg.is_expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {pkg.is_expired ? 'Expired' : 'Active'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <div className="text-gray-500 text-xs">
                            Valid until: <span className="font-medium text-gray-800">{pkg.valid_until_formatted}</span>
                          </div>
                          <button onClick={() => window.location.href = `/portal/client/book-service?pkg=${encodeURIComponent(pkg.name)}`} className="text-pink-600 hover:text-pink-700 text-sm font-medium transition-colors">
                            Book Service
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
                   <div>
                     <h3 className="text-lg font-semibold text-gray-800">Recent Submissions</h3>
                   </div>
                   <button onClick={() => window.location.href = '/portal/client/book-service'} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                     <FiEdit3 className="mr-2" /> New Request
                   </button>
                </div>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-left">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Project Phase</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {requests.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-6 py-10 text-center text-gray-500 text-sm">
                            No recent submissions found.
                          </td>
                        </tr>
                      ) : (
                        currentRequests.map(req => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="text-sm font-medium text-gray-800">{req.service_type || 'Service Request'}</p>
                               <p className="text-xs text-gray-500 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${req.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                 {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => window.location.href = '/portal/client/book-service'} className="text-pink-600 hover:text-pink-700 text-sm font-medium transition-colors">
                                 View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-100">
                  {requests.length === 0 ? (
                    <div className="px-6 py-10 text-center text-gray-500 text-sm">
                      No recent submissions found.
                    </div>
                  ) : (
                    currentRequests.map(req => (
                      <div key={req.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{req.service_type || 'Service Request'}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${req.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                             {req.status}
                          </span>
                        </div>
                        <div className="flex justify-end mt-2">
                          <button onClick={() => window.location.href = '/portal/client/book-service'} className="text-pink-600 hover:text-pink-700 text-sm font-medium transition-colors">
                             View Details
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
