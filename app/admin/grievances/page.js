'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FiAlertTriangle,
  FiShield,
  FiMessageSquare,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiUserX,
  FiLock,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiX,
  FiPlus,
  FiSend,
  FiInfo,
  FiCheck,
  FiChevronDown
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function AdminGrievancesPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grievances, setGrievances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    submitted: 0,
    under_review: 0,
    action_taken: 0,
    resolved: 0,
    dismissed: 0,
    urgent_open: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Review Modal State
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('UNDER_REVIEW');
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // New Grievance Modal State (HR Log)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReporterId, setNewReporterId] = useState('');
  const [newTargetId, setNewTargetId] = useState('');
  const [newCategory, setNewCategory] = useState('NOISE_DISTURBANCE');
  const [newSeverity, setNewSeverity] = useState('MEDIUM');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsAnonymous, setNewIsAnonymous] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
    fetchEmployees();
  }, []);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/grievances?role=ADMIN');
      const data = await res.json();
      if (data.success) {
        setGrievances(data.grievances || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load grievances:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (data?.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (e) {
      console.error('Failed to fetch employees:', e);
    }
  };

  const categories = [
    { value: 'NOISE_DISTURBANCE', label: 'Noise / Loud Speaking / Disruption', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
    { value: 'INTERPERSONAL_CONFLICT', label: 'Interpersonal Conflict / Friction', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
    { value: 'WORKPLACE_CONDUCT', label: 'Unprofessional Conduct / Etiquette', badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
    { value: 'COMMUNICATION', label: 'Communication Breakdown', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    { value: 'WORK_ALLOCATION', label: 'Work Allocation / Deadlines', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20' },
    { value: 'FACILITIES_DESK', label: 'Workstation / Seating / Facilities', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20' },
    { value: 'OTHER', label: 'Other Workplace Grievance', badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20' }
  ];

  const getCategoryInfo = (val) => {
    return categories.find(c => c.value === val) || {
      value: val,
      label: val?.replace(/_/g, ' ') || 'Other',
      badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20'
    };
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40';
      case 'LOW':
      default:
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'SUBMITTED':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30';
      case 'UNDER_REVIEW':
        return 'bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-500/30';
      case 'ACTION_TAKEN':
        return 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-400 border-indigo-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30';
      case 'DISMISSED':
        return 'bg-slate-500/15 text-slate-800 dark:text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/15 text-slate-800 dark:text-slate-400 border-slate-500/30';
    }
  };

  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      if (statusFilter !== 'ALL' && g.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && g.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && g.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSubject = g.subject?.toLowerCase().includes(q);
        const matchDesc = g.description?.toLowerCase().includes(q);
        const matchReporter = g.reporter_name?.toLowerCase().includes(q);
        const matchTarget = g.reported_against_name?.toLowerCase().includes(q);
        if (!matchSubject && !matchDesc && !matchReporter && !matchTarget) return false;
      }
      return true;
    });
  }, [grievances, statusFilter, severityFilter, categoryFilter, search]);

  const handleOpenReview = (g) => {
    setSelectedGrievance(g);
    setReviewStatus(g.status === 'SUBMITTED' ? 'UNDER_REVIEW' : g.status);
    setReviewNotes(g.hr_notes || '');
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedGrievance) return;
    try {
      setSavingReview(true);
      const res = await fetch(`/api/grievances/${selectedGrievance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          hr_notes: reviewNotes.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Grievance #${selectedGrievance.id} updated!`,
          showConfirmButton: false,
          timer: 3000
        });
        setSelectedGrievance(null);
        fetchData();
      } else {
        Swal.fire('Error', data.error || 'Failed to update grievance', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Server connection error', 'error');
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteGrievance = async (id) => {
    const confirm = await Swal.fire({
      title: 'Delete Grievance Record?',
      text: `Are you sure you want to permanently delete Grievance #${id}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/grievances/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Deleted', `Grievance #${id} removed.`, 'success');
          if (selectedGrievance?.id === id) setSelectedGrievance(null);
          fetchData();
        } else {
          Swal.fire('Error', data.error || 'Failed to delete grievance', 'error');
        }
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const handleCreateGrievance = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      Swal.fire('Validation Error', 'Subject and detailed description are required.', 'warning');
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_id: newReporterId || 'OFFLINE_HR',
          reported_against_id: newTargetId || null,
          category: newCategory,
          severity: newSeverity,
          subject: newSubject.trim(),
          description: newDescription.trim(),
          is_anonymous: newIsAnonymous ? 1 : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Grievance Recorded',
          text: 'The grievance has been securely logged on the HR desk.',
          timer: 2500,
          showConfirmButton: false
        });
        setShowCreateModal(false);
        setNewSubject('');
        setNewDescription('');
        setNewReporterId('');
        setNewTargetId('');
        setNewIsAnonymous(false);
        fetchData();
      } else {
        Swal.fire('Error', data.error || 'Failed to submit grievance', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400">
              <FiShield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                HR Workplace Grievance Desk
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Confidential workplace feedback, decorum, noise issues, and interpersonal dispute resolution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium border border-slate-300 dark:border-slate-700 shadow-sm transition"
            title="Refresh List"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-600/20 transition"
          >
            <FiPlus className="w-4 h-4" />
            <span>+ Log Grievance</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Filed</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.total || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Submitted / New</span>
          <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">{metrics.submitted || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col justify-between">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Under Review</span>
          <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">{metrics.under_review || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col justify-between">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Action Taken</span>
          <div className="mt-2 text-2xl font-bold text-indigo-700 dark:text-indigo-400">{metrics.action_taken || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Resolved</span>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{metrics.resolved || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col justify-between">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Urgent / Open</span>
          <div className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">{metrics.urgent_open || 0}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject, description, reporter or colleague..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-200 dark:border-slate-800/60">
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading workplace grievances...</div>
        ) : filteredGrievances.length === 0 ? (
          <div className="p-12 rounded-xl bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <FiShield className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Grievances Found</div>
            <p className="text-xs text-slate-500">
              {search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'Try adjusting your filters or search keywords.'
                : 'All clear! There are currently no workplace grievances recorded.'}
            </p>
          </div>
        ) : (
          filteredGrievances.map((g) => {
            const catInfo = getCategoryInfo(g.category);
            return (
              <div
                key={g.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      #{g.id}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(g.status)}`}>
                      {g.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getSeverityBadge(g.severity)}`}>
                      {g.severity} SEVERITY
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${catInfo.badge}`}>
                      {catInfo.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FiClock className="w-3.5 h-3.5" />
                    <span>{new Date(g.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {/* Subject & Description */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{g.subject}</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">{g.description}</p>
                </div>

                {/* Reporter & Reported Against Meta */}
                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {g.is_anonymous ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                        <FiLock className="w-3 h-3" /> Anonymous Employee
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium">
                        <FiUser className="w-3.5 h-3.5 text-rose-500" />
                        Reported by: <strong className="text-slate-900 dark:text-white">{g.reporter_name}</strong> {g.reporter_department && `(${g.reporter_department})`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Regarding:</span>
                    <strong className="text-slate-900 dark:text-white font-medium">{g.reported_against_name}</strong>
                    {g.reported_against_department && <span className="text-slate-500 dark:text-slate-400">({g.reported_against_department})</span>}
                  </div>

                  {g.reviewed_by && (
                    <div className="flex items-center gap-1 ml-auto text-emerald-600 dark:text-emerald-400 font-medium">
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      <span>Reviewed by {g.reviewer_name || g.reviewed_by}</span>
                    </div>
                  )}
                </div>

                {/* HR Notes Callout */}
                {g.hr_notes && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="font-semibold text-rose-600 dark:text-rose-300 flex items-center gap-1">
                      <FiShield className="w-3.5 h-3.5" /> HR Review & Resolution Notes:
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{g.hr_notes}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleDeleteGrievance(g.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs transition"
                    title="Delete Record"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenReview(g)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <FiEdit3 className="w-3.5 h-3.5" />
                    <span>Review & Take Action</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FiShield className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Review Grievance #{selectedGrievance.id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedGrievance(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Details */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Subject</div>
              <div className="font-bold text-slate-900 dark:text-white">{selectedGrievance.subject}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-2">Description</div>
              <div className="text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
                {selectedGrievance.description}
              </div>
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/60 mt-3">
                <div>Category: <strong className="text-slate-800 dark:text-slate-200">{selectedGrievance.category}</strong></div>
                <div>Severity: <strong className="text-slate-800 dark:text-slate-200">{selectedGrievance.severity}</strong></div>
                <div>
                  Regarding: <strong className="text-slate-800 dark:text-slate-200">{selectedGrievance.reported_against_name}</strong>
                </div>
              </div>
            </div>

            {/* HR Action Form */}
            <form onSubmit={handleSaveReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Update Investigation / Resolution Status
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="SUBMITTED">SUBMITTED (Pending Intake)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW (Active Investigation)</option>
                  <option value="ACTION_TAKEN">ACTION_TAKEN (Intervention / Warning Executed)</option>
                  <option value="RESOLVED">RESOLVED (Closed & Concluded)</option>
                  <option value="DISMISSED">DISMISSED (Invalid / Withdrawn)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confidential HR Investigation & Action Notes
                </label>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record internal interviews, mediator notes, verbal warnings, seating adjustments, or conclusion findings..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  These notes will be logged in the permanent record and summarized for the employee upon review.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedGrievance(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReview}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow transition disabled:opacity-50"
                >
                  {savingReview ? 'Saving...' : 'Save & Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Grievance Modal (HR / Offline) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FiPlus className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Log Workplace Grievance (HR Desk)</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGrievance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Reporter / Complainant
                  </label>
                  <select
                    value={newReporterId}
                    onChange={(e) => setNewReporterId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Direct HR Intake / Walk-in</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Colleague Reported Against
                  </label>
                  <select
                    value={newTargetId}
                    onChange={(e) => setNewTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">General Workplace / Facility</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="LOW">Low (Minor annoyance)</option>
                    <option value="MEDIUM">Medium (Persistent disruption)</option>
                    <option value="HIGH">High (Impacts work or decorum)</option>
                    <option value="CRITICAL">Critical (Immediate HR safety/harassment)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Excessive speakerphone volume during client calls"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Incident Details & Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide specific dates, locations, witnesses, or context..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalAnon"
                  checked={newIsAnonymous}
                  onChange={(e) => setNewIsAnonymous(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
                <label htmlFor="modalAnon" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  Protect reporter identity (Flag as Confidential Anonymous)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow transition disabled:opacity-50"
                >
                  {submittingCreate ? 'Submitting...' : 'Log Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
