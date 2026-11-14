'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { 
  FiArrowLeft, FiUser, FiPhone, FiMail, FiCalendar, FiClock, 
  FiTag, FiCheckCircle, FiEdit3, FiUsers, FiMessageSquare, 
  FiSend, FiExternalLink, FiCopy, FiCheck, FiRefreshCw, 
  FiAlertCircle, FiShield, FiFileText, FiPlus, FiChevronRight,
  FiLayout, FiBox, FiCreditCard, FiGrid, FiImage, FiDollarSign, FiMenu, FiX
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClientProfile } from '../../useClientProfile';
import { useClientSmoAccess } from '../../useClientSmoAccess';
import { handleClientSignOut } from '../../clientLogout';

export default function ViewLeadDetailPage({ params }) {
  // Unwrap Next.js dynamic route params
  const resolvedParams = use(params);
  const leadId = resolvedParams?.id;
  const router = useRouter();

  const { name: clientName, company_name: companyName, initials } = useClientProfile();
  const { hasSmo: hasSmoPackage } = useClientSmoAccess();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lead, setLead] = useState(null);
  const [members, setMembers] = useState([]);
  const [company, setCompany] = useState(null);

  // Note creation
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    status: 'New',
    priority: 'Medium',
    leadScore: 50,
    assignedTo: '',
    followUpDate: ''
  });

  // Follow-up Schedule States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleFollowUpDate, setScheduleFollowUpDate] = useState('');
  const [scheduleFollowUpNote, setScheduleFollowUpNote] = useState('');
  const [quickFollowUpStatus, setQuickFollowUpStatus] = useState('Contacted');
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // Quick Assign Dropdown / State
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [assigningMember, setAssigningMember] = useState(false);

  // Copy states
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const getClientId = () => {
    let clientId = '';
    if (typeof window !== 'undefined') {
      try {
        const user = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
        if (user && user.id) clientId = user.id;
        if (!clientId) {
          const profile = JSON.parse(localStorage.getItem('devicedesk_client_profile') || '{}');
          if (profile && (profile.id || profile.client_id || profile.employee_id)) {
            clientId = profile.id || profile.client_id || profile.employee_id;
          }
        }
        if (!clientId) {
          const fallback = JSON.parse(localStorage.getItem('user') || '{}');
          if (fallback && (fallback.id || fallback.employee_id || fallback.clientId)) {
            clientId = fallback.id || fallback.employee_id || fallback.clientId;
          }
        }
      } catch (e) {}
    }
    return clientId;
  };

  const fetchLeadDetails = useCallback(async (isRefresh = false) => {
    if (!leadId) return;
    const clientId = getClientId();
    if (!clientId) {
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/client-services/crm-leads?clientId=${clientId}&leadId=${leadId}`);
      const data = await res.json();

      if (data.success && data.lead) {
        setLead(data.lead);
        setMembers(data.members || []);
        if (data.company) setCompany(data.company);

        // Pre-fill edit form
        let initialFollowUpIso = '';
        if (data.lead.follow_up_date) {
          try {
            const d = new Date(data.lead.follow_up_date);
            const pad = n => String(n).padStart(2, '0');
            initialFollowUpIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          } catch (e) {}
        }

        setEditForm({
          firstName: data.lead.first_name || '',
          lastName: data.lead.last_name || '',
          email: data.lead.email || '',
          phone: data.lead.phone || '',
          subject: data.lead.subject || '',
          message: data.lead.message || '',
          status: data.lead.status || 'New',
          priority: data.lead.priority || 'Medium',
          leadScore: data.lead.lead_score || 50,
          assignedTo: data.lead.assigned_to ? String(data.lead.assigned_to) : '',
          followUpDate: initialFollowUpIso
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Lead Not Found',
          text: data.error || 'Could not locate the requested CRM lead.',
          confirmButtonColor: '#db2777'
        }).then(() => {
          router.push('/portal/client/leads');
        });
      }
    } catch (err) {
      console.error('Failed to load CRM lead:', err);
      Swal.fire('Error', 'Network error while fetching lead details', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  // Handle Quick Status Change
  const handleStatusChange = async (newStatus) => {
    if (!lead || !newStatus || newStatus === lead.status) return;
    const clientId = getClientId();
    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId: lead.id,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setLead(prev => ({ ...prev, status: newStatus }));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Status set to ${newStatus}`,
          showConfirmButton: false,
          timer: 2000
        });
        fetchLeadDetails(true);
      } else {
        Swal.fire('Error', data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error updating lead status', 'error');
    }
  };

  // Handle Quick Member Assignment
  const handleAssignMember = async (memberId) => {
    const clientId = getClientId();
    setAssigningMember(true);
    setShowAssignDropdown(false);
    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId: lead.id,
          assigned_to: memberId === 'unassigned' || !memberId ? null : Number(memberId)
        })
      });
      const data = await res.json();
      if (data.success) {
        const assignedUser = members.find(m => m.id === Number(memberId)) || null;
        setLead(prev => ({
          ...prev,
          assigned_to: memberId === 'unassigned' || !memberId ? null : Number(memberId),
          assigned_user_name: assignedUser ? assignedUser.name : null,
          assigned_user_email: assignedUser ? assignedUser.email : null,
          assigned_user_role: assignedUser ? assignedUser.role : null,
          AssignedUser: assignedUser
        }));
        setEditForm(prev => ({
          ...prev,
          assignedTo: memberId === 'unassigned' || !memberId ? '' : String(memberId)
        }));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: assignedUser ? `Assigned to ${assignedUser.name}` : 'Lead Unassigned',
          showConfirmButton: false,
          timer: 2500
        });
        fetchLeadDetails(true);
      } else {
        Swal.fire('Error', data.error || 'Failed to assign member', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error assigning lead', 'error');
    } finally {
      setAssigningMember(false);
    }
  };

  // Handle Save Full Lead Edits
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const clientId = getClientId();
    setSavingEdit(true);

    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId: lead.id,
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
          subject: editForm.subject,
          message: editForm.message,
          status: editForm.status,
          priority: editForm.priority,
          lead_score: Number(editForm.leadScore) || 0,
          assigned_to: editForm.assignedTo ? Number(editForm.assignedTo) : null,
          follow_up_date: editForm.followUpDate ? editForm.followUpDate.replace('T', ' ') : null
        })
      });
      const data = await res.json();

      if (data.success) {
        setShowEditModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Lead Updated! ✨',
          text: 'The customer details and assignments have been updated on your CRM.',
          confirmButtonColor: '#db2777'
        });
        fetchLeadDetails(true);
      } else {
        Swal.fire('Error', data.error || 'Failed to update lead', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error updating lead', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const getFollowUpInfo = (followUpDate, status) => {
    if (!followUpDate) return null;
    const isCompleted = ['converted', 'lost'].includes((status || '').toLowerCase());
    if (isCompleted) {
      return {
        type: 'completed',
        label: 'Resolved',
        sub: new Date(followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        color: 'bg-gray-100 text-gray-500 border-gray-200'
      };
    }
    const d = new Date(followUpDate);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return {
        type: 'today',
        label: `Today at ${timeStr}`,
        sub: 'Action Required Today',
        date: d,
        color: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200'
      };
    } else if (d.getTime() < now.getTime()) {
      const diffDays = Math.max(1, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        type: 'overdue',
        label: `Overdue (${diffDays}d ago)`,
        sub: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        date: d,
        color: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-200'
      };
    } else {
      return {
        type: 'upcoming',
        label: `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`,
        sub: 'Scheduled',
        date: d,
        color: 'bg-blue-50 text-blue-800 border-blue-200'
      };
    }
  };

  const openScheduleModal = () => {
    setQuickFollowUpStatus(lead?.status || 'Contacted');
    setScheduleFollowUpNote('');
    if (lead?.follow_up_date) {
      try {
        const d = new Date(lead.follow_up_date);
        const pad = n => String(n).padStart(2, '0');
        setScheduleFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } catch (e) {
        setScheduleFollowUpDate('');
      }
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      const pad = n => String(n).padStart(2, '0');
      setScheduleFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`);
    }
    setShowScheduleModal(true);
  };

  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!lead) return;
    const clientId = getClientId();
    if (!clientId) return;

    if (!scheduleFollowUpDate) {
      Swal.fire('Date Required', 'Please choose a follow-up date and time.', 'warning');
      return;
    }

    try {
      setSavingFollowUp(true);
      const formattedDate = scheduleFollowUpDate.replace('T', ' ');

      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId: lead.id,
          follow_up_date: formattedDate,
          status: quickFollowUpStatus || lead.status,
          note: scheduleFollowUpNote.trim() 
            ? `[Follow-up Set for ${new Date(scheduleFollowUpDate).toLocaleString()}]: ${scheduleFollowUpNote.trim()}`
            : `Follow-up scheduled for ${new Date(scheduleFollowUpDate).toLocaleString()}`
        })
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '📅 Follow-up Scheduled!',
          text: `Scheduled for ${new Date(scheduleFollowUpDate).toLocaleString()}`,
          showConfirmButton: false,
          timer: 2500
        });
        setShowScheduleModal(false);
        fetchLeadDetails(true);
      } else {
        throw new Error(data.error || 'Failed to save follow-up date');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to schedule follow-up', 'error');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleClearFollowUp = async () => {
    if (!lead) return;
    const clientId = getClientId();
    if (!clientId) return;

    try {
      setSavingFollowUp(true);
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId: lead.id,
          follow_up_date: null,
          note: 'Follow-up schedule cleared.'
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Follow-up Cleared',
          showConfirmButton: false,
          timer: 2000
        });
        setShowScheduleModal(false);
        fetchLeadDetails(true);
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to clear follow-up', 'error');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleQuickPreset = (hoursAhead, targetHour = null, daysAhead = 0) => {
    const d = new Date();
    if (daysAhead > 0) {
      d.setDate(d.getDate() + daysAhead);
      d.setHours(targetHour !== null ? targetHour : 10, 0, 0, 0);
    } else if (targetHour !== null) {
      d.setDate(d.getDate() + 1);
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setTime(d.getTime() + hoursAhead * 60 * 60 * 1000);
    }
    const pad = n => String(n).padStart(2, '0');
    setScheduleFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  // Handle Add Internal Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_note',
          leadId: lead.id,
          note: newNote.trim()
        })
      });
      const data = await res.json();

      if (data.success) {
        setNewNote('');
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Note recorded!',
          showConfirmButton: false,
          timer: 2000
        });
        fetchLeadDetails(true);
      } else {
        Swal.fire('Error', data.error || 'Failed to add note', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error adding note', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCopy = (text, type = 'phone') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'new') return { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    if (s === 'contacted') return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    if (s === 'qualified') return { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
    if (s === 'converted') return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    if (s === 'lost') return { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    return { bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high' || p === 'urgent') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (p === 'medium') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-white border-r">
      <div className="p-6 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
          DeviceDesk
        </h2>
        <span className="text-xs bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full font-semibold">
          Client Portal
        </span>
      </div>
      
      <div className="p-4 flex-1 space-y-1 overflow-y-auto">
        <Link href="/portal/client/dashboard" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <FiLayout size={18} />
          <span>Dashboard</span>
        </Link>
        <Link href="/portal/client/notes" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <FiMessageSquare size={18} />
          <span>Client Notes</span>
        </Link>
        <Link href="/portal/client/book-service" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <FiBox size={18} />
          <span>Book a Service</span>
        </Link>
        <Link href="/portal/client/billing" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <FiCreditCard size={18} />
          <span>Invoices & Billing</span>
        </Link>
        <Link href="/portal/client/packages" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <FiGrid size={18} />
          <span>Our Packages</span>
        </Link>
        <Link href="/portal/client/seo" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <FiFileText size={18} />
          <span>SEO Work</span>
        </Link>
        {hasSmoPackage && (
          <Link href="/portal/client/smo" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <FiImage size={18} />
            <span>SMO Designs</span>
          </Link>
        )}
        <Link href="/portal/client/ads" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <FiDollarSign size={18} />
          <span>Google & Meta Ads</span>
        </Link>
        <Link href="/portal/client/leads" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold bg-pink-50 text-pink-700 transition-colors">
          <FiUsers size={18} className="text-pink-600" />
          <span>CRM Leads</span>
        </Link>
      </div>

      <div className="p-4 border-t">
        <button onClick={handleClientSignOut} className="w-full text-center p-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <FiRefreshCw className="animate-spin text-pink-600 mx-auto" size={32} />
          <p className="text-sm font-semibold text-gray-600">Loading Lead Details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border shadow-sm space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <FiAlertCircle size={28} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Lead Not Found</h2>
          <p className="text-xs text-gray-500">This lead may have been deleted or does not exist for your account.</p>
          <Link href="/portal/client/leads" className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-xl text-xs font-bold hover:bg-pink-700 transition-colors">
            <FiArrowLeft size={14} /> Back to All Leads
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusBadge(lead.status);
  const fullName = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || `Lead #${lead.id}`;
  const cleanPhone = (lead.phone || '').replace(/[^0-9+]/g, '');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-sm bg-white">
        {renderSidebar()}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600">
             <FiX size={20} />
           </button>
        </div>
        {renderSidebar()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Top Header */}
        <header className="bg-white border-b px-4 py-4 md:px-8 md:py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg md:hidden transition-colors">
              <FiMenu size={22} />
            </button>
            <Link 
              href="/portal/client/leads" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiArrowLeft size={14} />
              <span className="hidden sm:inline">Back to Leads</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
                  {fullName}
                </h1>
                <span className="text-xs text-gray-400 font-mono">#{lead.id}</span>
                {company && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                    {company.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                Synchronized with multi-tenant CRM SaaS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLeadDetails(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh lead details"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={15} />
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <FiEdit3 size={13} />
              <span>Edit Lead</span>
            </button>

            <div 
              onClick={() => router.push('/portal/client/profile')}
              className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity ml-2 border-l pl-3"
              title="Profile Settings"
            >
              <div className="hidden sm:block text-right">
                <p suppressHydrationWarning className="text-xs font-bold text-gray-800 leading-tight">
                  {companyName || clientName || company?.name || 'Client'}
                </p>
                <p className="text-[10px] text-gray-400 font-medium capitalize">Client Portal</p>
              </div>
              <div 
                className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs uppercase shadow-xs border border-pink-200"
                suppressHydrationWarning
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Quick Action Ribbon */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            {/* Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status:</span>
              <div className="relative inline-block">
                <select
                  value={lead.status || 'New'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none transition-colors ${statusStyle.bg}`}
                >
                  <option value="New">🔵 New</option>
                  <option value="Contacted">🟡 Contacted</option>
                  <option value="Qualified">🟣 Qualified</option>
                  <option value="Converted">🟢 Converted</option>
                  <option value="Lost">🔴 Lost</option>
                </select>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(lead.priority)}`}>
                {lead.priority || 'Medium'} Priority
              </span>
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex items-center gap-2">
              {lead.phone && (
                <>
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                    title="Direct Phone Call"
                  >
                    <FiPhone size={13} />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-xl border border-green-200 transition-colors"
                    title="Send WhatsApp Message"
                  >
                    <FiMessageSquare size={13} />
                    <span>WhatsApp</span>
                  </a>
                </>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors"
                  title="Send Email"
                >
                  <FiMail size={13} />
                  <span>Email</span>
                </a>
              )}
            </div>
          </div>

          {/* Grid Layout: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (1 / 3): Contact Profile & Member Assignment */}
            <div className="space-y-6">
              
              {/* Lead Profile Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-bold text-lg flex items-center justify-center shadow-md">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 leading-tight">{fullName}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Source: {lead.source || 'Website'}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Contact Fields */}
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-gray-400 font-semibold block mb-1">Phone Number</label>
                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <FiPhone className="text-gray-400" size={14} />
                        <span className="font-bold text-gray-900">{lead.phone || 'Not provided'}</span>
                      </div>
                      {lead.phone && (
                        <button onClick={() => handleCopy(lead.phone, 'phone')} className="text-gray-400 hover:text-gray-700" title="Copy Phone">
                          {copiedPhone ? <FiCheck size={14} className="text-emerald-600" /> : <FiCopy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 font-semibold block mb-1">Email Address</label>
                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 truncate">
                        <FiMail className="text-gray-400 flex-shrink-0" size={14} />
                        <span className="font-bold text-gray-900 truncate">{lead.email || 'Not provided'}</span>
                      </div>
                      {lead.email && (
                        <button onClick={() => handleCopy(lead.email, 'email')} className="text-gray-400 hover:text-gray-700 flex-shrink-0" title="Copy Email">
                          {copiedEmail ? <FiCheck size={14} className="text-emerald-600" /> : <FiCopy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 font-semibold block mb-1">Lead Score</label>
                    <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-pink-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, lead.lead_score || 0))}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-gray-900 font-mono">{lead.lead_score || 0}/100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-gray-500">
                    <div>
                      <span className="block font-medium text-gray-400">Created:</span>
                      <span className="font-semibold text-gray-700">{formatDate(lead.created_at)}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-gray-400">Last Updated:</span>
                      <span className="font-semibold text-gray-700">{formatDate(lead.updated_at)}</span>
                    </div>
                  </div>

                  {company && (
                    <div className="bg-pink-50/60 p-2.5 rounded-xl border border-pink-100 text-[11px] text-pink-800 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-500">Client Account:</span>
                        <span className="font-bold text-pink-700 capitalize">{company.name} (ID #{company.id})</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Follow-up Schedule Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FiCalendar className="text-pink-600" size={15} />
                    <span>Follow-up Schedule</span>
                  </h3>
                  <button
                    type="button"
                    onClick={openScheduleModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-lg border border-pink-200 transition-colors cursor-pointer"
                  >
                    <FiCalendar size={12} />
                    <span>{lead.follow_up_date ? 'Reschedule' : '+ Schedule'}</span>
                  </button>
                </div>

                {(() => {
                  const fInfo = getFollowUpInfo(lead.follow_up_date, lead.status);
                  if (!fInfo) {
                    return (
                      <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center space-y-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 mx-auto flex items-center justify-center">
                          <FiClock size={16} />
                        </div>
                        <p className="text-xs font-semibold text-gray-600">No follow-up scheduled yet</p>
                        <p className="text-[11px] text-gray-400">Plan a reminder to call or message this lead.</p>
                        <button
                          type="button"
                          onClick={openScheduleModal}
                          className="mt-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FiCalendar size={13} />
                          <span>Schedule Now</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${fInfo.color}`}>
                        <div className="flex items-center gap-2.5">
                          {fInfo.type === 'today' ? (
                            <FiClock size={18} className="animate-spin text-emerald-600 flex-shrink-0" />
                          ) : fInfo.type === 'overdue' ? (
                            <FiAlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                          ) : (
                            <FiCalendar size={18} className="text-blue-600 flex-shrink-0" />
                          )}
                          <div>
                            <span className="text-xs font-black block leading-tight">{fInfo.label}</span>
                            <span className="text-[10px] font-semibold opacity-80 block mt-0.5">{fInfo.sub}</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-current">
                          {fInfo.type}
                        </span>
                      </div>

                      {/* Quick Presets for fast rescheduling */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleQuickPreset(2);
                            setTimeout(() => setShowScheduleModal(true), 50);
                          }}
                          className="py-1 px-2 text-[10px] font-semibold bg-gray-50 hover:bg-pink-50 hover:text-pink-700 rounded-lg border border-gray-200 transition-colors text-center cursor-pointer"
                        >
                          +2 Hours
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleQuickPreset(0, 10, 0);
                            setTimeout(() => setShowScheduleModal(true), 50);
                          }}
                          className="py-1 px-2 text-[10px] font-semibold bg-gray-50 hover:bg-pink-50 hover:text-pink-700 rounded-lg border border-gray-200 transition-colors text-center cursor-pointer"
                        >
                          Tmrw 10 AM
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleQuickPreset(0, 11, 2);
                            setTimeout(() => setShowScheduleModal(true), 50);
                          }}
                          className="py-1 px-2 text-[10px] font-semibold bg-gray-50 hover:bg-pink-50 hover:text-pink-700 rounded-lg border border-gray-200 transition-colors text-center cursor-pointer"
                        >
                          In 2 Days
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Assigned Member Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FiUsers className="text-pink-600" size={15} />
                    <span>Assigned Team Member</span>
                  </h3>
                  {company && (
                    <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200 capitalize">
                      {company.name} Staff
                    </span>
                  )}
                </div>

                {lead.assigned_to ? (
                  <div className="flex items-center gap-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                    <div className="w-10 h-10 rounded-full bg-pink-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {(lead.assigned_user_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-xs leading-tight truncate">
                        {lead.assigned_user_name || `Member #${lead.assigned_to}`}
                      </p>
                      {lead.assigned_user_email && (
                        <p className="text-[11px] text-gray-500 truncate">{lead.assigned_user_email}</p>
                      )}
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-pink-700 border border-pink-200">
                        {lead.assigned_user_role || 'Staff'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                    <p className="text-xs font-semibold text-gray-600">Currently Unassigned</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Assign this lead to your staff to begin follow-up.</p>
                  </div>
                )}

                {/* Direct Member Selector Dropdown - like leads list page */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="text-[11px] font-bold text-gray-600 block mb-1.5">
                    Assign To ({company?.name || 'Your'} Staff):
                  </label>
                  <select
                    value={lead.assigned_to ? String(lead.assigned_to) : ''}
                    onChange={(e) => handleAssignMember(e.target.value)}
                    disabled={assigningMember}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all cursor-pointer text-gray-800"
                  >
                    <option value="">— Unassigned —</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                  {members.length === 0 && (
                    <p className="text-[10px] text-gray-400 mt-1 italic">
                      No staff members registered under this client account yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (2 / 3): Inquiry Details, Notes & Activity Timeline */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Inquiry Message Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FiFileText className="text-pink-600" size={15} />
                    <span>Customer Inquiry & Requirements</span>
                  </h3>
                  <span className="text-xs text-gray-400">Subject: <strong className="text-gray-800">{lead.subject || 'Website Inquiry'}</strong></span>
                </div>

                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {lead.message || 'No specific inquiry message was submitted with this lead.'}
                </div>
              </div>

              {/* Add Internal Follow-up Note */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiMessageSquare className="text-pink-600" size={15} />
                  <span>Add Internal Follow-up Note</span>
                </h3>

                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Log a client conversation, follow-up call, or next step..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                    >
                      <FiSend size={13} />
                      <span>{submittingNote ? 'Saving...' : 'Post Note'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Notes & Activity Log List */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FiClock className="text-pink-600" size={15} />
                    <span>Activity History & Notes ({lead.notes?.length || 0})</span>
                  </h3>
                  <span className="text-xs text-gray-400">Live CRM Audit Log</span>
                </div>

                {lead.notes && lead.notes.length > 0 ? (
                  <div className="space-y-3">
                    {lead.notes.map((n, idx) => (
                      <div key={n.id || idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-[10px]">
                              {(n.User?.name || 'U').charAt(0)}
                            </span>
                            {n.User?.name || 'Team Member'}
                          </span>
                          <span className="text-gray-400">{formatDate(n.createdAt || n.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-700 pl-6 leading-relaxed whitespace-pre-wrap">
                          {n.note || n.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    No notes recorded yet. Post the first follow-up note above.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Lead Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <FiEdit3 className="text-pink-600" size={18} />
                <h3 className="font-bold text-gray-900 text-base">Edit Lead #{lead.id}</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white font-semibold"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white font-semibold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Assign To Member</label>
                  <select
                    value={editForm.assignedTo}
                    onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white font-semibold"
                  >
                    <option value="">— Unassigned —</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">📅 Next Follow-up Date & Time</label>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={editForm.followUpDate || ''}
                    onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white font-medium"
                  />
                  {editForm.followUpDate && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, followUpDate: '' })}
                      className="px-2.5 py-2 text-xs text-gray-500 hover:text-rose-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors"
                      title="Clear Follow-up Date"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Inquiry Subject</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Inquiry Message</label>
                <textarea
                  rows={4}
                  value={editForm.message}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Schedule / Reschedule Follow-up Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 via-white to-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold shadow-xs">
                  <FiCalendar size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    Schedule Follow-up
                  </h3>
                  <p className="text-xs text-gray-500">
                    Lead #{lead?.id} • {fullName || 'Inquiry'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveFollowUp} className="p-6 overflow-y-auto space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">⚡ Quick Time Presets</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(2)}
                    className="py-1.5 px-2 bg-gray-50 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-all text-center cursor-pointer"
                  >
                    +2 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0, 10, 0)}
                    className="py-1.5 px-2 bg-gray-50 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-all text-center cursor-pointer"
                  >
                    Tomorrow 10 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0, 16, 0)}
                    className="py-1.5 px-2 bg-gray-50 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-all text-center cursor-pointer"
                  >
                    Tomorrow 4 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0, 11, 2)}
                    className="py-1.5 px-2 bg-gray-50 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-all text-center cursor-pointer"
                  >
                    In 2 Days (11 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0, 10, 7)}
                    className="py-1.5 px-2 bg-gray-50 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-all text-center cursor-pointer col-span-2 sm:col-span-1"
                  >
                    In 1 Week
                  </button>
                </div>
              </div>

              {/* Exact Date & Time Picker */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  📅 Follow-up Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleFollowUpDate}
                  onChange={(e) => setScheduleFollowUpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                />
              </div>

              {/* Status Update Option */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Lead Status</label>
                <select
                  value={quickFollowUpStatus}
                  onChange={(e) => setQuickFollowUpStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              {/* Follow-up Note */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  📝 Follow-up Goal / Agenda Note <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Call client back to discuss pricing and send brochure via WhatsApp..."
                  value={scheduleFollowUpNote}
                  onChange={(e) => setScheduleFollowUpNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <div>
                  {lead?.follow_up_date && (
                    <button
                      type="button"
                      onClick={handleClearFollowUp}
                      disabled={savingFollowUp}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Clear Schedule
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFollowUp}
                    className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingFollowUp ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FiCheckCircle size={14} />
                        <span>Save Follow-up</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

