const fs = require('fs');
const file = 'd:/devicedesk/app/portal/leader/team/page.js';
let code = fs.readFileSync(file, 'utf8');

if(!code.includes('activeTasksList: mTasks')) {
  code = code.replace(/tasks: mTasks.length,/g, "tasks: mTasks.length,\n            activeTasksList: mTasks,");
}

if(!code.includes('member.activeTasksList.map')) {
  code = code.replace(/<div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-100">/g, `{member.activeTasksList && member.activeTasksList.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Tasks</h5>
                    <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2">
                      {member.activeTasksList.map(task => (
                        <div key={task.id} className="bg-blue-50 border border-blue-100 p-2.5 rounded-md flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-900 truncate flex-1" title={task.title}>{task.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-800 ml-2 whitespace-nowrap">{task.status || 'In Progress'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-100">`);
}

fs.writeFileSync(file, code);
console.log('Fixed');
