'use client';
import { useState, useEffect } from 'react';

export default function TeamLeaderDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // In a real app, this would come from an auth context/token
  const myLeaderId = 'emp_leader_123'; // Mock

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      // Fetch all submissions (in a real app, filter by projects this leader manages)
      const res = await fetch('/api/work-submissions');
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedSub) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/work-submissions/${selectedSub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          new_status: newStatus,
          comment,
          changed_by: myLeaderId
        })
      });
      const data = await res.json();
      if (data.success) {
        setComment('');
        setSelectedSub(null);
        fetchSubmissions();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Team Leader Approval Dashboard</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((sub) => (
              <tr key={sub.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.task_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.submitted_by}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    sub.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                    sub.status === 'Changes Requested' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => setSelectedSub(sub)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No submissions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSub && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Review Submission: {selectedSub.id}</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600"><strong>Description:</strong> {selectedSub.description}</p>
            {selectedSub.file_url && (
              <p className="text-sm text-blue-600 mt-2">
                <a href={selectedSub.file_url} target="_blank" rel="noreferrer">View Attached File</a>
              </p>
            )}
          </div>
          
          <div className="mt-6 border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Review Comment (Required for changes)</label>
            <textarea 
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows="3"
              className="block w-full rounded-md border-gray-300 shadow-sm p-2 border mb-4"
              placeholder="Add your review notes here..."
            />
            
            <div className="flex space-x-3">
              <button 
                onClick={() => handleUpdateStatus('Changes Requested')}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                Request Changes
              </button>
              <button 
                onClick={() => handleUpdateStatus('Client Review')}
                disabled={loading}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                Forward to Client
              </button>
              <button 
                onClick={() => handleUpdateStatus('Approved')}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve Internally
              </button>
              <button 
                onClick={() => setSelectedSub(null)}
                className="ml-auto bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
