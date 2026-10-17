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

function hasTlAssigned(emp, tlId) {
  if (!emp || !tlId) return false;
  if (Array.isArray(emp.tl_ids)) {
    return emp.tl_ids.map(String).includes(String(tlId));
  }
  const ids = (emp.tl_id || '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(String(tlId));
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

        // Initialize selected members for this TL (supports multi-TL assignments)
        if (activeTlId) {
          const currentMembers = new Set(
            emps.filter(e => hasTlAssigned(e, activeTlId)).map(e => e.id)
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
      regularEmployees.filter(e => hasTlAssigned(e, tlId)).map(e => e.id)
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

      // Tab filter (Multi-TL aware)
      const isAssignedToThisTL = hasTlAssigned(emp, selectedTlId);
      const allAssigned = (emp.tl_ids || (emp.tl_id || '').split(',')).map(s => s.trim()).filter(Boolean);
      const otherAssignedCount = allAssigned.filter(id => String(id) !== String(selectedTlId)).length;
      const isAssignedToOtherTL = otherAssignedCount > 0 && !isAssignedToThisTL;
      const isUnassigned = !isAssignedToThisTL && otherAssignedCount === 0;

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

  // Counts for tabs (Multi-TL aware)
  const tabCounts = useMemo(() => {
    let assignedThis = 0;
    let assignedOthers = 0;
    let unassigned = 0;
    regularEmployees.forEach(e => {
      const isThis = hasTlAssigned(e, selectedTlId);
      const allAssigned = (e.tl_ids || (e.tl_id || '').split(',')).map(s => s.trim()).filter(Boolean);
      const otherCount = allAssigned.filter(id => String(id) !== String(selectedTlId)).length;

      if (isThis) assignedThis++;
      else if (otherCount > 0) assignedOthers++;
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
          text: `Team Leader "${activeTL?.name || 'Selected TL'}" can now view screenshots for ${memberIdsArray.length} team member(s). Multiple TL assignments are preserved.`,
          confirmButtonColor: '#0284c7',
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
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--glass-border, #e2e8f0)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          color: 'var(--text-primary, #0f172a)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--glass-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(2, 132, 199, 0.12)',
                color: 'var(--accent-cyan, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                border: '1px solid rgba(2, 132, 199, 0.25)'
              }}
            >
              <FiShield />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                Decide TL Screenshot Access
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
                Select team members whose screenshots are visible to this Team Leader (members can belong to multiple TLs)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #64748b)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}
          >
            <FiX />
          </button>
        </div>

        {/* TL Picker Bar */}
        <div
          style={{
            padding: '14px 24px',
            background: 'var(--bg-tertiary, #f1f5f9)',
            borderBottom: '1px solid var(--glass-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>
              Select Team Leader:
            </span>
            <select
              value={selectedTlId}
              onChange={e => handleTlChange(e.target.value)}
              disabled={loading || saving}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--glass-border, #cbd5e1)',
                color: 'var(--text-primary, #0f172a)',
                fontWeight: '700',
                fontSize: '0.9rem',
                minWidth: '240px',
                cursor: 'pointer'
              }}
            >
              {teamLeaders.map(tl => {
                const count = regularEmployees.filter(e => hasTlAssigned(e, tl.id)).length;
                return (
                  <option key={tl.id} value={tl.id} style={{ background: 'var(--bg-card, #ffffff)', color: 'var(--text-primary, #0f172a)' }}>
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
                background: 'var(--bg-card, #ffffff)',
                padding: '6px 14px',
                borderRadius: '10px',
                border: '1px solid var(--glass-border, #e2e8f0)'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: 'var(--accent-cyan, #0284c7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.75rem'
                }}
              >
                {getInitials(activeTL.name)}
              </div>
              <div style={{ fontSize: '0.82rem' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>{activeTL.name}</span>
                <span style={{ color: 'var(--text-muted, #64748b)', marginLeft: '6px' }}>({activeTL.email})</span>
              </div>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
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
            background: 'var(--bg-card, #ffffff)',
            borderBottom: '1px solid var(--glass-border, #e2e8f0)',
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
                  color: 'var(--text-muted, #94a3b8)'
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
                  background: 'var(--bg-tertiary, #f8fafc)',
                  border: '1px solid var(--glass-border, #cbd5e1)',
                  color: 'var(--text-primary, #0f172a)',
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
                background: 'var(--bg-tertiary, #f8fafc)',
                border: '1px solid var(--glass-border, #cbd5e1)',
                color: 'var(--text-primary, #0f172a)',
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
                  background: 'rgba(2, 132, 199, 0.1)',
                  color: 'var(--accent-cyan, #0284c7)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
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
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
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
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'all' ? 'var(--accent-cyan, #0284c7)' : 'var(--bg-tertiary, #f1f5f9)',
                color: filterTab === 'all' ? '#ffffff' : 'var(--text-secondary, #475569)',
                border: filterTab === 'all' ? 'none' : '1px solid var(--glass-border, #e2e8f0)'
              }}
            >
              All Members ({tabCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('assigned_this')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'assigned_this' ? '#059669' : 'var(--bg-tertiary, #f1f5f9)',
                color: filterTab === 'assigned_this' ? '#ffffff' : 'var(--text-secondary, #475569)',
                border: filterTab === 'assigned_this' ? 'none' : '1px solid var(--glass-border, #e2e8f0)'
              }}
            >
              ✓ Visible to this TL ({tabCounts.assignedThis})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unassigned')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'unassigned' ? '#d97706' : 'var(--bg-tertiary, #f1f5f9)',
                color: filterTab === 'unassigned' ? '#ffffff' : 'var(--text-secondary, #475569)',
                border: filterTab === 'unassigned' ? 'none' : '1px solid var(--glass-border, #e2e8f0)'
              }}
            >
              ⚪ Unassigned ({tabCounts.unassigned})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('assigned_others')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterTab === 'assigned_others' ? '#6366f1' : 'var(--bg-tertiary, #f1f5f9)',
                color: filterTab === 'assigned_others' ? '#ffffff' : 'var(--text-secondary, #475569)',
                border: filterTab === 'assigned_others' ? 'none' : '1px solid var(--glass-border, #e2e8f0)'
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
            gap: '8px',
            background: 'var(--bg-secondary, #f8fafc)'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--glass-border, #e2e8f0)',
                  borderTopColor: 'var(--accent-cyan, #0284c7)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px'
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Loading employee hierarchy...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>
              <FiUsers size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: '600' }}>No employees found matching the filter.</p>
            </div>
          ) : (
            filteredEmployees.map(emp => {
              const isChecked = selectedMemberIds.has(emp.id);
              const isOriginallyAssignedThisTL = hasTlAssigned(emp, selectedTlId);
              const allAssignedTlIds = (emp.tl_ids || (emp.tl_id || '').split(',')).map(s => s.trim()).filter(Boolean);
              const otherTlIds = allAssignedTlIds.filter(id => String(id) !== String(selectedTlId));
              const otherTlNames = otherTlIds.map(id => tlMap[String(id)]?.name || id).filter(Boolean);

              return (
                <div
                  key={emp.id}
                  onClick={() => toggleMember(emp.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: isChecked ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-card, #ffffff)',
                    border: isChecked ? '1px solid var(--accent-cyan, #0284c7)' : '1px solid var(--glass-border, #e2e8f0)',
                    boxShadow: isChecked ? '0 2px 8px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Custom Checkbox */}
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      border: isChecked ? '1px solid var(--accent-cyan, #0284c7)' : '2px solid var(--glass-border, #cbd5e1)',
                      background: isChecked ? 'var(--accent-cyan, #0284c7)' : 'var(--bg-card, #ffffff)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      flexShrink: 0
                    }}
                  >
                    {isChecked && <FiCheck />}
                  </div>

                  {/* Avatar */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isChecked ? 'rgba(2, 132, 199, 0.18)' : 'var(--bg-tertiary, #f1f5f9)',
                      color: isChecked ? 'var(--accent-cyan, #0284c7)' : 'var(--text-secondary, #475569)',
                      border: '1px solid var(--glass-border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      flexShrink: 0
                    }}
                  >
                    {getInitials(emp.name)}
                  </div>

                  {/* Name, ID, Dept */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary, #0f172a)', fontSize: '0.92rem' }}>
                        {emp.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted, #64748b)',
                          background: 'var(--bg-tertiary, #f1f5f9)',
                          border: '1px solid var(--glass-border, #e2e8f0)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}
                      >
                        {emp.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #475569)', fontWeight: '500' }}>
                        {emp.department || 'General'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)' }}>·</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
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
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ✓ Visible to this TL{otherTlNames.length > 0 ? ` (+${otherTlNames.length} other)` : ''}
                      </span>
                    ) : isOriginallyAssignedThisTL ? (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#dc2626',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        Will Be Removed
                      </span>
                    ) : otherTlNames.length > 0 ? (
                      <span
                        style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#4f46e5',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                        title={`Also visible to ${otherTlNames.join(', ')}`}
                      >
                        Visible to {otherTlNames.join(', ')}
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'var(--bg-tertiary, #f1f5f9)',
                          color: 'var(--text-muted, #64748b)',
                          border: '1px solid var(--glass-border, #e2e8f0)',
                          padding: '4px 12px',
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
            borderTop: '1px solid var(--glass-border, #e2e8f0)',
            background: 'var(--bg-secondary, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #475569)' }}>
            <span style={{ fontWeight: '800', color: 'var(--text-primary, #0f172a)' }}>
              {selectedMemberIds.size}
            </span>{' '}
            member{selectedMemberIds.size === 1 ? '' : 's'} selected for{' '}
            <span style={{ color: 'var(--accent-cyan, #0284c7)', fontWeight: '800' }}>
              {activeTL?.name || 'Team Leader'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--glass-border, #cbd5e1)',
                color: 'var(--text-primary, #0f172a)',
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
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
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
