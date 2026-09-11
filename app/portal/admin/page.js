'use client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/reports/analytics'),
        fetch('/api/reports/audit-logs')
      ]);
      
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      if (statsData.success) setStats(statsData.data);
      if (logsData.success) setAuditLogs(logsData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Portal Overview</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Projects</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.projects || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Departments</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.departments || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Tasks</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.tasks || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Total Leads</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.leads || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Active Campaigns</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.active_campaigns || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Submissions</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.work_submissions || 0}</p>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Recent Workflow Activity (Audit Logs)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changed By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.submission_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.employee_name || log.changed_by}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-gray-500 line-through mr-2">{log.old_status || 'None'}</span>
                    <span className="font-medium text-blue-600">→ {log.new_status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.comment || '-'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No recent activity</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
