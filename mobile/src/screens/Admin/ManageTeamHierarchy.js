import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import { getEmployees, subscribe } from '../../store/store';
import { updateEmployeeTlApi } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const TL_PALETTES = [
  { accent: '#6366f1', bg: '#e0e7ff', darkBg: '#312e81' },
  { accent: '#0891b2', bg: '#cffafe', darkBg: '#164e63' },
  { accent: '#16a34a', bg: '#dcfce7', darkBg: '#14532d' },
  { accent: '#d97706', bg: '#fef3c7', darkBg: '#78350f' },
  { accent: '#db2777', bg: '#fce7f3', darkBg: '#831843' },
  { accent: '#7c3aed', bg: '#ede9fe', darkBg: '#4c1d95' },
];

export default function ManageTeamHierarchy({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedTls, setCollapsedTls] = useState({});

  // Assignment Modal
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedTlId, setSelectedTlId] = useState('');
  const [saving, setSaving] = useState(false);

  const isTL = (role) => {
    const r = (role || '').toLowerCase();
    return r === 'tl' || r === 'team leader' || r === 'team lead' || r === 'team_lead';
  };

  const EXCLUDED_ROLES = ['client', 'admin', 'superadmin', 'management', 'hr', 'hr management', 'dns manager', 'candidate'];

  const loadData = () => {
    try {
      const emps = getEmployees() || [];
      setEmployees(emps);
    } catch (err) {
      console.error(err);
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

  const handleSaveTlAssignment = async () => {
    if (!selectedEmp) return;
    setSaving(true);
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
      setSaving(false);
    }
  };

  const openAssignModal = (emp) => {
    setSelectedEmp(emp);
    setSelectedTlId(emp.tl_id || '');
    setAssignModalVisible(true);
  };

  const teamLeaders = employees.filter((emp) => isTL(emp.role) && emp.status !== 'Inactive');
  const regularEmployees = employees.filter((emp) => {
    const r = (emp.role || '').toLowerCase();
    return (
      !isTL(emp.role) &&
      emp.status !== 'Inactive' &&
      !EXCLUDED_ROLES.includes(r) &&
      !r.includes('marketing') &&
      !r.includes('candidate')
    );
  });

  const q = searchQuery.toLowerCase();
  const unassignedEmployees = regularEmployees.filter(
    (e) => !e.tl_id || e.tl_id === '' || e.tl_id === '0'
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <AppIcon name="arrow-left" size={18} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>🌳 Team Hierarchy Tree</Text>
            <Text style={styles.subtitle}>Team Leaders & member reporting structure</Text>
          </View>
        </View>
      </View>

      {/* KPI Stats Grid */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{teamLeaders.length}</Text>
          <Text style={styles.statLabel}>👔 Team Leaders</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#16a34a' }]}>
            {regularEmployees.length - unassignedEmployees.length}
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
          <Text style={styles.sectionHeader}>LEADERSHIP TEAMS ({teamLeaders.length})</Text>

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
              const members = regularEmployees.filter(
                (m) => String(m.tl_id) === String(tl.id) || String(m.teamLeaderId) === String(tl.id)
              );

              const filteredMembers = members.filter(
                (m) =>
                  (m.name || '').toLowerCase().includes(q) ||
                  (m.department || '').toLowerCase().includes(q) ||
                  (m.role || '').toLowerCase().includes(q)
              );

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
                          {(tl.name || 'TL').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tlName}>{tl.name}</Text>
                        <Text style={styles.tlMeta}>
                          {tl.department || 'Operations'} • {members.length} Specialists
                        </Text>
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

                  {/* Expandable Members List */}
                  {!isCollapsed && (
                    <View style={styles.membersContainer}>
                      {filteredMembers.length === 0 ? (
                        <Text style={styles.noMembersText}>
                          {members.length === 0
                            ? 'No specialists assigned under this Team Leader.'
                            : 'No members match search query.'}
                        </Text>
                      ) : (
                        filteredMembers.map((emp) => (
                          <View key={emp.id} style={styles.memberRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <View style={styles.memberDot} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.memberName}>{emp.name}</Text>
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
                              <Text style={styles.reassignBtnText}>Reassign</Text>
                            </TouchableOpacity>
                          </View>
                        ))
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
              <Text style={[styles.sectionHeader, { color: '#d97706' }]}>
                ⚠️ UNASSIGNED SPECIALISTS ({unassignedEmployees.length})
              </Text>

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

      {/* MODAL: ASSIGN TEAM LEADER */}
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
                  disabled={saving}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveTlAssignment}
                  disabled={saving}
                >
                  {saving ? (
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
      fontSize: 16,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
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
    sectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: themeColors.textSecondary,
      marginBottom: 6,
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
      fontSize: 16,
      fontWeight: '800',
    },
    tlName: {
      fontSize: 14,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    tlMeta: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
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
    membersContainer: {
      paddingHorizontal: 14,
      paddingBottom: 12,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      backgroundColor: isDark ? '#0f172a55' : '#f8fafc',
      gap: 8,
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
