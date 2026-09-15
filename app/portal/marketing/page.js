'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import { FiMapPin, FiLogOut, FiNavigation, FiCheckCircle, FiRefreshCw, FiClock, FiFileText } from 'react-icons/fi';

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

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [locationLog, setLocationLog] = useState(null);

  const [fromLocation, setFromLocation] = useState('');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [toLocation, setToLocation] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [estimatedKm, setEstimatedKm] = useState(0);

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
            estimated_km: estimatedKm || 0
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Field Route Started Successfully! 🚀 Live GPS tracking active.');
          setLocationLog(`Active Route: ${fromLocation} ➔ ${toLocation}`);
          setToLocation('');
          setSelectedPurpose('');
          setCustomNotes('');
          setEstimatedKm(0);
          fetchMyAttendance();
        } else {
          alert(data.error || 'Failed to start field route');
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }, (error) => {
      alert('Error getting GPS location: ' + error.message);
      setLoading(false);
    });
  };

  const handleCompleteRoute = () => {
    if (!activeAttendance) {
      alert('No active field route found.');
      return;
    }

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
      <div className="flex h-screen bg-gray-950 text-gray-100 font-sans items-center justify-center">
        <p className="text-sm text-gray-400 font-medium animate-pulse">Loading Marketing Portal...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 shadow-xl flex flex-col">
        <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl uppercase shadow-md shadow-cyan-500/20">
            {user?.name ? user.name.charAt(0) : 'M'}
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm text-white truncate">{user?.name || 'Marketing'}</h2>
            <p className="text-xs text-cyan-400 truncate font-medium">{user?.department || user?.role || 'Marketing Executive'}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col space-y-2">
          <div className="flex items-center space-x-3 p-3 rounded-xl font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm">
            <FiNavigation className="text-cyan-400" />
            <span>Field Route Tracker</span>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-gray-900/90 border-b border-gray-800 px-8 py-5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <FiNavigation className="text-cyan-400" /> Marketing Field Route
            </h1>
            <p className="text-xs text-gray-400">GPS route creator, objective logging & live tracking</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-xl hover:bg-red-500/10 transition-colors"
          >
            <FiLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="p-8 max-w-5xl mx-auto space-y-6">

          {/* Active Trip Banner */}
          {activeAttendance && (
            <div className="bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Live Field Route Active</span>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold">
                  Tracking in Progress
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-900/80 p-4 rounded-xl border border-gray-800">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Start Point</p>
                  <p className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                    <FiMapPin className="text-cyan-400" /> {activeAttendance.from_location || 'GPS Locked'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Destination</p>
                  <p className="text-sm font-bold text-cyan-300 flex items-center gap-1 mt-0.5">
                    🎯 {activeAttendance.to_location || 'Destination'}
                  </p>
                </div>
              </div>

              {activeAttendance.notes && (
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800/80 text-xs text-gray-300 flex items-center gap-2">
                  <FiFileText className="text-cyan-400 shrink-0" />
                  <span><strong className="text-white">Purpose / Notes:</strong> {activeAttendance.notes}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-400 flex items-center gap-1.5">
                  <FiClock className="text-gray-500" />
                  Started at {activeAttendance.check_in_at ? new Date(activeAttendance.check_in_at).toLocaleTimeString() : 'Now'}
                </div>
                <button
                  onClick={handleCompleteRoute}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <FiCheckCircle />
                  {loading ? 'Completing...' : 'Complete Field Route (Check Out)'}
                </button>
              </div>
            </div>
          )}

          {/* Route Creation Form */}
          <div className="bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-800">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-800">
              <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                <FiNavigation size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create & Start Field Route</h2>
                <p className="text-gray-400 text-xs">Enter your starting point, destination, and visit purpose to begin tracking</p>
              </div>
            </div>

            {/* Step 1 & 2: Start & Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Start Point */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                    <FiMapPin className="text-cyan-400" /> Start Point (Current Location) <span className="text-cyan-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchCurrentGps(true)}
                    disabled={fetchingGps || !!activeAttendance}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
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
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
                  disabled={loading || !!activeAttendance}
                />
                {currentCoords && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    ✓ GPS Locked: {currentCoords.latitude.toFixed(4)}, {currentCoords.longitude.toFixed(4)} (±{Math.round(currentCoords.accuracy || 10)}m)
                  </p>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Where To / Destination <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Office Sector 62 / Market Visit / Client Name"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
                  disabled={loading || !!activeAttendance}
                />
              </div>
            </div>

            {/* Step 3: Purpose Preset Chips */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Purpose of Going / Visit Objective
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PURPOSE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedPurpose(selectedPurpose === preset ? '' : preset)}
                    disabled={loading || !!activeAttendance}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedPurpose === preset
                        ? 'bg-cyan-500 text-gray-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700/60'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom Notes */}
              <textarea
                rows={2}
                placeholder="Add specific details (e.g. Client contact name, agenda, quotation discussion)..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500 resize-none"
                disabled={loading || !!activeAttendance}
              />
            </div>
            
            {/* Step 4: Big Start Route Button */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={handleStartRoute}
                disabled={loading || !!activeAttendance || !fromLocation.trim() || !toLocation.trim()}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-gray-950 font-extrabold px-10 py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-base"
              >
                <FiNavigation className="text-gray-950" size={18} />
                {loading ? 'Starting Live Tracking...' : activeAttendance ? 'Active Route in Progress' : '🚀 Start Field Route'}
              </button>
            </div>
          </div>

          {/* Trip History Table */}
          <div className="bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FiClock className="text-cyan-400" /> My Recent Field Visits
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead>
                  <tr className="bg-gray-950/60 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">From</th>
                    <th className="px-4 py-3 text-left">Destination</th>
                    <th className="px-4 py-3 text-left">Purpose / Notes</th>
                    <th className="px-4 py-3 text-left">Check-In</th>
                    <th className="px-4 py-3 text-left">Check-Out</th>
                    <th className="px-4 py-3 text-left">GPS Map</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-sm">
                  {attendanceHistory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-200">{item.from_location || '-'}</td>
                      <td className="px-4 py-3 font-bold text-cyan-400">{item.to_location || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={item.notes || ''}>
                        {item.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {item.check_in_at ? new Date(item.check_in_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {item.check_out_at ? new Date(item.check_out_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {item.check_in_latitude && item.check_in_longitude ? (
                          <a 
                            href={`https://maps.google.com/?q=${item.check_in_latitude},${item.check_in_longitude}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-mono text-xs hover:underline"
                          >
                            <FiMapPin size={12} /> {Number(item.check_in_latitude || 0).toFixed(4)}, {Number(item.check_in_longitude || 0).toFixed(4)}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'Checked In' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                          {item.status || 'Checked Out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendanceHistory.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500 text-sm">
                        No field routes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
