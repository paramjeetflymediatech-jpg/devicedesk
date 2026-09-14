'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiCalendar, FiLink, FiArrowLeft, FiCheck, FiX, FiSearch } from "react-icons/fi";
import { getEmployees } from "../../store.js";
import { getEmployeeSlug } from "../../utils/slugUtils.js";
import Pagination from "../../components/Pagination.js";

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setEmployees(getEmployees());
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leave/list?status=ALL");
      const data = await res.json();
      if (data.success) {
        setLeaves(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    const emp = employees.find((e) => e.id === l.employeeId || e.name === l.employeeName);
    const empName = (l.employeeName || (emp ? emp.name : "")).toLowerCase();
    const leaveType = (l.leaveType || "").toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = empName.includes(q) || leaveType.includes(q);
    const matchesStatus = statusFilter === "ALL" || (l.status || "Pending").toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLeaves.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeaves = filteredLeaves.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f172a)", color: "var(--text-primary, #f8fafc)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan, #06b6d4)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "8px" }}>
              <FiArrowLeft /> Back to Admin Panel
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <FiCalendar style={{ color: "#ec4899" }} /> Leave Management & Approvals
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", marginTop: "4px" }}>
              Review staff leave requests and view leave history by user slug.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          marginBottom: "1.5rem", 
          background: "rgba(255, 255, 255, 0.02)", 
          padding: "1rem", 
          borderRadius: "12px", 
          border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <div style={{ position: "relative", flex: "1", minWidth: "260px" }}>
            <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }} />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search by employee name or leave type..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: "36px", width: "100%", height: "40px" }}
            />
          </div>
          <select 
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ minWidth: "140px", height: "40px" }}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="table-wrapper" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border, rgba(255,255,255,0.1))", borderRadius: "16px", overflow: "hidden" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={{ padding: "14px 16px" }}>Employee</th>
                <th style={{ padding: "14px 16px" }}>User Slug</th>
                <th style={{ padding: "14px 16px" }}>Leave Type</th>
                <th style={{ padding: "14px 16px" }}>Duration</th>
                <th style={{ padding: "14px 16px" }}>Days</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>History</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeaves.map((l) => {
                const emp = employees.find((e) => e.id === l.employeeId || e.name === l.employeeName);
                const empSlug = emp ? getEmployeeSlug(emp) : l.employeeId;

                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      <Link href={`/admin/leaves/${empSlug}`} style={{ color: "var(--text-primary, #f8fafc)", textDecoration: "none" }}>
                        {l.employeeName || l.employeeId}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/admin/leaves/${empSlug}`}
                        className="timer-badge"
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--accent-purple, #a855f7)",
                          borderColor: "rgba(168, 85, 247, 0.4)",
                          background: "rgba(168, 85, 247, 0.08)",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <FiLink style={{ fontSize: "0.65rem" }} /> @{empSlug}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>{l.leaveType || "Casual Leave"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>{l.fromDate} &rarr; {l.toDate}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>{l.totalDays || 1} d</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`status-tag ${l.status === "Approved" ? "resolved" : l.status === "Rejected" ? "open" : "inprogress"}`}>
                        {l.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link href={`/admin/leaves/${empSlug}`} className="btn-action start" style={{ padding: "4px 10px", fontSize: "0.75rem", textDecoration: "none" }}>
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredLeaves.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #64748b)" }}>
                    {loading ? "Loading leave requests..." : "No leave requests found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredLeaves.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          itemName="leave requests"
        />
      </div>
    </div>
  );
}
