import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import { getEmployees, subscribe } from '../../store/store';
import {
  fetchTeamHierarchyApi,
  updateTeamHierarchyApi,
  updateEmployeeTlApi,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const TL_PALETTES = [
  { accent: '#6366f1', bg: '#e0e7ff', darkBg: '#312e81', border: '#818cf8' },
  { accent: '#0891b2', bg: '#cffafe', darkBg: '#164e63', border: '#22d3ee' },
  { accent: '#16a34a', bg: '#dcfce7', darkBg: '#14532d', border: '#4ade80' },
  { accent: '#d97706', bg: '#fef3c7', darkBg: '#78350f', border: '#fbbf24' },
  { accent: '#db2777', bg: '#fce7f3', darkBg: '#831843', border: '#f472b6' },
  { accent: '#7c3aed', bg: '#ede9fe', darkBg: '#4c1d95', border: '#a78bfa' },
];

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function isEmpAssignedToTL(emp, tlId) {
  if (!emp || !tlId) return false;
  if (Array.isArray(emp.tl_ids)) return emp.tl_ids.map(String).includes(String(tlId));
  const ids = (emp.tl_id || '').split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(String(tlId));
}

export default function ManageTeamHierarchy({ currentUser, onBack, onNavigateToScreenshots }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [employees, setEmployees] = useState([]);
  const [apiTeamLeaders, setApiTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedTls, setCollapsedTls] = useState({});

  // Single Employee Assignment Modal
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedTlId, setSelectedTlId] = useState('');
  const [savingSingle, setSavingSingle] = useState(false);

  // Decide TL Screenshot Access Modal
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [modalSelectedTlId, setModalSelectedTlId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalFilterTab, setModalFilterTab] = useState('all'); // 'all' | 'assigned_this' | 'assigned_others' | 'unassigned' | 'subordinate_tls'
  const [modalSelectedDept, setModalSelectedDept] = useState('all');
  const [savingAccess, setSavingAccess] = useState(false);

  const isTL = (role) => {
    const r = (role || '').toLowerCase();
    return r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead' || r === 'leader';
  };

  const EXCLUDED_ROLES = [
    'client',
    'admin',
    'superadmin',
    'management',
    'hr',
    'hr management',
    'dns manager',
    'candidate',
    'it engineer',
    'it support',
  ];

  const loadData = async () => {
    try {
      const res = await fetchTeamHierarchyApi();
      if (res && res.success) {
        setEmployees(res.regularEmployees || []);
        if (res.teamLeaders && Array.isArray(res.teamLeaders)) {
          setApiTeamLeaders(res.teamLeaders);
        }
      } else {
        const emps = getEmployees() || [];
        setEmployees(emps);
      }
    } catch (err) {
      console.log('fetchTeamHierarchyApi offline/error, falling back to local store:', err);
      const emps = getEmployees() || [];
      setEmployees(emps);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleCollapse = (tlId) => {
    setCollapsedTls((prev) => ({ ...prev, [tlId]: !prev[tlId] }));
  };

  // Team Leaders list
  const teamLeaders = useMemo(() => {
    if (apiTeamLeaders.length > 0) return apiTeamLeaders;
    return employees.filter((emp) => isTL(emp.role) && emp.status !== 'Inactive');
  }, [apiTeamLeaders, employees]);

  // Regular Employees list
  const regularEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const r = (emp.role || '').toLowerCase();
      return (
        !isTL(emp.role) &&
        emp.status !== 'Inactive' &&
        !EXCLUDED_ROLES.includes(r) &&
        !r.includes('marketing') &&
        !r.includes('candidate')
      );
    });
  }, [employees]);

  const q = searchQuery.toLowerCase().trim();

  // Total unassigned count
  const unassignedEmployees = useMemo(() => {
    return regularEmployees.filter((e) => {
      const allIds = e.tl_ids || (e.tl_id || '').split(',').map((s) => s.trim()).filter(Boolean);
      return allIds.length === 0;
    });
  }, [regularEmployees]);

  const assignedEmployeesCount = regularEmployees.length - unassignedEmployees.length;

  // Single TL Assignment Save
  const handleSaveTlAssignment = async () => {
    if (!selectedEmp) return;
    setSavingSingle(true);
    try {
      const res = await updateEmployeeTlApi(selectedEmp.id, selectedTlId);
      if (res && res.success) {
        sweetAlert({
          title: 'Hierarchy Updated',
          text: `${selectedEmp.name} reporting manager updated!`,
          type: 'success',
        });
        setAssignModalVisible(false);
        setSelectedEmp(null);
        setSelectedTlId('');
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to update reporting TL.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: 'Network error updating hierarchy.',
        type: 'error',
      });
    } finally {
      setSavingSingle(false);
    }
  };

  const openAssignModal = (emp) => {
    setSelectedEmp(emp);
    const existingIds = emp.tl_ids || (emp.tl_id || '').split(',').map((s) => s.trim()).filter(Boolean);
    setSelectedTlId(existingIds[0] || '');
    setAssignModalVisible(true);
  };

  // -------------------------------------------------------------------------
  // DECIDE TL SCREENSHOT ACCESS MODAL LOGIC
  // -------------------------------------------------------------------------
  const openManageAccessModal = (targetTlId = null) => {
    const activeTlId = targetTlId || (teamLeaders.length > 0 ? teamLeaders[0].id : '');
    setModalSelectedTlId(activeTlId);
    setModalSearchQuery('');
    setModalFilterTab('all');
    setModalSelectedDept('all');

    if (activeTlId) {
      const currentMembers = new Set([
        ...regularEmployees.filter((e) => isEmpAssignedToTL(e, activeTlId)).map((e) => e.id),
        ...teamLeaders
          .filter((t) => String(t.id) !== String(activeTlId) && isEmpAssignedToTL(t, activeTlId))
          .map((t) => t.id),
      ]);
      setSelectedMemberIds(currentMembers);
    } else {
      setSelectedMemberIds(new Set());
    }
    setManageModalVisible(true);
  };

  const handleModalTlChange = (newTlId) => {
    setModalSelectedTlId(newTlId);
    const currentMembers = new Set([
      ...regularEmployees.filter((e) => isEmpAssignedToTL(e, newTlId)).map((e) => e.id),
      ...teamLeaders
        .filter((t) => String(t.id) !== String(newTlId) && isEmpAssignedToTL(t, newTlId))
        .map((t) => t.id),
    ]);
    setSelectedMemberIds(currentMembers);
  };

  const toggleMemberSelection = (empId) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const activeModalTL = useMemo(() => {
    return teamLeaders.find((tl) => String(tl.id) === String(modalSelectedTlId)) || null;
  }, [teamLeaders, modalSelectedTlId]);

  const otherTeamLeaders = useMemo(() => {
    return teamLeaders.filter((tl) => String(tl.id) !== String(modalSelectedTlId));
  }, [teamLeaders, modalSelectedTlId]);

  const departments = useMemo(() => {
    const set = new Set();
    regularEmployees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [regularEmployees]);

  const mq = modalSearchQuery.toLowerCase().trim();

  const filteredModalEmployees = useMemo(() => {
    return regularEmployees.filter((emp) => {
      if (mq) {
        const nameMatch = (emp.name || '').toLowerCase().includes(mq);
        const deptMatch = (emp.department || '').toLowerCase().includes(mq);
        const roleMatch = (emp.role || '').toLowerCase().includes(mq);
        if (!nameMatch && !deptMatch && !roleMatch) return false;
      }
      if (modalSelectedDept !== 'all' && (emp.department || '') !== modalSelectedDept) {
        return false;
      }

      const isAssignedThis = isEmpAssignedToTL(emp, modalSelectedTlId);
      const allAssigned = (emp.tl_ids || (emp.tl_id || '').split(','))
        .map((s) => s.trim())
        .filter(Boolean);
      const otherAssignedCount = allAssigned.filter((id) => String(id) !== String(modalSelectedTlId)).length;
      const isAssignedOthers = otherAssignedCount > 0 && !isAssignedThis;
      const isUnassigned = !isAssignedThis && otherAssignedCount === 0;

      if (modalFilterTab === 'assigned_this') return isAssignedThis;
      if (modalFilterTab === 'assigned_others') return isAssignedOthers;
      if (modalFilterTab === 'unassigned') return isUnassigned;
      return true;
    });
  }, [regularEmployees, mq, modalSelectedDept, modalFilterTab, modalSelectedTlId]);

  const filteredModalSubTls = useMemo(() => {
    return otherTeamLeaders.filter((tl) => {
      if (mq) {
        const nameMatch = (tl.name || '').toLowerCase().includes(mq);
        const deptMatch = (tl.department || '').toLowerCase().includes(mq);
        if (!nameMatch && !deptMatch) return false;
      }
      if (modalSelectedDept !== 'all' && (tl.department || '') !== modalSelectedDept) {
        return false;
      }
      return true;
    });
  }, [otherTeamLeaders, mq, modalSelectedDept]);

  const selectAllFiltered = () => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (modalFilterTab === 'subordinate_tls') {
        filteredModalSubTls.forEach((t) => next.add(t.id));
      } else {
        filteredModalEmployees.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (modalFilterTab === 'subordinate_tls') {
        filteredModalSubTls.forEach((t) => next.delete(t.id));
      } else {
        filteredModalEmployees.forEach((e) => next.delete(e.id));
      }
      return next;
    });
  };

  const modalTabCounts = useMemo(() => {
    let assignedThis = 0;
    let assignedOthers = 0;
    let unassigned = 0;

    regularEmployees.forEach((e) => {
      const isThis = isEmpAssignedToTL(e, modalSelectedTlId);
      const allAssigned = (e.tl_ids || (e.tl_id || '').split(',')).map((s) => s.trim()).filter(Boolean);
      const otherCount = allAssigned.filter((id) => String(id) !== String(modalSelectedTlId)).length;

      if (isThis) assignedThis++;
      else if (otherCount > 0) assignedOthers++;
      else unassigned++;
    });

    return {
      all: regularEmployees.length,
      assignedThis,
      assignedOthers,
      unassigned,
      subordinateTls: otherTeamLeaders.length,
    };
  }, [regularEmployees, otherTeamLeaders, modalSelectedTlId]);

  const handleSaveScreenshotAccess = async () => {
    if (!modalSelectedTlId) {
      sweetAlert({
        title: 'Select TL',
        text: 'Please select a Team Leader to configure.',
        type: 'warning',
      });
      return;
    }
    setSavingAccess(true);
    try {
      const memberIdsArray = Array.from(selectedMemberIds);
      const res = await updateTeamHierarchyApi(modalSelectedTlId, memberIdsArray);
      if (res && res.success) {
        sweetAlert({
          title: 'Access Saved',
          text: 'Team Leader screenshot access permissions updated successfully!',
          type: 'success',
        });
        setManageModalVisible(false);
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to update screenshot access permissions.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: 'Network error saving screenshot access permissions.',
        type: 'error',
      });
    } finally {
      setSavingAccess(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <AppIcon name="arrow-left" size={18} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>🌳 Team Hierarchy Tree</Text>
            <Text style={styles.subtitle} numberOfLines={1}>TL Screenshot & Member Access</Text>
          </View>
        </View>

        {/* Header Action: Decide TL Screenshot Access Button */}
        <TouchableOpacity
          style={styles.headerDecideBtn}
          onPress={() => openManageAccessModal(null)}
          activeOpacity={0.8}
        >
          <AppIcon name="shield" size={13} color="#0284c7" />
          <Text style={styles.headerDecideBtnText}>Decide Access</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats Grid */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{teamLeaders.length}</Text>
          <Text style={styles.statLabel}>👔 Team Leaders</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#16a34a' }]}>
            {assignedEmployeesCount}
          </Text>
          <Text style={styles.statLabel}>👥 Assigned</Text>
        </View>
        <View style={[styles.statBox, unassignedEmployees.length > 0 && styles.statBoxWarning]}>
          <Text style={[styles.statVal, unassignedEmployees.length > 0 && { color: '#d97706' }]}>
            {unassignedEmployees.length}
          </Text>
          <Text style={styles.statLabel}>⚠️ Unassigned</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <AppIcon name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search team member, TL, department..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="x" size={14} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Loading hierarchy structure...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        >
          {/* TEAM LEADERS HIERARCHY ACCORDIONS */}
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>LEADERSHIP TEAMS ({teamLeaders.length})</Text>
            <TouchableOpacity
              onPress={() => openManageAccessModal(null)}
              style={styles.inlineManageBtn}
              activeOpacity={0.7}
            >
              <AppIcon name="shield" size={11} color="#0284c7" />
              <Text style={styles.inlineManageBtnText}>Decide TL Access</Text>
            </TouchableOpacity>
          </View>

          {teamLeaders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>👔</Text>
              <Text style={styles.emptyTitle}>No Team Leaders Configured</Text>
              <Text style={styles.emptySubtitle}>Assign employee role to 'Team Leader' in Employees Directory.</Text>
            </View>
          ) : (
            teamLeaders.map((tl, index) => {
              const palette = TL_PALETTES[index % TL_PALETTES.length];
              const isCollapsed = !!collapsedTls[tl.id];

              // Direct members
              const members = regularEmployees.filter((m) => isEmpAssignedToTL(m, tl.id));
              const filteredMembers = members.filter(
                (m) =>
                  (m.name || '').toLowerCase().includes(q) ||
                  (m.department || '').toLowerCase().includes(q) ||
                  (m.role || '').toLowerCase().includes(q)
              );

              // Subordinate TLs
              const subTls = teamLeaders.filter(
                (other) => String(other.id) !== String(tl.id) && isEmpAssignedToTL(other, tl.id)
              );

              // Parent TLs
              const parentTlIds = tl.tl_ids || (tl.tl_id || '').split(',').map((s) => s.trim()).filter(Boolean);
              const parentTlNames = parentTlIds
                .map((id) => teamLeaders.find((t) => String(t.id) === String(id))?.name)
                .filter(Boolean);

              return (
                <View
                  key={tl.id}
                  style={[
                    styles.tlCard,
                    { borderLeftColor: palette.accent, borderLeftWidth: 4 },
                  ]}
                >
                  {/* TL Card Header */}
                  <TouchableOpacity
                    style={styles.tlHeader}
                    onPress={() => toggleCollapse(tl.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={[
                          styles.tlAvatar,
                          { backgroundColor: isDark ? palette.darkBg : palette.bg },
                        ]}
                      >
                        <Text style={[styles.tlAvatarText, { color: palette.accent }]}>
                          {subTls.length > 0 ? '👑' : getInitials(tl.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.tlName}>{tl.name}</Text>
                          {subTls.length > 0 && (
                            <View style={styles.seniorBadge}>
                              <Text style={styles.seniorBadgeText}>👑 Senior TL</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.tlMeta}>
                          {tl.department || 'Operations'} • {members.length} Specialists
                          {subTls.length > 0 ? ` • +${subTls.length} Sub-TLs` : ''}
                        </Text>
                        {parentTlNames.length > 0 && (
                          <Text style={styles.reportsToMeta}>
                            Reports to: {parentTlNames.join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.countBadge, { backgroundColor: isDark ? palette.darkBg : palette.bg }]}>
                        <Text style={[styles.countBadgeText, { color: palette.accent }]}>
                          {members.length}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, color: themeColors.textSecondary }}>
                        {isCollapsed ? '▼' : '▲'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* TL Card Action Buttons Row */}
                  <View style={styles.tlCardToolbar}>
                    <TouchableOpacity
                      style={styles.tlCardDecideBtn}
                      onPress={() => openManageAccessModal(tl.id)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="shield" size={12} color="#0284c7" />
                      <Text style={styles.tlCardDecideBtnText}>Decide Access</Text>
                    </TouchableOpacity>

                    {onNavigateToScreenshots && (
                      <TouchableOpacity
                        style={styles.tlCardScreenshotsBtn}
                        onPress={() => onNavigateToScreenshots(tl.id)}
                        activeOpacity={0.7}
                      >
                        <AppIcon name="eye" size={12} color="#0891b2" />
                        <Text style={styles.tlCardScreenshotsBtnText}>Check Screenshots</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Expandable Members List */}
                  {!isCollapsed && (
                    <View style={styles.membersContainer}>
                      {/* Subordinate Team Leaders Box */}
                      {subTls.length > 0 && (
                        <View style={styles.subTlBox}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <Text style={{ fontSize: 13 }}>👑</Text>
                            <Text style={styles.subTlBoxTitle}>
                              SUBORDINATE TEAM LEADERS ({subTls.length}) — FULL TEAM OVERSIGHT
                            </Text>
                          </View>
                          {subTls.map((subTl) => (
                            <View key={subTl.id} style={styles.subTlRow}>
                              <View style={styles.subTlAvatar}>
                                <Text style={styles.subTlAvatarText}>{getInitials(subTl.name)}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.subTlName}>{subTl.name}</Text>
                                <Text style={styles.subTlDept}>
                                  {subTl.department || 'Operations'} Department TL
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.subTlManageBtn}
                                onPress={() => openManageAccessModal(subTl.id)}
                                activeOpacity={0.7}
                              >
                                <AppIcon name="shield" size={10} color="#d97706" />
                                <Text style={styles.subTlManageBtnText}>Decide Access</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Regular Members */}
                      {filteredMembers.length === 0 ? (
                        <Text style={styles.noMembersText}>
                          {members.length === 0
                            ? 'No specialists assigned under this Team Leader.'
                            : 'No members match search query.'}
                        </Text>
                      ) : (
                        filteredMembers.map((emp) => {
                          const allTlIds = emp.tl_ids || (emp.tl_id || '').split(',').map((s) => s.trim()).filter(Boolean);
                          const otherTlNames = allTlIds
                            .filter((id) => String(id) !== String(tl.id))
                            .map((id) => teamLeaders.find((t) => String(t.id) === String(id))?.name)
                            .filter(Boolean);

                          return (
                            <View key={emp.id} style={styles.memberRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <View style={styles.memberDot} />
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <Text style={styles.memberName}>{emp.name}</Text>
                                    {otherTlNames.length > 0 && (
                                      <View style={styles.coAssignedBadge}>
                                        <Text style={styles.coAssignedBadgeText} numberOfLines={1}>
                                          Co-assigned: {otherTlNames.join(', ')}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={styles.memberRole}>
                                    {emp.designation || emp.role || 'Specialist'} • {emp.department}
                                  </Text>
                                </View>
                              </View>

                              <TouchableOpacity
                                style={styles.reassignBtn}
                                onPress={() => openAssignModal(emp)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.reassignBtnText}>
                                  {allTlIds.length > 1 ? `Manage (${allTlIds.length})` : 'Reassign'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* UNASSIGNED TEAM MEMBERS SECTION */}
          {unassignedEmployees.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionHeader, { color: '#d97706' }]}>
                  ⚠️ UNASSIGNED SPECIALISTS ({unassignedEmployees.length})
                </Text>
                <TouchableOpacity
                  onPress={() => openManageAccessModal(null)}
                  style={[styles.inlineManageBtn, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}
                  activeOpacity={0.7}
                >
                  <AppIcon name="plus" size={11} color="#d97706" />
                  <Text style={[styles.inlineManageBtnText, { color: '#d97706' }]}>Assign via Decide Access</Text>
                </TouchableOpacity>
              </View>

              {unassignedEmployees
                .filter(
                  (m) =>
                    (m.name || '').toLowerCase().includes(q) ||
                    (m.department || '').toLowerCase().includes(q)
                )
                .map((emp) => (
                  <View key={emp.id} style={styles.unassignedCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.unassignedName}>{emp.name}</Text>
                      <Text style={styles.unassignedDept}>
                        {emp.department || 'Operations'} • {emp.role || 'Staff'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => openAssignModal(emp)}
                      activeOpacity={0.8}
                    >
                      <AppIcon name="plus" size={12} color="#ffffff" />
                      <Text style={styles.assignBtnText}>Assign TL</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: DECIDE TL SCREENSHOT ACCESS (FULL POWER POLISHED MODAL)  */}
      {/* ================================================================= */}
      <Modal
        visible={manageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalSheet}>
            {/* Modal Drag Handle */}
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={styles.fullModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.modalShieldIconBox}>
                  <AppIcon name="shield" size={16} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullModalTitle}>Decide TL Screenshot Access</Text>
                  <Text style={styles.fullModalSubtitle}>
                    Grant or revoke screenshot permissions per Team Leader
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setManageModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <AppIcon name="x" size={16} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* TL Selector Chips (Horizontal Scroll) */}
            <View style={styles.tlSelectorSection}>
              <Text style={styles.tlSelectorLabel}>TEAM LEADER</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
                contentContainerStyle={styles.tlChipsContainer}
              >
                {teamLeaders.map((tl, index) => {
                  const isSelected = String(tl.id) === String(modalSelectedTlId);
                  const palette = TL_PALETTES[index % TL_PALETTES.length];
                  const assignedCount = regularEmployees.filter((e) =>
                    isEmpAssignedToTL(e, tl.id)
                  ).length;

                  return (
                    <TouchableOpacity
                      key={tl.id}
                      style={[
                        styles.tlChip,
                        isSelected && [
                          styles.tlChipSelected,
                          {
                            borderColor: palette.accent,
                            backgroundColor: isDark ? palette.darkBg : palette.bg,
                          },
                        ],
                      ]}
                      onPress={() => handleModalTlChange(tl.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.tlChipAvatar,
                          { backgroundColor: palette.accent },
                        ]}
                      >
                        <Text style={styles.tlChipAvatarText}>
                          {getInitials(tl.name)}
                        </Text>
                      </View>
                      <View style={{ marginRight: 4 }}>
                        <Text
                          style={[
                            styles.tlChipName,
                            isSelected && { color: palette.accent, fontWeight: '800' },
                          ]}
                          numberOfLines={1}
                        >
                          {tl.name}
                        </Text>
                        <Text style={styles.tlChipDept} numberOfLines={1}>
                          {tl.department || 'Operations'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.tlChipCountBadge,
                          isSelected && { backgroundColor: palette.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tlChipCountBadgeText,
                            isSelected && { color: '#ffffff' },
                          ]}
                        >
                          {isSelected ? selectedMemberIds.size : assignedCount}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Active TL Summary Banner */}
            {activeModalTL && (
              <View style={styles.activeTlBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 15 }}>👔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeTlBannerTitle} numberOfLines={1}>
                      Configuring: <Text style={{ fontWeight: '800', color: '#0284c7' }}>{activeModalTL.name}</Text>
                    </Text>
                    <Text style={styles.activeTlBannerDesc} numberOfLines={1}>
                      {activeModalTL.department || 'Operations'} Department
                    </Text>
                  </View>
                </View>
                <View style={styles.activeTlCountBadge}>
                  <Text style={styles.activeTlCountBadgeVal}>{selectedMemberIds.size}</Text>
                  <Text style={styles.activeTlCountBadgeLbl}>Selected</Text>
                </View>
              </View>
            )}

            {/* Filter Tabs (Horizontal, Fixed Height Pills) */}
            <View style={styles.filterTabsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
                contentContainerStyle={styles.filterTabsRow}
              >
                <TouchableOpacity
                  style={[styles.filterTab, modalFilterTab === 'all' && styles.filterTabActive]}
                  onPress={() => setModalFilterTab('all')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, modalFilterTab === 'all' && styles.filterTabTextActive]}>
                    All ({modalTabCounts.all})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, modalFilterTab === 'assigned_this' && styles.filterTabActive]}
                  onPress={() => setModalFilterTab('assigned_this')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, modalFilterTab === 'assigned_this' && styles.filterTabTextActive]}>
                    This TL ({modalTabCounts.assignedThis})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, modalFilterTab === 'assigned_others' && styles.filterTabActive]}
                  onPress={() => setModalFilterTab('assigned_others')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, modalFilterTab === 'assigned_others' && styles.filterTabTextActive]}>
                    Other TLs ({modalTabCounts.assignedOthers})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, modalFilterTab === 'unassigned' && styles.filterTabActive]}
                  onPress={() => setModalFilterTab('unassigned')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, modalFilterTab === 'unassigned' && styles.filterTabTextActive]}>
                    Unassigned ({modalTabCounts.unassigned})
                  </Text>
                </TouchableOpacity>

                {otherTeamLeaders.length > 0 && (
                  <TouchableOpacity
                    style={[styles.filterTab, modalFilterTab === 'subordinate_tls' && styles.filterTabActive]}
                    onPress={() => setModalFilterTab('subordinate_tls')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterTabText, modalFilterTab === 'subordinate_tls' && styles.filterTabTextActive]}>
                      Subordinate TLs ({modalTabCounts.subordinateTls})
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Search and Bulk Actions Row */}
            <View style={styles.modalSearchRow}>
              <View style={styles.modalSearchBox}>
                <AppIcon name="search" size={14} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search member name or role..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={modalSearchQuery}
                  onChangeText={setModalSearchQuery}
                />
                {modalSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setModalSearchQuery('')}>
                    <AppIcon name="x" size={12} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.quickBulkRow}>
                <TouchableOpacity
                  style={styles.bulkBtn}
                  onPress={selectAllFiltered}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bulkBtnText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkBtn}
                  onPress={deselectAllFiltered}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bulkBtnText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department Filter Chips (Horizontal, Compact Height) */}
            {departments.length > 1 && (
              <View style={styles.deptChipsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                  contentContainerStyle={styles.deptChipsRow}
                >
                  <TouchableOpacity
                    style={[styles.deptChip, modalSelectedDept === 'all' && styles.deptChipActive]}
                    onPress={() => setModalSelectedDept('all')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.deptChipText, modalSelectedDept === 'all' && styles.deptChipTextActive]}>
                      All Depts
                    </Text>
                  </TouchableOpacity>
                  {departments.map((dept) => (
                    <TouchableOpacity
                      key={dept}
                      style={[styles.deptChip, modalSelectedDept === dept && styles.deptChipActive]}
                      onPress={() => setModalSelectedDept(dept)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.deptChipText, modalSelectedDept === dept && styles.deptChipTextActive]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Members / Subordinate TLs Selection List */}
            <ScrollView
              style={styles.modalListScroll}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {modalFilterTab === 'subordinate_tls' ? (
                // Subordinate TLs List
                filteredModalSubTls.length === 0 ? (
                  <View style={styles.modalEmptyState}>
                    <Text style={styles.modalEmptyText}>No Team Leaders match your search.</Text>
                  </View>
                ) : (
                  filteredModalSubTls.map((tl) => {
                    const isChecked = selectedMemberIds.has(tl.id);
                    return (
                      <TouchableOpacity
                        key={tl.id}
                        style={[
                          styles.memberSelectRow,
                          isChecked && styles.memberSelectRowChecked,
                        ]}
                        onPress={() => toggleMemberSelection(tl.id)}
                        activeOpacity={0.7}
                      >
                        {/* Checkbox */}
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <AppIcon name="check" size={12} color="#ffffff" />}
                        </View>

                        {/* Avatar */}
                        <View style={[styles.memberSelectAvatar, { backgroundColor: '#fef3c7' }]}>
                          <Text style={[styles.memberSelectAvatarText, { color: '#d97706' }]}>
                            {getInitials(tl.name)}
                          </Text>
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.memberSelectName}>{tl.name}</Text>
                            <View style={styles.subTlChip}>
                              <Text style={styles.subTlChipText}>👑 Team Leader</Text>
                            </View>
                          </View>
                          <Text style={styles.memberSelectDept}>
                            {tl.department || 'Operations'} • Subordinate Team Oversight
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )
              ) : (
                // Regular Employees List
                filteredModalEmployees.length === 0 ? (
                  <View style={styles.modalEmptyState}>
                    <Text style={styles.modalEmptyText}>No team members match this filter.</Text>
                  </View>
                ) : (
                  filteredModalEmployees.map((emp) => {
                    const isChecked = selectedMemberIds.has(emp.id);
                    const allTlIds = emp.tl_ids || (emp.tl_id || '').split(',').map((s) => s.trim()).filter(Boolean);
                    const otherTlNames = allTlIds
                      .filter((id) => String(id) !== String(modalSelectedTlId))
                      .map((id) => teamLeaders.find((t) => String(t.id) === String(id))?.name)
                      .filter(Boolean);

                    return (
                      <TouchableOpacity
                        key={emp.id}
                        style={[
                          styles.memberSelectRow,
                          isChecked && styles.memberSelectRowChecked,
                        ]}
                        onPress={() => toggleMemberSelection(emp.id)}
                        activeOpacity={0.7}
                      >
                        {/* Checkbox */}
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <AppIcon name="check" size={12} color="#ffffff" />}
                        </View>

                        {/* Avatar */}
                        <View style={styles.memberSelectAvatar}>
                          <Text style={styles.memberSelectAvatarText}>
                            {getInitials(emp.name)}
                          </Text>
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.memberSelectName}>{emp.name}</Text>
                            {otherTlNames.length > 0 && (
                              <View style={styles.coAssignedBadge}>
                                <Text style={styles.coAssignedBadgeText} numberOfLines={1}>
                                  Also reports to: {otherTlNames.join(', ')}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.memberSelectDept}>
                            {emp.designation || emp.role || 'Specialist'} • {emp.department}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )
              )}
            </ScrollView>

            {/* Modal Footer with Save Button */}
            <View style={styles.fullModalFooter}>
              <TouchableOpacity
                style={styles.fullModalCancelBtn}
                onPress={() => setManageModalVisible(false)}
                disabled={savingAccess}
              >
                <Text style={styles.fullModalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullModalSaveBtn}
                onPress={handleSaveScreenshotAccess}
                disabled={savingAccess}
                activeOpacity={0.8}
              >
                {savingAccess ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <AppIcon name="shield" size={14} color="#ffffff" />
                    <Text style={styles.fullModalSaveBtnText}>
                      Save Screenshot Access ({selectedMemberIds.size})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 2: SINGLE EMPLOYEE ASSIGN TEAM LEADER (QUICK REASSIGN)      */}
      {/* ================================================================= */}
      {selectedEmp && (
        <Modal
          visible={assignModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAssignModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>👔 Assign Reporting Team Leader</Text>
                <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                  <AppIcon name="x" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginBottom: 12 }}>
                Assign reporting manager for <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>{selectedEmp.name}</Text>:
              </Text>

              <ScrollView style={{ maxHeight: 300 }}>
                <TouchableOpacity
                  style={[
                    styles.tlOptionRow,
                    selectedTlId === '' && styles.tlOptionRowSelected,
                  ]}
                  onPress={() => setSelectedTlId('')}
                >
                  <Text style={[styles.tlOptionText, selectedTlId === '' && { color: '#2563eb', fontWeight: 'bold' }]}>
                    🚫 No Team Leader (Unassigned)
                  </Text>
                </TouchableOpacity>

                {teamLeaders.map((tl) => (
                  <TouchableOpacity
                    key={tl.id}
                    style={[
                      styles.tlOptionRow,
                      String(selectedTlId) === String(tl.id) && styles.tlOptionRowSelected,
                    ]}
                    onPress={() => setSelectedTlId(tl.id)}
                  >
                    <Text style={{ fontSize: 16 }}>👔</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tlOptionText, String(selectedTlId) === String(tl.id) && { color: '#2563eb', fontWeight: 'bold' }]}>
                        {tl.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>
                        {tl.department} Department
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setAssignModalVisible(false)}
                  disabled={savingSingle}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveTlAssignment}
                  disabled={savingSingle}
                >
                  {savingSingle ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save Assignment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function getStyles(themeColors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.headerBg,
    },
    backBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    subtitle: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    headerDecideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#0369a133' : '#e0f2fe',
      borderWidth: 1,
      borderColor: '#38bdf888',
    },
    headerDecideBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#0284c7',
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
      backgroundColor: themeColors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    statBoxWarning: {
      borderColor: '#d9770666',
      backgroundColor: isDark ? '#78350f22' : '#fef3c7',
    },
    statVal: {
      fontSize: 16,
      fontWeight: '900',
      color: '#2563eb',
    },
    statLabel: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
      fontWeight: '600',
      marginTop: 2,
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: themeColors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: themeColors.textPrimary,
      padding: 0,
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: themeColors.textSecondary,
    },
    inlineManageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: isDark ? '#0369a122' : '#e0f2fe',
      borderWidth: 1,
      borderColor: '#38bdf855',
    },
    inlineManageBtnText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#0284c7',
    },
    centerLoader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    loaderText: {
      marginTop: 10,
      color: themeColors.textSecondary,
      fontSize: 13,
    },
    emptyCard: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      marginTop: 10,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    emptySubtitle: {
      fontSize: 12,
      color: themeColors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    tlCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      overflow: 'hidden',
      marginBottom: 10,
    },
    tlHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    tlAvatar: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tlAvatarText: {
      fontSize: 15,
      fontWeight: '800',
    },
    tlName: {
      fontSize: 14,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    seniorBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
      backgroundColor: isDark ? '#78350f44' : '#fef3c7',
      borderWidth: 1,
      borderColor: '#f59e0b88',
    },
    seniorBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#d97706',
    },
    tlMeta: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    reportsToMeta: {
      fontSize: 10,
      color: '#6366f1',
      fontWeight: '600',
      marginTop: 1,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    tlCardToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingBottom: 10,
    },
    tlCardDecideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#0369a122' : '#e0f2fe',
      borderWidth: 1,
      borderColor: '#38bdf866',
    },
    tlCardDecideBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    tlCardScreenshotsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#164e6322' : '#cffafe',
      borderWidth: 1,
      borderColor: '#22d3ee66',
    },
    tlCardScreenshotsBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0891b2',
    },
    membersContainer: {
      paddingHorizontal: 14,
      paddingBottom: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      backgroundColor: isDark ? '#0f172a55' : '#f8fafc',
      gap: 8,
    },
    subTlBox: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: isDark ? '#78350f18' : '#fffbeb',
      borderWidth: 1,
      borderColor: '#f59e0b44',
      marginBottom: 6,
    },
    subTlBoxTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: '#d97706',
      letterSpacing: 0.5,
    },
    subTlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    subTlAvatar: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: '#fef3c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subTlAvatarText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#d97706',
    },
    subTlName: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    subTlDept: {
      fontSize: 10,
      color: themeColors.textSecondary,
    },
    subTlManageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 5,
      backgroundColor: isDark ? '#78350f33' : '#fef3c7',
      borderWidth: 1,
      borderColor: '#f59e0b55',
    },
    subTlManageBtnText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#d97706',
    },
    noMembersText: {
      fontSize: 12,
      color: themeColors.textSecondary,
      fontStyle: 'italic',
      paddingVertical: 6,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    memberDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#2563eb',
    },
    memberName: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    memberRole: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
    },
    coAssignedBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: isDark ? '#312e8133' : '#ede9fe',
      borderWidth: 1,
      borderColor: '#818cf855',
    },
    coAssignedBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#6366f1',
    },
    reassignBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    reassignBtnText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: themeColors.textPrimary,
    },
    unassignedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#d9770644',
      backgroundColor: isDark ? '#78350f11' : '#fffbeb',
      marginBottom: 8,
    },
    unassignedName: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    unassignedDept: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    assignBtn: {
      backgroundColor: '#d97706',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    assignBtnText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '700',
    },

    // -------------------------------------------------------------
    // DECIDE TL SCREENSHOT ACCESS FULL MODAL STYLES
    // -------------------------------------------------------------
    fullModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    fullModalSheet: {
      width: '100%',
      height: '92%',
      backgroundColor: themeColors.cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: themeColors.border,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    modalDragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? '#475569' : '#cbd5e1',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    fullModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    },
    modalShieldIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? '#0369a133' : '#e0f2fe',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullModalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    fullModalSubtitle: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
      marginTop: 1,
    },
    modalCloseBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
    },

    // Horizontal Scroll helper
    horizontalScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },

    // TL Selector
    tlSelectorSection: {
      paddingVertical: 8,
      backgroundColor: isDark ? '#0f172a88' : '#f1f5f988',
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    tlSelectorLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      color: themeColors.textSecondary,
      letterSpacing: 0.6,
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    tlChipsContainer: {
      paddingHorizontal: 16,
      gap: 8,
      alignItems: 'center',
    },
    tlChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderWidth: 1,
      borderColor: themeColors.border,
      maxWidth: 200,
    },
    tlChipSelected: {
      borderWidth: 1.5,
    },
    tlChipAvatar: {
      width: 26,
      height: 26,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tlChipAvatarText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ffffff',
    },
    tlChipName: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    tlChipDept: {
      fontSize: 9.5,
      color: themeColors.textSecondary,
    },
    tlChipCountBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
    },
    tlChipCountBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },

    // Active TL Banner
    activeTlBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: isDark ? '#0369a118' : '#f0f9ff',
      borderBottomWidth: 1,
      borderBottomColor: '#0284c733',
    },
    activeTlBannerTitle: {
      fontSize: 12,
      color: themeColors.textPrimary,
    },
    activeTlBannerDesc: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
      marginTop: 1,
    },
    activeTlCountBadge: {
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: isDark ? '#0369a133' : '#e0f2fe',
      borderWidth: 1,
      borderColor: '#0284c755',
    },
    activeTlCountBadgeVal: {
      fontSize: 14,
      fontWeight: '900',
      color: '#0284c7',
    },
    activeTlCountBadgeLbl: {
      fontSize: 9,
      fontWeight: '700',
      color: '#0284c7',
    },

    // Filter Tabs
    filterTabsWrapper: {
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    filterTabsRow: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      gap: 6,
      alignItems: 'center',
    },
    filterTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterTabActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    filterTabText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    filterTabTextActive: {
      color: '#ffffff',
      fontWeight: '800',
    },

    // Modal Search Row
    modalSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    modalSearchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 36,
    },
    modalSearchInput: {
      flex: 1,
      fontSize: 12,
      color: themeColors.textPrimary,
      padding: 0,
    },
    quickBulkRow: {
      flexDirection: 'row',
      gap: 6,
    },
    bulkBtn: {
      paddingHorizontal: 10,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bulkBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },

    // Dept Chips
    deptChipsWrapper: {
      paddingBottom: 6,
    },
    deptChipsRow: {
      paddingHorizontal: 16,
      gap: 6,
      alignItems: 'center',
    },
    deptChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deptChipActive: {
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      borderColor: themeColors.textPrimary,
    },
    deptChipText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    deptChipTextActive: {
      color: themeColors.textPrimary,
      fontWeight: '800',
    },

    // Modal List Scroll
    modalListScroll: {
      flex: 1,
      paddingHorizontal: 16,
    },
    modalEmptyState: {
      paddingVertical: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalEmptyText: {
      fontSize: 12,
      color: themeColors.textSecondary,
      fontStyle: 'italic',
    },
    memberSelectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#1e293b44' : '#ffffff',
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 8,
    },
    memberSelectRowChecked: {
      backgroundColor: isDark ? '#0369a11a' : '#f0f9ff',
      borderColor: '#0284c7',
      borderLeftWidth: 4,
      borderLeftColor: '#0284c7',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: themeColors.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
    },
    checkboxChecked: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    memberSelectAvatar: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberSelectAvatarText: {
      fontSize: 12,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    memberSelectName: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    memberSelectDept: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    subTlChip: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: '#fef3c7',
      borderWidth: 1,
      borderColor: '#f59e0b55',
    },
    subTlChipText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#d97706',
    },

    // Modal Footer
    fullModalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 28 : 14,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
    },
    fullModalCancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullModalCancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    fullModalSaveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: '#0284c7',
    },
    fullModalSaveBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    },

    // -------------------------------------------------------------
    // MODAL 2: SINGLE REASSIGN MODAL STYLES
    // -------------------------------------------------------------
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalSheet: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: themeColors.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    tlOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 8,
    },
    tlOptionRowSelected: {
      backgroundColor: '#2563eb11',
      borderColor: '#2563eb',
    },
    tlOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textPrimary,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    modalSaveBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#2563eb',
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
}
