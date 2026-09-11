'use client';
import { useState, useEffect } from 'react';

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/work-submissions');
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideStatus = async (id, newStatus) => {
    if (!window.confirm(`Are you sure you want to force status to ${newStatus}?`)) return;
    
    try {
      const res = await fetch(`/api/work-submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          new_status: newStatus,
          comment: 'Admin Status Override',
          changed_by: 'admin_sys'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchSubmissions();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error overriding status');
    }
  };

  if (loading) return <div className="p-8">Loading Submissions...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Global Work Submissions</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions / Override</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.project_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.task_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.submitted_by}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sub.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                      sub.status === 'Published' ? 'bg-indigo-100 text-indigo-800' :
                      sub.status === 'Changes Requested' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {sub.file_url && (
                      <a href={sub.file_url} target="_blank" className="text-blue-600 hover:underline mr-4">View File</a>
                    )}
                    
                    {/* Admin Override Controls */}
                    <select 
                      className="border rounded p-1 text-xs"
                      onChange={(e) => {
                        if(e.target.value) handleOverrideStatus(sub.id, e.target.value);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Force Status...</option>
                      <option value="Draft">Draft</option>
                      <option value="Changes Requested">Changes Requested</option>
                      <option value="Approved">Approved</option>
                      <option value="Published">Published</option>
                    </select>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No submissions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
