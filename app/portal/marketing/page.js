'use client';
import { useState, useEffect } from 'react';
import { FiMapPin, FiUsers, FiTarget } from 'react-icons/fi';

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(false);
  const [locationLog, setLocationLog] = useState(null);

  // Mock employee context
  const myEmployeeId = 'emp_demo_mkt_1789113315864';

  const handleCheckIn = () => {
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
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Checked in successfully!');
          setLocationLog(`Checked in at ${position.coords.latitude}, ${position.coords.longitude}`);
        } else {
          alert(data.error || 'Failed to check in');
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

  const renderAttendanceTab = () => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <FiMapPin size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Field Attendance</h2>
          <p className="text-gray-500 text-sm">Log your GPS coordinates for field visits</p>
        </div>
      </div>
      
      <div className="flex space-x-4 mb-6">
        <button 
          onClick={handleCheckIn}
          disabled={loading}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-600/20"
        >
          {loading ? 'Processing...' : 'Check In (Log GPS)'}
        </button>
        <button 
          disabled={loading}
          className="bg-gray-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-900 transition-all disabled:opacity-50 shadow-md"
        >
          Check Out
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
  );

  const renderLeadsTab = () => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
          <FiUsers size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Manage Leads</h2>
          <p className="text-gray-500 text-sm">Add and update your sales pipeline</p>
        </div>
      </div>
      <div className="p-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
        Lead Management Module Active
      </div>
    </div>
  );

  const renderCampaignsTab = () => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
          <FiTarget size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Marketing Campaigns</h2>
          <p className="text-gray-500 text-sm">Track active campaigns and ROI</p>
        </div>
      </div>
      <div className="p-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
        Campaigns Module Active
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Sidebar / Navigation */}
      <div className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-6 border-b flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            M
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-800">Marketing</h2>
            <p className="text-xs text-gray-500">Demo Executive</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col space-y-2">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'attendance' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <FiMapPin />
            <span>Attendance & GPS</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('leads')}
            className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'leads' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <FiUsers />
            <span>My Leads</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${activeTab === 'campaigns' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <FiTarget />
            <span>Campaigns</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b px-8 py-5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
          <h1 className="text-2xl font-bold text-gray-800">
            {activeTab === 'attendance' ? 'Field Tracking' : activeTab === 'leads' ? 'Lead Management' : 'Campaign Overview'}
          </h1>
          <button 
            onClick={() => window.location.href = '/login'}
            className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </header>

        <main className="p-8 max-w-5xl mx-auto">
          {activeTab === 'attendance' && renderAttendanceTab()}
          {activeTab === 'leads' && renderLeadsTab()}
          {activeTab === 'campaigns' && renderCampaignsTab()}
        </main>
      </div>
    </div>
  );
}
