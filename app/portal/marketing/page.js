'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import AttendanceWidget from '../../components/AttendanceWidget';
import { 
  FiMapPin, FiLogOut, FiNavigation, FiCheckCircle, 
  FiRefreshCw, FiClock, FiFileText, FiCompass, FiExternalLink, FiUser, FiList, FiMenu, FiX
} from 'react-icons/fi';

const PURPOSE_PRESETS = [
  '🤝 Client Meeting',
  '💼 Lead Generation',
  '📦 Product Demo',
  '💰 Payment Collection',
  '📋 Site Inspection',
  '🏢 Office to Field Visit',
  '🔄 Follow-up Visit',
];

export default function MarketingDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const myEmployeeId = user?.id || '';

  const [activeTab, setActiveTab] = useState('attendance');

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [locationLog, setLocationLog] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [fromLocation, setFromLocation] = useState('');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [toLocation, setToLocation] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activeAttendance, setActiveAttendance] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const stored = localStorage.getItem('devicedesk_auth_user');
      if (!stored && !user) {
        router.push('/login');
      }
    }
  }, [mounted, user, router]);

  useEffect(() => {
    if (mounted && myEmployeeId) {
      fetchMyAttendance();
      fetchCurrentGps();
    }
  }, [mounted, myEmployeeId]);

  const fetchCurrentGps = (showFeedback = false) => {
    if (!navigator.geolocation) {
      if (showFeedback) alert('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentCoords({ latitude, longitude, accuracy });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'DeviceDesk-Web/1.0' }
          });
          const data = await res.json();
          if (data?.display_name) {
            const shortAddr = data.display_name.split(',').slice(0, 3).join(',').trim();
            setFromLocation(shortAddr || `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setFromLocation(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (e) {
          setFromLocation(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setFetchingGps(false);
        if (showFeedback) {
          alert(`GPS Locked: (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) ±${Math.round(accuracy || 10)}m`);
        }
      },
      (err) => {
        setFetchingGps(false);
        if (showFeedback) {
          alert('GPS error: ' + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const fetchMyAttendance = async () => {
    try {
      const res = await fetch(`/api/marketing/attendance?employee_id=${encodeURIComponent(myEmployeeId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAttendanceHistory(data.data);
        const active = data.data.find(a => a.status === 'Checked In');
        setActiveAttendance(active || null);
        if (active) {
          const lat = Number(active.check_in_latitude || 0).toFixed(4);
          const lng = Number(active.check_in_longitude || 0).toFixed(4);
          setLocationLog(`Active Route: ${active.from_location || 'Start'} ➔ ${active.to_location || 'Destination'} (GPS: ${lat}, ${lng})`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = () => {
    if (logout) {
      logout();
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('devicedesk_auth_user');
        localStorage.removeItem('devicedesk_employee_view');
        localStorage.removeItem('devicedesk_unread_chat_count');
        document.cookie = 'devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
        document.cookie = 'devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
        window.location.href = '/login';
      }
    }
  };

  const handleStartRoute = () => {
    if (!myEmployeeId) {
      alert('You must be logged in to start a field route.');
      router.push('/login');
      return;
    }

    if (!fromLocation.trim()) {
      alert('Please provide or lock your starting location.');
      return;
    }

    if (!toLocation.trim()) {
      alert('Please enter your destination (Where To).');
      return;
    }

    const combinedNotes = [selectedPurpose, customNotes.trim()].filter(Boolean).join(' - ');

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const res = await fetch('/api/marketing/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: myEmployeeId,
            action: 'check_in',
            from_location: fromLocation.trim(),
            to_location: toLocation.trim(),
            notes: combinedNotes,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            estimated_km: 0
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Field Route Started! 🚀 Live GPS tracking is now active.');
          setToLocation('');
          setSelectedPurpose('');
          setCustomNotes('');
          fetchMyAttendance();
        } else {
          alert(data.error || 'Failed to start field route');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred while starting the field route.');
      }
      setLoading(false);
    }, (error) => {
      alert('Error getting location: ' + error.message);
      setLoading(false);
    }, { enableHighAccuracy: true });
  };

  const handleCompleteRoute = () => {
    if (!activeAttendance) return;

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const res = await fetch('/api/marketing/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: myEmployeeId,
            action: 'check_out',
            attendance_id: activeAttendance.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            total_km: activeAttendance.estimated_km || 0
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Field Route Completed! 🎉 Trip logged successfully.');
          setLocationLog(null);
          setActiveAttendance(null);
          fetchMyAttendance();
        } else {
          alert(data.error || 'Failed to complete route');
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }, (error) => {
      alert('Error getting location: ' + error.message);
      setLoading(false);
    });
  };

  if (!mounted) {
    return (
      <div 
        className="flex h-screen font-sans items-center justify-center"
        style={{ background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}
      >
        <p className="text-sm font-medium animate-pulse text-slate-500 dark:text-slate-400">
          Loading Marketing Portal...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-full flex-1 min-h-screen font-sans transition-colors duration-200 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      
      {/* Sidebar (Desktop) / Topbar Navigation (Mobile) */}
      <aside className={`w-full md:w-64 md:min-h-screen flex-col justify-between shrink-0 shadow-lg bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 transition-all z-30 ${isMobileMenuOpen ? 'flex absolute inset-0 min-h-screen' : 'hidden md:flex'}`}>
        <div>
          {/* Brand & User Profile */}
          <div 
            className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-lg uppercase shadow-md shadow-cyan-500/20 shrink-0">
                {user?.name ? user.name.charAt(0) : 'M'}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-bold text-sm truncate text-slate-900 dark:text-white" title={user?.name}>
                  {user?.name || 'Marketing'}
                </h2>
                <p className="text-xs font-semibold truncate text-cyan-500" title={user?.department || user?.role}>
                  {user?.department || user?.role || 'Field Executive'}
                </p>
                {user?.id && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 truncate">
                    ID: {user.id}
                  </p>
                )}
                {user?.email && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={user.email}>
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="p-3 sm:p-4 space-y-1.5">
            <button
              type="button"
              onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm w-full text-left transition-colors ${
                activeTab === 'attendance'
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
              }`}
            >
              <FiClock size={16} />
              <span>Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('route'); setIsMobileMenuOpen(false); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm w-full text-left transition-colors ${
                activeTab === 'route'
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
              }`}
            >
              <FiNavigation size={16} />
              <span>Route Planner</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('recent'); setIsMobileMenuOpen(false); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm w-full text-left transition-colors ${
                activeTab === 'recent'
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
              }`}
            >
              <FiList size={16} />
              <span>Recent Visits</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer (Desktop only) */}
        <div 
          className="hidden md:flex p-4 flex-col gap-3 border-t border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>

          <button 
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 p-2.5 rounded-xl hover:bg-red-500/10 transition-colors"
            style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}
          >
            <FiLogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header Bar */}
        <header 
          className="px-4 sm:px-8 py-4 sm:py-5 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md bg-white/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-lg mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <FiMenu size={22} />
            </button>
            <div>
              <h1 
                className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white"
              >
              <FiNavigation className="text-cyan-500" /> Field Route Hub
            </h1>
            <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
              GPS route creator, objective logging & live tracking
            </p>
          </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <button 
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors"
              style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <FiLogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">

          {activeTab === 'attendance' && (
            <div className="mb-6">
              <AttendanceWidget user={user} />
            </div>
          )}

          {activeTab === 'route' && (
            <>
          {/* Active Trip Banner */}
          {activeAttendance && (
            <div 
              className="p-5 sm:p-6 rounded-2xl shadow-lg space-y-4 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 border-2 border-emerald-200 dark:border-emerald-800"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-500 uppercase tracking-wider">
                    Live Field Route Active
                  </span>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-bold">
                  ● Tracking in Progress
                </span>
              </div>

              <div 
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Start Point</p>
                  <p className="text-xs sm:text-sm font-bold flex items-center gap-1.5 mt-1 text-slate-900 dark:text-white">
                    <FiMapPin className="text-cyan-500 shrink-0" /> {activeAttendance.from_location || 'GPS Locked'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Destination</p>
                  <p className="text-xs sm:text-sm font-bold text-cyan-500 flex items-center gap-1.5 mt-1">
                    🎯 {activeAttendance.to_location || 'Destination'}
                  </p>
                </div>
              </div>

              {activeAttendance.notes && (
                <div 
                  className="p-3.5 rounded-xl text-xs flex items-start gap-2 bg-white/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 shadow-sm"
                >
                  <FiFileText className="text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Purpose / Notes: </strong> 
                    {activeAttendance.notes}
                  </div>
                </div>
              )}

              {/* Live Map Preview inside Active Route */}
              {(activeAttendance.check_in_latitude && activeAttendance.check_in_longitude) && (
                <div 
                  className="w-full h-56 sm:h-72 rounded-2xl overflow-hidden shadow-inner relative border border-slate-200 dark:border-slate-700"
                >
                  <iframe
                    title="Active Route Live Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://maps.google.com/maps?q=${activeAttendance.check_in_latitude},${activeAttendance.check_in_longitude}&hl=en&z=16&output=embed`}
                    className="w-full h-full border-0"
                  />
                  <a
                    href={`https://maps.google.com/?q=${activeAttendance.check_in_latitude},${activeAttendance.check_in_longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm transition-colors flex items-center gap-1 shadow-md"
                  >
                    <FiExternalLink size={11} /> Open Map App
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <FiClock className="text-slate-400 dark:text-slate-500" />
                  Started at {activeAttendance.check_in_at ? new Date(activeAttendance.check_in_at).toLocaleTimeString() : 'Now'}
                </div>
                <button
                  type="button"
                  onClick={handleCompleteRoute}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                >
                  <FiCheckCircle />
                  {loading ? 'Completing...' : 'Complete Field Route (Check Out)'}
                </button>
              </div>
            </div>
          )}

          {/* Route Creation Form */}
          <div 
            className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <div 
              className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700"
            >
              <div 
                className="p-3 rounded-xl"
                style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.25)' }}
              >
                <FiNavigation size={22} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Create & Start Field Route
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your starting point, destination, and visit purpose to begin tracking
                </p>
              </div>
            </div>

            {/* Inputs: Start & Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5">
              {/* Start Point */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <FiMapPin className="text-cyan-500" /> Start Point (Current GPS) <span className="text-cyan-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchCurrentGps(true)}
                    disabled={fetchingGps || !!activeAttendance}
                    className="text-xs text-cyan-500 hover:text-cyan-400 flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <FiRefreshCw className={fetchingGps ? 'animate-spin' : ''} size={11} />
                    {fetchingGps ? 'Locking...' : 'Refresh GPS'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Office / Sector 17 / Live GPS"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-xs sm:text-sm focus:outline-none bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors shadow-sm"
                  disabled={loading || !!activeAttendance}
                />
                {currentCoords && (
                  <p className="text-[11px] text-emerald-500 mt-1.5 flex items-center gap-1 font-medium">
                    ✓ GPS Locked: {currentCoords.latitude.toFixed(4)}, {currentCoords.longitude.toFixed(4)} (±{Math.round(currentCoords.accuracy || 10)}m)
                  </p>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                  Where To / Destination <span className="text-cyan-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Office Sector 62 / Market Visit / Client Name"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-xs sm:text-sm focus:outline-none bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors shadow-sm"
                  disabled={loading || !!activeAttendance}
                />
              </div>
            </div>

            {/* Purpose Preset Chips */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                Purpose of Going / Visit Objective
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PURPOSE_PRESETS.map((preset) => {
                  const isSelected = selectedPurpose === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelectedPurpose(isSelected ? '' : preset)}
                      disabled={loading || !!activeAttendance}
                      
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${isSelected ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 border-transparent" : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm"}`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Custom Notes */}
              <textarea
                rows={2}
                placeholder="Add specific details (e.g. Client contact name, agenda, quotation discussion)..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-xs sm:text-sm focus:outline-none resize-none bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors shadow-sm"
                disabled={loading || !!activeAttendance}
              />
            </div>
            
            {/* Big Start Route Button */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={handleStartRoute}
                disabled={loading || !!activeAttendance || !fromLocation.trim() || !toLocation.trim()}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold px-8 py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <FiNavigation size={18} />
                {loading ? 'Starting Live Tracking...' : activeAttendance ? 'Active Route in Progress' : '🚀 Start Field Route'}
              </button>
            </div>
          </div>
          </>
          )}

          {activeTab === 'recent' && (
          <div 
            className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-sm sm:text-base font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <FiClock className="text-cyan-500" /> My Recent Field Visits
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">From</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Destination</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Purpose / Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Check-In</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Check-Out</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">GPS Map</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-xs">
                  {attendanceHistory.map(item => (
                    <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.from_location || '-'}</td>
                      <td className="px-4 py-3 font-bold text-cyan-500">{item.to_location || '-'}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-500 dark:text-slate-400" title={item.notes || ''}>
                        {item.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {item.check_in_at ? new Date(item.check_in_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {item.check_out_at ? new Date(item.check_out_at).toLocaleString() : item.status === 'Checked In' ? <span className="text-emerald-500 font-bold">Active</span> : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {item.check_in_latitude && item.check_in_longitude ? (
                          <a 
                            href={`https://maps.google.com/?q=${item.check_in_latitude},${item.check_in_longitude}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1 font-mono text-xs hover:underline"
                          >
                            <FiMapPin size={12} /> {Number(item.check_in_latitude || 0).toFixed(4)}, {Number(item.check_in_longitude || 0).toFixed(4)}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.status === 'Checked In' 
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                            : 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
                        }`}>
                          {item.status || 'Checked Out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendanceHistory.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        No field routes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}

