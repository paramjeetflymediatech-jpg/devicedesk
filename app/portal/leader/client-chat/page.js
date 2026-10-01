'use client';
import { useState, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiUser, FiPaperclip, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { uploadFilesWithProgress } from '@/app/utils/uploadHelper';

export default function LeaderClientChatPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [attachments, setAttachments] = useState({}); // attachments[noteId] will be an array of files
  const [uploadingNotes, setUploadingNotes] = useState({});
  const [uploadStats, setUploadStats] = useState({});

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
        body: JSON.stringify({ id: noteId, tl_reply: reply, tl_attachment: attachmentStr })
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading client messages...</div>;

  return (
    <div className="flex-1 p-6 bg-slate-50/50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <FiMessageSquare className="text-blue-600" />
        Client Messages & Notes
      </h1>
      
      {notes.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm max-w-4xl">
          <FiMessageSquare className="text-4xl mx-auto mb-3 text-slate-300" />
          No client messages found yet.
        </div>
      ) : (
        <div className="grid gap-6 max-w-4xl">
          {notes.map(note => (
            <div key={note.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <FiUser />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Client ID: {note.client_id}</p>
                    <p className="text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${note.status === 'Unread' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {note.status}
                </span>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg text-slate-800 whitespace-pre-wrap border border-slate-100 leading-relaxed">
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
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors w-fit">
                        <FiPaperclip size={14} /> View Client Attachment {urls.length > 1 ? idx+1 : ''}
                      </a>
                    ))}
                  </div>
                );
              })()}

              {note.tl_reply ? (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-2 shadow-sm">
                  <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide">Your Reply</p>
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
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100/50 hover:bg-blue-200 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors w-fit">
                            <FiPaperclip size={14} /> View Your Attachment {urls.length > 1 ? idx+1 : ''}
                          </a>
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
    </div>
  );
}
