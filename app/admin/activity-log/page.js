'use client';
import { useState } from 'react';
import { FiClock, FiMessageSquare, FiFileText, FiCheckSquare, FiFilter } from 'react-icons/fi';

export default function AdminActivityLog() {
  const [filter, setFilter] = useState('ALL');

  // MOCK MASTER LOG
  const logs = [
    { id: 1, type: 'CLIENT_REQUEST', user: 'Client: Acme Corp', action: 'Booked new SEO Service', time: '10:00 AM, Sep 12', details: 'Requirements: Need monthly keyword ranking.' },
    { id: 2, type: 'TL_ASSIGNMENT', user: 'TL: Marketing', action: 'Assigned TS-101 to Alice Smith', time: '10:15 AM, Sep 12', details: 'Task: SEO Keyword Analysis.' },
    { id: 3, type: 'MEMBER_CHAT', user: 'Member: Alice Smith', action: 'Sent message to TL', time: '02:15 PM, Sep 12', details: '"Hey boss, the backlink audit is done."' },
    { id: 4, type: 'MEMBER_EOD', user: 'Member: Alice Smith', action: 'Submitted Daily EOD', time: '04:30 PM, Sep 12', details: '"Completed keyword analysis for Acme Corp."' },
    { id: 5, type: 'TL_EOD_REVIEW', user: 'TL: Marketing', action: 'Reviewed EOD from Alice Smith', time: '04:45 PM, Sep 12', details: 'Status: Approved internally.' },
    { id: 6, type: 'CLIENT_CHAT', user: 'TL: Marketing', action: 'Sent EOD update to Acme Corp', time: '05:00 PM, Sep 12', details: '"Hi Acme! The backlink audit is complete."' }
  ];

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.type.includes(filter));

  const getIcon = (type) => {
    if (type.includes('CLIENT')) return <FiCheckSquare className="text-blue-500" />;
    if (type.includes('CHAT')) return <FiMessageSquare className="text-purple-500" />;
    if (type.includes('EOD')) return <FiFileText className="text-emerald-500" />;
    return <FiClock className="text-slate-500" />;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Global Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1">Full oversight of all Client, TL, and Member interactions.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <FiFilter className="text-slate-400" />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
            <option value="ALL">All Activities</option>
            <option value="CLIENT">Client Actions</option>
            <option value="TL">TL Actions</option>
            <option value="MEMBER">Member Actions</option>
            <option value="CHAT">All Chats</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
            {filteredLogs.map(log => (
              <div key={log.id} className="relative pl-8">
                <div className="absolute -left-[17px] top-1 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center">
                  {getIcon(log.type)}
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-slate-800">{log.user}</span>
                    <span className="text-slate-500 text-sm">{log.action}</span>
                    <span className="text-xs font-semibold text-slate-400 ml-auto bg-slate-50 px-2 py-1 rounded-md">{log.time}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mt-2">
                    <p className="text-sm text-slate-700 font-medium italic">{log.details}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
