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
  Image,
  Switch,
  Linking,
  Dimensions,
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
  fetchEmployeesApi,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const { width } = Dimensions.get('window');

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

export default function LeaderDashboard({ user, onLogout, onNavigateBack, onSwitchToEmployee, onSwitchToAdmin }) {
  const { themeColors, isDark, toggleTheme } = useTheme();

  // Navigation tab: 'overview' | 'requests' | 'team' | 'sop'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Data States
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED' | 'PENDING'
  const [expandedEods, setExpandedEods] = useState({});

  // 1. Assign Task Directly to Member Modal
  const [assignTaskModalVisible, setAssignTaskModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // 2. View Request Details Modal
  const [viewReqModalVisible, setViewReqModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [matchingTaskSubmission, setMatchingTaskSubmission] = useState(null);
  const [loadingTaskDetails, setLoadingTaskDetails] = useState(false);

  // 3. Assign Client Request to Employee Modal
  const [assignReqModalVisible, setAssignReqModalVisible] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assigningReq, setAssigningReq] = useState(false);
  const [reqAssignDropdownOpen, setReqAssignDropdownOpen] = useState(false);

  // 4. Forward EOD to Client Modal
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardingMember, setForwardingMember] = useState(null);

  const leaderId = user?.id || '';

  // Load all team leader data matching web portal endpoints
  const loadData = useCallback(async () => {
    if (!leaderId) return;
    try {
      setLoading(true);

      const [empRes, taskRes, reqRes, eodRes] = await Promise.all([
        fetchEmployeesApi().catch(() => ({ data: [] })),
        fetchTasksApi().catch(() => ({ data: [] })),
        fetchClientRequestsApi().catch(() => ({ data: [] })),
        fetchEodReportsApi().catch(() => ({ data: [] })),
      ]);

      const allEmps = empRes?.data || [];
      const tasks = taskRes?.data || taskRes?.tasks || [];
      const allReqs = reqRes?.data || [];
      const eods = eodRes?.data || [];

      // Filter employees assigned under THIS team leader
      const myTeam = allEmps.filter(
        (emp) =>
          (emp.role === 'Team Member' || emp.role === 'Employee' || emp.role === 'team member') &&
          String(emp.tl_id) === String(leaderId)
      );

      const todayStr = new Date().toISOString().split('T')[0];

      const mappedMembers = myTeam.map((m) => {
        const mTasks = tasks.filter(
          (t) => (String(t.assignedTo) === String(m.id) || String(t.assignedTo) == String(m.id)) && t.status !== 'Completed'
        );
        const mEods = eods.filter(
          (e) =>
            (String(e.employee_id) === String(m.id) || String(e.employeeId) === String(m.id)) &&
            (e.submitted_at || e.date || '').startsWith(todayStr)
        );
        const latestEod = mEods.length > 0 ? mEods[0] : null;

        return {
          id: m.id,
          name: m.name || 'Team Member',
          department: m.department || 'Specialist',
          role: m.designation || m.role || 'Specialist',
          email: m.email || '',
          tasksCount: mTasks.length,
          activeTasks: mTasks,
          eodStatus: latestEod ? (latestEod.status || 'Submitted') : 'Pending',
          lastEOD: latestEod ? (latestEod.report_text || latestEod.notes || latestEod.content || 'Daily report submitted.') : null,
          eodTime: latestEod ? (latestEod.submitted_at || latestEod.createdAt || 'Today') : null,
        };
      });

      // Filter client requests assigned to THIS team leader
      const myRequests = allReqs.filter((r) => String(r.assigned_tl_id) === String(leaderId));

      setTeamMembers(mappedMembers);
      setTasksList(tasks);
      setClientRequests(myRequests);
    } catch (err) {
      console.error('Failed to load Leader Dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leaderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // KPIs
  const stats = useMemo(() => {
    const totalRequests = clientRequests.length;
    const pendingRequests = clientRequests.filter(
      (r) => (r.status || '').toLowerCase().includes('pending')
    ).length;
    const forReviewRequests = clientRequests.filter(
      (r) => (r.status || '').toLowerCase() === 'for tl review'
    ).length;
    const totalMembers = teamMembers.length;
    const submittedEODs = teamMembers.filter((m) => m.eodStatus === 'Submitted').length;
    const pendingEODs = totalMembers - submittedEODs;

    return {
      totalRequests,
      pendingRequests,
      forReviewRequests,
      totalMembers,
      submittedEODs,
      pendingEODs,
    };
  }, [clientRequests, teamMembers]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
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
    return clientRequests.filter((r) => {
      const q = searchQuery.toLowerCase();
      const service = (r.service_type || '').toLowerCase();
      const client = (r.client_name || r.clientId || '').toLowerCase();
      const reqs = (r.requirements || '').toLowerCase();
      const status = (r.status || '').toLowerCase();
      return service.includes(q) || client.includes(q) || reqs.includes(q) || status.includes(q);
    });
  }, [clientRequests, searchQuery]);

  const toggleEodExpand = (id) => {
    setExpandedEods((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Submit Direct Task Assignment
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
        text: 'Please select a team member.',
        type: 'error',
      });
      return;
    }

    setSubmittingTask(true);
    try {
      const res = await postTaskApi({
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        assignedTo: selectedMember.id,
        assignedToName: selectedMember.name,
        assignedBy: 'TL',
        assignedByName: user?.name || 'Team Leader',
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Task Assigned',
          text: `Task successfully assigned to ${selectedMember.name}!`,
          type: 'success',
        });
        setAssignTaskModalVisible(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to assign task.',
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

  // 2. Open Request Details & Work Proofs
  const handleViewRequestDetails = async (req) => {
    setSelectedRequest(req);
    setMatchingTaskSubmission(null);
    setViewReqModalVisible(true);
    setLoadingTaskDetails(true);

    try {
      const taskRes = await fetchTasksApi();
      if (taskRes && taskRes.success) {
        const allTasks = taskRes.data || taskRes.tasks || [];
        const match = allTasks.find((t) => String(t.project_id) === String(req.id));
        if (match) {
          setMatchingTaskSubmission(match);
        }
      }
    } catch (err) {
      console.log('Error loading task details for request:', err);
    } finally {
      setLoadingTaskDetails(false);
    }
  };

  // 3. Open Assign Request to Team Member Modal
  const handleOpenAssignReq = (req) => {
    if (teamMembers.length === 0) {
      sweetAlert({
        title: 'No Team Members',
        text: 'You have no employees assigned to your team yet. Ask Admin to assign staff under you in Team Hierarchy.',
        type: 'info',
      });
      return;
    }
    setSelectedRequest(req);
    setAssigneeId('');
    setAssignNote('');
    setAssignReqModalVisible(true);
  };

  // 4. Submit Client Request Assignment (creates task linked to request)
  const handleAssignReqSubmit = async () => {
    if (!assigneeId) {
      sweetAlert({
        title: 'Select Employee',
        text: 'Please choose a team specialist from the list.',
        type: 'error',
      });
      return;
    }

    const emp = teamMembers.find((m) => String(m.id) === String(assigneeId));
    setAssigningReq(true);

    try {
      const res = await postTaskApi({
        title: `Client Request: ${selectedRequest.service_type || 'Service'}`,
        description: assignNote.trim()
          ? `${selectedRequest.requirements}\n\n**TL Note:**\n${assignNote.trim()}`
          : selectedRequest.requirements,
        assignedTo: emp.id,
        assignedToName: emp.name,
        assignedBy: 'TL',
        assignedByName: user?.name || 'Team Leader',
        project_id: selectedRequest.id,
      });

      if (res && res.success) {
        // Update request status to Assigned
        await updateClientRequestStatusApi(selectedRequest.id, 'Assigned').catch(() => { });

        sweetAlert({
          title: 'Request Assigned!',
          text: `Task delegated to ${emp.name} successfully.`,
          type: 'success',
        });
        setAssignReqModalVisible(false);
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to assign request.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: 'Network error assigning request.',
        type: 'error',
      });
    } finally {
      setAssigningReq(false);
    }
  };

  // 5. Deliver Work to Client (when status is 'For TL Review')
  const handleDeliverWork = (req) => {
    sweetAlert({
      title: 'Deliver to Client?',
      text: `Approve the completed deliverables for ${req.service_type || 'this service'} and mark as Completed for the client?`,
      type: 'question',
      showCancel: true,
      onConfirm: async () => {
        try {
          const res = await updateClientRequestStatusApi(req.id, 'Completed');
          if (res && res.success) {
            sweetAlert({
              title: 'Delivered! 🎉',
              text: 'Work marked as completed and delivered to the client.',
              type: 'success',
            });
            loadData();
          } else {
            sweetAlert({
              title: 'Error',
              text: res?.error || 'Failed to deliver work.',
              type: 'error',
            });
          }
        } catch (err) {
          sweetAlert({
            title: 'Error',
            text: 'Network error delivering work.',
            type: 'error',
          });
        }
      },
    });
  };

  // 6. Forward EOD to Client
  const handleForwardEOD = () => {
    if (!forwardEmail.trim() || !forwardEmail.includes('@')) {
      sweetAlert({
        title: 'Missing Email',
        text: 'Please enter a valid client email address.',
        type: 'error',
      });
      return;
    }
    setForwardModalVisible(false);
    sweetAlert({
      title: 'EOD Forwarded! 📤',
      text: `Today's EOD summary for ${forwardingMember?.name} has been sent to ${forwardEmail}.`,
      type: 'success',
    });
    setForwardEmail('');
  };

  const styles = getStyles(themeColors, isDark);

  const navMenuItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: 'grid' },
    { id: 'requests', label: 'Client Requests', icon: 'check-square', badge: stats.pendingRequests },
    { id: 'team', label: 'Team & EODs', icon: 'users' },
    // { id: 'sop', label: 'Standard Operating Procedures', icon: 'book-open' },
  ];

  const ContainerComponent = onNavigateBack ? View : SafeAreaView;

  return (
    <ContainerComponent style={styles.container} edges={onNavigateBack ? undefined : ['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* EMBEDDED SUB-HEADER (When viewed inside Admin Console) */}
      {onNavigateBack ? (
        <View style={styles.embeddedHeader}>
          <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.7}>
            <AppIcon name="arrow-left" size={18} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.embeddedHeaderTitle}>👔 Team Leader Portal</Text>
            <Text style={styles.embeddedHeaderSub}>Overview, requests & team EOD reviews</Text>
          </View>
        </View>
      ) : (
        /* STANDALONE TOP APP HEADER (When logged in directly as Team Leader) */
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => setIsDrawerOpen(true)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={styles.hamburgerBtn}
            >
              <AppIcon name="menu" size={22} color="#2563eb" />
            </TouchableOpacity>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {user?.name || 'Team Leader'}
              </Text>
              <Text style={styles.headerSub}>
                {user?.department || 'Operations Lead'} • TL Portal
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {onSwitchToEmployee && (
              <TouchableOpacity
                style={styles.employeeSwitchPill}
                onPress={onSwitchToEmployee}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 11 }}>👤</Text>
                <Text style={styles.employeeSwitchPillText}>Employee</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={toggleTheme} style={styles.iconCircleBtn} activeOpacity={0.7}>
              <AppIcon name={isDark ? 'sun' : 'moon'} size={17} color={themeColors.textPrimary} />
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
                <Text style={styles.logoutBtnText}>Sign Out 🚪</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* TOP SEGMENTED TAB SWITCHER */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.8}
          >
            <AppIcon name="grid" size={14} color={activeTab === 'overview' ? '#ffffff' : themeColors.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
            onPress={() => setActiveTab('requests')}
            activeOpacity={0.8}
          >
            <AppIcon name="inbox" size={14} color={activeTab === 'requests' ? '#ffffff' : themeColors.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === 'requests' && styles.tabButtonTextActive]}>
              Requests
            </Text>
            {stats.pendingRequests > 0 && (
              <View style={[styles.tabBadge, activeTab === 'requests' ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'requests' && { color: '#2563eb' }]}>
                  {stats.pendingRequests}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'team' && styles.tabButtonActive]}
            onPress={() => setActiveTab('team')}
            activeOpacity={0.8}
          >
            <AppIcon name="users" size={14} color={activeTab === 'team' ? '#ffffff' : themeColors.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === 'team' && styles.tabButtonTextActive]}>
              Team ({stats.totalMembers})
            </Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sop' && styles.tabButtonActive]}
            onPress={() => setActiveTab('sop')}
            activeOpacity={0.8}
          >
            <AppIcon name="book-open" size={14} color={activeTab === 'sop' ? '#ffffff' : themeColors.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === 'sop' && styles.tabButtonTextActive]}>
              SOP
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW DASHBOARD                                */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <View>
            {/* 3 Metrics Cards (Matching Web Portal) */}
            <View style={styles.kpiGrid}>
              {/* Card 1: Total Client Requests */}
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => setActiveTab('requests')}
                activeOpacity={0.8}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiCardTitle}>Total Requests</Text>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#2563eb22' }]}>
                    <AppIcon name="check-square" size={16} color="#2563eb" />
                  </View>
                </View>
                <View style={styles.kpiBottomRow}>
                  <Text style={styles.kpiNumber}>{stats.totalRequests}</Text>
                  <Text style={styles.kpiActionLink}>View all &rarr;</Text>
                </View>
              </TouchableOpacity>

              {/* Card 2: Active Team Members */}
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => setActiveTab('team')}
                activeOpacity={0.8}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiCardTitle}>Active Team</Text>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#10b98122' }]}>
                    <AppIcon name="users" size={16} color="#10b981" />
                  </View>
                </View>
                <View style={styles.kpiBottomRow}>
                  <Text style={styles.kpiNumber}>{stats.totalMembers}</Text>
                  <Text style={styles.kpiActionLink}>Manage &rarr;</Text>
                </View>
              </TouchableOpacity>

              {/* Card 3: EODs Submitted Today */}
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => setActiveTab('team')}
                activeOpacity={0.8}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiCardTitle}>EODs Submitted</Text>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#f59e0b22' }]}>
                    <AppIcon name="clock" size={16} color="#f59e0b" />
                  </View>
                </View>
                <View style={styles.kpiBottomRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <Text style={[styles.kpiNumber, { color: '#16a34a' }]}>{stats.submittedEODs}</Text>
                    <Text style={styles.kpiDenominator}>/ {stats.totalMembers}</Text>
                  </View>
                  <Text style={styles.kpiActionLink}>Review &rarr;</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Standard Operating Procedure Guide (SOP) */}
            <View style={styles.sopSectionCard}>
              <Text style={styles.sectionHeading}>Standard Operating Procedure (SOP)</Text>

              <View style={styles.sopStepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Review Client Requests</Text>
                  <Text style={styles.stepDescription}>
                    Check the Client Requests tab for incoming bookings from the booking portal.
                  </Text>
                </View>
              </View>

              <View style={styles.sopStepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Assign Tasks to Team</Text>
                  <Text style={styles.stepDescription}>
                    Delegate the work to your team members and track their active tasks.
                  </Text>
                </View>
              </View>

              <View style={styles.sopStepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Review EODs & Finalize</Text>
                  <Text style={styles.stepDescription}>
                    At EOD, review member submissions and forward the final EOD Update to the Client.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CLIENT REQUESTS (INCOMING BOOKINGS)               */}
        {/* ======================================================== */}
        {activeTab === 'requests' && (
          <View>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrap}>
                <AppIcon name="search" size={16} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search client, service, requirements..."
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

            {filteredRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>📥</Text>
                <Text style={styles.emptyTitle}>No Pending Requests</Text>
                <Text style={styles.emptySubtitle}>
                  There are currently no client service bookings assigned to your queue.
                </Text>
              </View>
            ) : (
              filteredRequests.map((req) => {
                const status = req.status || 'Pending Assignment';
                const isForReview = status === 'For TL Review';
                const isCompleted = status === 'Completed';
                const isAssigned = status === 'Assigned' || status === 'In Progress';

                return (
                  <View key={req.id} style={styles.executiveCard}>
                    {/* Header Row */}
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{req.client_name || req.clientId || 'Client'}</Text>
                        <Text style={styles.roleSubtext}>
                          Service: <Text style={{ fontWeight: '800', color: '#2563eb' }}>{req.service_type || 'Service'}</Text>
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          isCompleted
                            ? styles.statusSuccess
                            : isForReview
                              ? styles.statusReview
                              : isAssigned
                                ? styles.statusWorking
                                : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isCompleted
                              ? styles.statusTextSuccess
                              : isForReview
                                ? styles.statusTextReview
                                : isAssigned
                                  ? styles.statusTextWorking
                                  : styles.statusTextPending,
                          ]}
                        >
                          {status}
                        </Text>
                      </View>
                    </View>

                    {/* Requirements snippet */}
                    <View style={styles.reportCard}>
                      <Text style={styles.reportSectionTitle}>CLIENT REQUIREMENTS</Text>
                      <Text style={styles.reportContentText} numberOfLines={2}>
                        {req.requirements || 'No specific description provided.'}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: themeColors.textSecondary, marginTop: 4 }}>
                        📅 Date: {new Date(req.created_at || Date.now()).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Actions Toolbar */}
                    <View style={styles.cardFooterActions}>
                      <TouchableOpacity
                        style={styles.actionBtnOutline}
                        onPress={() => handleViewRequestDetails(req)}
                        activeOpacity={0.7}
                      >
                        <AppIcon name="eye" size={14} color="#2563eb" />
                        <Text style={styles.actionBtnOutlineText}>View Details</Text>
                      </TouchableOpacity>

                      {isForReview ? (
                        <TouchableOpacity
                          style={styles.actionBtnDeliver}
                          onPress={() => handleDeliverWork(req)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionBtnDeliverText}>Deliver Work 🚀</Text>
                        </TouchableOpacity>
                      ) : isCompleted ? (
                        <View style={styles.actionBtnDisabled}>
                          <Text style={styles.actionBtnDisabledText}>Delivered ✓</Text>
                        </View>
                      ) : isAssigned ? (
                        <View style={styles.actionBtnDisabled}>
                          <Text style={styles.actionBtnDisabledText}>Working... ⏳</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.actionBtnPrimary}
                          onPress={() => handleOpenAssignReq(req)}
                          activeOpacity={0.8}
                        >
                          <AppIcon name="plus" size={14} color="#ffffff" />
                          <Text style={styles.actionBtnPrimaryText}>Assign to Staff</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: TEAM & EODs                                       */}
        {/* ======================================================== */}
        {activeTab === 'team' && (
          <View>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrap}>
                <AppIcon name="search" size={16} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search team member by name or role..."
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

              {/* Status Chips */}
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.statusChip, statusFilter === 'ALL' && styles.statusChipActive]}
                  onPress={() => setStatusFilter('ALL')}
                >
                  <Text style={[styles.statusChipText, statusFilter === 'ALL' && styles.statusChipTextActive]}>
                    All ({stats.totalMembers})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusChip, statusFilter === 'SUBMITTED' && styles.statusChipActiveSubmitted]}
                  onPress={() => setStatusFilter('SUBMITTED')}
                >
                  <Text style={[styles.statusChipText, statusFilter === 'SUBMITTED' && styles.statusChipTextActive]}>
                    ✅ Submitted ({stats.submittedEODs})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusChip, statusFilter === 'PENDING' && styles.statusChipActivePending]}
                  onPress={() => setStatusFilter('PENDING')}
                >
                  <Text style={[styles.statusChipText, statusFilter === 'PENDING' && styles.statusChipTextActive]}>
                    ⏳ Pending ({stats.pendingEODs})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {filteredMembers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>👥</Text>
                <Text style={styles.emptyTitle}>No Team Members Found</Text>
                <Text style={styles.emptySubtitle}>
                  There are no employees assigned to your department hierarchy.
                </Text>
              </View>
            ) : (
              filteredMembers.map((member) => {
                const isSubmitted = member.eodStatus === 'Submitted';
                const deptStyle = getDeptColor(member.department);
                const isExpanded = !!expandedEods[member.id];

                return (
                  <View key={member.id} style={styles.executiveCard}>
                    {/* Top Row */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.avatarWithInfo}>
                        <View style={[styles.memberAvatar, { backgroundColor: isDark ? deptStyle.darkBg : deptStyle.bg }]}>
                          <Text style={[styles.memberAvatarText, { color: deptStyle.text }]}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.memberInfoCol}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.roleSubtext}>
                            {member.department} • {member.role}
                          </Text>
                        </View>
                      </View>

                      {/* EOD status */}
                      <View style={[styles.eodStatusBadge, isSubmitted ? styles.eodBadgeSuccess : styles.eodBadgePending]}>
                        <Text style={[styles.eodStatusText, { color: isSubmitted ? '#16a34a' : '#d97706' }]}>
                          {isSubmitted ? 'SUBMITTED' : 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    {/* Metric Strip */}
                    <View style={styles.metricStrip}>
                      <Text style={styles.metricLabel}>
                        Active Tasks: <Text style={styles.metricValueBold}>{member.tasksCount}</Text>
                      </Text>
                      {member.eodTime && (
                        <Text style={styles.metricLabel}>
                          Date: <Text style={styles.metricValueBold}>{member.eodTime.split('T')[0]}</Text>
                        </Text>
                      )}
                    </View>

                    {/* Work Report Box */}
                    <View style={styles.reportCard}>
                      <View style={styles.reportHeader}>
                        <Text style={styles.reportSectionTitle}>TODAY'S WORK REPORT</Text>
                        {member.lastEOD && member.lastEOD.length > 80 && (
                          <TouchableOpacity onPress={() => toggleEodExpand(member.id)}>
                            <Text style={styles.expandLink}>{isExpanded ? 'Show Less' : 'Read Full'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {member.lastEOD ? (
                        <Text style={styles.reportContentText} numberOfLines={isExpanded ? undefined : 3}>
                          "{member.lastEOD}"
                        </Text>
                      ) : (
                        <Text style={styles.pendingReportNotice}>
                          ⏳ No report submitted yet today.
                        </Text>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.cardFooterActions}>
                      <TouchableOpacity
                        style={styles.actionBtnOutline}
                        onPress={() => {
                          setSelectedMember(member);
                          setNewTaskTitle('');
                          setNewTaskDesc('');
                          setAssignTaskModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <AppIcon name="plus" size={13} color="#2563eb" />
                        <Text style={styles.actionBtnOutlineText}>Assign Task</Text>
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
                          <AppIcon name="send" size={13} color="#ffffff" />
                          <Text style={styles.emeraldForwardBtnText}>Forward to Client</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SOP GUIDE                                         */}
        {/* ======================================================== */}
        {activeTab === 'sop' && (
          <View>
            <View style={styles.sopSectionCard}>
              <Text style={styles.sectionHeading}>Leader Standard Operating Procedures</Text>

              <View style={styles.sopStepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Morning Standup & Work Allocation</Text>
                  <Text style={styles.stepDescription}>
                    Review open client requests, check staff bandwidth, and assign priority tasks by 10:30 AM.
                  </Text>
                </View>
              </View>

              <View style={styles.sopStepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Mid-Day Quality Control & Reviews</Text>
                  <Text style={styles.stepDescription}>
                    Inspect completed deliverables, review graphic creatives and SEO deliverables for client readiness.
                  </Text>
                </View>
              </View>

              <View style={styles.sopStepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>End of Day (EOD) Wrapup & Client Forwarding</Text>
                  <Text style={styles.stepDescription}>
                    Verify all staff submissions before 7:00 PM and forward official progress updates to clients.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* 1. MODAL: ASSIGN TASK TO TEAM MEMBER                     */}
      {/* ======================================================== */}
      <Modal
        visible={assignTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ Assign Task to {selectedMember?.name}</Text>
              <TouchableOpacity onPress={() => setAssignTaskModalVisible(false)}>
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Audit On-Page SEO for Client..."
              placeholderTextColor={themeColors.textSecondary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.inputLabel}>Task Description & Deliverables</Text>
            <TextInput
              style={[styles.input, { height: 90 }]}
              placeholder="Detailed guidelines, reference URLs, deadlines..."
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={4}
              value={newTaskDesc}
              onChangeText={setNewTaskDesc}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAssignTaskModalVisible(false)}
                disabled={submittingTask}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAssignTask}
                disabled={submittingTask}
              >
                {submittingTask ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Assign Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: VIEW REQUEST DETAILS & WORK PROOFS             */}
      {/* ======================================================== */}
      {selectedRequest && (
        <Modal
          visible={viewReqModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setViewReqModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📌 Client Request Details</Text>
                <TouchableOpacity onPress={() => setViewReqModalVisible(false)}>
                  <AppIcon name="x" size={18} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailVal}>{selectedRequest.client_name || selectedRequest.clientId || 'Client'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service:</Text>
                  <Text style={styles.detailVal}>{selectedRequest.service_type || 'Service'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailVal, { color: '#2563eb', fontWeight: '800' }]}>
                    {selectedRequest.status || 'Pending Assignment'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailVal}>{new Date(selectedRequest.created_at || Date.now()).toLocaleDateString()}</Text>
                </View>

                <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderWidth: 1, borderColor: themeColors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: themeColors.textSecondary, marginBottom: 4 }}>
                    CLIENT REQUIREMENTS:
                  </Text>
                  <Text style={{ fontSize: 12.5, color: themeColors.textPrimary }}>
                    {selectedRequest.requirements || 'No specific requirements provided.'}
                  </Text>
                </View>

                {/* Employee Submission & Proof Files */}
                {loadingTaskDetails ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 4 }}>Checking work submissions...</Text>
                  </View>
                ) : matchingTaskSubmission ? (
                  <View style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: isDark ? '#1e293b' : '#ecfdf5', borderWidth: 1, borderColor: '#10b98144' }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#10b981', marginBottom: 4 }}>
                      EMPLOYEE WORK SUBMISSION:
                    </Text>
                    <Text style={{ fontSize: 12, color: themeColors.textPrimary }}>
                      Assigned To: <Text style={{ fontWeight: '700' }}>{matchingTaskSubmission.assignedToName || 'Specialist'}</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: themeColors.textPrimary, marginTop: 2 }}>
                      Task Status: <Text style={{ fontWeight: '700' }}>{matchingTaskSubmission.status || 'In Progress'}</Text>
                    </Text>
                    {matchingTaskSubmission.fileUrl ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(matchingTaskSubmission.fileUrl).catch(() => { })}
                        style={{ marginTop: 6 }}
                      >
                        <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '700' }}>
                          🔗 View Uploaded Proof File
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                        No proof files uploaded yet.
                      </Text>
                    )}
                  </View>
                ) : null}
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { marginTop: 14, flex: 0, width: '100%' }]}
                onPress={() => setViewReqModalVisible(false)}
              >
                <Text style={styles.modalSaveText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL: ASSIGN REQUEST TO EMPLOYEE                     */}
      {/* ======================================================== */}
      <Modal
        visible={assignReqModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignReqModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📥 Assign Request to Staff</Text>
              <TouchableOpacity onPress={() => setAssignReqModalVisible(false)}>
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Service: {selectedRequest?.service_type || 'Service'}</Text>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Select Team Specialist *</Text>

            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center', backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}
              onPress={() => setReqAssignDropdownOpen(!reqAssignDropdownOpen)}
            >
              <Text style={{ color: assigneeId ? themeColors.textPrimary : themeColors.textSecondary, fontSize: 13 }}>
                {assigneeId
                  ? `👤 ${teamMembers.find(e => String(e.id) === String(assigneeId))?.name || 'Selected Specialist'}`
                  : '▼ Tap to select a specialist'}
              </Text>
            </TouchableOpacity>

            {reqAssignDropdownOpen && (
              <View style={{ borderWidth: 1, borderColor: themeColors.border, borderRadius: 8, marginTop: 4, backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                  {teamMembers.map((emp) => {
                    const isSelected = String(assigneeId) === String(emp.id);
                    return (
                      <TouchableOpacity
                        key={emp.id}
                        style={[
                          styles.empSelectCard,
                          { marginHorizontal: 8, marginVertical: 4, elevation: 0 },
                          isSelected && styles.empSelectCardActive,
                        ]}
                        onPress={() => {
                          setAssigneeId(emp.id);
                          setReqAssignDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.empSelectName, isSelected && { color: '#ffffff' }]}>
                          👤 {emp.name}
                        </Text>
                        <Text style={[styles.empSelectDept, isSelected && { color: '#dbeafe' }]}>
                          {emp.department} • {emp.tasksCount} active tasks
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={styles.inputLabel}>Attach Note to Employee (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="e.g. Please prioritize this and follow client guidelines..."
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={3}
              value={assignNote}
              onChangeText={setAssignNote}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAssignReqModalVisible(false)}
                disabled={assigningReq}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAssignReqSubmit}
                disabled={assigningReq}
              >
                {assigningReq ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Confirm Assignment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL: FORWARD EOD TO CLIENT                          */}
      {/* ======================================================== */}
      <Modal
        visible={forwardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForwardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📤 Forward EOD to Client</Text>
              <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 10 }}>
              Forwarding today's EOD for <Text style={{ fontWeight: '800', color: themeColors.textPrimary }}>{forwardingMember?.name}</Text>:
            </Text>

            <Text style={styles.inputLabel}>Client Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="client@company.com"
              placeholderTextColor={themeColors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={forwardEmail}
              onChangeText={setForwardEmail}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setForwardModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#10b981' }]}
                onPress={handleForwardEOD}
              >
                <Text style={styles.modalSaveText}>Send EOD 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* HAMBURGER SIDEBAR / DRAWER                               */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
          <View style={[styles.drawerContent, { backgroundColor: themeColors.drawerBg, borderColor: themeColors.border }]}>
            <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border }]}>
              <View style={[styles.drawerAvatarContainer, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.drawerAvatarText}>
                  {(user?.name || 'TL').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.drawerName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                {user?.name || 'Team Leader'}
              </Text>
              <Text style={[styles.drawerEmail, { color: themeColors.drawerSubtext }]} numberOfLines={1}>
                {user?.department || 'Lead'} • {user?.email || 'leader@devicedesk.com'}
              </Text>
            </View>

            <ScrollView style={styles.drawerItemsContainer} showsVerticalScrollIndicator={false}>
              {navMenuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                    onPress={() => {
                      setActiveTab(item.id);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <AppIcon
                      name={item.icon}
                      size={18}
                      color={isActive ? '#2563eb' : themeColors.drawerItemText}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.drawerItemLabel,
                        { color: isActive ? '#2563eb' : themeColors.drawerItemText, fontWeight: isActive ? '800' : '600' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.badge > 0 && (
                      <View style={styles.drawerBadge}>
                        <Text style={styles.drawerBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* My Employee Profile Switch */}
              {onSwitchToEmployee && (
                <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 16 }}>
                  <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.2)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AppIcon name="user" size={16} color="#2563eb" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563eb' }}>TL Portal</Text>
                    </View>
                    <Switch
                      value={true}
                      onValueChange={() => {
                        setIsDrawerOpen(false);
                        onSwitchToEmployee();
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={'#3b82f6'}
                    />
                  </View>
                </View>
              )}

              {/* Admin Portal Switch */}
              {onSwitchToAdmin && (
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                  <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(220, 38, 38, 0.3)' : 'rgba(220, 38, 38, 0.2)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AppIcon name="settings" size={16} color="#dc2626" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#dc2626' }}>IT Portal</Text>
                    </View>
                    <Switch
                      value={false}
                      onValueChange={() => {
                        setIsDrawerOpen(false);
                        onSwitchToAdmin();
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#fca5a5' }}
                      thumbColor={'#f8fafc'}
                    />
                  </View>
                </View>
              )}

              {/* Theme Toggle */}
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  {
                    justifyContent: 'space-between',
                    marginTop: 14,
                    marginBottom: 14,
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleTheme}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name={isDark ? 'moon' : 'sun'} size={18} color={isDark ? '#f59e0b' : '#eab308'} style={{ marginRight: 10 }} />
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText, fontWeight: '700' }]}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: themeColors.switchTrackFalse, true: themeColors.switchTrackTrue }}
                  thumbColor={themeColors.switchThumb}
                />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </ContainerComponent>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.headerBg,
    },
    embeddedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.card,
      gap: 10,
    },
    backBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    embeddedHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    embeddedHeaderSub: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 1,
    },
    hamburgerBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    headerSub: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    employeeSwitchPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#1e293b' : '#eff6ff',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#3b82f6' : '#bfdbfe',
    },
    employeeSwitchPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#93c5fd' : '#2563eb',
    },
    iconCircleBtn: {
      padding: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    logoutBtn: {
      backgroundColor: isDark ? '#334155' : '#fef2f2',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#fca5a5',
    },
    logoutBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#dc2626',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    portalToggleContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderRadius: 10,
      padding: 4,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    portalToggleActive: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#2563eb',
      paddingVertical: 8,
      borderRadius: 8,
    },
    portalToggleActiveText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    portalToggleInactive: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: 8,
    },
    portalToggleInactiveText: {
      color: themeColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    tabSwitcher: {
      flexDirection: 'row',
      backgroundColor: themeColors.headerBg,
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 14,
      gap: 4,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      borderRadius: 8,
    },
    tabButtonActive: {
      backgroundColor: '#2563eb',
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
      borderRadius: 10,
    },
    tabBadgeActive: {
      backgroundColor: '#ffffff',
    },
    tabBadgeInactive: {
      backgroundColor: '#2563eb',
    },
    tabBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ffffff',
    },
    kpiGrid: {
      gap: 10,
      marginBottom: 16,
    },
    kpiCard: {
      backgroundColor: themeColors.cardBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    kpiTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    kpiCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textSecondary,
    },
    kpiIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    kpiNumber: {
      fontSize: 26,
      fontWeight: '900',
      color: themeColors.textPrimary,
    },
    kpiDenominator: {
      fontSize: 15,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    kpiActionLink: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2563eb',
    },
    sopSectionCard: {
      backgroundColor: themeColors.cardBg,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: themeColors.border,
      gap: 12,
    },
    sectionHeading: {
      fontSize: 14.5,
      fontWeight: '800',
      color: themeColors.textPrimary,
      marginBottom: 4,
    },
    sopStepCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    stepNumberBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#2563eb22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#2563eb',
    },
    stepTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    stepDescription: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 2,
      lineHeight: 16,
    },
    searchContainer: {
      marginBottom: 12,
      gap: 8,
    },
    searchInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: themeColors.cardBg,
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
    chipRow: {
      flexDirection: 'row',
      gap: 6,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
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
      fontWeight: '700',
    },
    executiveCard: {
      backgroundColor: themeColors.cardBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 12,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    avatarWithInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    memberAvatar: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberAvatarText: {
      fontSize: 16,
      fontWeight: '800',
    },
    memberInfoCol: {
      flex: 1,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    roleSubtext: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    eodStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    eodBadgeSuccess: {
      backgroundColor: '#16a34a22',
      borderColor: '#16a34a',
    },
    eodBadgePending: {
      backgroundColor: '#d9770622',
      borderColor: '#d97706',
    },
    eodStatusText: {
      fontSize: 10,
      fontWeight: '800',
    },
    metricStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      padding: 8,
      borderRadius: 8,
      marginVertical: 8,
    },
    metricLabel: {
      fontSize: 11,
      color: themeColors.textSecondary,
    },
    metricValueBold: {
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    reportCard: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 8,
    },
    reportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    reportSectionTitle: {
      fontSize: 10.5,
      fontWeight: '800',
      color: themeColors.textSecondary,
    },
    expandLink: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#2563eb',
    },
    reportContentText: {
      fontSize: 12,
      color: themeColors.textPrimary,
      lineHeight: 17,
    },
    pendingReportNotice: {
      fontSize: 11.5,
      color: '#d97706',
      fontStyle: 'italic',
    },
    cardFooterActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    actionBtnOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    },
    actionBtnOutlineText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#2563eb',
    },
    actionBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: '#2563eb',
    },
    actionBtnPrimaryText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#ffffff',
    },
    actionBtnDeliver: {
      backgroundColor: '#9333ea',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionBtnDeliverText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#ffffff',
    },
    actionBtnDisabled: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    actionBtnDisabledText: {
      fontSize: 11,
      fontWeight: '700',
      color: themeColors.textSecondary,
    },
    emeraldForwardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#10b981',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    emeraldForwardBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#ffffff',
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusPending: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
    },
    statusTextPending: {
      color: '#b45309',
      fontSize: 10,
      fontWeight: '800',
    },
    statusWorking: {
      backgroundColor: '#dbeafe',
      borderColor: '#2563eb',
    },
    statusTextWorking: {
      color: '#1d4ed8',
      fontSize: 10,
      fontWeight: '800',
    },
    statusReview: {
      backgroundColor: '#fae8ff',
      borderColor: '#c026d3',
    },
    statusTextReview: {
      color: '#86198f',
      fontSize: 10,
      fontWeight: '800',
    },
    statusSuccess: {
      backgroundColor: '#dcfce7',
      borderColor: '#16a34a',
    },
    statusTextSuccess: {
      color: '#15803d',
      fontSize: 10,
      fontWeight: '800',
    },
    emptyCard: {
      backgroundColor: themeColors.cardBg,
      borderRadius: 14,
      padding: 28,
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    emptyTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    emptySubtitle: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalSheet: {
      width: '100%',
      maxWidth: 420,
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
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    inputLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: themeColors.textSecondary,
      marginTop: 8,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      color: themeColors.textPrimary,
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
      flex: 1.5,
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
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    detailLabel: {
      fontSize: 12,
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    detailVal: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    empSelectCard: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      marginBottom: 6,
    },
    empSelectCardActive: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
    empSelectName: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    empSelectDept: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    drawerOverlay: {
      position: 'absolute',
      inset: 0,
      zIndex: 100,
      flexDirection: 'row',
    },
    drawerBackdrop: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    drawerContent: {
      width: '78%',
      maxWidth: 300,
      height: '100%',
      borderRightWidth: 1,
      paddingTop: 10,
    },
    drawerHeader: {
      padding: 16,
      borderBottomWidth: 1,
    },
    drawerAvatarContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    drawerAvatarText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '800',
    },
    drawerName: {
      fontSize: 15,
      fontWeight: '800',
    },
    drawerEmail: {
      fontSize: 11.5,
      marginTop: 2,
    },
    drawerItemsContainer: {
      flex: 1,
      padding: 12,
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 4,
    },
    drawerItemActive: {
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
    },
    drawerItemLabel: {
      fontSize: 12.5,
    },
    drawerBadge: {
      marginLeft: 'auto',
      backgroundColor: '#2563eb',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    drawerBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
    },
  });
}
