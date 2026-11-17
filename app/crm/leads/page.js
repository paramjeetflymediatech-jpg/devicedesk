'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiTarget, FiSearch, FiFilter, FiPlus, FiRefreshCw, FiPhone, FiMail, 
  FiCalendar, FiClock, FiEdit2, FiTrash2, FiCheck, FiX, FiExternalLink, 
  FiAlertCircle, FiCheckCircle, FiChevronLeft, FiChevronRight, FiMessageSquare,
  FiTrendingUp, FiCopy, FiTag, FiBriefcase, FiUsers, FiLayers, FiZap, FiArrowRight
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import Pagination from '@/app/components/Pagination.js';

export default function CrmTeamLeadsPage({ initialViewMode = 'table' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View Mode: 'table' | 'calendar'
  const [viewMode, setViewMode] = useState(initialViewMode || 'table');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDay, setCalendarSelectedDay] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [calendarFilter, setCalendarFilter] = useState('selected'); // 'selected' | 'today' | 'overdue' | 'upcoming' | 'all'

  // Sync viewMode from URL query if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get('view');
      if (v === 'calendar' || v === 'table') {
        setViewMode(v);
      }
    }
  }, []);

  const handleSwitchView = (mode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', mode);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Data
  const [leads, setLeads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    in_progress: 0,
    converted: 0,
    lost: 0
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState('overview'); // 'overview' | 'notes'
  const [leadNotes, setLeadNotes] = useState([]);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Add Lead Form
  const [addForm, setAddForm] = useState({
    company_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    status: 'New',
    priority: 'Medium',
    lead_score: 50
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Lead Form
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Schedule Follow-up Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingLead, setSchedulingLead] = useState(null);
  const [scheduleLeadId, setScheduleLeadId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('Contacted');
  const [scheduleNote, setScheduleNote] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Helper to extract YYYY-MM-DD cleanly
  const getLeadDateStr = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Group leads by follow-up date
  const leadsByFollowUpMap = useMemo(() => {
    const map = {};
    leads.forEach((l) => {
      const dStr = getLeadDateStr(l.follow_up_date);
      if (dStr) {
        if (!map[dStr]) map[dStr] = [];
        map[dStr].push(l);
      }
    });
    return map;
  }, [leads]);

  // Compute follow-up statistics
  const followUpStats = useMemo(() => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    let total = 0;
    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;

    leads.forEach((l) => {
      const dStr = getLeadDateStr(l.follow_up_date);
      if (dStr) {
        total++;
        if (dStr === todayStr) {
          todayCount++;
        } else if (dStr < todayStr) {
          overdueCount++;
        } else {
          upcomingCount++;
        }
      }
    });

    return { total, todayCount, overdueCount, upcomingCount, todayStr };
  }, [leads]);

  // Generate 7-column calendar days array for the visible month
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [calendarMonth]);

  // Filter leads shown in the Agenda panel
  const agendaLeads = useMemo(() => {
    const todayStr = followUpStats.todayStr;

    if (calendarFilter === 'today') {
      return leads.filter((l) => getLeadDateStr(l.follow_up_date) === todayStr);
    }
    if (calendarFilter === 'overdue') {
      return leads.filter((l) => {
        const d = getLeadDateStr(l.follow_up_date);
        return d && d < todayStr;
      }).sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
    }
    if (calendarFilter === 'upcoming') {
      return leads.filter((l) => {
        const d = getLeadDateStr(l.follow_up_date);
        return d && d > todayStr;
      }).sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
    }
    if (calendarFilter === 'all') {
      return leads.filter((l) => !!l.follow_up_date).sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
    }
    // Default: 'selected' date
    return (leadsByFollowUpMap[calendarSelectedDay] || []).slice().sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
  }, [leads, calendarFilter, calendarSelectedDay, followUpStats.todayStr, leadsByFollowUpMap]);

  // Fetch Leads Function
  const fetchLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const isCal = viewMode === 'calendar';
      const effectiveLimit = isCal ? 500 : pageSize;

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(effectiveLimit),
        companyId: selectedCompanyId,
        status: statusFilter,
        priority: priorityFilter,
        search: searchTerm,
        view: viewMode
      });

      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/crm/leads?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLeads(data.data || []);
        setCompanies(data.companies || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) {
          setTotalCount(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        console.error('Leads fetch error:', data.error);
      }
    } catch (err) {
      console.error('Leads fetch exception:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize, selectedCompanyId, statusFilter, priorityFilter, searchTerm, startDate, endDate, viewMode]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Open Add Lead Modal
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      company_id: companies[0]?.id ? String(companies[0].id) : '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      status: 'New',
      priority: 'Medium',
      lead_score: 50
    });
    setShowAddModal(true);
  }, [companies]);

  // Listen for global navbar quick-action
  useEffect(() => {
    const onOpenAdd = () => handleOpenAdd();
    window.addEventListener('crm_open_add_lead', onOpenAdd);
    return () => window.removeEventListener('crm_open_add_lead', onOpenAdd);
  }, [handleOpenAdd]);

  // Handle Preset Date changes
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setCurrentPage(1);

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setShowCustomDate(false);
    } else if (preset === 'today') {
      const t = fmt(today);
      setStartDate(t);
      setEndDate(t);
      setShowCustomDate(false);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setStartDate(fmt(past));
      setEndDate(fmt(today));
      setShowCustomDate(false);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setStartDate(fmt(past));
      setEndDate(fmt(today));
      setShowCustomDate(false);
    } else if (preset === 'custom') {
      setShowCustomDate(true);
    }
  };

  // Open Lead Details & Activity Drawer
  const handleOpenLeadDetails = async (lead) => {
    setSelectedLead(lead);
    setIsEditing(false);
    setEditForm({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || 'New',
      priority: lead.priority || 'Medium',
      subject: lead.subject || '',
      message: lead.message || '',
      lead_score: lead.lead_score || 50
    });
    setActiveDetailsTab('overview');
    setShowDetailsModal(true);

    // Fetch Notes for this lead
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_notes', lead_id: lead.id })
      });
      const data = await res.json();
      if (data.success) {
        setLeadNotes(data.data || []);
      }
    } catch (e) {
      console.error('Fetch notes error:', e);
    }
  };

  // Add a Note to Lead
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteInput.trim() || !selectedLead) return;

    try {
      setSavingNote(true);
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_note',
          lead_id: selectedLead.id,
          note: newNoteInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setLeadNotes([data.data, ...leadNotes]);
        setNewNoteInput('');
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to add note' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error posting note' });
    } finally {
      setSavingNote(false);
    }
  };

  // Create Lead
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!addForm.company_id) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select a company for this lead' });
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_lead',
          ...addForm
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Lead Added',
          text: 'New inquiry added to your pipeline.',
          timer: 1500,
          showConfirmButton: false
        });
        setShowAddModal(false);
        fetchLeads();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to add lead' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error saving lead' });
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Save Lead Edits
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      setSavingEdit(true);
      const res = await fetch('/api/crm/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_lead',
          lead_id: selectedLead.id,
          ...editForm
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Lead Updated',
          timer: 1500,
          showConfirmButton: false
        });
        setSelectedLead({ ...selectedLead, ...editForm });
        setIsEditing(false);
        fetchLeads();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to update lead' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error updating lead' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Schedule Follow-up Modal
  const handleOpenSchedule = (lead = null, defaultDateStr = '') => {
    setSchedulingLead(lead);
    setScheduleLeadId(lead?.id ? String(lead.id) : (leads[0]?.id ? String(leads[0].id) : ''));
    setScheduleStatus(lead?.status || 'Contacted');

    if (defaultDateStr) {
      setScheduleDate(`${defaultDateStr}T10:00`);
    } else if (lead?.follow_up_date) {
      const dt = new Date(lead.follow_up_date);
      const pad = (n) => String(n).padStart(2, '0');
      const formatted = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      setScheduleDate(formatted);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      const formatted = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`;
      setScheduleDate(formatted);
    }
    setScheduleNote('');
    setShowScheduleModal(true);
  };

  // Save Follow-up
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    const targetLeadId = schedulingLead?.id || scheduleLeadId;
    if (!scheduleDate || !targetLeadId) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select a lead and date/time' });
      return;
    }

    try {
      setSavingSchedule(true);
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule_follow_up',
          lead_id: targetLeadId,
          follow_up_date: scheduleDate,
          status: scheduleStatus,
          note: scheduleNote
        })
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Follow-up Scheduled',
          text: `Reminder set for ${new Date(scheduleDate).toLocaleString()}.`,
          timer: 1500,
          showConfirmButton: false
        });
        setShowScheduleModal(false);
        fetchLeads();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to schedule follow-up' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error scheduling follow-up' });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Mark Follow-up Completed / Cleared
  const handleClearFollowUp = async (lead) => {
    const result = await Swal.fire({
      title: 'Complete Follow-up?',
      text: `Mark reminder for ${lead.full_name || 'lead'} as done?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Mark Done',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/crm/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'clear_follow_up',
            lead_id: lead.id
          })
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Follow-up Cleared',
            timer: 1500,
            showConfirmButton: false
          });
          fetchLeads();
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to clear follow-up' });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error updating follow-up' });
      }
    }
  };

  // Badge Helpers - Standard Admin Panel Theme (Light & Dark)
  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'new': 
        return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'contacted': 
        return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'qualified': 
        return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'in progress':
      case 'in_progress': 
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800';
      case 'converted': 
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'lost': 
        return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      default: 
        return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'high': 
        return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'medium': 
        return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'low': 
        return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default: 
        return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header (Matches Admin Panel Design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              {viewMode === 'calendar' ? <FiCalendar size={20} /> : <FiTarget size={20} />}
            </span>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {viewMode === 'calendar' ? 'Follow-up Calendar' : 'CRM Leads Pipeline'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {viewMode === 'calendar' ? 'CALENDAR' : 'PORTAL'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {viewMode === 'calendar'
              ? 'Track scheduled customer calls, upcoming appointments, and daily reminders across your assigned companies.'
              : 'Manage inquiries, customer follow-ups, and lead conversion for your assigned client companies.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* View Mode Toggle Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleSwitchView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FiLayers size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FiCalendar size={13} />
              <span>Calendar</span>
              {followUpStats.total > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                  {followUpStats.total}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchLeads(true)}
            disabled={refreshing}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="Refresh pipeline"
          >
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Responsive KPI Stat Cards (Admin Theme) */}
      <div className="grid grid-cols-3 mobile-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-3">
        {/* Total Leads */}
        <div className="p-2 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">Total</span>
            <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 items-center justify-center font-bold shrink-0">
              <FiLayers size={13} />
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total || 0}</div>
        </div>

        {/* New Leads */}
        <div className="p-2 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">New</span>
            <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 items-center justify-center font-bold shrink-0">
              <FiZap size={13} />
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{stats.new || 0}</div>
        </div>

        {/* Contacted */}
        <div className="p-2 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">Contacted</span>
            <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 items-center justify-center font-bold shrink-0">
              <FiPhone size={13} />
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.contacted || 0}</div>
        </div>

        {/* Qualified */}
        <div className="p-2 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block truncate">Qualified</span>
            <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 items-center justify-center font-bold shrink-0">
              <FiCheckCircle size={13} />
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.qualified || 0}</div>
        </div>

        {/* Converted */}
        <div className="p-2 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">Converted</span>
            <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 items-center justify-center font-bold shrink-0">
              <FiTrendingUp size={13} />
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.converted || 0}</div>
        </div>

        {/* Lost */}
        <div className="p-2 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block truncate">Lost</span>
            <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 items-center justify-center font-bold shrink-0">
              <FiX size={13} />
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.lost || 0}</div>
        </div>
      </div>

      {/* Filters Toolbar (Admin Slate / White Theme) */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Company Filter */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Filter by Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="all">🏢 All Assigned ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Lead Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="In Progress">In Progress</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Search Leads
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-slate-400 dark:text-slate-500" size={13} />
              </div>
              <input
                type="text"
                placeholder="Name, phone, email, subject..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-700/70">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] sm:text-[11px] mr-1 shrink-0">Date:</span>
            {['all', 'today', '7days', '30days', 'custom'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleDatePresetChange(preset)}
                className={`px-3 py-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer shrink-0 ${
                  datePreset === preset
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {preset === 'all' && 'All Time'}
                {preset === 'today' && 'Today'}
                {preset === '7days' && '7 Days'}
                {preset === '30days' && '30 Days'}
                {preset === 'custom' && 'Custom'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {showCustomDate && (
              <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs flex-1 sm:flex-none outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs flex-1 sm:flex-none outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Create a new lead inquiry"
            >
              <FiPlus size={14} />
              <span>Add Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN CONTAINER: DUAL VIEW (CALENDAR vs TABLE)             */}
      {/* ======================================================== */}
      {viewMode === 'calendar' ? (
        /* ======================================================== */
        /* VIEW 1: FOLLOW-UP CALENDAR                               */
        /* ======================================================== */
        <div className="space-y-4">
          {/* Calendar Month Navigation & Filter Controls Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Month Navigator */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(calendarMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCalendarMonth(prev);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <FiChevronLeft size={16} />
                </button>

                <span className="px-3 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white min-w-[130px] text-center select-none">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calendarMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCalendarMonth(next);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCalendarMonth(today);
                  const pad = (n) => String(n).padStart(2, '0');
                  setCalendarSelectedDay(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
                  setCalendarFilter('selected');
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* Quick Filter Status Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setCalendarFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  calendarFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Scheduled</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  calendarFilter === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                }`}>
                  {followUpStats.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalendarFilter('today');
                  setCalendarMonth(new Date());
                  setCalendarSelectedDay(followUpStats.todayStr);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  calendarFilter === 'today'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                <span>Today</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  calendarFilter === 'today' ? 'bg-blue-700 text-white' : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                }`}>
                  {followUpStats.todayCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarFilter('overdue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  calendarFilter === 'overdue'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <span>Overdue</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  calendarFilter === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200'
                }`}>
                  {followUpStats.overdueCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarFilter('upcoming')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  calendarFilter === 'upcoming'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <span>Upcoming</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  calendarFilter === 'upcoming' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                }`}>
                  {followUpStats.upcomingCount}
                </span>
              </button>
            </div>
          </div>

          {/* Calendar Month Grid + Side Agenda Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Col 1 & 2: Month Calendar Grid */}
            <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                {/* Weekday Labels */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* 7-Col Days Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {calendarDays.map((item, idx) => {
                    if (!item) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="min-h-[75px] sm:min-h-[92px] rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-dashed border-slate-200/50 dark:border-slate-800/50"
                        />
                      );
                    }

                    const dayLeads = leadsByFollowUpMap[item.dateStr] || [];
                    const isSelected = calendarSelectedDay === item.dateStr && calendarFilter === 'selected';
                    const isToday = item.dateStr === followUpStats.todayStr;
                    const hasFollowups = dayLeads.length > 0;

                    return (
                      <div
                        key={item.dateStr}
                        onClick={() => {
                          setCalendarSelectedDay(item.dateStr);
                          setCalendarFilter('selected');
                        }}
                        className={`min-h-[75px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group ${
                          isSelected
                            ? 'ring-2 ring-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 shadow-sm'
                            : isToday
                            ? 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs'
                            : hasFollowups
                            ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-xs'
                            : 'border-slate-200/80 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        {/* Top Bar of cell: Date number & Count badge */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-black inline-flex items-center justify-center w-5 h-5 rounded-md ${
                              isToday
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : isSelected
                                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.day}
                          </span>

                          {hasFollowups && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-600 text-white shadow-xs">
                              {dayLeads.length}
                            </span>
                          )}
                        </div>

                        {/* Lead snippets / chips */}
                        <div className="space-y-1 my-1 overflow-hidden">
                          {dayLeads.slice(0, 2).map((dl) => (
                            <div
                              key={dl.id}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50"
                              title={`${dl.full_name || 'Lead'} - ${dl.company_name}`}
                            >
                              {dl.full_name?.split(' ')[0] || 'Lead'}
                              {dl.follow_up_date && (
                                <span className="text-[8px] opacity-75 ml-1">
                                  {new Date(dl.follow_up_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ))}
                          {dayLeads.length > 2 && (
                            <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 text-right pr-0.5">
                              +{dayLeads.length - 2} more
                            </div>
                          )}
                        </div>

                        {/* Bottom indicator if today */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          {isToday && <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400">Today</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-indigo-600 inline-block" />
                    <span>Today</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-indigo-100 border border-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-700 inline-block" />
                    <span>Scheduled Follow-ups</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md border-2 border-indigo-600 inline-block" />
                    <span>Selected Day</span>
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Click any day to view its scheduled follow-up agenda
                </span>
              </div>
            </div>

            {/* Col 3: Selected Day Agenda & Contact Action Panel */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              {/* Agenda Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/70 mb-3.5">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                    {calendarFilter === 'selected'
                      ? 'Follow-up Agenda'
                      : calendarFilter === 'today'
                      ? "Today's Schedule"
                      : calendarFilter === 'overdue'
                      ? 'Overdue Queue'
                      : calendarFilter === 'upcoming'
                      ? 'Upcoming Follow-ups'
                      : 'All Scheduled'}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FiCalendar className="text-indigo-600 dark:text-indigo-400" size={16} />
                    <span>
                      {calendarFilter === 'selected' && calendarSelectedDay
                        ? new Date(calendarSelectedDay + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : calendarFilter.toUpperCase()}
                    </span>
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSchedule(null, calendarSelectedDay)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
                  title="Schedule a follow-up for this day"
                >
                  <FiPlus size={13} />
                  <span>Schedule</span>
                </button>
              </div>

              {/* Agenda Cards List */}
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[560px] pr-1">
                {agendaLeads.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                      <FiClock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        No follow-ups for {calendarFilter === 'selected' ? 'this date' : calendarFilter}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Click "Schedule" above to set a reminder or select another day.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSchedule(null, calendarSelectedDay)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                    >
                      + Schedule Follow-up Now
                    </button>
                  </div>
                ) : (
                  agendaLeads.map((lead) => {
                    const name = lead.full_name?.trim() || 'Direct Inquiry';
                    const cleanPhone = (lead.phone || '').replace(/[^0-9+]/g, '');
                    const waPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                    const leadDateStr = getLeadDateStr(lead.follow_up_date);
                    const isOverdue = leadDateStr && leadDateStr < followUpStats.todayStr;

                    return (
                      <div
                        key={lead.id}
                        className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                          isOverdue
                            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/15'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
                        }`}
                      >
                        {/* Lead Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenLeadDetails(lead)}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left text-xs sm:text-sm block truncate cursor-pointer transition-colors"
                            >
                              {name}
                            </button>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                                🏢 {lead.company_name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${getStatusBadge(lead.status)}`}>
                              {lead.status}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getPriorityBadge(lead.priority)}`}>
                              {lead.priority}
                            </span>
                          </div>
                        </div>

                        {/* Scheduled Time & Subject */}
                        <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <FiClock size={12} className={isOverdue ? 'text-rose-500' : 'text-indigo-500'} />
                              <span>
                                {lead.follow_up_date
                                  ? new Date(lead.follow_up_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'All Day'}
                              </span>
                              {isOverdue && (
                                <span className="ml-1 text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase">
                                  (Overdue)
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {leadDateStr}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Inquiry:</span>{' '}
                            {lead.subject || lead.message || 'General customer inquiry'}
                          </p>
                        </div>

                        {/* Direct Contact & Follow-up Actions */}
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors"
                              title={`Call ${name}`}
                            >
                              <FiPhone size={11} />
                              <span>Call</span>
                            </a>
                          )}

                          {waPhone && (
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                              title={`WhatsApp chat with ${name}`}
                            >
                              <FiMessageSquare size={11} />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenSchedule(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                            title="Change follow-up date/time"
                          >
                            <FiClock size={11} />
                            <span>Reschedule</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClearFollowUp(lead)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold transition-colors cursor-pointer"
                            title="Mark follow-up done"
                          >
                            <FiCheckCircle size={12} />
                            <span>Done</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenLeadDetails(lead)}
                            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition-colors cursor-pointer"
                            title="View Lead Details"
                          >
                            <span>Details</span>
                            <FiArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* VIEW 2: TABLE & MOBILE CARDS                             */
        /* ======================================================== */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading leads pipeline...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2 p-4">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No leads found matching criteria.</p>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {companies.length === 0 
                ? 'You do not have any client companies assigned yet. Contact Superadmin to assign companies.'
                : 'Try adjusting your filters or click "+ Add Lead" to record an inquiry.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">Contact / Lead</th>
                    <th className="py-3.5 px-4">Company</th>
                    <th className="py-3.5 px-4">Inquiry / Subject</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Follow-up</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-800 dark:text-slate-200">
                  {leads.map((lead) => {
                    const name = lead.full_name?.trim() || 'Direct Inquiry';
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                        {/* Contact Info */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenLeadDetails(lead)}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left block text-xs cursor-pointer transition-colors"
                          >
                            {name}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {lead.phone && <span>📞 {lead.phone}</span>}
                            {lead.email && <span className="truncate max-w-[150px]">✉️ {lead.email}</span>}
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 block">{lead.company_name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID #{lead.company_id}</span>
                        </td>

                        {/* Subject */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <p className="font-medium text-slate-700 dark:text-slate-300 truncate" title={lead.subject}>
                            {lead.subject || 'Website Inquiry'}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadge(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityBadge(lead.priority)}`}>
                            {lead.priority}
                          </span>
                        </td>

                        {/* Follow-up */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {lead.follow_up_date ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                              <FiCalendar size={12} />
                              {new Date(lead.follow_up_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">None set</span>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                title="Direct Phone Call"
                              >
                                <FiPhone size={13} />
                              </a>
                            )}
                            {lead.phone && (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/30 transition-colors text-[11px] font-bold"
                                title="Chat on WhatsApp"
                              >
                                WA
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenSchedule(lead)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                              title="Schedule Follow-up"
                            >
                              <FiCalendar size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenLeadDetails(lead)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px] border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                            >
                              Details &rarr;
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
              {leads.map((lead) => {
                const name = lead.full_name?.trim() || 'Direct Inquiry';
                return (
                  <div key={lead.id} className="p-3.5 space-y-2.5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleOpenLeadDetails(lead)}
                          className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left text-sm truncate block"
                        >
                          {name}
                        </button>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate">
                          🏢 {lead.company_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusBadge(lead.status)}`}>
                          {lead.status}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityBadge(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      </div>
                    </div>

                    {/* Subject / Message preview */}
                    {lead.subject && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        {lead.subject}
                      </p>
                    )}

                    {/* Contact Bar & Date */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800"
                            title="Call"
                          >
                            <FiPhone size={13} />
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-[#25D366]/15 text-[#25D366] font-bold text-[10px] border border-[#25D366]/30"
                            title="WhatsApp"
                          >
                            WA
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenSchedule(lead)}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-800"
                          title="Schedule"
                        >
                          <FiCalendar size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenLeadDetails(lead)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] border border-slate-200 dark:border-slate-600"
                        >
                          Details &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
            itemName="leads"
          />
        </div>
      </div>
    )}

      {/* ============================================================= */}
      {/* 1. ADD LEAD MODAL (Responsive Portal with Admin Styling)       */}
      {/* ============================================================= */}
      {mounted && showAddModal && createPortal(
        <div role="dialog" aria-modal="true" className="modal-portal fixed inset-0 z-[999999] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full sm:max-w-xl bg-white dark:bg-slate-800 sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-700 flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Sticky Header */}
            <div className="modal-row keep-row flex items-center justify-between flex-nowrap p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiPlus className="text-indigo-600 dark:text-indigo-400" /> Add New Inquiry / Lead
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="add-lead-form" onSubmit={handleCreateLead} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Company *</label>
                <select
                  required
                  value={addForm.company_id}
                  onChange={(e) => setAddForm({ ...addForm, company_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Client Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="First name"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="client@email.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                  <select
                    value={addForm.priority}
                    onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Inquiry Title / Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Website contact form inquiry"
                  value={addForm.subject}
                  onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Requirement / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Customer requirements..."
                  value={addForm.message}
                  onChange={(e) => setAddForm({ ...addForm, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="modal-row keep-row p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-lead-form"
                disabled={submittingAdd}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                {submittingAdd ? 'Saving...' : 'Create Lead'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================= */}
      {/* 2. LEAD DETAILS & ACTIVITY NOTES MODAL                         */}
      {/* ============================================================= */}
      {mounted && showDetailsModal && selectedLead && createPortal(
        <div role="dialog" aria-modal="true" className="modal-portal fixed inset-0 z-[999999] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-800 sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-700 flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Sticky Header */}
            <div className="modal-row keep-row p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-nowrap shrink-0 bg-slate-50/80 dark:bg-slate-900/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {selectedLead.full_name || 'Lead Details'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${getStatusBadge(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                </div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate">
                  🏢 {selectedLead.company_name} &bull; Received on {new Date(selectedLead.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 px-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveDetailsTab('overview')}
                className={`py-3 font-bold border-b-2 cursor-pointer transition-colors ${
                  activeDetailsTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Lead Overview & Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailsTab('notes')}
                className={`py-3 font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeDetailsTab === 'notes'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <FiMessageSquare size={13} />
                <span>Activity & Notes ({leadNotes.length})</span>
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs space-y-4">
              {activeDetailsTab === 'overview' ? (
                <div>
                  {/* Quick Action Contact Bar */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      {selectedLead.phone && (
                        <a
                          href={`tel:${selectedLead.phone.replace(/[^0-9+]/g, '')}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <FiPhone size={12} /> Call
                        </a>
                      )}
                      {selectedLead.phone && (
                        <a
                          href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold shadow-sm transition-colors"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold cursor-pointer transition-colors"
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Lead'}
                    </button>
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleSaveEdit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">First Name</label>
                          <input
                            type="text"
                            value={editForm.first_name}
                            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
                          <input
                            type="text"
                            value={editForm.last_name}
                            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Status</label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Converted">Converted</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                          <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Score</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editForm.lead_score}
                            onChange={(e) => setEditForm({ ...editForm, lead_score: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Inquiry Subject</label>
                        <input
                          type="text"
                          value={editForm.subject}
                          onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Message</label>
                        <textarea
                          rows={3}
                          value={editForm.message}
                          onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingEdit}
                          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
                        >
                          {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] block">Inquiry Subject</span>
                          <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{selectedLead.subject || 'Website Inquiry'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] block">Follow-up Schedule</span>
                          <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs mt-0.5">
                            {selectedLead.follow_up_date ? new Date(selectedLead.follow_up_date).toLocaleString() : 'No follow-up set'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] block mb-1">Requirements / Message</span>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {selectedLead.message || 'No additional message was provided with this inquiry.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Activity Notes */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      📝 Log Activity / Call Discussion Note
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter client call outcome, requirement details, next action..."
                      value={newNoteInput}
                      onChange={(e) => setNewNoteInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddNote}
                        disabled={savingNote || !newNoteInput.trim()}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-all"
                      >
                        {savingNote ? 'Posting...' : 'Post Note'}
                      </button>
                    </div>
                  </div>

                  {/* Notes Feed */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {leadNotes.length === 0 ? (
                      <p className="text-center text-slate-400 dark:text-slate-500 py-6">No activity notes recorded yet.</p>
                    ) : (
                      leadNotes.map((note) => (
                        <div key={note.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 shadow-sm">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{note.user_name || 'CRM Team'}</span>
                            <span>{new Date(note.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================= */}
      {/* 3. SCHEDULE FOLLOW-UP MODAL (Responsive Portal)                */}
      {/* ============================================================= */}
      {mounted && showScheduleModal && createPortal(
        <div role="dialog" aria-modal="true" className="modal-portal fixed inset-0 z-[999999] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-800 sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-700 flex flex-col h-full sm:h-auto overflow-hidden shadow-2xl">
            <div className="modal-row keep-row flex items-center justify-between flex-nowrap p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiCalendar className="text-indigo-600 dark:text-indigo-400" /> Schedule Lead Follow-up
              </h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              {schedulingLead ? (
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Client / Lead</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {schedulingLead.full_name || 'Direct Inquiry'} &bull; {schedulingLead.company_name}
                  </span>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Lead *</label>
                  <select
                    required
                    value={scheduleLeadId}
                    onChange={(e) => setScheduleLeadId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
                  >
                    <option value="">-- Choose Lead to Follow-up --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.full_name || 'Inquiry #' + l.id} ({l.company_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Follow-up Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Update Status (Optional)</label>
                <select
                  value={scheduleStatus}
                  onChange={(e) => setScheduleStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Reminder Note (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Call to discuss contract quote, verify payment link..."
                  value={scheduleNote}
                  onChange={(e) => setScheduleNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition-all"
                >
                  {savingSchedule ? 'Scheduling...' : 'Set Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
