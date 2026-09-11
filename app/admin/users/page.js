'use client';
import { useState, useEffect } from 'react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', department: '', status: '' });

  const roles = ['admin', 'client', 'marketing', 'dept_team_leader', 'dept_team_member'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.id);
    setEditForm({ role: user.role, department: user.department, status: user.status });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const res = await fetch(`/api/employees/${editingUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchUsers(); // Refresh data
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Error updating user');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User & Role Management</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                
                {editingUser === user.id ? (
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm">
                    <form className="flex space-x-2" id={`edit-form-${user.id}`} onSubmit={handleUpdate}>
                      <select 
                        value={editForm.role} 
                        onChange={e => setEditForm({...editForm, role: e.target.value})}
                        className="border rounded p-1 text-sm"
                      >
                        <option value="">Select Role</option>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input 
                        type="text" 
                        value={editForm.department || ''} 
                        onChange={e => setEditForm({...editForm, department: e.target.value})}
                        className="border rounded p-1 text-sm w-32"
                        placeholder="Department"
                      />
                      <select 
                        value={editForm.status} 
                        onChange={e => setEditForm({...editForm, status: e.target.value})}
                        className="border rounded p-1 text-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.department || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status}
                      </span>
                    </td>
                  </>
                )}

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingUser === user.id ? (
                    <div className="flex justify-end space-x-2">
                      <button type="submit" form={`edit-form-${user.id}`} className="text-green-600 hover:text-green-900">Save</button>
                      <button type="button" onClick={() => setEditingUser(null)} className="text-gray-600 hover:text-gray-900">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                  )}
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan="6" className="px-6 py-4 text-center">Loading...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
