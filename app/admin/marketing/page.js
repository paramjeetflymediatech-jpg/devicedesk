'use client';
import { useState, useEffect, useMemo } from 'react';
import Pagination from '../../components/Pagination';
import Swal from 'sweetalert2';
import { 
  FiShield, FiUserPlus, FiTrash2, FiMapPin, FiNavigation, 
  FiUsers, FiTrendingUp, FiActivity, FiSearch, FiRefreshCw, 
  FiClock, FiCheckCircle, FiExternalLink, FiCompass
} from 'react-icons/fi';

export default function AdminMarketingOverview() {
  const [attendance, setAttendance] = useState([]);
  const [authorizations, setAuthorizations] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: 'live' | 'history' | 'access'
  const [activeTab, setActiveTab] = useState('live');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination states
  const [attPage, setAttPage] = useState(1);
  const [attPageSize, setAttPageSize] = useState(10);
  const [activeTrailModal, setActiveTrailModal] = useState(null);
  const [trailLogs, setTrailLogs] = useState([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [selectedLiveTripId, setSelectedLiveTripId] = useState(null);

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [attRes, authRes, empRes] = await Promise.all([
        fetch('/api/marketing/attendance'),
        fetch('/api/marketing/authorizations'),
        fetch('/api/employees')
      ]);

      const attData = await attRes.json();
      const authData = await authRes.json();
      const empData = await empRes.json();

      if (attData.success) setAttendance(attData.data || []);
      if (authData.success) setAuthorizations(authData.data || []);
      if (empData.success) setAllEmployees(empData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openTrailModal = async (trip) => {
    setActiveTrailModal(trip);
    setTrailLoading(true);
    try {
      const res = await fetch(`/api/marketing/location?attendance_id=${encodeURIComponent(trip.id)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTrailLogs(data.data);
      } else {
        setTrailLogs([]);
      }
    } catch (e) {
      setTrailLogs([]);
    } finally {
      setTrailLoading(false);
    }
  };

  const handleGrantAuthorization = async () => {
    if (!selectedEmployeeId) {
      Swal.fire({ icon: 'warning', title: 'Selection Required', text: 'Please select an employee to authorize.' });
      return;
    }

    const emp = allEmployees.find(e => e.id === selectedEmployeeId);
    try {
      const res = await fetch('/api/marketing/authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          employeeName: emp?.name || selectedEmployeeId
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Access Granted! 🛡️', text: `${emp?.name || 'Employee'} can now view Marketing team members.`, timer: 1500, showConfirmButton: false });
        setSelectedEmployeeId('');
        fetchMarketingData(true);
      } else {
        Swal.fire({ icon: 'error', title: 'Failed', text: data.error || 'Failed to grant authorization.' });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Server error granting authorization.' });
    }
  };

  const handleRevokeAuthorization = async (employeeId, name) => {
    const confirm = await Swal.fire({
      title: `Revoke Marketing Access?`,
      text: `Remove ${name}'s authorization to view and communicate with the Marketing team?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Revoke Access'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/marketing/authorizations?employeeId=${encodeURIComponent(employeeId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Revoked', text: 'Authorization removed successfully.', timer: 1500, showConfirmButton: false });
        fetchMarketingData(true);
      } else {
        Swal.fire({ icon: 'error', title: 'Failed', text: data.error || 'Failed to revoke authorization.' });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Server error revoking authorization.' });
    }
  };

  // KPI Calculations
  const activeTrips = useMemo(() => attendance.filter(a => a.status === 'Checked In'), [attendance]);
  const completedTrips = useMemo(() => attendance.filter(a => a.status !== 'Checked In'), [attendance]);
  const totalKmCalculated = useMemo(() => {
    return attendance.reduce((sum, item) => sum + Number(item.total_km || item.estimated_km || 0), 0).toFixed(1);
  }, [attendance]);

  // Filtered attendance records for History Tab
  const filteredAttendance = useMemo(() => {
    return attendance.filter(item => {
      const emp = allEmployees.find(e => e.id === item.employee_id);
      const name = (item.employee_name || emp?.name || item.employee_id || '').toLowerCase();
      const from = (item.from_location || '').toLowerCase();
      const to = (item.to_location || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch = !query || name.includes(query) || from.includes(query) || to.includes(query) || notes.includes(query);
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && item.status === 'Checked In') || (statusFilter === 'COMPLETED' && item.status !== 'Checked In');

      return matchesSearch && matchesStatus;
    });
  }, [attendance, allEmployees, searchTerm, statusFilter]);

  const attTotalPages = Math.ceil(filteredAttendance.length / attPageSize) || 1;
  const safeAttPage = Math.min(Math.max(1, attPage), attTotalPages);
  const paginatedAttendance = filteredAttendance.slice((safeAttPage - 1) * attPageSize, safeAttPage * attPageSize);

  if (loading) {
    return (
      <div className="p-12 text-center text-cyan-400 font-sans">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400 mb-4"></div>
        <p className="text-gray-400 text-sm font-medium">Loading Marketing Dashboard...</p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 md:space-y-8 font-sans"
      style={{ 
        color: 'var(--text-primary, #f8fafc)',
        minHeight: '100%'
      }}
    >
      
      {/* Top Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}
      >
        <div>
          <h1 
            className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3"
            style={{ color: 'var(--text-primary, #f8fafc)' }}
          >
            <span className="p-2.5 rounded-2xl border flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.3)', color: '#06b6d4' }}>
              <FiNavigation size={24} />
            </span>
            Marketing Field & GPS Hub
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
            Real-time GPS tracking, live route logs, and isolated marketing access control.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchMarketingData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          style={{
            background: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
            color: 'var(--accent-cyan, #06b6d4)',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))'
          }}
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Live Data'}</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Trips */}
        <div 
          className="p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between"
          style={{ 
            background: 'var(--bg-card, rgba(255, 255, 255, 0.04))', 
            border: '1px solid rgba(16, 185, 129, 0.35)' 
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Active On-Field</span>
            <span className="p-2 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <FiActivity size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--text-primary, #f8fafc)' }}>{activeTrips.length}</span>
            <span className="text-xs font-semibold text-emerald-500">Live Routes</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time tracking active
          </div>
        </div>

        {/* Total Trips */}
        <div 
          className="p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between"
          style={{ 
            background: 'var(--bg-card, rgba(255, 255, 255, 0.04))', 
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Total Field Trips</span>
            <span className="p-2 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <FiTrendingUp size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--text-primary, #f8fafc)' }}>{attendance.length}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{completedTrips.length} completed</span>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>Lifetime records</p>
        </div>

        {/* Distance Logged */}
        <div 
          className="p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between"
          style={{ 
            background: 'var(--bg-card, rgba(255, 255, 255, 0.04))', 
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Distance Covered</span>
            <span className="p-2 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <FiCompass size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-cyan-500">{totalKmCalculated}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary, #94a3b8)' }}>KM Logged</span>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>GPS road distance</p>
        </div>

        {/* Authorized Managers */}
        <div 
          className="p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between"
          style={{ 
            background: 'var(--bg-card, rgba(255, 255, 255, 0.04))', 
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Authorized Staff</span>
            <span className="p-2 rounded-xl" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
              <FiShield size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--text-primary, #f8fafc)' }}>{authorizations.length}</span>
            <span className="text-xs font-semibold text-purple-500">Designated</span>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>Marketing view access</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
        style={{ borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'live'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{ color: activeTab === 'live' ? '#ffffff' : 'var(--text-secondary, #94a3b8)' }}
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeTab === 'live' ? 'bg-white' : 'bg-emerald-500'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${activeTab === 'live' ? 'bg-white' : 'bg-emerald-500'}`}></span>
          </span>
          Live Tracking ({activeTrips.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
              : 'hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{ color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary, #94a3b8)' }}
        >
          <FiClock size={16} />
          Trip History ({attendance.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('access')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'access'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
              : 'hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{ color: activeTab === 'access' ? '#ffffff' : 'var(--text-secondary, #94a3b8)' }}
        >
          <FiShield size={16} />
          Access Control ({authorizations.length})
        </button>
      </div>

      {/* ================= TAB 1: LIVE FIELD TRACKING ================= */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {activeTrips.length === 0 ? (
            <div 
              className="p-12 rounded-3xl text-center space-y-3"
              style={{ 
                background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
              }}
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted, #64748b)' }}
              >
                <FiCompass size={32} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary, #f8fafc)' }}>No Executives Currently on Field</h3>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                When marketing team members start a route on their mobile app, their real-time GPS position, destination, and purpose will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Interactive Live Map Radar Viewer */}
              {(() => {
                const currentLiveTrip = activeTrips.find(t => t.id === selectedLiveTripId) || activeTrips[0];
                const currentLiveEmp = allEmployees.find(e => e.id === currentLiveTrip?.employee_id);
                const currentEmpName = currentLiveTrip?.employee_name || currentLiveEmp?.name || currentLiveTrip?.employee_id;
                const currentLat = currentLiveTrip?.current_latitude || currentLiveTrip?.check_in_latitude;
                const currentLng = currentLiveTrip?.current_longitude || currentLiveTrip?.check_in_longitude;
                const hasCurrentGps = !!(currentLat && currentLng);

                return (
                  <div 
                    className="p-5 sm:p-6 rounded-3xl shadow-xl space-y-4 overflow-hidden"
                    style={{ 
                      background: 'var(--bg-card, #1e293b)',
                      border: '1.5px solid rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {/* Live Radar Header & Executive Selector */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                            📡 Live GPS Device Map Radar
                          </h3>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                          Live real-time position of on-field staff & vehicles
                        </p>
                      </div>

                      {/* Quick Executive Switcher Pills */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {activeTrips.map(trip => {
                          const emp = allEmployees.find(e => e.id === trip.employee_id);
                          const name = trip.employee_name || emp?.name || trip.employee_id;
                          const isSelected = (trip.id === (selectedLiveTripId || activeTrips[0]?.id));

                          return (
                            <button
                              key={trip.id}
                              type="button"
                              onClick={() => setSelectedLiveTripId(trip.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                  : 'hover:opacity-80'
                              }`}
                              style={{
                                background: isSelected ? undefined : 'var(--bg-primary, rgba(0,0,0,0.05))',
                                color: isSelected ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                                border: isSelected ? 'none' : '1px solid var(--glass-border, rgba(255,255,255,0.1))'
                              }}
                            >
                              <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></span>
                              <span>{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Embedded Map Frame */}
                    <div 
                      className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-inner"
                      style={{ 
                        background: 'var(--bg-primary, #0f172a)',
                        border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))'
                      }}
                    >
                      {hasCurrentGps ? (
                        <iframe
                          title="Live GPS Radar Map"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight="0"
                          marginWidth="0"
                          src={`https://maps.google.com/maps?q=${currentLat},${currentLng}&hl=en&z=16&output=embed`}
                          className="w-full h-full border-0"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                          No live GPS coordinates received for this device yet.
                        </div>
                      )}

                      {/* Floating Live Telemetry Overlay Badge */}
                      {hasCurrentGps && (
                        <div 
                          className="absolute top-3 left-3 right-3 sm:right-auto max-w-sm p-3.5 rounded-2xl shadow-xl backdrop-blur-md space-y-1.5 z-10"
                          style={{ 
                            background: 'var(--bg-card, rgba(15, 23, 42, 0.85))',
                            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.15))'
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {currentEmpName.charAt(0)}
                              </div>
                              <span className="font-bold text-xs truncate" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                                {currentEmpName}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase">
                              LIVE PIN
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-cyan-500">
                            📍 {Number(currentLat).toFixed(5)}°, {Number(currentLng).toFixed(5)}°
                          </div>

                          <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                            <strong>To: </strong> {currentLiveTrip?.to_location || 'Destination'}
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                            <span>Started: {currentLiveTrip?.check_in_at ? new Date(currentLiveTrip.check_in_at).toLocaleTimeString() : 'Now'}</span>
                            <a
                              href={`https://maps.google.com/?q=${currentLat},${currentLng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-500 hover:text-cyan-400 font-bold inline-flex items-center gap-1 hover:underline"
                            >
                              <FiExternalLink size={10} /> Full Map
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Active Executive Trip Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {activeTrips.map(trip => {
                  const emp = allEmployees.find(e => e.id === trip.employee_id);
                  const empName = trip.employee_name || emp?.name || trip.employee_id;
                  const hasGps = trip.current_latitude && trip.current_longitude || trip.check_in_latitude && trip.check_in_longitude;
                  const lat = trip.current_latitude || trip.check_in_latitude;
                  const lng = trip.current_longitude || trip.check_in_longitude;
                  const isSelectedOnMap = trip.id === (selectedLiveTripId || activeTrips[0]?.id);

                  return (
                    <div 
                      key={trip.id}
                      className={`p-5 sm:p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                        isSelectedOnMap ? 'ring-2 ring-emerald-500' : ''
                      }`}
                      style={{ 
                        background: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
                        border: '1px solid rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <div>
                        {/* Executive Info & Pulse */}
                        <div 
                          className="flex items-center justify-between pb-3"
                          style={{ borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm uppercase shadow-md shadow-emerald-500/20">
                              {empName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm truncate max-w-[150px]" style={{ color: 'var(--text-primary, #f8fafc)' }}>{empName}</h4>
                              <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>{trip.employee_id}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            ON FIELD
                          </span>
                        </div>

                      {/* Route Path */}
                      <div 
                        className="mt-4 p-3.5 rounded-2xl space-y-2"
                        style={{ 
                          background: 'var(--bg-primary, rgba(0, 0, 0, 0.04))',
                          border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.06))' 
                        }}
                      >
                        <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                          <span className="mt-0.5">📍</span>
                          <span className="truncate flex-1"><strong style={{ color: 'var(--text-secondary, #94a3b8)' }}>From:</strong> {trip.from_location || 'GPS Origin'}</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs font-bold text-cyan-500">
                          <span className="mt-0.5">🎯</span>
                          <span className="truncate flex-1"><strong>To:</strong> {trip.to_location || 'Destination'}</span>
                        </div>
                      </div>

                      {/* Purpose & Details */}
                      {trip.notes && (
                        <div 
                          className="mt-3 p-3 rounded-xl text-xs"
                          style={{ 
                            background: 'var(--bg-primary, rgba(0, 0, 0, 0.04))',
                            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.05))',
                            color: 'var(--text-secondary, #94a3b8)'
                          }}
                        >
                          <p className="text-[11px] font-semibold uppercase mb-0.5" style={{ color: 'var(--text-muted, #64748b)' }}>Objective / Purpose:</p>
                          <p className="line-clamp-2" style={{ color: 'var(--text-primary, #f8fafc)' }}>{trip.notes}</p>
                        </div>
                      )}

                      {/* Distance & Time */}
                      <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                        <span>Started: {trip.check_in_at ? new Date(trip.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                        {trip.estimated_km > 0 && (
                          <span className="px-2.5 py-0.5 bg-cyan-500/15 text-cyan-500 font-extrabold rounded-lg text-[11px] border border-cyan-500/20">
                            {trip.estimated_km} KM
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Links */}
                    <div 
                      className="pt-3 flex items-center justify-between gap-2"
                      style={{ borderTop: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLiveTripId(trip.id);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelectedOnMap 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                            : 'hover:bg-cyan-500/10'
                        }`}
                        style={{
                          background: isSelectedOnMap ? undefined : 'rgba(6, 182, 212, 0.1)',
                          color: isSelectedOnMap ? undefined : '#06b6d4',
                          border: isSelectedOnMap ? undefined : '1px solid rgba(6, 182, 212, 0.25)'
                        }}
                      >
                        <FiCompass size={13} /> {isSelectedOnMap ? 'Viewing on Map' : 'Focus on Map'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openTrailModal(trip)}
                        className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary, #94a3b8)',
                          border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))'
                        }}
                      >
                        <FiMapPin size={13} /> Trail
                      </button>

                      {hasGps && (
                        <a
                          href={`https://maps.google.com/?q=${lat},${lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <FiExternalLink size={13} /> Pin
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      )}

      {/* ================= TAB 2: TRIP HISTORY & LOGS ================= */}
      {activeTab === 'history' && (
        <div 
          className="p-4 sm:p-6 lg:p-8 rounded-3xl shadow-sm space-y-6"
          style={{ 
            background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
          }}
        >
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted, #64748b)' }} />
              <input
                type="text"
                placeholder="Search by executive, location, purpose..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setAttPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none"
                style={{
                  background: 'var(--bg-primary, rgba(0, 0, 0, 0.04))',
                  color: 'var(--text-primary, #f8fafc)',
                  border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))'
                }}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setAttPage(1); }}
                className="px-3 py-2.5 rounded-xl text-xs focus:outline-none w-full sm:w-auto"
                style={{
                  background: 'var(--bg-primary, rgba(255, 255, 255, 0.06))',
                  color: 'var(--text-primary, #f8fafc)',
                  border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))'
                }}
              >
                <option value="ALL">All Statuses ({attendance.length})</option>
                <option value="ACTIVE">Active Only ({activeTrips.length})</option>
                <option value="COMPLETED">Completed Only ({completedTrips.length})</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.08))' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary, rgba(0, 0, 0, 0.04))' }}>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Executive</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Start Point</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Destination</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Objective / Notes</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Check-In</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Check-Out</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Distance</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs" style={{ borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.05))' }}>
                {paginatedAttendance.map(a => {
                  const emp = allEmployees.find(e => e.id === a.employee_id);
                  const isOngoing = a.status === 'Checked In';
                  return (
                    <tr key={a.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5 font-bold" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                        <div>{emp?.name || a.employee_name || a.employee_id}</div>
                        <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>{a.employee_id}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium" style={{ color: 'var(--text-primary, #f8fafc)' }}>{a.from_location || '-'}</td>
                      <td className="px-4 py-3.5 font-bold text-cyan-500">{a.to_location || '-'}</td>
                      <td className="px-4 py-3.5 max-w-[200px] truncate" style={{ color: 'var(--text-secondary, #94a3b8)' }} title={a.notes || ''}>
                        {a.notes || '-'}
                      </td>
                      <td className="px-4 py-3.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                        {a.check_in_at ? new Date(a.check_in_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                        {a.check_out_at ? new Date(a.check_out_at).toLocaleString() : isOngoing ? <span className="text-emerald-500 font-semibold">Active</span> : '-'}
                      </td>
                      <td className="px-4 py-3.5 font-bold" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                        {a.total_km > 0 ? `${a.total_km} KM` : a.estimated_km > 0 ? `${a.estimated_km} KM (Est)` : '0 KM'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isOngoing 
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                            : 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
                        }`}>
                          {a.status || 'Checked Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openTrailModal(a)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          style={{
                            background: 'rgba(6, 182, 212, 0.1)',
                            color: '#06b6d4',
                            border: '1px solid rgba(6, 182, 212, 0.25)'
                          }}
                        >
                          <FiMapPin size={11} /> Trail
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedAttendance.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                      No field trips match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={safeAttPage}
            totalPages={attTotalPages}
            totalItems={filteredAttendance.length}
            pageSize={attPageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={setAttPage}
            onPageSizeChange={(s) => { setAttPageSize(s); setAttPage(1); }}
            itemName="records"
          />
        </div>
      )}

      {/* ================= TAB 3: ACCESS CONTROL & AUTHORIZATIONS ================= */}
      {activeTab === 'access' && (
        <div 
          className="p-4 sm:p-6 lg:p-8 rounded-3xl shadow-sm space-y-6"
          style={{ 
            background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
          }}
        >
          <div className="pb-4" style={{ borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary, #f8fafc)' }}>
              <FiShield className="text-purple-500" /> Authorized Marketing Managers
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              Marketing team members are isolated from other staff in Chat and directory lists. Only Admins and the designated authorized managers below can view or communicate with Marketing members.
            </p>
          </div>

          {/* Grant Authorization Form */}
          <div 
            className="flex flex-col sm:flex-row gap-3 items-center p-4 rounded-2xl"
            style={{ 
              background: 'var(--bg-primary, rgba(0, 0, 0, 0.04))',
              border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
            }}
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                Select Employee to Authorize
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none"
                style={{
                  background: 'var(--bg-card, rgba(255, 255, 255, 0.06))',
                  color: 'var(--text-primary, #f8fafc)',
                  border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.15))'
                }}
              >
                <option value="">-- Choose Employee --</option>
                {allEmployees
                  .filter(e => e.role !== 'Admin' && e.role !== 'Superadmin' && (e.department || '').toLowerCase() !== 'marketing')
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) - {emp.department || 'General'} [{emp.role || 'Staff'}]
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleGrantAuthorization}
              className="w-full sm:w-auto mt-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/30"
            >
              <FiUserPlus size={14} /> Grant Access
            </button>
          </div>

          {/* Authorizations Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.08))' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary, rgba(0, 0, 0, 0.04))' }}>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Authorized Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Authorized By</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Granted Date</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs" style={{ borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.05))' }}>
                {authorizations.map(auth => (
                  <tr key={auth.id || auth.employee_id || auth.employeeId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3.5 font-bold flex items-center gap-2" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      {auth.employee_name || auth.employeeName || auth.employee_id || auth.employeeId}
                    </td>
                    <td className="px-4 py-3.5 font-mono" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{auth.employee_id || auth.employeeId}</td>
                    <td className="px-4 py-3.5" style={{ color: 'var(--text-primary, #f8fafc)' }}>{auth.assigned_by || auth.assignedBy || 'Admin'}</td>
                    <td className="px-4 py-3.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                      {auth.created_at || auth.createdAt ? new Date(auth.created_at || auth.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokeAuthorization(auth.employee_id || auth.employeeId, auth.employee_name || auth.employeeName)}
                        className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Revoke Access"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {authorizations.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                      No custom authorized managers assigned. Only Admins and Marketing department peers currently have access.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breadcrumb Trail Modal */}
      {activeTrailModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div 
            className="rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            style={{ 
              background: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.15))' 
            }}
          >
            <div 
              className="p-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}
            >
              <div>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                  <FiMapPin className="text-cyan-500" /> GPS Route Trail Logs
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                  {activeTrailModal.from_location || 'Start'} ➔ {activeTrailModal.to_location || 'Destination'} ({trailLogs.length} Waypoint Pings)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTrailModal(null)}
                className="text-xl p-1 hover:opacity-75"
                style={{ color: 'var(--text-secondary, #94a3b8)' }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {trailLoading ? (
                <div className="py-12 text-center text-xs animate-pulse" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Loading GPS waypoint trail...</div>
              ) : trailLogs.length === 0 ? (
                <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>No intermediate waypoints captured for this trip.</div>
              ) : (
                trailLogs.map((log, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === trailLogs.length - 1;
                  return (
                    <div
                      key={log.id || idx}
                      className="p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs"
                      style={{ 
                        background: 'var(--bg-primary, rgba(0, 0, 0, 0.04))',
                        border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg font-extrabold uppercase text-[10px] ${
                            isFirst
                              ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                              : isLast
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
                          }`}
                        >
                          {isFirst ? 'START' : isLast ? 'END' : `#${idx + 1}`}
                        </span>
                        <div>
                          <div className="font-mono font-bold" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                            {Number(log.latitude).toFixed(5)}°, {Number(log.longitude).toFixed(5)}°
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted, #64748b)' }}>
                            {log.recorded_at ? new Date(log.recorded_at).toLocaleTimeString() : '-'}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                        style={{
                          background: 'rgba(6, 182, 212, 0.12)',
                          color: '#06b6d4',
                          border: '1px solid rgba(6, 182, 212, 0.3)'
                        }}
                      >
                        <FiExternalLink size={12} /> Pin
                      </a>
                    </div>
                  );
                })
              )}
            </div>

            <div 
              className="p-4 flex justify-end"
              style={{ borderTop: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}
            >
              <button
                type="button"
                onClick={() => setActiveTrailModal(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl"
                style={{
                  background: 'var(--bg-primary, rgba(0, 0, 0, 0.08))',
                  color: 'var(--text-primary, #f8fafc)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
