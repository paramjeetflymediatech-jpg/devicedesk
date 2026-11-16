'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FiTarget,
  FiUsers,
  FiSearch,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiDownload,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiMoreVertical,
  FiExternalLink,
  FiAlertCircle,
  FiCheckCircle,
  FiTag,
  FiLayers,
  FiTrendingUp,
  FiCopy,
  FiEye,
  FiSettings,
  FiLink,
  FiKey,
  FiZap,
  FiCode,
  FiGlobe,
  FiShield,
  FiFileText
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import Pagination from '@/app/components/Pagination.js';

export default function SuperadminCompanyLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data
  const [leads, setLeads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
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
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // View Mode: 'table' | 'calendar'
  const [viewMode, setViewMode] = useState('table');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDay, setCalendarSelectedDay] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState('overview'); // 'overview' | 'notes'
  const [leadNotes, setLeadNotes] = useState([]);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Follow-up Scheduling Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingLead, setSchedulingLead] = useState(null);
  const [scheduleDateStr, setScheduleDateStr] = useState('');
  const [scheduleTimeStr, setScheduleTimeStr] = useState('10:00 AM');
  const [scheduleStatus, setScheduleStatus] = useState('Contacted');
  const [scheduleNote, setScheduleNote] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Webhook Configuration Modal State (Superadmin)
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookCompanyId, setWebhookCompanyId] = useState('');
  const [webhookApiKeyInput, setWebhookApiKeyInput] = useState('');
  const [showWebhookApiKeyPlain, setShowWebhookApiKeyPlain] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState('elementor');
  const [savingWebhookConfig, setSavingWebhookConfig] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedWebhookKey, setCopiedWebhookKey] = useState(false);

  // Add Lead Form State
  const [addForm, setAddForm] = useState({
    company_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    source: 'Website Contact Form',
    status: 'New',
    priority: 'Medium',
    assigned_to: '',
    lead_score: 50,
    follow_up_date: '',
    note: ''
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Lead Form State (inside Details Modal)
  const [editForm, setEditForm] = useState({});
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Action Menu Dropdown state for rows
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Compute date range for presets
  const getDateRangeForPreset = (preset) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const today = formatYMD(now);
      return { start: today, end: today };
    }
    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatYMD(y);
      return { start: yStr, end: yStr };
    }
    if (preset === 'last7') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: formatYMD(start), end: formatYMD(now) };
    }
    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatYMD(start), end: formatYMD(end) };
    }
    if (preset === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatYMD(start), end: formatYMD(end) };
    }
    return { start: '', end: '' };
  };

  // Fetch Leads from API
  const fetchLeads = useCallback(
    async (overrideParams = {}) => {
      try {
        const queryParams = new URLSearchParams();
        const comp = overrideParams.companyId !== undefined ? overrideParams.companyId : selectedCompanyId;
        const st = overrideParams.status !== undefined ? overrideParams.status : statusFilter;
        const pr = overrideParams.priority !== undefined ? overrideParams.priority : priorityFilter;
        const ass = overrideParams.assignedTo !== undefined ? overrideParams.assignedTo : assignedFilter;
        const search = overrideParams.search !== undefined ? overrideParams.search : searchTerm;
        const p = overrideParams.page !== undefined ? overrideParams.page : currentPage;
        const lim = overrideParams.limit !== undefined ? overrideParams.limit : pageSize;

        let sDate = overrideParams.startDate !== undefined ? overrideParams.startDate : startDate;
        let eDate = overrideParams.endDate !== undefined ? overrideParams.endDate : endDate;

        if (datePreset !== 'all' && datePreset !== 'custom') {
          const range = getDateRangeForPreset(datePreset);
          sDate = range.start;
          eDate = range.end;
        }

        if (comp && comp !== 'all') queryParams.set('companyId', comp);
        if (st && st !== 'all') queryParams.set('status', st);
        if (pr && pr !== 'all') queryParams.set('priority', pr);
        if (ass && ass !== 'all') queryParams.set('assignedTo', ass);
        if (search && search.trim()) queryParams.set('search', search.trim());
        if (sDate) queryParams.set('startDate', sDate);
        if (eDate) queryParams.set('endDate', eDate);
        queryParams.set('page', String(p));
        queryParams.set('limit', String(lim));

        const res = await fetch(`/api/admin/leads?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success) {
          setLeads(data.leads || []);
          if (data.companies) setCompanies(data.companies);
          if (data.users) setUsers(data.users);
          if (data.stats) setStats(data.stats);
          if (data.pagination) {
            setTotalCount(data.pagination.totalCount || 0);
            setTotalPages(data.pagination.totalPages || 1);
            setCurrentPage(data.pagination.page || 1);
          }
        } else {
          console.error('Fetch leads failed:', data.error);
        }
      } catch (err) {
        console.error('Fetch leads error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      selectedCompanyId,
      statusFilter,
      priorityFilter,
      assignedFilter,
      searchTerm,
      currentPage,
      pageSize,
      datePreset,
      startDate,
      endDate
    ]
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Load Single Lead details (including notes log)
  const openLeadDetails = async (lead) => {
    setSelectedLead(lead);
    setEditForm({
      company_id: lead.company_id || '',
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      subject: lead.subject || '',
      message: lead.message || '',
      status: lead.status || 'New',
      priority: lead.priority || 'Medium',
      assigned_to: lead.assigned_to ? String(lead.assigned_to) : '',
      lead_score: lead.lead_score || 0,
      follow_up_date: lead.follow_up_date ? new Date(lead.follow_up_date).toISOString().slice(0, 16) : ''
    });
    setIsEditingLead(false);
    setActiveDetailsTab('overview');
    setShowDetailsModal(true);

    try {
      const res = await fetch(`/api/admin/leads?leadId=${lead.id}`);
      const data = await res.json();
      if (data.success && data.lead) {
        setSelectedLead(data.lead);
        setLeadNotes(data.lead.notes || []);
      }
    } catch (e) {
      console.warn('Failed to fetch full lead notes:', e);
    }
  };

  // Add Note Handler
  const handleAddNote = async () => {
    if (!newNoteInput.trim() || !selectedLead) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/leads`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          note: newNoteInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteInput('');
        // Re-fetch lead details
        const refreshed = await fetch(`/api/admin/leads?leadId=${selectedLead.id}`);
        const refData = await refreshed.json();
        if (refData.success && refData.lead) {
          setSelectedLead(refData.lead);
          setLeadNotes(refData.lead.notes || []);
        }
        fetchLeads();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Note added successfully',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to add note', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error while adding note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  // Save Lead Edits
  const handleSaveEdit = async () => {
    if (!selectedLead) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/leads`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          ...editForm,
          assigned_to: editForm.assigned_to ? Number(editForm.assigned_to) : null,
          company_id: editForm.company_id ? Number(editForm.company_id) : selectedLead.company_id
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingLead(false);
        fetchLeads();
        const refreshed = await fetch(`/api/admin/leads?leadId=${selectedLead.id}`);
        const refData = await refreshed.json();
        if (refData.success && refData.lead) {
          setSelectedLead(refData.lead);
        }
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Lead updated successfully',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to update lead', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error while saving lead', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Inline Quick Status Change
  const handleQuickStatusChange = async (leadId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/leads`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Status set to ${newStatus}`,
          showConfirmButton: false,
          timer: 1800
        });
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to update status', 'error');
    }
  };

  // Inline Quick Assignee Change
  const handleQuickAssignChange = async (leadId, newAssignee) => {
    try {
      const res = await fetch(`/api/admin/leads`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          assigned_to: newAssignee === 'unassigned' ? null : Number(newAssignee)
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Assigned staff updated',
          showConfirmButton: false,
          timer: 1800
        });
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to update assignment', 'error');
    }
  };

  // Open Follow-up Schedule Modal
  const openScheduleModal = (lead, defaultDateStr = '') => {
    setSchedulingLead(lead);
    const existingDate = lead.follow_up_date ? new Date(lead.follow_up_date) : null;
    if (existingDate && !isNaN(existingDate)) {
      setScheduleDateStr(existingDate.toISOString().slice(0, 10));
      setScheduleTimeStr(existingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else if (defaultDateStr) {
      setScheduleDateStr(defaultDateStr);
      setScheduleTimeStr('10:00 AM');
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduleDateStr(tomorrow.toISOString().slice(0, 10));
      setScheduleTimeStr('10:00 AM');
    }
    setScheduleStatus(lead.status || 'Contacted');
    setScheduleNote('');
    setShowScheduleModal(true);
  };

  // Save Schedule Handler
  const handleSaveSchedule = async () => {
    if (!schedulingLead || !scheduleDateStr) {
      Swal.fire('Notice', 'Please select a follow-up date.', 'info');
      return;
    }
    setSavingSchedule(true);
    try {
      // Combine date and time
      const dateTimeString = `${scheduleDateStr} ${scheduleTimeStr}`;
      const parsedDate = new Date(dateTimeString);
      const followUpIso = !isNaN(parsedDate) ? parsedDate.toISOString() : new Date(scheduleDateStr).toISOString();

      const noteText = scheduleNote.trim()
        ? `[Scheduled Follow-up]: ${scheduleNote.trim()}`
        : `[Scheduled Follow-up for ${scheduleDateStr} at ${scheduleTimeStr}]`;

      const res = await fetch(`/api/admin/leads`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: schedulingLead.id,
          follow_up_date: followUpIso,
          status: scheduleStatus,
          note: noteText
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowScheduleModal(false);
        fetchLeads();
        Swal.fire({
          icon: 'success',
          title: 'Follow-up Scheduled!',
          text: `Follow-up set for ${new Date(followUpIso).toLocaleString()}`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to schedule follow-up', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error while scheduling', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Delete Lead Handler
  const handleDeleteLead = async (lead) => {
    const confirm = await Swal.fire({
      title: 'Delete Lead?',
      html: `Are you sure you want to delete <b>"${lead.full_name || lead.first_name}"</b> from company <b>"${lead.company_name}"</b>?<br/><small class="text-rose-500">This action is permanent and deletes all associated notes.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/leads?leadId=${lead.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (showDetailsModal && selectedLead?.id === lead.id) {
          setShowDetailsModal(false);
        }
        fetchLeads();
        Swal.fire('Deleted!', 'Lead has been removed.', 'success');
      } else {
        Swal.fire('Error', data.error || 'Failed to delete lead', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Network error while deleting lead', 'error');
    }
  };

  // Add Lead Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.company_id) {
      Swal.fire('Required', 'Please select a company for this lead.', 'warning');
      return;
    }
    if (!addForm.first_name.trim()) {
      Swal.fire('Required', 'Please enter at least a first name.', 'warning');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          company_id: Number(addForm.company_id),
          assigned_to: addForm.assigned_to ? Number(addForm.assigned_to) : null,
          follow_up_date: addForm.follow_up_date ? new Date(addForm.follow_up_date).toISOString() : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setAddForm({
          company_id: '',
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          source: 'Superadmin Manual',
          status: 'New',
          priority: 'Medium',
          assigned_to: '',
          lead_score: 50,
          follow_up_date: '',
          note: ''
        });
        fetchLeads();
        Swal.fire({
          icon: 'success',
          title: 'Lead Created!',
          text: 'The lead has been recorded into the company CRM pipeline.',
          timer: 2200,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to create lead', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error while creating lead', 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Copy phone helper
  const copyToClipboard = (text, type = 'phone') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(text);
      setTimeout(() => setCopiedPhone(null), 2000);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!leads.length) {
      Swal.fire('Notice', 'No leads available to export.', 'info');
      return;
    }

    const headers = [
      'Lead ID',
      'Company Name',
      'Full Name',
      'Email',
      'Phone',
      'Subject',
      'Status',
      'Priority',
      'Assigned Staff',
      'Follow-up Date',
      'Source',
      'Score',
      'Received Date'
    ];

    const rows = leads.map((l) => [
      l.id,
      `"${(l.company_name || '').replace(/"/g, '""')}"`,
      `"${(l.full_name || `${l.first_name || ''} ${l.last_name || ''}`).replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.subject || '').replace(/"/g, '""')}"`,
      l.status || 'New',
      l.priority || 'Medium',
      `"${(l.assigned_user_name || 'Unassigned').replace(/"/g, '""')}"`,
      l.follow_up_date ? new Date(l.follow_up_date).toLocaleDateString() : 'None',
      `"${(l.source || '').replace(/"/g, '""')}"`,
      l.lead_score || 0,
      l.created_at ? new Date(l.created_at).toLocaleString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `all_companies_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Colors
  const getStatusBadge = (status) => {
    const s = (status || 'New').toLowerCase();
    switch (s) {
      case 'new':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'contacted':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'qualified':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      case 'in progress':
      case 'in_progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
      case 'converted':
      case 'won':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'lost':
      case 'closed lost':
      case 'junk':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  // Priority Badge Colors
  const getPriorityBadge = (priority) => {
    const p = (priority || 'Medium').toLowerCase();
    switch (p) {
      case 'high':
        return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'medium':
        return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'low':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  // Group Leads by Scheduled Day for Calendar View
  const leadsByFollowUpMap = useMemo(() => {
    const map = {};
    leads.forEach((l) => {
      if (l.follow_up_date) {
        const dStr = new Date(l.follow_up_date).toISOString().slice(0, 10);
        if (!map[dStr]) map[dStr] = [];
        map[dStr].push(l);
      }
    });
    return map;
  }, [leads]);

  // Calendar Day Generator
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

  // Filter staff by selected company in modal
  const addModalCompanyStaff = useMemo(() => {
    if (!addForm.company_id) return users;
    return users.filter((u) => Number(u.company_id) === Number(addForm.company_id));
  }, [users, addForm.company_id]);

  const editModalCompanyStaff = useMemo(() => {
    if (!editForm.company_id) return users;
    return users.filter((u) => Number(u.company_id) === Number(editForm.company_id));
  }, [users, editForm.company_id]);

  // Active company object in Webhook modal
  const activeWebhookCompany = useMemo(() => {
    if (!companies || companies.length === 0) return null;
    if (!webhookCompanyId) return companies[0];
    return companies.find((c) => String(c.id) === String(webhookCompanyId)) || companies[0];
  }, [companies, webhookCompanyId]);

  // Open Webhook Configuration Modal
  const openWebhookModal = (targetCompId = null) => {
    const idToUse = targetCompId || (selectedCompanyId !== 'all' ? selectedCompanyId : (companies[0]?.id ? String(companies[0].id) : ''));
    setWebhookCompanyId(String(idToUse));
    const targetComp = companies.find((c) => String(c.id) === String(idToUse)) || companies[0];
    setWebhookApiKeyInput(targetComp?.api_key || targetComp?.client_crm_api_key || '');
    setShowWebhookApiKeyPlain(false);
    setActiveGuideTab('elementor');
    setShowWebhookModal(true);
  };

  // Switch company inside Webhook modal
  const handleSelectWebhookCompany = (compId) => {
    setWebhookCompanyId(String(compId));
    const targetComp = companies.find((c) => String(c.id) === String(compId));
    setWebhookApiKeyInput(targetComp?.api_key || targetComp?.client_crm_api_key || '');
  };

  // Generate random unique API key for selected company
  const handleGenerateApiKey = () => {
    const compName = (activeWebhookCompany?.company_name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const generated = `${compName}_wp_key_${randomHex}`;
    setWebhookApiKeyInput(generated);
    setShowWebhookApiKeyPlain(true);
  };

  // Save & Link Webhook API Key
  const handleSaveWebhookKey = async (e) => {
    if (e) e.preventDefault();
    if (!webhookApiKeyInput.trim()) {
      Swal.fire('Warning', 'Please enter or generate an API key.', 'warning');
      return;
    }
    if (!activeWebhookCompany) {
      Swal.fire('Error', 'No company selected.', 'error');
      return;
    }

    setSavingWebhookConfig(true);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure_webhook',
          companyId: activeWebhookCompany.id,
          clientId: activeWebhookCompany.client_id || null,
          apiKey: webhookApiKeyInput.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Webhook API Key successfully saved and linked!',
          showConfirmButton: false,
          timer: 2500
        });
        fetchLeads();
      } else {
        Swal.fire('Failed', data.error || 'Could not update API key.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error updating API key.', 'error');
    } finally {
      setSavingWebhookConfig(false);
    }
  };

  // Test Webhook Lead Dispatch
  const handleTestWebhookLead = async () => {
    if (!activeWebhookCompany) return;
    const keyToUse = webhookApiKeyInput.trim() || activeWebhookCompany.api_key || activeWebhookCompany.client_crm_api_key;
    if (!keyToUse) {
      Swal.fire('Warning', 'Please enter and save an API key before testing.', 'warning');
      return;
    }

    setTestingWebhook(true);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_webhook',
          companyId: activeWebhookCompany.id,
          apiKey: keyToUse
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Verification Lead Dispatched!',
          text: data.message,
          confirmButtonColor: '#db2777'
        });
        fetchLeads();
      } else {
        Swal.fire('Test Failed', data.error || 'Failed to dispatch test lead.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error sending test lead.', 'error');
    } finally {
      setTestingWebhook(false);
    }
  };

  // Copy helper
  const handleCopyWebhookText = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } else {
      setCopiedWebhookKey(true);
      setTimeout(() => setCopiedWebhookKey(false), 2000);
    }
  };

  return (
    <div className="page-container p-4 md:p-6 space-y-6">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & ACTION CONTROLS                          */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20">
              <FiTarget size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                All Companies Leads
              </h1>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Master CRM pipeline monitoring, client inquiry tracking, and follow-up scheduling across all companies.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div
            className="flex items-center p-1 rounded-xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FiLayers size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FiCalendar size={13} />
              <span>Follow-up Calendar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)'
            }}
            title="Download CSV report of filtered leads"
          >
            <FiDownload size={14} className="text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchLeads();
            }}
            disabled={refreshing}
            className="px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)'
            }}
            title="Refresh Leads"
          >
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin text-blue-500' : 'text-blue-500'} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => openWebhookModal()}
            className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Configure Webhook Ingestion & API Keys for Client Leads"
          >
            <FiSettings size={15} />
            <span>Webhook Configuration</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATS OVERVIEW CARDS                                  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div
          onClick={() => {
            setStatusFilter('all');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500/30'
              : 'hover:border-slate-400'
          }`}
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FiTarget size={13} />
            </div>
          </div>
          <div className="mt-1 text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across companies</div>
        </div>

        {/* New */}
        <div
          onClick={() => {
            setStatusFilter('New');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'New'
              ? 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500/30'
              : 'hover:border-slate-400'
          }`}
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">New Inquiries</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FiClock size={13} />
            </div>
          </div>
          <div className="mt-1 text-2xl font-black text-blue-500">{stats.new}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting initial action</div>
        </div>

        {/* Contacted */}
        <div
          onClick={() => {
            setStatusFilter('Contacted');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Contacted'
              ? 'ring-2 ring-amber-500 bg-amber-500/10 border-amber-500/30'
              : 'hover:border-slate-400'
          }`}
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Contacted</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FiPhone size={13} />
            </div>
          </div>
          <div className="mt-1 text-2xl font-black text-amber-500">{stats.contacted}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pitch sent / call logged</div>
        </div>

        {/* Qualified */}
        <div
          onClick={() => {
            setStatusFilter('Qualified');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Qualified'
              ? 'ring-2 ring-purple-500 bg-purple-500/10 border-purple-500/30'
              : 'hover:border-slate-400'
          }`}
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">Qualified</span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <FiCheckCircle size={13} />
            </div>
          </div>
          <div className="mt-1 text-2xl font-black text-purple-500">{stats.qualified}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ready for closing</div>
        </div>

        {/* Converted */}
        <div
          onClick={() => {
            setStatusFilter('Converted');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Converted'
              ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/30'
              : 'hover:border-slate-400'
          }`}
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Converted</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FiTrendingUp size={13} />
            </div>
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-500">{stats.converted}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Won accounts</div>
        </div>

        {/* Lost */}
        <div
          onClick={() => {
            setStatusFilter('Lost');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Lost'
              ? 'ring-2 ring-rose-500 bg-rose-500/10 border-rose-500/30'
              : 'hover:border-slate-400'
          }`}
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Lost</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <FiAlertCircle size={13} />
            </div>
          </div>
          <div className="mt-1 text-2xl font-black text-rose-500">{stats.lost}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Dropped / Inactive</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MULTI-COMPANY FILTER & SEARCH TOOLBAR                 */}
      {/* ======================================================== */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {/* Company Selector (Primary Filter) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FiUsers size={12} className="text-pink-500" />
                <span>Target Company</span>
              </label>
              {selectedCompanyId !== 'all' && (
                <button
                  type="button"
                  onClick={() => openWebhookModal(selectedCompanyId)}
                  className="text-[10px] font-bold text-pink-500 hover:text-pink-400 flex items-center gap-1 cursor-pointer"
                  title="Configure Webhook for this company"
                >
                  <FiSettings size={11} />
                  <span>Webhook</span>
                </button>
              )}
            </div>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none transition-all cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">🏢 All Companies ({stats.total})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.leads_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FiTag size={12} className="text-blue-500" />
              <span>Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none transition-all cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="In Progress">In Progress</option>
              <option value="Converted">Converted (Won)</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FiAlertCircle size={12} className="text-amber-500" />
              <span>Priority</span>
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none transition-all cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Priorities</option>
              <option value="High">🔥 High Priority</option>
              <option value="Medium">⚡ Medium Priority</option>
              <option value="Low">🌱 Low Priority</option>
            </select>
          </div>

          {/* Assigned Staff Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FiUsers size={12} className="text-indigo-500" />
              <span>Assigned Staff</span>
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => {
                setAssignedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none transition-all cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Staff Members</option>
              <option value="unassigned">⚠️ Unassigned Only</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.company_name || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Preset */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FiCalendar size={12} className="text-pink-500" />
              <span>Date Received</span>
            </label>
            <select
              value={datePreset}
              onChange={(e) => {
                const val = e.target.value;
                setDatePreset(val);
                setShowCustomDate(val === 'custom');
                if (val !== 'custom') {
                  const range = getDateRangeForPreset(val);
                  setStartDate(range.start);
                  setEndDate(range.end);
                  setCurrentPage(1);
                }
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none transition-all cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {showCustomDate && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-700/20">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-xl outline-none border"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-xl outline-none border"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentPage(1);
                fetchLeads();
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Apply Range
            </button>
          </div>
        )}

        {/* Real-time Search Input Row */}
        <div className="relative w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, subject, requirements, or company..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl outline-none transition-all"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Clear search"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. VIEW: TABLE OR FOLLOW-UP CALENDAR                     */}
      {/* ======================================================== */}
      {viewMode === 'table' ? (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <FiRefreshCw size={28} className="animate-spin mx-auto text-blue-500" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Fetching companies leads...
              </p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                <FiTarget size={30} />
              </div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                No CRM Leads Found
              </h3>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                No inquiries matched your current filter selection. Try changing the company or status filters, or add a new lead manually.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanyId('all');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setAssignedFilter('all');
                    setDatePreset('all');
                    setStartDate('');
                    setEndDate('');
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderColor: 'var(--glass-border)'
                      }}
                    >
                      <th className="py-3 px-4">Lead</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Follow-Up</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
                    {leads.map((lead) => {
                      const isOverdue =
                        lead.follow_up_date &&
                        new Date(lead.follow_up_date) < new Date() &&
                        lead.status !== 'Converted' &&
                        lead.status !== 'Lost';

                      return (
                        <tr
                          key={lead.id}
                          className="hover:bg-slate-500/5 transition-colors group"
                        >
                          {/* 1. Lead Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span
                                onClick={() => openLeadDetails(lead)}
                                className="font-bold text-xs hover:text-blue-500 cursor-pointer transition-colors"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Inquiry'}
                              </span>
                              <span className="text-[11px] text-slate-400 line-clamp-1">
                                {lead.subject || 'Website Inquiry'}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                  {lead.source || 'Form'}
                                </span>
                                {lead.notes_count > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-semibold">
                                    <FiMessageSquare size={10} />
                                    <span>{lead.notes_count}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Company Badge */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-500 border border-blue-500/20 w-fit">
                                <span>🏢</span>
                                <span>{lead.company_name || 'Unassigned Co.'}</span>
                              </span>
                              {lead.company_website && (
                                <a
                                  href={lead.company_website.startsWith('http') ? lead.company_website : `https://${lead.company_website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-slate-400 hover:text-blue-500 flex items-center gap-1 mt-0.5 w-fit"
                                >
                                  <span>visit website</span>
                                  <FiExternalLink size={9} />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* 3. Direct Contact */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 text-xs">
                              {lead.email ? (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="text-blue-500 hover:underline flex items-center gap-1 text-xs"
                                >
                                  <FiMail size={12} className="flex-shrink-0" />
                                  <span className="truncate max-w-[150px]">{lead.email}</span>
                                </a>
                              ) : null}

                              {lead.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                    title="Call lead"
                                  >
                                    <FiPhone size={10} />
                                    <span>{lead.phone}</span>
                                  </a>

                                  <a
                                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                                    title="WhatsApp chat"
                                  >
                                    <span className="text-[11px]">💬</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(lead.phone, 'phone')}
                                    className="text-slate-400 hover:text-slate-200"
                                    title="Copy phone"
                                  >
                                    {copiedPhone === lead.phone ? (
                                      <FiCheck size={11} className="text-emerald-500" />
                                    ) : (
                                      <FiCopy size={11} />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">No phone</span>
                              )}
                            </div>
                          </td>

                          {/* 4. Status Dropdown */}
                          <td className="py-3.5 px-4">
                            <select
                              value={lead.status || 'New'}
                              onChange={(e) => handleQuickStatusChange(lead.id, e.target.value)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border outline-none cursor-pointer ${getStatusBadge(lead.status)}`}
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Qualified">Qualified</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Converted">Converted</option>
                              <option value="Lost">Lost</option>
                            </select>
                          </td>

                          {/* 5. Priority */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border ${getPriorityBadge(
                                lead.priority
                              )}`}
                            >
                              {lead.priority || 'Medium'}
                            </span>
                          </td>

                          {/* 6. Assignee Dropdown */}
                          <td className="py-3.5 px-4">
                            <select
                              value={lead.assigned_to ? String(lead.assigned_to) : 'unassigned'}
                              onChange={(e) => handleQuickAssignChange(lead.id, e.target.value)}
                              className="px-2 py-1 text-xs rounded-lg border outline-none cursor-pointer max-w-[140px]"
                              style={{
                                background: 'var(--bg-secondary)',
                                borderColor: 'var(--glass-border)',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <option value="unassigned">⚠️ Unassigned</option>
                              {users
                                .filter((u) => !lead.company_id || Number(u.company_id) === Number(lead.company_id))
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                            </select>
                          </td>

                          {/* 7. Follow-up Schedule */}
                          <td className="py-3.5 px-4">
                            {lead.follow_up_date ? (
                              <button
                                type="button"
                                onClick={() => openScheduleModal(lead)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isOverdue
                                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                    : 'bg-pink-500/10 text-pink-600 border border-pink-500/20 hover:bg-pink-500/20'
                                }`}
                                title="Click to reschedule"
                              >
                                <FiCalendar size={12} />
                                <span>
                                  {new Date(lead.follow_up_date).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                {isOverdue && <span className="text-[9px] font-black uppercase">Overdue</span>}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openScheduleModal(lead)}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-pink-500 hover:bg-pink-500/10 border border-transparent hover:border-pink-500/20 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <FiPlus size={11} />
                                <span>Schedule</span>
                              </button>
                            )}
                          </td>

                          {/* 8. Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openLeadDetails(lead)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title="View & Edit Details"
                              >
                                <FiEye size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openScheduleModal(lead)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-pink-500 hover:bg-pink-500/10 transition-colors cursor-pointer"
                                title="Schedule Follow-up"
                              >
                                <FiCalendar size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLead(lead)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Lead"
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                <div className="text-xs text-slate-400">
                  Showing <span className="font-bold text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-200">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-bold text-slate-200">{totalCount}</span> total leads
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={(p) => setCurrentPage(p)}
                  onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[10, 20, 50, 100]}
                  itemName="leads"
                />
              </div>
            </>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* 4B. VIEW: FOLLOW-UP CALENDAR                             */
        /* ======================================================== */
        <div className="space-y-4">
          <div
            className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(calendarMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setCalendarMonth(prev);
                }}
                className="p-2 rounded-xl border hover:bg-slate-500/10 cursor-pointer"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
              >
                <FiChevronLeft size={16} />
              </button>

              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>

              <button
                type="button"
                onClick={() => {
                  const next = new Date(calendarMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCalendarMonth(next);
                }}
                className="p-2 rounded-xl border hover:bg-slate-500/10 cursor-pointer"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
              >
                <FiChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setCalendarMonth(new Date())}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border hover:bg-slate-500/10 cursor-pointer"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
              >
                Today
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
              <span>Days with scheduled follow-ups</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar Grid (2 Cols) */}
            <div
              className="lg:col-span-2 p-4 rounded-2xl border"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((item, idx) => {
                  if (!item) {
                    return <div key={`empty-${idx}`} className="h-20 rounded-xl bg-slate-500/5" />;
                  }

                  const dayLeads = leadsByFollowUpMap[item.dateStr] || [];
                  const isSelected = calendarSelectedDay === item.dateStr;
                  const isToday = item.dateStr === new Date().toISOString().slice(0, 10);

                  return (
                    <div
                      key={item.dateStr}
                      onClick={() => setCalendarSelectedDay(item.dateStr)}
                      className={`h-20 p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-pink-500 bg-pink-500/15 border-pink-500'
                          : isToday
                          ? 'border-blue-500 bg-blue-500/5'
                          : 'border-slate-700/20 hover:border-slate-500 bg-slate-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isToday ? 'text-blue-500' : isSelected ? 'text-pink-500' : 'text-slate-300'
                          }`}
                        >
                          {item.day}
                        </span>
                        {dayLeads.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-pink-500 text-white">
                            {dayLeads.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 overflow-hidden">
                        {dayLeads.slice(0, 2).map((dl) => (
                          <div
                            key={dl.id}
                            className="text-[9px] font-bold px-1 py-0.5 rounded truncate bg-pink-500/20 text-pink-400"
                            title={`${dl.full_name} (${dl.company_name})`}
                          >
                            {dl.full_name || 'Lead'}
                          </div>
                        ))}
                        {dayLeads.length > 2 && (
                          <div className="text-[8px] text-slate-400 text-right">
                            +{dayLeads.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda Drawer */}
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/20">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {calendarSelectedDay
                      ? new Date(calendarSelectedDay).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Select a Date'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Scheduled Follow-ups</p>
                </div>

                {calendarSelectedDay && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((prev) => ({
                        ...prev,
                        follow_up_date: `${calendarSelectedDay}T10:00`
                      }));
                      setShowAddModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-600 text-white hover:bg-pink-700 cursor-pointer flex items-center gap-1"
                  >
                    <FiPlus size={12} />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {!calendarSelectedDay ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Click on any day in the calendar to view its scheduled follow-up agenda.
                </div>
              ) : (leadsByFollowUpMap[calendarSelectedDay] || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No follow-ups scheduled for this day.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {(leadsByFollowUpMap[calendarSelectedDay] || []).map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 rounded-xl border space-y-2 hover:border-slate-500 transition-all"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--glass-border)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div
                            onClick={() => openLeadDetails(lead)}
                            className="text-xs font-bold hover:text-blue-500 cursor-pointer"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {lead.full_name || 'Lead'}
                          </div>
                          <div className="text-[11px] text-blue-500 font-semibold">
                            🏢 {lead.company_name}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${getStatusBadge(
                            lead.status
                          )}`}
                        >
                          {lead.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        ⏰ Time:{' '}
                        {new Date(lead.follow_up_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-700/20">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                            className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1"
                          >
                            <FiPhone size={11} />
                            <span>Call</span>
                          </a>
                        )}

                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded bg-green-500/10 text-green-600 hover:bg-green-500/20 text-xs font-bold flex items-center gap-1"
                          >
                            <span>💬 WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openScheduleModal(lead, calendarSelectedDay)}
                          className="px-2 py-1 rounded bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 text-xs font-bold ml-auto cursor-pointer"
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: ADD NEW LEAD (FOR ANY COMPANY)                 */}
      {/* ======================================================== */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[9999] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          style={{ zIndex: 9999 }}
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                  <FiPlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Add New CRM Lead
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Create a sales inquiry for any registered client company.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              {/* Company Selection */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Target Client Company <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={addForm.company_id}
                  onChange={(e) => setAddForm({ ...addForm, company_id: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  <option value="">-- Choose Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.email || c.website || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Contact Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Inquiry Subject / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Roof Repair Quote / Digital Marketing Consultation"
                  value={addForm.subject}
                  onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Requirements Message */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Message / Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Client project details, specific requirements, quotation request..."
                  value={addForm.message}
                  onChange={(e) => setAddForm({ ...addForm, message: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Status, Priority, Staff Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-xs"
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
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Priority</label>
                  <select
                    value={addForm.priority}
                    onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Assign Staff</label>
                  <select
                    value={addForm.assigned_to}
                    onChange={(e) => setAddForm({ ...addForm, assigned_to: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    <option value="">Unassigned</option>
                    {addModalCompanyStaff.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source & Follow-up Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Lead Source</label>
                  <select
                    value={addForm.source}
                    onChange={(e) => setAddForm({ ...addForm, source: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    <option value="Website Contact Form">Website Contact Form</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="WordPress Integration">WordPress Integration</option>
                    <option value="Facebook / Instagram">Facebook / Instagram</option>
                    <option value="Referral">Referral</option>
                    <option value="Superadmin Manual">Superadmin Manual</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp Inquiry">WhatsApp Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Follow-up Schedule (Optional)</label>
                  <input
                    type="datetime-local"
                    value={addForm.follow_up_date}
                    onChange={(e) => setAddForm({ ...addForm, follow_up_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Initial Note */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Initial Internal Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Lead received via direct sales call, needs callback tomorrow..."
                  value={addForm.note}
                  onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {submittingAdd ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}

      {/* 6. MODAL: VIEW / EDIT LEAD & ACTIVITY NOTES              */}
      {/* ======================================================== */}
      {showDetailsModal && selectedLead && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-slate-900 dark:to-slate-800 shrink-0">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedLead.full_name || 'Lead Details'}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadge(
                      selectedLead.status
                    )}`}
                  >
                    {selectedLead.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getPriorityBadge(
                      selectedLead.priority
                    )}`}
                  >
                    {selectedLead.priority}
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                  🏢 {selectedLead.company_name} • Received on{' '}
                  {new Date(selectedLead.created_at).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-6 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setActiveDetailsTab('overview')}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDetailsTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Lead Overview & Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailsTab('notes')}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeDetailsTab === 'notes'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FiMessageSquare size={13} />
                <span>Notes & Activity Log ({leadNotes.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

            {/* TAB 1: OVERVIEW & EDIT */}
            {activeDetailsTab === 'overview' && (
              <div className="space-y-4 text-xs">
                {/* Contact Quick Action Bar */}
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedLead.phone && (
                      <a
                        href={`tel:${selectedLead.phone.replace(/[^0-9+]/g, '')}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <FiPhone size={13} />
                        <span>Call Lead</span>
                      </a>
                    )}
                    {selectedLead.phone && (
                      <a
                        href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-bold flex items-center gap-1.5 hover:bg-green-600 transition-colors shadow-xs"
                      >
                        <span>💬 Chat WhatsApp</span>
                      </a>
                    )}
                    {selectedLead.email && (
                      <a
                        href={`mailto:${selectedLead.email}`}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-1.5 hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        <FiMail size={13} />
                        <span>Send Email</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingLead(!isEditingLead)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-bold flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <FiEdit2 size={13} />
                    <span>{isEditingLead ? 'Cancel Edit' : 'Edit Lead Information'}</span>
                  </button>
                </div>

                {/* Edit Form or Read-only Display */}
                {isEditingLead ? (
                  <div className="space-y-3.5 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Company</label>
                        <select
                          value={editForm.company_id}
                          onChange={(e) => setEditForm({ ...editForm, company_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.company_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Assign Staff</label>
                        <select
                          value={editForm.assigned_to}
                          onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Unassigned</option>
                          {editModalCompanyStaff.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">First Name</label>
                        <input
                          type="text"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Phone</label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500"
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
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Priority</label>
                        <select
                          value={editForm.priority}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Lead Score (0-100)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.lead_score}
                          onChange={(e) => setEditForm({ ...editForm, lead_score: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Subject</label>
                      <input
                        type="text"
                        value={editForm.subject}
                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Message / Requirements</label>
                      <textarea
                        rows={3}
                        value={editForm.message}
                        onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingLead(false)}
                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/40 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider block">
                          Client Inquiry Title
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white text-sm mt-1">
                          {selectedLead.subject || 'Website Inquiry'}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider block">
                          Lead Source
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white text-sm mt-1">
                          {selectedLead.source || 'Website Contact Form'}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider block">
                          Assigned Staff
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white text-sm mt-1">
                          {selectedLead.assigned_user_name ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                              👤 {selectedLead.assigned_user_name}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">⚠️ Unassigned</span>
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider block">
                          Follow-up Schedule
                        </span>
                        <p className="font-bold text-pink-600 dark:text-pink-400 text-sm mt-1 flex items-center gap-1.5">
                          <FiCalendar size={14} />
                          <span>
                            {selectedLead.follow_up_date
                              ? new Date(selectedLead.follow_up_date).toLocaleString()
                              : 'No follow-up set'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-slate-700/60">
                      <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider block mb-1.5">
                        Inquiry Message / Requirement
                      </span>
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/70 text-gray-800 dark:text-gray-200 font-medium leading-relaxed whitespace-pre-wrap text-xs shadow-xs">
                        {selectedLead.message || 'No additional message was provided with this inquiry.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INTERNAL NOTES & ACTIVITIES */}
            {activeDetailsTab === 'notes' && (
              <div className="space-y-4 text-xs">
                {/* Add Note Input */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/40 space-y-2.5">
                  <label className="font-bold text-gray-800 dark:text-gray-200 block text-xs">
                    📝 Log Internal Note / Follow-up Discussion
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Log client call outcome, requirement update, pricing discussed, next meeting..."
                    value={newNoteInput}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={savingNote || !newNoteInput.trim()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {savingNote ? 'Adding...' : 'Post Note'}
                    </button>
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {leadNotes.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500 font-medium">
                      No internal notes recorded for this lead yet.
                    </div>
                  ) : (
                    leadNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            👤 {note.user_name || 'Admin'} {note.user_role ? `(${note.user_role})` : ''}
                          </span>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-normal">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteLead(selectedLead)}
                className="px-3.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
              >
                <FiTrash2 size={13} />
                <span>Delete Lead</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: SCHEDULE / RESCHEDULE FOLLOW-UP                */}
      {/* ======================================================== */}
      {showScheduleModal && schedulingLead && (
        <div
          className="fixed inset-0 z-[9999] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ zIndex: 9999 }}
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400 flex items-center justify-center shadow-xs font-bold">
                  <FiCalendar size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Schedule Follow-up
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {schedulingLead.full_name || 'Lead'} • {schedulingLead.company_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Follow-up Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={scheduleDateStr}
                  onChange={(e) => setScheduleDateStr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none font-semibold focus:ring-2 focus:ring-pink-500 shadow-xs"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Follow-up Time Slot</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setScheduleTimeStr(t)}
                      className={`py-1.5 rounded-lg font-bold border text-xs transition-all cursor-pointer shadow-xs ${
                        scheduleTimeStr === t
                          ? 'bg-pink-600 text-white border-pink-500'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom time (e.g. 10:45 AM)"
                  value={scheduleTimeStr}
                  onChange={(e) => setScheduleTimeStr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500 shadow-xs"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Update Status</label>
                <select
                  value={scheduleStatus}
                  onChange={(e) => setScheduleStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none font-semibold cursor-pointer focus:ring-2 focus:ring-pink-500 shadow-xs"
                >
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="In Progress">In Progress</option>
                  <option value="New">New</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Follow-up Goal / Agenda Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Discuss project pricing, review quotation proposal, arrange demo..."
                  value={scheduleNote}
                  onChange={(e) => setScheduleNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-pink-500 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 text-xs transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule || !scheduleDateStr}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                >
                  {savingSchedule ? 'Scheduling...' : 'Set Follow-up'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}

      {/* 4. CLIENT LEADS WEBHOOK CONFIGURATION MODAL (SUPERADMIN) */}
      {/* ======================================================== */}
      {showWebhookModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-pink-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-pink-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400 flex items-center justify-center shadow-xs font-bold shrink-0">
                  <FiSettings size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      Client Leads Webhook Configuration
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40">
                      Superadmin Control
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Configure incoming lead webhooks, assign or generate client API keys, and verify pipeline ingestion.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body - with min-h-0 and overflow-y-auto for smooth scrolling */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
              {/* 1. Client Company Selector Bar */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                    <FiUsers size={13} />
                    <span>Select Client Company to Configure</span>
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Choose a company to view their webhook credentials or assign a new API key.
                  </p>
                </div>
                <div className="w-full md:w-80">
                  <select
                    value={activeWebhookCompany?.id || ''}
                    onChange={(e) => handleSelectWebhookCompany(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-pink-500 shadow-xs"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name} {c.client_name ? `(${c.client_name})` : ''} - {c.leads_count || 0} leads
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Active Tenant Credentials Card */}
              {activeWebhookCompany && (
                <div className="rounded-2xl p-5 border border-gray-200/90 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-5">
                  {/* Status header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Tenant:</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">
                        {activeWebhookCompany.company_name}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 font-semibold">
                        Company ID #{activeWebhookCompany.id}
                      </span>
                      {activeWebhookCompany.client_name && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-semibold">
                          Client: {activeWebhookCompany.client_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        Pipeline Ready
                      </span>
                      <button
                        type="button"
                        onClick={handleTestWebhookLead}
                        disabled={testingWebhook}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                        title="Dispatch a test lead into this company's pipeline"
                      >
                        {testingWebhook ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Testing...</span>
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

                  {/* Superadmin API Key Input & Generator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <FiKey size={14} className="text-pink-600" />
                        <span>CRM Company API Key (Superadmin Editable)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleGenerateApiKey}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FiZap size={12} />
                          <span>Generate New Key</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowWebhookApiKeyPlain(!showWebhookApiKeyPlain)}
                          className="text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                        >
                          {showWebhookApiKeyPlain ? 'Hide' : 'Reveal'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type={showWebhookApiKeyPlain ? 'text' : 'password'}
                        value={webhookApiKeyInput}
                        onChange={(e) => setWebhookApiKeyInput(e.target.value)}
                        placeholder="Enter custom API key or click Generate New Key..."
                        className="flex-1 px-3.5 py-2 rounded-xl text-xs font-mono outline-none border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 transition-all shadow-xs"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyWebhookText(webhookApiKeyInput, 'key')}
                          disabled={!webhookApiKeyInput}
                          className="inline-flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-40"
                        >
                          {copiedWebhookKey ? <FiCheck size={14} className="text-emerald-600" /> : <FiCopy size={14} />}
                          <span>{copiedWebhookKey ? 'Copied' : 'Copy Key'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveWebhookKey}
                          disabled={savingWebhookConfig || !webhookApiKeyInput.trim()}
                          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {savingWebhookConfig ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <FiCheck size={14} />
                              <span>Save & Link Key</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Saving this key immediately links it to the client company and synchronizes it across <code className="text-pink-600 font-mono font-bold">crm_saas.companies</code> and <code className="text-pink-600 font-mono font-bold">client_details</code>.
                    </p>
                  </div>

                  {/* Webhook Ingestion URL */}
                  <div className="space-y-1.5 pt-3 border-t border-gray-200 dark:border-slate-800">
                    <label className="text-xs font-bold flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <FiLink size={14} className="text-blue-600" />
                      <span>Live Ingestion Webhook URL for this Company</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`https://demo.socialflymediatech.com/api/leads/create?api_key=${webhookApiKeyInput.trim() || activeWebhookCompany.api_key || ''}`}
                        className="flex-1 px-3.5 py-2 rounded-xl text-xs font-mono outline-none border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white cursor-text select-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyWebhookText(`https://demo.socialflymediatech.com/api/leads/create?api_key=${webhookApiKeyInput.trim() || activeWebhookCompany.api_key || ''}`, 'url')}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer"
                      >
                        {copiedWebhookUrl ? <FiCheck size={14} /> : <FiCopy size={14} />}
                        <span>{copiedWebhookUrl ? 'Copied URL!' : 'Copy URL'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Endpoint: <code className="text-pink-600 font-mono font-bold">https://demo.socialflymediatech.com/api/leads/create</code> • Method: <span className="font-bold text-pink-600 font-mono">POST</span> • Format: <span className="font-bold text-pink-600 font-mono">JSON</span>
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Step-by-Step Integration Guides */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                    <FiCode size={15} className="text-pink-600" />
                    <span>Website & Form Ingestion Guides</span>
                  </h4>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Pre-populated with active company API key</span>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
                  {[
                    { id: 'elementor', label: '🎨 Elementor Forms (WordPress)' },
                    { id: 'cf7', label: '📝 Contact Form 7' },
                    { id: 'wpforms', label: '📋 WPForms / Gravity' },
                    { id: 'curl', label: '⚡ cURL / Zapier / Meta' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveGuideTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeGuideTab === tab.id
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Elementor */}
                {activeGuideTab === 'elementor' && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-gray-300 space-y-2.5">
                    <p className="font-bold text-gray-900 dark:text-white">
                      Connecting Elementor Pro Contact Form to {activeWebhookCompany?.company_name || 'this Company'}:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                      <li>Open your WordPress page in the <strong>Elementor Editor</strong> and select the Form widget.</li>
                      <li>In the left panel under <strong>Actions After Submit</strong>, add <strong>Webhook</strong>.</li>
                      <li>
                        Under the <strong>Webhook</strong> settings, paste this Webhook URL:
                        <code className="block my-1.5 p-2 bg-gray-900 text-pink-400 font-mono rounded-lg break-all select-all">
                          {`https://demo.socialflymediatech.com/api/leads/create?api_key=${webhookApiKeyInput.trim() || activeWebhookCompany?.api_key || ''}`}
                        </code>
                      </li>
                      <li>Ensure your form fields have Shortcode/Field IDs matching: <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">name</code>, <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">email</code>, <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">phone</code>, and <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">message</code>.</li>
                      <li>Click <strong>Publish / Update</strong>. Inquiries will immediately route to this company's CRM leads board!</li>
                    </ol>
                  </div>
                )}

                {/* Tab 2: Contact Form 7 */}
                {activeGuideTab === 'cf7' && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-gray-300 space-y-2.5">
                    <p className="font-bold text-gray-900 dark:text-white">
                      Paste into WordPress theme's <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-200">functions.php</code> file:
                    </p>
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

    wp_remote_post('https://demo.socialflymediatech.com/api/leads/create?api_key=${webhookApiKeyInput.trim() || activeWebhookCompany?.api_key || ''}', [
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
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-gray-300 space-y-2.5">
                    <p className="font-bold text-gray-900 dark:text-white">
                      Configuring WPForms or Gravity Forms Webhook Add-on:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                      <li>Enable the <strong>Webhooks Add-on</strong> in your WordPress form plugin.</li>
                      <li>Navigate to <strong>Form Settings &gt; Webhooks &gt; Add New Webhook</strong>.</li>
                      <li>
                        Set <strong>Request URL</strong> to:
                        <code className="block my-1.5 p-2 bg-gray-900 text-pink-400 font-mono rounded-lg break-all select-all">
                          {`https://demo.socialflymediatech.com/api/leads/create?api_key=${webhookApiKeyInput.trim() || activeWebhookCompany?.api_key || ''}`}
                        </code>
                      </li>
                      <li>Set <strong>Request Method</strong> to <strong>POST</strong> and <strong>Format</strong> to <strong>JSON</strong>.</li>
                      <li>Map payload fields: <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">name</code>, <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">email</code>, <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">phone</code>, <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">subject</code>, and <code className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-900 dark:text-gray-200">message</code>.</li>
                    </ol>
                  </div>
                )}

                {/* Tab 4: cURL / Zapier / Meta */}
                {activeGuideTab === 'curl' && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-gray-300 space-y-2.5">
                    <p className="font-bold text-gray-900 dark:text-white">
                      Direct REST API Webhook Specification:
                    </p>
                    <pre className="p-3 bg-gray-900 text-pink-300 font-mono rounded-xl text-[11px] overflow-x-auto leading-relaxed select-all">
{`curl -X POST "https://demo.socialflymediatech.com/api/leads/create?api_key=${webhookApiKeyInput.trim() || activeWebhookCompany?.api_key || ''}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@clientwebsite.com",
    "phone": "+91 9876543210",
    "subject": "Commercial Package Quote",
    "message": "Interested in pricing and integration timelines.",
    "source": "Landing Page Webhook"
  }'`}
                    </pre>
                  </div>
                )}
              </div>

              {/* 4. All Companies Overview Table */}
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                    <FiLayers size={14} className="text-blue-600" />
                    <span>All Client Companies Webhook Registry ({companies.length})</span>
                  </h4>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Click any row to configure</span>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Company & Client</th>
                          <th className="px-4 py-3">API Key Status</th>
                          <th className="px-4 py-3">Total Leads</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-gray-200">
                        {companies.map((comp) => {
                          const isSelected = activeWebhookCompany?.id === comp.id;
                          const hasKey = !!(comp.api_key || comp.client_crm_api_key);
                          return (
                            <tr
                              key={comp.id}
                              onClick={() => handleSelectWebhookCompany(comp.id)}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? 'bg-pink-50/70 dark:bg-pink-950/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                  <span>{comp.company_name}</span>
                                  <span className="text-[10px] font-mono text-gray-400">#{comp.id}</span>
                                </div>
                                {comp.client_name && (
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Client: {comp.client_name} {comp.client_email ? `• ${comp.client_email}` : ''}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {hasKey ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                      {(comp.api_key || comp.client_crm_api_key).slice(0, 16)}...
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                    ⚠️ No key configured
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-gray-800 dark:text-gray-200">
                                  {comp.leads_count || 0} leads
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectWebhookCompany(comp.id);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-pink-600 text-white'
                                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {isSelected ? 'Active' : 'Configure'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Superadmin Webhook Control • DeviceDesk CRM Multi-Tenant Architecture
              </span>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
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
