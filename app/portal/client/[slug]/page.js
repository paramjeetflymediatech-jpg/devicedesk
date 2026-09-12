"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployees } from "../../../store.js";
import { findEmployeeBySlug, getEmployeeSlug } from "../../../utils/slugUtils.js";
import { FiLayout, FiMessageSquare, FiFileText, FiClock, FiMenu, FiX, FiImage, FiDollarSign, FiDownload, FiSend, FiBox, FiCreditCard } from "react-icons/fi";
import ProjectChat from "../../../components/ProjectChat.js";

export default function ClientSlugPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug ? String(params.slug) : "";

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data states
  const [projects, setProjects] = useState([]);
  const [seoReports, setSeoReports] = useState([]);
  const [smoRequests, setSmoRequests] = useState([]);
  const [adsData, setAdsData] = useState([]);

  // Forms
  const [smoForm, setSmoForm] = useState({ requirements: "" });

  useEffect(() => {
    const allEmployees = getEmployees();
    const foundClient = findEmployeeBySlug(allEmployees, slug);
    setClient(foundClient);

    if (foundClient) {
      fetchProjects(foundClient.id);
      fetchSEO(foundClient.id);
      fetchSMO(foundClient.id);
      fetchAds(foundClient.id);
    }
    setLoading(false);
  }, [slug]);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isMobileMenuOpen]);

  const fetchProjects = async (clientId) => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {}
  };

  const fetchSEO = async (clientId) => {
    try {
      const res = await fetch(`/api/client-services/seo?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) setSeoReports(data.data);
    } catch (err) {}
  };

  const fetchSMO = async (clientId) => {
    try {
      const res = await fetch(`/api/client-services/smo?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) setSmoRequests(data.data);
    } catch (err) {}
  };

  const fetchAds = async (clientId) => {
    try {
      const res = await fetch(`/api/client-services/ads?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) setAdsData(data.data);
    } catch (err) {}
  };

  const handleSMOSubmit = async (e) => {
    e.preventDefault();
    if (!smoForm.requirements.trim()) return;
    try {
      const res = await fetch('/api/client-services/smo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, requirements: smoForm.requirements })
      });
      const data = await res.json();
      if (data.success) {
        setSmoForm({ requirements: "" });
        fetchSMO(client.id);
        alert('Requirement submitted successfully!');
      } else {
        alert(data.error);
      }
    } catch (err) {}
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Client Portal...</div>;
  
  if (!client) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2>Client Not Found</h2>
        <Link href="/" className="btn-primary mt-4 inline-block">Return Home</Link>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-bold text-lg text-gray-800 leading-tight">Client Portal</h2>
          <p className="text-xs text-gray-500">@{getEmployeeSlug(client)}</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Dashboard</div>
        <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <FiLayout size={18} /><span>Project Overview</span>
        </button>
        <button onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'chat' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <FiMessageSquare size={18} /><span>Project Chat</span>
        </button>

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Services & Reporting</div>
        <button onClick={() => { setActiveTab('seo'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'seo' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <FiFileText size={18} /><span>SEO Reports</span>
        </button>
        <button onClick={() => { setActiveTab('smo'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'smo' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <FiImage size={18} /><span>SMO Graphics</span>
        </button>
        <button onClick={() => { setActiveTab('ads'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'ads' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <FiDollarSign size={18} /><span>PAID Ads</span>
        </button>

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Billing & Packages</div>
        <button onClick={() => { setActiveTab('packages'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'packages' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <FiBox size={18} /><span>Packages</span>
        </button>
        <button onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <FiCreditCard size={18} /><span>Billing</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <Link href="/" className="block w-full text-center p-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </Link>
      </div>
    </div>
  );

  const tabTitles = {
    overview: 'Project Overview',
    chat: 'Project Communication',
    seo: 'SEO Status & Reporting',
    smo: 'SMO Graphics Requirements',
    ads: 'PAID Ads Dashboard',
    packages: 'Subscription Packages',
    billing: 'Billing & Invoices'
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-sm bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600"><FiX size={20} /></button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full relative">
        {/* Headers */}
        <header className="bg-white border-b px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg"><FiMenu size={24} /></button>
            <h1 className="text-xl font-bold text-gray-800">{tabTitles[activeTab]}</h1>
          </div>
        </header>

        <header className="hidden md:flex bg-white/80 border-b px-8 py-6 justify-between items-center sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{tabTitles[activeTab]}</h1>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 font-medium">Welcome back, {client.name}</span>
             <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm shadow-indigo-100">{client.name.charAt(0)}</div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
          
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl"><FiFileText /></div>
                  <div><p className="text-sm text-gray-500 font-medium mb-1">Active Projects</p><p className="text-3xl font-bold text-gray-900">{projects.length}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50"><h3 className="text-lg font-bold text-gray-800">Your Projects</h3></div>
                {projects.length === 0 ? (
                  <div className="p-6 text-gray-500">No active projects under this account.</div>
                ) : (
                  <div className="grid gap-4 p-6">
                    {projects.map(proj => (
                      <div key={proj.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <h4 className="font-bold text-lg text-indigo-700">{proj.name}</h4>
                        <p className="text-sm text-gray-500 mb-2">{proj.description}</p>
                        <span className="inline-flex px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-semibold">{proj.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAT */}
          {activeTab === 'chat' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-0 md:p-2 min-h-[500px] h-[calc(100vh-200px)] animate-in fade-in duration-500 flex flex-col w-full">
              <ProjectChat projectId={projects[0]?.id || "proj_general"} user={{ ...client, role: "client" }} />
            </div>
          )}

          {/* SEO */}
          {activeTab === 'seo' && (
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
          )}

          {/* SMO */}
          {activeTab === 'smo' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Request New Graphic</h3>
                <p className="text-sm text-gray-500 mb-4">Describe the social media graphic you need, including text, preferred colors, and platform.</p>
                <form onSubmit={handleSMOSubmit}>
                  <textarea 
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none mb-4 min-h-[120px]"
                    placeholder="E.g. We need a promotional banner for our upcoming Summer Sale for Facebook. Text: '50% Off Summer Sale'. Colors: Bright orange and yellow."
                    value={smoForm.requirements}
                    onChange={(e) => setSmoForm({ requirements: e.target.value })}
                  />
                  <div className="flex justify-end">
                    <button type="submit" className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
                      <FiSend className="mr-2" /> Send Request
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50"><h3 className="text-lg font-bold text-gray-800">Your Previous Requests</h3></div>
                <div className="p-0">
                  {smoRequests.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 py-10">You haven't made any graphic requests yet.</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">Requirement</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {smoRequests.map(req => (
                          <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm text-gray-800 line-clamp-2">{req.requirements}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PAID ADS */}
          {activeTab === 'ads' && (
            <div className="animate-in fade-in duration-500">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-800">Paid Advertising Spend</h3>
                  <p className="text-sm text-gray-500 mt-1">Track your campaign budgets, amount spent, and remaining balance across all platforms.</p>
                </div>
                <div className="p-6">
                  {adsData.length === 0 ? <div className="text-center py-10 text-gray-400">No active ad campaigns tracked at the moment.</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {adsData.map(ad => {
                        const spentPercent = ad.total_budget > 0 ? (ad.spent_amount / ad.total_budget) * 100 : 0;
                        return (
                          <div key={ad.id} className="border border-gray-200 rounded-xl p-6 bg-white hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center mb-6">
                              <h4 className="font-bold text-gray-900 text-lg">{ad.platform}</h4>
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FiDollarSign /></div>
                            </div>
                            
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500 font-medium">Budget Utilized</span>
                                <span className="font-bold text-gray-800">{Math.min(spentPercent, 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full ${spentPercent > 90 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(spentPercent, 100)}%` }}></div>
                              </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-100">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Total Budget</span>
                                <span className="text-sm font-bold text-gray-900">${parseFloat(ad.total_budget).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Amount Spent</span>
                                <span className="text-sm font-bold text-red-600">${parseFloat(ad.spent_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                              </div>
                              <div className="flex justify-between bg-gray-50 p-2 rounded-lg -mx-2">
                                <span className="text-sm font-medium text-gray-700">Remaining Balance</span>
                                <span className="text-sm font-bold text-emerald-600">${parseFloat(ad.pending_balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PACKAGES */}
          {activeTab === 'packages' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500 mt-6">
              <div className="p-6 text-center py-20 text-gray-500">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4"><FiBox size={28} /></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Packages Coming Soon</h2>
                <p>We are currently working on this feature. Stay tuned!</p>
              </div>
            </div>
          )}

          {/* BILLING */}
          {activeTab === 'billing' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500 mt-6">
              <div className="p-6 text-center py-20 text-gray-500">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4"><FiCreditCard size={28} /></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Billing Coming Soon</h2>
                <p>We are currently working on this feature. Stay tuned!</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
