'use client';
import { useState, useEffect } from 'react';

export default function ProjectDetailsPage({ params }) {
  const { id: projectId } = params;
  
  const [project, setProject] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedLeader, setSelectedLeader] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectData();
    fetchDropdownData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      // Fetch project details (assuming GET /api/projects returns all, filter locally for simplicity in admin view)
      const projRes = await fetch('/api/projects');
      const projData = await projRes.json();
      if (projData.success) {
        setProject(projData.data.find(p => p.id === projectId));
      }

      // Fetch assigned departments
      const deptRes = await fetch(`/api/projects/${projectId}/departments`);
      const deptData = await deptRes.json();
      if (deptData.success) {
        setDepartments(deptData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/employees')
      ]);
      const deptData = await deptRes.json();
      const empData = await empRes.json();
      
      if (deptData.success) setAllDepartments(deptData.data);
      if (empData.success) setEmployees(empData.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    if (!selectedDept) return alert('Select a department');

    try {
      const res = await fetch(`/api/projects/${projectId}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: selectedDept, team_leader_id: selectedLeader })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDept('');
        setSelectedLeader('');
        fetchProjectData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error assigning department');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Project: {project.name}</h1>
      <p className="text-gray-600 mb-8">Client ID: {project.client_id} | Status: {project.status}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Assign Department Form */}
        <div className="bg-white p-6 rounded shadow border col-span-1">
          <h2 className="text-xl font-semibold mb-4">Assign Department</h2>
          <form onSubmit={handleAssignDepartment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <select 
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                required
                className="mt-1 block w-full border rounded p-2"
              >
                <option value="">Select...</option>
                {allDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Team Leader (Optional)</label>
              <select 
                value={selectedLeader}
                onChange={e => setSelectedLeader(e.target.value)}
                className="mt-1 block w-full border rounded p-2"
              >
                <option value="">None</option>
                {employees.filter(e => e.role === 'dept_team_leader').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
              Assign to Project
            </button>
          </form>
        </div>

        {/* Assigned Departments List */}
        <div className="bg-white shadow rounded p-6 col-span-2">
          <h2 className="text-xl font-semibold mb-4">Assigned Departments</h2>
          {departments.length === 0 ? (
            <p className="text-gray-500">No departments assigned yet.</p>
          ) : (
            <div className="space-y-4">
              {departments.map(dept => (
                <div key={dept.id} className="border p-4 rounded bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{dept.department_name}</h3>
                    <p className="text-sm text-gray-600">
                      Team Leader: {dept.team_leader_name || 'Not assigned'}
                    </p>
                  </div>
                  <button className="text-blue-600 text-sm font-medium underline">Manage Members</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
