'use client';
import { useState, useEffect } from 'react';
import { FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, FiGrid, FiFileText, FiImage, FiDollarSign, FiEdit3, FiUser, FiSend, FiPlus } from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function ClientNotesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [myClientId, setMyClientId] = useState('');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      const interval = setInterval(fetchNotes, 3000);
      return () => clearInterval(interval);
    }
  }, [myClientId]);

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
    if (!newNote.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/client-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: myClientId, note: newNote })
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        fetchNotes();
        Swal.fire('Success', 'Note added successfully', 'success');
      } else {
        Swal.fire('Error', data.error || 'Failed to add note', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error', 'error');
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
        <button onClick={() => window.location.href = '/login'} className="w-full text-center p-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full relative">
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
                <textarea 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Do you need anything else? Write a note here..."
                  className="w-full border-gray-300 rounded-xl shadow-sm p-4 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 border transition-shadow min-h-[120px]"
                ></textarea>
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-pink-600 rounded-xl hover:bg-pink-700 disabled:opacity-70 shadow-md shadow-pink-200 transition-all active:scale-95"
                  >
                    {submitting ? 'Adding...' : 'Add Note'}
                    <FiPlus size={18} />
                  </button>
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
              {notes.map(note => (
                <div key={note.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${note.status === 'Unread' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {note.status}
                    </span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap mb-2">{note.note}</p>
                  {note.tl_reply && (
                    <div className="mt-2 p-3 bg-pink-50 border-l-4 border-pink-500 rounded-r-lg">
                      <p className="text-xs font-bold text-pink-700 mb-1">Team Leader Reply:</p>
                      <p className="text-sm text-pink-900 whitespace-pre-wrap">{note.tl_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
