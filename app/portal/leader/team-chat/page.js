'use client';
import { useState, useEffect } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import ProjectChat from '../../../components/ProjectChat';

export default function TeamChatPage() {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  const currentUserId = "emp_tl_1";
  const currentUserName = "Team Leader";

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const resDept = await fetch('/api/departments');
        const dataDept = await resDept.json();
        if (dataDept.success && dataDept.data.length > 0) {
          setDepartments(dataDept.data);
          setSelectedDeptId(dataDept.data[0].id);
        }
      } catch (err) {}
    }
    fetchDepartments();
  }, []);

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="flex overflow-x-auto pb-4 mb-2 gap-2 scrollbar-hide border-b border-slate-200">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setSelectedDeptId(dept.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-md font-medium transition-colors text-sm ${
              selectedDeptId === dept.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[600px] flex flex-col pt-4">
        {selectedDeptId ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 overflow-hidden">
            <ProjectChat 
              key={`team_${selectedDeptId}`} 
              projectId="proj_mock_1" 
              departmentId={`${selectedDeptId}_internal`} 
              currentUserId={currentUserId} 
              currentUserName={currentUserName} 
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center text-slate-500 h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center mb-4 text-xl"><FiMessageSquare /></div>
            Loading departments...
          </div>
        )}
      </div>
    </div>
  );
}
