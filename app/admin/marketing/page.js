'use client';
import { useState, useEffect } from 'react';

export default function AdminMarketingOverview() {
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    try {
      setLoading(true);
      const [campRes, leadsRes, attRes] = await Promise.all([
        fetch('/api/marketing/campaigns'),
        fetch('/api/marketing/leads'),
        fetch('/api/marketing/attendance')
      ]);

      const campData = await campRes.json();
      const leadsData = await leadsRes.json();
      const attData = await attRes.json();

      if (campData.success) setCampaigns(campData.data);
      if (leadsData.success) setLeads(leadsData.data);
      if (attData.success) setAttendance(attData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading Marketing Data...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Global Marketing Overview</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Campaigns */}
        <div className="bg-white shadow rounded p-6">
          <h2 className="text-xl font-bold mb-4">All Campaigns</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Name</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Status</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="py-2 text-sm font-medium">{c.name}</td>
                    <td className="py-2 text-sm text-green-600">{c.status}</td>
                    <td className="py-2 text-sm text-gray-600">${c.budget}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leads */}
        <div className="bg-white shadow rounded p-6">
          <h2 className="text-xl font-bold mb-4">Recent Leads</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Name</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Campaign</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.slice(0, 10).map(l => (
                  <tr key={l.id}>
                    <td className="py-2 text-sm font-medium">{l.name}</td>
                    <td className="py-2 text-sm text-gray-500">{l.campaign_name || '-'}</td>
                    <td className="py-2 text-sm text-blue-600">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Field Attendance & Locations */}
      <div className="bg-white shadow rounded p-6">
        <h2 className="text-xl font-bold mb-4">Field Employee Check-ins</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location (Lat, Lng)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total KM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendance.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-sm font-medium">{a.employee_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.check_in_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <a href={`https://maps.google.com/?q=${a.check_in_latitude},${a.check_in_longitude}`} target="_blank" className="text-blue-600 underline">
                      {a.check_in_latitude}, {a.check_in_longitude}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a.status}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-700">{a.total_km || 0}</td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-3 text-center text-sm text-gray-500">No field activity logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
