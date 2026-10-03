import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';
import AppIcon from '../../components/AppIcon';
import {
  getDepartments,
  addDepartment,
  deleteDepartment,
  getEmployees,
  getSystems,
  subscribe,
} from '../../store/store';

export default function ManageDepartments({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [departments, setDepartments] = useState(() => getDepartments());
  const [employees, setEmployees] = useState(() => getEmployees());
  const [systems, setSystems] = useState(() => getSystems());
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  // Details Modal States
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptDetailsModalVisible, setDeptDetailsModalVisible] = useState(false);
  const [deptModalTab, setDeptModalTab] = useState('members'); // 'members' | 'devices'

  const refreshData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
    setSystems(getSystems());
  };

  useEffect(() => {
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const handleSaveDept = () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) {
      sweetAlert({ title: 'Error', text: 'Please enter a department name.', type: 'error' });
      return;
    }
    const res = addDepartment(trimmed, currentUser?.name || 'Admin');
    if (res) {
      sweetAlert({ title: 'Success', text: `Department "${trimmed}" added successfully!`, type: 'success' });
      setNewDeptName('');
      setModalVisible(false);
      refreshData();
    } else {
      sweetAlert({ title: 'Error', text: 'Department already exists or name is invalid.', type: 'error' });
    }
  };

  const handleDeleteDept = (dept) => {
    const count = employees.filter(
      (e) => e.department && e.department.toLowerCase() === dept.name.toLowerCase()
    ).length;

    if (count > 0) {
      sweetAlert({
        title: 'Cannot Delete',
        text: `Department "${dept.name}" currently has ${count} employee(s) assigned. Reassign them before deleting.`,
        type: 'error',
      });
      return;
    }

    sweetAlert({
      title: 'Confirm Delete',
      text: `Are you sure you want to delete "${dept.name}"?`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        deleteDepartment(dept.id, currentUser?.name || 'Admin');
        refreshData();
        sweetAlert({ title: 'Success', text: 'Department removed successfully.', type: 'success' });
      },
    });
  };

  const filteredDepts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(query));
  }, [departments, searchQuery]);

  // Overall stats
  const totalEmployeesAssigned = useMemo(() => {
    const deptNames = departments.map((d) => d.name.toLowerCase());
    return employees.filter((e) => e.department && deptNames.includes(e.department.toLowerCase())).length;
  }, [departments, employees]);

  const totalDevicesAssigned = useMemo(() => {
    return systems.filter((s) => s.assignedTo).length;
  }, [systems]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 20, color: themeColors.accent || '#3b82f6', fontWeight: 'bold' }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Departments & Teams</Text>
          <Text style={styles.headerSubtitle}>
            {departments.length} departments • {totalEmployeesAssigned} active employees
          </Text>
        </View>

        <TouchableOpacity style={styles.addDeptBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.addDeptBtnText}>+ Add Dept</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Quick Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.metricVal}>{departments.length}</Text>
            <Text style={styles.metricLbl}>🏢 Departments</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.metricVal}>{totalEmployeesAssigned}</Text>
            <Text style={styles.metricLbl}>👥 Staff Assigned</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.metricVal}>{totalDevicesAssigned}</Text>
            <Text style={styles.metricLbl}>🖥️ Active Fleet</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search departments..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Department List */}
        {filteredDepts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🏢</Text>
            <Text style={styles.emptyTitle}>No Departments Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? `No results match "${searchQuery}"` : 'Create your first department to organize your team.'}
            </Text>
          </View>
        ) : (
          filteredDepts.map((dept) => {
            const deptEmps = employees.filter(
              (e) => e.department && e.department.toLowerCase() === dept.name.toLowerCase()
            );
            const empCount = deptEmps.length;
            const deptMemberIds = deptEmps.map((m) => m.id);
            const devCount = systems.filter((s) => s.assignedTo && deptMemberIds.includes(s.assignedTo)).length;

            return (
              <View key={dept.id} style={styles.deptCard}>
                <View style={styles.deptCardHeader}>
                  <View style={styles.deptIconBadge}>
                    <Text style={styles.deptIconText}>
                      {dept.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.deptName} numberOfLines={1}>{dept.name}</Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.pillBadge}>
                        <Text style={styles.pillBadgeText}>👥 {empCount} staff</Text>
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff' }]}>
                        <Text style={[styles.pillBadgeText, { color: '#8b5cf6' }]}>🖥️ {devCount} devices</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Member Preview Avatars */}
                {empCount > 0 && (
                  <View style={styles.avatarPreviewRow}>
                    <Text style={styles.avatarPreviewLabel}>Team Members:</Text>
                    <View style={styles.avatarList}>
                      {deptEmps.slice(0, 4).map((emp, idx) => (
                        <View key={emp.id || idx} style={[styles.miniAvatar, { marginLeft: idx > 0 ? -6 : 0 }]}>
                          <Text style={styles.miniAvatarText}>
                            {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                          </Text>
                        </View>
                      ))}
                      {empCount > 4 && (
                        <View style={[styles.miniAvatar, styles.miniAvatarMore, { marginLeft: -6 }]}>
                          <Text style={styles.miniAvatarMoreText}>+{empCount - 4}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Actions Row */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => {
                      setSelectedDept(dept);
                      setDeptModalTab('members');
                      setDeptDetailsModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewDetailsBtnText}>View Details ↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteDept(dept)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Department Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdropTouch}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Add New Department</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNewDeptName('');
                      setModalVisible(false);
                    }}
                    style={styles.modalCloseBtn}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Department Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sales, Marketing, IT Support"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newDeptName}
                  onChangeText={setNewDeptName}
                  autoFocus={true}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setNewDeptName('');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDept} activeOpacity={0.8}>
                    <Text style={styles.saveBtnText}>Save Department</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Department Details Modal */}
      <Modal
        visible={deptDetailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSelectedDept(null);
          setDeptDetailsModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '82%', paddingBottom: 15 }]}>
            {selectedDept && (() => {
              const deptMembers = employees.filter(
                (e) => e.department && e.department.toLowerCase() === selectedDept.name.toLowerCase()
              );
              const memberIds = deptMembers.map((m) => m.id);
              const deptDevices = systems.filter((s) => s.assignedTo && memberIds.includes(s.assignedTo));

              return (
                <View style={{ flex: 1 }}>
                  <View style={styles.modalHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <View style={[styles.deptIconBadge, { width: 32, height: 32, borderRadius: 8 }]}>
                        <Text style={[styles.deptIconText, { fontSize: 14 }]}>
                          {selectedDept.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.modalTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]} numberOfLines={1}>
                        {selectedDept.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedDept(null);
                        setDeptDetailsModalVisible(false);
                      }}
                      style={styles.modalCloseBtn}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tabs Selection */}
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tabButton, deptModalTab === 'members' && styles.tabButtonActive]}
                      onPress={() => setDeptModalTab('members')}
                    >
                      <Text style={[styles.tabButtonText, deptModalTab === 'members' && styles.tabButtonTextActive]}>
                        👥 Members ({deptMembers.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tabButton, deptModalTab === 'devices' && styles.tabButtonActive]}
                      onPress={() => setDeptModalTab('devices')}
                    >
                      <Text style={[styles.tabButtonText, deptModalTab === 'devices' && styles.tabButtonTextActive]}>
                        🖥️ Devices ({deptDevices.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ flex: 1, marginTop: 8 }} showsVerticalScrollIndicator={false}>
                    {deptModalTab === 'members' ? (
                      deptMembers.length === 0 ? (
                        <View style={styles.modalEmptyBox}>
                          <Text style={{ fontSize: 28, marginBottom: 4 }}>👥</Text>
                          <Text style={styles.modalEmptyText}>No employees currently in this department.</Text>
                        </View>
                      ) : (
                        deptMembers.map((emp) => {
                          const empSystems = systems.filter((s) => s.assignedTo === emp.id);
                          return (
                            <View key={emp.id} style={styles.detailItemCard}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.detailItemName}>{emp.name}</Text>
                                <View style={[styles.statusMiniBadge, emp.status === 'Paused' ? styles.badgePaused : styles.badgeActive]}>
                                  <Text style={[styles.statusMiniText, emp.status === 'Paused' ? { color: '#ef4444' } : { color: '#10b981' }]}>
                                    {emp.status || 'Active'}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.detailItemSub}>{emp.role} • {emp.email}</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                {empSystems.length === 0 ? (
                                  <Text style={{ color: themeColors.textSecondary, fontSize: 11, fontStyle: 'italic' }}>
                                    No hardware assigned
                                  </Text>
                                ) : (
                                  empSystems.map((sys) => (
                                    <View key={sys.id} style={styles.sysTag}>
                                      <Text style={styles.sysTagText}>🖥️ {sys.systemNo}</Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            </View>
                          );
                        })
                      )
                    ) : (
                      deptDevices.length === 0 ? (
                        <View style={styles.modalEmptyBox}>
                          <Text style={{ fontSize: 28, marginBottom: 4 }}>🖥️</Text>
                          <Text style={styles.modalEmptyText}>No devices allocated to this department.</Text>
                        </View>
                      ) : (
                        deptDevices.map((sys) => {
                          const assignee = deptMembers.find((m) => m.id === sys.assignedTo);
                          return (
                            <View key={sys.id} style={styles.detailItemCard}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.detailItemName}>🖥️ {sys.systemNo}</Text>
                                <View style={styles.sysTypeBadge}>
                                  <Text style={styles.sysTypeBadgeText}>{sys.os || 'System'}</Text>
                                </View>
                              </View>
                              <Text style={styles.detailItemSub}>{sys.model || 'Standard Workstation'}</Text>
                              <Text style={{ color: themeColors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                CPU: {sys.cpu || '—'} | RAM: {sys.ram || '—'} | GPU: {sys.gpu || '—'}
                              </Text>
                              <Text style={{ color: themeColors.accent || '#3b82f6', fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                                Assigned: {assignee ? assignee.name : 'Unassigned'}
                              </Text>
                            </View>
                          );
                        })
                      )
                    )}
                  </ScrollView>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (themeColors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.card,
    },
    backBtn: {
      paddingRight: 12,
      paddingVertical: 4,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    addDeptBtn: {
      backgroundColor: '#10b981',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    },
    addDeptBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    scrollContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderLeftWidth: 4,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    metricVal: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    metricLbl: {
      fontSize: 10.5,
      fontWeight: '600',
      color: themeColors.textSecondary,
      marginTop: 3,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 16,
      height: 44,
    },
    searchIcon: {
      fontSize: 14,
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      color: themeColors.textPrimary,
      fontSize: 14,
      padding: 0,
    },
    clearSearchBtn: {
      padding: 6,
    },
    clearSearchText: {
      color: themeColors.textSecondary,
      fontSize: 14,
      fontWeight: 'bold',
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: themeColors.textPrimary,
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 13,
      color: themeColors.textSecondary,
      textAlign: 'center',
    },
    deptCard: {
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    deptCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deptIconBadge: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#bfdbfe',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deptIconText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#2563eb',
    },
    deptName: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    pillBadge: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    pillBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#3b82f6',
    },
    avatarPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: themeColors.border,
    },
    avatarPreviewLabel: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginRight: 8,
      fontWeight: '600',
    },
    avatarList: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    miniAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: themeColors.card,
    },
    miniAvatarText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '700',
    },
    miniAvatarMore: {
      backgroundColor: themeColors.border,
    },
    miniAvatarMoreText: {
      color: themeColors.textPrimary,
      fontSize: 9,
      fontWeight: '700',
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: themeColors.border,
    },
    viewDetailsBtn: {
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37, 99, 235, 0.35)' : '#bfdbfe',
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    viewDetailsBtnText: {
      color: '#2563eb',
      fontSize: 12,
      fontWeight: '700',
    },
    deleteBtn: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    deleteBtnText: {
      color: '#ef4444',
      fontSize: 12,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalBackdropTouch: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 16,
      padding: 18,
      width: '100%',
      maxWidth: 420,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    modalCloseBtn: {
      padding: 6,
    },
    modalCloseText: {
      color: themeColors.textSecondary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    label: {
      color: themeColors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6,
    },
    input: {
      height: 44,
      backgroundColor: isDark ? themeColors.inputBg || '#121215' : '#ffffff',
      borderWidth: 1,
      borderColor: themeColors.inputBorder || themeColors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      color: themeColors.textPrimary,
      fontSize: 14,
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#27272a' : '#f1f5f9',
    },
    cancelBtnText: {
      color: themeColors.textPrimary,
      fontWeight: '600',
      fontSize: 13,
    },
    saveBtn: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 8,
      backgroundColor: '#10b981',
    },
    saveBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 10,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tabButtonActive: {
      borderBottomWidth: 2,
      borderColor: '#2563eb',
    },
    tabButtonText: {
      color: themeColors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    tabButtonTextActive: {
      color: '#2563eb',
    },
    modalEmptyBox: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalEmptyText: {
      color: themeColors.textSecondary,
      textAlign: 'center',
      fontSize: 13,
      marginTop: 4,
    },
    detailItemCard: {
      backgroundColor: isDark ? '#121215' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    detailItemName: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    detailItemSub: {
      fontSize: 12,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    statusMiniBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
    },
    badgeActive: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      borderColor: '#10b981',
    },
    badgePaused: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      borderColor: '#ef4444',
    },
    statusMiniText: {
      fontSize: 9.5,
      fontWeight: '700',
    },
    sysTag: {
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    sysTagText: {
      color: themeColors.accent || '#3b82f6',
      fontSize: 11,
      fontWeight: '600',
    },
    sysTypeBadge: {
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    sysTypeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#2563eb',
    },
  });
