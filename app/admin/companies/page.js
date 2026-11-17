'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FiBriefcase,
  FiGlobe,
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiKey,
  FiCopy,
  FiCheck,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiShield,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiLayers,
  FiSliders,
  FiServer,
  FiFileText,
  FiDownload,
  FiUpload
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function SuperadminCompanyCredentialsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Import & Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importParsed, setImportParsed] = useState([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Revealed passwords state: { [id]: boolean }
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Form states
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [modalShowPassword, setModalShowPassword] = useState(true);

  const initialForm = {
    company_name: '',
    website_url: '',
    admin_url: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    username: '',
    password: '',
    platform: 'WordPress',
    status: 'Active',
    notes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // Fetch Companies
  const fetchCompanies = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);

      const res = await fetch(`/api/admin/companies?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCompanies(data.companies || []);
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: data.message || 'Failed to fetch companies.',
          showConfirmButton: false,
          timer: 3000
        });
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Network error fetching companies.',
        showConfirmButton: false,
        timer: 3000
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter, platformFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  /* ======================================================== */
  /* EXPORT COMPANIES TO EXCEL / CSV                         */
  /* ======================================================== */
  const handleExportCompanies = async (format = 'xlsx') => {
    if (companies.length === 0) {
      Swal.fire({ icon: 'info', title: 'No Data', text: 'There are no companies to export.' });
      return;
    }

    try {
      setExporting(true);
      const XLSX = await import('xlsx');
      const exportData = companies.map((c, idx) => ({
        'No.': idx + 1,
        'Company Name': c.company_name || '',
        'Website URL': c.website_url || '',
        'Admin Login URL': c.admin_url || '',
        'Platform': c.platform || 'WordPress',
        'Admin Contact Name': c.admin_name || '',
        'Admin Email': c.admin_email || '',
        'Admin Phone': c.admin_phone || '',
        'Username': c.username || '',
        'Password': c.password || '',
        'Status': c.status || 'Active',
        'Notes': c.notes || '',
        'Created Date': c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Companies');

      if (format === 'csv') {
        XLSX.writeFile(wb, `companies_credentials_export_${dateStr}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, `companies_credentials_export_${dateStr}.xlsx`);
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Exported ${companies.length} companies (${format.toUpperCase()})`,
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('Export error:', err);
      Swal.fire({ icon: 'error', title: 'Export Failed', text: err.message });
    } finally {
      setExporting(false);
    }
  };

  /* ======================================================== */
  /* BULK IMPORT COMPANIES FROM SPREADSHEET                  */
  /* ======================================================== */
  const handleDownloadCompanyTemplate = () => {
    const headers = [
      'Company Name',
      'Website URL',
      'Admin Login URL',
      'Platform',
      'Admin Name',
      'Admin Email',
      'Admin Phone',
      'Username',
      'Password',
      'Status',
      'Notes'
    ];
    const sampleRows = [
      [
        'Acme Global Solutions',
        'https://acmeglobal.com',
        'https://acmeglobal.com/wp-admin',
        'WordPress',
        'John Smith',
        'john@acmeglobal.com',
        '+91 9876543210',
        'admin_acme',
        'Pass@12345',
        'Active',
        'Primary corporate client'
      ],
      [
        'NextGen Retailers',
        'https://nextgenretail.shop',
        'https://nextgenretail.shop/admin',
        'Shopify',
        'Anita Verma',
        'anita@nextgenretail.shop',
        '+91 9811223344',
        'anita_owner',
        'Store#2026Secure',
        'Active',
        'E-commerce client website'
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
    link.download = 'company_credentials_import_template.csv';
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
          Swal.fire({ icon: 'warning', title: 'Empty File', text: 'No rows found in uploaded file.' });
          setImportParsed([]);
          return;
        }

        const parsed = jsonRows.map((row, idx) => {
          const company_name = (row['Company Name'] || row.company_name || row.Company || row.company || '').trim();
          const website_url = (row['Website URL'] || row.website_url || row.website || row.Website || '').trim();
          const admin_url = (row['Admin Login URL'] || row.admin_url || row['Admin URL'] || '').trim();
          const platform = (row['Platform'] || row.platform || 'WordPress').trim();
          const admin_name = (row['Admin Name'] || row.admin_name || row['Contact Name'] || '').trim();
          const admin_email = (row['Admin Email'] || row.admin_email || row.email || row.Email || '').trim();
          const admin_phone = (row['Admin Phone'] || row.admin_phone || row.phone || row.Phone || '').trim();
          const username = (row['Username'] || row.username || 'admin').trim();
          const password = (row['Password'] || row.password || 'Pass@1234').trim();
          const status = (row['Status'] || row.status || 'Active').trim();
          const notes = (row['Notes'] || row.notes || '').trim();

          const isValid = !!company_name;
          return {
            _rowNum: idx + 2,
            company_name,
            website_url,
            admin_url,
            platform,
            admin_name,
            admin_email,
            admin_phone,
            username,
            password,
            status,
            notes,
            isValid
          };
        });

        setImportParsed(parsed);
      } catch (err) {
        console.error('File parsing error:', err);
        Swal.fire({ icon: 'error', title: 'File Error', text: 'Could not parse Excel/CSV file: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    const validRows = importParsed.filter((r) => r.isValid);
    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Valid Records', text: 'Please ensure at least one company has a valid name.' });
      return;
    }

    try {
      setImporting(true);
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_import',
          companies: validRows
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
        fetchCompanies(true);
      } else {
        Swal.fire({ icon: 'error', title: 'Import Failed', text: data.message || 'Server error during import.' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  // Toggle inline password visibility
  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Generate strong random password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    const defaultPassword = generateStrongPassword();
    setFormData({
      ...initialForm,
      password: defaultPassword
    });
    setModalShowPassword(true);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (comp) => {
    setSelectedCompany(comp);
    setFormData({
      company_name: comp.company_name || '',
      website_url: comp.website_url || '',
      admin_url: comp.admin_url || '',
      admin_name: comp.admin_name || '',
      admin_email: comp.admin_email || '',
      admin_phone: comp.admin_phone || '',
      username: comp.username || '',
      password: comp.password || '',
      platform: comp.platform || 'WordPress',
      status: comp.status || 'Active',
      notes: comp.notes || ''
    });
    setModalShowPassword(false);
    setShowEditModal(true);
  };

  // Auto-fill admin URL when website changes in form
  const handleWebsiteChange = (url) => {
    setFormData((prev) => {
      const trimmed = url.trim();
      const updated = { ...prev, website_url: url };
      // If admin URL hasn't been manually set or matches previous default, suggest default
      if (!prev.admin_url || prev.admin_url.endsWith('/wp-admin')) {
        if (trimmed) {
          const base = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
          updated.admin_url = `${base.replace(/\/$/, '')}/wp-admin`;
        }
      }
      return updated;
    });
  };

  // Submit Add Company Credentials
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      Swal.fire('Required', 'Please enter a company name.', 'warning');
      return;
    }
    if (!formData.username.trim()) {
      Swal.fire('Required', 'Please enter the username.', 'warning');
      return;
    }
    if (!formData.password.trim()) {
      Swal.fire('Required', 'Please enter a password.', 'warning');
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        fetchCompanies(true);
        Swal.fire({
          icon: 'success',
          title: 'Company Credentials Saved!',
          html: `
            <div style="text-align: left; font-size: 0.85rem; padding: 8px; line-height: 1.6;">
              <p><b>Company:</b> ${formData.company_name}</p>
              <p><b>Website:</b> ${formData.website_url || 'N/A'}</p>
              <p><b>Username:</b> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${formData.username}</code></p>
              <p><b>Password:</b> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${formData.password}</code></p>
            </div>
          `,
          confirmButtonColor: '#0284c7'
        });
      } else {
        Swal.fire('Failed', data.message || 'Error creating company credentials.', 'error');
      }
    } catch (err) {
      console.error('Error submitting company:', err);
      Swal.fire('Error', 'Network error creating company.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Company Credentials
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      setFormSubmitting(true);
      const res = await fetch('/api/admin/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCompany.id,
          ...formData
        })
      });
      const data = await res.json();

      if (data.success) {
        setShowEditModal(false);
        fetchCompanies(true);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Credentials updated successfully!',
          showConfirmButton: false,
          timer: 2500
        });
      } else {
        Swal.fire('Failed', data.message || 'Error updating credentials.', 'error');
      }
    } catch (err) {
      console.error('Error updating company:', err);
      Swal.fire('Error', 'Network error updating credentials.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Company Credentials
  const handleDeleteCompany = (comp) => {
    Swal.fire({
      title: `Delete ${comp.company_name}?`,
      text: 'Are you sure you want to delete these company credentials?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete credentials'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/admin/companies?id=${comp.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            fetchCompanies(true);
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: `${comp.company_name} credentials deleted.`,
              showConfirmButton: false,
              timer: 2500
            });
          } else {
            Swal.fire('Failed', data.message || 'Could not delete credentials.', 'error');
          }
        } catch (err) {
          Swal.fire('Error', 'Network error deleting credentials.', 'error');
        }
      }
    });
  };

  // Copy helper
  const handleCopyText = (text, label = 'Copied to clipboard!') => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: label,
      showConfirmButton: false,
      timer: 2000
    });
  };

  // Copy Full Login Credentials
  const handleCopyFullCredentials = (comp) => {
    const text = `
🏢 Company: ${comp.company_name}
🌐 Website: ${comp.website_url || 'N/A'}
🔑 Admin Login URL: ${comp.admin_url || comp.website_url || 'N/A'}
👤 Admin / Contact: ${comp.admin_name || 'N/A'}
📧 Email: ${comp.admin_email || 'N/A'}
📱 Phone: ${comp.admin_phone || 'N/A'}
👤 Username: ${comp.username}
🔒 Password: ${comp.password}
⚙️ Platform: ${comp.platform || 'WordPress'}
📝 Notes: ${comp.notes || 'None'}
`.trim();

    handleCopyText(text, `Copied full credentials for ${comp.company_name}!`);
  };

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.status?.toLowerCase() === 'active').length;
    const wpCount = companies.filter((c) => c.platform?.toLowerCase().includes('word')).length;
    const otherCount = total - wpCount;
    return { total, active, wpCount, otherCount };
  }, [companies]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & ACTIONS                                  */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-md font-bold text-xl shrink-0">
            <FiBriefcase size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Company Admin & Website Credentials
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                Superadmin Vault
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Securely store and manage company admin details, website URLs, admin login URLs, usernames, and passwords.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchCompanies(true)}
            disabled={refreshing}
            className="p-2 sm:p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
            title="Refresh List"
          >
            <FiRefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={() => handleExportCompanies('xlsx')}
            disabled={exporting}
            className="px-3 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Export companies to Excel"
          >
            <FiDownload size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportParsed([]);
              setShowImportModal(true);
            }}
            className="px-3 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Import companies from Excel or CSV"
          >
            <FiUpload size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
          >
            <FiPlus size={16} />
            <span>Add Company Credentials</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATS KPI CARDS                                       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Companies</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FiBriefcase size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active Accounts</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <FiCheckCircle size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">WordPress Sites</p>
            <p className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{stats.wpCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
            <FiGlobe size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Custom / Other CMS</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.otherCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <FiServer size={20} />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SEARCH & FILTERS BAR                                   */}
      {/* ======================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by company name, website url, admin name, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Platforms</option>
            <option value="wordpress">WordPress</option>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="cpanel">cPanel / Hosting</option>
            <option value="custom portal">Custom Portal</option>
            <option value="other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. COMPANIES LIST TABLE & MOBILE CARDS                   */}
      {/* ======================================================== */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading company credentials...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto text-2xl font-bold">
            <FiBriefcase size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Company Credentials Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || platformFilter !== 'all'
              ? 'No records match your filter criteria.'
              : 'You have not added any company credentials yet. Click "Add Company Credentials" to store your first login.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            + Add Company Credentials
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Company & Website</th>
                  <th className="py-3.5 px-4">Admin Contact</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Password</th>
                  <th className="py-3.5 px-4">Platform / Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                {companies.map((comp) => {
                  const isPwdVisible = visiblePasswords[comp.id] || false;
                  return (
                    <tr key={comp.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      {/* 1. Company & Website */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-blue-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/20">
                            {comp.company_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                              {comp.company_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {comp.website_url ? (
                                <a
                                  href={comp.website_url.startsWith('http') ? comp.website_url : `https://${comp.website_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold truncate"
                                  title="Open Website"
                                >
                                  <FiGlobe size={11} className="shrink-0" />
                                  <span className="truncate">{comp.website_url}</span>
                                  <FiExternalLink size={10} className="shrink-0" />
                                </a>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">No website</span>
                              )}

                              {comp.admin_url && (
                                <a
                                  href={comp.admin_url.startsWith('http') ? comp.admin_url : `https://${comp.admin_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 shrink-0"
                                  title="Open Admin Login Page"
                                >
                                  <FiKey size={10} />
                                  <span>Login Page</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Admin Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {comp.admin_name || 'Admin'}
                          </p>
                          {comp.admin_email && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {comp.admin_email}
                            </p>
                          )}
                          {comp.admin_phone && (
                            <p className="text-[10px] text-gray-400">
                              {comp.admin_phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 3. Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 select-all">
                            {comp.username}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(comp.username, 'Username copied!')}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy Username"
                          >
                            <FiCopy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* 4. Password */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 select-all min-w-[90px]">
                            {isPwdVisible ? comp.password : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(comp.id)}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={isPwdVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPwdVisible ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyText(comp.password, 'Password copied!')}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy Password"
                          >
                            <FiCopy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* 5. Platform / Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                            {comp.platform || 'WordPress'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              comp.status?.toLowerCase() === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                            }`}
                          >
                            {comp.status}
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyFullCredentials(comp)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Copy Full Handover Details"
                          >
                            <FiCopy size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(comp)}
                            className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Edit Credentials"
                          >
                            <FiEdit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCompany(comp)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-800 p-2 space-y-3">
            {companies.map((comp) => {
              const isPwdVisible = visiblePasswords[comp.id] || false;
              return (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 space-y-3"
                >
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-blue-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/20">
                        {comp.company_name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                          {comp.company_name}
                        </h4>
                        {comp.website_url && (
                          <a
                            href={comp.website_url.startsWith('http') ? comp.website_url : `https://${comp.website_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold mt-0.5 break-all"
                          >
                            <FiGlobe size={11} />
                            <span>{comp.website_url}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        comp.status?.toLowerCase() === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                      }`}
                    >
                      {comp.status}
                    </span>
                  </div>

                  {/* Credentials Box */}
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Admin:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{comp.admin_name || 'Admin'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Username:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">{comp.username}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(comp.username, 'Username copied!')}
                          className="text-blue-600 p-0.5"
                        >
                          <FiCopy size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                          {isPwdVisible ? comp.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(comp.id)}
                          className="text-gray-500 p-0.5"
                        >
                          {isPwdVisible ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(comp.password, 'Password copied!')}
                          className="text-blue-600 p-0.5"
                        >
                          <FiCopy size={11} />
                        </button>
                      </div>
                    </div>

                    {comp.admin_url && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800">
                        <span className="text-gray-500 dark:text-gray-400">Login URL:</span>
                        <a
                          href={comp.admin_url.startsWith('http') ? comp.admin_url : `https://${comp.admin_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline truncate max-w-[170px]"
                        >
                          {comp.admin_url}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 uppercase">
                      {comp.platform || 'WordPress'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyFullCredentials(comp)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs"
                        title="Copy All"
                      >
                        <FiCopy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(comp)}
                        className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs"
                        title="Edit"
                      >
                        <FiEdit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCompany(comp)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs"
                        title="Delete"
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

      {/* ======================================================== */}
      {/* 5. MODAL: ADD COMPANY CREDENTIALS                         */}
      {/* ======================================================== */}
      {mounted && showAddModal && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="modal-portal fixed inset-0 z-[999999] bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          style={{ zIndex: 999999, display: 'flex', flexWrap: 'nowrap' }}
        >
          <div
            className="leads-modal-card flex-nowrap w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden my-auto"
            style={{ display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', maxHeight: 'calc(100dvh - 16px)' }}
          >
            {/* Header */}
            <div
              className="p-3.5 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-gradient-to-r from-gray-50 via-white to-cyan-50/40 dark:from-slate-900 dark:to-cyan-950/20"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <FiBriefcase size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    Add Company Credentials
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    Store company admin details, website URL, username, and password.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 text-xs">
                {/* 1. Company & Website Details */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                    <FiGlobe size={13} />
                    <span>Company & Website Details</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Tech Solutions"
                        required
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Website URL *</label>
                      <input
                        type="text"
                        placeholder="e.g. https://acmetech.com"
                        required
                        value={formData.website_url}
                        onChange={(e) => handleWebsiteChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Login URL</label>
                      <input
                        type="text"
                        placeholder="e.g. https://acmetech.com/wp-admin"
                        value={formData.admin_url}
                        onChange={(e) => setFormData({ ...formData, admin_url: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Platform / CMS</label>
                      <select
                        value={formData.platform}
                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      >
                        <option value="WordPress">WordPress</option>
                        <option value="Shopify">Shopify</option>
                        <option value="WooCommerce">WooCommerce</option>
                        <option value="cPanel">cPanel / Web Hosting</option>
                        <option value="Custom Portal">Custom Portal</option>
                        <option value="Magento">Magento</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Admin Login Credentials */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <FiLock size={13} />
                    <span>Company Admin Login Credentials</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Username *</label>
                      <input
                        type="text"
                        placeholder="e.g. admin or webmaster"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700 dark:text-gray-300">Password *</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, password: generateStrongPassword() })}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                        >
                          ⚡ Generate Password
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={modalShowPassword ? 'text' : 'password'}
                          placeholder="Enter password..."
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-3 pr-10 py-2 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setModalShowPassword(!modalShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                        >
                          {modalShowPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Company Admin Contact Details */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <FiUser size={13} />
                    <span>Company Admin Contact (Optional)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={formData.admin_name}
                        onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Email</label>
                      <input
                        type="email"
                        placeholder="e.g. admin@acmetech.com"
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. +1 555 123 4567"
                        value={formData.admin_phone}
                        onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Notes / Instructions</label>
                    <textarea
                      placeholder="Hosting information, 2FA backup codes, server IP, or access instructions..."
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-2.5 shrink-0"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {formSubmitting ? 'Saving...' : 'Save Company Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: EDIT COMPANY CREDENTIALS                        */}
      {/* ======================================================== */}
      {mounted && showEditModal && selectedCompany && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="modal-portal fixed inset-0 z-[999999] bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          style={{ zIndex: 999999, display: 'flex', flexWrap: 'nowrap' }}
        >
          <div
            className="leads-modal-card flex-nowrap w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden my-auto"
            style={{ display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', maxHeight: 'calc(100dvh - 16px)' }}
          >
            {/* Header */}
            <div
              className="p-3.5 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-gradient-to-r from-gray-50 via-white to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <FiEdit2 size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    Edit Company Credentials
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    Modify company details, website URL, username, or password.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 text-xs">
                {/* 1. Company & Website Details */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                    <FiGlobe size={13} />
                    <span>Company & Website Details</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Website URL *</label>
                      <input
                        type="text"
                        required
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Login URL</label>
                      <input
                        type="text"
                        placeholder="https://.../wp-admin"
                        value={formData.admin_url}
                        onChange={(e) => setFormData({ ...formData, admin_url: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Platform / CMS</label>
                      <select
                        value={formData.platform}
                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      >
                        <option value="WordPress">WordPress</option>
                        <option value="Shopify">Shopify</option>
                        <option value="WooCommerce">WooCommerce</option>
                        <option value="cPanel">cPanel / Web Hosting</option>
                        <option value="Custom Portal">Custom Portal</option>
                        <option value="Magento">Magento</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Login Credentials */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <FiLock size={13} />
                    <span>Login Credentials</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Username *</label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700 dark:text-gray-300">Password *</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, password: generateStrongPassword() })}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                        >
                          ⚡ Generate Password
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={modalShowPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-3 pr-10 py-2 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setModalShowPassword(!modalShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                        >
                          {modalShowPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Company Admin Details */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <FiUser size={13} />
                    <span>Admin Contact & Status</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Full Name</label>
                      <input
                        type="text"
                        value={formData.admin_name}
                        onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Email</label>
                      <input
                        type="email"
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Notes / Instructions</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-2.5 shrink-0"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 5. BULK IMPORT COMPANIES MODAL                           */}
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
                    Import Company Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bulk add or update companies via Excel (.xlsx, .xls) or CSV
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
                      Need the spreadsheet format?
                    </p>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                      Download our sample CSV template with standard column headers and realistic example rows.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCompanyTemplate}
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
                          {importParsed.filter((r) => !r.isValid).length} Missing Company Name
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Company Name</th>
                          <th className="py-2 px-3">Website</th>
                          <th className="py-2 px-3">Platform</th>
                          <th className="py-2 px-3">Admin User</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                        {importParsed.slice(0, 50).map((r, i) => (
                          <tr key={i} className={r.isValid ? 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30' : 'bg-rose-50/40 dark:bg-rose-950/20'}>
                            <td className="py-1.5 px-3 font-mono text-slate-400">{r._rowNum}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                              {r.company_name || <span className="text-rose-500 italic">Missing</span>}
                            </td>
                            <td className="py-1.5 px-3 truncate max-w-[120px]">{r.website_url || '—'}</td>
                            <td className="py-1.5 px-3">{r.platform || 'WordPress'}</td>
                            <td className="py-1.5 px-3 truncate max-w-[100px]">{r.username || 'admin'}</td>
                            <td className="py-1.5 px-3">{r.status || 'Active'}</td>
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
