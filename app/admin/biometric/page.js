'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiCpu, FiRadio, FiActivity, FiCheckCircle, FiAlertCircle, FiClock,
  FiPlus, FiTrash2, FiRefreshCw, FiUser, FiSliders, FiTerminal,
  FiLayers, FiSearch, FiFilter, FiExternalLink, FiDownload, FiHelpCircle,
  FiChevronRight, FiWifi, FiCheck, FiX, FiShield, FiAlertTriangle, FiEye
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

export default function BiometricTerminalPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('mappings'); // 'mappings' | 'logs' | 'sessions' | 'guide'

  // Data state
  const [statusData, setStatusData] = useState(null);
  const [lastFetched, setLastFetched] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Enrollment Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [slotInput, setSlotInput] = useState('');
  const [triggerEnrollRemote, setTriggerEnrollRemote] = useState(true);
  const [submittingEnroll, setSubmittingEnroll] = useState(false);

  // Fetch status from API
  const fetchStatus = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/biometric/status');
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
        setLastFetched(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      }
    } catch (err) {
      console.error('Fetch biometric status error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
  const currentlyInLab = statusData?.currently_in_lab || [];
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
    setSlotInput(String(nextAvailableSlot));
    setSelectedEmpId(employees[0]?.id ? String(employees[0].id) : '');
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
        Swal.fire({
          icon: 'error',
          title: 'Enrollment Error',
          text: data.error || 'Failed to save mapping.'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setSubmittingEnroll(false);
    }
  };

  const handleDeleteMapping = async (slot, empName) => {
    const result = await Swal.fire({
      title: `Delete Slot #${slot}?`,
      text: `Are you sure you want to remove the fingerprint mapping for ${empName}?`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Delete & Erase from Sensor',
      denyButtonText: 'Delete Mapping Only',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      denyButtonColor: '#6366f1'
    });

    if (result.isConfirmed || result.isDenied) {
      const triggerDelete = result.isConfirmed; // if confirmed, also command hardware to erase slot
      try {
        const res = await fetch(`/api/biometric/mappings?slot=${slot}&device_id=${device?.device_id || 'DEVICE001'}&trigger_delete=${triggerDelete}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: data.message,
            showConfirmButton: false,
            timer: 3000
          });
          fetchStatus(false);
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: data.error });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
      }
    }
  };

  // Filter mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const matchesSearch = !searchQuery || 
        m.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(m.fingerprint_slot).includes(searchQuery);
      const matchesDept = deptFilter === 'all' || m.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [mappings, searchQuery, deptFilter]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    mappings.forEach(m => { if (m.department) set.add(m.department); });
    return Array.from(set);
  }, [mappings]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <FiCpu size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Biometric Punch Terminal
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
            Real-time IoT biometric punch system, optical fingerprint slot management, and hardware telemetry.
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
            title="Toggle 3-second live auto polling"
          >
            <FiRadio size={14} className={autoRefresh ? 'animate-pulse text-emerald-600' : ''} />
            <span>{autoRefresh ? 'Live Polling: ON' : 'Live Polling: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchStatus(false)}
            disabled={refreshing}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="Manual refresh"
          >
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenEnrollModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Enroll Fingerprint</span>
          </button>
        </div>
      </div>

      {/* Hardware Telemetry & Virtual OLED Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal Telemetry Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Terminal Telemetry</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-slate-600 dark:text-slate-300">
                {device?.device_id || 'DEVICE001'}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {lastFetched ? `Updated: ${lastFetched}` : 'Connecting...'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Wi-Fi Network</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-slate-900 dark:text-white truncate">
                <FiWifi size={14} className="text-indigo-600 shrink-0" />
                <span className="truncate">{device?.wifi_ssid || '—'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">IP Address</span>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white truncate">
                <span>{device?.ip_address || '—'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Signal Quality</span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-bold" style={{ color: signalColor(device?.signal_quality) }}>
                <span>{device?.signal_quality || 'Offline'}</span>
                {device?.rssi && <span className="text-xs font-normal text-slate-400">({device.rssi} dBm)</span>}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Device Uptime</span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-900 dark:text-white">
                <FiClock size={14} className="text-indigo-600 shrink-0" />
                <span>{formatUptime(device?.uptime_seconds)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sensor Engine</span>
              <div className="flex items-center gap-1 mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className={`w-2 h-2 rounded-full ${device?.sensor_ready ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{device?.sensor_ready ? 'R307 Ready' : 'Sensor Offline'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stored Templates</span>
              <div className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{device?.templates_count || mappings.length} / 1000 Slots</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Offline Queue</span>
              <div className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{device?.queued_events || 0} Events Cached</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Heartbeat Count</span>
              <div className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{device?.ping_count || 0} Pings Received</span>
              </div>
            </div>
          </div>
        </div>

        {/* OLED Screen Simulator (Exact replica of SSD1306 0.96" display) */}
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-700 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FiTerminal size={14} className="text-amber-400" />
                <span>OLED Virtual Simulator (128x64)</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Virtual Screen Bezel */}
            <div className="mt-4 p-4 rounded-xl bg-black border-2 border-slate-800 font-mono shadow-inner space-y-2">
              <div className="text-[11px] text-amber-300 border-b border-amber-300/30 pb-1 flex justify-between items-center">
                <span>FLYMEDIA TECH</span>
                <span>{device?.is_online ? 'WIFI OK' : 'NO LINK'}</span>
              </div>
              <div className="pt-2 text-center">
                <div className="text-cyan-400 font-bold text-sm tracking-wide">
                  {device?.display_line1 || 'Waiting for ESP32'}
                </div>
                <div className="text-cyan-200 text-xs mt-1 font-semibold">
                  {device?.display_line2 || 'STANDBY'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 text-center">
            Synchronized live with physical SSD1306 display on Terminal.
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('mappings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'mappings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiUser size={15} />
          <span>Enrolled Fingerprints ({mappings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiActivity size={15} />
          <span>Live Scan Stream ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiClock size={15} />
          <span>Currently Inside ({currentlyInLab.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiSliders size={15} />
          <span>Hardware Wiring & Guide</span>
        </button>
      </div>

      {/* TAB 1: Enrolled Fingerprints Table */}
      {activeTab === 'mappings' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee or slot #..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredMappings.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FiUser size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No fingerprint mappings found</p>
              <p className="text-xs mt-1">Click "Enroll Fingerprint" above to map staff to sensor slots.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Sensor Slot</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department / Role</th>
                    <th className="py-3 px-4">Terminal</th>
                    <th className="py-3 px-4">Enrolled Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {filteredMappings.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800">
                          Slot #{m.fingerprint_slot}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{m.employee_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 dark:text-slate-200">{m.department || '—'}</div>
                        <div className="text-[11px] text-slate-400">{m.role || 'Employee'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {m.device_id}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(m.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmpId(String(m.employee_id));
                            setSlotInput(String(m.fingerprint_slot));
                            setTriggerEnrollRemote(true);
                            setShowEnrollModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1"
                          title="Re-enroll finger on physical sensor"
                        >
                          <FiRefreshCw size={12} />
                          <span>Re-Enroll</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMapping(m.fingerprint_slot, m.employee_name)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all cursor-pointer shadow-xs"
                          title="Delete mapping"
                        >
                          <FiTrash2 size={13} />
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

      {/* TAB 2: Live Biometric Scan Stream */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Real-Time Scan Events</span>
            <span className="text-xs text-slate-400">Stream updates live every 3s</span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">No scan events recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {logs.map((log) => {
                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (log.action === 'PUNCH_IN' || log.action === 'LAB_IN') {
                  badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
                } else if (log.action === 'PUNCH_OUT' || log.action === 'LAB_OUT') {
                  badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
                } else if (log.action === 'COOLDOWN') {
                  badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
                } else if (log.action.includes('REJECTED') || log.action.includes('FAILED')) {
                  badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
                }

                return (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border uppercase shrink-0 ${badgeClass}`}>
                        {log.action}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {log.employee_name || 'Unregistered User'}
                          {log.fingerprint_slot && <span className="text-slate-400 font-mono ml-1.5">(Slot #{log.fingerprint_slot})</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {log.message}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Currently Inside */}
      {activeTab === 'sessions' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Currently In Office / Lab ({currentlyInLab.length})</span>
            <span className="text-xs text-slate-400">Active checked-in personnel</span>
          </div>

          {currentlyInLab.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No employees currently logged inside.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {currentlyInLab.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{s.employee_name}</div>
                    <div className="text-xs text-slate-400">{s.department || 'Staff'}</div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                      Entered: {new Date(s.in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Hardware Pinout & Wiring Guide */}
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
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono">
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">R307 Optical Sensor</td>
                    <td className="py-2.5 px-3 text-indigo-600">TX / RX / VIN / GND</td>
                    <td className="py-2.5 px-3 text-indigo-600">GPIO 16 (RX2) / GPIO 17 (TX2)</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">Hardware UART2 @ 57600 baud rate</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">SSD1306 0.96" OLED</td>
                    <td className="py-2.5 px-3 text-cyan-600">SDA / SCL / 3V3 / GND</td>
                    <td className="py-2.5 px-3 text-cyan-600">GPIO 21 (SDA) / GPIO 22 (SCL)</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">I2C interface @ address 0x3C</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">RGB Status LED</td>
                    <td className="py-2.5 px-3 text-emerald-600">R / G / B / Anode</td>
                    <td className="py-2.5 px-3 text-emerald-600">GPIO 25 (Red), 26 (Green), 33 (Blue)</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">Common Anode (Long leg to 3V3, 220Ω resistor)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">Piezo Buzzer</td>
                    <td className="py-2.5 px-3 text-amber-600">I/O / VCC / GND</td>
                    <td className="py-2.5 px-3 text-amber-600">GPIO 27</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">2.8 kHz PWM chime on punch</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">RGB LED Status Codes</span>
                <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li><strong className="text-slate-700 dark:text-slate-200">⚪ White (R+G+B):</strong> Idle & ready, awaiting finger</li>
                  <li><strong className="text-blue-600">🔵 Blue:</strong> Finger placed, optical scan in progress</li>
                  <li><strong className="text-purple-600">🟣 Magenta:</strong> Enrollment mode active (Steps 1 & 2)</li>
                  <li><strong className="text-emerald-600">🟢 Green:</strong> Verification OK / Punch In / Punch Out</li>
                  <li><strong className="text-rose-600">🔴 Red:</strong> Unrecognized finger / Sensor mismatch</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">Serial Monitor Commands (115200 baud)</span>
                <ul className="text-xs font-mono space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li><code>ENROLL &lt;slot&gt;</code> - Calibrate finger into slot (e.g. <code>ENROLL 2</code>)</li>
                  <li><code>DELETE &lt;slot&gt;</code> - Erase specific fingerprint slot</li>
                  <li><code>CLEAR</code> - Wipe all fingerprints from sensor memory</li>
                  <li><code>STATUS</code> - Print Wi-Fi RSSI and template count</li>
                  <li><code>TEST</code> - Trigger instant heartbeat to server</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Fingerprint Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                  <FiCpu size={18} />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Enroll Employee Fingerprint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEnrollment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Select Employee
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department || 'Staff'}) {emp.biometric_id ? `[Current Slot: #${emp.biometric_id}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Fingerprint Sensor Slot # (1–1000)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSlotInput(String(nextAvailableSlot))}
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    Auto-Fill Next (#{nextAvailableSlot})
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={slotInput}
                  onChange={(e) => setSlotInput(e.target.value)}
                  required
                  placeholder="e.g. 2"
                  className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={triggerEnrollRemote}
                    onChange={(e) => setTriggerEnrollRemote(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 block">
                      Queue Remote Enrollment on ESP32 Sensor
                    </span>
                    <span className="text-indigo-700 dark:text-indigo-300 text-[11px] leading-relaxed block mt-0.5">
                      The ESP32 will pick up the command on its next heartbeat (within 5 seconds). The RGB LED will turn Magenta/Blue and prompt the user to place their finger twice on the R307 sensor.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEnroll}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submittingEnroll ? 'Saving...' : 'Confirm & Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
