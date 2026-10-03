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

      const params = new URLSearchParams(window.location.search);
      const pkgName = params.get('pkg');
      if (pkgName) {
        setForm(prev => ({ 
          ...prev, 
          service_type: pkgName,
          requirements: `Booking for package: ${pkgName}\n\nMy Requirements:\n` 
        }));
      }
    }
    setMyClientId(clientId);
  }, []);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ service_type: 'SEO', requirements: '', file: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = requests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(requests.length / itemsPerPage);

  const [activePackages, setActivePackages] = useState([]);

  const fetchActivePackages = async (clientId) => {
    try {
      const res = await fetch(`/api/client-services/my-packages?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        const pkgs = data.data.filter(p => !p.is_expired);
        setActivePackages(pkgs);
        
        const urlPkg = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('pkg') : null;
        if (!urlPkg && pkgs.length > 0) {
          setForm(prev => ({ ...prev, service_type: pkgs[0].name }));
        }
      }
    } catch (err) {}
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/client-services/requests?clientId=${myClientId}`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (err) {}
  };

  const handleViewDelivery = async (req) => {
    let deliverableFiles = req.deliverable_files;
    let deliverableNote = req.deliverable_note;
    let deliveredAt = req.delivered_at;
    let specialistName = req.specialist_name;

    if (!deliverableFiles) {
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const matchingTask = data.data.find(t => String(t.project_id) === String(req.id) || (t.title && t.title.includes(req.service_type)));
          if (matchingTask) {
            deliverableFiles = matchingTask.fileUrl;
            deliverableNote = matchingTask.completion_note || deliverableNote;
            deliveredAt = matchingTask.completedAt || deliveredAt;
            specialistName = matchingTask.assignedToName || specialistName;
          }
        }
      } catch (e) {}
    }

    let proofsHtml = '';
    if (deliverableFiles) {
      let parsedUrls = [];
      try {
        if (typeof deliverableFiles === 'string') {
          if (deliverableFiles.startsWith('[') || deliverableFiles.startsWith('{')) {
            const parsed = JSON.parse(deliverableFiles);
            parsedUrls = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            parsedUrls = deliverableFiles.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(deliverableFiles)) {
          parsedUrls = deliverableFiles;
        }
      } catch (err) {
        parsedUrls = [deliverableFiles];
      }

      if (parsedUrls.length > 0) {
        proofsHtml = `
          <div style="margin-top: 10px;">
            <p style="margin-bottom: 6px; font-weight: 600; color: #15803d;">📎 Delivered Files & Deliverables:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${parsedUrls.map((u, i) => {
                const fname = typeof u === 'string' ? u.split('/').pop().split('?')[0] : `File ${i + 1}`;
                return `<a href="${u}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; background: #ecfdf5; border: 1px solid #86efac; color: #166534; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none;">📦 ${decodeURIComponent(fname)} ↗</a>`;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    let attachmentHtml = '';
    if (req.attachment) {
      let attUrls = [];
      try {
        if (typeof req.attachment === 'string') {
          if (req.attachment.startsWith('[') || req.attachment.startsWith('{')) {
            const parsed = JSON.parse(req.attachment);
            attUrls = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            attUrls = req.attachment.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(req.attachment)) {
          attUrls = req.attachment;
        }
      } catch (e) {
        attUrls = [req.attachment];
      }

      if (attUrls.length > 0) {
        attachmentHtml = `
          <div style="margin-top: 8px;">
            <p style="margin-bottom: 4px; font-weight: 600; color: #475569; font-size: 12px;">Your Attached Files:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${attUrls.map((u, i) => {
                const fname = typeof u === 'string' ? u.split('/').pop().split('?')[0] : `Attachment ${i + 1}`;
                return `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-size: 12px; text-decoration: underline;">📄 ${decodeURIComponent(fname)}</a>`;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    const deliverySection = `
      <div style="margin-top: 14px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #166534; margin: 0;">🎉 Work Delivered & Completed</h4>
          ${deliveredAt ? `<span style="font-size: 11px; color: #15803d; font-weight: 600;">${new Date(deliveredAt).toLocaleDateString()}</span>` : ''}
        </div>
        ${deliverableNote ? `
          <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; margin-bottom: 6px; font-size: 13px; color: #1f2937; border: 1px solid #dcfce7;">
            <strong>Team Note:</strong> ${deliverableNote}
          </div>
        ` : ''}
        ${proofsHtml}
      </div>
    `;

    Swal.fire({
      title: `Service: ${req.service_type}`,
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <div><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">${req.status}</span></div>
            ${req.tl_name ? `<div style="color: #4f46e5; font-weight: 600;">🛡️ TL: ${req.tl_name}</div>` : ''}
          </div>
          <p style="margin-bottom: 4px;"><strong>Your Original Requirement:</strong></p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; max-height: 150px; overflow-y: auto; white-space: pre-wrap; font-size: 13px;">${req.requirements}</div>
          ${attachmentHtml}
          ${deliverySection}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#db2777'
    });
  };

  useEffect(() => { 
    if (myClientId) {
      fetchRequests();
      fetchActivePackages(myClientId);
    }
  }, [myClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requirements.trim()) return;
    setIsSubmitting(true);
    try {
      let attachmentUrl = null;
      if (form.file) {
        const formData = new FormData();
        formData.append('file', form.file);
        formData.append('folder', 'client-requests');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        
        if (!uploadData.success) {
          setIsSubmitting(false);
          Swal.fire('Error', uploadData.error || 'Failed to upload attachment.', 'error');
          return;
        }
        
        if (uploadData.success && uploadData.fileUrls?.length > 0) {
          attachmentUrl = uploadData.fileUrls[0];
        }
      }

      const res = await fetch('/api/client-services/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId: myClientId, 
          service_type: form.service_type, 
          requirements: form.requirements,
          attachment: attachmentUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, requirements: "", file: null });
        fetchRequests();
        Swal.fire('Success', 'Requirement submitted successfully!', 'success');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to submit request', 'error');
    } finally {
      setIsSubmitting(false);
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600"><FiX size={20} /></button>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative overflow-x-hidden">
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
            {activePackages.length === 0 ? (
              <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-2xl shadow-sm mb-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-white shadow-sm text-rose-500 rounded-full flex items-center justify-center mb-5">
                  <FiCreditCard size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Please Buy Package First</h3>
                <p className="text-gray-600 mb-6 max-w-md">You need an active package subscription to book services. Please buy a package first as per your requirement.</p>
                <a href="/portal/client/packages" className="bg-pink-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-pink-700 transition-colors inline-block">
                  View Packages
                </a>
              </div>
            ) : (
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
                    {activePackages.length > 0 ? (
                      activePackages.map((pkg, idx) => (
                        <option key={idx} value={pkg.name}>{pkg.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="SEO">SEO (Search Engine Optimization)</option>
                        <option value="SMO">SMO (Social Media Graphics)</option>
                        <option value="PAID Ads">PAID Ads (Google/Meta)</option>
                        <option value="Website Development">Website Development</option>
                        <option value="Other">Other Requirement</option>
                      </>
                    )}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (Optional)</label>
                  <input
                    type="file"
                    className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-gray-50 text-sm"
                    onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                  />
                  {form.file && <p className="text-xs text-pink-600 mt-1">Selected: {form.file.name}</p>}
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={isSubmitting} className="flex items-center px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white font-semibold rounded-lg shadow-sm transition-colors">
                    <FiSend className="mr-2" /> {isSubmitting ? 'Submitting...' : 'Book Requirement'}
                  </button>
                </div>
              </form>
            </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50"><h3 className="text-lg font-bold text-gray-800">Your Recent Requests</h3></div>
              <div className="p-0">
                {requests.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 py-10">You haven't made any service requests yet.</div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto w-full">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Requirement</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned TL</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {currentRequests.map(req => (
                            <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{req.service_type}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 line-clamp-2">{req.requirements}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {req.tl_name ? (
                                  <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                    <FiUser size={13} /> {req.tl_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">Pending</span>
                                )}
                              </td>
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
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {currentRequests.map(req => (
                        <div key={req.id} className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{req.service_type}</p>
                              <p className="text-xs text-gray-500 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {req.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 line-clamp-3">
                            {req.requirements}
                          </div>

                          <div className="flex justify-between items-center mt-1">
                            <div className="text-xs">
                              <span className="text-gray-500 block mb-1">Assigned TL:</span>
                              {req.tl_name ? (
                                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                  <FiUser size={12} /> {req.tl_name}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Pending</span>
                              )}
                            </div>
                            
                            <div>
                              {req.status === 'Completed' && (
                                <button onClick={() => handleViewDelivery(req)} className="text-pink-600 hover:text-pink-800 font-semibold text-xs px-3 py-1.5 bg-pink-50 rounded-lg">View Delivery</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                        <button 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
                        <button 
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
