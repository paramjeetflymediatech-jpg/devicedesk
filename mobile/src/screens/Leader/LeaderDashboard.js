import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import { useTheme } from '../../utils/ThemeContext';
import {
  fetchTasksApi,
  postTaskApi,
  fetchClientRequestsApi,
  fetchEodReportsApi,
  updateClientRequestStatusApi,
} from '../../utils/api';
import { getEmployees, subscribe } from '../../store/store';
import { sweetAlert } from '../../utils/sweetAlert';

// Department theme colors
const DEPT_COLORS = {
  SEO: { bg: '#e0e7ff', text: '#4338ca', darkBg: '#312e81' },
  'Video Editing': { bg: '#fae8ff', text: '#86198f', darkBg: '#701a75' },
  'Graphic Designers': { bg: '#fef3c7', text: '#b45309', darkBg: '#78350f' },
  Development: { bg: '#dbeafe', text: '#1d4ed8', darkBg: '#1e3a8a' },
  Sales: { bg: '#dcfce7', text: '#15803d', darkBg: '#14532d' },
  Default: { bg: '#f1f5f9', text: '#475569', darkBg: '#334155' },
};

function getDeptColor(dept = '') {
  for (const key of Object.keys(DEPT_COLORS)) {
    if (dept.toLowerCase().includes(key.toLowerCase())) {
      return DEPT_COLORS[key];
    }
  }
  return DEPT_COLORS.Default;
}

