'use client';
import { useState, useEffect } from 'react';
import Pagination from '../../components/Pagination';
import Swal from 'sweetalert2';
import { FiShield, FiUserPlus, FiTrash2, FiMapPin } from 'react-icons/fi';

export default function AdminMarketingOverview() {
  const [attendance, setAttendance] = useState([]);
  const [authorizations, setAuthorizations] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [attPage, setAttPage] = useState(1);
  const [attPageSize, setAttPageSize] = useState(10);
  const [activeTrailModal, setActiveTrailModal] = useState(null);
  const [trailLogs, setTrailLogs] = useState([]);
  const [trailLoading, setTrailLoading] = useState(false);

  useEffect(() => {
    fetchMarketingData();
  }, []);

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

  const fetchMarketingData = async () => {
    try {
      setLoading(true);
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
        Swal.fire({ icon: 'success', title: 'Authorized', text: `${emp?.name || 'Employee'} has been granted Marketing access.`, timer: 1500, showConfirmButton: false });
        setSelectedEmployeeId('');
        fetchMarketingData();
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
      confirmButtonText: 'Yes, Revoke'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/marketing/authorizations?employeeId=${encodeURIComponent(employeeId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Revoked', text: 'Authorization revoked.', timer: 1500, showConfirmButton: false });
        fetchMarketingData();
      } else {
        Swal.fire({ icon: 'error', title: 'Failed', text: data.error || 'Failed to revoke authorization.' });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Server error revoking authorization.' });
    }
  };

  const attTotalPages = Math.ceil(attendance.length / attPageSize) || 1;
  const safeAttPage = Math.min(Math.max(1, attPage), attTotalPages);
  const paginatedAttendance = attendance.slice((safeAttPage - 1) * attPageSize, safeAttPage * attPageSize);

  if (loading) return <div className="p-8 text-white">Loading Marketing Data...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" style={{ color: "var(--text-primary, #f8fafc)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#fff" }}>Marketing Field & Attendance Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Live tracking of on-field marketing employee trips, destinations, and attendance.</p>
        </div>
      </div>

      {/* Field Attendance & Locations */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "1.5rem" }}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "#fff" }}>
          <FiMapPin className="text-cyan-400" /> Field Employee Trips & Check-ins
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Where From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Going To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Purpose / Notes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Check-In Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Check-Out Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">GPS Pin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Route Trail</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Distance (KM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedAttendance.map(a => {
                const emp = allEmployees.find(e => e.id === a.employee_id);
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      <div>{emp?.name || a.employee_id}</div>
                      <div className="text-xs text-gray-500 font-mono">{a.employee_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200">{a.from_location || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-cyan-400">{a.to_location || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate" title={a.notes || ''}>{a.notes || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{a.check_in_at ? new Date(a.check_in_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{a.check_out_at ? new Date(a.check_out_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-cyan-400">
                      {a.current_latitude && a.current_longitude ? (
                        <a href={`https://maps.google.com/?q=${a.current_latitude},${a.current_longitude}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs">
                          {Number(a.current_latitude).toFixed(4)}, {Number(a.current_longitude).toFixed(4)}
                        </a>
                      ) : a.check_in_latitude && a.check_in_longitude ? (
                        <a href={`https://maps.google.com/?q=${a.check_in_latitude},${a.check_in_longitude}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs">
                          {Number(a.check_in_latitude).toFixed(4)}, {Number(a.check_in_longitude).toFixed(4)}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => openTrailModal(a)}
                        className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <FiMapPin size={12} /> Trail Logs
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.status === 'Checked In' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-300'}`}>
                        {a.status || 'Checked Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-200">
                      {a.total_km > 0 ? `${a.total_km} KM` : a.estimated_km > 0 ? `${a.estimated_km} KM (Est)` : '0 KM'}
                    </td>
                  </tr>
                );
              })}
              {paginatedAttendance.length === 0 && (
                <tr>
                  <td colSpan="10" className="px-4 py-4 text-center text-sm text-gray-500">No field activity logged.</td>
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

      {/* Marketing Access Control / Authorized Persons */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "1.5rem" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "#fff" }}>
              <FiShield className="text-cyan-400" /> Authorized Marketing Managers
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Marketing team members are completely isolated from other departments. Only Admins and explicitly authorized employees designated below can view, track, or chat with Marketing members.
            </p>
          </div>
        </div>

        {/* Grant Authorization Form */}
        <div className="flex flex-col sm:flex-row gap-3 items-center mb-6 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-300 mb-1">Select Employee to Authorize</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">-- Choose Employee --</option>
              {allEmployees
                .filter(e => e.role !== 'Admin' && e.role !== 'Superadmin' && (e.department || '').toLowerCase() !== 'marketing')
                .map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id}) - {emp.department || 'No Dept'} [{emp.role || 'Staff'}]
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleGrantAuthorization}
            className="w-full sm:w-auto mt-auto px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <FiUserPlus /> Grant Access
          </button>
        </div>

        {/* List of currently authorized employees */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase">Employee</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase">Employee ID</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase">Authorized By</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase">Granted On</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {authorizations.map(auth => (
                <tr key={auth.id || auth.employee_id || auth.employeeId}>
                  <td className="px-4 py-3 text-sm font-medium text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    {auth.employee_name || auth.employeeName || auth.employee_id || auth.employeeId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{auth.employee_id || auth.employeeId}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{auth.assigned_by || auth.assignedBy || 'Admin'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {auth.created_at || auth.createdAt ? new Date(auth.created_at || auth.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      type="button"
                      onClick={() => handleRevokeAuthorization(auth.employee_id || auth.employeeId, auth.employee_name || auth.employeeName)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Revoke Access"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {authorizations.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">
                    No custom authorized managers assigned. Only Admins and Marketing peers currently have access.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breadcrumb Trail Modal */}
      {activeTrailModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiMapPin className="text-cyan-400" /> Recorded GPS Route Trail
                </h3>
                <p className="text-xs text-gray-400">
                  {activeTrailModal.from_location || 'Start'} ➔ {activeTrailModal.to_location || 'Destination'} ({trailLogs.length} Coordinates)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTrailModal(null)}
                className="text-gray-400 hover:text-white text-lg px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {trailLoading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading GPS coordinates...</div>
              ) : trailLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">No intermediate breadcrumb coordinates captured for this trip.</div>
              ) : (
                trailLogs.map((log, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === trailLogs.length - 1;
                  return (
                    <div
                      key={log.id || idx}
                      className="p-3 bg-gray-800/60 border border-gray-700/60 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            isFirst
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : isLast
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {isFirst ? 'START' : isLast ? 'END' : `#${idx + 1}`}
                        </span>
                        <div>
                          <div className="font-mono text-gray-200">
                            {Number(log.latitude).toFixed(5)}°, {Number(log.longitude).toFixed(5)}°
                          </div>
                          <div className="text-gray-400 text-[11px]">
                            {log.recorded_at ? new Date(log.recorded_at).toLocaleTimeString() : '-'}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 rounded-md font-semibold text-xs transition-colors"
                      >
                        Open Map ↗
                      </a>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTrailModal(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg"
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
