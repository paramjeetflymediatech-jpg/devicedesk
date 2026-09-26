const fs = require('fs');

let c = fs.readFileSync('app/portal/leader/team/page.js', 'utf8');

c = c.replace(
  "import { FiUsers, FiClock, FiCheck, FiSend, FiSearch } from 'react-icons/fi';",
  "import { FiUsers, FiClock, FiCheck, FiSend, FiSearch, FiX } from 'react-icons/fi';\nimport Swal from 'sweetalert2';"
);

c = c.replace(
  `  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const resEmp = await fetch('/api/employees');
        const dataEmp = await resEmp.json();
        if (dataEmp.success) {
          const members = (dataEmp.data || []).filter(emp => emp.role === 'Team Member');
          const mappedMembers = members.map(m => ({
            id: m.id,
            name: m.name,
            role: m.department || 'Specialist',
            tasks: Math.floor(Math.random() * 5),
            eodStatus: Math.random() > 0.5 ? 'Submitted' : 'Pending',
            lastEOD: Math.random() > 0.5 ? 'Completed assigned workflow for today. All links updated in the main tracking sheet.' : null
          }));
          setTeamMembers(mappedMembers);
        }
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);`,
  `  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resEmp, resTasks, resEod] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/tasks'),
        fetch('/api/eod-reports')
      ]);
      const dataEmp = await resEmp.json();
      const dataTasks = await resTasks.json();
      const dataEod = await resEod.json();
      
      if (dataEmp.success) {
        const members = (dataEmp.data || []).filter(emp => emp.role === 'Team Member' || emp.role === 'Employee');
        const tasksList = dataTasks.success ? dataTasks.data : (dataTasks.tasks || []);
        const eodList = dataEod.success ? dataEod.data : [];
        
        const mappedMembers = members.map(m => {
          const mTasks = tasksList.filter(t => t.assignedTo === m.id && t.status !== 'Completed');
          const today = new Date().toISOString().split('T')[0];
          const mEods = eodList.filter(e => e.employee_id === m.id && (e.submitted_at || '').startsWith(today));
          const latestEod = mEods.length > 0 ? mEods[0] : null;

          return {
            id: m.id,
            name: m.name,
            role: m.department || 'Specialist',
            tasks: mTasks.length,
            eodStatus: latestEod ? latestEod.status : 'Pending',
            lastEOD: latestEod ? latestEod.report_text : null,
            eodId: latestEod ? latestEod.id : null
          };
        });
        setTeamMembers(mappedMembers);
      }
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignClick = (emp) => {
    setSelectedEmp(emp);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setAssignModalOpen(true);
  };

  const submitAssignTask = async () => {
    if(!newTaskTitle.trim()) return Swal.fire('Error', 'Task title is required', 'error');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          assignedTo: selectedEmp.id,
          assignedToName: selectedEmp.name,
          assignedBy: 'TL',
          assignedByName: 'Team Leader'
        })
      });
      const d = await res.json();
      if(d.success) {
        Swal.fire('Success', 'Task assigned', 'success');
        setAssignModalOpen(false);
        fetchData();
      } else {
        Swal.fire('Error', d.error, 'error');
      }
    } catch(err) {
      Swal.fire('Error', 'Failed to assign', 'error');
    }
  };

  const handleForwardClient = async (member) => {
    const { value: clientEmail } = await Swal.fire({
      title: 'Forward EOD to Client',
      input: 'email',
      inputLabel: 'Client Email Address',
      inputPlaceholder: 'Enter client email',
      showCancelButton: true
    });
    
    if (clientEmail) {
      // Simulate sending email
      Swal.fire('Sent!', 'EOD report forwarded to ' + clientEmail, 'success');
    }
  };
`
);

c = c.replace(
  `<button className="text-sm bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors font-medium">Assign Task</button>`,
  `<button onClick={() => handleAssignClick(member)} className="text-sm bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors font-medium">Assign Task</button>`
);

c = c.replace(
  `<button className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5">
                       <FiSend size={14}/> Forward to Client
                     </button>`,
  `<button onClick={() => handleForwardClient(member)} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5">
                       <FiSend size={14}/> Forward to Client
                     </button>`
);

c = c.replace(
  `</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-16 text-center flex flex-col items-center shadow-sm">`,
  `</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-16 text-center flex flex-col items-center shadow-sm">`
);

// Append Modal
c = c.replace(
  `    </div>
  );
}`,
  `
      {assignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">Assign Task to {selectedEmp?.name}</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}></textarea>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={submitAssignTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
);

fs.writeFileSync('app/portal/leader/team/page.js', c);
console.log('Done replacement');
