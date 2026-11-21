'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import { isITSupportUser, isSuperAdminUser } from '../../utils/authTokens';
import { formatIstTime, formatIstDate, toIstZonedDateTime, getIstTimeInfo } from '../../utils/istDate.js';
import {
  FiCpu, FiRadio, FiActivity, FiCheckCircle, FiAlertCircle, FiClock,
  FiPlus, FiTrash2, FiRefreshCw, FiUser, FiSliders, FiTerminal,
  FiLayers, FiSearch, FiFilter, FiExternalLink, FiDownload, FiHelpCircle,
  FiChevronRight, FiChevronLeft, FiWifi, FiCheck, FiX, FiShield, FiAlertTriangle, FiEye,
  FiLogIn, FiLogOut, FiCalendar
} from 'react-icons/fi';
import Swal from 'sweetalert2';

function formatUptime(totalSec) {
  if (!totalSec || totalSec < 0) return '0s';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function signalColor(quality) {
  switch (quality) {
    case 'Excellent': return '#10b981';
    case 'Good': return '#22c55e';
    case 'Fair': return '#f59e0b';
    case 'Weak': return '#ef4444';
    default: return '#94a3b8';
  }
}

export default function AdminBiometricTerminalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Security gate: Block IT Support / IT Engineers from accessing Biometric & Current Attendance
  useEffect(() => {
    if (user && isITSupportUser(user) && !isSuperAdminUser(user)) {
      router.replace('/admin/tickets');
    }
  }, [user, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'inside' | 'logs' | 'mappings' | 'guide'

  // Biometric Filter states (synchronized with Attendance filter system)
  const [filterType, setFilterType] = useState('daily'); // 'all' | 'monthly' | 'daily' | 'weekly' | 'yearly' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const { dateStr } = getIstTimeInfo();
    return dateStr.substring(0, 7);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const { dateStr } = getIstTimeInfo();
    return dateStr;
  });
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => {
    const { dateStr } = getIstTimeInfo();
    return dateStr;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const { dateStr } = getIstTimeInfo();
    return dateStr.substring(0, 4);
  });
  const [fromDate, setFromDate] = useState(() => {
    const { plainDate } = getIstTimeInfo();
    return plainDate.subtract({ days: 7 }).toString();
  });
  const [toDate, setToDate] = useState(() => {
    const { dateStr } = getIstTimeInfo();
    return dateStr;
  });
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'INSIDE' | 'OUTSIDE'
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Data state
  const [statusData, setStatusData] = useState(null);
  const [lastFetched, setLastFetched] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Employee history modal state
  const [selectedEmpForHistory, setSelectedEmpForHistory] = useState(null);

  // Enrollment Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [slotInput, setSlotInput] = useState('');
  const [triggerEnrollRemote, setTriggerEnrollRemote] = useState(true);
  const [submittingEnroll, setSubmittingEnroll] = useState(false);

  // Calculate Monday-Sunday week bounds using Temporal
  const getWeekRange = useCallback((dateStr) => {
    if (!dateStr) return { startDate: '', endDate: '' };
    try {
      const zdt = toIstZonedDateTime(dateStr);
      const dayOfWeek = zdt.dayOfWeek; // 1 = Monday, 7 = Sunday
      const start = zdt.subtract({ days: dayOfWeek - 1 }).toPlainDate().toString();
      const end = zdt.add({ days: 7 - dayOfWeek }).toPlainDate().toString();
      return { startDate: start, endDate: end };
    } catch (e) {
      return { startDate: dateStr, endDate: dateStr };
    }
  }, []);

  // Fetch status from API with active date & search filters
  const fetchStatus = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const params = new URLSearchParams();
      params.set('filterType', filterType);
      if (filterType === 'daily') {
        params.set('date', selectedDate);
      } else if (filterType === 'monthly') {
        params.set('month', selectedMonth);
      } else if (filterType === 'weekly') {
        const { startDate, endDate } = getWeekRange(selectedWeekDate);
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      } else if (filterType === 'yearly') {
        params.set('year', selectedYear);
      } else if (filterType === 'custom') {
        params.set('startDate', fromDate);
        params.set('endDate', toDate);
      }
      if (deptFilter && deptFilter !== 'all') {
        params.set('department', deptFilter);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/biometric/status?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
        setLastFetched(formatIstTime(new Date(), true));
      }
    } catch (err) {
      console.error('Fetch biometric status error:', err);
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, [filterType, selectedDate, selectedMonth, selectedWeekDate, selectedYear, fromDate, toDate, deptFilter, searchQuery, getWeekRange]);

  // Reset to first page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedDate, selectedMonth, selectedWeekDate, selectedYear, fromDate, toDate, deptFilter, searchQuery, statusFilter]);

  useEffect(() => {
    fetchStatus(false);
  }, [fetchStatus]);

  // Live Auto-Polling every 3 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const device = statusData?.devices?.[0] || null;
  const mappings = statusData?.mappings || [];
  const logs = statusData?.recent_logs || [];
  const pendingCommands = statusData?.pending_commands || [];
  const labSessions = statusData?.lab_sessions || [];
  const currentlyInside = statusData?.currently_inside || statusData?.currently_in_lab || [];
  const roomSummary = statusData?.room_summary || [];
  const roomSessions = statusData?.room_sessions || [];
  const roomPunches = statusData?.room_punches || [];
  const employees = statusData?.employees || [];

  // Suggest next free slot
  const nextAvailableSlot = useMemo(() => {
    const usedSlots = new Set(mappings.map(m => Number(m.fingerprint_slot)));
    for (let i = 1; i <= 1000; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return 1;
  }, [mappings]);

  const handleOpenEnrollModal = () => {
    const firstEmp = employees[0];
    const existingMapping = firstEmp ? mappings.find(m => String(m.employee_id) === String(firstEmp.id)) : null;
    const initialSlot = existingMapping?.fingerprint_slot || firstEmp?.biometric_id || nextAvailableSlot;
    setSlotInput(String(initialSlot));
    setSelectedEmpId(firstEmp?.id ? String(firstEmp.id) : '');
    setTriggerEnrollRemote(true);
    setShowEnrollModal(true);
  };

  const handleSaveEnrollment = async (e) => {
    e.preventDefault();
    const empId = selectedEmpId;
    const slot = Number(slotInput);

    if (!empId || !slot || slot < 1 || slot > 1000) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Input',
        text: 'Please select an employee and enter a slot number between 1 and 1000.'
      });
      return;
    }

    try {
      setSubmittingEnroll(true);
      const res = await fetch('/api/biometric/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          device_id: device?.device_id || 'DEVICE001',
          fingerprint_slot: slot,
          trigger_enroll: triggerEnrollRemote
        })
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: triggerEnrollRemote ? 'Enrollment Queued!' : 'Mapping Saved',
          text: data.message,
          confirmButtonColor: '#4f46e5'
        });
        setShowEnrollModal(false);
        fetchStatus(false);
      } else {
        Swal.fire({ icon: 'error', title: 'Failed', text: data.error || 'Failed to save mapping' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setSubmittingEnroll(false);
    }
  };

  const handleDeleteMapping = async (mappingId, slot, empName) => {
    const confirm = await Swal.fire({
      title: 'Remove Fingerprint Mapping?',
      html: `Delete slot <b>#${slot}</b> assigned to <b>${empName || 'Staff'}</b>?<br/><small class="text-slate-400">This will queue a DELETE command on the ESP32 terminal to wipe the template from R307 sensor storage.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Slot'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/biometric/mappings?id=${mappingId}&device_id=${device?.device_id || 'DEVICE001'}&slot=${slot}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: `Slot #${slot} cleared and delete command queued on terminal.`,
            timer: 2500,
            showConfirmButton: false
          });
          fetchStatus(false);
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: data.error });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    }
  };

  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (m.employee_name && m.employee_name.toLowerCase().includes(q)) ||
        (m.employee_id && String(m.employee_id).toLowerCase().includes(q)) ||
        String(m.fingerprint_slot).includes(q) ||
        (m.department && m.department.toLowerCase().includes(q));
      const matchDept = deptFilter === 'all' || m.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [mappings, searchQuery, deptFilter]);

  const filteredSummary = useMemo(() => {
    return roomSummary.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (s.employee_name && s.employee_name.toLowerCase().includes(q)) ||
        (s.employee_id && String(s.employee_id).toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.attendance_date && s.attendance_date.includes(q));
      const matchDept = deptFilter === 'all' || s.department === deptFilter;
      const matchStatus = statusFilter === 'ALL' ||
        (statusFilter === 'INSIDE' && s.current_room_status === 'INSIDE') ||
        (statusFilter === 'OUTSIDE' && s.current_room_status !== 'INSIDE');
      return matchSearch && matchDept && matchStatus;
    });
  }, [roomSummary, searchQuery, deptFilter, statusFilter]);

  const movementStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalMinutes = 0;
    filteredSummary.forEach(s => {
      totalIn += Number(s.total_punch_in || 0);
      totalOut += Number(s.total_punch_out || 0);
      totalMinutes += Number(s.total_inside_minutes || 0);
    });
    const totalHours = (totalMinutes / 60).toFixed(1);
    const durLabel = totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${totalMinutes}m`;
    return {
      totalRecords: filteredSummary.length,
      totalIn,
      totalOut,
      totalMinutes,
      totalHours,
      durLabel
    };
  }, [filteredSummary]);

  const totalPages = Math.max(1, Math.ceil(filteredSummary.length / rowsPerPage));
  const paginatedSummary = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredSummary.slice(start, start + rowsPerPage);
  }, [filteredSummary, currentPage, rowsPerPage]);

  const handleExportCSV = () => {
    if (filteredSummary.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Data',
        text: 'No biometric movement records to export for this period.',
      });
      return;
    }

    const headers = [
      "Date",
      "Employee ID",
      "Employee Name",
      "Department",
      "Slot",
      "Status",
      "Punched In Count",
      "Punched Out Count",
      "Total Time In Room",
      "First In",
      "Last Movement"
    ];

    const rows = filteredSummary.map(s => {
      const totalMins = Number(s.total_inside_minutes || 0);
      const dur = totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins}m`;
      return [
        s.attendance_date,
        s.employee_id,
        `"${s.employee_name || ''}"`,
        `"${s.department || 'Staff'}"`,
        s.fingerprint_slot ? `#${s.fingerprint_slot}` : '',
        s.current_room_status,
        s.total_punch_in || 0,
        s.total_punch_out || 0,
        `"${dur}"`,
        s.first_punch_in ? `"${formatIstTime(s.first_punch_in)}"` : '',
        s.last_punch_time ? `"${formatIstTime(s.last_punch_time)}"` : ''
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Biometric_Movements_${filterType}_${selectedDate || selectedMonth || 'records'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allDepts = useMemo(() => {
    const d = new Set();
    mappings.forEach(m => { if (m.department) d.add(m.department); });
    return Array.from(d);
  }, [mappings]);

  // Selected employee sessions for history modal
  const selectedEmpSessions = useMemo(() => {
    if (!selectedEmpForHistory) return [];
    return roomSessions.filter(s => 
      String(s.employee_id) === String(selectedEmpForHistory.employee_id) &&
      (!selectedEmpForHistory.attendance_date || s.attendance_date === selectedEmpForHistory.attendance_date)
    );
  }, [selectedEmpForHistory, roomSessions]);

  const selectedEmpPunches = useMemo(() => {
    if (!selectedEmpForHistory) return [];
    return roomPunches.filter(p => 
      String(p.employee_id) === String(selectedEmpForHistory.employee_id) &&
      (!selectedEmpForHistory.attendance_date || p.attendance_date === selectedEmpForHistory.attendance_date)
    );
  }, [selectedEmpForHistory, roomPunches]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <FiClock size={24} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Current Biometric Attendance (Room Entry & Exit)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              ESP32 + R307
            </span>
            {device?.is_online ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE ONLINE</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>OFFLINE</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time room entry & exit tracking, employee punch-in / punch-out frequency, and live active personnel inside.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title="Auto refresh polls every 3s"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            <span>{autoRefresh ? 'Auto Live (3s)' : 'Polling Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => fetchStatus(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm disabled:opacity-50"
            title="Refresh now"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Enroll Fingerprint */}
          <button
            type="button"
            onClick={handleOpenEnrollModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Enroll Fingerprint</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 shrink-0">
            <FiLogIn size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Currently Inside</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{currentlyInside.length}</span>
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">staff in room</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 shrink-0">
            <FiActivity size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Room Movements</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{roomPunches.length}</span>
              <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">punches today</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 shrink-0">
            <FiUser size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Staff Today</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{roomSummary.length}</span>
              <span className="text-xs font-normal text-cyan-600 dark:text-cyan-400">visited room</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 shrink-0">
            <FiCpu size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enrolled Staff</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{mappings.length}</span>
              <span className="text-xs font-normal text-purple-600 dark:text-purple-400">/ 1000 slots</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Telemetry Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">ESP32 Hardware Terminal State</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
                {device?.device_id || 'DEVICE001'}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {lastFetched ? `Updated at ${lastFetched}` : 'Connecting...'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block font-semibold mb-1">Wi-Fi Network</span>
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <FiWifi size={14} className="text-indigo-500" />
                <span className="truncate">{device?.wifi_ssid || 'Disconnected'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block font-semibold mb-1">IP Address</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
                {device?.ip_address || '0.0.0.0'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block font-semibold mb-1">Signal Quality</span>
              <div className="font-bold flex items-center gap-1.5" style={{ color: signalColor(device?.signal_quality) }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: signalColor(device?.signal_quality) }} />
                <span>{device?.signal_quality || 'Unknown'} ({device?.wifi_rssi || 0} dBm)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block font-semibold mb-1">Terminal Uptime</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {formatUptime(device?.uptime_seconds)}
              </div>
            </div>
          </div>
        </div>

        {/* OLED Screen Simulator */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Terminal OLED Mirror (128x64)
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>

          <div className="my-auto py-3">
            <div className="mx-auto w-56 h-24 bg-black rounded-lg border-2 border-slate-800 p-2.5 font-mono shadow-inner flex flex-col justify-between">
              <div className="flex justify-between items-center text-[10px] text-cyan-500 border-b border-cyan-900/60 pb-1">
                <span>FLYMEDIA TECH</span>
                <span>{device?.is_online ? 'WIFI OK' : 'NO LINK'}</span>
              </div>
              <div className="pt-1 text-center">
                <div className="text-cyan-400 font-bold text-sm tracking-wide">
                  {device?.display_line1 || 'Waiting for scan'}
                </div>
                <div className="text-cyan-200 text-xs mt-1 font-semibold">
                  {device?.display_line2 || 'STANDBY'}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center">
            Synchronized live with physical SSD1306 display on terminal.
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiClock size={16} />
          <span>Room Movements & Punch Frequency ({roomSummary.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inside')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inside'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiLogIn size={16} />
          <span>Currently Inside Room ({currentlyInside.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiActivity size={16} />
          <span>Live Scan Stream ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mappings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'mappings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiUser size={16} />
          <span>Enrolled Fingerprints ({mappings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'guide'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiSliders size={16} />
          <span>Hardware Wiring & Guide</span>
        </button>
      </div>

      {/* TAB 1: Room Movements & Punch Frequency Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Movement Quick Analytics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Total Records Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setStatusFilter('ALL'); setCurrentPage(1); } }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total Records</span>
                <FiLayers size={14} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {movementStats.totalRecords}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {statusFilter === 'ALL' ? '✓ Showing all records' : 'Click to view all'}
              </div>
            </div>

            {/* Total Punches In Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Punches IN</span>
                <FiLogIn size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {movementStats.totalIn}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Room entries recorded
              </div>
            </div>

            {/* Total Punches Out Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Punches OUT</span>
                <FiLogOut size={14} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {movementStats.totalOut}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Room exits recorded
              </div>
            </div>

            {/* Total In-Room Time Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Time in Room</span>
                <FiClock size={14} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {movementStats.durLabel}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {movementStats.totalHours} hrs cumulative
              </div>
            </div>

            {/* Currently Inside Room Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { setStatusFilter(statusFilter === 'INSIDE' ? 'ALL' : 'INSIDE'); setCurrentPage(1); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setStatusFilter(statusFilter === 'INSIDE' ? 'ALL' : 'INSIDE'); setCurrentPage(1); } }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none col-span-2 sm:col-span-1 ${
                statusFilter === 'INSIDE'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Inside Now</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {currentlyInside.length}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {statusFilter === 'INSIDE' ? '✓ Filter active' : 'Click to filter inside'}
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Filter Toolbar Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FiClock className="text-indigo-600" size={18} />
                    <span>Employee Biometric Room Movements & Punch Counts</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Date-wise punch in/out counts, room entry/exit timeline, and cumulative hours inside room.
                  </p>
                </div>

                {/* CSV Export & Refresh */}
                <div className="flex items-center gap-2 self-end lg:self-auto">
                  <button
                    type="button"
                    onClick={() => fetchStatus(false)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    title="Refresh data"
                  >
                    <FiRefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <FiDownload size={13} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls Row */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Period Selector Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  {['all', 'monthly', 'daily', 'weekly', 'yearly', 'custom'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        filterType === type
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Conditional Pickers based on Period */}
                {filterType === 'daily' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedDate(getIstTimeInfo().dateStr)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      Today
                    </button>
                  </div>
                )}

                {filterType === 'monthly' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                )}

                {filterType === 'weekly' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedWeekDate}
                      onChange={(e) => setSelectedWeekDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    {(() => {
                      const { startDate, endDate } = getWeekRange(selectedWeekDate);
                      return (
                        <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {startDate} → {endDate}
                        </span>
                      );
                    })()}
                  </div>
                )}

                {filterType === 'yearly' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="2020"
                      max="2035"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                )}

                {filterType === 'custom' && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold">From:</span>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold">To:</span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Department Dropdown */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="all">All Departments</option>
                  {allDepts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Status Filter Pills (ALL, INSIDE, OUTSIDE) */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  {['ALL', 'INSIDE', 'OUTSIDE'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        statusFilter === st
                          ? st === 'INSIDE'
                            ? 'bg-emerald-600 text-white'
                            : st === 'OUTSIDE'
                            ? 'bg-slate-700 text-white'
                            : 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {st === 'ALL' ? 'All Status' : st === 'INSIDE' ? 'Inside Room' : 'Outside'}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search staff, dept, slot, date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-7 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <FiX size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Content */}
            {filteredSummary.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FiClock size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold">No room movements found for the selected period</p>
                <p className="text-xs mt-1">Try switching the date filter or clearing your search criteria.</p>
              </div>
            ) : (
              <div tabIndex={0} role="region" aria-label="Biometric Room Attendance Table" className="overflow-x-auto focus:outline-none">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Slot</th>
                      <th className="py-3 px-4">Room Status</th>
                      <th className="py-3 px-4 text-center">Punched IN</th>
                      <th className="py-3 px-4 text-center">Punched OUT</th>
                      <th className="py-3 px-4">Time In Room</th>
                      <th className="py-3 px-4">First In / Last Out</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {paginatedSummary.map((s, idx) => {
                      const isInside = s.current_room_status === 'INSIDE';
                      const totalMins = Number(s.total_inside_minutes || 0);
                      const durLabel = totalMins >= 60
                        ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`
                        : `${totalMins}m`;

                      return (
                        <tr key={`${s.employee_id}-${s.attendance_date || idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {s.attendance_date ? formatIstDate(s.attendance_date) : '-'}
                            </span>
                            <div className="text-[10px] font-mono text-slate-400">{s.attendance_date}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{s.employee_name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span>{s.department || 'Staff'}</span>
                              <span>•</span>
                              <span className="font-mono text-[10px]">ID: {s.employee_id}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              #{s.fingerprint_slot || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {isInside ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <span>INSIDE ROOM</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <span>OUTSIDE</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {s.total_punch_in} {Number(s.total_punch_in) === 1 ? 'time' : 'times'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              {s.total_punch_out} {Number(s.total_punch_out) === 1 ? 'time' : 'times'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {durLabel}
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap">
                            <div>
                              <span className="text-slate-400">In:</span>{' '}
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {s.first_punch_in ? formatIstTime(s.first_punch_in) : '-'}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              <span className="text-slate-400">Last:</span>{' '}
                              <span className={s.last_punch_type === 'PUNCH_IN' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                {s.last_punch_type === 'PUNCH_IN' ? 'IN' : 'OUT'}
                              </span>{' '}
                              <span>{s.last_punch_time ? formatIstTime(s.last_punch_time) : '-'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedEmpForHistory(s)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition cursor-pointer"
                            >
                              View Movements
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Bar */}
            {filteredSummary.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * rowsPerPage, filteredSummary.length)}</span> of{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{filteredSummary.length}</span> records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      currentPage <= 1
                        ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer'
                    }`}
                  >
                    <FiChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      currentPage >= totalPages
                        ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer'
                    }`}
                  >
                    <span>Next</span>
                    <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Currently Inside Room */}
      {activeTab === 'inside' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Staff Currently Inside the Room ({currentlyInside.length})
              </h2>
              <p className="text-xs text-slate-400">Personnel currently logged in-room right now</p>
            </div>
          </div>

          {currentlyInside.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <FiLogIn size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">Room is currently empty</p>
              <p className="text-xs mt-1">No staff members are logged inside right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {currentlyInside.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 shadow-sm">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{s.employee_name}</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-[11px]">
                        Slot #{s.fingerprint_slot || s.biometric_id || '-'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.department || 'Staff'}</div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <FiClock size={12} />
                      <span>Entered at {formatIstTime(s.in_time)}</span>
                    </div>
                  </div>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Live Scan Stream */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <span className="text-base font-bold text-slate-900 dark:text-white">Real-Time Door Scan Events</span>
              <p className="text-xs text-slate-400">Stream updates live every 3s directly from ESP32</p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No scans recorded yet. Touch the sensor to see events stream in real-time.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[500px] overflow-y-auto pr-1">
              {logs.map((log) => {
                const isPunchIn = log.action === 'PUNCH_IN';
                const isPunchOut = log.action === 'PUNCH_OUT';
                const isRejected = log.action.includes('REJECTED');

                return (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-xl shrink-0 ${
                        isPunchIn
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                          : isPunchOut
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                          : isRejected
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                      }`}>
                        {isPunchIn ? <FiLogIn size={16} /> : isPunchOut ? <FiLogOut size={16} /> : <FiRadio size={16} />}
                      </span>

                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className={isPunchIn ? 'text-emerald-600' : isPunchOut ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                            {log.action}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span>{log.employee_name || 'Unregistered User'}</span>
                          {log.fingerprint_slot && (
                            <span className="text-slate-400 text-[11px] font-mono">
                              (Slot #{log.fingerprint_slot})
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          {log.message}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-slate-400 font-mono text-[11px]">
                      {formatIstTime(log.created_at, true)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Enrolled Fingerprints Table */}
      {activeTab === 'mappings' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search staff, dept, or slot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">All Departments</option>
                {allDepts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredMappings.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FiUser size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">No fingerprint mappings found</p>
              <p className="text-xs mt-1">Click &quot;Enroll Fingerprint&quot; above to map staff to sensor slots.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Sensor Slot</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department / Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Enrolled At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredMappings.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                          Slot #{m.fingerprint_slot}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{m.employee_name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{m.email}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">ID: {m.employee_id}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700 dark:text-slate-300">{m.department || 'Staff'}</div>
                        <div className="text-[11px] text-slate-400">{m.role}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {m.enrolled_at ? formatIstDate(m.enrolled_at) : '-'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteMapping(m.id, m.fingerprint_slot, m.employee_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete slot & erase template"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Hardware Pinout & Wiring Guide */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiSliders size={18} className="text-indigo-600" />
              <span>ESP32 Hardware Pinout & Wiring Reference</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase">
                    <th className="py-2.5 px-3">Peripheral Component</th>
                    <th className="py-2.5 px-3">Module Pin</th>
                    <th className="py-2.5 px-3">ESP32 Pin</th>
                    <th className="py-2.5 px-3">Description & Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-indigo-600">R307 Optical Sensor</td>
                    <td className="py-2.5 px-3 text-emerald-600">TX (Green)</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">GPIO 16 (RX2)</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">Hardware Serial 2 RX (57600 baud)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-indigo-600">R307 Optical Sensor</td>
                    <td className="py-2.5 px-3 text-emerald-600">RX (White)</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">GPIO 17 (TX2)</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">Hardware Serial 2 TX (57600 baud)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-cyan-600">OLED Display (SSD1306)</td>
                    <td className="py-2.5 px-3 text-cyan-600">SDA</td>
                    <td className="py-2.5 px-3 text-cyan-600 font-bold">GPIO 21</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">I2C Data line (0x3C address)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-cyan-600">OLED Display (SSD1306)</td>
                    <td className="py-2.5 px-3 text-cyan-600">SCL</td>
                    <td className="py-2.5 px-3 text-cyan-600 font-bold">GPIO 22</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">I2C Clock line</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-purple-600">RGB Status LED</td>
                    <td className="py-2.5 px-3 text-purple-600">R / G / B</td>
                    <td className="py-2.5 px-3 text-purple-600 font-bold">GPIO 25 / 26 / 33</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">Green = OK, Red = Fail, Blue = Mode</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-amber-600">Buzzer Alert</td>
                    <td className="py-2.5 px-3 text-amber-600">I/O / VCC / GND</td>
                    <td className="py-2.5 px-3 text-amber-600 font-bold">GPIO 27</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">2.8 kHz PWM chime on punch</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employee Movements History Modal */}
      {selectedEmpForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FiClock className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Room Movements: {selectedEmpForHistory.employee_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Date: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEmpForHistory.attendance_date ? formatIstDate(selectedEmpForHistory.attendance_date) : 'Today'}</span> ({selectedEmpForHistory.attendance_date}) • Slot #{selectedEmpForHistory.fingerprint_slot || '-'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmpForHistory(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Quick Metrics Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Punches In</span>
                <div className="text-lg font-black text-emerald-600 mt-0.5">{selectedEmpForHistory.total_punch_in} times</div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Punches Out</span>
                <div className="text-lg font-black text-amber-600 mt-0.5">{selectedEmpForHistory.total_punch_out} times</div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Time In Room</span>
                <div className="text-lg font-black text-purple-600 mt-0.5">
                  {(() => {
                    const totalMins = Number(selectedEmpForHistory.total_inside_minutes || 0);
                    return totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins}m`;
                  })()}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Current State</span>
                <div className="mt-0.5 font-bold text-xs">
                  {selectedEmpForHistory.current_room_status === 'INSIDE' ? (
                    <span className="text-emerald-600">🟢 Inside Room</span>
                  ) : (
                    <span className="text-slate-500">⚪ Outside Room</span>
                  )}
                </div>
              </div>
            </div>

            {/* In / Out Sessions Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Completed & Active Room Stays
              </h4>

              {selectedEmpSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No detailed session intervals recorded for this date.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedEmpSessions.map((sess, idx) => (
                    <div key={sess.id || idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[10px]">
                            Stay #{sess.session_number || (selectedEmpSessions.length - idx)}
                          </span>
                          <span>Entered: {formatIstTime(sess.in_time)}</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          {sess.out_time ? (
                            <span>Exited: {formatIstTime(sess.out_time)}</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold animate-pulse">● Currently Inside Room</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {sess.duration_minutes ? `${sess.duration_minutes} mins` : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Door Punch Log Stream */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Raw In / Out Door Punches ({selectedEmpPunches.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedEmpPunches.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/20">
                    <div className="flex items-center gap-2">
                      <span className={p.punch_type === 'PUNCH_IN' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                        {p.punch_type === 'PUNCH_IN' ? '➔ PUNCH IN' : '⬅ PUNCH OUT'}
                      </span>
                      <span className="text-slate-400">#{p.punch_number}</span>
                    </div>
                    <div className="font-mono text-slate-600 dark:text-slate-400">
                      {formatIstTime(p.punch_time, true)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedEmpForHistory(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Fingerprint Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FiPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enroll Fingerprint Slot</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEnrollment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Select Staff Member *
                </label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setSelectedEmpId(empId);
                    const emp = employees.find(x => String(x.id) === String(empId));
                    const existingMapping = mappings.find(m => String(m.employee_id) === String(empId));
                    const assignedSlot = existingMapping?.fingerprint_slot || emp?.biometric_id;
                    if (assignedSlot) {
                      setSlotInput(String(assignedSlot));
                    } else {
                      setSlotInput(String(nextAvailableSlot));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose employee --</option>
                  {employees.map((emp) => {
                    const existingMapping = mappings.find(m => String(m.employee_id) === String(emp.id));
                    const slot = existingMapping?.fingerprint_slot || emp.biometric_id;
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || 'Staff'}) {slot ? `— [Slot #${slot}]` : '— [Not Enrolled]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  2. Optical Sensor Slot # (1 - 1000) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={slotInput}
                  onChange={(e) => setSlotInput(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Next recommended slot is #{nextAvailableSlot}.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="remoteEnrollCheck"
                  checked={triggerEnrollRemote}
                  onChange={(e) => setTriggerEnrollRemote(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 mt-0.5 rounded cursor-pointer"
                />
                <label htmlFor="remoteEnrollCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <strong className="text-slate-900 dark:text-white block font-semibold">
                    Queue Instant Remote Enrollment on ESP32
                  </strong>
                  The ESP32 LED turns Blue/Magenta and displays &quot;Enroll Slot #{slotInput || '1'}&quot; waiting for 2 finger touches.
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEnroll}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {submittingEnroll ? 'Saving...' : 'Start Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
