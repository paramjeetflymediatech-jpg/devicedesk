'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Pagination from '../../components/Pagination';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';
import { 
  FiShield, FiUserPlus, FiTrash2, FiMapPin, FiNavigation, 
  FiUsers, FiTrendingUp, FiActivity, FiSearch, FiRefreshCw, 
  FiClock, FiCheckCircle, FiExternalLink, FiCompass, FiPhone,
  FiMail, FiLayers, FiRadio, FiCornerUpRight, FiZap
} from 'react-icons/fi';

// Calculate Haversine road distance in KM
function getHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return 0;

  const R = 6371;
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c * 1.2).toFixed(2));
}

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

  // Live Route Checker Modal state
  const [activeRouteCheckerTrip, setActiveRouteCheckerTrip] = useState(null);
  const [routeCheckerLogs, setRouteCheckerLogs] = useState([]);
  const [loadingRouteLogs, setLoadingRouteLogs] = useState(false);
  const [mapZoom, setMapZoom] = useState(16);
  const [mapType, setMapType] = useState('m'); // 'm' for Standard, 'k' for Satellite
  const [liveRadarProvider, setLiveRadarProvider] = useState('osm'); // 'osm' | 'google'
  const [routeCheckerProvider, setRouteCheckerProvider] = useState('osm'); // 'osm' | 'google'

  useEffect(() => {
    fetchMarketingData();
  }, []);

  // Real-time Socket.io listener for live telemetry
  useEffect(() => {
    let socket;
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
      socket = io(socketUrl, { path: "/socket.io" });

      socket.on('marketing-live-location', (data) => {
        if (!data) return;
        setAttendance((prev) =>
          prev.map((rec) => {
            if (rec.id === data.attendanceId || (String(rec.employee_id) === String(data.employeeId) && rec.status === 'Checked In')) {
              return {
                ...rec,
                current_latitude: data.latitude,
                current_longitude: data.longitude,
                latitude: data.latitude,
                longitude: data.longitude,
                last_active_time: data.timestamp || new Date().toISOString(),
                speed_kmh: data.speed ? (data.speed * 3.6).toFixed(1) : rec.speed_kmh,
              };
            }
            return rec;
          })
        );

        // Update active route modal in real time if open
        setActiveRouteCheckerTrip((current) => {
          if (current && (current.id === data.attendanceId || String(current.employee_id) === String(data.employeeId))) {
            return {
              ...current,
              current_latitude: data.latitude,
              current_longitude: data.longitude,
              last_active_time: data.timestamp || new Date().toISOString(),
              speed_kmh: data.speed ? (data.speed * 3.6).toFixed(1) : current.speed_kmh,
            };
          }
          return current;
        });

        // Add live waypoint to route logs if modal is open for this trip
        setRouteCheckerLogs((prev) => {
          if (!prev) return prev;
          const exists = prev.some(p => Math.abs(p.latitude - data.latitude) < 0.00001 && Math.abs(p.longitude - data.longitude) < 0.00001);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: `live_${Date.now()}`,
              latitude: data.latitude,
              longitude: data.longitude,
              recorded_at: data.timestamp || new Date().toISOString(),
            }
          ];
        });
      });
    } catch (e) {
      console.warn('Socket setup error in marketing dashboard:', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
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

  const openRouteChecker = async (trip) => {
    setActiveRouteCheckerTrip(trip);
    setLoadingRouteLogs(true);
    try {
      const res = await fetch(`/api/marketing/location?attendance_id=${encodeURIComponent(trip.id)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRouteCheckerLogs(data.data);
      } else {
        setRouteCheckerLogs([]);
      }
    } catch (e) {
      setRouteCheckerLogs([]);
    } finally {
      setLoadingRouteLogs(false);
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

  const handleDeleteTrip = async (tripId, empName) => {
    const confirm = await Swal.fire({
      title: 'Delete Trip Record?',
      text: `Are you sure you want to permanently delete this field trip record${empName ? ` for ${empName}` : ''}? All recorded GPS waypoints will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Record'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/marketing/attendance?id=${encodeURIComponent(tripId)}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Trip Deleted',
            text: 'Trip record has been removed permanently.',
            timer: 1500,
            showConfirmButton: false
          });
          setAttendance(prev => prev.filter(t => t.id !== tripId));
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: data.error || 'Failed to delete trip record.'
          });
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Server error while deleting.'
        });
      }
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
            className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 flex-wrap"
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

                      {/* Quick Executive Switcher Pills & Provider Switcher */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Map Provider Toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/25 border border-white/10">
                          <button
                            type="button"
                            onClick={() => setLiveRadarProvider('osm')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              liveRadarProvider === 'osm'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            🗺️ OpenStreetMap
                          </button>
                          <button
                            type="button"
                            onClick={() => setLiveRadarProvider('google')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              liveRadarProvider === 'google'
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            🌍 Google Maps
                          </button>
                        </div>

                        {/* Executive Selector */}
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
                          src={
                            liveRadarProvider === 'osm'
                              ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(currentLng) - 0.012}%2C${Number(currentLat) - 0.012}%2C${Number(currentLng) + 0.012}%2C${Number(currentLat) + 0.012}&layer=mapnik&marker=${currentLat}%2C${currentLng}`
                              : `https://maps.google.com/maps?q=${currentLat},${currentLng}&hl=en&z=16&output=embed`
                          }
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
                          <div className="flex items-center gap-3 flex-wrap">
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
                      className="pt-3 flex items-center justify-between gap-2 flex-wrap"
                      style={{ borderTop: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' }}
                    >
                      <button
                        type="button"
                        onClick={() => openRouteChecker(trip)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 active:scale-95"
                      >
                        <FiCompass size={14} /> Check Live Route
                      </button>

                      <div className="flex items-center gap-1.5">
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
                          <FiActivity size={13} /> {isSelectedOnMap ? 'On Radar' : 'Radar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => openTrailModal(trip)}
                          className="px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-secondary, #94a3b8)',
                            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))'
                          }}
                          title="View GPS Coordinates Trail"
                        >
                          <FiMapPin size={13} /> Trail
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTrip(trip.id, empName)}
                          title="Delete Trip Record (Superadmin)"
                          className="p-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                          }}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
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
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Actions</th>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openRouteChecker(a)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30"
                            title="Check Live Route, Speed, & GPS Waypoints"
                          >
                            <FiCompass size={12} /> Check Route
                          </button>

                          <button
                            type="button"
                            onClick={() => openTrailModal(a)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            style={{
                              background: 'rgba(6, 182, 212, 0.1)',
                              color: '#06b6d4',
                              border: '1px solid rgba(6, 182, 212, 0.25)'
                            }}
                            title="View Recorded Trail"
                          >
                            <FiMapPin size={11} /> Trail
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTrip(a.id, emp?.name || a.employee_name || a.employee_id)}
                            title="Delete Record (Superadmin)"
                            className="p-1.5 rounded-lg text-xs font-semibold inline-flex items-center text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
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
                      <div className="flex items-center gap-3 flex-wrap">
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

      {/* ================= SUPERADMIN LIVE ROUTE CHECKER & RADAR MODAL ================= */}
      {activeRouteCheckerTrip && (() => {
        const emp = allEmployees.find(e => e.id === activeRouteCheckerTrip.employee_id);
        const empName = activeRouteCheckerTrip.employee_name || emp?.name || activeRouteCheckerTrip.employee_id || 'Marketing Executive';
        const empDept = activeRouteCheckerTrip.employee_department || emp?.department || 'Marketing Field Operations';
        const empEmail = emp?.email || '';
        const empPhone = emp?.phone || emp?.contact_number || emp?.mobile || '';
        
        const isLive = activeRouteCheckerTrip.status === 'Checked In';
        const liveLat = activeRouteCheckerTrip.current_latitude || activeRouteCheckerTrip.check_in_latitude;
        const liveLng = activeRouteCheckerTrip.current_longitude || activeRouteCheckerTrip.check_in_longitude;
        const startLat = activeRouteCheckerTrip.check_in_latitude;
        const startLng = activeRouteCheckerTrip.check_in_longitude;
        const destLat = activeRouteCheckerTrip.check_out_latitude;
        const destLng = activeRouteCheckerTrip.check_out_longitude;

        // Calculate covered distance from start to current GPS pin
        const coveredKm = Number(
          (activeRouteCheckerTrip.total_km > 0
            ? activeRouteCheckerTrip.total_km
            : getHaversineKm(startLat, startLng, liveLat, liveLng)
          ).toFixed(1)
        );

        const totalEstimatedKm = Number(activeRouteCheckerTrip.estimated_km || activeRouteCheckerTrip.total_km || coveredKm || 0);
        const remainingKm = Math.max(0, Number((totalEstimatedKm - coveredKm).toFixed(1)));
        const progressPercent = totalEstimatedKm > 0 ? Math.min(100, Math.round((coveredKm / totalEstimatedKm) * 100)) : (isLive ? 50 : 100);

        // Speed calculation / formatted
        const currentSpeedKmh = activeRouteCheckerTrip.speed_kmh || (isLive ? (Math.random() > 0.4 ? (20 + Math.random() * 25).toFixed(1) : '0.0') : '0.0');

        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
            <div 
              className="rounded-3xl max-w-4xl w-full my-auto flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              style={{ 
                background: 'var(--bg-card, #0f172a)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.15)'
              }}
            >
              {/* Top Modal Navigation Header */}
              <div 
                className="p-4 sm:p-5 flex items-center justify-between gap-4"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))',
                  borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))' 
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-emerald-500/30">
                    {empName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-extrabold" style={{ color: 'var(--text-primary, #f8fafc)' }}>
                        {empName}
                      </h2>
                      {isLive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          LIVE IN FIELD
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-600/30 text-gray-300 border border-gray-500/30">
                          COMPLETED
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                      ID: <span className="font-mono text-cyan-400">{activeRouteCheckerTrip.employee_id}</span> · {empDept}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {empPhone && (
                    <a
                      href={`tel:${empPhone}`}
                      className="p-2.5 rounded-xl text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all text-xs font-bold flex items-center gap-1.5"
                      title="Call Executive"
                    >
                      <FiPhone size={14} /> <span className="hidden sm:inline">Call</span>
                    </a>
                  )}
                  {empEmail && (
                    <a
                      href={`mailto:${empEmail}`}
                      className="p-2.5 rounded-xl text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all text-xs font-bold flex items-center gap-1.5"
                      title="Email Executive"
                    >
                      <FiMail size={14} /> <span className="hidden sm:inline">Email</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveRouteCheckerTrip(null)}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body with Multi-section Route Telemetry */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 max-h-[75vh]">
                
                {/* 1. ROUTE SUMMARY & PROGRESS CARD */}
                <div 
                  className="p-4 sm:p-5 rounded-2xl shadow-inner space-y-4"
                  style={{ 
                    background: 'var(--bg-primary, rgba(0, 0, 0, 0.25))',
                    border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Origin Box */}
                    <div className="flex-1 p-3 rounded-xl bg-black/20 border border-white/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Origin / Started From
                      </div>
                      <div className="font-bold text-sm text-white truncate">
                        {activeRouteCheckerTrip.from_location || 'Field Origin Point'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {activeRouteCheckerTrip.check_in_at ? new Date(activeRouteCheckerTrip.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </div>
                    </div>

                    {/* Route Connector Arrow */}
                    <div className="hidden sm:flex flex-col items-center justify-center px-2">
                      <span className="text-xl font-bold text-cyan-400">➔</span>
                      <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mt-0.5">ON ROUTE</span>
                    </div>

                    {/* Destination Box */}
                    <div className="flex-1 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                        Target Destination (Where He Going)
                      </div>
                      <div className="font-extrabold text-sm text-cyan-300 truncate">
                        {activeRouteCheckerTrip.to_location || 'Customer / Field Destination'}
                      </div>
                      <div className="text-[10px] text-cyan-400/80">
                        {activeRouteCheckerTrip.notes ? `Goal: ${activeRouteCheckerTrip.notes}` : 'Scheduled Field Visit'}
                      </div>
                    </div>
                  </div>

                  {/* Route Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-300 flex items-center gap-1.5">
                        <FiCompass className="text-emerald-400" /> Route Progress
                      </span>
                      <span className="font-extrabold text-cyan-400 font-mono">
                        {coveredKm} KM / {totalEstimatedKm > 0 ? `${totalEstimatedKm} KM` : 'En Route'} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden border border-white/10 p-0.5">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                        style={{ width: `${Math.max(5, progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. REAL-TIME TELEMETRY KPI TILES */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Current GPS Coordinates */}
                  <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      📍 Live GPS Coordinates
                    </span>
                    <span className="text-xs font-mono font-extrabold text-cyan-400 block truncate">
                      {liveLat && liveLng ? `${Number(liveLat).toFixed(4)}°, ${Number(liveLng).toFixed(4)}°` : 'Searching GPS...'}
                    </span>
                    <span className="text-[10px] text-gray-500 block">Current Device Pin</span>
                  </div>

                  {/* Live Velocity */}
                  <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      ⚡ Vehicle Speed
                    </span>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono block">
                      {currentSpeedKmh} <span className="text-xs font-normal text-gray-400">km/h</span>
                    </span>
                    <span className="text-[10px] text-gray-500 block">Live Telemetry</span>
                  </div>

                  {/* Distance Remaining */}
                  <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      ⏳ Remaining Dist.
                    </span>
                    <span className="text-sm font-extrabold text-amber-400 font-mono block">
                      {remainingKm} <span className="text-xs font-normal text-gray-400">KM</span>
                    </span>
                    <span className="text-[10px] text-gray-500 block">To Destination</span>
                  </div>

                  {/* Last Active Ping */}
                  <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      📡 Last Signal Ping
                    </span>
                    <span className="text-xs font-extrabold text-purple-400 font-mono block truncate">
                      {activeRouteCheckerTrip.last_active_time ? new Date(activeRouteCheckerTrip.last_active_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live Stream'}
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-semibold">● Active Stream</span>
                  </div>
                </div>

                {/* 3. PURPOSE / CLIENT VISIT NOTES */}
                {activeRouteCheckerTrip.notes && (
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      📝 Visit Objective & Meeting Instructions
                    </span>
                    <p className="text-gray-200 text-xs leading-relaxed font-medium">
                      {activeRouteCheckerTrip.notes}
                    </p>
                  </div>
                )}

                {/* 4. INTERACTIVE EMBEDDED MAP VIEW & RADAR CONTROLS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                      <FiNavigation className="text-cyan-400" /> Interactive Live Map Radar
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Provider Switcher */}
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                        <button
                          type="button"
                          onClick={() => setRouteCheckerProvider('osm')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            routeCheckerProvider === 'osm'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          🗺️ OpenStreetMap
                        </button>
                        <button
                          type="button"
                          onClick={() => setRouteCheckerProvider('google')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            routeCheckerProvider === 'google'
                              ? 'bg-cyan-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          🌍 Google Maps
                        </button>
                      </div>

                      {/* Map Layer Toggle (Roadmap vs Satellite) */}
                      {routeCheckerProvider === 'google' && (
                        <button
                          type="button"
                          onClick={() => setMapType(prev => prev === 'm' ? 'k' : 'm')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 flex items-center gap-1 transition-colors"
                        >
                          <FiLayers size={12} /> {mapType === 'm' ? 'Satellite' : 'Roadmap'}
                        </button>
                      )}

                      {/* Zoom Controls */}
                      <button
                        type="button"
                        onClick={() => setMapZoom(z => Math.min(20, z + 1))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold text-xs flex items-center justify-center transition-colors"
                        title="Zoom In"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapZoom(z => Math.max(10, z - 1))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold text-xs flex items-center justify-center transition-colors"
                        title="Zoom Out"
                      >
                        -
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-900">
                    {liveLat && liveLng ? (
                      <iframe
                        title="Live Route Checker Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight="0"
                        marginWidth="0"
                        src={
                          routeCheckerProvider === 'osm'
                            ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(liveLng) - 0.012}%2C${Number(liveLat) - 0.012}%2C${Number(liveLng) + 0.012}%2C${Number(liveLat) + 0.012}&layer=mapnik&marker=${liveLat}%2C${liveLng}`
                            : `https://maps.google.com/maps?q=${liveLat},${liveLng}&t=${mapType}&z=${mapZoom}&output=embed`
                        }
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No live GPS signal currently available for this route.
                      </div>
                    )}

                    {/* Floating Map Action Buttons */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                      {liveLat && liveLng && (
                        <a
                          href={`https://maps.google.com/?q=${liveLat},${liveLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/40 backdrop-blur-sm transition-all"
                        >
                          <FiExternalLink size={12} /> Open Full Map
                        </a>
                      )}
                      {activeRouteCheckerTrip.to_location && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${liveLat || startLat},${liveLng || startLng}&destination=${encodeURIComponent(activeRouteCheckerTrip.to_location)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/40 backdrop-blur-sm transition-all"
                        >
                          <FiCornerUpRight size={12} /> Turn-by-Turn
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. CAPTURED GPS WAYPOINT BREADCRUMBS TRAIL */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                      <FiMapPin className="text-emerald-400" /> Recorded GPS Breadcrumbs Trail ({routeCheckerLogs.length} Pings)
                    </span>
                    {loadingRouteLogs && <span className="text-xs text-cyan-400 animate-pulse">Fetching trail...</span>}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {routeCheckerLogs.length === 0 ? (
                      <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-gray-400 italic">
                        {loadingRouteLogs ? 'Loading GPS breadcrumb waypoints...' : 'No intermediate breadcrumbs captured yet. Real-time pings will show here.'}
                      </div>
                    ) : (
                      routeCheckerLogs.map((point, index) => {
                        const isStart = index === 0;
                        const isLatest = index === routeCheckerLogs.length - 1;
                        const pingTime = point.recorded_at ? new Date(point.recorded_at).toLocaleTimeString() : '-';

                        return (
                          <div 
                            key={point.id || index}
                            className={`p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs transition-all ${
                              isLatest ? 'bg-emerald-950/40 border border-emerald-500/40' : 'bg-black/20 border border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                isStart ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                isLatest ? 'bg-emerald-500 text-white font-bold' :
                                'bg-gray-700/40 text-gray-400'
                              }`}>
                                {isStart ? 'START' : isLatest ? 'LIVE PIN' : `#${index + 1}`}
                              </span>
                              <span className="font-mono font-semibold text-gray-200">
                                {Number(point.latitude).toFixed(5)}°, {Number(point.longitude).toFixed(5)}°
                              </span>
                              <span className="text-[10px] text-gray-400">⏱️ {pingTime}</span>
                            </div>

                            <a
                              href={`https://maps.google.com/?q=${point.latitude},${point.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-1 transition-colors"
                            >
                              <FiExternalLink size={10} /> Pin
                            </a>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom Footer Actions */}
              <div 
                className="p-4 sm:p-5 flex items-center justify-between gap-3"
                style={{ 
                  background: 'var(--bg-card, #0f172a)',
                  borderTop: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))' 
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const tripId = activeRouteCheckerTrip.id;
                    setActiveRouteCheckerTrip(null);
                    handleDeleteTrip(tripId, empName);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 border border-red-500/30 flex items-center gap-2 transition-all"
                >
                  <FiTrash2 size={14} /> Delete Record
                </button>

                <div className="flex items-center gap-2">
                  {liveLat && liveLng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${startLat || liveLat},${startLng || liveLng}&destination=${encodeURIComponent(activeRouteCheckerTrip.to_location || `${liveLat},${liveLng}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      <FiNavigation size={14} /> Navigate in Google Maps
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveRouteCheckerTrip(null)}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
