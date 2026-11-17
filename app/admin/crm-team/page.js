'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  FiUsers,
  FiUserPlus,
  FiShield,
  FiGlobe,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiKey,
  FiCopy,
  FiCheck,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiBriefcase,
  FiLayers,
  FiExternalLink,
  FiClock,
  FiInfo,
  FiAlertCircle,
  FiArrowRight,
  FiDownload,
  FiUpload,
  FiFileText
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function SuperadminCrmTeamPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Import & Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importParsed, setImportParsed] = useState([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Multiple selection for bulk delete
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formAccessType, setFormAccessType] = useState('specific'); // 'all' | 'specific'
  const [formSelectedCompanies, setFormSelectedCompanies] = useState([]); // array of company ids
  const [formStatus, setFormStatus] = useState('active');
  const [formNotes, setFormNotes] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success summary modal after member creation
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Fetch team members & companies
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch('/api/admin/crm-team');
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || data.data || []);
        setCompanies(data.companies || []);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Data',
          text: data.error || 'Could not fetch CRM team members.'
        });
      }
    } catch (err) {
      console.error('Fetch CRM team error:', err);
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormShowPassword(true);
    setFormAccessType('specific');
    setFormSelectedCompanies([]);
    setFormStatus('active');
    setFormNotes('');
    setCompanySearch('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setFormName(member.name || '');
    setFormEmail(member.email || '');
    setFormPhone(member.phone || '');
    setFormPassword(''); // blank unless changing
    setFormShowPassword(false);
    setFormAccessType(member.access_type || 'specific');
    setFormSelectedCompanies(Array.isArray(member.assigned_company_ids) ? member.assigned_company_ids : []);
    setFormStatus(member.status || 'active');
    setFormNotes(member.notes || '');
    setCompanySearch('');
    setShowEditModal(true);
  };

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 10; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pw);
  };

  // Toggle company selection in form
  const handleToggleCompany = (companyId) => {
    setFormSelectedCompanies((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  // Select all / deselect all companies
  const handleSelectAllCompanies = () => {
    setFormSelectedCompanies(companies.map((c) => c.id));
  };
  const handleDeselectAllCompanies = () => {
    setFormSelectedCompanies([]);
  };

  // Submit Add
  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required Fields', text: 'Name, Email, and Password are required.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/crm-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim(),
          access_type: formAccessType,
          assigned_companies: formSelectedCompanies,
          status: formStatus,
          notes: formNotes.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setCreatedCredentials({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
          loginUrl: window.location.origin + '/crm/login'
        });
        fetchData();
      } else {
        Swal.fire({ icon: 'error', title: 'Failed to Add Member', text: data.error || 'Server error occurred.' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required Fields', text: 'Name and Email are required.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/crm-team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim() || undefined,
          access_type: formAccessType,
          assigned_companies: formSelectedCompanies,
          status: formStatus,
          notes: formNotes.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Member Updated',
          text: 'CRM team member details and permissions saved.',
          timer: 2000,
          showConfirmButton: false
        });
        fetchData();
      } else {
        Swal.fire({ icon: 'error', title: 'Update Failed', text: data.error || 'Server error occurred.' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Member Status (Active/Inactive)
  const handleToggleStatus = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/admin/crm-team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: member.id,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m))
        );
      } else {
        Swal.fire({ icon: 'error', title: 'Status Toggle Failed', text: data.error });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    }
  };

  // Delete Member
  const handleDeleteMember = async (member) => {
    const result = await Swal.fire({
      title: 'Delete CRM Member?',
      text: `Are you sure you want to remove "${member.name}"? They will no longer be able to log in to the CRM leads portal.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Member'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/crm-team?id=${member.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          Swal.fire({ icon: 'success', title: 'Deleted', text: 'CRM member removed.', timer: 1500, showConfirmButton: false });
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
          setSelectedMemberIds((prev) => prev.filter((id) => id !== member.id));
        } else {
          Swal.fire({ icon: 'error', title: 'Delete Failed', text: data.error });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
      }
    }
  };

  // Copy portal login link
  const handleCopyLoginLink = () => {
    const url = window.location.origin + '/crm/login';
    navigator.clipboard.writeText(url);
    Swal.fire({
      icon: 'success',
      title: 'Link Copied',
      text: `CRM Team Portal URL: ${url}`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  /* ======================================================== */
  /* EXPORT CRM TEAM TO EXCEL / CSV                          */
  /* ======================================================== */
  const handleExportCrmTeam = async (format = 'xlsx') => {
    if (members.length === 0) {
      Swal.fire({ icon: 'info', title: 'No Data', text: 'No CRM team members to export.' });
      return;
    }

    try {
      setExporting(true);
      const XLSX = await import('xlsx');
      const exportData = members.map((m, idx) => {
        const assignedNames = m.access_type === 'all'
          ? 'All Client Companies'
          : (m.assigned_companies_details || []).map((c) => c.company_name).join(', ') || 'None';

        return {
          'No.': idx + 1,
          'Full Name': m.name || '',
          'Email Address': m.email || '',
          'Phone Number': m.phone || '',
          'Access Scope': m.access_type === 'all' ? 'Full CRM Access' : 'Company Scoped',
          'Assigned Companies Count': m.access_type === 'all' ? companies.length : (m.assigned_company_ids || []).length,
          'Assigned Companies List': assignedNames,
          'Account Status': m.status === 'active' ? 'Active' : 'Inactive',
          'Last Login': m.last_login ? new Date(m.last_login).toLocaleString() : 'Never',
          'Notes': m.notes || '',
          'Created Date': m.created_at ? new Date(m.created_at).toLocaleDateString() : ''
        };
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CRM Team');

      if (format === 'csv') {
        XLSX.writeFile(wb, `crm_team_export_${dateStr}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, `crm_team_export_${dateStr}.xlsx`);
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Exported ${members.length} CRM agents (${format.toUpperCase()})`,
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('CRM team export error:', err);
      Swal.fire({ icon: 'error', title: 'Export Failed', text: err.message });
    } finally {
      setExporting(false);
    }
  };

  /* ======================================================== */
  /* BULK IMPORT CRM TEAM FROM SPREADSHEET                   */
  /* ======================================================== */
  const handleDownloadCrmTeamTemplate = () => {
    const headers = [
      'Full Name',
      'Email Address',
      'Phone Number',
      'Password',
      'Access Type',
      'Assigned Companies',
      'Status',
      'Notes'
    ];
    const sampleRows = [
      [
        'Rahul Sharma',
        'rahul.sharma@example.com',
        '+91 9876543210',
        'Pass@1234',
        'all',
        '',
        'active',
        'Senior lead specialist'
      ],
      [
        'Priya Verma',
        'priya.v@example.com',
        '+91 9811223344',
        'Pass@5678',
        'specific',
        companies.length > 0 ? companies[0].company_name : 'Acme Corporates',
        'active',
        'Account specialist'
      ]
    ];

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...sampleRows.map((r) => r.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crm_team_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          Swal.fire({ icon: 'warning', title: 'Empty File', text: 'No data rows found in uploaded file.' });
          setImportParsed([]);
          return;
        }

        const parsed = jsonRows.map((row, idx) => {
          const name = (row['Full Name'] || row.name || row['Name'] || '').trim();
          const email = (row['Email Address'] || row.email || row['Email'] || '').toLowerCase().trim();
          const phone = (row['Phone Number'] || row.phone || row['Phone'] || '').trim();
          const password = (row['Password'] || row.password || '').trim();
          const rawAccess = (row['Access Type'] || row.access_type || row['Access Scope'] || '').toLowerCase().trim();
          const access_type = (rawAccess === 'all' || rawAccess.includes('full')) ? 'all' : 'specific';
          const assigned_companies = (row['Assigned Companies'] || row.assigned_companies || row['Companies'] || '').toString().trim();
          const rawStatus = (row['Status'] || row.status || 'active').toLowerCase().trim();
          const status = rawStatus === 'inactive' ? 'inactive' : 'active';
          const notes = (row['Notes'] || row.notes || '').trim();

          const hasValidEmail = !!email && email.includes('@');
          const isValid = !!name && hasValidEmail;

          return {
            _rowNum: idx + 2,
            name,
            email,
            phone,
            password,
            access_type,
            assigned_companies,
            status,
            notes,
            isValid
          };
        });

        setImportParsed(parsed);
      } catch (err) {
        console.error('CRM import parse error:', err);
        Swal.fire({ icon: 'error', title: 'File Error', text: 'Could not parse Excel/CSV: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    const validRows = importParsed.filter((r) => r.isValid);
    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Valid Records', text: 'Please ensure at least one row has a name and valid email.' });
      return;
    }

    try {
      setImporting(true);
      const res = await fetch('/api/admin/crm-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_import',
          members: validRows
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Import Complete',
          text: data.message,
          confirmButtonColor: '#4f46e5'
        });
        setShowImportModal(false);
        setImportFile(null);
        setImportParsed([]);
        fetchData(true);
      } else {
        Swal.fire({ icon: 'error', title: 'Import Failed', text: data.error || 'Server error during import.' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q));

      const matchesScope =
        scopeFilter === 'all' ||
        (scopeFilter === 'full' && m.access_type === 'all') ||
        (scopeFilter === 'specific' && m.access_type === 'specific');

      const matchesStatus =
        statusFilter === 'all' || m.status === statusFilter;

      return matchesSearch && matchesScope && matchesStatus;
    });
  }, [members, searchQuery, scopeFilter, statusFilter]);

  // Bulk selection helpers
  const isAllSelected = useMemo(() => {
    return filteredMembers.length > 0 && filteredMembers.every((m) => selectedMemberIds.includes(m.id));
  }, [filteredMembers, selectedMemberIds]);

  const isSomeSelected = useMemo(() => {
    return selectedMemberIds.length > 0 && !isAllSelected;
  }, [selectedMemberIds, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    }
  };

  const handleToggleSelectMember = (id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedMemberIds([]);
  };

  // Bulk Delete Members
  const handleBulkDeleteMembers = async () => {
    if (selectedMemberIds.length === 0) return;
    const count = selectedMemberIds.length;
    const result = await Swal.fire({
      title: `Delete ${count} CRM Agent${count > 1 ? 's' : ''}?`,
      html: `Are you sure you want to permanently delete <b>${count}</b> selected CRM team member${count > 1 ? 's' : ''}?<br/><span class="text-rose-500 font-medium text-xs mt-2 block">This will revoke their CRM portal access immediately. This action cannot be undone.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, Delete ${count} Agent${count > 1 ? 's' : ''}`,
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/crm-team', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedMemberIds })
        });
        const data = await res.json();
        if (data.success) {
          setSelectedMemberIds([]);
          await fetchData();
          Swal.fire({
            icon: 'success',
            title: 'Deleted Successfully',
            text: data.message || `Deleted ${count} CRM team member(s).`,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({ icon: 'error', title: 'Failed to Delete', text: data.error || 'Server error occurred.' });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
      } finally {
        setLoading(false);
      }
    }
  };

  // Filtered companies for modal checkbox list
  const modalFilteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const q = companySearch.toLowerCase().trim();
    return companies.filter(
      (c) =>
        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
        (c.website && c.website.toLowerCase().includes(q))
    );
  }, [companies, companySearch]);

  // Statistics
  const stats = useMemo(() => {
    const total = members.length;
    const full = members.filter((m) => m.access_type === 'all').length;
    const specific = members.filter((m) => m.access_type === 'specific').length;
    const active = members.filter((m) => m.status === 'active').length;
    return { total, full, specific, active };
  }, [members]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <FiUsers size={20} />
            </span>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              CRM Team & Access Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              SUPERADMIN
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Create and assign dedicated team members who handle CRM leads. Configure full access across all client companies or restrict access to specific companies. Members log in via the dedicated CRM portal at <span className="font-semibold text-indigo-600 dark:text-indigo-400">/crm/login</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 sm:p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            title="Refresh list"
          >
            <FiRefreshCw size={15} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>

          {/* Export CRM Team */}
          <button
            type="button"
            onClick={() => handleExportCrmTeam('xlsx')}
            disabled={exporting}
            className="px-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Export CRM Team to Excel"
          >
            <FiDownload size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>

          {/* Import CRM Team */}
          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportParsed([]);
              setShowImportModal(true);
            }}
            className="px-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Import CRM Team from Excel or CSV"
          >
            <FiUpload size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <FiUserPlus size={15} />
            <span>Add CRM Agent</span>
          </button>
        </div>
      </div>

      {/* Responsive KPI Stats Grid */}
      <div className="grid grid-cols-2 mobile-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Agents */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Agents</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <FiUsers size={16} />
          </div>
        </div>

        {/* Full Access */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Full Access</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.full}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <FiGlobe size={16} />
          </div>
        </div>

        {/* Company Scoped */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Company Scoped</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.specific}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <FiBriefcase size={16} />
          </div>
        </div>

        {/* Active Status */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Active Status</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.active}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <FiCheckCircle size={16} />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-slate-400" size={15} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, email, phone..."
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="text-xs sm:text-sm px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Scopes</option>
            <option value="full">Full Access (All)</option>
            <option value="specific">Company Scoped</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {selectedMemberIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDeleteMembers}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="Delete all selected members"
            >
              <FiTrash2 size={13} />
              <span>Delete Selected ({selectedMemberIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Members List Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading CRM team members...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center">
            <FiUsers size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No CRM Team Members Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || scopeFilter !== 'all' || statusFilter !== 'all'
              ? 'No members match your current search/filter criteria. Try clearing filters.'
              : 'Add your first CRM team member and assign them full or company-scoped CRM leads access.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
          >
            <FiUserPlus size={14} />
            <span>Add Member Now</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select all filtered members"
                    />
                  </th>
                  <th className="px-5 py-3.5">Team Member</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">CRM Leads Scope</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last Login</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredMembers.map((member) => {
                  const isFull = member.access_type === 'all';
                  const assignedCount = member.assigned_companies_details?.length || member.assigned_company_ids?.length || 0;
                  const isSelected = selectedMemberIds.includes(member.id);
                  return (
                    <tr
                      key={member.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/25'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectMember(member.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title={`Select ${member.name}`}
                        />
                      </td>

                      {/* Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{member.name}</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">CRM Leads Specialist</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <FiMail size={12} className="text-slate-400" />
                            {member.email}
                          </p>
                          {member.phone && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <FiPhone size={12} className="text-slate-400" />
                              {member.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Scope Badge & Companies */}
                      <td className="px-5 py-4">
                        {isFull ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <FiGlobe size={13} />
                            <span>Full CRM Access (All Companies)</span>
                          </div>
                        ) : assignedCount === 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <FiAlertCircle size={12} />
                            <span>Unassigned (No Company)</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <FiBriefcase size={12} />
                              <span>{assignedCount} Assigned {assignedCount === 1 ? 'Company' : 'Companies'}</span>
                            </div>
                            {member.assigned_companies_details && member.assigned_companies_details.length > 0 && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {member.assigned_companies_details.slice(0, 3).map((comp) => (
                                  <span
                                    key={comp.id}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 truncate max-w-[130px]"
                                    title={comp.company_name}
                                  >
                                    {comp.company_name}
                                  </span>
                                ))}
                                {member.assigned_companies_details.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                                    +{member.assigned_companies_details.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                            member.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          ></span>
                          <span className="capitalize">{member.status}</span>
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {member.last_login ? (
                          <span className="flex items-center gap-1">
                            <FiClock size={12} />
                            {new Date(member.last_login).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Never logged in</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 transition-colors"
                            title="Edit Member & Permissions"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member)}
                            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
                            title="Delete Member"
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

          {/* Mobile Cards View */}
          <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredMembers.map((member) => {
              const isFull = member.access_type === 'all';
              const assignedCount = member.assigned_companies_details?.length || member.assigned_company_ids?.length || 0;
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <div
                  key={member.id}
                  className={`p-3.5 sm:p-4 space-y-3 transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/25 ring-1 ring-indigo-500/30'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectMember(member.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        title={`Select ${member.name}`}
                      />
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {member.name ? member.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{member.name}</h4>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">CRM Specialist</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(member)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        member.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      <span className="capitalize">{member.status}</span>
                    </button>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl">
                    <p className="flex items-center gap-2">
                      <FiMail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </p>
                    {member.phone && (
                      <p className="flex items-center gap-2">
                        <FiPhone size={12} className="text-slate-400 shrink-0" />
                        <span>{member.phone}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access Scope:</p>
                    {isFull ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <FiGlobe size={12} /> Full CRM Access (All Companies)
                      </span>
                    ) : assignedCount === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <FiAlertCircle size={11} /> Unassigned (No Company)
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <FiBriefcase size={11} /> {assignedCount} Assigned Companies
                        </span>
                        {member.assigned_companies_details && member.assigned_companies_details.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {member.assigned_companies_details.map((c) => (
                              <span key={c.id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                {c.company_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400">
                      {member.last_login ? `Login: ${new Date(member.last_login).toLocaleDateString()}` : 'Never logged in'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(member)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg font-semibold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200"
                      >
                        <FiEdit2 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTIONS BAR */}
      {selectedMemberIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs sm:text-sm font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[11px] font-bold">
              {selectedMemberIds.length}
            </span>
            <span>selected</span>
          </span>
          <div className="h-4 w-px bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Deselect
          </button>
          <button
            type="button"
            onClick={handleBulkDeleteMembers}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
          >
            <FiTrash2 size={13} />
            <span>Delete Selected ({selectedMemberIds.length})</span>
          </button>
        </div>
      )}

      {/* ADD MEMBER MODAL (Responsive Portal with Sticky Header & Sticky Footer) */}
      {mounted && showAddModal && createPortal(
        <div role="dialog" aria-modal="true" className="modal-portal fixed inset-0 z-[9999] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-800 sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-700 flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="modal-row keep-row flex items-center justify-between flex-nowrap p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-indigo-50/50 to-white dark:from-slate-800 dark:to-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
                  <FiUserPlus size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">Add CRM Team Member</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Create login credentials and assign CRM permissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="add-crm-member-form" onSubmit={handleCreateMember} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="agent@company.com"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Login Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <FiKey size={11} /> Generate
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={formShowPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Enter strong password"
                      className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPassword(!formShowPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {formShowPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Access Scope Options */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  CRM Leads Access Scope <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    onClick={() => setFormAccessType('specific')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      formAccessType === 'specific'
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_type"
                      checked={formAccessType === 'specific'}
                      onChange={() => setFormAccessType('specific')}
                      className="mt-0.5 text-indigo-600 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">🏢 Specific Companies</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Restricts to leads belonging only to selected client companies.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setFormAccessType('all')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      formAccessType === 'all'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_type"
                      checked={formAccessType === 'all'}
                      onChange={() => setFormAccessType('all')}
                      className="mt-0.5 text-emerald-600 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">🌐 Full Access (All)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Permits agent to view and handle leads across all companies.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Company Selection Checklist */}
              {formAccessType === 'specific' && (
                <div className="space-y-2.5 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        Assign Companies ({formSelectedCompanies.length} selected)
                      </span>
                      <p className="text-[10px] text-slate-500">Check authorized client companies</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCompanies}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllCompanies}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        title="Unassign all companies (Assign Null)"
                      >
                        Assign None (Null)
                      </button>
                    </div>
                  </div>

                  {formSelectedCompanies.length === 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <FiAlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>No company selected. This team member will be created with <strong>null / unassigned</strong> company access.</span>
                    </div>
                  )}

                  {companies.length > 4 && (
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FiSearch className="text-slate-400" size={13} />
                      </div>
                      <input
                        type="text"
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        placeholder="Filter companies..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {modalFilteredCompanies.map((comp) => {
                      const isSelected = formSelectedCompanies.includes(comp.id);
                      return (
                        <div
                          key={comp.id}
                          onClick={() => handleToggleCompany(comp.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs truncate">{comp.company_name}</p>
                            {comp.website && (
                              <p className="text-[10px] text-slate-400 truncate">{comp.website}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="active">Active (Permit Login)</option>
                    <option value="inactive">Inactive (Block Login)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Lead specialist"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </form>

            {/* Sticky Footer Actions */}
            <div className="modal-row keep-row p-3.5 sm:p-5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-crm-member-form"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create CRM Member'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT MEMBER MODAL (Responsive Portal with Sticky Header & Sticky Footer) */}
      {mounted && showEditModal && editingMember && createPortal(
        <div role="dialog" aria-modal="true" className="modal-portal fixed inset-0 z-[9999] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-800 sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-700 flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="modal-row keep-row flex items-center justify-between flex-nowrap p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-indigo-50/50 to-white dark:from-slate-800 dark:to-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
                  <FiEdit2 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">Edit Member Permissions</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Modify contact info, reset password, or update company scopes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="edit-crm-member-form" onSubmit={handleUpdateMember} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reset Password (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <FiKey size={11} /> Generate
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={formShowPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPassword(!formShowPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {formShowPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Access Scope Options */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  CRM Leads Access Scope
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    onClick={() => setFormAccessType('specific')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      formAccessType === 'specific'
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_type_edit"
                      checked={formAccessType === 'specific'}
                      onChange={() => setFormAccessType('specific')}
                      className="mt-0.5 text-indigo-600 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">🏢 Specific Companies</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Restricts to leads belonging only to selected client companies.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setFormAccessType('all')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      formAccessType === 'all'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_type_edit"
                      checked={formAccessType === 'all'}
                      onChange={() => setFormAccessType('all')}
                      className="mt-0.5 text-emerald-600 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">🌐 Full Access (All)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Permits agent to view and handle leads across all companies.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Company Selection Checklist */}
              {formAccessType === 'specific' && (
                <div className="space-y-2.5 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        Assign Companies ({formSelectedCompanies.length} selected)
                      </span>
                      <p className="text-[10px] text-slate-500">Check authorized client companies</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCompanies}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllCompanies}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        title="Unassign all companies (Assign Null)"
                      >
                        Assign None (Null)
                      </button>
                    </div>
                  </div>

                  {formSelectedCompanies.length === 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <FiAlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>No company selected. This team member will be created with <strong>null / unassigned</strong> company access.</span>
                    </div>
                  )}

                  {companies.length > 4 && (
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FiSearch className="text-slate-400" size={13} />
                      </div>
                      <input
                        type="text"
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        placeholder="Filter companies..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {modalFilteredCompanies.map((comp) => {
                      const isSelected = formSelectedCompanies.includes(comp.id);
                      return (
                        <div
                          key={comp.id}
                          onClick={() => handleToggleCompany(comp.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs truncate">{comp.company_name}</p>
                            {comp.website && (
                              <p className="text-[10px] text-slate-400 truncate">{comp.website}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="active">Active (Permit Login)</option>
                    <option value="inactive">Inactive (Block Login)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </form>

            {/* Sticky Footer Actions */}
            <div className="modal-row keep-row p-3.5 sm:p-5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-crm-member-form"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREDENTIALS SHARE MODAL */}
      {mounted && createdCredentials && createPortal(
        <div role="dialog" aria-modal="true" className="modal-portal fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="modal-row keep-row flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
                <FiCheckCircle size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">CRM Member Created!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Share login credentials with the agent</p>
              </div>
            </div>

            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Portal Login URL</span>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 truncate">{createdCredentials.loginUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.loginUrl);
                      Swal.fire({ icon: 'success', title: 'URL Copied', timer: 1200, showConfirmButton: false });
                    }}
                    className="p-1 hover:text-indigo-600 shrink-0"
                    title="Copy URL"
                  >
                    <FiCopy size={13} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Email</span>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{createdCredentials.email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.email);
                      Swal.fire({ icon: 'success', title: 'Email Copied', timer: 1200, showConfirmButton: false });
                    }}
                    className="p-1 hover:text-indigo-600 shrink-0"
                    title="Copy Email"
                  >
                    <FiCopy size={13} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Password</span>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-mono font-bold text-slate-900 dark:text-white truncate">{createdCredentials.password}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.password);
                      Swal.fire({ icon: 'success', title: 'Password Copied', timer: 1200, showConfirmButton: false });
                    }}
                    className="p-1 hover:text-indigo-600 shrink-0"
                    title="Copy Password"
                  >
                    <FiCopy size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const fullText = `CRM Leads Portal Login Details:\nURL: ${createdCredentials.loginUrl}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(fullText);
                  Swal.fire({ icon: 'success', title: 'All Details Copied!', timer: 1500, showConfirmButton: false });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors"
              >
                <FiCopy size={13} /> Copy All
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: BULK IMPORT CRM TEAM MEMBERS                   */}
      {/* ======================================================== */}
      {mounted && showImportModal && createPortal(
        <div role="dialog" aria-modal="true" className="modal-portal fixed inset-0 z-[999999] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full sm:max-w-3xl bg-white dark:bg-slate-800 sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-700 flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="modal-row keep-row flex items-center justify-between flex-nowrap p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  <FiUpload size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Import CRM Team Members
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bulk add or update CRM lead managers via Excel (.xlsx, .xls) or CSV
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportParsed([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Step 1: Download Sample Template */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <FiFileText className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                      Need the CRM team spreadsheet template?
                    </p>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                      Download our pre-formatted CSV template with standard fields and sample data.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCrmTeamTemplate}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors shrink-0"
                >
                  <FiDownload size={13} />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Step 2: File Upload Dropzone */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase text-[10px] tracking-wider">
                  Select Spreadsheet File (.xlsx, .xls, .csv)
                </label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-900/30">
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleImportFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <FiUpload size={22} />
                    </div>
                    {importFile ? (
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{importFile.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {(importFile.size / 1024).toFixed(1)} KB &bull; {importParsed.length} rows parsed
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                          Click to browse or drag and drop spreadsheet here
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Supports Microsoft Excel (.xlsx, .xls) and CSV files
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Live Preview Table */}
              {importParsed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      Parsed Preview ({importParsed.length} Total Rows)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {importParsed.filter((r) => r.isValid).length} Ready to Import
                      </span>
                      {importParsed.some((r) => !r.isValid) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                          {importParsed.filter((r) => !r.isValid).length} Invalid Rows
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Agent Name</th>
                          <th className="py-2 px-3">Email Address</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3">Access Scope</th>
                          <th className="py-2 px-3">Companies</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                        {importParsed.slice(0, 50).map((r, i) => (
                          <tr key={i} className={r.isValid ? 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30' : 'bg-rose-50/40 dark:bg-rose-950/20'}>
                            <td className="py-1.5 px-3 font-mono text-slate-400">{r._rowNum}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                              {r.name || <span className="text-rose-500 italic">Missing Name</span>}
                            </td>
                            <td className="py-1.5 px-3 truncate max-w-[150px]">
                              {r.email || <span className="text-rose-500 italic">Missing Email</span>}
                            </td>
                            <td className="py-1.5 px-3 truncate max-w-[100px]">{r.phone || '—'}</td>
                            <td className="py-1.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                r.access_type === 'all'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              }`}>
                                {r.access_type === 'all' ? 'All Companies' : 'Specific'}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 truncate max-w-[120px] text-slate-500 dark:text-slate-400">
                              {r.access_type === 'all' ? 'Full Access' : (r.assigned_companies || 'None')}
                            </td>
                            <td className="py-1.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                r.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <FiCheck size={11} /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  <FiX size={11} /> Invalid
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importParsed.length > 50 && (
                    <p className="text-[10px] text-slate-400 text-right">
                      Showing first 50 rows of {importParsed.length}. All valid rows will be imported.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="modal-row keep-row p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportParsed([]);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || importParsed.filter((r) => r.isValid).length === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Confirm & Import (${importParsed.filter((r) => r.isValid).length})`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
