import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchScreenshotsListApi,
  deleteScreenshotApi,
  deleteAllScreenshotsApi,
  resolveScreenshotImageUrl,
} from '../../utils/api';
import { getEmployees } from '../../store/store';
import { sweetAlert } from '../../utils/sweetAlert';

const { width, height } = Dimensions.get('window');

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ManageScreenshots({ user, onBack }) {
  const { isDark, themeColors } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [screenshots, setScreenshots] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [stats, setStats] = useState({ todayCaptures: 0, todayMonitoredEmployees: 0, todayAvgActivity: 100 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [limitFilter, setLimitFilter] = useState('100'); // '50', '100', '200', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'feed'
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Inspector Modal
  const [inspectItem, setInspectItem] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Load Employees
  useEffect(() => {
    try {
      const emps = getEmployees() || [];
      setEmployeesList(emps);
    } catch (e) {}
  }, []);

  const departments = useMemo(() => {
    const depts = new Set();
    employeesList.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts);
  }, [employeesList]);

  // Load Screenshots
  const loadScreenshots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchScreenshotsListApi({
        employeeId: selectedEmployee,
        department: selectedDepartment,
        date: selectedDate,
        limit: limitFilter,
      });

      if (res && res.success) {
        setScreenshots(res.data || []);
        if (res.stats) {
          setStats(res.stats);
        } else {
          // Compute client stats
          const data = res.data || [];
          const uniqueEmps = new Set(data.map(d => d.employeeId)).size;
          const avgScore = data.length > 0
            ? Math.round(data.reduce((acc, curr) => acc + (Number(curr.activityScore) || 100), 0) / data.length)
            : 100;
          setStats({
            todayCaptures: data.length,
            todayMonitoredEmployees: uniqueEmps,
            todayAvgActivity: avgScore,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load screenshots:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedEmployee, selectedDepartment, selectedDate, limitFilter]);

  useEffect(() => {
    loadScreenshots();
  }, [loadScreenshots]);

  const onRefresh = () => {
    setRefreshing(true);
    loadScreenshots();
  };

  // Filtered Screenshots
  const filteredScreenshots = useMemo(() => {
    return screenshots.filter(item => {
      const matchSearch =
        !searchQuery ||
        (item.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.systemNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ipAddress || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [screenshots, searchQuery]);

  // Grouped by Employee
  const groupedByEmployee = useMemo(() => {
    const groups = {};
    filteredScreenshots.forEach(sc => {
      const empId = sc.employeeId || 'Unknown';
      if (!groups[empId]) {
        groups[empId] = {
          employeeId: empId,
          employeeName: sc.employeeName || 'Unknown Employee',
          department: sc.department || 'General',
          systemNumber: sc.systemNumber || 'N/A',
          items: [],
        };
      }
      groups[empId].items.push(sc);
    });
    return Object.values(groups);
  }, [filteredScreenshots]);

  // Delete Single Screenshot
  const handleDeleteScreenshot = (item) => {
    sweetAlert({
      title: 'Delete Screenshot?',
      text: `Are you sure you want to permanently delete this capture taken at ${new Date(item.capturedAt).toLocaleTimeString()}?`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const res = await deleteScreenshotApi(item.id);
          if (res.success) {
            sweetAlert({ title: 'Deleted', text: 'Screenshot removed successfully.', type: 'success' });
            setInspectItem(null);
            setScreenshots(prev => prev.filter(s => s.id !== item.id));
          } else {
            throw new Error(res.error || 'Failed to delete');
          }
        } catch (err) {
          sweetAlert({ title: 'Error', text: err.message || 'Could not delete screenshot.', type: 'error' });
        }
      },
    });
  };

  // Delete All Screenshots for Employee
  const handleDeleteEmployeeCaptures = (empId, empName) => {
    sweetAlert({
      title: 'Delete All Captures?',
      text: `Permanently delete all stored desktop screenshots for ${empName}? This action cannot be reversed.`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const res = await deleteAllScreenshotsApi(empId);
          if (res.success) {
            sweetAlert({ title: 'Deleted', text: `All screenshots for ${empName} were removed.`, type: 'success' });
            setScreenshots(prev => prev.filter(s => s.employeeId !== empId));
          } else {
            throw new Error(res.error || 'Failed to delete captures');
          }
        } catch (err) {
          sweetAlert({ title: 'Error', text: err.message || 'Could not delete captures.', type: 'error' });
        }
      },
    });
  };

  const toggleGroup = (empId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <AppIcon name="arrow-left" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>Desktop Live Monitoring</Text>
            <Text style={styles.headerSub}>Live workstation screen captures & logs</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterModalVisible(true)}
          >
            <AppIcon name="sliders" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <AppIcon name="refresh-cw" size={16} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Stats Row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: '#2563eb' }]}>{stats.todayCaptures}</Text>
          <Text style={styles.kpiLabel}>Today Captures</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: '#10b981' }]}>{stats.todayMonitoredEmployees}</Text>
          <Text style={styles.kpiLabel}>Active Workstations</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: '#f59e0b' }]}>{stats.todayAvgActivity}%</Text>
          <Text style={styles.kpiLabel}>Avg Activity</Text>
        </View>
      </View>

      {/* Search & View Mode Switcher */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <AppIcon name="search" size={15} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee, dept, system..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="x" size={14} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'grouped' && styles.modeBtnActive]}
            onPress={() => setViewMode('grouped')}
          >
            <AppIcon
              name="layers"
              size={15}
              color={viewMode === 'grouped' ? '#ffffff' : themeColors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'feed' && styles.modeBtnActive]}
            onPress={() => setViewMode('feed')}
          >
            <AppIcon
              name="grid"
              size={15}
              color={viewMode === 'feed' ? '#ffffff' : themeColors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching live desktop captures...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        >
          {filteredScreenshots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🖥️</Text>
              <Text style={styles.emptyTitle}>No Desktop Captures Found</Text>
              <Text style={styles.emptySub}>
                Workstation screenshots will appear once employee desktop agents are online.
              </Text>
            </View>
          ) : viewMode === 'grouped' ? (
            /* GROUPED VIEW BY EMPLOYEE */
            groupedByEmployee.map(group => {
              const isCollapsed = collapsedGroups[group.employeeId];
              const latestCapture = group.items[0];

              return (
                <View key={group.employeeId} style={styles.employeeGroupCard}>
                  {/* Accordion Header */}
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleGroup(group.employeeId)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={styles.avatarPill}>
                        <Text style={styles.avatarPillText}>
                          {group.employeeName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.groupName}>{group.employeeName}</Text>
                        <Text style={styles.groupMeta}>
                          {group.department} • {group.systemNumber} • {group.items.length} Captures
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.deleteGroupBtn}
                        onPress={() => handleDeleteEmployeeCaptures(group.employeeId, group.employeeName)}
                      >
                        <AppIcon name="trash-2" size={14} color="#ef4444" />
                      </TouchableOpacity>

                      <AppIcon
                        name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                        size={18}
                        color={themeColors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Thumbnail Row / Grid */}
                  {!isCollapsed && (
                    <View style={styles.groupContent}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalThumbRow}
                      >
                        {group.items.map((item, idx) => {
                          const imgUrl = resolveScreenshotImageUrl(item.imageUrl);
                          const captureTime = new Date(item.capturedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <TouchableOpacity
                              key={item.id || idx}
                              style={styles.thumbCard}
                              onPress={() => setInspectItem(item)}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={{ uri: imgUrl }}
                                style={styles.thumbImage}
                                resizeMode="cover"
                              />
                              <View style={styles.thumbOverlay}>
                                <Text style={styles.thumbTimeText}>🕒 {captureTime}</Text>
                                <View style={styles.thumbActivityBadge}>
                                  <Text style={styles.thumbActivityText}>
                                    {item.activityScore || 100}%
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            /* FEED GRID VIEW */
            <View style={styles.feedGrid}>
              {filteredScreenshots.map((item, idx) => {
                const imgUrl = resolveScreenshotImageUrl(item.imageUrl);
                const captureTime = new Date(item.capturedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.feedCard}
                    onPress={() => setInspectItem(item)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: imgUrl }}
                      style={styles.feedImage}
                      resizeMode="cover"
                    />
                    <View style={styles.feedInfo}>
                      <Text style={styles.feedEmpName} numberOfLines={1}>
                        {item.employeeName}
                      </Text>
                      <View style={styles.feedMetaRow}>
                        <Text style={styles.feedMetaText}>🕒 {captureTime}</Text>
                        <Text style={[styles.feedMetaText, { color: '#10b981', fontWeight: '700' }]}>
                          {item.activityScore || 100}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* INSPECT SCREENSHOT FULLSCREEN MODAL */}
      <Modal
        visible={!!inspectItem}
        transparent
        animationType="fade"
        onRequestClose={() => setInspectItem(null)}
      >
        <View style={styles.inspectOverlay}>
          <View style={styles.inspectHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectTitle}>{inspectItem?.employeeName}</Text>
              <Text style={styles.inspectSub}>
                {inspectItem?.department} • {inspectItem?.systemNumber} • {inspectItem?.ipAddress}
              </Text>
            </View>

            <TouchableOpacity style={styles.inspectCloseBtn} onPress={() => setInspectItem(null)}>
              <AppIcon name="x" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.inspectImageContainer}>
            {inspectItem?.imageUrl ? (
              <Image
                source={{ uri: resolveScreenshotImageUrl(inspectItem.imageUrl) }}
                style={styles.inspectImageFull}
                resizeMode="contain"
              />
            ) : null}
          </View>

          <View style={styles.inspectFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectFooterText}>
                Captured: {new Date(inspectItem?.capturedAt || Date.now()).toLocaleString()}
              </Text>
              <Text style={styles.inspectFooterText}>
                Activity Score: <Text style={{ color: '#10b981', fontWeight: '700' }}>{inspectItem?.activityScore || 100}%</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {inspectItem?.imageUrl ? (
                <TouchableOpacity
                  style={styles.inspectActionBtn}
                  onPress={() => Linking.openURL(resolveScreenshotImageUrl(inspectItem.imageUrl)).catch(() => {})}
                >
                  <AppIcon name="external-link" size={16} color="#ffffff" />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.inspectActionBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => handleDeleteScreenshot(inspectItem)}
              >
                <AppIcon name="trash-2" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FILTER DRAWER / MODAL */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Screenshots</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <AppIcon name="x" size={18} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.filterChip, selectedDepartment === 'all' && styles.filterChipActive]}
                onPress={() => setSelectedDepartment('all')}
              >
                <Text style={[styles.filterChipText, selectedDepartment === 'all' && styles.filterChipTextActive]}>
                  All Departments
                </Text>
              </TouchableOpacity>
              {departments.map(dept => (
                <TouchableOpacity
                  key={dept}
                  style={[styles.filterChip, selectedDepartment === dept && styles.filterChipActive]}
                  onPress={() => setSelectedDepartment(dept)}
                >
                  <Text style={[styles.filterChipText, selectedDepartment === dept && styles.filterChipTextActive]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterSectionTitle}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={themeColors.textSecondary}
            />

            <Text style={styles.filterSectionTitle}>Max Limit</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['50', '100', '200', 'all'].map(lim => (
                <TouchableOpacity
                  key={lim}
                  style={[styles.filterChip, limitFilter === lim && styles.filterChipActive, { flex: 1, alignItems: 'center' }]}
                  onPress={() => setLimitFilter(lim)}
                >
                  <Text style={[styles.filterChipText, limitFilter === lim && styles.filterChipTextActive]}>
                    {lim === 'all' ? 'All' : lim}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyFilterBtn}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFilterBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background || (isDark ? '#0f172a' : '#f8fafc'),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      backgroundColor: colors.headerBg || (isDark ? '#1e293b' : '#ffffff'),
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    headerSub: {
      fontSize: 11,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    filterBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? '#334155' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#bfdbfe',
    },
    refreshBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#475569' : '#e2e8f0'),
    },
    kpiRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 10,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    kpiVal: {
      fontSize: 17,
      fontWeight: '800',
    },
    kpiLabel: {
      fontSize: 10.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    searchRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      alignItems: 'center',
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 12.5,
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      paddingVertical: 0,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      padding: 2,
    },
    modeBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    modeBtnActive: {
      backgroundColor: '#2563eb',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: colors.textSecondary || '#64748b',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    emptyCard: {
      padding: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      textAlign: 'center',
    },
    employeeGroupCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 12,
      overflow: 'hidden',
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || (isDark ? '#334155' : '#f1f5f9'),
    },
    avatarPill: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarPillText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#ffffff',
    },
    groupName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    groupMeta: {
      fontSize: 11,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    deleteGroupBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: '#fee2e2',
    },
    groupContent: {
      padding: 12,
    },
    horizontalThumbRow: {
      gap: 10,
    },
    thumbCard: {
      width: 150,
      height: 95,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#cbd5e1'),
      position: 'relative',
    },
    thumbImage: {
      width: '100%',
      height: '100%',
    },
    thumbOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    thumbTimeText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#ffffff',
    },
    thumbActivityBadge: {
      backgroundColor: '#10b981',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    thumbActivityText: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#ffffff',
    },
    feedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    feedCard: {
      width: (width - 42) / 2,
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      overflow: 'hidden',
    },
    feedImage: {
      width: '100%',
      height: 105,
    },
    feedInfo: {
      padding: 8,
    },
    feedEmpName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    feedMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    feedMetaText: {
      fontSize: 10,
      color: colors.textSecondary || '#64748b',
    },
    inspectOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'space-between',
    },
    inspectHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 12,
    },
    inspectTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
    },
    inspectSub: {
      fontSize: 11,
      color: '#cbd5e1',
      marginTop: 2,
    },
    inspectCloseBtn: {
      padding: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    inspectImageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
    },
    inspectImageFull: {
      width: '100%',
      height: '100%',
    },
    inspectFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 40,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
    },
    inspectFooterText: {
      fontSize: 11,
      color: '#cbd5e1',
      marginBottom: 2,
    },
    inspectActionBtn: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    filterSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#cbd5e1'),
      marginRight: 6,
    },
    filterChipActive: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
    filterChipText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary || '#64748b',
    },
    filterChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    dateInput: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#cbd5e1'),
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 14,
    },
    applyFilterBtn: {
      backgroundColor: '#2563eb',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    applyFilterBtnText: {
      color: '#ffffff',
      fontSize: 13.5,
      fontWeight: '700',
    },
  });
