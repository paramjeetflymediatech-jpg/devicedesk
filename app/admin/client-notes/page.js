'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiMessageSquare, FiSend, FiUser, FiPaperclip, FiX, FiExternalLink, FiDownload, FiAlertCircle, FiCheckCircle, FiSearch, FiBuilding, FiMail, FiPhone } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { useAuth } from '@/app/auth/AuthContext';
import { uploadFilesWithProgress } from '@/app/utils/uploadHelper';
import { containsPhoneNumber, PHONE_POLICY_WARNING } from '@/app/utils/contactFilter';
import Pagination from '@/app/components/Pagination.js';

export default function AdminClientNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const notesPerPage = 10;
  const [replyText, setReplyText] = useState({});
  const [attachments, setAttachments] = useState({}); // attachments[noteId] will be an array of files
  const [uploadingNotes, setUploadingNotes] = useState({});
  const [uploadStats, setUploadStats] = useState({});
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  const isImageUrl = (url) => typeof url === 'string' && /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url);
  const isVideoUrl = (url) => typeof url === 'string' && /\.(mp4|webm|mov|ogg)($|\?)/i.test(url);
  const isAudioUrl = (url) => typeof url === 'string' && /\.(mp3|wav|ogg|m4a)($|\?)/i.test(url);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/client-notes');
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes || []);
      }
    } catch (err) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
    // Increased polling interval to 15 seconds to reduce constant terminal logs
    const interval = setInterval(fetchNotes, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleReply = async (noteId) => {
    const reply = replyText[noteId];
    const noteAttachments = attachments[noteId] || [];
    if ((!reply || !reply.trim()) && noteAttachments.length === 0) return;

    if (containsPhoneNumber(reply)) {
      Swal.fire({
        icon: 'warning',
        title: 'Communication Policy',
        text: PHONE_POLICY_WARNING,
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    try {
      let attachmentUrls = [];
      if (noteAttachments.length > 0) {
        setUploadingNotes(prev => ({...prev, [noteId]: true}));
        try {
          const urls = await uploadFilesWithProgress(noteAttachments, (stats) => {
            setUploadStats(prev => ({...prev, [noteId]: stats}));
          });
          if (urls && urls.length > 0) {
            attachmentUrls = urls;
          }
        } catch (error) {
          setUploadingNotes(prev => ({...prev, [noteId]: false}));
          setUploadStats(prev => ({...prev, [noteId]: null}));
          throw new Error('Failed to upload file: ' + error.message);
        }
        setUploadingNotes(prev => ({...prev, [noteId]: false}));
        setUploadStats(prev => ({...prev, [noteId]: null}));
      }

      const attachmentStr = attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null;

      const res = await fetch('/api/client-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, tl_reply: reply, tl_attachment: attachmentStr, replied_by_name: user?.name || 'Admin' })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Success', 'Reply sent to client!', 'success');
        setReplyText(prev => ({...prev, [noteId]: ''}));
        setAttachments(prev => ({...prev, [noteId]: []}));
        fetchNotes();
      } else {
        Swal.fire('Error', data.error || 'Failed to send reply', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Network or upload error', 'error');
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesStatus = statusFilter === 'All' || note.status === statusFilter;
    if (!matchesStatus) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (note.client_name && note.client_name.toLowerCase().includes(term)) ||
      (note.client_id && note.client_id.toLowerCase().includes(term)) ||
      (note.company_name && note.company_name.toLowerCase().includes(term)) ||
      (note.client_email && note.client_email.toLowerCase().includes(term)) ||
      (note.note && note.note.toLowerCase().includes(term))
    );
  });

  const indexOfLastNote = currentPage * notesPerPage;
  const indexOfFirstNote = indexOfLastNote - notesPerPage;
  const currentNotes = filteredNotes.slice(indexOfFirstNote, indexOfLastNote);
  const totalPages = Math.ceil(filteredNotes.length / notesPerPage);

  const unreadCount = notes.filter(n => n.status === 'Unread').length;
  const repliedCount = notes.filter(n => n.status === 'Replied').length;

  if (loading) return <div className="p-8 text-center text-slate-500">Loading client messages...</div>;

  return (
    <div className="page-container p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiMessageSquare style={{ color: 'var(--accent-cyan)' }} /> Client Messages & Notes
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            View and respond to incoming communications from verified clients.
          </p>
        </div>

        {/* Search & Filter Header Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by client name, ID, or text..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl outline-none transition-all"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FiX size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => { setStatusFilter('All'); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${statusFilter === 'All' ? 'bg-cyan-500 text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All ({notes.length})
            </button>
            <button
              onClick={() => { setStatusFilter('Unread'); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${statusFilter === 'Unread' ? 'bg-amber-500 text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => { setStatusFilter('Replied'); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${statusFilter === 'Replied' ? 'bg-emerald-500 text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Replied ({repliedCount})
            </button>
          </div>
        </div>
      </div>
      
      {filteredNotes.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', padding: '3rem', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FiMessageSquare size={48} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          {searchTerm || statusFilter !== 'All' ? 'No messages match your search or filter.' : 'No client messages found yet.'}
        </div>
      ) : (
        <div className="grid gap-6">
          {currentNotes.map(note => {
            const hasCustomName = note.client_name && note.client_name !== note.client_id;
            const displayName = hasCustomName ? note.client_name : (note.company_name || 'Client: ' + note.client_id);

            return (
            <div key={note.id} className="flex flex-col gap-4" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {note.client_avatar ? (
                      <img
                        src={note.client_avatar}
                        alt={displayName}
                        className="w-11 h-11 rounded-full object-cover border border-cyan-500/20"
                      />
                    ) : (
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))',
                          color: 'var(--accent-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1.05rem',
                          border: '1px solid rgba(6, 182, 212, 0.25)'
                        }}
                      >
                        {hasCustomName ? displayName.charAt(0).toUpperCase() : <FiUser size={18} />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {displayName}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Registered & Verified Client">
                        <FiCheckCircle size={11} className="text-emerald-500 shrink-0" /> Verified Client
                      </span>
                      <Link
                        href={`/admin/client?search=${encodeURIComponent(note.client_name || note.client_id)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 hover:underline transition-colors ml-1"
                        title="Verify Client Profile in Client Records"
                      >
                        Verify Record <FiExternalLink size={10} />
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-slate-400 font-medium">Client ID:</span>
                        <code className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold">{note.client_id}</code>
                      </span>
                      {note.company_name && (
                        <span className="inline-flex items-center gap-1">
                          <FiBuilding size={12} className="text-slate-400" />
                          <span>{note.company_name}</span>
                        </span>
                      )}
                      {note.client_email && (
                        <span className="inline-flex items-center gap-1">
                          <FiMail size={12} className="text-slate-400" />
                          <span>{note.client_email}</span>
                        </span>
                      )}
                      {note.client_phone && (
                        <span className="inline-flex items-center gap-1">
                          <FiPhone size={12} className="text-slate-400" />
                          <span>{note.client_phone}</span>
                        </span>
                      )}
                      <span>• {new Date(note.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 ${note.status === 'Unread' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {note.status}
                </span>
              </div>
              
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', border: '1px solid var(--glass-border)', lineHeight: '1.6' }}>
                {note.note}
              </div>
              
              {note.attachment && (() => {
                let urls = [];
                try {
                  urls = JSON.parse(note.attachment);
                  if (!Array.isArray(urls)) urls = [note.attachment];
                } catch(e) {
                  urls = [note.attachment];
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {urls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewAttachmentUrl(url)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}
                      >
                        <FiPaperclip size={14} /> View Client Attachment {urls.length > 1 ? idx+1 : ''}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {note.tl_reply ? (
                <div style={{ background: 'rgba(168, 85, 247, 0.05)', borderLeft: '4px solid #a855f7', padding: '1rem', borderRadius: '0 8px 8px 0', marginTop: '8px' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{note.replied_by_name ? `Reply from ${note.replied_by_name}` : 'Your Reply'}</span>
                    <span style={{ fontSize: '0.6rem', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px', color: '#a855f7' }}>Replied</span>
                  </p>
                  <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{note.tl_reply}</p>
                  {note.tl_attachment && (() => {
                    let urls = [];
                    try {
                      urls = JSON.parse(note.tl_attachment);
                      if (!Array.isArray(urls)) urls = [note.tl_attachment];
                    } catch(e) {
                      urls = [note.tl_attachment];
                    }
                    return (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {urls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewAttachmentUrl(url)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold', color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}
                          >
                            <FiPaperclip size={14} /> View Your Attachment {urls.length > 1 ? idx+1 : ''}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-4 mt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <textarea
                    placeholder="Type your reply to the client..."
                    value={replyText[note.id] || ''}
                    onChange={(e) => setReplyText({...replyText, [note.id]: e.target.value})}
                    className="w-full p-4 text-sm outline-none transition-shadow" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '12px', minHeight: '100px', color: 'var(--text-primary)' }}
                  />
                  <div className="flex flex-col gap-3">
                    {attachments[note.id] && attachments[note.id].length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments[note.id].map((file, idx) => (
                          <span key={idx} className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1 border border-blue-100 max-w-full">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <FiX className="cursor-pointer text-blue-800 shrink-0 ml-1" onClick={() => {
                              const newFiles = attachments[note.id].filter((_, i) => i !== idx);
                              setAttachments({...attachments, [note.id]: newFiles});
                            }} />
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <label className="cursor-pointer flex items-center gap-1 text-sm font-medium shrink-0 transition-colors" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', padding: '8px 16px', borderRadius: '12px' }}>
                        <FiPaperclip size={16} /> Attach Files
                        <input type="file" multiple className="hidden" onChange={(e) => {
                          const files = Array.from(e.target.files);
                          setAttachments({...attachments, [note.id]: [...(attachments[note.id] || []), ...files]});
                        }} />
                      </label>
                      <button
                        onClick={() => handleReply(note.id)}
                        disabled={uploadingNotes[note.id]}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed" style={{ background: 'var(--accent-cyan)', color: '#fff', border: 'none', minWidth: '130px' }}
                      >
                        {uploadingNotes[note.id] ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Uploading...</>
                        ) : (
                          <><FiSend /> Send Reply</>
                        )}
                      </button>
                    </div>

                    {/* Upload Progress UI */}
                    {uploadingNotes[note.id] && uploadStats[note.id] && (
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-slate-700 truncate max-w-[60%]">Uploading: {uploadStats[note.id].fileName}</span>
                          <span className="text-sm font-bold text-blue-600">{uploadStats[note.id].percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                          <div className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadStats[note.id].percent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span>{uploadStats[note.id].uploadedMB} MB / {uploadStats[note.id].totalMB} MB</span>
                          {uploadStats[note.id].speedMBps && <span>{uploadStats[note.id].speedMBps} MB/s</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Universal Pagination */}
      {filteredNotes.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredNotes.length}
            pageSize={notesPerPage}
            onPageChange={setCurrentPage}
            itemName="messages"
          />
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
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
                  <FiPaperclip size={48} className="text-blue-500 mb-3" />
                  <p className="font-semibold text-base mb-1">Document Attachment</p>
                  <p className="text-xs text-slate-400 mb-4 max-w-xs break-all">{previewAttachmentUrl}</p>
                  <a
                    href={previewAttachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
                  >
                    Open / Download Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
