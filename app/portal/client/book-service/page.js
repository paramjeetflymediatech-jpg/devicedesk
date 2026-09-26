'use client';
import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';
import { FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, FiGrid, FiFileText, FiImage, FiDollarSign, FiSend, FiEdit3, FiDownload , FiUser} from 'react-icons/fi';

export default function BookServicePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [myClientId, setMyClientId] = useState('');
  
  useEffect(() => {
    let clientId = 'emp_1789113315702'; // Fallback
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
      if (user && user.id) clientId = user.id;
    }
    setMyClientId(clientId);
  }, []);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ service_type: 'SEO', requirements: '' });

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/client-services/requests?clientId=${myClientId}`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (err) {}
  };

  const handleViewDelivery = async (req) => {
    let extraHtml = '';
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if(data.success) {
        const matchingTask = data.data.find(t => t.project_id === req.id && t.status === 'Completed');
        if(matchingTask) {
          let proofsHtml = '<p style="margin-bottom: 5px; color: #64748b;"><em>No proof files uploaded by the team.</em></p>';
          if(matchingTask.fileUrl) {
            try {
              const parsedUrls = JSON.parse(matchingTask.fileUrl);
              if(Array.isArray(parsedUrls) && parsedUrls.length > 0) {
                proofsHtml = '<p style="margin-bottom: 5px;"><strong>Delivered Files:</strong><br/>' + parsedUrls.map((u, i) => `<a href="${u}" target="_blank" style="color: #db2777; text-decoration: underline; margin-right: 10px;">View File ${i+1}</a>`).join('') + '</p>';
              } else if(typeof parsedUrls === 'string') {
                proofsHtml = `<p style="margin-bottom: 5px;"><strong>Delivered File:</strong> <a href="${parsedUrls}" target="_blank" style="color: #db2777; text-decoration: underline;">View File</a></p>`;
              }
            } catch(err) {
              proofsHtml = `<p style="margin-bottom: 5px;"><strong>Delivered File:</strong> <a href="${matchingTask.fileUrl}" target="_blank" style="color: #db2777; text-decoration: underline;">View File</a></p>`;
            }
          }

          extraHtml = `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f3f4f6;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 8px; color: #1f2937;">Delivery Details</h4>
              ${proofsHtml}
            </div>
          `;
        }
      }
    } catch(e) {}

    Swal.fire({
      title: `Service: ${req.service_type}`,
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p style="margin-bottom: 8px;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">${req.status}</span></p>
          <p style="margin-bottom: 8px;"><strong>Your Original Requirement:</strong></p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; margin-top: 5px;">${req.requirements}</div>
          ${extraHtml}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#db2777'
    });
  };

  useEffect(() => { if (myClientId) fetchRequests(); }, [myClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requirements.trim()) return;
    try {
      const res = await fetch('/api/client-services/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: myClientId, ...form })
      });
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, requirements: "" });
        fetchRequests();
        Swal.fire('Success', 'Requirement submitted successfully!', 'success');
      }
    } catch (err) {}
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
        <button onClick={() => window.location.href = '/portal/client/notes'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiMessageSquare size={20} /><span>Project Notes</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/book-service'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all bg-pink-50 text-pink-700">
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
            <h1 className="text-xl font-bold text-gray-800">Book a Service</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">DC</div>
        </header>

        <header className="hidden md:flex bg-white/80 border-b px-8 py-6 justify-between items-center sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Book a Service</h1>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 font-medium">Welcome back, Demo Client</span>
             <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold shadow-sm shadow-pink-100">DC</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Tell Us Your Requirements</h3>
              <p className="text-sm text-gray-500 mb-6">Select a service from the dropdown and describe exactly what you need. Our team will get back to you shortly.</p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Service</label>
                  <select 
                    className="w-full md:w-1/3 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-gray-50"
                    value={form.service_type}
                    onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                  >
                    <option value="SEO">SEO (Search Engine Optimization)</option>
                    <option value="SMO">SMO (Social Media Graphics)</option>
                    <option value="PAID Ads">PAID Ads (Google/Meta)</option>
                    <option value="Website Development">Website Development</option>
                    <option value="Other">Other Requirement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Requirements</label>
                  <textarea 
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all resize-none min-h-[120px]"
                    placeholder="E.g. We want to start a new Google Ads campaign for our summer collection. Budget is $500/month."
                    value={form.requirements}
                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className="flex items-center px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
                    <FiSend className="mr-2" /> Book Requirement
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50"><h3 className="text-lg font-bold text-gray-800">Your Recent Requests</h3></div>
              <div className="p-0">
                {requests.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 py-10">You haven't made any service requests yet.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Requirement</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{req.service_type}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 line-clamp-2">{req.requirements}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {req.status === 'Completed' ? (
                              <button onClick={() => handleViewDelivery(req)} className="text-pink-600 hover:text-pink-800 text-sm font-medium transition-colors bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg">View Delivery</button>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
