'use client';
import { useState, useEffect } from 'react';
import { FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, FiGrid, FiFileText, FiImage, FiDollarSign, FiEdit3, FiUser, FiSend, FiPlus, FiPaperclip, FiExternalLink, FiDownload, FiEye, FiAlertCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { uploadFilesWithProgress } from '@/app/utils/uploadHelper';

export default function ClientNotesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [myClientId, setMyClientId] = useState('');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [activePackages, setActivePackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('General');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotes = notes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(notes.length / itemsPerPage);

  const isImageUrl = (url) => typeof url === 'string' && /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url);
  const isVideoUrl = (url) => typeof url === 'string' && /\.(mp4|webm|mov|ogg)($|\?)/i.test(url);
  const isAudioUrl = (url) => typeof url === 'string' && /\.(mp3|wav|ogg|m4a)($|\?)/i.test(url);

  useEffect(() => {
    let clientId = 'emp_1789113315702'; // Fallback
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
      if (user && user.id) clientId = user.id;
    }
    setMyClientId(clientId);
  }, []);

  useEffect(() => {
    if (myClientId) {
      fetchNotes();
      fetchActivePackages(myClientId);
      // Increased polling interval to 15 seconds to reduce constant terminal logs
      const interval = setInterval(fetchNotes, 15000);
      return () => clearInterval(interval);
    }
  }, [myClientId]);

  const fetchActivePackages = async (clientId) => {
    try {
      const res = await fetch(`/api/client-services/my-packages?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        const pkgs = data.data.filter(p => !p.is_expired);
        setActivePackages(pkgs);
      }
    } catch (err) {}
  };

  const fetchNotes = async () => {
    if(notes.length === 0) setLoading(true);
    try {
      const res = await fetch(`/api/client-notes?client_id=${myClientId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setNotes(d.notes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() && attachments.length === 0) return;
    
    setSubmitting(true);
    try {
      let attachmentUrls = [];
      if (attachments.length > 0) {
        setIsUploading(true);
        try {
          const urls = await uploadFilesWithProgress(attachments, (stats) => {
            setUploadStats(stats);
          });
          if (urls && urls.length > 0) {
            attachmentUrls = urls;
          }
        } catch (error) {
          setIsUploading(false);
          setUploadStats(null);
          throw new Error('Failed to upload file: ' + error.message);
        }
        setIsUploading(false);
        setUploadStats(null);
      }

      const attachmentStr = attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null;
      const finalNote = selectedPackage === 'General' ? newNote : `[${selectedPackage}] ${newNote}`;
      const res = await fetch('/api/client-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: myClientId, note: finalNote, attachment: attachmentStr })
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        setAttachments([]);
        fetchNotes();
        Swal.fire('Success', 'Note added successfully', 'success');
      } else {
        Swal.fire('Error', data.error || 'Failed to add note', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Network or upload error', 'error');
    } finally {
      setSubmitting(false);
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
        <button onClick={() => window.location.href = '/portal/client/notes'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all bg-pink-50 text-pink-700">
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
        <button onClick={() => { localStorage.removeItem('devicedesk_auth_user'); sessionStorage.clear(); document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax"; document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax"; window.location.href = '/login'; }} className="w-full text-center p-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative overflow-x-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-30">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg"><FiMenu size={24} /></button>
            <h1 className="text-xl font-bold text-gray-800">Project Notes</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm shadow-sm">DC</div>
        </header>

        <header className="hidden md:flex bg-white border-b border-gray-100 px-8 py-5 justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Project Notes</h1>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 font-medium">Welcome back, Demo Client</span>
             <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center font-bold shadow-sm cursor-pointer">DC</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
            <div className="p-6 md:p-8 flex flex-col gap-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiMessageSquare className="text-pink-600" />
                Add a Note
              </h3>
              <form onSubmit={handleAddNote} className="flex flex-col gap-4">
                {activePackages.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Related Project / Service</label>
                    <select 
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className="w-full md:w-1/2 border-gray-300 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 border bg-gray-50 outline-none transition-all"
                    >
                      <option value="General">General (Not project specific)</option>
                      {activePackages.map(pkg => (
                        <option key={pkg.override_id} value={pkg.name}>{pkg.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <textarea 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Do you need anything else? Write a note here..."
                  className="w-full border-gray-300 rounded-xl shadow-sm p-4 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 border transition-shadow min-h-[120px]"
                ></textarea>
                <div className="flex flex-col gap-3 mt-3">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, idx) => (
                        <span key={idx} className="text-xs text-pink-600 font-medium bg-pink-50 px-2 py-1 rounded-md flex items-center gap-1 border border-pink-100 max-w-full">
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <FiX className="cursor-pointer text-pink-800 shrink-0 ml-1" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} />
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <label className="cursor-pointer text-gray-500 hover:text-pink-600 transition-colors flex items-center gap-1 text-sm font-medium bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl shadow-sm shrink-0">
                      <FiPaperclip size={16} /> Attach Files
                      <input type="file" multiple className="hidden" onChange={(e) => setAttachments([...attachments, ...Array.from(e.target.files)])} />
                    </label>
                    <button 
                      type="submit" 
                      disabled={submitting || isUploading} 
                      className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-pink-600 rounded-xl hover:bg-pink-700 disabled:opacity-70 shadow-md shadow-pink-200 transition-all active:scale-95 w-full sm:w-auto min-w-[140px]"
                    >
                      {isUploading ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Uploading...</>
                      ) : submitting ? (
                        'Saving...'
                      ) : (
                        <>Add Note <FiPlus size={18} /></>
                      )}
                    </button>
                  </div>

                  {/* Upload Progress UI */}
                  {isUploading && uploadStats && (
                    <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-700 truncate max-w-[60%]">Uploading: {uploadStats.fileName}</span>
                        <span className="text-sm font-bold text-pink-600">{uploadStats.percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                        <div className="bg-pink-500 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadStats.percent}%` }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>{uploadStats.uploadedMB} MB / {uploadStats.totalMB} MB</span>
                        {uploadStats.speedMBps && <span>{uploadStats.speedMBps} MB/s</span>}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-800 pt-4">Your Past Notes</h3>
          
          {loading ? (
            <div className="flex justify-center items-center py-10 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mr-3"></div> Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-gray-100 shadow-sm">
              <FiFileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No notes found. Create your first note above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentNotes.map(note => (
                <div key={note.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${note.status === 'Unread' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {note.status}
                    </span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap mb-2">{note.note}</p>
                  
                  {note.attachment && (() => {
                    let urls = [];
                    try {
                      urls = JSON.parse(note.attachment);
                      if (!Array.isArray(urls)) urls = [note.attachment];
                    } catch(e) {
                      urls = [note.attachment];
                    }
                    urls = urls.filter(Boolean);
                    if (urls.length === 0) return null;
                    return (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {urls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPreviewError(false);
                              setPreviewAttachmentUrl(url);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 bg-pink-50 border border-pink-100 hover:bg-pink-100 hover:shadow-sm px-3 py-1.5 rounded-lg transition-all"
                          >
                            <FiPaperclip size={14} /> View Attachment {urls.length > 1 ? idx+1 : ''}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {note.tl_reply && (
                    <div className="mt-2 p-3 bg-pink-50 border-l-4 border-pink-500 rounded-r-lg">
                      <p className="text-xs font-bold text-pink-700 mb-1">Team Leader Reply:</p>
                      <p className="text-sm text-pink-900 whitespace-pre-wrap">{note.tl_reply}</p>
                      {note.tl_attachment && (() => {
                        let urls = [];
                        try {
                          urls = JSON.parse(note.tl_attachment);
                          if (!Array.isArray(urls)) urls = [note.tl_attachment];
                        } catch(e) {
                          urls = [note.tl_attachment];
                        }
                        urls = urls.filter(Boolean);
                        if (urls.length === 0) return null;
                        return (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {urls.map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setPreviewError(false);
                                  setPreviewAttachmentUrl(url);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-100/60 border border-pink-200 hover:bg-pink-200 hover:shadow-sm px-3 py-1.5 rounded-lg transition-all"
                              >
                                <FiPaperclip size={14} /> View TL Attachment {urls.length > 1 ? idx+1 : ''}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
              
              {totalPages > 1 && (
                <div className="flex justify-between items-center py-4">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Attachment Preview Modal / Lightbox */}
          {previewAttachmentUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
                  <span className="text-sm font-semibold text-slate-200 truncate max-w-[60%]">
                    Attachment Preview
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewAttachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition-colors"
                    >
                      <FiExternalLink size={13} /> Open in New Tab
                    </a>
                    <a
                      href={previewAttachmentUrl}
                      download
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-xs font-semibold text-white transition-colors"
                    >
                      <FiDownload size={13} /> Download
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewAttachmentUrl(null);
                        setPreviewError(false);
                      }}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors ml-1"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
                  {previewError ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-300">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
                        <FiAlertCircle size={32} />
                      </div>
                      <p className="font-bold text-lg text-white mb-1">No Attachment Found</p>
                      <p className="text-xs text-slate-400 mb-4 max-w-sm">The attachment file could not be found or failed to load from the server.</p>
                      <p className="text-[11px] text-slate-500 font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg max-w-xs break-all mb-4">{previewAttachmentUrl}</p>
                      <a
                        href={previewAttachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition-colors"
                      >
                        <FiExternalLink size={14} /> Try Direct Link
                      </a>
                    </div>
                  ) : isImageUrl(previewAttachmentUrl) ? (
                    <img
                      src={previewAttachmentUrl}
                      alt="Attachment Preview"
                      className="max-w-full max-h-[72vh] object-contain rounded-lg shadow"
                      onError={() => setPreviewError(true)}
                    />
                  ) : isVideoUrl(previewAttachmentUrl) ? (
                    <video
                      controls
                      autoPlay
                      src={previewAttachmentUrl}
                      className="max-w-full max-h-[72vh] rounded-lg shadow"
                      onError={() => setPreviewError(true)}
                    />
                  ) : isAudioUrl(previewAttachmentUrl) ? (
                    <audio
                      controls
                      autoPlay
                      src={previewAttachmentUrl}
                      className="w-full max-w-md"
                      onError={() => setPreviewError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-300">
                      <FiPaperclip size={48} className="text-pink-500 mb-3" />
                      <p className="font-semibold text-base mb-1">Document Attachment</p>
                      <p className="text-xs text-slate-400 mb-4 max-w-xs break-all">{previewAttachmentUrl}</p>
                      <a
                        href={previewAttachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
                      >
                        Open / Download Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
