'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
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
  FiTarget,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiLayers,
  FiSliders,
  FiMoreVertical,
  FiArrowRight
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function SuperadminCompaniesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Form states
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const initialForm = {
    company_name: '',
    website: '',
    company_email: '',
    company_phone: '',
    subscription_plan: 'free',
    status: 'active',
    api_key: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_phone: '',
    create_client_login: true
  };

  const [formData, setFormData] = useState(initialForm);
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '', confirmPassword: '' });

  // Fetch Companies
  const fetchCompanies = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);

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
  }, [searchQuery, statusFilter, planFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Generate strong random password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Generate clean API key
  const generateApiKey = (companyName) => {
    const slug = (companyName || formData.company_name || 'crm')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16) || 'crm';
    const randomHex = Math.random().toString(36).substring(2, 10);
    return `${slug}_wp_key_${randomHex}`;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    const defaultPassword = generateStrongPassword();
    setFormData({
      ...initialForm,
      admin_password: defaultPassword,
      api_key: generateApiKey('')
    });
    setShowPassword(true);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (comp) => {
    setSelectedCompany(comp);
    setFormData({
      company_name: comp.company_name || '',
      website: comp.website || '',
      company_email: comp.email || '',
      company_phone: comp.phone || '',
      subscription_plan: comp.subscription_plan || 'free',
      status: comp.status || 'active',
      api_key: comp.api_key || '',
      admin_name: comp.admin?.name || '',
      admin_email: comp.admin?.email || '',
      admin_password: '', // Blank unless updating
      admin_phone: comp.admin?.phone || comp.phone || '',
      admin_status: comp.admin?.status || 'active',
      create_client_login: false
    });
    setShowPassword(false);
    setShowEditModal(true);
  };

  // Open Reset Password Modal
  const handleOpenResetModal = (comp) => {
    setSelectedCompany(comp);
    const newPwd = generateStrongPassword();
    setResetPasswordForm({ password: newPwd, confirmPassword: newPwd });
    setShowResetModal(true);
  };

  // Submit Add Company & Admin
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      Swal.fire('Required', 'Please enter a company name.', 'warning');
      return;
    }
    if (!formData.admin_name.trim()) {
      Swal.fire('Required', 'Please enter the admin full name.', 'warning');
      return;
    }
    if (!formData.admin_email.trim()) {
      Swal.fire('Required', 'Please enter admin username/email.', 'warning');
      return;
    }
    if (!formData.admin_password.trim()) {
      Swal.fire('Required', 'Please enter or generate a password.', 'warning');
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
          title: 'Company & Admin Created!',
          html: `
            <div style="text-align: left; font-size: 0.85rem; padding: 8px; line-height: 1.6;">
              <p><b>Company:</b> ${formData.company_name}</p>
              <p><b>Website:</b> ${formData.website || 'N/A'}</p>
              <p><b>Admin Username:</b> ${formData.admin_email}</p>
              <p><b>Password:</b> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${formData.admin_password}</code></p>
              <p><b>API Key:</b> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${data.data?.api_key || formData.api_key}</code></p>
            </div>
          `,
          confirmButtonText: 'Great!',
          confirmButtonColor: '#0284c7'
        });
      } else {
        Swal.fire('Failed', data.message || 'Error creating company & admin.', 'error');
      }
    } catch (err) {
      console.error('Error submitting company:', err);
      Swal.fire('Error', 'Network error creating company.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Company & Admin
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      setFormSubmitting(true);
      const payload = {
        company_id: selectedCompany.id,
        company_name: formData.company_name,
        website: formData.website,
        company_email: formData.company_email,
        company_phone: formData.company_phone,
        subscription_plan: formData.subscription_plan,
        status: formData.status,
        api_key: formData.api_key,
        admin_user_id: selectedCompany.admin?.id || null,
        admin_name: formData.admin_name,
        admin_email: formData.admin_email,
        admin_phone: formData.admin_phone,
        admin_status: formData.admin_status
      };

      if (formData.admin_password && formData.admin_password.trim()) {
        payload.admin_password = formData.admin_password.trim();
      }

      const res = await fetch('/api/admin/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setShowEditModal(false);
        fetchCompanies(true);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Company and Admin updated!',
          showConfirmButton: false,
          timer: 2500
        });
      } else {
        Swal.fire('Failed', data.message || 'Error updating company.', 'error');
      }
    } catch (err) {
      console.error('Error updating company:', err);
      Swal.fire('Error', 'Network error updating company.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Quick Password Reset
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!resetPasswordForm.password.trim()) {
      Swal.fire('Required', 'Please enter a new password.', 'warning');
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await fetch('/api/admin/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          admin_user_id: selectedCompany.admin?.id || null,
          admin_password: resetPasswordForm.password.trim()
        })
      });
      const data = await res.json();

      if (data.success) {
        setShowResetModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Password Updated!',
          html: `
            <p style="font-size: 0.9rem;">New Password for <b>${selectedCompany.admin?.email || selectedCompany.company_name}</b>:</p>
            <p style="margin-top: 8px;"><code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 1rem;">${resetPasswordForm.password}</code></p>
          `,
          confirmButtonColor: '#0284c7'
        });
      } else {
        Swal.fire('Failed', data.message || 'Could not reset password.', 'error');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      Swal.fire('Error', 'Network error resetting password.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Company
  const handleDeleteCompany = (comp) => {
    Swal.fire({
      title: `Delete ${comp.company_name}?`,
      text: 'This will delete the company tenant, its company admin credentials, and associated CRM leads.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete company'
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
              title: `${comp.company_name} deleted.`,
              showConfirmButton: false,
              timer: 2500
            });
          } else {
            Swal.fire('Failed', data.message || 'Could not delete company.', 'error');
          }
        } catch (err) {
          Swal.fire('Error', 'Network error deleting company.', 'error');
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

  // Copy Full Client Handover Credentials
  const handleCopyFullCredentials = (comp) => {
    const text = `
🏢 Company: ${comp.company_name}
🌐 Website: ${comp.website || 'N/A'}
👤 Company Admin: ${comp.admin?.name || 'Admin'}
📧 Username / Email: ${comp.admin?.email || 'N/A'}
🔑 Portal Login: https://devicedesk.flymediatech.com/login
⚡ Webhook API Key: ${comp.api_key || 'N/A'}
`.trim();

    handleCopyText(text, `Copied full credentials for ${comp.company_name}!`);
  };

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.status?.toLowerCase() === 'active').length;
    const totalAdmins = companies.filter((c) => c.admin).length;
    const totalLeads = companies.reduce((acc, c) => acc + (c.leads_count || 0), 0);
    return { total, active, totalAdmins, totalLeads };
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
                Company & Admin Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                Superadmin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Add company tenants, configure website URLs, assign company admin credentials (username, password), and manage API keys.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchCompanies(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
            title="Refresh List"
          >
            <FiRefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <Link
            href="/admin/leads"
            className="px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <FiTarget size={14} />
            <span>Company Leads</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
          >
            <FiPlus size={16} />
            <span>Add Company & Admin</span>
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active Tenants</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <FiCheckCircle size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Company Admins</p>
            <p className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{stats.totalAdmins}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
            <FiShield size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pipeline Leads</p>
            <p className="text-xl sm:text-2xl font-black text-pink-600 dark:text-pink-400 mt-1">{stats.totalLeads}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
            <FiTarget size={20} />
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
            placeholder="Search by company name, website url, admin name, or username/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. COMPANIES LIST TABLE & MOBILE CARDS                   */}
      {/* ======================================================== */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading companies & admin credentials...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto text-2xl font-bold">
            <FiBriefcase size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Companies Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || planFilter !== 'all'
              ? 'No companies matched your current search/filter criteria.'
              : 'You have not added any companies yet. Click "Add Company & Admin" above to register your first tenant.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            + Add Company & Admin
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
                  <th className="py-3.5 px-4">Company Admin (Username)</th>
                  <th className="py-3.5 px-4">Webhook API Key</th>
                  <th className="py-3.5 px-4">Plan / Status</th>
                  <th className="py-3.5 px-4">Leads / Staff</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                {companies.map((comp) => (
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
                          {comp.website ? (
                            <a
                              href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold truncate mt-0.5"
                            >
                              <FiGlobe size={11} className="shrink-0" />
                              <span className="truncate">{comp.website}</span>
                              <FiExternalLink size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">No website specified</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Company Admin (Username & Password) */}
                    <td className="py-3.5 px-4">
                      {comp.admin ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                            <FiUser size={12} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span className="truncate">{comp.admin.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                            <FiMail size={11} className="shrink-0 text-gray-400" />
                            <span className="font-mono truncate">{comp.admin.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(comp.admin.email, 'Admin username copied!')}
                              className="text-gray-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                              title="Copy Username"
                            >
                              <FiCopy size={11} />
                            </button>
                          </div>
                          {comp.admin.phone && (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                              <FiPhone size={10} className="shrink-0" />
                              <span>{comp.admin.phone}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center gap-1">
                          <FiUser size={12} />
                          <span>No Admin Assigned</span>
                        </div>
                      )}
                    </td>

                    {/* 3. API Key */}
                    <td className="py-3.5 px-4">
                      {comp.api_key ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 max-w-[140px] truncate">
                            {comp.api_key}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(comp.api_key, 'Webhook API key copied!')}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy API Key"
                          >
                            <FiCopy size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No Key</span>
                      )}
                    </td>

                    {/* 4. Plan / Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                          {comp.subscription_plan || 'free'}
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

                    {/* 5. Leads / Staff */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <Link
                          href={`/admin/leads?company=${comp.id}`}
                          className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{comp.leads_count || 0} Leads</span>
                          <FiArrowRight size={10} />
                        </Link>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {comp.staff_count || 0} Staff Members
                        </p>
                      </div>
                    </td>

                    {/* 6. Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyFullCredentials(comp)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                          title="Copy Full Login & API Handover Info"
                        >
                          <FiCopy size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenResetModal(comp)}
                          className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                          title="Reset Admin Password"
                        >
                          <FiKey size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(comp)}
                          className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Edit Company & Admin"
                        >
                          <FiEdit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCompany(comp)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Delete Company"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-800 p-2 space-y-3">
            {companies.map((comp) => (
              <div
                key={comp.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-blue-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/20">
                      {comp.company_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                        {comp.company_name}
                      </h4>
                      {comp.website && (
                        <a
                          href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold mt-0.5 break-all"
                        >
                          <FiGlobe size={11} />
                          <span>{comp.website}</span>
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

                {/* Admin info */}
                {comp.admin ? (
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1.5 text-xs">
                    <p className="font-bold text-gray-700 dark:text-gray-300 text-[10px] uppercase tracking-wider">
                      Company Admin Credentials
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Admin:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{comp.admin.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Username:</span>
                      <span className="font-mono text-gray-900 dark:text-white truncate max-w-[170px]">{comp.admin.email}</span>
                    </div>
                    {comp.api_key && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800">
                        <span className="text-gray-500 dark:text-gray-400">API Key:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] truncate max-w-[130px]">{comp.api_key}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(comp.api_key, 'API key copied!')}
                            className="text-blue-600 p-0.5"
                          >
                            <FiCopy size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 font-bold">No Company Admin assigned yet.</p>
                )}

                {/* Footer action buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 uppercase">
                      {comp.subscription_plan}
                    </span>
                    <Link
                      href={`/admin/leads?company=${comp.id}`}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5"
                    >
                      <span>{comp.leads_count || 0} Leads</span>
                      <FiArrowRight size={11} />
                    </Link>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyFullCredentials(comp)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs"
                      title="Copy Handover Details"
                    >
                      <FiCopy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenResetModal(comp)}
                      className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs"
                      title="Reset Password"
                    >
                      <FiKey size={13} />
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
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: ADD COMPANY & ADMIN                             */}
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
            {/* Pinned Modal Header */}
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
                    Add New Company & Admin
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    Register company tenant, website URL, and company admin credentials.
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

            {/* Scrollable Modal Body */}
            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 text-xs">
                {/* SECTION 1: Company Profile */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                    <FiBriefcase size={13} />
                    <span>Company Details</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Tech Solutions"
                        required
                        value={formData.company_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            company_name: val,
                            api_key: prev.api_key.startsWith('crm_') || !prev.api_key ? generateApiKey(val) : prev.api_key
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Website URL *</label>
                      <input
                        type="text"
                        placeholder="e.g. https://acmetech.com"
                        required
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Company Phone (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. +1 555 123 4567"
                        value={formData.company_phone}
                        onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Subscription Plan</label>
                      <select
                        value={formData.subscription_plan}
                        onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      >
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Company Admin Credentials */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <FiShield size={13} />
                    <span>Company Admin Login Credentials</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        required
                        value={formData.admin_name}
                        onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Username / Email *</label>
                      <input
                        type="email"
                        placeholder="e.g. admin@acmetech.com"
                        required
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-700 dark:text-gray-300">Login Password *</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, admin_password: generateStrongPassword() })}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                      >
                        ⚡ Generate Strong Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password..."
                        required
                        value={formData.admin_password}
                        onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                        className="w-full pl-3 pr-10 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                      >
                        {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Contact Phone (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 555 987 6543"
                      value={formData.admin_phone}
                      onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* SECTION 3: Integration API Key & Sync Options */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                      <FiKey size={13} />
                      <span>Webhook Ingestion API Key</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, api_key: generateApiKey(formData.company_name) })}
                      className="text-[11px] text-pink-600 dark:text-pink-400 hover:underline font-bold cursor-pointer"
                    >
                      Regenerate Key
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500 shadow-xs"
                  />

                  <label className="flex items-center gap-2 cursor-pointer mt-2 text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.create_client_login}
                      onChange={(e) => setFormData({ ...formData, create_client_login: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-xs">
                      Also enable Client Portal login on this system with this username & password
                    </span>
                  </label>
                </div>
              </div>

              {/* Pinned Modal Footer */}
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
                  {formSubmitting ? 'Creating Company...' : 'Create Company & Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: EDIT COMPANY & ADMIN                            */}
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
                    Edit Company & Admin Details
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    Update company info, website URL, and admin contact credentials.
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
                {/* Company details */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                    <FiBriefcase size={13} />
                    <span>Company Details</span>
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
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Website URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Subscription Plan</label>
                      <select
                        value={formData.subscription_plan}
                        onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      >
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Company Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Webhook API Key</label>
                    <input
                      type="text"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Company Admin credentials */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <FiShield size={13} />
                    <span>Company Admin Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Username / Email</label>
                      <input
                        type="email"
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Admin Phone</label>
                      <input
                        type="text"
                        value={formData.admin_phone}
                        onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">New Password (Leave blank to keep)</label>
                      <input
                        type="password"
                        placeholder="•••••••• (unchanged)"
                        value={formData.admin_password}
                        onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
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
      {/* 7. MODAL: QUICK RESET PASSWORD                           */}
      {/* ======================================================== */}
      {mounted && showResetModal && selectedCompany && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="modal-portal fixed inset-0 z-[999999] bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          style={{ zIndex: 999999, display: 'flex', flexWrap: 'nowrap' }}
        >
          <div
            className="leads-modal-card flex-nowrap w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden my-auto"
            style={{ display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', maxHeight: 'calc(100dvh - 16px)' }}
          >
            {/* Header */}
            <div
              className="p-3.5 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-gradient-to-r from-gray-50 via-white to-amber-50/40 dark:from-slate-900 dark:to-amber-950/20"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <FiKey size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                    Reset Admin Password
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    For {selectedCompany.company_name} ({selectedCompany.admin?.email || 'Admin'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-3.5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700 dark:text-gray-300">New Password *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = generateStrongPassword();
                        setResetPasswordForm({ password: pwd, confirmPassword: pwd });
                      }}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                    >
                      ⚡ Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={resetPasswordForm.password}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-2.5 shrink-0"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {formSubmitting ? 'Updating...' : 'Update Password'}
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

