'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { FiCheck, FiUser, FiCalendar, FiClock, FiActivity } from 'react-icons/fi';
import { FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, FiGrid, FiFileText, FiImage, FiDollarSign, FiDownload, FiSend, FiEdit3 } from 'react-icons/fi';

export default function PackagesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [packages, setPackages] = useState([]);
  const [activePackages, setActivePackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchPackages();
  }, []);

  const getClientId = () => {
    let clientId = 'EMP-UNKNOWN';
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
      if (user && user.id) clientId = user.id;
    }
    return clientId;
  };

  const fetchPackages = async () => {
    try {
      const clientId = getClientId();
      
      // Fetch available packages
      const res = await fetch(`/api/packages?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages || []);
      }

      // Fetch active subscriptions
      const myRes = await fetch(`/api/client-services/my-packages?clientId=${clientId}`);
      const myData = await myRes.json();
      if (myData.success) {
        setActivePackages(myData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async (pkg) => {
    try {
      setLoading(true);
      const clientId = getClientId();
      
      const res = await fetch('/api/payment/phonepe/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: pkg.price,
          clientSlug: 'client',
          clientId: clientId,
          description: `PACKAGE_PURCHASE:${pkg.id}`
        })
      });
      const data = await res.json();
      setLoading(false);
      
      if (data.success && data.redirectUrl) {
        Swal.fire('Processing', 'Redirecting to payment gateway...', 'info');
        window.location.href = data.redirectUrl;
      } else {
        Swal.fire('Error', data.error || 'Failed to initiate payment', 'error');
      }
    } catch (err) {
      setLoading(false);
      Swal.fire('Error', 'Network error occurred', 'error');
    }
  };

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
        <button onClick={() => window.location.href = '/portal/client/packages'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all bg-pink-50 text-pink-700">
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
            <h1 className="text-xl font-bold text-gray-800">Subscription Packages</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">DC</div>
        </header>

        <header className="hidden md:flex bg-white/80 border-b px-8 py-6 justify-between items-center sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Subscription Packages</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 font-medium">Welcome back, Demo Client</span>
            <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold shadow-sm shadow-pink-100">DC</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
          ) : (
            <>
              {/* Active Subscriptions Section */}
              {activePackages.length > 0 && (
                <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <FiActivity className="mr-3 text-pink-600" /> Your Active Subscriptions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activePackages.map((pkg) => (
                      <div key={pkg.override_id} className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-pink-500"></div>
                        <div className="p-6 border-b border-gray-50">
                          <h3 className="text-lg font-bold text-gray-800 mb-1">{pkg.name}</h3>
                          <p className="text-sm text-gray-500">{pkg.billing_cycle} Plan</p>
                        </div>
                        <div className="p-6 bg-gray-50/50">
                          <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
                            <FiCalendar className="mr-2 text-pink-500" size={16} />
                            Started: {pkg.start_date_formatted}
                          </div>
                          <div className={`flex items-center text-sm font-bold ${pkg.is_expired ? 'text-red-600' : 'text-green-600'}`}>
                            <FiClock className="mr-2" size={16} />
                            {pkg.is_expired ? 'Expired On: ' : 'Valid Until: '} {pkg.valid_until_formatted}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Packages Section */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <FiBox className="mr-3 text-gray-400" /> Available Packages
                </h2>
                {packages.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                    <div className="p-6 text-center py-20 text-gray-500">
                      <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"><FiBox size={28} /></div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Packages Coming Soon</h2>
                      <p>We are currently working on this feature. Stay tuned!</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                        <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-pink-50 to-white">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                          <p className="text-gray-500 text-sm h-10">{pkg.description}</p>
                          <div className="mt-6 flex items-baseline">
                            <span className="text-4xl font-extrabold text-gray-900">${pkg.price}</span>
                            <span className="text-gray-500 ml-2 font-medium">/ {pkg.billing_cycle}</span>
                          </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col bg-white">
                          {Array.isArray(pkg.features) ? (
                            pkg.features.length === 1 && typeof pkg.features[0] === 'string' && pkg.features[0].includes('<') ? (
                              <div className="space-y-4 mb-8 flex-1 ck-content" dangerouslySetInnerHTML={{ __html: pkg.features[0] }} />
                            ) : (
                              <ul className="space-y-4 mb-8 flex-1">
                                {pkg.features.map((feature, i) => (
                                  <li key={i} className="flex items-start">
                                    <FiCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" size={18} />
                                    <span className="text-gray-600 font-medium">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            )
                          ) : (
                            <div className="text-gray-500 text-sm italic mb-8 flex-1">No specific features listed</div>
                          )}
                          <button
                            onClick={() => handleBuyNow(pkg)}
                            className="w-full py-4 px-6 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-pink-200"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
