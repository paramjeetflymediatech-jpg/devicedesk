'use client';
import { useState, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiUser, FiPaperclip, FiX, FiExternalLink, FiDownload, FiAlertCircle, FiPlus, FiCheckCircle, FiBuilding, FiMail, FiPhone } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { useAuth } from '@/app/auth/AuthContext';
import { uploadFilesWithProgress } from '@/app/utils/uploadHelper';
import { containsPhoneNumber, PHONE_POLICY_WARNING } from '@/app/utils/contactFilter';

export default function LeaderClientChatPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [attachments, setAttachments] = useState({}); // attachments[noteId] will be an array of files
  const [uploadingNotes, setUploadingNotes] = useState({});
  const [uploadStats, setUploadStats] = useState({});
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  // Initiate Discussion with Client Modal states
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [clientsList, setClientsList] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [discussionMessage, setDiscussionMessage] = useState('');
  const [discussionFiles, setDiscussionFiles] = useState([]);
  const [isSubmittingDiscussion, setIsSubmittingDiscussion] = useState(false);

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

  const fetchClients = async () => {
    try {
      const [empRes, reqRes] = await Promise.all([
        fetch('/api/employees').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/client-services/requests').then(r => r.json()).catch(() => ({ data: [] }))
      ]);
      const map = new Map();
      if (Array.isArray(reqRes?.data)) {
        reqRes.data.forEach(r => {
          const id = r.clientId || r.client_id;
          if (id && !map.has(id)) {
            map.set(id, { id, name: r.client_name || r.company_name || id, company: r.company_name || '' });
          }
        });
      }
      if (Array.isArray(empRes?.data)) {
        empRes.data.filter(e => e.role === 'Client').forEach(c => {
          if (!map.has(c.id)) {
            map.set(c.id, { id: c.id, name: c.name || c.id, company: c.company_name || '' });
          }
        });
      }
      notes.forEach(n => {
        if (n.client_id && !map.has(n.client_id)) {
          map.set(n.client_id, { id: n.client_id, name: n.client_name || n.client_id, company: n.company_name || '' });
        }
      });
      const list = Array.from(map.values());
      setClientsList(list);
      if (list.length > 0 && !selectedClientId) {
        setSelectedClientId(list[0].id);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isInitiateModalOpen) {
      fetchClients();
    }
  }, [isInitiateModalOpen]);

  const handleReply = async (noteId) => {
    const reply = replyText[noteId];
    const noteAttachments = attachments[noteId] || [];
    if ((!reply || !reply.trim()) && noteAttachments.length === 0) return;

    // Contact number prevention check
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
        body: JSON.stringify({ id: noteId, tl_reply: reply, tl_attachment: attachmentStr, replied_by_name: user?.name || 'Team Leader' })
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

  const handleInitiateDiscussion = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      Swal.fire('Select Client', 'Please select a client for this discussion.', 'warning');
      return;
    }
    if (!discussionMessage.trim() && discussionFiles.length === 0) {
      Swal.fire('Empty Message', 'Please enter your message or discussion points.', 'warning');
      return;
    }

    // Contact number prevention check
    if (containsPhoneNumber(discussionMessage) || containsPhoneNumber(discussionTopic)) {
      Swal.fire({
        icon: 'warning',
        title: 'Communication Policy',
        text: PHONE_POLICY_WARNING,
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    setIsSubmittingDiscussion(true);
    try {
      let attachmentUrls = [];
      if (discussionFiles.length > 0) {
        try {
          const urls = await uploadFilesWithProgress(discussionFiles);
          if (urls && urls.length > 0) attachmentUrls = urls;
        } catch (err) {
          throw new Error('Failed to upload files: ' + err.message);
        }
      }

      const attachmentStr = attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null;
      const res = await fetch('/api/client-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          note: discussionMessage.trim(),
          topic: discussionTopic.trim(),
          sender_role: 'Team Leader',
          sender_name: user?.name || 'Team Leader',
          initiated_by_tl: true,
          attachment: attachmentStr
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Sent!', 'Discussion initiated with client successfully.', 'success');
        setIsInitiateModalOpen(false);
        setDiscussionTopic('');
        setDiscussionMessage('');
        setDiscussionFiles([]);
        fetchNotes();
      } else {
        Swal.fire('Error', data.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Network error', 'error');
    } finally {
      setIsSubmittingDiscussion(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading client messages...</div>;

  return (
    <div className="flex-1 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FiMessageSquare className="text-blue-600" />
            Client Messages & Notes
          </h1>
          <p className="text-xs text-slate-500 mt-1">Direct communication stream with your clients for requirement clarifications and updates</p>
        </div>
        <button
          onClick={() => setIsInitiateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all"
        >
          <FiPlus size={16} />
          <span>Initiate Discussion with Client</span>
        </button>
      </div>
      
      {notes.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm max-w-4xl">
          <FiMessageSquare className="text-4xl mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No client messages found yet.</p>
          <p className="text-xs text-slate-400 mt-1">Click "Initiate Discussion with Client" above to start a conversation with a client.</p>
        </div>
      ) : (
        <div className="grid gap-6 max-w-4xl">
          {notes.map(note => (
            <div key={note.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {note.client_avatar ? (
                      <img
                        src={note.client_avatar}
                        alt={note.client_name || note.client_id}
                        className="w-11 h-11 rounded-full object-cover border border-blue-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base border border-blue-200">
                        {note.client_name && note.client_name !== note.client_id ? (
                          note.client_name.charAt(0).toUpperCase()
                        ) : (
                          <FiUser size={18} />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 text-base">
                        {note.client_name && note.client_name !== note.client_id ? note.client_name : (note.company_name || 'Client: ' + note.client_id)}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" title="Verified Client">
                        <FiCheckCircle size={11} className="text-emerald-600 shrink-0" /> Verified Client
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-slate-400 font-medium">Client ID:</span>
                        <code className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-blue-700 font-semibold">{note.client_id}</code>
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
              
              {note.note.startsWith('[From Team Leader:') ? (
                <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl text-slate-800 whitespace-pre-wrap leading-relaxed">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-xs">
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] uppercase font-semibold">Initiated by Team Leader</span>
                    <span>Direct Discussion with Client</span>
                  </div>
                  <p className="text-slate-800 font-medium">{note.note.replace(/^\[From Team Leader:[^\]]+\]\s*/, '')}</p>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg text-slate-800 whitespace-pre-wrap border border-slate-100 leading-relaxed">
                  {note.note}
                </div>
              )}
              
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
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:shadow-sm px-3 py-1.5 rounded-lg border border-blue-100 transition-all w-fit"
                      >
                        <FiPaperclip size={14} /> View Client Attachment {urls.length > 1 ? idx+1 : ''}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {note.tl_reply ? (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-2 shadow-sm">
                  <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide flex items-center gap-2">
                    <span>{note.replied_by_name ? `Reply from ${note.replied_by_name}` : 'Your Reply'}</span>
                    <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded text-blue-600">Replied</span>
                  </p>
                  <p className="text-blue-900 whitespace-pre-wrap leading-relaxed">{note.tl_reply}</p>
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
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100/60 hover:bg-blue-200 hover:shadow-sm px-3 py-1.5 rounded-lg border border-blue-200 transition-all w-fit"
                          >
                            <FiPaperclip size={14} /> View Your Attachment {urls.length > 1 ? idx+1 : ''}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 mt-2">
                  <textarea
                    placeholder="Type your reply to the client..."
                    value={replyText[note.id] || ''}
                    onChange={(e) => setReplyText({...replyText, [note.id]: e.target.value})}
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm min-h-[100px] shadow-sm transition-shadow"
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
                      <label className="cursor-pointer text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm font-medium bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm shrink-0">
                        <FiPaperclip size={16} /> Attach Files
                        <input type="file" multiple className="hidden" onChange={(e) => {
                          const files = Array.from(e.target.files);
                          setAttachments({...attachments, [note.id]: [...(attachments[note.id] || []), ...files]});
                        }} />
                      </label>
                      <button
                        onClick={() => handleReply(note.id)}
                        disabled={uploadingNotes[note.id]}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed min-w-[130px] w-full sm:w-auto"
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
          ))}
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

      {/* Initiate Discussion with Client Modal */}
      {isInitiateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  💬
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Initiate Discussion with Client</h3>
                  <p className="text-xs text-slate-400">Send an inquiry, clarification, or brief directly to your client</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInitiateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleInitiateDiscussion} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Client <span className="text-red-500">*</span>
                </label>
                {clientsList.length === 0 ? (
                  <input
                    type="text"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    placeholder="Enter Client ID (e.g. emp_1789...)"
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Choose Client --</option>
                    {clientsList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} — [{c.id}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={discussionTopic}
                  onChange={(e) => setDiscussionTopic(e.target.value)}
                  placeholder="e.g. Google Analytics Access, Brief Clarification, Asset Review"
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Message / Discussion Points <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={discussionMessage}
                  onChange={(e) => setDiscussionMessage(e.target.value)}
                  placeholder="Write your discussion points, questions, or requirements for the client..."
                  rows={4}
                  className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  required
                />
              </div>

              {/* Security policy reminder notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                <FiAlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Policy Reminder:</strong> Sharing contact numbers or direct phone details is strictly prohibited. Keep all communication within the company portal.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Optional Attachments
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setDiscussionFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {discussionFiles.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    {discussionFiles.length} file(s) selected
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInitiateModalOpen(false)}
                  disabled={isSubmittingDiscussion}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDiscussion}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl shadow-xs transition-colors"
                >
                  <FiSend size={13} />
                  <span>{isSubmittingDiscussion ? 'Sending...' : 'Send to Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
