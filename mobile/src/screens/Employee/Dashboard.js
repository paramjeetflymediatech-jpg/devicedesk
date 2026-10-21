import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Switch,
  BackHandler,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import {
  getSystems,
  getTickets,
  getEmployees,
  getAssignmentHistory,
  createTicket,
  subscribe,
  syncWithServer,
  removeEmployee,
} from '../../store/store';
import { sweetAlert } from '../../utils/sweetAlert';
import { playTicketSound } from '../../utils/sound';
import { applyLeaveRequest, fetchEmployeeLeaves, fetchMarketingAuthorizations } from '../../utils/api';
import EmployeeTasks from './EmployeeTasks';
import ChatScreen from '../ChatScreen';
import AttendanceWidget from '../../components/AttendanceWidget';
import AttendanceLogs from './AttendanceLogs';
import MarketingFieldScreen from '../Marketing/MarketingFieldScreen';
import EODSubmission from './EODSubmission';
import AppIcon from '../../components/AppIcon';
import CalendarPickerModal from '../../components/CalendarPickerModal';

export default function EmployeeDashboard({ user, onLogout, onSwitchToLeader, onSwitchToAdmin }) {
  const { theme, isDark, toggleTheme, themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState('overview'); // overview, file-complaint, records, profile, tasks, attendance, chat
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Back Button Handler
  useEffect(() => {
    const backAction = () => {
      if (activeTab !== 'overview') {
        setActiveTab('overview');
        return true; // prevent default behavior
      }
      return false; // let default behavior happen (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [activeTab]);

  // Calendar Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Data lists
  const [systems, setSystems] = useState(() => getSystems());
  const [tickets, setTickets] = useState(() => getTickets());
  const [employees, setEmployees] = useState(() => getEmployees());
  const [assignmentHistory, setAssignmentHistory] = useState(() => getAssignmentHistory());
  const [authorizedMarketingIds, setAuthorizedMarketingIds] = useState([]);

  useEffect(() => {
    async function loadMarketingAuth() {
      try {
        const res = await fetchMarketingAuthorizations();
        if (res?.success && Array.isArray(res.data)) {
          setAuthorizedMarketingIds(res.data.map(a => a.employeeId));
        }
      } catch (e) { }
    }
    loadMarketingAuth();
  }, []);

  const dbRoleStr = (user?.dbRole || '').toLowerCase().trim();
  const roleStr = (user?.role || '').toLowerCase().trim();
  const deptStr = (user?.department || '').toLowerCase().trim();

  const isTeamLeaderUser =
    dbRoleStr === 'team leader' ||
    dbRoleStr === 'tl' ||
    dbRoleStr === 'team lead' ||
    dbRoleStr === 'team_lead' ||
    dbRoleStr.includes('leader') ||
    roleStr.includes('leader') ||
    roleStr === 'tl' ||
    Boolean(user?.isLeader);

  const isMarketingUser =
    !isTeamLeaderUser &&
    (deptStr === 'marketing' ||
      dbRoleStr.includes('marketing') ||
      authorizedMarketingIds.includes(user?.id));

  const isHRDeptCheck = (d) => {
    if (!d) return false;
    const str = d.toLowerCase().trim();
    return (
      str === 'hr' ||
      str === 'human resources' ||
      str === 'human resource' ||
      str.startsWith('hr ') ||
      str.endsWith(' hr') ||
      str.includes(' hr ') ||
      str.includes('human resources') ||
      str.includes('human resource')
    );
  };

  const isHRUser =
    isHRDeptCheck(dbRoleStr) ||
    isHRDeptCheck(roleStr) ||
    isHRDeptCheck(deptStr);

  const isAdminUser =
    dbRoleStr === 'admin' ||
    dbRoleStr === 'superadmin' ||
    dbRoleStr === 'management' ||
    roleStr.includes('admin');

  const isITUser =
    dbRoleStr === 'it support' ||
    dbRoleStr === 'it_support' ||
    dbRoleStr === 'it engineer' ||
    dbRoleStr === 'it_engineer' ||
    dbRoleStr === 'it' ||
    roleStr === 'it engineer' ||
    roleStr === 'it support' ||
    roleStr.startsWith('it ') ||
    roleStr.endsWith(' it') ||
    roleStr.includes(' it ') ||
    roleStr.includes('it support') ||
    roleStr.includes('it engineer') ||
    roleStr.includes('network engineer') ||
    roleStr.includes('system administrator') ||
    deptStr === 'it' ||
    deptStr === 'it support' ||
    deptStr === 'information technology' ||
    deptStr === 'it department' ||
    deptStr.startsWith('it ') ||
    deptStr.endsWith(' it') ||
    deptStr.includes(' it ') ||
    deptStr.includes('it support') ||
    deptStr.includes('information technology') ||
    dbRoleStr.startsWith('it ') ||
    dbRoleStr.includes('it support') ||
    dbRoleStr.includes('it engineer');

  const isDnsUser =
    dbRoleStr === 'dns manager' ||
    deptStr === 'dns manager' ||
    dbRoleStr.includes('dns');

  // Complaint form states
  const [category, setCategory] = useState('RAM/Speed');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Live Employee Location State for Overview Top Section
  const [overviewLocation, setOverviewLocation] = useState('📍 Fetching location...');
  const [isLocLoading, setIsLocLoading] = useState(true);

  const fetchOverviewLocation = async () => {
    setIsLocLoading(true);
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.city && data.country_name) {
        setOverviewLocation(`📍 ${data.city}, ${data.region_code || ''} ${data.country_name} (${data.ip})`);
      } else {
        setOverviewLocation('📍 Location Verified (GPS Active)');
      }
    } catch (e) {
      setOverviewLocation('📍 Main Office HQ (GPS Active)');
    } finally {
      setIsLocLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewLocation();
  }, []);

  // Apply Leave State
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveFromDate, setLeaveFromDate] = useState('');
  const [leaveToDate, setLeaveToDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const fetchLeaves = async () => {
    if (!user?.id) return;
    setLoadingLeaves(true);
    try {
      const data = await fetchEmployeeLeaves(user.id);
      if (data && data.success) {
        setLeaveRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaves on mobile:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'apply-leave' && user?.id) {
      fetchLeaves();
    }
  }, [activeTab, user?.id]);

  const handleApplyLeave = async () => {
    if (!leaveFromDate.trim() || !leaveToDate.trim()) {
      sweetAlert({ title: 'Missing Dates', text: 'Please enter both From Date and To Date.', type: 'error' });
      return;
    }
    if (!leaveReason.trim()) {
      sweetAlert({ title: 'Missing Reason', text: 'Please enter a reason for your leave request.', type: 'error' });
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await applyLeaveRequest({
        employeeId: user.id,
        employeeName: user.name || 'Employee',
        leaveType,
        fromDate: leaveFromDate.trim(),
        toDate: leaveToDate.trim(),
        reason: leaveReason.trim(),
      });

      if (res && res.success) {
        setLeaveFromDate('');
        setLeaveToDate('');
        setLeaveReason('');
        await fetchLeaves();

        sweetAlert({
          title: 'Leave Applied! 🌴',
          text: 'Your leave request has been submitted to your manager for approval.',
          type: 'success',
        });
      } else {
        sweetAlert({
          title: 'Leave Application Failed',
          text: res?.message || 'Could not submit leave request.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Network Error',
        text: 'Failed to connect to the server to submit leave. Please check your network connection.',
        type: 'error',
      });
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Search/Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const prevResolvedCountRef = useRef(null);

  const refreshData = () => {
    const allSystems = getSystems();
    const allTickets = getTickets();
    const allEmployees = getEmployees();
    const allHistory = getAssignmentHistory();

    setSystems(allSystems);
    setTickets(allTickets);
    setEmployees(allEmployees);
    setAssignmentHistory(allHistory);

    // Play sound if a ticket belonging to this employee was resolved
    const resolvedCount = allTickets.filter(t => t.employeeId === user.id && t.status === 'Resolved').length;
    if (prevResolvedCountRef.current !== null && resolvedCount > prevResolvedCountRef.current) {
      playTicketSound('ticket_resolved');
    }
    prevResolvedCountRef.current = resolvedCount;
  };

  useEffect(() => {
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncWithServer();
    refreshData();
    setRefreshing(false);
  };

  // Get data specific to logged in employee
  const empDetails = employees.find(e => e.id === user.id) || { name: user.name, ticketLimit: 5 };
  const employeeTickets = tickets.filter(t => t.employeeId === user.id);
  const activeSystems = systems.filter(s => s.assignedTo === user.id);

  // Sort assignment history logs descending (latest history first)
  const empHistory = [...assignmentHistory]
    .filter(h => h.employeeId === user.id)
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  // Device History Pagination
  const historyLogsPerPage = 5;
  const totalHistoryPages = Math.ceil(empHistory.length / historyLogsPerPage) || 1;
  const currentHistoryLogs = empHistory.slice((historyPage - 1) * historyLogsPerPage, historyPage * historyLogsPerPage);

  // Stats calculation (ticket limit applies to active unresolved issues: Open / In Progress)
  const totalRaised = employeeTickets.length;
  const activeUnresolved = employeeTickets.filter(t => t.status !== 'Resolved').length;
  const ticketLimit = empDetails.ticketLimit || 10;
  const remainingTickets = Math.max(0, ticketLimit - activeUnresolved);
  const isLimitReached = activeUnresolved >= ticketLimit;

  const handleRaiseComplaint = () => {
    setFormError('');
    setFormSuccess('');

    if (isLimitReached) {
      setFormError(`You have reached your ticket limit of ${ticketLimit} issues.`);
      return;
    }

    if (!description.trim()) {
      setFormError('Please describe the issue.');
      return;
    }

    // Default to first assigned system, or 'sys_none' if none
    const systemId = activeSystems.length > 0 ? activeSystems[0].id : 'sys_none';

    createTicket(user.id, systemId, category, description.trim(), severity);

    setDescription('');
    setFormSuccess('Complaint ticket raised successfully!');
    sweetAlert({
      title: 'Success',
      text: 'Complaint ticket raised successfully!',
      type: 'success',
    });

    // Auto redirect to records tab
    setTimeout(() => {
      setActiveTab('records');
      setFormSuccess('');
    }, 1500);

    refreshData();
  };

  const filteredTickets = employeeTickets.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      (t.id || '').toLowerCase().includes(query) ||
      (t.category || '').toLowerCase().includes(query) ||
      (t.severity || '').toLowerCase().includes(query) ||
      (t.status || '').toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query)
    );
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'marketing-trips':
        return <MarketingFieldScreen user={user} onBack={() => setActiveTab('overview')} />;
      case 'eod':
        return <EODSubmission currentUser={user} onBack={() => setActiveTab('overview')} />;
      case 'tasks':
        return <EmployeeTasks currentUser={user} />;
      case 'attendance':
        return <AttendanceLogs user={user} />;
      case 'chat':
        return <ChatScreen user={user} onBack={() => setActiveTab('overview')} />;
      case 'apply-leave':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>🌴 Apply Leave Application</Text>

            {/* Leave Application Form */}
            <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary, marginBottom: 12 }]}>New Leave Application Form</Text>

              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Leave Category</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Casual Leave', 'Sick Leave', 'Earned Leave', 'Unpaid Leave'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pickerItem,
                        { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: themeColors.border },
                        leaveType === cat && styles.pickerItemActive
                      ]}
                      onPress={() => setLeaveType(cat)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: themeColors.textPrimary },
                        leaveType === cat && styles.pickerItemTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Leave Dates Selection</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: themeColors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }
                ]}
                onPress={() => setShowCalendarModal(true)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>📅</Text>
                <TextInput
                  style={{ flex: 1, color: themeColors.textPrimary, padding: 0, fontWeight: (leaveFromDate || leaveToDate) ? '700' : '400' }}
                  placeholder="Select Leave Dates (Single or Range)..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={leaveFromDate || leaveToDate ? `${leaveFromDate || 'Start'} ➔ ${leaveToDate || 'End'}` : ''}
                  editable={false}
                  pointerEvents="none"
                />
                {(leaveFromDate || leaveToDate) ? (
                  <TouchableOpacity onPress={() => { setLeaveFromDate(''); setLeaveToDate(''); }} style={{ padding: 4 }}>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>

              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Reason / Remarks</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: isDark ? '#0f172a' : '#ffffff', color: themeColors.textPrimary, borderColor: themeColors.border, minHeight: 120, height: 130, textAlignVertical: 'top' }
                ]}
                placeholder="State your reason for leave application..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={5}
                value={leaveReason}
                onChangeText={setLeaveReason}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#2563eb', marginTop: 14, opacity: submittingLeave ? 0.7 : 1 }]}
                onPress={handleApplyLeave}
                disabled={submittingLeave}
              >
                {submittingLeave ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Leave Application 🌴</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Past Applied Leaves History */}
            <Text style={[styles.subTitle, { color: themeColors.textPrimary, marginTop: 12 }]}>My Leave Requests ({leaveRequests.length})</Text>
            {loadingLeaves ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={{ color: themeColors.textSecondary, marginTop: 8, fontSize: 12 }}>Loading leave history...</Text>
              </View>
            ) : leaveRequests.length === 0 ? (
              <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, padding: 20, alignItems: 'center', marginBottom: 10 }]}>
                <Text style={{ color: themeColors.textSecondary, fontStyle: 'italic', fontSize: 13 }}>No leave requests found.</Text>
              </View>
            ) : (
              leaveRequests.map(req => {
                const appliedDateStr = req.appliedAt ? new Date(req.appliedAt).toLocaleDateString() : (req.appliedOn || 'N/A');
                return (
                  <View key={req.id} style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: themeColors.textPrimary }}>{req.leaveType}</Text>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                        backgroundColor: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: req.status === 'Approved' ? '#166534' : req.status === 'Rejected' ? '#991b1b' : '#92400e',
                        }}>
                          {req.status === 'Approved' ? 'Approved ✅' : req.status === 'Rejected' ? 'Rejected ❌' : 'Pending ⏳'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '700', marginTop: 4 }}>
                      📅 {req.fromDate} to {req.toDate} ({req.totalDays} Day{req.totalDays > 1 ? 's' : ''})
                    </Text>
                    <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginTop: 4 }} numberOfLines={2}>{req.reason}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>Applied: {appliedDateStr}</Text>
                      <TouchableOpacity
                        style={{
                          paddingVertical: 5,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#334155' : '#f1f5f9',
                          borderWidth: 1,
                          borderColor: themeColors.border,
                        }}
                        onPress={() => setSelectedLeaveDetails(req)}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.textPrimary }}>👁️ View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        );

      case 'file-complaint':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>🚨 File a Complaint</Text>

            <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              {formSuccess ? <Text style={styles.successText}>{formSuccess}</Text> : null}

              {isLimitReached ? (
                <View style={styles.limitBanner}>
                  <Text style={styles.limitBannerText}>
                    ⚠️ Active Ticket Limit Reached ({activeUnresolved}/{ticketLimit} open issues). Please wait for IT Support to resolve existing issues.
                  </Text>
                </View>
              ) : (
                <View style={styles.limitInfoBox}>
                  <Text style={styles.limitInfoText}>
                    Remaining Active Ticket Allowance: {remainingTickets} / {ticketLimit}
                  </Text>
                </View>
              )}

              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Issue Category</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['RAM/Speed', 'Hardware', 'Software', 'Network', 'Other'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pickerItem,
                        { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: themeColors.border },
                        category === cat && styles.pickerItemActive
                      ]}
                      onPress={() => setCategory(cat)}
                      disabled={isLimitReached}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: themeColors.textPrimary },
                        category === cat && styles.pickerItemTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Severity Level</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                    <TouchableOpacity
                      key={sev}
                      style={[
                        styles.pickerItem,
                        { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: themeColors.border },
                        severity === sev && styles.pickerItemActive
                      ]}
                      onPress={() => setSeverity(sev)}
                      disabled={isLimitReached}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: themeColors.textPrimary },
                        severity === sev && styles.pickerItemTextActive
                      ]}>
                        {sev}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Describe the Problem</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: isDark ? '#0f172a' : '#ffffff', color: themeColors.textPrimary, borderColor: themeColors.border }
                ]}
                placeholder="Describe your hardware issue in detail..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                editable={!isLimitReached}
              />

              <TouchableOpacity
                style={[styles.submitBtn, isLimitReached && styles.submitBtnDisabled]}
                onPress={handleRaiseComplaint}
                disabled={isLimitReached}
              >
                <Text style={styles.submitBtnText}>Submit Complaint Ticket</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'records':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>📋 Complaint Records</Text>

            <TextInput
              style={[
                styles.searchInput,
                { backgroundColor: themeColors.cardBg, color: themeColors.textPrimary, borderColor: themeColors.border }
              ]}
              placeholder="Search my tickets..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {filteredTickets.length === 0 ? (
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No tickets recorded.</Text>
            ) : (
              filteredTickets.map(t => (
                <View key={t.id} style={[styles.ticketCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.ticketCategory, { color: themeColors.textPrimary }]}>{t.category}</Text>
                    <View style={[
                      styles.statusBadge,
                      t.status === 'Open' && styles.badgeOpen,
                      t.status === 'In Progress' && styles.badgeProgress,
                      t.status === 'Resolved' && styles.badgeResolved
                    ]}>
                      <Text style={[
                        styles.statusText,
                        t.status === 'Open' && { color: '#dc2626' },
                        t.status === 'In Progress' && { color: '#d97706' },
                        t.status === 'Resolved' && { color: '#059669' }
                      ]}>{t.status}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                  <Text style={[styles.description, { color: themeColors.textSecondary }]}>{t.description}</Text>
                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <View style={styles.cardFooter}>
                    <Text style={[styles.footerDate, { color: themeColors.textSecondary }]}>
                      Raised: {new Date(t.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.severityVal}>⚠️ {t.severity}</Text>
                  </View>

                  {t.status === 'Resolved' && (
                    <View style={[styles.notesBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: themeColors.border }]}>
                      <Text style={[styles.notesTitle, { color: themeColors.textPrimary }]}>IT Support Resolution Notes:</Text>
                      <Text style={[styles.notesText, { color: themeColors.textSecondary }]}>{t.notes || 'Problem fixed.'}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'profile':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>My Profile Details</Text>

            <View style={[styles.profileCardFull, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarTextLarge}>
                  {empDetails.name ? empDetails.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={[styles.profileNameLarge, { color: themeColors.textPrimary }]}>{empDetails.name}</Text>
              <Text style={styles.profileRoleLabel}>{empDetails.role || 'Employee'}</Text>

              <View style={[styles.profileInfoList, { borderTopColor: themeColors.border }]}>
                <View style={[styles.profileInfoItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.profileInfoLabel, { color: themeColors.textSecondary }]}>Email Address</Text>
                  <Text style={[styles.profileInfoVal, { color: themeColors.textPrimary }]}>{empDetails.email || 'N/A'}</Text>
                </View>
                <View style={[styles.profileInfoItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.profileInfoLabel, { color: themeColors.textSecondary }]}>Department</Text>
                  <Text style={[styles.profileInfoVal, { color: themeColors.textPrimary }]}>{empDetails.department || 'Operations'}</Text>
                </View>
                <View style={[styles.profileInfoItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.profileInfoLabel, { color: themeColors.textSecondary }]}>Max Ticket Limit</Text>
                  <Text style={[styles.profileInfoVal, { color: themeColors.textPrimary }]}>{empDetails.ticketLimit || 5} active issues</Text>
                </View>
                <View style={[styles.profileInfoItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.profileInfoLabel, { color: themeColors.textSecondary }]}>Open Tickets Raised</Text>
                  <Text style={[styles.profileInfoVal, { color: themeColors.textPrimary }]}>{totalRaised} tickets</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.subTitle, { color: themeColors.textPrimary }]}>My Assigned Equipment</Text>
            {activeSystems.length === 0 ? (
              <View style={[styles.noSystemCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                <Text style={[styles.noSystemText, { color: themeColors.textSecondary }]}>No hardware system currently assigned to you.</Text>
              </View>
            ) : (
              activeSystems.map(sys => (
                <View key={sys.id} style={[styles.systemCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  <View style={styles.systemHeader}>
                    <Text style={[styles.systemNumberText, { color: themeColors.textPrimary }]}>💻 {sys.systemNumber}</Text>
                    <Text style={styles.systemStatusActive}>Assigned</Text>
                  </View>
                  <View style={styles.systemDetailsGrid}>
                    <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>🧠 <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>CPU:</Text> {sys.cpu}</Text>
                    <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>⚡ <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>RAM:</Text> {sys.ram}</Text>
                    <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>💾 <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Storage:</Text> {sys.storage}</Text>
                    <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>🎮 <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>GPU:</Text> {sys.gpu || 'Integrated'}</Text>
                    <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>💿 <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>OS:</Text> {sys.os}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'overview':
      default: {
        const getGreeting = () => {
          const hr = new Date().getHours();
          if (hr < 12) return 'Good morning';
          if (hr < 17) return 'Good afternoon';
          return 'Good evening';
        };
        const formattedDate = new Date().toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

        return (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} />}
            showsVerticalScrollIndicator={false}
          >
            {/* Executive Workspace Greeting Banner */}
            <View style={styles.heroGreetingWrap}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroGreetingSub, { color: themeColors.textSecondary }]}>
                  {formattedDate} • {user.department || 'Operations'}
                </Text>
                <Text style={[styles.heroGreetingTitle, { color: themeColors.textPrimary }]}>
                  {getGreeting()}, {empDetails.name?.split(' ')[0] || 'Team'} 👋
                </Text>
              </View>

              <View style={[styles.roleChip, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe' }]}>
                <Text style={[styles.roleChipText, { color: '#2563eb' }]}>
                  {empDetails.role || 'Member'}
                </Text>
              </View>
            </View>

            {/* Profile & Live Telemetry Overview Header */}
            <View style={[styles.profileCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
              <View style={styles.profileHeaderRow}>
                <View style={styles.profileLeftCol}>
                  <View style={styles.profileAvatarThumb}>
                    <Text style={styles.profileAvatarThumbText}>
                      {empDetails.name ? empDetails.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120 }}>
                    <Text style={[styles.profileName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {empDetails.name}
                    </Text>
                    <Text style={[styles.profileMeta, { color: themeColors.textSecondary }]}>
                      {empDetails.email || 'employee@devicedesk.com'}
                    </Text>
                  </View>
                </View>

                {/* Location Badge */}
                <TouchableOpacity
                  style={[styles.locationChip, { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }]}
                  onPress={fetchOverviewLocation}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 10 }}>📍</Text>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#2563eb' }}>Location</Text>
                  </View>
                  <Text style={{ fontSize: 10.5, color: themeColors.textPrimary, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
                    {overviewLocation}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.profileBottomBar, { borderTopColor: themeColors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13 }}>🎫</Text>
                  <Text style={[styles.profileMeta, { color: themeColors.textSecondary, marginTop: 0 }]}>
                    Ticket Quota: <Text style={{ fontWeight: '700', color: themeColors.textPrimary }}>{totalRaised} / {ticketLimit} active</Text>
                  </Text>
                </View>

                <TouchableOpacity onPress={fetchOverviewLocation} disabled={isLocLoading} style={styles.refreshLocPill}>
                  <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '800' }}>
                    {isLocLoading ? 'Locating...' : 'Refresh ↻'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Action: Apply Leave Banner */}
            <TouchableOpacity
              style={[
                styles.actionCardBanner,
                {
                  backgroundColor: isDark ? '#141418' : '#f8faff',
                  borderColor: isDark ? '#27272a' : '#dbeafe',
                }
              ]}
              onPress={() => setActiveTab('apply-leave')}
              activeOpacity={0.88}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                <View style={[styles.actionIconSquircle, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff' }]}>
                  <Text style={{ fontSize: 20 }}>🌴</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionBannerTitle, { color: themeColors.textPrimary }]}>Request Time Off</Text>
                  <Text style={[styles.actionBannerSub, { color: themeColors.textSecondary }]}>Casual, Sick or Annual leaves</Text>
                </View>
              </View>
              <View style={styles.actionArrowBtn}>
                <Text style={styles.actionArrowBtnText}>Apply ➔</Text>
              </View>
            </TouchableOpacity>

            {/* Quick Action: Marketing Field Trips & Live GPS Radar */}
            {isMarketingUser && (
              <TouchableOpacity
                style={[
                  styles.actionCardBanner,
                  {
                    backgroundColor: isDark ? '#0c222e' : '#ecfeff',
                    borderColor: isDark ? '#155e75' : '#a5f3fc',
                    marginTop: 10,
                  },
                ]}
                onPress={() => setActiveTab('marketing-trips')}
                activeOpacity={0.88}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                  <View style={[styles.actionIconSquircle, { backgroundColor: isDark ? 'rgba(8, 145, 178, 0.25)' : '#cffafe' }]}>
                    <Text style={{ fontSize: 20 }}>🚗</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionBannerTitle, { color: themeColors.textPrimary }]}>
                      Marketing Field Radar
                    </Text>
                    <Text style={[styles.actionBannerSub, { color: themeColors.textSecondary }]}>
                      GPS route planner & visit log
                    </Text>
                  </View>
                </View>
                <View style={[styles.actionArrowBtn, { backgroundColor: '#0891b2' }]}>
                  <Text style={styles.actionArrowBtnText}>Live Radar ➔</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Attendance Punch Section */}
            <AttendanceWidget user={user} />

            {/* Assigned Hardware */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.subTitle, { color: themeColors.textPrimary, marginTop: 0 }]}>Assigned Equipment</Text>
              <View style={[styles.countBadge, { backgroundColor: isDark ? '#141418' : '#eff6ff', borderColor: isDark ? '#27272a' : '#bfdbfe' }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563eb' }}>{activeSystems.length} Machine{activeSystems.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {activeSystems.length === 0 ? (
              <View style={[styles.noSystemCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>💻</Text>
                <Text style={[styles.noSystemText, { color: themeColors.textPrimary }]}>No hardware currently assigned to you.</Text>
                <Text style={[styles.noSystemSubText, { color: themeColors.textSecondary }]}>If you need a system, reach out to IT Support via the Tickets tab.</Text>
              </View>
            ) : (
              activeSystems.map(sys => (
                <View key={sys.id} style={[styles.systemCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  <View style={styles.systemHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.systemIconWrap, { backgroundColor: isDark ? '#141418' : '#eff6ff' }]}>
                        <Text style={{ fontSize: 18 }}>🖥️</Text>
                      </View>
                      <View>
                        <Text style={[styles.systemNo, { color: themeColors.textPrimary }]}>{sys.systemNumber}</Text>
                        <Text style={[styles.systemModel, { color: themeColors.textSecondary }]}>{sys.model || 'Office Workstation'}</Text>
                      </View>
                    </View>
                    <View style={styles.systemStatusActiveBadge}>
                      <View style={styles.systemStatusDot} />
                      <Text style={styles.systemStatusActiveText}>Active</Text>
                    </View>
                  </View>

                  <View style={styles.specsMatrix}>
                    <View style={[styles.specChip, { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }]}>
                      <Text style={[styles.specChipLabel, { color: themeColors.textSecondary }]}>🧠 CPU</Text>
                      <Text style={[styles.specChipVal, { color: themeColors.textPrimary }]} numberOfLines={1}>{sys.cpu || 'N/A'}</Text>
                    </View>

                    <View style={[styles.specChip, { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }]}>
                      <Text style={[styles.specChipLabel, { color: themeColors.textSecondary }]}>⚡ MEMORY</Text>
                      <Text style={[styles.specChipVal, { color: themeColors.textPrimary }]} numberOfLines={1}>{sys.ram || 'N/A'}</Text>
                    </View>

                    <View style={[styles.specChip, { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }]}>
                      <Text style={[styles.specChipLabel, { color: themeColors.textSecondary }]}>💾 STORAGE</Text>
                      <Text style={[styles.specChipVal, { color: themeColors.textPrimary }]} numberOfLines={1}>{sys.storage || 'N/A'}</Text>
                    </View>

                    <View style={[styles.specChip, { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }]}>
                      <Text style={[styles.specChipLabel, { color: themeColors.textSecondary }]}>💿 OPERATING SYSTEM</Text>
                      <Text style={[styles.specChipVal, { color: themeColors.textPrimary }]} numberOfLines={1}>{sys.os || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Assignment History logs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 12 }}>
              <Text style={[styles.subTitle, { color: themeColors.textPrimary, marginBottom: 0, flexShrink: 1 }]}>
                📜 Device History Logs ({empHistory.length})
              </Text>
              {empHistory.length > 0 && (
                <View style={{ backgroundColor: isDark ? '#1e293b' : '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#bae6fd' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7' }}>Activity Timeline</Text>
                </View>
              )}
            </View>

            {empHistory.length === 0 ? (
              <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, padding: 20, alignItems: 'center' }]}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>📭</Text>
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No device transfers or history logged yet.</Text>
              </View>
            ) : (
              <>
                {currentHistoryLogs.map(log => {
                  const isAssigned = (log.action || '').toLowerCase().includes('assign') || (log.action || '').toLowerCase().includes('allocated');
                  const isReturned = (log.action || '').toLowerCase().includes('return') || (log.action || '').toLowerCase().includes('unassign');
                  const accentColor = isAssigned ? '#16a34a' : isReturned ? '#9333ea' : '#2563eb';
                  const badgeBg = isDark ? '#0f172a' : (isAssigned ? '#f0fdf4' : isReturned ? '#faf5ff' : '#eff6ff');
                  const badgeBorder = isAssigned ? '#bbf7d0' : isReturned ? '#e9d5ff' : '#bfdbfe';

                  return (
                    <View
                      key={log.id}
                      style={{
                        backgroundColor: themeColors.cardBg,
                        borderColor: themeColors.border,
                        borderWidth: 1,
                        borderRadius: 14,
                        marginBottom: 10,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 3,
                        elevation: 1,
                      }}
                    >
                      {/* Timeline Accent Bar */}
                      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: accentColor, borderRadius: 4, minHeight: 36 }} />

                      {/* Icon Bubble */}
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: badgeBg,
                        borderWidth: 1,
                        borderColor: isDark ? themeColors.border : badgeBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}>
                        <Text style={{ fontSize: 16 }}>
                          {isAssigned ? '💻' : isReturned ? '🔄' : '🛠️'}
                        </Text>
                      </View>

                      {/* Log Details Area */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                          <Text style={{ flex: 1, flexShrink: 1, fontSize: 13, fontWeight: '800', color: themeColors.textPrimary }} numberOfLines={2}>
                            {log.action}
                          </Text>
                          <Text style={{ fontSize: 10.5, color: themeColors.textSecondary, fontWeight: '600', flexShrink: 0, marginTop: 1 }}>
                            📅 {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          <View style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: themeColors.border }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>
                              System: {log.systemNumber}
                            </Text>
                          </View>
                          {log.assignedBy && (
                            <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>
                              by <Text style={{ fontWeight: '700', color: themeColors.textPrimary }}>{log.assignedBy}</Text>
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}

                {totalHistoryPages > 1 && (
                  <View style={[styles.paginationContainer, { borderTopColor: themeColors.border, marginTop: 14 }]}>
                    <TouchableOpacity
                      style={[styles.pageBtn, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }, historyPage === 1 && styles.pageBtnDisabled]}
                      onPress={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      <Text style={[styles.pageBtnText, historyPage === 1 && styles.pageBtnTextDisabled]}>
                        ◀ Prev
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.pageInfoText, { color: themeColors.textSecondary }]}>
                      Page {historyPage} of {totalHistoryPages}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }, historyPage === totalHistoryPages && styles.pageBtnDisabled]}
                      onPress={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                      disabled={historyPage === totalHistoryPages}
                    >
                      <Text style={[styles.pageBtnText, historyPage === totalHistoryPages && styles.pageBtnTextDisabled]}>
                        Next ▶
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        );
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { backgroundColor: themeColors.headerBg, borderBottomColor: themeColors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.hamburgerBtn, { backgroundColor: isDark ? '#141418' : '#f1f5f9', borderColor: themeColors.border }]}
            activeOpacity={0.7}
          >
            <AppIcon name="menu" size={20} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>

          <View>
            <Image
              source={isDark ? require('../../assets/flymedia_logo_white.png') : require('../../assets/flymedia_logo.png')}
              style={{ width: 130, height: 32 }}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Quick Theme Switcher Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? '#141418' : '#f1f5f9', borderColor: themeColors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon name={isDark ? 'sun' : 'moon'} size={17} color={isDark ? '#f59e0b' : '#64748b'} />
          </TouchableOpacity>

          {/* User Profile Avatar Pill that opens Drawer */}
          <TouchableOpacity
            style={[styles.headerAvatarPill, { backgroundColor: isDark ? '#141418' : '#f1f5f9', borderColor: themeColors.border }]}
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.headerAvatarCircle}>
              <Text style={styles.headerAvatarText}>
                {empDetails.name ? empDetails.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.headerOnlineDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Return Switcher Banner (HR, Team Leader, or Admin/IT) */}
      {onSwitchToAdmin && isHRUser ? (
        <TouchableOpacity
          style={[
            styles.leaderSwitchBanner,
            {
              backgroundColor: isDark ? '#1e293b' : '#fdf2f8',
              borderBottomColor: isDark ? '#831843' : '#fbcfe8',
            },
          ]}
          onPress={onSwitchToAdmin}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 16 }}>💼</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#f472b6' : '#be185d' }}>
                HR Portal Mode
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }} numberOfLines={1}>
                You are currently viewing your Employee Portal
              </Text>
            </View>
          </View>
          <View style={[styles.leaderSwitchBtnPill, { backgroundColor: '#db2777' }]}>
            <Text style={styles.leaderSwitchBtnPillText}>HR Portal</Text>
            <AppIcon name="arrow-right" size={12} color="#ffffff" />
          </View>
        </TouchableOpacity>
      ) : onSwitchToLeader ? (
        <TouchableOpacity
          style={[
            styles.leaderSwitchBanner,
            {
              backgroundColor: isDark ? '#1e293b' : '#eff6ff',
              borderBottomColor: isDark ? '#334155' : '#bfdbfe',
            },
          ]}
          onPress={onSwitchToLeader}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 16 }}>👔</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#93c5fd' : '#1d4ed8' }}>
                Team Leader Mode
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }} numberOfLines={1}>
                You are currently viewing your Employee Portal
              </Text>
            </View>
          </View>
          <View style={styles.leaderSwitchBtnPill}>
            <Text style={styles.leaderSwitchBtnPillText}>Leader Portal</Text>
            <AppIcon name="arrow-right" size={12} color="#ffffff" />
          </View>
        </TouchableOpacity>
      ) : onSwitchToAdmin ? (
        <TouchableOpacity
          style={[
            styles.leaderSwitchBanner,
            {
              backgroundColor: isDark ? '#1e293b' : (isITUser ? '#ecfeff' : '#eff6ff'),
              borderBottomColor: isDark ? '#334155' : (isITUser ? '#a5f3fc' : '#bfdbfe'),
            },
          ]}
          onPress={onSwitchToAdmin}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 16 }}>{isITUser ? '💻' : isDnsUser ? '🌐' : '🛡️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#93c5fd' : (isITUser ? '#0e7490' : '#1d4ed8') }}>
                {isITUser ? 'IT Support Mode' : isDnsUser ? 'DNS Manager Mode' : 'Admin Console Mode'}
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }} numberOfLines={1}>
                You are currently viewing your Employee Portal
              </Text>
            </View>
          </View>
          <View style={[styles.leaderSwitchBtnPill, isITUser && { backgroundColor: '#0891b2' }]}>
            <Text style={styles.leaderSwitchBtnPillText}>
              {isITUser ? 'IT Portal' : isDnsUser ? 'DNS Portal' : 'Admin Console'}
            </Text>
            <AppIcon name="arrow-right" size={12} color="#ffffff" />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Content wrapper */}
      <View style={styles.content}>{renderContent()}</View>

      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Settings & Policies</Text>

            <View style={[styles.settingsProfileSection, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: themeColors.border }]}>
              <Text style={[styles.settingsProfileTitle, { color: themeColors.textPrimary }]}>👤 My Profile Details</Text>
              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileDetailLabel, { color: themeColors.textSecondary }]}>Name:</Text>
                <Text style={[styles.profileDetailValue, { color: themeColors.textPrimary }]}>{empDetails.name}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileDetailLabel, { color: themeColors.textSecondary }]}>Email:</Text>
                <Text style={[styles.profileDetailValue, { color: themeColors.textPrimary }]}>{empDetails.email || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileDetailLabel, { color: themeColors.textSecondary }]}>Department:</Text>
                <Text style={[styles.profileDetailValue, { color: themeColors.textPrimary }]}>{empDetails.department || 'Operations'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileDetailLabel, { color: themeColors.textSecondary }]}>Role:</Text>
                <Text style={[styles.profileDetailValue, { color: themeColors.textPrimary }]}>{empDetails.role || 'Employee'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileDetailLabel, { color: themeColors.textSecondary }]}>Ticket Limit:</Text>
                <Text style={[styles.profileDetailValue, { color: themeColors.textPrimary }]}>{empDetails.ticketLimit || 5} active issues</Text>
              </View>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.legalHeader, { color: themeColors.textPrimary }]}>1. Privacy Policy & Data Collection</Text>
              <Text style={[styles.legalText, { color: themeColors.textSecondary }]}>
                {"Device Desk (DeviceDesk) is operated by Fly Media Technology. We collect minimal operational data including system specs, punch-in/out GPS coordinates, photos for IT tickets, and push notification tokens. Data is encrypted in transit and at rest. We never sell user data."}
              </Text>

              <Text style={[styles.legalHeader, { color: themeColors.textPrimary }]}>2. Terms & Conditions</Text>
              <Text style={[styles.legalText, { color: themeColors.textSecondary }]}>
                This system is provided exclusively for authorized corporate inventory tracking and maintenance coordination. Unauthorized access or attempt to tamper with system records is strictly prohibited.
              </Text>

              <Text style={[styles.legalHeader, { color: themeColors.textPrimary }]}>3. Permanent Account Deletion</Text>
              <Text style={[styles.legalText, { color: themeColors.textSecondary }]}>
                Deleting your account permanently deletes your profile, credentials, and raised tickets. You can delete your account using the button below or online at:
                {"\n"}https://devicedesk.flymediatech.com/account-deletion
              </Text>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  sweetAlert({
                    title: 'Are you sure?',
                    text: 'You will not be able to revert this account deletion! All assignments and tickets will be permanently removed.',
                    type: 'warning',
                    showCancel: true,
                    onConfirm: () => {
                      removeEmployee(user.id);
                      setShowSettingsModal(false);
                      onLogout();
                    }
                  });
                }}
              >
                <Text style={styles.deleteBtnText}>⚠️ Delete My Account</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} onPress={() => setShowSettingsModal(false)}>
              <Text style={[styles.closeBtnText, { color: themeColors.textPrimary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Hamburger Drawer Overlay */}
      {isDrawerOpen && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
          <View style={[styles.drawerContent, { backgroundColor: themeColors.drawerBg, borderColor: themeColors.border }]}>
            <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border }]}>
              <View style={styles.drawerAvatarContainer}>
                <Text style={styles.drawerAvatarText}>
                  {empDetails.name ? empDetails.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={[styles.drawerName, { color: themeColors.textPrimary }]}>{empDetails.name}</Text>
              <Text style={[styles.drawerEmail, { color: themeColors.drawerSubtext }]}>{empDetails.email || 'employee@devicedesk.com'}</Text>
            </View>

            <ScrollView
              style={styles.drawerItemsContainer}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
              {onSwitchToLeader && (
                <View style={{ marginBottom: 12, marginTop: 4 }}>
                  <View style={{
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>👔</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#f8fafc' : '#1e293b' }}>
                        Team Leader Mode
                      </Text>
                    </View>
                    <Switch
                      value={false}
                      onValueChange={() => {
                        setIsDrawerOpen(false);
                        onSwitchToLeader();
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={isDark ? '#94a3b8' : '#ffffff'}
                    />
                  </View>
                </View>
              )}

              {onSwitchToAdmin && isITUser && (
                <View style={{ marginBottom: 12, marginTop: onSwitchToLeader ? 0 : 4 }}>
                  <View style={{
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>💻</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#f8fafc' : '#1e293b' }}>
                        IT Engineer Mode
                      </Text>
                    </View>
                    <Switch
                      value={false}
                      onValueChange={() => {
                        setIsDrawerOpen(false);
                        onSwitchToAdmin();
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#a5f3fc' }}
                      thumbColor={isDark ? '#94a3b8' : '#ffffff'}
                    />
                  </View>
                </View>
              )}

              {onSwitchToAdmin && !isITUser && (
                <View style={{ marginBottom: 12, marginTop: onSwitchToLeader ? 0 : 4 }}>
                  <TouchableOpacity
                    style={{
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDark
                        ? (isHRUser ? 'rgba(236, 72, 153, 0.15)' : 'rgba(37, 99, 235, 0.15)')
                        : (isHRUser ? '#fdf2f8' : '#eff6ff'),
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isDark
                        ? (isHRUser ? 'rgba(236, 72, 153, 0.35)' : 'rgba(37, 99, 235, 0.35)')
                        : (isHRUser ? '#fbcfe8' : '#bfdbfe'),
                    }}
                    onPress={() => {
                      setIsDrawerOpen(false);
                      onSwitchToAdmin();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16 }}>{isHRUser ? '💼' : isDnsUser ? '🌐' : '🛡️'}</Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: isHRUser ? '#db2777' : '#2563eb',
                        }}
                      >
                        {isHRUser ? 'HR Administrator Portal' : isDnsUser ? 'DNS Manager Portal' : 'Admin Console'}
                      </Text>
                    </View>
                    <AppIcon
                      name="arrow-right"
                      size={14}
                      color={isHRUser ? '#db2777' : '#2563eb'}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {isMarketingUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'marketing-trips' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('marketing-trips'); setIsDrawerOpen(false); }}
                >
                  <AppIcon name="map-pin" size={18} color="#0891b2" style={{ marginRight: 12 }} />
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Marketing Field Trips</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  activeTab === 'apply-leave' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                ]}
                onPress={() => { setActiveTab('apply-leave'); setIsDrawerOpen(false); }}
              >
                <AppIcon name="leave" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Apply Leave Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  activeTab === 'file-complaint' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                ]}
                onPress={() => { setActiveTab('file-complaint'); setIsDrawerOpen(false); }}
              >
                <AppIcon name="alert" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>File Complaint Ticket</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  activeTab === 'profile' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                ]}
                onPress={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
              >
                <AppIcon name="profile" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { setShowSettingsModal(true); setIsDrawerOpen(false); }}
              >
                <AppIcon name="shield" size={18} color="#64748b" style={{ marginRight: 12 }} />
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Privacy & Terms</Text>
              </TouchableOpacity>

              {/* Theme Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    marginBottom: 8,
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#475569' : '#e2e8f0',
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleTheme}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name={isDark ? 'moon' : 'sun'} size={18} color={isDark ? '#f59e0b' : '#eab308'} style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 13.5, color: themeColors.drawerItemText, fontWeight: '700' }}>
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

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  sweetAlert({
                    title: 'Are you sure?',
                    text: 'You will not be able to revert this account deletion! All assignments and tickets will be permanently removed.',
                    type: 'warning',
                    showCancel: true,
                    onConfirm: () => {
                      removeEmployee(user.id);
                      onLogout();
                    }
                  });
                }}
              >
                <AppIcon name="trash" size={18} color="#dc2626" style={{ marginRight: 12 }} />
                <Text style={[styles.drawerItemLabel, { color: '#dc2626' }]}>Delete User Account</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.drawerLogoutBtn,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.28)' : '#fca5a5',
                }
              ]}
              onPress={() => {
                setIsDrawerOpen(false);
                sweetAlert({
                  title: 'Log Out',
                  text: 'Are you sure you want to log out of your session?',
                  type: 'warning',
                  showCancel: true,
                  onConfirm: onLogout,
                });
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="logout" size={15} color={isDark ? '#f87171' : '#dc2626'} />
                <Text style={[styles.drawerLogoutText, { color: isDark ? '#f87171' : '#dc2626' }]}>
                  Sign Out of Session
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Sections Bottom Navigation Bar */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? '#09090b' : '#ffffff', borderTopColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && [styles.tabItemActive, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]]}
          onPress={() => setActiveTab('overview')}
          activeOpacity={0.7}
        >
          <AppIcon name="overview" size={19} color={activeTab === 'overview' ? '#2563eb' : themeColors.textSecondary} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.tabLabel, { color: activeTab === 'overview' ? '#2563eb' : themeColors.textSecondary }, activeTab === 'overview' && styles.tabLabelActive]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'records' && [styles.tabItemActive, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]]}
          onPress={() => setActiveTab('records')}
          activeOpacity={0.7}
        >
          <AppIcon name="records" size={19} color={activeTab === 'records' ? '#2563eb' : themeColors.textSecondary} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.tabLabel, { color: activeTab === 'records' ? '#2563eb' : themeColors.textSecondary }, activeTab === 'records' && styles.tabLabelActive]}
          >
            Tickets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            styles.tabItemAttendance,
            activeTab === 'attendance' && [styles.tabItemActive, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }],
          ]}
          onPress={() => setActiveTab('attendance')}
          activeOpacity={0.7}
        >
          <AppIcon name="attendance" size={19} color={activeTab === 'attendance' ? '#2563eb' : themeColors.textSecondary} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.tabLabel, { color: activeTab === 'attendance' ? '#2563eb' : themeColors.textSecondary }, activeTab === 'attendance' && styles.tabLabelActive]}
          >
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tasks' && [styles.tabItemActive, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]]}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.7}
        >
          <AppIcon name="tasks" size={19} color={activeTab === 'tasks' ? '#2563eb' : themeColors.textSecondary} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.tabLabel, { color: activeTab === 'tasks' ? '#2563eb' : themeColors.textSecondary }, activeTab === 'tasks' && styles.tabLabelActive]}
          >
            Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'chat' && [styles.tabItemActive, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]]}
          onPress={() => setActiveTab('chat')}
          activeOpacity={0.7}
        >
          <AppIcon name="chat" size={19} color={activeTab === 'chat' ? '#2563eb' : themeColors.textSecondary} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.tabLabel, { color: activeTab === 'chat' ? '#2563eb' : themeColors.textSecondary }, activeTab === 'chat' && styles.tabLabelActive]}
          >
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Single Calendar Picker Modal */}
      <CalendarPickerModal
        visible={showCalendarModal}
        title="Select Leave Dates"
        fromDate={leaveFromDate}
        toDate={leaveToDate}
        onSelectRange={(start, end) => {
          setLeaveFromDate(start);
          setLeaveToDate(end);
        }}
        onClose={() => setShowCalendarModal(false)}
      />

      {/* Leave Details Modal */}
      {selectedLeaveDetails && (
        <Modal
          visible={!!selectedLeaveDetails}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedLeaveDetails(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedLeaveDetails(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.modalContent,
                { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, width: '92%', maxWidth: 400 }
              ]}
            >
              {/* Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border, paddingBottom: 10, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: themeColors.textPrimary }}>🌴 Leave Application Details</Text>
                <TouchableOpacity onPress={() => setSelectedLeaveDetails(null)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.textSecondary }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable Details Body */}
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                <View style={{ gap: 10, paddingRight: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: themeColors.textSecondary, fontWeight: '600' }}>Application ID:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#2563eb' }}>{selectedLeaveDetails.id}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: themeColors.textSecondary, fontWeight: '600' }}>Leave Category:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: themeColors.textPrimary }}>{selectedLeaveDetails.leaveType}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: themeColors.textSecondary, fontWeight: '600' }}>Status:</Text>
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 12,
                      backgroundColor: selectedLeaveDetails.status === 'Approved' ? '#dcfce7' : selectedLeaveDetails.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: selectedLeaveDetails.status === 'Approved' ? '#166534' : selectedLeaveDetails.status === 'Rejected' ? '#991b1b' : '#92400e',
                      }}>
                        {selectedLeaveDetails.status === 'Approved' ? 'Approved ✅' : selectedLeaveDetails.status === 'Rejected' ? 'Rejected ❌' : 'Pending Approval ⏳'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: themeColors.textSecondary, fontWeight: '600' }}>Duration:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb' }}>
                      {selectedLeaveDetails.fromDate} to {selectedLeaveDetails.toDate} ({selectedLeaveDetails.totalDays} Day{selectedLeaveDetails.totalDays > 1 ? 's' : ''})
                    </Text>
                  </View>

                  {/* Scrollable Reason / Remarks Description Box */}
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 4 }}>Reason / Remarks Description:</Text>
                    <View style={{ borderRadius: 8, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderWidth: 1, borderColor: themeColors.border, overflow: 'hidden', minHeight: 120 }}>
                      <ScrollView style={{ maxHeight: 180, minHeight: 120, padding: 12 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        <Text style={{ fontSize: 13.5, color: themeColors.textPrimary, lineHeight: 20 }}>{selectedLeaveDetails.reason}</Text>
                      </ScrollView>
                    </View>
                  </View>

                  {/* Scrollable Manager Notes Box */}
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 4 }}>Manager / Approval Notes:</Text>
                    <View style={{ borderRadius: 8, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderWidth: 1, borderColor: themeColors.border, overflow: 'hidden' }}>
                      <ScrollView style={{ maxHeight: 100, padding: 10 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        <Text style={{ fontSize: 12.5, color: themeColors.textPrimary, fontStyle: 'italic', lineHeight: 17 }}>
                          {selectedLeaveDetails.rejectionReason || selectedLeaveDetails.managerNotes || (selectedLeaveDetails.status === 'Pending' ? 'Submitted to HR / Manager for review and approval.' : (selectedLeaveDetails.reviewedBy ? `Reviewed by ${selectedLeaveDetails.reviewedBy} on ${selectedLeaveDetails.reviewedAt ? new Date(selectedLeaveDetails.reviewedAt).toLocaleDateString() : ''}` : 'Approved by Management.'))}
                        </Text>
                      </ScrollView>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>Submitted On:</Text>
                    <Text style={{ fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' }}>
                      {selectedLeaveDetails.appliedAt ? new Date(selectedLeaveDetails.appliedAt).toLocaleDateString() : (selectedLeaveDetails.appliedOn || 'N/A')}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0', marginTop: 16 }]}
                onPress={() => setSelectedLeaveDetails(null)}
              >
                <Text style={[styles.closeBtnText, { color: themeColors.textPrimary }]}>Close Details</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  hamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarPill: {
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
    position: 'relative',
  },
  headerAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  headerOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    position: 'absolute',
    bottom: 1,
    right: 1,
  },
  heroGreetingWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 2,
  },
  heroGreetingSub: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroGreetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  profileLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  profileAvatarThumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarThumbText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  profileMeta: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  locationChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: 150,
  },
  profileBottomBar: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshLocPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  actionCardBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconSquircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  actionBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  actionArrowBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  actionArrowBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  noSystemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },
  noSystemText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  noSystemSubText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  systemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  systemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  systemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemNo: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  systemModel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  systemStatusActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  systemStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 5,
  },
  systemStatusActiveText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  specsMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 116, 139, 0.1)',
  },
  specChip: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  specChipLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specChipVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyLogText: {
    color: '#334155',
    fontSize: 13,
  },
  historySubText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  historyTime: {
    color: '#64748b',
    fontSize: 11,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pageBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: '#2563eb',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pageBtnTextDisabled: {
    color: '#94a3b8',
  },
  pageInfoText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: '#0f172a',
    marginBottom: 16,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 6,
    marginBottom: 16,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  pickerItemActive: {
    backgroundColor: '#2563eb',
  },
  pickerItemText: {
    color: '#64748b',
    fontSize: 12.5,
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '800',
  },
  limitBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  limitBannerText: {
    color: '#dc2626',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  limitInfoBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  limitInfoText: {
    color: '#059669',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  ticketCategory: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#2563eb',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeOpen: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  badgeProgress: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  badgeResolved: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  description: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerDate: {
    fontSize: 11.5,
    color: '#64748b',
  },
  severityVal: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  notesTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12.5,
    color: '#334155',
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 4,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 14,
    marginHorizontal: 1,
  },
  tabItemAttendance: {
    flex: 1.35,
  },
  tabItemActive: {
    borderRadius: 14,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 20,
  },
  legalHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 14,
    marginBottom: 6,
  },
  legalText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  settingsProfileSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
  },
  settingsProfileTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  profileDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  profileDetailValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  hamburgerBtn: {
    paddingRight: 12,
  },
  hamburgerIcon: {
    fontSize: 26,
    color: '#2563eb',
    fontWeight: '800',
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 999,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  drawerContent: {
    width: 290,
    height: '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 24,
    flexDirection: 'column',
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
    marginBottom: 12,
  },
  drawerAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  drawerAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2563eb',
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  drawerEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    textAlign: 'center',
  },
  drawerItemsContainer: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingVertical: 6,
    paddingBottom: 24,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  drawerItemActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  drawerItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  drawerLogoutBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  drawerLogoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  profileCardFull: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarTextLarge: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2563eb',
  },
  profileNameLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileRoleLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 20,
  },
  profileInfoList: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 15,
  },
  profileInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileInfoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  profileInfoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  employeeSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  employeeSwitchPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  leaderSwitchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  leaderSwitchBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  leaderSwitchBtnPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
