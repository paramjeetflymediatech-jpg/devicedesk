'use client';
import { useState, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiUser } from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function LeaderClientChatPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

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
    const interval = setInterval(fetchNotes, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleReply = async (noteId) => {
    const reply = replyText[noteId];
    if (!reply || !reply.trim()) return;

    try {
      const res = await fetch('/api/client-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, tl_reply: reply })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Success', 'Reply sent to client!', 'success');
        setReplyText(prev => ({...prev, [noteId]: ''}));
        fetchNotes();
      } else {
        Swal.fire('Error', data.error || 'Failed to send reply', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error', 'error');
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

              {note.tl_reply ? (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-2 shadow-sm">
                  <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide">Your Reply</p>
                  <p className="text-blue-900 whitespace-pre-wrap leading-relaxed">{note.tl_reply}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 mt-2">
                  <textarea
                    placeholder="Type your reply to the client..."
                    value={replyText[note.id] || ''}
                    onChange={(e) => setReplyText({...replyText, [note.id]: e.target.value})}
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm min-h-[100px] shadow-sm transition-shadow"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleReply(note.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-200"
                    >
                      <FiSend /> Send Reply
                    </button>
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