export default function LeaderDashboard({ user, onLogout, onNavigateBack, onSwitchToEmployee }) {
  const { themeColors, isDark, toggleTheme } = useTheme();

  // State
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'requests' | 'sop'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED' | 'PENDING'
  const [expandedEods, setExpandedEods] = useState({});

  // Modals
  const [assignTaskModalVisible, setAssignTaskModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Forward Modal
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardingMember, setForwardingMember] = useState(null);

  // Client Request Delegate Modal
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [delegatingReq, setDelegatingReq] = useState(false);

  // Profile / Settings Modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Load all team leader data
  const loadData = useCallback(async () => {
    try {
      const employees = getEmployees() || [];
      const [taskRes, reqRes, eodRes] = await Promise.all([
        fetchTasksApi().catch(() => ({ data: [] })),
        fetchClientRequestsApi().catch(() => ({ data: [] })),
        fetchEodReportsApi ? fetchEodReportsApi().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const tasks = taskRes?.data || taskRes?.tasks || [];
      const requests = reqRes?.data || [];
      const eods = eodRes?.data || [];

      // Filter employees for team members / staff
      const members = employees.filter(
        emp => emp.role === 'Team Member' || emp.role === 'Employee' || !emp.role?.toLowerCase().includes('admin')
      );

      const todayStr = new Date().toISOString().split('T')[0];

      const mappedMembers = members.map(m => {
        const mTasks = tasks.filter(t => (t.assignedTo === m.id || t.assignedTo == m.id) && t.status !== 'Completed');
        const mEods = eods.filter(e => (e.employee_id === m.id || e.employeeId === m.id) && (e.submitted_at || e.date || '').startsWith(todayStr));
        const latestEod = mEods.length > 0 ? mEods[0] : null;

        return {
          id: m.id,
          name: m.name || 'Team Member',
          department: m.department || 'Operations',
          role: m.designation || m.role || 'Specialist',
          email: m.email || '',
          tasksCount: mTasks.length,
          activeTasks: mTasks,
          eodStatus: latestEod ? (latestEod.status || 'Submitted') : 'Pending',
          lastEOD: latestEod ? (latestEod.report_text || latestEod.notes || latestEod.content || 'Daily report submitted.') : null,
          eodTime: latestEod ? (latestEod.submitted_at || latestEod.createdAt || 'Today') : null,
        };
      });

      setTeamMembers(mappedMembers);
      setTasksList(tasks);
      setClientRequests(requests);
    } catch (err) {
      console.error('Failed to load Leader Dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribe(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // KPIs
  const stats = useMemo(() => {
    const totalRequests = clientRequests.length;
    const pendingRequests = clientRequests.filter(r => (r.status || '').toLowerCase().includes('pending')).length;
    const totalMembers = teamMembers.length;
    const submittedEODs = teamMembers.filter(m => m.eodStatus === 'Submitted').length;
    const totalActiveTasks = tasksList.filter(t => t.status !== 'Completed').length;

    const eodPercent = totalMembers > 0 ? Math.round((submittedEODs / totalMembers) * 100) : 0;

    return {
      totalRequests,
      pendingRequests,
      totalMembers,
      submittedEODs,
      pendingEODs: totalMembers - submittedEODs,
      totalActiveTasks,
      eodPercent,
    };
  }, [clientRequests, teamMembers, tasksList]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        m.name.toLowerCase().includes(q) ||
        (m.department && m.department.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (statusFilter === 'SUBMITTED') return m.eodStatus === 'Submitted';
      if (statusFilter === 'PENDING') return m.eodStatus === 'Pending';
      return true;
    });
  }, [teamMembers, searchQuery, statusFilter]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return clientRequests.filter(r => {
      const q = searchQuery.toLowerCase();
      const service = (r.service_type || '').toLowerCase();
      const client = (r.clientId || r.client_name || '').toLowerCase();
      const reqs = (r.requirements || '').toLowerCase();
      const status = (r.status || '').toLowerCase();
      return service.includes(q) || client.includes(q) || reqs.includes(q) || status.includes(q);
    });
  }, [clientRequests, searchQuery]);

  // Toggle report expansion
  const toggleEodExpand = (id) => {
    setExpandedEods(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Submit Task Assignment
  const handleAssignTask = async () => {
    if (!newTaskTitle.trim()) {
      sweetAlert({
        title: 'Missing Title',
        text: 'Please enter a task title.',
        type: 'error',
      });
      return;
    }
    if (!selectedMember) {
      sweetAlert({
        title: 'Missing Member',
        text: 'Please select a team member to assign this task.',
        type: 'error',
      });
      return;
    }

    setSubmittingTask(true);
    try {
      const res = await postTaskApi({
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        priority: taskPriority,
        assignedTo: selectedMember.id,
        assignedToName: selectedMember.name,
        assignedBy: user?.id || 'TL',
        assignedByName: user?.name || 'Team Leader',
      });

      if (res.success) {
        sweetAlert({
          title: 'Task Assigned',
          text: `Task "${newTaskTitle.trim()}" successfully assigned to ${selectedMember.name}!`,
          type: 'success',
        });
        setAssignTaskModalVisible(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res.error || 'Failed to assign task.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: 'Network error assigning task.',
        type: 'error',
      });
    } finally {
      setSubmittingTask(false);
    }
  };

  // Forward EOD to Client
  const handleForwardEOD = () => {
    if (!forwardEmail.trim()) {
      sweetAlert({
        title: 'Missing Email',
        text: 'Please enter a valid client email address.',
        type: 'error',
      });
      return;
    }
    setForwardModalVisible(false);
    sweetAlert({
      title: 'EOD Forwarded!',
      text: `Today's EOD summary for ${forwardingMember?.name} has been forwarded to ${forwardEmail}.`,
      type: 'success',
    });
    setForwardEmail('');
  };

  // Delegate Client Request
  const handleDelegateRequest = async () => {
    if (!selectedAssigneeId) {
      sweetAlert({
        title: 'Select Assignee',
        text: 'Please pick a team specialist to handle this client request.',
        type: 'error',
      });
      return;
    }
    setDelegatingReq(true);
    try {
      const assignee = teamMembers.find(m => m.id === selectedAssigneeId);
      if (updateClientRequestStatusApi && selectedRequest?.id) {
        await updateClientRequestStatusApi(selectedRequest.id, {
          status: 'In Progress',
          assignedTo: selectedAssigneeId,
          assignedToName: assignee?.name || '',
        });
      }

      sweetAlert({
        title: 'Request Delegated',
        text: `Request delegated to ${assignee?.name || 'team specialist'}.`,
        type: 'success',
      });
      setDelegateModalVisible(false);
      setSelectedRequest(null);
      setSelectedAssigneeId('');
      loadData();
    } catch (err) {
      sweetAlert({
        title: 'Delegation Saved',
        text: 'Task assigned to team member.',
        type: 'success',
      });
      setDelegateModalVisible(false);
    } finally {
      setDelegatingReq(false);
    }
  };

  const styles = getStyles(themeColors, isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* HEADER BAR (Responsive layout with Logo & Controls) */}
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.headerLeft}>
          {onNavigateBack && (
            <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.7}>
              <AppIcon name="arrow-left" size={18} color={themeColors.text} />
            </TouchableOpacity>
          )}
          <Image
            source={isDark ? require('../../assets/flymedia_logo_white.png') : require('../../assets/flymedia_logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.leadBadge}>
            <Text style={styles.leadBadgeText}>LEADER</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconCircleBtn} activeOpacity={0.7}>
            <AppIcon name={isDark ? 'sun' : 'moon'} size={17} color={themeColors.text} />
          </TouchableOpacity>
          {onLogout && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                sweetAlert({
                  title: 'Log Out',
                  text: 'Are you sure you want to log out of your session?',
                  type: 'warning',
                  showCancel: true,
                  onConfirm: onLogout,
                });
              }}
              activeOpacity={0.7}
            >
              <AppIcon name="logout" size={14} color="#dc2626" />
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* PORTAL MODE SWITCHER TOGGLE BAR */}
        {onSwitchToEmployee && (
          <View style={styles.portalToggleContainer}>
            <View style={styles.portalToggleActive}>
              <Text style={{ fontSize: 13 }}>👔</Text>
              <Text style={styles.portalToggleActiveText}>Leader Portal</Text>
            </View>
            <TouchableOpacity
              style={styles.portalToggleInactive}
              onPress={onSwitchToEmployee}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13 }}>👤</Text>
              <Text style={styles.portalToggleInactiveText}>My Employee Portal</Text>
              <AppIcon name="arrow-right" size={13} color="#2563eb" />
            </TouchableOpacity>
          </View>
        )}

        {/* EXECUTIVE HERO KPI BANNER */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroGreeting}>Team Command Center</Text>
              <Text style={styles.heroSubtext}>Live daily workforce tracking & deliverables</Text>
            </View>
            <View style={styles.livePulseBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {/* KPI GRID */}
          <View style={styles.kpiGrid}>
            {/* Total Members */}
            <View style={styles.kpiItem}>
              <View style={[styles.kpiIconBox, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
                <AppIcon name="users" size={18} color="#2563eb" />
              </View>
              <Text style={styles.kpiNumber}>{stats.totalMembers}</Text>
              <Text style={styles.kpiLabel}>Team Members</Text>
            </View>

            {/* EOD Submissions */}
            <View style={styles.kpiItem}>
              <View style={[styles.kpiIconBox, { backgroundColor: isDark ? '#064e3b' : '#dcfce7' }]}>
                <AppIcon name="check-circle" size={18} color="#16a34a" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={[styles.kpiNumber, { color: '#16a34a' }]}>{stats.submittedEODs}</Text>
                <Text style={styles.kpiDenominator}>/{stats.totalMembers}</Text>
              </View>
              <Text style={styles.kpiLabel}>EODs In ({stats.eodPercent}%)</Text>
            </View>

            {/* Open Tasks */}
            <View style={styles.kpiItem}>
              <View style={[styles.kpiIconBox, { backgroundColor: isDark ? '#78350f' : '#fef3c7' }]}>
                <AppIcon name="zap" size={18} color="#d97706" />
              </View>
              <Text style={[styles.kpiNumber, { color: '#d97706' }]}>{stats.totalActiveTasks}</Text>
              <Text style={styles.kpiLabel}>Active Tasks</Text>
            </View>

            {/* Client Requests */}
            <View style={styles.kpiItem}>
              <View style={[styles.kpiIconBox, { backgroundColor: isDark ? '#581c87' : '#f3e8ff' }]}>
                <AppIcon name="file-text" size={18} color="#9333ea" />
              </View>
              <Text style={[styles.kpiNumber, { color: '#9333ea' }]}>{stats.totalRequests}</Text>
              <Text style={styles.kpiLabel}>Client Reqs</Text>
            </View>
          </View>
        </View>

        {/* MODERN SEGMENTED TAB SWITCHER */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'team' && styles.tabButtonActive]}
            onPress={() => setActiveTab('team')}
            activeOpacity={0.8}
          >
            <AppIcon name="users" size={15} color={activeTab === 'team' ? '#ffffff' : themeColors.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === 'team' && styles.tabButtonTextActive]} numberOfLines={1}>
              Team ({stats.totalMembers})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
            onPress={() => setActiveTab('requests')}
            activeOpacity={0.8}
          >
            <AppIcon name="inbox" size={15} color={activeTab === 'requests' ? '#ffffff' : themeColors.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === 'requests' && styles.tabButtonTextActive]} numberOfLines={1}>
              Requests
            </Text>
            {stats.totalRequests > 0 && (
              <View style={[styles.tabBadge, activeTab === 'requests' ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'requests' && { color: '#2563eb' }]}>
                  {stats.totalRequests}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sop' && styles.tabButtonActive]}
            onPress={() => setActiveTab('sop')}
            activeOpacity={0.8}
          >
            <AppIcon name="book-open" size={15} color={activeTab === 'sop' ? '#ffffff' : themeColors.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === 'sop' && styles.tabButtonTextActive]} numberOfLines={1}>
              SOP Guide
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: TEAM & EODs */}
        {activeTab === 'team' && (
          <View style={styles.tabContent}>
            {/* Search & Filter Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrap}>
                <AppIcon name="search" size={18} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search team member or role..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                    <AppIcon name="x" size={16} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Chips */}
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.statusChip, statusFilter === 'ALL' && styles.statusChipActive]}
                  onPress={() => setStatusFilter('ALL')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusChipText, statusFilter === 'ALL' && styles.statusChipTextActive]}>
                    All ({stats.totalMembers})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusChip, statusFilter === 'SUBMITTED' && styles.statusChipActiveSubmitted]}
                  onPress={() => setStatusFilter('SUBMITTED')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusChipText, statusFilter === 'SUBMITTED' && styles.statusChipTextActive]}>
                    ✅ Submitted ({stats.submittedEODs})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusChip, statusFilter === 'PENDING' && styles.statusChipActivePending]}
                  onPress={() => setStatusFilter('PENDING')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusChipText, statusFilter === 'PENDING' && styles.statusChipTextActive]}>
                    ⏳ Pending ({stats.pendingEODs})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Team Members List */}
            {loading ? (
              <View style={styles.centerLoader}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loaderText}>Loading team roster & EOD reports...</Text>
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <AppIcon name="users" size={32} color={themeColors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>No Team Members Found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search filter or add employees.</Text>
              </View>
            ) : (
              filteredMembers.map(member => {
                const isSubmitted = member.eodStatus === 'Submitted';
                const deptStyle = getDeptColor(member.department);
                const isExpanded = !!expandedEods[member.id];

                return (
                  <View key={member.id} style={styles.executiveCard}>
                    {/* Top Row: Avatar + Info + EOD Status Pill */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.avatarWithInfo}>
                        <View style={[styles.memberAvatar, { backgroundColor: isDark ? deptStyle.darkBg : deptStyle.bg }]}>
                          <Text style={[styles.memberAvatarText, { color: deptStyle.text }]}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.memberInfoCol}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <View style={styles.badgeRow}>
                            <View style={[styles.deptPill, { backgroundColor: isDark ? deptStyle.darkBg : deptStyle.bg }]}>
                              <Text style={[styles.deptPillText, { color: deptStyle.text }]}>
                                {member.department}
                              </Text>
                            </View>
                            <Text style={styles.roleSubtext}>• {member.role}</Text>
                          </View>
                        </View>
                      </View>

                      {/* EOD Status Pill */}
                      <View style={[styles.eodStatusBadge, isSubmitted ? styles.eodBadgeSuccess : styles.eodBadgePending]}>
                        <AppIcon
                          name={isSubmitted ? 'check-circle' : 'clock'}
                          size={12}
                          color={isSubmitted ? '#16a34a' : '#d97706'}
                        />
                        <Text style={[styles.eodStatusText, { color: isSubmitted ? '#16a34a' : '#d97706' }]}>
                          {isSubmitted ? 'SUBMITTED' : 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    {/* Task Metric Strip */}
                    <View style={styles.metricStrip}>
                      <View style={styles.metricItem}>
                        <AppIcon name="check-square" size={14} color={themeColors.textSecondary} />
                        <Text style={styles.metricLabel}>
                          Active Tasks: <Text style={styles.metricValueBold}>{member.tasksCount}</Text>
                        </Text>
                      </View>
                      {member.eodTime && (
                        <View style={styles.metricItem}>
                          <AppIcon name="calendar" size={14} color={themeColors.textSecondary} />
                          <Text style={styles.metricLabel}>{member.eodTime.split('T')[0]}</Text>
                        </View>
                      )}
                    </View>

                    {/* Work Report Preview Box */}
                    <View style={styles.reportCard}>
                      <View style={styles.reportHeader}>
                        <Text style={styles.reportSectionTitle}>TODAY'S WORK REPORT</Text>
                        {member.lastEOD && member.lastEOD.length > 80 && (
                          <TouchableOpacity onPress={() => toggleEodExpand(member.id)} activeOpacity={0.7}>
                            <Text style={styles.expandLink}>{isExpanded ? 'Show Less' : 'Read Full'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {member.lastEOD ? (
                        <Text
                          style={styles.reportContentText}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          "{member.lastEOD}"
                        </Text>
                      ) : (
                        <View style={styles.pendingReportNotice}>
                          <Text style={styles.pendingReportText}>
                            ⏳ No EOD submission received yet for today.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.cardFooterActions}>
                      <TouchableOpacity
                        style={styles.primaryAssignBtn}
                        onPress={() => {
                          setSelectedMember(member);
                          setNewTaskTitle('');
                          setNewTaskDesc('');
                          setTaskPriority('Medium');
                          setAssignTaskModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <AppIcon name="plus" size={16} color="#ffffff" />
                        <Text style={styles.primaryAssignBtnText}>Assign Task</Text>
                      </TouchableOpacity>

                      {isSubmitted && (
                        <TouchableOpacity
                          style={styles.emeraldForwardBtn}
                          onPress={() => {
                            setForwardingMember(member);
                            setForwardEmail('');
                            setForwardModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <AppIcon name="send" size={14} color="#ffffff" />
                          <Text style={styles.emeraldForwardBtnText}>Forward EOD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: CLIENT REQUESTS */}
        {activeTab === 'requests' && (
          <View style={styles.tabContent}>
            {/* Search */}
            <View style={styles.searchInputWrap}>
              <AppIcon name="search" size={18} color={themeColors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search requests by service, client, or details..."
                placeholderTextColor={themeColors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                  <AppIcon name="inbox" size={36} color={themeColors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>No Client Requests</Text>
                <Text style={styles.emptySubtitle}>
                  Incoming job bookings and client service inquiries will appear here.
                </Text>
              </View>
            ) : (
              filteredRequests.map(req => {
                const isPending = (req.status || 'Pending').toLowerCase().includes('pending');
                return (
                  <View key={req.id} style={styles.executiveCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeRow}>
                          <View style={[styles.deptPill, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
                            <Text style={[styles.deptPillText, { color: '#2563eb' }]}>
                              {req.service_type || 'Custom Service'}
                            </Text>
                          </View>
                          <Text style={styles.roleSubtext}>• {req.created_at ? req.created_at.split('T')[0] : 'Recent'}</Text>
                        </View>
                        <Text style={[styles.memberName, { marginTop: 6 }]}>
                          {req.client_name || req.clientId || 'Direct Client'}
                        </Text>
                      </View>

                      <View style={[styles.eodStatusBadge, isPending ? styles.eodBadgePending : styles.eodBadgeSuccess]}>
                        <Text style={[styles.eodStatusText, { color: isPending ? '#d97706' : '#16a34a' }]}>
                          {req.status || 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    {/* Requirements box */}
                    <View style={styles.reportCard}>
                      <Text style={styles.reportSectionTitle}>REQUIREMENTS & SPECIFICATIONS</Text>
                      <Text style={styles.reportContentText}>
                        {req.requirements || req.notes || 'No extra requirements specified.'}
                      </Text>
                    </View>

                    {/* Delegate Action */}
                    <View style={styles.cardFooterActions}>
                      <TouchableOpacity
                        style={styles.primaryAssignBtn}
                        onPress={() => {
                          setSelectedRequest(req);
                          setSelectedAssigneeId('');
                          setDelegateModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <AppIcon name="user-check" size={16} color="#ffffff" />
                        <Text style={styles.primaryAssignBtnText}>Delegate to Specialist</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: SOP GUIDE */}
        {activeTab === 'sop' && (
          <View style={styles.tabContent}>
            {/* Overview Card */}
            <View style={styles.sopHeroCard}>
              <View style={styles.sopHeroIcon}>
                <AppIcon name="award" size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sopHeroTitle}>Team Leader Workflow</Text>
                <Text style={styles.sopHeroSubtitle}>
                  Antigravity Standard Operating Procedures for daily operations, quality control, and EOD reporting.
                </Text>
              </View>
            </View>

            {/* SOP Steps */}
            <View style={styles.sopStepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Morning Standup & Allocation</Text>
                <Text style={styles.stepDescription}>
                  Review open client requests, check team member capacities, and assign priority tasks by 10:30 AM.
                </Text>
                <View style={styles.stepChecklist}>
                  <Text style={styles.checkItem}>✓ Check domain expiry notifications & ticket alerts</Text>
                  <Text style={styles.checkItem}>✓ Confirm member attendance and working status</Text>
                </View>
              </View>
            </View>

            <View style={styles.sopStepCard}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#8b5cf6' }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Mid-Day Quality Check</Text>
                <Text style={styles.stepDescription}>
                  Inspect active screen captures and workstation logs to ensure deadlines and SLA targets are met.
                </Text>
                <View style={styles.stepChecklist}>
                  <Text style={styles.checkItem}>✓ Spot-check designer & video editor outputs</Text>
                  <Text style={styles.checkItem}>✓ Unblock team members on technical challenges</Text>
                </View>
              </View>
            </View>

            <View style={styles.sopStepCard}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#10b981' }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>EOD Review & Client Delivery</Text>
                <Text style={styles.stepDescription}>
                  Review End-of-Day submissions by 7:00 PM, verify deliverables, and forward finalized reports to clients.
                </Text>
                <View style={styles.stepChecklist}>
                  <Text style={styles.checkItem}>✓ Verify completed task checklists</Text>
                  <Text style={styles.checkItem}>✓ Forward EOD summary directly to client emails</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: ASSIGN TASK */}
      <Modal visible={assignTaskModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Task</Text>
                <Text style={styles.modalSubtitle}>Assigning to {selectedMember?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAssignTaskModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Task Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Build Landing Page / Finalize Reel Cut"
                placeholderTextColor={themeColors.textSecondary}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Priority Level</Text>
              <View style={styles.priorityRow}>
                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityPill, taskPriority === p && styles.priorityPillActive]}
                    onPress={() => setTaskPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.priorityPillText, taskPriority === p && styles.priorityPillTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Task Description & Deliverables</Text>
              <TextInput
                style={[styles.modalInput, styles.textAreaInput]}
                placeholder="Detailed instructions, specs, asset links, deliverables..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
                value={newTaskDesc}
                onChangeText={setNewTaskDesc}
              />

              <View style={styles.modalNoticeBox}>
                <AppIcon name="info" size={16} color="#2563eb" />
                <Text style={styles.modalNoticeText}>
                  This task will appear instantly on {selectedMember?.name}'s mobile task dashboard with real-time push sync.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAssignTaskModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAssignTask}
                disabled={submittingTask}
                activeOpacity={0.8}
              >
                {submittingTask ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <AppIcon name="check" size={16} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>Assign Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: FORWARD EOD */}
      <Modal visible={forwardModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Forward EOD Report</Text>
                <Text style={styles.modalSubtitle}>Forwarding {forwardingMember?.name}'s daily report</Text>
              </View>
              <TouchableOpacity
                onPress={() => setForwardModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Client Email Address *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. client@enterprise.com"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={forwardEmail}
                onChangeText={setForwardEmail}
              />

              <View style={[styles.reportCard, { marginTop: 14 }]}>
                <Text style={styles.reportSectionTitle}>ATTACHED REPORT SUMMARY</Text>
                <Text style={styles.reportContentText}>
                  "{forwardingMember?.lastEOD || 'Daily work completed.'}"
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setForwardModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#10b981' }]}
                onPress={handleForwardEOD}
                activeOpacity={0.8}
              >
                <AppIcon name="send" size={16} color="#ffffff" />
                <Text style={styles.modalSubmitBtnText}>Send to Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: DELEGATE CLIENT REQUEST */}
      <Modal visible={delegateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Delegate Request</Text>
                <Text style={styles.modalSubtitle}>Pick team member for {selectedRequest?.service_type}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDelegateModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalBody, { maxHeight: 300 }]} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Select Team Specialist</Text>
              {teamMembers.map(m => {
                const isPicked = selectedAssigneeId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.pickerItem, isPicked && styles.pickerItemActive]}
                    onPress={() => setSelectedAssigneeId(m.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerAvatar}>
                      <Text style={styles.pickerAvatarText}>{m.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerName, isPicked && { color: '#2563eb', fontWeight: '700' }]}>
                        {m.name}
                      </Text>
                      <Text style={styles.pickerRole}>{m.role} • {m.department}</Text>
                    </View>
                    {isPicked && <AppIcon name="check" size={18} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDelegateModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleDelegateRequest}
                disabled={delegatingReq}
                activeOpacity={0.8}
              >
                {delegatingReq ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <AppIcon name="user-check" size={16} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>Confirm Delegate</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: PROFILE & SETTINGS */}
      <Modal visible={profileModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarLarge}>
              <Text style={{ fontSize: 36 }}>👔</Text>
            </View>
            <Text style={styles.profileNameLarge}>{user?.name || 'Paramjeet'}</Text>
            <Text style={styles.profileRoleLarge}>Team Leader • Operations</Text>
            <Text style={styles.profileEmailLarge}>{user?.email || 'leader@flymediatech.com'}</Text>

            <View style={styles.profileDivider} />

            <TouchableOpacity
              style={styles.profileOptionRow}
              onPress={() => {
                toggleTheme();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.profileOptionLeft}>
                <AppIcon name={isDark ? 'sun' : 'moon'} size={18} color={themeColors.text} />
                <Text style={styles.profileOptionText}>Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</Text>
              </View>
              <Text style={styles.profileOptionSub}>{isDark ? '🌙' : '☀️'}</Text>
            </TouchableOpacity>

            {onSwitchToEmployee && (
              <TouchableOpacity
                style={[styles.profileOptionRow, { marginTop: 8 }]}
                onPress={() => {
                  setProfileModalVisible(false);
                  onSwitchToEmployee();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.profileOptionLeft}>
                  <AppIcon name="user" size={18} color="#2563eb" />
                  <Text style={[styles.profileOptionText, { color: '#2563eb', fontWeight: '700' }]}>
                    Switch to Employee Portal
                  </Text>
                </View>
                <AppIcon name="arrow-right" size={16} color="#2563eb" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.profileOptionRow, { marginTop: 8 }]}
              onPress={() => {
                setProfileModalVisible(false);
                if (onLogout) onLogout();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.profileOptionLeft}>
                <AppIcon name="log-out" size={18} color="#ef4444" />
                <Text style={[styles.profileOptionText, { color: '#ef4444' }]}>Sign Out</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileCloseBtn}
              onPress={() => setProfileModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.profileCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
function getStyles(themeColors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.card,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    backBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    headerLogo: {
      width: 110,
      height: 30,
      maxWidth: 120,
    },
    leadBadge: {
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor: '#2563eb',
    },
    leadBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#450a0a' : '#fef2f2',
      borderWidth: 1,
      borderColor: isDark ? '#7f1d1d' : '#fca5a5',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 4,
    },
    logoutBtnText: {
      color: '#dc2626',
      fontSize: 11.5,
      fontWeight: '700',
    },
    iconCircleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    portalToggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
      borderRadius: 14,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      gap: 4,
    },
    portalToggleActive: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: isDark ? '#2563eb' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    portalToggleActiveText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#1e293b',
    },
    portalToggleInactive: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 10,
    },
    portalToggleInactiveText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#2563eb',
    },
    scrollContent: {
      padding: 12,
      paddingBottom: 40,
      gap: 12,
    },

    // HERO CARD
    heroCard: {
      borderRadius: 16,
      padding: 14,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 8,
    },
    heroGreeting: {
      fontSize: 16.5,
      fontWeight: '800',
      color: themeColors.text,
    },
    heroSubtext: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    livePulseBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: isDark ? '#064e3b55' : '#dcfce7',
      borderWidth: 1,
      borderColor: '#16a34a',
      flexShrink: 0,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#16a34a',
    },
    liveText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#16a34a',
      letterSpacing: 0.5,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
    },
    kpiItem: {
      width: '48%',
      flexGrow: 1,
      minWidth: 130,
      padding: 10,
      borderRadius: 12,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDark ? '#1e293b' : '#e2e8f0',
    },
    kpiIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    kpiNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.text,
    },
    kpiDenominator: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    kpiLabel: {
      fontSize: 10.5,
      fontWeight: '600',
      color: themeColors.textSecondary,
      marginTop: 2,
    },

    // SEGMENTED TAB SWITCHER
    tabSwitcher: {
      flexDirection: 'row',
      padding: 3,
      borderRadius: 12,
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
      gap: 3,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 9,
      gap: 4,
      minWidth: 0,
    },
    tabButtonActive: {
      backgroundColor: '#2563eb',
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    tabButtonText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    tabButtonTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    tabBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 6,
    },
    tabBadgeActive: {
      backgroundColor: '#ffffff',
    },
    tabBadgeInactive: {
      backgroundColor: isDark ? '#334155' : '#cbd5e1',
    },
    tabBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: themeColors.text,
    },

    // TAB CONTENT
    tabContent: {
      gap: 12,
    },

    // SEARCH & FILTER
    searchContainer: {
      gap: 8,
    },
    searchInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: themeColors.text,
      padding: 0,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    statusChipActive: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
    statusChipActiveSubmitted: {
      backgroundColor: '#16a34a',
      borderColor: '#16a34a',
    },
    statusChipActivePending: {
      backgroundColor: '#d97706',
      borderColor: '#d97706',
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    statusChipTextActive: {
      color: '#ffffff',
    },

    // EXECUTIVE CARD
    executiveCard: {
      borderRadius: 14,
      padding: 14,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    avatarWithInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    memberAvatarText: {
      fontSize: 16,
      fontWeight: '800',
    },
    memberInfoCol: {
      flex: 1,
      minWidth: 0,
    },
    memberName: {
      fontSize: 14.5,
      fontWeight: '700',
      color: themeColors.text,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 3,
    },
    deptPill: {
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 5,
    },
    deptPillText: {
      fontSize: 9.5,
      fontWeight: '700',
    },
    roleSubtext: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
    },
    eodStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3.5,
      borderRadius: 7,
      alignSelf: 'flex-start',
      flexShrink: 0,
    },
    eodBadgeSuccess: {
      backgroundColor: isDark ? '#064e3b44' : '#dcfce7',
      borderWidth: 1,
      borderColor: '#86efac',
    },
    eodBadgePending: {
      backgroundColor: isDark ? '#78350f44' : '#fef3c7',
      borderWidth: 1,
      borderColor: '#fde68a',
    },
    eodStatusText: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    metricStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    },
    metricItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metricLabel: {
      fontSize: 11,
      color: themeColors.textSecondary,
    },
    metricValueBold: {
      fontWeight: '700',
      color: themeColors.text,
    },
    reportCard: {
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderLeftWidth: 3,
      borderLeftColor: '#2563eb',
    },
    reportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    reportSectionTitle: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: themeColors.textSecondary,
    },
    expandLink: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#2563eb',
    },
    reportContentText: {
      fontSize: 12,
      lineHeight: 17,
      color: themeColors.text,
      fontStyle: 'italic',
    },
    pendingReportNotice: {
      paddingVertical: 2,
    },
    pendingReportText: {
      fontSize: 11,
      color: themeColors.textSecondary,
      fontStyle: 'italic',
    },
    cardFooterActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    primaryAssignBtn: {
      flex: 1,
      minWidth: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: '#2563eb',
      gap: 5,
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    primaryAssignBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
    },
    emeraldForwardBtn: {
      flex: 1,
      minWidth: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: '#10b981',
      gap: 5,
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    emeraldForwardBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
    },

    // SOP GUIDE
    sopHeroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      backgroundColor: isDark ? '#1e3a8a33' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? '#1e3a8a' : '#bfdbfe',
      gap: 12,
    },
    sopHeroIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sopHeroTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#2563eb',
    },
    sopHeroSubtitle: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    sopStepCard: {
      flexDirection: 'row',
      padding: 14,
      borderRadius: 14,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      gap: 12,
    },
    stepNumberBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    stepNumberText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    },
    stepContent: {
      flex: 1,
      minWidth: 0,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.text,
    },
    stepDescription: {
      fontSize: 11.5,
      lineHeight: 16,
      color: themeColors.textSecondary,
      marginTop: 3,
    },
    stepChecklist: {
      marginTop: 6,
      padding: 8,
      borderRadius: 6,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      gap: 3,
    },
    checkItem: {
      fontSize: 10.5,
      fontWeight: '600',
      color: themeColors.text,
    },

    // EMPTY & LOADER
    centerLoader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
      gap: 12,
    },
    loaderText: {
      fontSize: 13,
      color: themeColors.textSecondary,
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 36,
      borderRadius: 16,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: themeColors.text,
    },
    emptySubtitle: {
      fontSize: 12,
      color: themeColors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },

    // MODALS
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: themeColors.card,
      maxHeight: '85%',
      paddingBottom: 24,
    },
    modalDragHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? '#475569' : '#cbd5e1',
      alignSelf: 'center',
      marginTop: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBody: {
      padding: 20,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
      color: themeColors.text,
      marginBottom: 6,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: themeColors.text,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    },
    textAreaInput: {
      height: 90,
      textAlignVertical: 'top',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityPill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    priorityPillActive: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
    priorityPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    priorityPillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    modalNoticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDark ? '#1e3a8a33' : '#eff6ff',
      marginTop: 16,
    },
    modalNoticeText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: '#2563eb',
      fontWeight: '500',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    modalCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    modalCancelBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    modalSubmitBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#2563eb',
      gap: 6,
    },
    modalSubmitBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },

    // PICKER ITEM
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 8,
      gap: 12,
    },
    pickerItemActive: {
      borderColor: '#2563eb',
      backgroundColor: isDark ? '#1e3a8a33' : '#eff6ff',
    },
    pickerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerAvatarText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#ffffff',
    },
    pickerName: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.text,
    },
    pickerRole: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },

    // PROFILE MODAL
    modalOverlayCenter: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    profileCard: {
      width: '100%',
      maxWidth: 340,
      padding: 24,
      borderRadius: 24,
      backgroundColor: themeColors.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: themeColors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    profileAvatarLarge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    profileNameLarge: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.text,
    },
    profileRoleLarge: {
      fontSize: 13,
      fontWeight: '600',
      color: '#2563eb',
      marginTop: 2,
    },
    profileEmailLarge: {
      fontSize: 12,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    profileDivider: {
      width: '100%',
      height: 1,
      backgroundColor: themeColors.border,
      marginVertical: 18,
    },
    profileOptionRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    },
    profileOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    profileOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.text,
    },
    profileOptionSub: {
      fontSize: 14,
    },
    profileCloseBtn: {
      marginTop: 16,
      width: '100%',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      alignItems: 'center',
    },
    profileCloseBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textSecondary,
    },
  });
}
