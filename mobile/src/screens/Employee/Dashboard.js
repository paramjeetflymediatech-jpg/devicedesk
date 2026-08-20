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
import EmployeeTasks from './EmployeeTasks';
import ChatScreen from '../ChatScreen';
import AttendanceWidget from '../../components/AttendanceWidget';
import AttendanceLogs from './AttendanceLogs';
import AppIcon from '../../components/AppIcon';
import CalendarPickerModal from '../../components/CalendarPickerModal';

export default function EmployeeDashboard({ user, onLogout }) {
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
  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: 'LV-101',
      leaveType: 'Casual Leave',
      fromDate: '2026-08-10',
      toDate: '2026-08-12',
      totalDays: 3,
      reason: 'Family event and personal travel',
      status: 'Approved',
      appliedOn: '2026-08-01',
      managerNotes: 'Approved by Line Manager. Work coverage assigned to Operations Team.',
    },
    {
      id: 'LV-102',
      leaveType: 'Sick Leave',
      fromDate: '2026-07-15',
      toDate: '2026-07-15',
      totalDays: 1,
      reason: 'Fever & viral infection recovery',
      status: 'Approved',
      appliedOn: '2026-07-15',
      managerNotes: 'Medical leave approved. Hope you feel better soon!',
    }
  ]);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveFromDate, setLeaveFromDate] = useState('');
  const [leaveToDate, setLeaveToDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const handleApplyLeave = () => {
    if (!leaveFromDate.trim() || !leaveToDate.trim()) {
      sweetAlert({ title: 'Missing Dates', text: 'Please enter both From Date and To Date.', type: 'error' });
      return;
    }
    if (!leaveReason.trim()) {
      sweetAlert({ title: 'Missing Reason', text: 'Please enter a reason for your leave request.', type: 'error' });
      return;
    }

    let calculatedDays = 1;
    try {
      const d1 = new Date(leaveFromDate.trim());
      const d2 = new Date(leaveToDate.trim());
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
        const diffTime = Math.abs(d2 - d1);
        calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    } catch (e) {
      calculatedDays = 1;
    }

    const newLeave = {
      id: `LV-${Math.floor(100 + Math.random() * 900)}`,
      leaveType,
      fromDate: leaveFromDate.trim(),
      toDate: leaveToDate.trim(),
      totalDays: calculatedDays,
      reason: leaveReason.trim(),
      status: 'Pending Approval',
      appliedOn: new Date().toISOString().split('T')[0],
    };

    setLeaveRequests([newLeave, ...leaveRequests]);
    setLeaveFromDate('');
    setLeaveToDate('');
    setLeaveReason('');

    sweetAlert({
      title: 'Leave Applied! 🌴',
      text: 'Your leave request has been submitted to your manager for approval.',
      type: 'success',
    });
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
                style={[styles.submitBtn, { backgroundColor: '#2563eb', marginTop: 14 }]}
                onPress={handleApplyLeave}
              >
                <Text style={styles.submitBtnText}>Submit Leave Application 🌴</Text>
              </TouchableOpacity>
            </View>

            {/* Past Applied Leaves History */}
            <Text style={[styles.subTitle, { color: themeColors.textPrimary, marginTop: 12 }]}>My Leave Requests ({leaveRequests.length})</Text>
            {leaveRequests.map(req => (
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
                  <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>Applied: {req.appliedOn}</Text>
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
            ))}
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
      default:
        return (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} />}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>My Workspace</Text>
            </View>

            {/* Profile & Live Location Overview Header */}
            <View style={[styles.profileCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 150 }}>
                  <Text style={[styles.profileName, { color: themeColors.textPrimary }]}>👤 {empDetails.name}</Text>
                  <Text style={[styles.profileMeta, { color: themeColors.textSecondary, marginTop: 2 }]}>Department: {user.department || 'Operations'}</Text>
                </View>

                {/* Location Badge */}
                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                    alignSelf: 'flex-start',
                  }}
                  onPress={fetchOverviewLocation}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11 }}>📍</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563eb' }}>Current Location</Text>
                  </View>
                  <Text style={{ fontSize: 10.5, color: themeColors.textPrimary, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                    {overviewLocation}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: themeColors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.profileMeta, { color: themeColors.textSecondary }]}>Ticket Limit Status: {totalRaised} / {ticketLimit} used</Text>
                <TouchableOpacity onPress={fetchOverviewLocation} disabled={isLocLoading}>
                  <Text style={{ fontSize: 10.5, color: '#2563eb', fontWeight: '800' }}>
                    {isLocLoading ? 'Locating...' : 'Refresh 🔄'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Action: Apply Leave Banner */}
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1e293b' : '#eff6ff',
                  borderColor: isDark ? '#334155' : '#bfdbfe',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  marginBottom: 16,
                }
              ]}
              onPress={() => setActiveTab('apply-leave')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>🌴</Text>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: themeColors.textPrimary }}>Need Time Off?</Text>
                  <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 2 }}>Apply for Casual, Sick, or Earned Leave</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>Apply Leave ➔</Text>
              </View>
            </TouchableOpacity>

            {/* Attendance Punch Section */}
            <AttendanceWidget user={user} />

            {/* Assigned Hardware */}
            <Text style={[styles.subTitle, { color: themeColors.textPrimary }]}>Assigned Hardware Inventory</Text>
            {activeSystems.length === 0 ? (
              <View style={[styles.noSystemCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                <Text style={[styles.noSystemText, { color: themeColors.textPrimary }]}>No hardware system currently assigned to you.</Text>
                <Text style={[styles.noSystemSubText, { color: themeColors.textSecondary }]}>If you require a machine, please contact IT Support.</Text>
              </View>
            ) : (
              activeSystems.map(sys => (
                <View key={sys.id} style={[styles.systemCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  <View style={styles.systemHeader}>
                    <Text style={[styles.systemNo, { color: themeColors.textPrimary }]}>{sys.systemNumber}</Text>
                    <Text style={[styles.systemModel, { color: themeColors.textSecondary }]}>{sys.model}</Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                  <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>🖥️ OS: {sys.os}</Text>
                  <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>🧠 CPU: {sys.cpu}</Text>
                  <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>🎮 GPU: {sys.gpu || 'Integrated'}</Text>
                  <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>💾 Memory/Storage: {sys.ram} / {sys.storage}</Text>
                  <Text style={[styles.specItem, { color: themeColors.textSecondary }]}>🏷️ Status: {sys.status}</Text>
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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { backgroundColor: themeColors.headerBg, borderColor: themeColors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={styles.hamburgerBtn}
          >
            <AppIcon name="menu" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Image
              source={isDark ? require('../../assets/flymedia_logo_white.png') : require('../../assets/flymedia_logo.png')}
              style={{ width: 140, height: 36 }}
              resizeMode="contain"
            />
          </View>
        </View>
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
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="logout" size={15} color="#dc2626" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </View>
        </TouchableOpacity>
      </View>

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
                {"DeviceDesk collects system specifications, employee assignments, location coordinates (GPS for punch in/out verification), camera photos for tickets/chat attachments, and IT support tickets to facilitate hardware inventory tracking. Data is stored securely in encrypted databases. We do not share, sell, or distribute your personal details or usage history to any third parties."}
              </Text>

              <Text style={[styles.legalHeader, { color: themeColors.textPrimary }]}>2. Terms & Conditions</Text>
              <Text style={[styles.legalText, { color: themeColors.textSecondary }]}>
                This system is provided exclusively for authorized internal corporate inventory tracking and maintenance coordination. Unauthorized access or attempt to tamper with system records is strictly prohibited. All transactions, assignments, and support tickets raised are logged and audited.
              </Text>

              <Text style={[styles.legalHeader, { color: themeColors.textPrimary }]}>3. Permanent Account Deletion</Text>
              <Text style={[styles.legalText, { color: themeColors.textSecondary }]}>
                Deleting your account will permanently wipe your profile record, delete your raised tickets, and unassign any active inventory assets. You can delete your account directly using the button below, or submit a deletion request on our web portal at https://devicedesk.app/account-deletion
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

            <View style={styles.drawerItemsContainer}>
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
                    justifyContent: 'space-between',
                    marginTop: 8,
                    marginBottom: 8,
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#475569' : '#e2e8f0',
                  }
                ]}
                activeOpacity={0.8}
                onPress={toggleTheme}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name={isDark ? 'moon' : 'sun'} size={18} color={isDark ? '#f59e0b' : '#eab308'} style={{ marginRight: 12 }} />
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
            </View>

            <TouchableOpacity
              style={styles.drawerLogoutBtn}
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
            >
              <Text style={styles.drawerLogoutText}>Log Out 🚪</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Sections Bottom Footer */}
      <View style={[styles.tabBar, { backgroundColor: themeColors.headerBg, borderColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <AppIcon name="overview" size={20} color={activeTab === 'overview' ? '#2563eb' : themeColors.textSecondary} />
          <Text style={[styles.tabLabel, { color: themeColors.textSecondary }, activeTab === 'overview' && styles.tabLabelActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'records' && styles.tabItemActive]}
          onPress={() => setActiveTab('records')}
        >
          <AppIcon name="records" size={20} color={activeTab === 'records' ? '#2563eb' : themeColors.textSecondary} />
          <Text style={[styles.tabLabel, { color: themeColors.textSecondary }, activeTab === 'records' && styles.tabLabelActive]}>
            My Tickets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'attendance' && styles.tabItemActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <AppIcon name="attendance" size={20} color={activeTab === 'attendance' ? '#2563eb' : themeColors.textSecondary} />
          <Text style={[styles.tabLabel, { color: themeColors.textSecondary }, activeTab === 'attendance' && styles.tabLabelActive]}>
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <AppIcon name="tasks" size={20} color={activeTab === 'tasks' ? '#2563eb' : themeColors.textSecondary} />
          <Text style={[styles.tabLabel, { color: themeColors.textSecondary }, activeTab === 'tasks' && styles.tabLabelActive]}>
            My Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
          onPress={() => setActiveTab('chat')}
        >
          <AppIcon name="chat" size={20} color={activeTab === 'chat' ? '#2563eb' : themeColors.textSecondary} />
          <Text style={[styles.tabLabel, { color: themeColors.textSecondary }, activeTab === 'chat' && styles.tabLabelActive]}>
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
                          {selectedLeaveDetails.managerNotes || 'Submitted to Line Manager for review and approval.'}
                        </Text>
                      </ScrollView>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>Submitted On:</Text>
                    <Text style={{ fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' }}>{selectedLeaveDetails.appliedOn}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
  },
  logoutBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  syncBtnText: {
    color: '#2563eb',
    fontSize: 12.5,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 22,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  profileMeta: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
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
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  noSystemSubText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 5,
  },
  systemCard: {
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
  systemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  systemNo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  systemNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  systemStatusActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    overflow: 'hidden',
  },
  systemDetailsGrid: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  systemModel: {
    fontSize: 14,
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  specItem: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
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
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
    marginTop: -8,
    paddingTop: 8,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
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
    width: 280,
    height: '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    paddingTop: 45,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 20,
    marginBottom: 20,
  },
  drawerAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  drawerAvatarText: {
    fontSize: 28,
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
    marginTop: 4,
    textAlign: 'center',
  },
  drawerItemsContainer: {
    flex: 1,
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
});
