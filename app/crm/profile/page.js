'use client';

import React, { useState, useEffect } from 'react';
import { 
  FiUser, FiMail, FiPhone, FiLock, FiShield, FiBriefcase, 
  FiCheckCircle, FiClock, FiGlobe, FiEye, FiEyeOff, FiSave, FiAlertCircle 
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function CrmAgentProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit details state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/profile');
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data);
        setName(data.data.name || '');
        setPhone(data.data.phone || '');
        // Sync local storage if needed
        try {
          const stored = localStorage.getItem('crm_auth_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            localStorage.setItem('crm_auth_user', JSON.stringify({ ...parsed, ...data.data }));
          }
        } catch (e) {}
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Profile',
          text: data.error || 'Could not fetch your profile data.'
        });
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Name Required', text: 'Please enter your full name.' });
      return;
    }

    try {
      setSavingDetails(true);
      const res = await fetch('/api/crm/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Your contact details have been successfully saved.',
          timer: 2000,
          showConfirmPrompt: false
        });
        fetchProfile();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: data.error || 'Failed to update profile.'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      Swal.fire({ icon: 'warning', title: 'Current Password Required', text: 'Please enter your current password.' });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      Swal.fire({ icon: 'warning', title: 'Weak Password', text: 'New password must be at least 4 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'Passwords Mismatch', text: 'New password and confirm password do not match.' });
      return;
    }

    try {
      setUpdatingPassword(true);
      const res = await fetch('/api/crm/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Password Changed',
          text: 'Your password has been successfully updated.',
          timer: 2500,
          showConfirmButton: false
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Password Update Failed',
          text: data.error || 'Could not change password.'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your CRM profile...</p>
      </div>
    );
  }

  const isFullAccess = profile?.access_type === 'all';
  const assignedCompanies = profile?.assigned_companies_details || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Identity Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-lg shadow-indigo-500/30 ring-4 ring-white/10">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {profile?.name || 'CRM Team Member'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {profile?.status === 'active' ? 'Active Specialist' : 'Inactive'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  <FiBriefcase size={11} /> CRM Team
                </span>
              </div>
              <p className="text-sm text-indigo-200/80 mt-1 flex items-center gap-2">
                <FiMail size={13} /> {profile?.email}
              </p>
              {profile?.phone && (
                <p className="text-xs text-indigo-200/70 mt-0.5 flex items-center gap-2">
                  <FiPhone size={12} /> {profile.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs text-indigo-200/70 border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto border-white/10">
            <span className="flex items-center gap-1.5">
              <FiClock size={12} /> Last Login: {profile?.last_login ? new Date(profile.last_login).toLocaleString() : 'Recent'}
            </span>
            <span className="flex items-center gap-1.5">
              <FiShield size={12} /> Assigned Role: CRM Leads Specialist
            </span>
          </div>
        </div>
      </div>

      {/* Access Scope Banner */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isFullAccess 
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
          : 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isFullAccess ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
          }`}>
            <FiShield size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base">
                {isFullAccess ? '🌐 Full CRM Leads Access' : '🏢 Company-Specific CRM Leads Access'}
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isFullAccess 
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300'
              }`}>
                {isFullAccess ? 'All Companies' : `${assignedCompanies.length} Assigned Companies`}
              </span>
            </div>
            <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
              {isFullAccess
                ? 'You have been granted unrestricted CRM permissions by Superadmin. You can view, capture, follow up, and manage leads across all companies in the CRM system.'
                : 'Your CRM permissions are scoped by the Superadmin. You can only view and manage leads belonging specifically to the client companies assigned to you below.'}
            </p>

            {/* List of assigned companies */}
            {!isFullAccess && (
              <div className="mt-4 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/50">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Your Authorized Client Companies:
                </p>
                {assignedCompanies.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    No companies assigned yet. Contact your Superadmin to assign companies to your profile.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {assignedCompanies.map((comp) => (
                      <div 
                        key={comp.id}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700/60 shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {comp.company_name?.charAt(0) || 'C'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {comp.company_name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <FiGlobe size={10} /> {comp.website || `ID: #${comp.id}`}
                          </p>
                        </div>
                        <FiCheckCircle className="text-emerald-500 shrink-0" size={14} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forms Section: Personal Info + Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Personal Details */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <FiUser size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your contact profile name and phone</p>
            </div>
          </div>

          <form onSubmit={handleUpdateDetails} className="p-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <FiUser className="absolute left-3.5 text-slate-400" size={15} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address (Managed by Superadmin)
              </label>
              <div className="relative flex items-center">
                <FiMail className="absolute left-3.5 text-slate-400" size={15} />
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                To update your login email, please request the Superadmin.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <FiPhone className="absolute left-3.5 text-slate-400" size={15} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingDetails}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {savingDetails ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave size={15} />
                    <span>Save Contact Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Card: Change Password */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FiLock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Security & Password</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Change your CRM login credentials</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="p-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-slate-400" size={15} />
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showCurrentPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-slate-400" size={15} />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 4 characters)"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showNewPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-slate-400" size={15} />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showConfirmPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                {updatingPassword ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <FiShield size={15} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
