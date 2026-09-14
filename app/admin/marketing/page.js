'use client';
import { useState, useEffect } from 'react';
import Pagination from '../../components/Pagination';

export default function AdminMarketingOverview() {
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [campPage, setCampPage] = useState(1);
  const [campPageSize, setCampPageSize] = useState(5);

  const [leadPage, setLeadPage] = useState(1);
  const [leadPageSize, setLeadPageSize] = useState(5);

  const [attPage, setAttPage] = useState(1);
  const [attPageSize, setAttPageSize] = useState(10);

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

      if (campData.success) setCampaigns(campData.data || []);
      if (leadsData.success) setLeads(leadsData.data || []);
      if (attData.success) setAttendance(attData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const campTotalPages = Math.ceil(campaigns.length / campPageSize) || 1;
  const safeCampPage = Math.min(Math.max(1, campPage), campTotalPages);
  const paginatedCampaigns = campaigns.slice((safeCampPage - 1) * campPageSize, safeCampPage * campPageSize);

  const leadTotalPages = Math.ceil(leads.length / leadPageSize) || 1;
  const safeLeadPage = Math.min(Math.max(1, leadPage), leadTotalPages);
  const paginatedLeads = leads.slice((safeLeadPage - 1) * leadPageSize, safeLeadPage * leadPageSize);

  const attTotalPages = Math.ceil(attendance.length / attPageSize) || 1;
  const safeAttPage = Math.min(Math.max(1, attPage), attTotalPages);
  const paginatedAttendance = attendance.slice((safeAttPage - 1) * attPageSize, safeAttPage * attPageSize);

  if (loading) return <div className="p-8 text-white">Loading Marketing Data...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" style={{ color: "var(--text-primary, #f8fafc)" }}>
      <h1 className="text-3xl font-bold" style={{ color: "#fff" }}>Global Marketing Overview</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Campaigns */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#fff" }}>All Campaigns</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-400 uppercase pb-2">Name</th>
                  <th className="text-left text-xs text-gray-400 uppercase pb-2">Status</th>
                  <th className="text-left text-xs text-gray-400 uppercase pb-2">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedCampaigns.map(c => (
                  <tr key={c.id}>
                    <td className="py-2 text-sm font-medium">{c.name}</td>
                    <td className="py-2 text-sm text-green-400">{c.status}</td>
                    <td className="py-2 text-sm text-gray-300">${c.budget}</td>
                  </tr>
                ))}
                {paginatedCampaigns.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-sm text-gray-500">No campaigns found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safeCampPage}
            totalPages={campTotalPages}
            totalItems={campaigns.length}
            pageSize={campPageSize}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={setCampPage}
            onPageSizeChange={(s) => { setCampPageSize(s); setCampPage(1); }}
            itemName="campaigns"
          />
        </div>

        {/* Leads */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "1.5rem" }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#fff" }}>Recent Leads</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-400 uppercase pb-2">Name</th>
                  <th className="text-left text-xs text-gray-400 uppercase pb-2">Campaign</th>
                  <th className="text-left text-xs text-gray-400 uppercase pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedLeads.map(l => (
                  <tr key={l.id}>
                    <td className="py-2 text-sm font-medium">{l.name}</td>
                    <td className="py-2 text-sm text-gray-400">{l.campaign_name || '-'}</td>
                    <td className="py-2 text-sm text-cyan-400">{l.status}</td>
                  </tr>
                ))}
                {paginatedLeads.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-sm text-gray-500">No leads found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safeLeadPage}
            totalPages={leadTotalPages}
            totalItems={leads.length}
            pageSize={leadPageSize}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={setLeadPage}
            onPageSizeChange={(s) => { setLeadPageSize(s); setLeadPage(1); }}
            itemName="leads"
          />
        </div>

      </div>

      {/* Field Attendance & Locations */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "1.5rem" }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: "#fff" }}>Field Employee Check-ins</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Check-In Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location (Lat, Lng)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total KM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedAttendance.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-sm font-medium">{a.employee_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{new Date(a.check_in_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-cyan-400">
                    <a href={`https://maps.google.com/?q=${a.check_in_latitude},${a.check_in_longitude}`} target="_blank" rel="noreferrer" className="underline">
                      {a.check_in_latitude}, {a.check_in_longitude}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{a.status}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-200">{a.total_km || 0}</td>
                </tr>
              ))}
              {paginatedAttendance.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-3 text-center text-sm text-gray-500">No field activity logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safeAttPage}
          totalPages={attTotalPages}
          totalItems={attendance.length}
          pageSize={attPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={setAttPage}
          onPageSizeChange={(s) => { setAttPageSize(s); setAttPage(1); }}
          itemName="records"
        />
      </div>

    </div>
  );
}
