'use client';
import { useState, useEffect } from 'react';

export default function TeamMemberDashboard() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // In a real app, this would come from an auth context/token
  const myEmployeeId = 'emp_123'; // Mock

  useEffect(() => {
    fetchTasks();
    fetchSubmissions();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        // Filter tasks assigned to me
        setTasks(data.data.filter(t => t.assignedTo === myEmployeeId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // In a real app, we'd filter submissions by employee
      const res = await fetch('/api/work-submissions');
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data.filter(s => s.submitted_by === myEmployeeId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/work-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: selectedTask.id, 
          project_id: selectedTask.project_id || 'proj_unknown',
          submitted_by: myEmployeeId,
          description,
          file_url: fileUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setDescription('');
        setFileUrl('');
        setSelectedTask(null);
        fetchSubmissions();
      } else {
        alert(data.error || 'Failed to submit work');
      }
    } catch (err) {
      alert('Error submitting work');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Team Member Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">My Assigned Tasks</h2>
          <div className="bg-white shadow rounded-lg p-4 space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="border p-4 rounded bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{task.title}</h3>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
                <button 
                  onClick={() => setSelectedTask(task)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Submit Work
                </button>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-gray-500">No tasks assigned to you.</p>}
          </div>

          {selectedTask && (
            <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-lg font-bold mb-4">Submit Work for: {selectedTask.title}</h2>
              <form onSubmit={handleSubmitWork}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Description / Notes</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">File URL (e.g. Design Link, Doc)</label>
                  <input 
                    type="url" 
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setSelectedTask(null)}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit as Draft'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">My Submissions (History)</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.task_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No submissions yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
