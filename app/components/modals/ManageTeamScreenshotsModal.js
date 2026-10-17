"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiCheck, FiSearch, FiUsers, FiUserCheck, FiFilter, FiSave, FiAlertCircle, FiShield } from 'react-icons/fi';
import Swal from 'sweetalert2';

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export default function ManageTeamScreenshotsModal({
  isOpen,
  onClose,
  initialTlId = null,
  onSuccess = null
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [regularEmployees, setRegularEmployees] = useState([]);
  const [selectedTlId, setSelectedTlId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'assigned_this' | 'assigned_others' | 'unassigned'
  const [selectedDept, setSelectedDept] = useState('all');

  // Load team leaders and members
  const loadHierarchyData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team-hierarchy');
      const data = await res.json();
      if (data.success) {
        const tls = data.teamLeaders || [];
        const emps = data.regularEmployees || [];
        setTeamLeaders(tls);
        setRegularEmployees(emps);

        // Preselect TL
        const activeTlId = initialTlId || (tls.length > 0 ? tls[0].id : '');
        setSelectedTlId(activeTlId);

        // Initialize selected members for this TL
        if (activeTlId) {
          const currentMembers = new Set(
            emps.filter(e => String(e.tl_id) === String(activeTlId)).map(e => e.id)
          );
          setSelectedMemberIds(currentMembers);
        }
      } else {
        Swal.fire('Error', data.error || 'Failed to load team hierarchy data', 'error');
      }
    } catch (err) {
      console.error('Failed to load team hierarchy data:', err);
      Swal.fire('Error', 'Network error while loading team hierarchy', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHierarchyData();
    }
  }, [isOpen, initialTlId]);

  // When selected TL changes, sync the selectedMemberIds with that TL's existing members
  const handleTlChange = (tlId) => {
    setSelectedTlId(tlId);
    const currentMembers = new Set(
      regularEmployees.filter(e => String(e.tl_id) === String(tlId)).map(e => e.id)
    );
    setSelectedMemberIds(currentMembers);
  };

  // Toggle individual employee selection
  const toggleMember = (empId) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  // Departments set
  const departments = useMemo(() => {
    const set = new Set();
    regularEmployees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [regularEmployees]);

  // TL map for quick lookup of existing assignments
  const tlMap = useMemo(() => {
    const map = {};
    teamLeaders.forEach(tl => {
      map[String(tl.id)] = tl;
    });
    return map;
  }, [teamLeaders]);

  const activeTL = useMemo(() => {
    return teamLeaders.find(tl => String(tl.id) === String(selectedTlId)) || null;
  }, [teamLeaders, selectedTlId]);

  // Filtered employees according to search, filter tab, and department
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return regularEmployees.filter(emp => {
      // Search filter
      if (q) {
        const nameMatch = (emp.name || '').toLowerCase().includes(q);
        const idMatch = (emp.id || '').toLowerCase().includes(q);
        const deptMatch = (emp.department || '').toLowerCase().includes(q);
        const emailMatch = (emp.email || '').toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch && !emailMatch) return false;
      }

      // Department filter
      if (selectedDept !== 'all' && (emp.department || '') !== selectedDept) {
        return false;
      }

      // Tab filter
      const isAssignedToThisTL = String(emp.tl_id) === String(selectedTlId);
      const isAssignedToOtherTL = emp.tl_id && !isAssignedToThisTL;
      const isUnassigned = !emp.tl_id;

      if (filterTab === 'assigned_this') return isAssignedToThisTL;
      if (filterTab === 'assigned_others') return isAssignedToOtherTL;
      if (filterTab === 'unassigned') return isUnassigned;

      return true;
    });
  }, [regularEmployees, searchQuery, selectedDept, filterTab, selectedTlId]);

  // Bulk actions for filtered items
  const selectAllFiltered = () => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      filteredEmployees.forEach(e => next.add(e.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      filteredEmployees.forEach(e => next.delete(e.id));
      return next;
    });
  };

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let assignedThis = 0;
    let assignedOthers = 0;
    let unassigned = 0;
    regularEmployees.forEach(e => {
      if (String(e.tl_id) === String(selectedTlId)) assignedThis++;
      else if (e.tl_id) assignedOthers++;
      else unassigned++;
    });
    return {
      all: regularEmployees.length,
      assignedThis,
      assignedOthers,
      unassigned
    };
  }, [regularEmployees, selectedTlId]);

  // Save changes via API
  const handleSave = async () => {
    if (!selectedTlId) {
      Swal.fire('Warning', 'Please select a Team Leader to configure.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const memberIdsArray = Array.from(selectedMemberIds);
      const res = await fetch('/api/team-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tl_id: selectedTlId,
          member_ids: memberIdsArray
        })
      });

      const data = await res.json();
      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Screenshot Permissions Updated!',
          text: `Team Leader "${activeTL?.name || 'Selected TL'}" can now view screenshots for ${memberIdsArray.length} team member(s).`,
          confirmButtonColor: '#06b6d4',
          timer: 2500,
          timerProgressBar: true
        });
        if (onSuccess) onSuccess(selectedTlId, memberIdsArray);
        onClose();
      } else {
        Swal.fire('Error', data.error || 'Failed to update team permissions', 'error');
      }
    } catch (err) {
      console.error('Error saving team hierarchy:', err);
      Swal.fire('Error', 'Network error while saving changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          color: '#f8fafc',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#06b6d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}
            >
              <FiShield />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                Decide TL Screenshot Access
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Select which team members' screenshots are visible to this Team Leader in their portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}
            className="hover:bg-white/10"
          >
            <FiX />
          </button>
        </div>

        {/* TL Picker Bar */}
        <div
          style={{
            padding: '16px 24px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>
              Select Team Leader:
            </span>
            <select
              value={selectedTlId}
              onChange={e => handleTlChange(e.target.value)}
              disabled={loading || saving}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: '#38bdf8',
                fontWeight: '700',
                fontSize: '0.9rem',
                minWidth: '220px',
                cursor: 'pointer'
              }}
            >
              {teamLeaders.map(tl => {
                const count = regularEmployees.filter(e => String(e.tl_id) === String(tl.id)).length;
                return (
                  <option key={tl.id} value={tl.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                    👔 {tl.name} ({count} assigned members)
                  </option>
                );
              })}
            </select>
          </div>

          {activeTL && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginLeft: 'auto',
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '6px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(6, 182, 212, 0.2)'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.25)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.75rem'
                }}
              >
                {getInitials(activeTL.name)}
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                <span style={{ fontWeight: '700', color: '#f8fafc' }}>{activeTL.name}</span>
                <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({activeTL.email})</span>
              </div>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}
              >
                {selectedMemberIds.size} Visible Member{selectedMemberIds.size === 1 ? '' : 's'}
              </div>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Row 1: Search & Department */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <FiSearch
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }}
              />
              <input
                type="text"
                placeholder="Search member by name, ID, or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                minWidth: '160px'
              }}
            >
              <option value="all">🏢 All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={selectAllFiltered}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  color: '#06b6d4',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Select All ({filteredEmployees.length})
              </button>
              <button
                type="button"
                onClick={deselectAllFiltered}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Row 2: Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'all' ? '#06b6d4' : 'rgba(255,255,255,0.05)',
                color: filterTab === 'all' ? '#0f172a' : '#94a3b8',
                border: 'none'
              }}
            >
              All Members ({tabCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('assigned_this')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'assigned_this' ? '#10b981' : 'rgba(255,255,255,0.05)',
                color: filterTab === 'assigned_this' ? '#0f172a' : '#94a3b8',
                border: 'none'
              }}
            >
              ✓ Visible to this TL ({tabCounts.assignedThis})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unassigned')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'unassigned' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                color: filterTab === 'unassigned' ? '#0f172a' : '#94a3b8',
                border: 'none'
              }}
            >
              ⚪ Unassigned ({tabCounts.unassigned})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('assigned_others')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'assigned_others' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                color: filterTab === 'assigned_others' ? '#ffffff' : '#94a3b8',
                border: 'none'
              }}
            >
              👥 Assigned to Other TLs ({tabCounts.assignedOthers})
            </button>
          </div>
        </div>

        {/* Member Checkbox List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(255,255,255,0.1)',
                  borderTopColor: '#06b6d4',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px'
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Loading employee hierarchy...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <FiUsers size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: '600' }}>No employees found matching the filter.</p>
            </div>
          ) : (
            filteredEmployees.map(emp => {
              const isChecked = selectedMemberIds.has(emp.id);
              const isOriginallyAssignedThisTL = String(emp.tl_id) === String(selectedTlId);
              const isOriginallyAssignedOtherTL = emp.tl_id && !isOriginallyAssignedThisTL;
              const otherTl = isOriginallyAssignedOtherTL ? tlMap[String(emp.tl_id)] : null;

              return (
                <div
                  key={emp.id}
                  onClick={() => toggleMember(emp.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isChecked ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isChecked ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Custom Checkbox */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: isChecked ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.25)',
                      background: isChecked ? '#06b6d4' : 'transparent',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      flexShrink: 0
                    }}
                  >
                    {isChecked && <FiCheck />}
                  </div>

                  {/* Avatar */}
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: isChecked ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: isChecked ? '#38bdf8' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      flexShrink: 0
                    }}
                  >
                    {getInitials(emp.name)}
                  </div>

                  {/* Name, ID, Dept */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: isChecked ? '#f8fafc' : '#cbd5e1', fontSize: '0.9rem' }}>
                        {emp.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#64748b',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {emp.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {emp.department || 'General'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>·</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {emp.role || 'Member'}
                      </span>
                    </div>
                  </div>

                  {/* Visibility Status Badge */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {isChecked ? (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ✓ Screenshots Visible
                      </span>
                    ) : isOriginallyAssignedThisTL ? (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        Will Be Removed
                      </span>
                    ) : isOriginallyAssignedOtherTL ? (
                      <span
                        style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                        title={`Currently visible to ${otherTl?.name || 'another TL'}`}
                      >
                        Visible to {otherTl?.name || 'Other TL'}
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#64748b',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        Admin Only
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            <span style={{ fontWeight: '700', color: '#f8fafc' }}>{selectedMemberIds.size}</span> member
            {selectedMemberIds.size === 1 ? '' : 's'} selected for{' '}
            <span style={{ color: '#38bdf8', fontWeight: '700' }}>{activeTL?.name || 'Team Leader'}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
              }}
            >
              <FiSave />
              {saving ? 'Saving Permissions...' : `Save Screenshot Access (${selectedMemberIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
