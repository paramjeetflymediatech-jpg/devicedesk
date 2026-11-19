'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  FiShield,
  FiSend,
  FiLock,
  FiEye,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiHelpCircle,
  FiUser,
  FiMessageSquare,
  FiInfo,
  FiRefreshCw
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function EmployeeGrievancePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('FORM'); // 'FORM' | 'HISTORY'

  // Employees for target dropdown
  const [employees, setEmployees] = useState([]);

  // Form State
  const [category, setCategory] = useState('NOISE_DISTURBANCE');
  const [severity, setSeverity] = useState('MEDIUM');
  const [targetId, setTargetId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // History State
  const [myGrievances, setMyGrievances] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchEmployees();
    if (user?.id) {
      fetchMyGrievances();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (data?.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (e) {
      console.error('Failed to load colleagues:', e);
    }
  };

  const fetchMyGrievances = async () => {
    if (!user?.id) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/grievances?employee_id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        setMyGrievances(data.grievances || []);
      }
    } catch (e) {
      console.error('Failed to load employee grievances:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const categories = [
    { value: 'NOISE_DISTURBANCE', label: 'Noise / Loud Speaking / Disruption', desc: 'e.g. Speaks too loudly on calls or disrupts nearby team focus' },
    { value: 'INTERPERSONAL_CONFLICT', label: 'Interpersonal Conflict / Friction', desc: 'Disagreements or tension between team members' },
    { value: 'WORKPLACE_CONDUCT', label: 'Unprofessional Conduct / Etiquette', desc: 'Behavior non-compliant with office decorum' },
    { value: 'COMMUNICATION', label: 'Communication Breakdown', desc: 'Unresponsive or uncooperative collaboration' },
    { value: 'WORK_ALLOCATION', label: 'Work Allocation / Deadlines', desc: 'Uneven workload distribution or unfulfilled team commitments' },
    { value: 'FACILITIES_DESK', label: 'Workstation / Seating Concern', desc: 'Physical desk location, AC temperature, or chair ergonomics' },
    { value: 'OTHER', label: 'Other Workplace Grievance', desc: 'Any other matter requiring HR attention' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      Swal.fire('Required Fields', 'Please enter both a subject and incident details.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_id: user?.id,
          reported_against_id: targetId || null,
          category,
          severity,
          subject: subject.trim(),
          description: description.trim(),
          is_anonymous: isAnonymous ? 1 : 0
        })
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Grievance Submitted Confidentially',
          text: 'Your report has been forwarded directly to the HR team. We take all workplace concerns seriously.',
          confirmButtonColor: '#e11d48'
        });

        // Reset form
        setSubject('');
        setDescription('');
        setTargetId('');
        setIsAnonymous(false);
        setCategory('NOISE_DISTURBANCE');
        setSeverity('MEDIUM');

        // Refresh and switch to history
        fetchMyGrievances();
        setActiveTab('HISTORY');
      } else {
        Swal.fire('Submission Error', data.error || 'Failed to submit grievance', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'SUBMITTED':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
      case 'UNDER_REVIEW':
        return 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30';
      case 'ACTION_TAKEN':
        return 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
      case 'DISMISSED':
        return 'bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30';
    }
  };

  if (!mounted || !user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-inner">
            <FiShield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Workplace Grievance & Well-being
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confidentially raise workplace conduct, noise disruption, interpersonal friction, or seating concerns.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('FORM')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'FORM'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            File a Concern
          </button>
          <button
            onClick={() => {
              setActiveTab('HISTORY');
              fetchMyGrievances();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'HISTORY'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>My Grievances</span>
            {myGrievances.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
                {myGrievances.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Confidentiality Notice */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 dark:from-rose-950/40 via-white dark:via-slate-900/60 to-white dark:to-slate-900/60 border border-rose-200 dark:border-rose-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
          <FiLock className="w-4 h-4" />
          <span>Confidentiality & Non-Retaliation Policy</span>
        </div>
        <p className="leading-relaxed text-slate-600 dark:text-slate-300">
          Flymedia Technology is committed to maintaining a respectful, productive, and inclusive workspace. All submissions go straight to HR administration. You may also submit anonymously if you prefer complete privacy. Retaliation of any form is strictly prohibited.
        </p>
      </div>

      {/* Content Tabs */}
      {activeTab === 'FORM' ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. What is the nature of your concern? *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((c) => (
                  <label
                    key={c.value}
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                      category === c.value
                        ? 'bg-rose-50/80 dark:bg-rose-500/10 border-rose-500 text-rose-950 dark:text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{c.label}</span>
                      <input
                        type="radio"
                        name="grievanceCategory"
                        value={c.value}
                        checked={category === c.value}
                        onChange={(e) => setCategory(e.target.value)}
                        className="accent-rose-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Severity & Target Colleague */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  2. Impact / Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="LOW">Low — Minor annoyance / infrequent</option>
                  <option value="MEDIUM">Medium — Persistent disruption affecting work</option>
                  <option value="HIGH">High — Severe impact on focus, morale, or teamwork</option>
                  <option value="CRITICAL">Critical — Immediate HR intervention / harassment / misconduct</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  3. Related Colleague (Optional)
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">General Workplace / Not Specific Colleague</option>
                  {employees
                    .filter((e) => e.id !== user?.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || 'Staff'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                4. Brief Summary / Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Excessive speakerphone volume during work hours"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                5. Detailed Description & Incident Context *
              </label>
              <textarea
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe what happened, how often it occurs, and how it impacts your ability to work. Specific dates or approximate times are helpful."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
              <input
                type="checkbox"
                id="isAnonCheck"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 accent-rose-500 rounded mt-0.5 cursor-pointer"
              />
              <label htmlFor="isAnonCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer space-y-0.5">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Submit Anonymously (Hide your name)
                </span>
                <span className="text-slate-500 dark:text-slate-400 block">
                  When checked, your identity is not displayed on the grievance card and remains strictly confidential.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                <FiSend className="w-4 h-4" />
                <span>{submitting ? 'Submitting to HR...' : 'Submit Grievance to HR'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Your Grievance Filings</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">({myGrievances.length})</span>
            </h2>
            <button
              onClick={fetchMyGrievances}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-300 dark:border-slate-700 shadow-sm transition"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-slate-400">Loading your grievances...</div>
          ) : myGrievances.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <FiCheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Grievances Filed</div>
              <p className="text-xs text-slate-500">
                You haven&apos;t filed any workplace concerns. You can use the &quot;File a Concern&quot; tab whenever needed.
              </p>
            </div>
          ) : (
            myGrievances.map((g) => (
              <div
                key={g.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      #{g.id}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(g.status)}`}>
                      {g.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
                      {g.category.replace(/_/g, ' ')}
                    </span>
                    {g.is_anonymous ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <FiLock className="w-3 h-3" /> Anonymous
                      </span>
                    ) : null}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FiClock className="w-3.5 h-3.5" />
                    <span>{new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{g.subject}</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                    {g.description}
                  </p>
                </div>

                {g.reported_against_name && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                    Regarding: <strong className="text-slate-800 dark:text-slate-300">{g.reported_against_name}</strong>
                  </div>
                )}

                {/* HR Response Notes */}
                {g.hr_notes && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs space-y-1">
                    <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <FiShield className="w-3.5 h-3.5" /> HR Resolution / Action Update:
                    </div>
                    <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{g.hr_notes}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
