'use client';
import { useState, useEffect } from 'react';
import { FiCheckSquare, FiSearch } from 'react-icons/fi';
import Pagination from '../../../components/Pagination';

export default function ClientRequestsPage() {
  const [clientRequests, setClientRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const resReq = await fetch('/api/client-services/requests');
        const dataReq = await resReq.json();
        if (dataReq.success) {
          const mappedReqs = (dataReq.data || []).map(req => ({
            id: req.id,
            client: req.clientId || 'Unknown Client',
            service: req.service_type,
            details: req.requirements,
            date: new Date(req.created_at).toLocaleDateString(),
            status: req.status || 'Pending Assignment'
          }));
          setClientRequests(mappedReqs);
        }
      } catch (err) {
        console.error("Failed to fetch requests:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredRequests = clientRequests.filter(req => {
    const q = search.toLowerCase();
    const c = String(req.client || "").toLowerCase();
    const s = String(req.service || "").toLowerCase();
    const d = String(req.details || "").toLowerCase();
    const st = String(req.status || "").toLowerCase();
    return c.includes(q) || s.includes(q) || d.includes(q) || st.includes(q);
  });

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRequests = filteredRequests.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-lg flex-wrap gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Incoming Bookings</h3>
          <p className="text-sm text-slate-500 mt-1">Review and assign new client service requests to your team.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 text-slate-800"
            />
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            {filteredRequests.length} Total Requests
          </div>
        </div>
      </div>
      
      {paginatedRequests.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Requirements</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.client}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{req.service}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-sm truncate" title={req.details}>{req.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                      req.status==='Pending Assignment' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>{req.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">Assign</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-16 text-center text-slate-500 flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center mb-4 border border-slate-100"><FiCheckSquare size={20} /></div>
          <p className="font-medium text-slate-900">{search ? "No matching requests" : "No pending requests"}</p>
          <p className="text-sm mt-1">{search ? "Try adjusting your search terms." : "There are no client requests in the system currently."}</p>
        </div>
      )}

      {filteredRequests.length > 0 && (
        <div className="p-4 border-t border-slate-200">
          <Pagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={filteredRequests.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemName="requests"
          />
        </div>
      )}
    </div>
  );
}
