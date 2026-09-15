'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import { FiMapPin, FiLogOut } from 'react-icons/fi';

export default function MarketingDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const myEmployeeId = user?.id || '';

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLog, setLocationLog] = useState(null);

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activeAttendance, setActiveAttendance] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // If not authenticated, redirect to login
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
    }
  }, [mounted, myEmployeeId]);

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
          setLocationLog(`Active Visit: ${active.from_location || 'Start'} ➔ ${active.to_location || 'Destination'} (Lat: ${lat}, Lng: ${lng})`);
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

  const handleCheckIn = () => {
    if (!myEmployeeId) {
      alert('You must be logged in to check in.');
      router.push('/login');
      return;
    }

    if (!fromLocation.trim() || !toLocation.trim()) {
      alert('Please specify both "Where From" (Starting Location) and "Where To" (Destination).');
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
            action: 'check_in',
            from_location: fromLocation.trim(),
            to_location: toLocation.trim(),
            notes: visitNotes.trim(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Check-in and Field Visit logged successfully!');
          setLocationLog(`Checked In: ${fromLocation} ➔ ${toLocation} at (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
          setFromLocation('');
          setToLocation('');
          setVisitNotes('');
          fetchMyAttendance();
        } else {
          alert(data.error || 'Failed to check in');
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

  const handleCheckOut = () => {
    if (!activeAttendance) {
      alert('No active check-in found to check out from.');
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
            longitude: position.coords.longitude
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Check-out successful! Field visit completed.');
          setLocationLog(null);
          setActiveAttendance(null);
          fetchMyAttendance();
        } else {
          alert(data.error || 'Failed to check out');
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
      <div className="flex h-screen bg-gray-50 text-gray-900 font-sans items-center justify-center">
        <p className="text-sm text-gray-500 font-medium">Loading Marketing Portal...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Sidebar / Navigation */}
      <div className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-6 border-b flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl uppercase">
            {user?.name ? user.name.charAt(0) : 'M'}
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm text-gray-800 truncate">{user?.name || 'Marketing'}</h2>
            <p className="text-xs text-gray-500 truncate">{user?.department || user?.role || 'Marketing Executive'}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col space-y-2">
          <div className="flex items-center space-x-3 p-3 rounded-lg font-semibold bg-blue-50 text-blue-700">
            <FiMapPin />
            <span>Field Attendance & GPS</span>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b px-8 py-5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
          <h1 className="text-2xl font-bold text-gray-800">
            Field Tracking & Attendance
          </h1>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <FiLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="p-8 max-w-5xl mx-auto space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <FiMapPin size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Field Attendance & Trip Logger</h2>
                <p className="text-gray-500 text-sm">Enter where you are starting from, where you are going, and log your live GPS</p>
              </div>
            </div>

            {/* Location / Trip inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Where From (Starting Location) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office / Home / Sector 17"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={loading || !!activeAttendance}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Where To / Destination (Going To) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Office Sector 62 / Market Visit"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={loading || !!activeAttendance}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Purpose / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Meeting with client regarding product demo"
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading || !!activeAttendance}
              />
            </div>
            
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <button 
                onClick={handleCheckIn}
                disabled={loading || !!activeAttendance}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                <FiMapPin />
                {loading ? 'Processing GPS...' : 'Check In (Start Trip)'}
              </button>
              <button 
                onClick={handleCheckOut}
                disabled={loading || !activeAttendance}
                className="bg-gray-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-900 transition-all disabled:opacity-50 shadow-md"
              >
                Check Out (Complete Trip)
              </button>
            </div>

            {locationLog && (
              <div className="p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="font-medium text-sm">{locationLog}</span>
              </div>
            )}
          </div>

          {/* Trip & Attendance History */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">My Recent Field Visits</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Going To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Check-In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Check-Out</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">GPS Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {attendanceHistory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{item.from_location || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600">{item.to_location || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.check_in_at ? new Date(item.check_in_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.check_out_at ? new Date(item.check_out_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        {item.check_in_latitude && item.check_in_longitude ? (
                          <a 
                            href={`https://maps.google.com/?q=${item.check_in_latitude},${item.check_in_longitude}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-cyan-600 hover:underline inline-flex items-center gap-1 font-mono text-xs"
                          >
                            <FiMapPin size={12} /> {Number(item.check_in_latitude || 0).toFixed(4)}, {Number(item.check_in_longitude || 0).toFixed(4)}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {item.status || 'Checked Out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendanceHistory.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-6 text-center text-gray-400">No field visits logged yet.</td>
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
