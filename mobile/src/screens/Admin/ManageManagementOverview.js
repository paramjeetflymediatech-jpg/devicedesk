import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { fetchClientRequestsApi, fetchTasksApi, fetchEmployeesApi } from '../../utils/api';
import AppIcon from '../../components/AppIcon';

const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'Pending Assignment': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  Assigned: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  'In Progress': { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  'For TL Review': { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  Completed: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
};

export default function ManageManagementOverview({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const [requests, setRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [expandedReqs, setExpandedReqs] = useState({});

  const loadAllData = async () => {
    try {
      const [reqRes, taskRes, empRes] = await Promise.all([
        fetchClientRequestsApi().catch(() => ({ success: false, data: [] })),
        fetchTasksApi().catch(() => ({ success: false, tasks: [] })),
        fetchEmployeesApi().catch(() => ({ success: false, data: [] })),
      ]);

      if (reqRes && (reqRes.success || Array.isArray(reqRes.data))) {
        setRequests(reqRes.data || reqRes.requests || []);
      }
      if (taskRes && (taskRes.success || Array.isArray(taskRes.tasks))) {
        setTasks(taskRes.tasks || taskRes.data || []);
      }
      if (empRes && (empRes.success || Array.isArray(empRes.data))) {
        setEmployees(empRes.data || empRes.employees || []);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load Management Overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const toggleExpand = (id) => {
    setExpandedReqs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Enriched Requests
  const enrichedRequests = requests.map(req => {
    const relatedTasks = tasks.filter(t => t.project_id === req.id || t.projectId === req.id);
    const tlEmployee = employees.find(e => e.id === req.assigned_tl_id || e.id === req.assignedTlId);
    return { ...req, relatedTasks, tlEmployee };
  });

  const filtered = enrichedRequests.filter(req => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (req.client_name || req.clientId || req.clientName || '').toLowerCase().includes(q) ||
      (req.service_type || req.serviceType || '').toLowerCase().includes(q) ||
      (req.tl_name || req.tlName || '').toLowerCase().includes(q) ||
      (req.requirements || '').toLowerCase().includes(q);

    const currentStat = req.status || 'Pending';
    const matchStatus = filterStatus === 'All' || currentStat === filterStatus;
    return matchSearch && matchStatus;
  });

  // Summary Metrics
  const totalRequests = requests.length;
  const pendingAssignment = requests.filter(r => !r.assigned_tl_id && !r.assignedTlId).length;
  const inProgress = requests.filter(r => ['Assigned', 'In Progress', 'For TL Review'].includes(r.status)).length;
  const completed = requests.filter(r => r.status === 'Completed').length;

  const styles = getStyles(themeColors, isDark);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 18, color: themeColors.accent || '#3b82f6' }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Management Overview</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            End-to-End Client Service & Task Flow
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}
          onPress={onRefresh}
          disabled={loading || refreshing}
        >
          <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '700' }}>
            {refreshing ? '⟳ ...' : '⟳ Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary Grid */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
          <Text style={{ fontSize: 20, marginBottom: 2 }}>📊</Text>
          <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>{totalRequests}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Total Requests</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: isDark ? '#422006' : '#fffbeb', borderColor: isDark ? '#713f12' : '#fef3c7' }]}>
          <Text style={{ fontSize: 20, marginBottom: 2 }}>⏳</Text>
          <Text style={[styles.statNumber, { color: '#d97706' }]}>{pendingAssignment}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#fde68a' : '#b45309' }]}>Unassigned</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderColor: isDark ? '#312e81' : '#c7d2fe' }]}>
          <Text style={{ fontSize: 20, marginBottom: 2 }}>🚀</Text>
          <Text style={[styles.statNumber, { color: '#6366f1' }]}>{inProgress}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#c7d2fe' : '#4338ca' }]}>In Progress</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: isDark ? '#022c22' : '#f0fdf4', borderColor: isDark ? '#064e3b' : '#bbf7d0' }]}>
          <Text style={{ fontSize: 20, marginBottom: 2 }}>✅</Text>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{completed}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#a7f3d0' : '#15803d' }]}>Completed</Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={{ fontSize: 14, color: themeColors.textSecondary, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Search by client, service, TL..."
            placeholderTextColor={themeColors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {['All', 'Pending Assignment', 'Assigned', 'In Progress', 'For TL Review', 'Completed'].map(status => {
            const isSelected = filterStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? '#3b82f6' : (isDark ? '#1e293b' : '#f1f5f9'),
                    borderColor: isSelected ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0'),
                  }
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterPillText, { color: isSelected ? '#ffffff' : themeColors.textSecondary }]}>
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: themeColors.textSecondary, marginTop: 12 }}>Loading request pipelines...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        >
          {filtered.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📋</Text>
              <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Requests Found</Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                {search || filterStatus !== 'All' ? 'Try adjusting your search or filter criteria.' : 'No client requests have been submitted yet.'}
              </Text>
            </View>
          ) : (
            filtered.map((req) => {
              const statusCfg = STATUS_COLORS[req.status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
              const isExpanded = !!expandedReqs[req.id];
              const taskCount = req.relatedTasks?.length || 0;
              const completedTasks = req.relatedTasks?.filter(t => (t.status || '').toLowerCase() === 'completed').length || 0;

              return (
                <View key={req.id} style={[styles.reqCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  {/* Card Header */}
                  <View style={styles.reqCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.clientName, { color: themeColors.textPrimary }]}>
                          {req.client_name || req.clientName || 'Client Request'}
                        </Text>
                        <View style={[styles.serviceTag, { backgroundColor: isDark ? '#1e3a8a33' : '#eff6ff', borderColor: '#3b82f6' }]}>
                          <Text style={styles.serviceTagText}>{req.service_type || req.serviceType || 'Service'}</Text>
                        </View>
                      </View>
                      <Text style={[styles.reqDate, { color: themeColors.textSecondary }]}>
                        📅 {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: isDark ? `${statusCfg.border}22` : statusCfg.bg, borderColor: statusCfg.border }]}>
                      <Text style={[styles.statusBadgeText, { color: isDark ? '#f8fafc' : statusCfg.text }]}>
                        {req.status || 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* TL Assigned Section */}
                  <View style={[styles.tlInfoBox, { backgroundColor: isDark ? '#1e293b55' : '#f8fafc', borderColor: themeColors.border }]}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Assigned Team Leader:</Text>
                    {req.tl_name || req.assigned_tl_id ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={styles.tlAvatar}>
                          <Text style={styles.tlAvatarText}>
                            {(req.tl_name || 'TL').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.tlName, { color: themeColors.textPrimary }]}>
                          {req.tl_name || req.tlEmployee?.name || 'Assigned TL'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 13, color: '#f59e0b', fontWeight: '600', marginTop: 4 }}>
                        ⚠️ Awaiting TL Assignment
                      </Text>
                    )}
                  </View>

                  {/* Requirements Snippet */}
                  {req.requirements ? (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Requirements / Scope:</Text>
                      <Text style={[styles.requirementsText, { color: themeColors.textPrimary }]} numberOfLines={isExpanded ? undefined : 2}>
                        {req.requirements}
                      </Text>
                    </View>
                  ) : null}

                  {/* Deliverable Link if any */}
                  {req.deliverable_url ? (
                    <TouchableOpacity
                      style={styles.deliverableBtn}
                      onPress={() => Linking.openURL(req.deliverable_url).catch(() => {})}
                    >
                      <Text style={{ fontSize: 13 }}>🔗</Text>
                      <Text style={styles.deliverableBtnText} numberOfLines={1}>
                        Deliverable: {req.deliverable_url}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Sub-Tasks Breakdown Header & Toggle */}
                  <TouchableOpacity
                    style={[styles.taskToggleBar, { borderTopColor: themeColors.border }]}
                    onPress={() => toggleExpand(req.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14 }}>📋</Text>
                      <Text style={[styles.taskToggleText, { color: themeColors.textPrimary }]}>
                        Assigned Sub-Tasks ({completedTasks}/{taskCount})
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '700' }}>
                      {isExpanded ? 'Hide ▲' : 'Show ▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* Sub-tasks Expanded Content */}
                  {isExpanded && (
                    <View style={[styles.taskListContainer, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: themeColors.border }]}>
                      {taskCount === 0 ? (
                        <Text style={{ fontSize: 12.5, color: themeColors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: 12 }}>
                          No sub-tasks broken down yet by the Team Leader.
                        </Text>
                      ) : (
                        req.relatedTasks.map(t => {
                          const tStatus = (t.status || 'Pending').toLowerCase();
                          const isDone = tStatus === 'completed' || tStatus === 'done';
                          return (
                            <View key={t.id} style={[styles.taskRow, { borderBottomColor: themeColors.border }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.taskRowTitle, { color: themeColors.textPrimary }]}>{t.title || 'Task'}</Text>
                                <Text style={[styles.taskRowMeta, { color: themeColors.textSecondary }]}>
                                  👤 {t.assigned_to_name || t.assignedToName || 'Employee'} {t.due_date ? `• ⏰ ${t.due_date}` : ''}
                                </Text>
                              </View>
                              <View style={[styles.taskStatusMini, { backgroundColor: isDone ? '#dcfce7' : '#fef3c7' }]}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: isDone ? '#15803d' : '#b45309' }}>
                                  {t.status || 'Pending'}
                                </Text>
                              </View>
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
        </ScrollView>
      )}
    </View>
  );
}

function getStyles(colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      gap: 12,
    },
    backBtn: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    refreshBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    statNumber: {
      fontSize: 16,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 9.5,
      fontWeight: '600',
      marginTop: 2,
      textAlign: 'center',
    },
    filterSection: {
      paddingBottom: 8,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      padding: 0,
    },
    pillScroll: {
      flexGrow: 0,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
    },
    centerLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
    },
    listScroll: {
      flex: 1,
    },
    emptyCard: {
      padding: 30,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      marginTop: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    reqCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 14,
    },
    reqCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    clientName: {
      fontSize: 15,
      fontWeight: '800',
    },
    serviceTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    serviceTagText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#3b82f6',
    },
    reqDate: {
      fontSize: 11.5,
      marginTop: 4,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    tlInfoBox: {
      marginTop: 12,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    tlAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#6366f1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tlAvatarText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    tlName: {
      fontSize: 13,
      fontWeight: '700',
    },
    requirementsText: {
      fontSize: 12.5,
      marginTop: 4,
      lineHeight: 18,
    },
    deliverableBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#10b98118',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#10b98144',
    },
    deliverableBtnText: {
      fontSize: 12,
      color: '#10b981',
      fontWeight: '600',
      flex: 1,
    },
    taskToggleBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    taskToggleText: {
      fontSize: 13,
      fontWeight: '700',
    },
    taskListContainer: {
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      overflow: 'hidden',
    },
    taskRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      gap: 8,
    },
    taskRowTitle: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    taskRowMeta: {
      fontSize: 11,
      marginTop: 2,
    },
    taskStatusMini: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
  });
}
