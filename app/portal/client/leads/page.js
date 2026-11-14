'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, 
  FiGrid, FiFileText, FiImage, FiDollarSign, FiDownload, FiSend, 
  FiEdit3, FiUser, FiSearch, FiPhone, FiMail, FiExternalLink, 
  FiCheckCircle, FiClock, FiAlertCircle, FiRefreshCw, FiCopy, FiCheck,
  FiFilter, FiEye, FiUsers, FiTag, FiSettings, FiKey, FiLink, FiZap, FiCode, FiHelpCircle,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiMoreVertical, FiCalendar
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { useClientProfile } from '../useClientProfile';
import { useClientSmoAccess } from '../useClientSmoAccess';
import { handleClientSignOut } from '../clientLogout';

export default function ClientCrmLeadsPage() {
  const { name: clientName, company_name: companyName, initials } = useClientProfile();
  const { hasSmo: hasSmoPackage } = useClientSmoAccess();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Leads Data
  const [crmCompany, setCrmCompany] = useState(null);
  const [hasCrm, setHasCrm] = useState(true);
  const [leads, setLeads] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 });
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & Limits
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(null);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setCurrentPage(1);

    const today = new Date();
    const formatYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setShowCustomDate(false);
    } else if (preset === 'today') {
      const s = formatYMD(today);
      setStartDate(s);
      setEndDate(s);
      setShowCustomDate(false);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = formatYMD(y);
      setStartDate(s);
      setEndDate(s);
      setShowCustomDate(false);
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(today));
      setShowCustomDate(false);
    } else if (preset === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(today));
      setShowCustomDate(false);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatYMD(firstDay));
      setEndDate(formatYMD(today));
      setShowCustomDate(false);
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(formatYMD(firstDay));
      setEndDate(formatYMD(lastDay));
      setShowCustomDate(false);
    } else if (preset === 'custom') {
      setShowCustomDate(true);
      if (!startDate) setStartDate(formatYMD(today));
      if (!endDate) setEndDate(formatYMD(today));
    }
  };

  const handleCustomDateChange = (type, val) => {
    if (type === 'start') setStartDate(val);
    if (type === 'end') setEndDate(val);
    setDatePreset('custom');
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setShowCustomDate(false);
    setCurrentPage(1);
  };

  // Floating Three-Dots Action Menu State
  const [activeActionMenu, setActiveActionMenu] = useState(null); // { lead, top, left, openUpward }

  useEffect(() => {
    const handleClose = () => setActiveActionMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, []);

  const toggleActionMenu = (e, lead) => {
    e.stopPropagation();
    if (activeActionMenu?.lead?.id === lead.id) {
      setActiveActionMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 240;
    const menuWidth = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    setActiveActionMenu({
      lead,
      top: openUpward ? Math.max(10, rect.top - menuHeight - 6) : rect.bottom + 6,
      left: Math.max(12, rect.right - menuWidth),
      openUpward
    });
  };

  // Detail Modal
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Edit Lead Modal State
  const [editingLead, setEditingLead] = useState(null);
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
    assignedTo: ''
  });

  // Configuration & Webhook Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [generatingTestLead, setGeneratingTestLead] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState('elementor'); // 'elementor', 'cf7', 'wpforms', 'curl'
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showApiKeyPlain, setShowApiKeyPlain] = useState(false);

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

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handleLimitChange = (newLimit) => {
    const lim = Number(newLimit) || 10;
    setLimit(lim);
    setCurrentPage(1);
  };

  const fetchLeads = useCallback(async (isRefresh = false) => {
    const clientId = getClientId();
    if (!clientId) {
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        clientId,
        page: String(currentPage),
        limit: String(limit),
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery
      });
      if (memberFilter && memberFilter !== 'all') {
        params.set('assignedTo', memberFilter);
      }
      if (startDate && startDate.trim()) {
        params.set('startDate', startDate.trim());
      }
      if (endDate && endDate.trim()) {
        params.set('endDate', endDate.trim());
      }

      const res = await fetch(`/api/client-services/crm-leads?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setHasCrm(data.hasCrm !== false);
        setCrmCompany(data.company || null);
        setLeads(data.leads || []);
        if (data.members) setMembers(data.members);
        setStats(data.stats || { total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 });
        setTotalCount(data.totalCount || 0);
        setTotalPages(Math.max(1, data.totalPages || Math.ceil((data.totalCount || 0) / limit)));
      } else {
        console.error('Fetch CRM leads failed:', data.error);
      }
    } catch (err) {
      console.error('Network error fetching CRM leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, limit, statusFilter, priorityFilter, memberFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCopyPhone = (phone, e) => {
    if (e) e.stopPropagation();
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleUpdateLeadStatus = async () => {
    if (!selectedLead || !newStatus) return;
    const clientId = getClientId();
    if (!clientId) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId: selectedLead.id,
          status: newStatus,
          note: statusNote
        })
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `Lead status updated to ${newStatus}.`,
          timer: 1800,
          showConfirmButton: false
        });

        // Update local lead state
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: newStatus } : l));
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
        fetchLeads(true);
        setStatusNote('');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: data.error || 'Could not update lead status.'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignMember = async (leadId, memberId) => {
    const clientId = getClientId();
    if (!clientId || !leadId) return;

    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId,
          assigned_to: memberId === 'unassigned' || !memberId ? null : Number(memberId)
        })
      });
      const data = await res.json();
      if (data.success) {
        const assignedUser = members.find(m => m.id === Number(memberId)) || null;
        setLeads(prev => prev.map(l => l.id === leadId ? {
          ...l,
          assigned_to: memberId === 'unassigned' || !memberId ? null : Number(memberId),
          assigned_user_name: assignedUser ? assignedUser.name : null,
          assigned_user_email: assignedUser ? assignedUser.email : null,
          assigned_user_role: assignedUser ? assignedUser.role : null,
          AssignedUser: assignedUser
        } : l));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: assignedUser ? `Assigned to ${assignedUser.name}` : 'Lead Unassigned',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to assign member', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error assigning lead', 'error');
    }
  };

  const openEditModal = (lead, e) => {
    if (e) e.stopPropagation();
    setEditingLead(lead);
    setEditForm({
      firstName: lead.first_name || '',
      lastName: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      subject: lead.subject || '',
      message: lead.message || '',
      status: lead.status || 'New',
      priority: lead.priority || 'Medium',
      leadScore: lead.lead_score || 50,
      assignedTo: lead.assigned_to ? String(lead.assigned_to) : ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLead) return;
    const clientId = getClientId();
    setSavingEdit(true);

    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          leadId: editingLead.id,
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
          subject: editForm.subject,
          message: editForm.message,
          status: editForm.status,
          priority: editForm.priority,
          lead_score: Number(editForm.leadScore) || 0,
          assigned_to: editForm.assignedTo ? Number(editForm.assignedTo) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingLead(null);
        Swal.fire({
          icon: 'success',
          title: 'Lead Updated! ✨',
          text: 'Customer details and assignments updated on CRM SaaS.',
          confirmButtonColor: '#db2777'
        });
        fetchLeads(true);
      } else {
        Swal.fire('Error', data.error || 'Failed to update lead', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error updating lead', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveApiKey = async (e) => {
    if (e) e.preventDefault();
    if (!apiKeyInput.trim()) return;
    const clientId = getClientId();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure',
          clientId,
          apiKey: apiKeyInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Connected to CRM!',
          text: data.message,
          confirmButtonColor: '#db2777'
        });
        setApiKeyInput('');
        fetchLeads(true);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Connection Failed',
          text: data.error || 'Invalid API Key',
          confirmButtonColor: '#db2777'
        });
      }
    } catch (err) {
      Swal.fire('Error', 'Network error connecting CRM', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGenerateTestLead = async () => {
    const clientId = getClientId();
    setGeneratingTestLead(true);
    try {
      const res = await fetch('/api/client-services/crm-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_lead',
          clientId
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Test Lead Ingested! 🚀',
          text: data.message,
          confirmButtonColor: '#db2777'
        });
        fetchLeads(true);
      } else {
        Swal.fire('Error', data.error || 'Failed to generate test lead', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error generating test lead', 'error');
    } finally {
      setGeneratingTestLead(false);
    }
  };

  const handleCopyText = (text, type = 'key') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
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
    if (p === 'high') return 'bg-rose-100 text-rose-800';
    if (p === 'medium') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
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
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <button onClick={() => window.location.href = '/portal/client/leads'} className="flex items-center space-x-3 p-3 rounded-lg font-bold transition-all bg-pink-50 text-pink-700 shadow-sm">
          <FiUsers size={20} /><span>CRM Leads</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/notes'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiMessageSquare size={20} /><span>Project Notes</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/book-service'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiEdit3 size={20} /><span>Book Service</span>
        </button>

        {hasSmoPackage && (
          <>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Services</div>
            <button onClick={() => window.location.href = '/portal/client/smo'} className="flex items-center space-x-3 p-3 rounded-lg font-semibold transition-all text-pink-700 bg-pink-50 hover:bg-pink-100">
              <FiImage size={20} className="text-pink-600" /><span>SMO Automation</span>
            </button>
          </>
        )}

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
        <button onClick={handleClientSignOut} className="w-full text-center p-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

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

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Top Header */}
        <header className="bg-white border-b px-4 py-4 md:px-8 md:py-5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg md:hidden transition-colors">
              <FiMenu size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">CRM Customer Leads</h1>
                {crmCompany && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-200">
                    {crmCompany.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Real-time inquiries and leads synchronized from your website & campaigns.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-semibold rounded-lg transition-colors shadow-xs"
              title="Webhook & CRM Integration Settings"
            >
              <FiSettings size={14} className="text-pink-600" />
              <span className="hidden sm:inline">Configure Webhook</span>
              <span className="sm:hidden">Setup</span>
            </button>

            <button
              onClick={() => fetchLeads(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
              title="Refresh Leads"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div 
              onClick={() => window.location.href = '/portal/client/profile'}
              className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity"
              title="Profile Settings"
            >
              <div className="hidden sm:block text-right">
                <p suppressHydrationWarning className="text-sm font-bold text-gray-800 leading-tight">
                  {companyName || clientName || 'Client'}
                </p>
                <p className="text-[11px] text-gray-400 font-medium capitalize">Client Portal</p>
              </div>
              <div 
                className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm border border-pink-200"
                suppressHydrationWarning
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div 
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${statusFilter === 'all' ? 'border-pink-500 shadow-md ring-2 ring-pink-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Leads</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('New'); setCurrentPage(1); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${statusFilter === 'New' ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-200'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">New</p>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <p className="text-2xl font-black text-blue-700 mt-1">{stats.new}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('Contacted'); setCurrentPage(1); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${statusFilter === 'Contacted' ? 'border-amber-500 shadow-md ring-2 ring-amber-100' : 'border-gray-200 hover:border-amber-200'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Contacted</p>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <p className="text-2xl font-black text-amber-700 mt-1">{stats.contacted}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('Qualified'); setCurrentPage(1); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${statusFilter === 'Qualified' ? 'border-purple-500 shadow-md ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-200'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Qualified</p>
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              </div>
              <p className="text-2xl font-black text-purple-700 mt-1">{stats.qualified}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('Converted'); setCurrentPage(1); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${statusFilter === 'Converted' ? 'border-emerald-500 shadow-md ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-200'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Converted</p>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.converted}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('Lost'); setCurrentPage(1); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${statusFilter === 'Lost' ? 'border-rose-500 shadow-md ring-2 ring-rose-100' : 'border-gray-200 hover:border-rose-200'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Lost</p>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              </div>
              <p className="text-2xl font-black text-rose-700 mt-1">{stats.lost}</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search leads by customer name, phone, email, or inquiry..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FiX size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={memberFilter}
                onChange={(e) => {
                  setMemberFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              {/* Date Filter Preset Dropdown */}
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors border ${
                  startDate || endDate
                    ? 'bg-pink-50 border-pink-300 text-pink-700 font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
                title="Filter leads by date"
              >
                <option value="all">📅 All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range Sub-Bar (revealed when custom is chosen or when date filter is active) */}
          {(showCustomDate || startDate || endDate) && (
            <div className="bg-white p-3 rounded-xl border border-pink-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <FiCalendar size={14} className="text-pink-600" />
                  <span>Date Range:</span>
                </span>

                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-500">From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleCustomDateChange('start', e.target.value)}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                    />
                  </div>

                  <span className="text-gray-400 font-bold text-xs">—</span>

                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-500">To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleCustomDateChange('end', e.target.value)}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={clearDateFilter}
                className="px-3 py-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-pink-200"
                title="Clear Date Filter"
              >
                <FiX size={14} />
                <span>Reset Date Filter</span>
              </button>
            </div>
          )}

          {/* Leads Table / Cards */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500">Loading CRM leads...</p>
            </div>
          ) : !hasCrm ? (
            <div className="bg-white rounded-2xl border border-dashed border-pink-300 p-8 md:p-12 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
              <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mx-auto border border-pink-200">
                <FiKey size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Connect Your CRM Tenant</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Enter your CRM SaaS Company API Key below to instantly synchronize your customer inquiries, website form submissions, and Google/Meta ad leads.
                </p>
              </div>
              <form onSubmit={handleSaveApiKey} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
                <input
                  type="text"
                  placeholder="Paste CRM API Key (e.g. flymedia_wp_key_...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={savingConfig || !apiKeyInput.trim()}
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-pink-100 flex items-center justify-center gap-1.5"
                >
                  {savingConfig ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <FiZap size={14} />
                      <span>Connect CRM</span>
                    </>
                  )}
                </button>
              </form>
              <div className="text-[11px] text-gray-400 pt-1">
                Need help finding your CRM API key? Check your CRM SaaS Company Settings or contact support.
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <FiUsers size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-800">No Leads Found</h3>
              <p className="text-xs text-gray-500">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || memberFilter !== 'all' || startDate || endDate
                  ? 'No leads matched your search or date filter criteria.'
                  : 'You have not received any CRM leads yet.'}
              </p>
              {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || memberFilter !== 'all' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setMemberFilter('all');
                    clearDateFilter();
                  }}
                  className="px-4 py-2 bg-pink-50 text-pink-700 text-xs font-semibold rounded-lg hover:bg-pink-100 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Customer / Contact</th>
                      <th className="px-5 py-3.5">Inquiry & Subject</th>
                      <th className="px-5 py-3.5">Assigned To</th>
                      <th className="px-5 py-3.5">Priority</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Date Received</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {leads
                      .filter(l => {
                        if (memberFilter === 'all') return true;
                        if (memberFilter === 'unassigned') return !l.assigned_to;
                        return Number(l.assigned_to) === Number(memberFilter);
                      })
                      .map((lead) => {
                      const statusStyle = getStatusBadge(lead.status);
                      const customerName = lead.full_name?.trim() || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Anonymous';
                      const initial = customerName.charAt(0).toUpperCase();

                      return (
                        <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors group">
                          {/* Customer Name & Contacts */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <Link 
                                  href={`/portal/client/leads/${lead.id}`} 
                                  className="font-bold text-gray-900 hover:text-pink-600 transition-colors leading-tight inline-block"
                                >
                                  {customerName}
                                </Link>
                                <div className="flex items-center gap-2 mt-1">
                                  {lead.phone && (
                                    <span className="inline-flex items-center text-xs text-gray-600 gap-1">
                                      <a href={`tel:${lead.phone}`} className="hover:text-pink-600 transition-colors" title="Call">
                                        {lead.phone}
                                      </a>
                                      <button 
                                        onClick={(e) => handleCopyPhone(lead.phone, e)} 
                                        className="text-gray-400 hover:text-gray-700" 
                                        title="Copy Phone"
                                      >
                                        {copiedPhone === lead.phone ? <FiCheck size={12} className="text-emerald-600" /> : <FiCopy size={12} />}
                                      </button>
                                    </span>
                                  )}
                                  {lead.email && (
                                    <a href={`mailto:${lead.email}`} className="text-xs text-gray-500 hover:text-pink-600 transition-colors truncate max-w-[150px]" title={lead.email}>
                                      • {lead.email}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Subject & Message snippet */}
                          <td className="px-5 py-4 max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-800 text-xs truncate" title={lead.subject}>
                                {lead.subject || 'General Inquiry'}
                              </span>
                              <span className="px-1.5 py-0.2 bg-gray-100 text-[10px] text-gray-500 rounded border border-gray-200 shrink-0">
                                {lead.source || 'Website'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5" title={lead.message}>
                              {lead.message || 'No additional message.'}
                            </p>
                          </td>

                          {/* Assigned To (Member Selector) */}
                          <td className="px-5 py-4">
                            <div className="relative inline-block">
                              <select
                                value={lead.assigned_to ? String(lead.assigned_to) : ''}
                                onChange={(e) => handleAssignMember(lead.id, e.target.value)}
                                className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500 max-w-[155px] truncate ${lead.assigned_to ? 'bg-pink-50 text-pink-800 border-pink-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                title={lead.assigned_user_name ? `Assigned to ${lead.assigned_user_name}` : 'Click to assign member'}
                              >
                                <option value="">— Unassigned —</option>
                                {members.map(m => (
                                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(lead.priority)}`}>
                              {lead.priority || 'Medium'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusStyle.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                              {lead.status || 'New'}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(lead.created_at)}
                          </td>

                          {/* Actions (Three Dots Menu) */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => toggleActionMenu(e, lead)}
                              className={`p-2 rounded-xl transition-all border inline-flex items-center justify-center cursor-pointer ${
                                activeActionMenu?.lead?.id === lead.id
                                  ? 'bg-pink-100 text-pink-700 border-pink-300 ring-2 ring-pink-100'
                                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 border-transparent hover:border-gray-200'
                              }`}
                              title="Lead Actions (View, Edit, Call, WhatsApp, Email, Copy)"
                            >
                              <FiMoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Pagination Controls & Limit Selector */}
              <div className="px-5 py-4 bg-gray-50/90 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
                {/* Left Side: Summary & Limit Selector */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                  <span className="font-medium text-gray-700">
                    Showing <strong className="text-gray-900">{totalCount === 0 ? 0 : (currentPage - 1) * limit + 1}</strong> to <strong className="text-gray-900">{Math.min(currentPage * limit, totalCount)}</strong> of <strong className="text-gray-900">{totalCount}</strong> leads
                  </span>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300">
                    <label className="text-gray-500 font-medium">Rows per page:</label>
                    <select
                      value={limit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-2xs cursor-pointer hover:border-gray-300 transition-colors"
                      title="Rows per page limit"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>

                {/* Right Side: Page Numbers and Navigation Buttons */}
                <div className="flex items-center gap-1.5 w-full md:w-auto justify-center md:justify-end">
                  {/* First Page */}
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage <= 1 || loading}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all text-gray-700 shadow-2xs"
                    title="First Page"
                  >
                    <FiChevronsLeft size={16} />
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all text-gray-700 font-semibold shadow-2xs flex items-center gap-1"
                    title="Previous Page"
                  >
                    <FiChevronLeft size={15} />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-1.5 text-gray-400 select-none font-bold">
                            ...
                          </span>
                        );
                      }
                      const isCurrent = p === currentPage;
                      return (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          disabled={loading}
                          className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                            isCurrent
                              ? 'bg-pink-600 text-white shadow-xs'
                              : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all text-gray-700 font-semibold shadow-2xs flex items-center gap-1"
                    title="Next Page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <FiChevronRight size={15} />
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage >= totalPages || loading}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all text-gray-700 shadow-2xs"
                    title="Last Page"
                  >
                    <FiChevronsRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Menu (Three-Dots Dropdown) */}
      {activeActionMenu && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${activeActionMenu.top}px`,
            left: `${activeActionMenu.left}px`,
            minWidth: '210px',
            zIndex: 99999
          }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 px-1.5 animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100 text-left"
        >
          {/* Top Primary Actions: View & Edit */}
          <div className="py-1 space-y-0.5">
            <Link
              href={`/portal/client/leads/${activeActionMenu.lead.id}`}
              onClick={() => setActiveActionMenu(null)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-pink-700 hover:bg-pink-50 rounded-xl transition-colors"
            >
              <FiEye size={15} className="text-pink-600 flex-shrink-0" />
              <span>View Full Details</span>
            </Link>

            <button
              type="button"
              onClick={(e) => {
                const leadToEdit = activeActionMenu.lead;
                setActiveActionMenu(null);
                openEditModal(leadToEdit, e);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors text-left cursor-pointer"
            >
              <FiEdit3 size={15} className="text-blue-600 flex-shrink-0" />
              <span>Edit Lead</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const leadToView = activeActionMenu.lead;
                setActiveActionMenu(null);
                setSelectedLead(leadToView);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors text-left cursor-pointer"
            >
              <FiFileText size={15} className="text-purple-600 flex-shrink-0" />
              <span>Quick Preview</span>
            </button>
          </div>

          {/* Direct Communication Actions: Call & WhatsApp & Email */}
          {(activeActionMenu.lead.phone || activeActionMenu.lead.email) && (
            <div className="py-1 space-y-0.5">
              {activeActionMenu.lead.phone && (
                <>
                  <a
                    href={`tel:${activeActionMenu.lead.phone}`}
                    onClick={() => setActiveActionMenu(null)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <FiPhone size={15} className="text-emerald-600 flex-shrink-0" />
                    <span>Call Customer</span>
                  </a>

                  <a
                    href={`https://wa.me/${(activeActionMenu.lead.phone || '').replace(/[^0-9+]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setActiveActionMenu(null)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <FiMessageSquare size={15} className="text-green-600 flex-shrink-0" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </>
              )}

              {activeActionMenu.lead.email && (
                <a
                  href={`mailto:${activeActionMenu.lead.email}`}
                  onClick={() => setActiveActionMenu(null)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                >
                  <FiMail size={15} className="text-blue-600 flex-shrink-0" />
                  <span>Send Email</span>
                </a>
              )}
            </div>
          )}

          {/* Copy Info Actions */}
          <div className="py-1 space-y-0.5">
            {activeActionMenu.lead.phone && (
              <button
                type="button"
                onClick={() => {
                  handleCopyPhone(activeActionMenu.lead.phone);
                  setActiveActionMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors text-left cursor-pointer"
              >
                <FiCopy size={14} className="text-gray-400 flex-shrink-0" />
                <span>Copy Phone Number</span>
              </button>
            )}

            {activeActionMenu.lead.email && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeActionMenu.lead.email);
                  setActiveActionMenu(null);
                  Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Email copied to clipboard',
                    showConfirmButton: false,
                    timer: 1500
                  });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors text-left cursor-pointer"
              >
                <FiCopy size={14} className="text-gray-400 flex-shrink-0" />
                <span>Copy Email</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 font-bold text-sm flex items-center justify-center shadow-sm">
                  {(selectedLead.first_name || 'L').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    {selectedLead.full_name || `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim() || 'Lead Details'}
                  </h3>
                  <p className="text-xs text-gray-500">Lead ID: #{selectedLead.id} • Source: {selectedLead.source || 'Website'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Quick Contact Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {selectedLead.phone ? (
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
                  >
                    <FiPhone size={14} /> Call ({selectedLead.phone})
                  </a>
                ) : (
                  <div className="py-2.5 px-4 bg-gray-50 text-gray-400 rounded-xl text-xs font-semibold text-center">No Phone</div>
                )}

                {selectedLead.email ? (
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 transition-colors truncate"
                  >
                    <FiMail size={14} /> Email Customer
                  </a>
                ) : (
                  <div className="py-2.5 px-4 bg-gray-50 text-gray-400 rounded-xl text-xs font-semibold text-center">No Email</div>
                )}
              </div>

              {/* Inquiry Subject */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Subject / Purpose</span>
                <p className="font-bold text-gray-800 text-sm">{selectedLead.subject || 'Website Inquiry'}</p>
              </div>

              {/* Inquiry Message */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Full Message / Requirements</span>
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed mt-1">
                  {selectedLead.message || 'No additional message details provided.'}
                </p>
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Priority</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityBadge(selectedLead.priority)}`}>
                    {selectedLead.priority || 'Medium'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Received On</span>
                  <span className="text-xs font-semibold text-gray-800 mt-1 block">
                    {formatDate(selectedLead.created_at)}
                  </span>
                </div>
              </div>

              {/* Status Update Box */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <label className="text-xs font-bold text-gray-700 block">Update Lead Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['New', 'Contacted', 'Qualified', 'Converted', 'Lost'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${newStatus === st ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Optional note about this follow-up (e.g. called client, sent proposal)..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />

                <button
                  type="button"
                  onClick={handleUpdateLeadStatus}
                  disabled={updatingStatus || newStatus === selectedLead.status && !statusNote}
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {updatingStatus ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle size={14} />
                      <span>Save Status Update</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <FiEdit3 className="text-pink-600" size={18} />
                <h3 className="font-bold text-gray-900 text-base">Edit Lead #{editingLead.id}</h3>
              </div>
              <button onClick={() => setEditingLead(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
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
                  onClick={() => setEditingLead(null)}
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

      {/* CRM Integration & Webhook Setup Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-pink-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold shadow-xs">
                  <FiSettings size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">CRM Lead Sync & Webhook Configuration</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Capture inquiries from WordPress, Elementor, and ad campaigns directly into DeviceDesk.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Tenant Status & Credentials Box */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Connected CRM Tenant:</span>
                    <span className="text-sm font-black text-gray-900">
                      {crmCompany?.name || companyName || 'Not Linked'}
                    </span>
                    {crmCompany?.id && (
                      <span className="text-[11px] font-mono font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        ID: #{crmCompany.id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Sync Active
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateTestLead}
                      disabled={generatingTestLead || !hasCrm}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    >
                      {generatingTestLead ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <FiZap size={13} />
                          <span>Send Test Lead</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <FiKey size={14} className="text-pink-600" />
                      <span>CRM Company API Key</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyPlain(!showApiKeyPlain)}
                      className="text-[11px] font-semibold text-pink-600 hover:text-pink-700"
                    >
                      {showApiKeyPlain ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKeyPlain ? 'text' : 'password'}
                      readOnly
                      value={crmCompany?.apiKey || 'No key generated yet'}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(crmCompany?.apiKey, 'key')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                    >
                      {copiedKey ? <FiCheck className="text-emerald-600" size={14} /> : <FiCopy size={14} />}
                      <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                </div>

                {/* Webhook Ingestion URL */}
                <div>
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                    <FiLink size={14} className="text-blue-600" />
                    <span>CRM Lead Ingestion Webhook URL (Official API)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`, 'webhook')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs"
                    >
                      {copiedWebhook ? <FiCheck size={14} /> : <FiCopy size={14} />}
                      <span>{copiedWebhook ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Endpoint: <code className="font-mono font-bold text-pink-600">https://demo.socialflymediatech.com/api/leads/create</code> • Method: <span className="font-bold font-mono text-pink-600">POST</span> • Format: <span className="font-bold font-mono text-pink-600">JSON</span>
                  </p>
                </div>
              </div>

              {/* Integration Guides by Platform */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FiCode className="text-pink-600" size={16} />
                    <span>Step-by-Step Integration Guides</span>
                  </h4>
                  <span className="text-xs text-gray-400">Choose your form setup</span>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                  {[
                    { id: 'elementor', label: '🎨 Elementor Forms (WordPress)' },
                    { id: 'cf7', label: '📝 Contact Form 7' },
                    { id: 'wpforms', label: '📋 WPForms / Gravity' },
                    { id: 'curl', label: '⚡ cURL / Zapier / Meta' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveGuideTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGuideTab === tab.id ? 'bg-pink-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Elementor */}
                {activeGuideTab === 'elementor' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">How to connect an Elementor Pro Form in 3 easy steps:</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                      <li>Open your WordPress page in the <strong>Elementor Editor</strong> and select your Contact Form.</li>
                      <li>In the left panel under <strong>Actions After Submit</strong>, add <strong>Webhook</strong>.</li>
                      <li>
                        Under the new <strong>Webhook</strong> section that appears, paste your Webhook URL:
                        <code className="block my-1.5 p-2 bg-gray-900 text-pink-400 font-mono rounded-lg break-all select-all">
                          {`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`}
                        </code>
                      </li>
                      <li>Make sure your form field names or Shortcode IDs are named: <code className="font-mono bg-gray-200 px-1 rounded">name</code>, <code className="font-mono bg-gray-200 px-1 rounded">email</code>, <code className="font-mono bg-gray-200 px-1 rounded">phone</code>, and <code className="font-mono bg-gray-200 px-1 rounded">message</code>.</li>
                      <li>Click <strong>Update / Publish</strong>. Your form submissions will now instantly appear in your CRM Leads portal!</li>
                    </ol>
                  </div>
                )}

                {/* Tab 2: Contact Form 7 */}
                {activeGuideTab === 'cf7' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">Paste this code snippet at the bottom of your theme's <code className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">functions.php</code> file:</p>
                    <pre className="p-3 bg-gray-900 text-emerald-400 font-mono rounded-xl text-[11px] overflow-x-auto leading-relaxed select-all">
{`add_action('wpcf7_mail_sent', function($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;
    $data = $submission->get_posted_data();

    $payload = [
        'name'    => sanitize_text_field($data['your-name'] ?? ''),
        'email'   => sanitize_email($data['your-email'] ?? ''),
        'phone'   => sanitize_text_field($data['your-phone'] ?? ''),
        'subject' => sanitize_text_field($data['your-subject'] ?? 'Website Inquiry'),
        'message' => sanitize_textarea_field($data['your-message'] ?? ''),
        'source'  => 'Contact Form 7'
    ];

    wp_remote_post('https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}', [
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => json_encode($payload),
        'timeout' => 15
    ]);
});`}
                    </pre>
                  </div>
                )}

                {/* Tab 3: WPForms / Gravity */}
                {activeGuideTab === 'wpforms' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">Configuring WPForms or Gravity Forms Webhook Add-on:</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                      <li>Ensure the <strong>Webhooks Add-on</strong> is active in your WordPress form plugin.</li>
                      <li>Navigate to <strong>Form Settings &gt; Webhooks &gt; Add New</strong>.</li>
                      <li>Set <strong>Request URL</strong> to your Webhook URL:
                        <code className="block my-1.5 p-2 bg-gray-900 text-pink-400 font-mono rounded-lg break-all select-all">
                          {`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`}
                        </code>
                      </li>
                      <li>Set <strong>Request Method</strong> to <strong>POST</strong> and <strong>Request Format</strong> to <strong>JSON</strong>.</li>
                      <li>Map your form fields to: <code className="font-mono bg-gray-200 px-1 rounded">name</code>, <code className="font-mono bg-gray-200 px-1 rounded">email</code>, <code className="font-mono bg-gray-200 px-1 rounded">phone</code>, <code className="font-mono bg-gray-200 px-1 rounded">subject</code>, and <code className="font-mono bg-gray-200 px-1 rounded">message</code>.</li>
                    </ol>
                  </div>
                )}

                {/* Tab 4: cURL / Zapier / Meta */}
                {activeGuideTab === 'curl' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">Direct HTTP Request Specification:</p>
                    <pre className="p-3 bg-gray-900 text-pink-300 font-mono rounded-xl text-[11px] overflow-x-auto leading-relaxed select-all">
{`curl -X POST "https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Alex Johnson",
    "email": "alex.johnson@example.com",
    "phone": "+91 9876543210",
    "subject": "Quote Request",
    "message": "Interested in digital marketing packages.",
    "source": "Google Ads Landing Page"
  }'`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Change / Reconnect API Key */}
              <div className="pt-4 border-t border-gray-200">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center justify-between list-none">
                    <span className="flex items-center gap-1.5">
                      <FiKey size={14} /> Connect a Different CRM SaaS Company API Key
                    </span>
                    <span className="text-[11px] font-normal text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <form onSubmit={handleSaveApiKey} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Enter new CRM API Key..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={savingConfig || !apiKeyInput.trim()}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs"
                    >
                      {savingConfig ? 'Updating...' : 'Save & Link'}
                    </button>
                  </form>
                </details>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <FiEdit3 className="text-pink-600" size={18} />
                <h3 className="font-bold text-gray-900 text-base">Edit Lead #{editingLead.id}</h3>
              </div>
              <button onClick={() => setEditingLead(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
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
                  onClick={() => setEditingLead(null)}
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

      {/* CRM Integration & Webhook Setup Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-pink-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold shadow-xs">
                  <FiSettings size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">CRM Lead Sync & Webhook Configuration</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Capture inquiries from WordPress, Elementor, and ad campaigns directly into DeviceDesk.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Tenant Status & Credentials Box */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Connected CRM Tenant:</span>
                    <span className="text-sm font-black text-gray-900">
                      {crmCompany?.name || companyName || 'Not Linked'}
                    </span>
                    {crmCompany?.id && (
                      <span className="text-[11px] font-mono font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        ID: #{crmCompany.id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Sync Active
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateTestLead}
                      disabled={generatingTestLead || !hasCrm}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    >
                      {generatingTestLead ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <FiZap size={13} />
                          <span>Send Test Lead</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <FiKey size={14} className="text-pink-600" />
                      <span>CRM Company API Key</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyPlain(!showApiKeyPlain)}
                      className="text-[11px] font-semibold text-pink-600 hover:text-pink-700"
                    >
                      {showApiKeyPlain ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKeyPlain ? 'text' : 'password'}
                      readOnly
                      value={crmCompany?.apiKey || 'No key generated yet'}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(crmCompany?.apiKey, 'key')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                    >
                      {copiedKey ? <FiCheck className="text-emerald-600" size={14} /> : <FiCopy size={14} />}
                      <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                </div>

                {/* Webhook Ingestion URL */}
                <div>
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                    <FiLink size={14} className="text-blue-600" />
                    <span>CRM Lead Ingestion Webhook URL (Official API)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`, 'webhook')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs"
                    >
                      {copiedWebhook ? <FiCheck size={14} /> : <FiCopy size={14} />}
                      <span>{copiedWebhook ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Endpoint: <code className="font-mono font-bold text-pink-600">https://demo.socialflymediatech.com/api/leads/create</code> • Method: <span className="font-bold font-mono text-pink-600">POST</span> • Format: <span className="font-bold font-mono text-pink-600">JSON</span>
                  </p>
                </div>
              </div>

              {/* Integration Guides by Platform */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FiCode className="text-pink-600" size={16} />
                    <span>Step-by-Step Integration Guides</span>
                  </h4>
                  <span className="text-xs text-gray-400">Choose your form setup</span>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                  {[
                    { id: 'elementor', label: '🎨 Elementor Forms (WordPress)' },
                    { id: 'cf7', label: '📝 Contact Form 7' },
                    { id: 'wpforms', label: '📋 WPForms / Gravity' },
                    { id: 'curl', label: '⚡ cURL / Zapier / Meta' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveGuideTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGuideTab === tab.id ? 'bg-pink-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Elementor */}
                {activeGuideTab === 'elementor' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">How to connect an Elementor Pro Form in 3 easy steps:</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                      <li>Open your WordPress page in the <strong>Elementor Editor</strong> and select your Contact Form.</li>
                      <li>In the left panel under <strong>Actions After Submit</strong>, add <strong>Webhook</strong>.</li>
                      <li>
                        Under the new <strong>Webhook</strong> section that appears, paste your Webhook URL:
                        <code className="block my-1.5 p-2 bg-gray-900 text-pink-400 font-mono rounded-lg break-all select-all">
                          {`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`}
                        </code>
                      </li>
                      <li>Make sure your form field names or Shortcode IDs are named: <code className="font-mono bg-gray-200 px-1 rounded">name</code>, <code className="font-mono bg-gray-200 px-1 rounded">email</code>, <code className="font-mono bg-gray-200 px-1 rounded">phone</code>, and <code className="font-mono bg-gray-200 px-1 rounded">message</code>.</li>
                      <li>Click <strong>Update / Publish</strong>. Your form submissions will now instantly appear in your CRM Leads portal!</li>
                    </ol>
                  </div>
                )}

                {/* Tab 2: Contact Form 7 */}
                {activeGuideTab === 'cf7' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">Paste this code snippet at the bottom of your theme's <code className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">functions.php</code> file:</p>
                    <pre className="p-3 bg-gray-900 text-emerald-400 font-mono rounded-xl text-[11px] overflow-x-auto leading-relaxed select-all">
{`add_action('wpcf7_mail_sent', function($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;
    $data = $submission->get_posted_data();

    $payload = [
        'name'    => sanitize_text_field($data['your-name'] ?? ''),
        'email'   => sanitize_email($data['your-email'] ?? ''),
        'phone'   => sanitize_text_field($data['your-phone'] ?? ''),
        'subject' => sanitize_text_field($data['your-subject'] ?? 'Website Inquiry'),
        'message' => sanitize_textarea_field($data['your-message'] ?? ''),
        'source'  => 'Contact Form 7'
    ];

    wp_remote_post('https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}', [
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => json_encode($payload),
        'timeout' => 15
    ]);
});`}
                    </pre>
                  </div>
                )}

                {/* Tab 3: WPForms / Gravity */}
                {activeGuideTab === 'wpforms' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">Configuring WPForms or Gravity Forms Webhook Add-on:</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                      <li>Ensure the <strong>Webhooks Add-on</strong> is active in your WordPress form plugin.</li>
                      <li>Navigate to <strong>Form Settings &gt; Webhooks &gt; Add New</strong>.</li>
                      <li>Set <strong>Request URL</strong> to your Webhook URL:
                        <code className="block my-1.5 p-2 bg-gray-900 text-pink-400 font-mono rounded-lg break-all select-all">
                          {`https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}`}
                        </code>
                      </li>
                      <li>Set <strong>Request Method</strong> to <strong>POST</strong> and <strong>Request Format</strong> to <strong>JSON</strong>.</li>
                      <li>Map your form fields to: <code className="font-mono bg-gray-200 px-1 rounded">name</code>, <code className="font-mono bg-gray-200 px-1 rounded">email</code>, <code className="font-mono bg-gray-200 px-1 rounded">phone</code>, <code className="font-mono bg-gray-200 px-1 rounded">subject</code>, and <code className="font-mono bg-gray-200 px-1 rounded">message</code>.</li>
                    </ol>
                  </div>
                )}

                {/* Tab 4: cURL / Zapier / Meta */}
                {activeGuideTab === 'curl' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5">
                    <p className="font-bold text-gray-900">Direct HTTP Request Specification:</p>
                    <pre className="p-3 bg-gray-900 text-pink-300 font-mono rounded-xl text-[11px] overflow-x-auto leading-relaxed select-all">
{`curl -X POST "https://demo.socialflymediatech.com/api/leads/create?api_key=${crmCompany?.apiKey || 'acme_wp_integration_key_xyz_2026'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Alex Johnson",
    "email": "alex.johnson@example.com",
    "phone": "+91 9876543210",
    "subject": "Quote Request",
    "message": "Interested in digital marketing packages.",
    "source": "Google Ads Landing Page"
  }'`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Change / Reconnect API Key */}
              <div className="pt-4 border-t border-gray-200">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center justify-between list-none">
                    <span className="flex items-center gap-1.5">
                      <FiKey size={14} /> Connect a Different CRM SaaS Company API Key
                    </span>
                    <span className="text-[11px] font-normal text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <form onSubmit={handleSaveApiKey} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Enter new CRM API Key..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={savingConfig || !apiKeyInput.trim()}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs"
                    >
                      {savingConfig ? 'Updating...' : 'Save & Link'}
                    </button>
                  </form>
                </details>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

