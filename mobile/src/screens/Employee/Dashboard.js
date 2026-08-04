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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function EmployeeDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, file-complaint, records, profile, tasks, attendance, chat
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      case 'file-complaint':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>🚨 File a Complaint</Text>

            <View style={styles.card}>
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

              <Text style={styles.label}>Issue Category</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['RAM/Speed', 'Hardware', 'Software', 'Network', 'Other'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.pickerItem, category === cat && styles.pickerItemActive]}
                      onPress={() => setCategory(cat)}
                      disabled={isLimitReached}
                    >
                      <Text style={[styles.pickerItemText, category === cat && styles.pickerItemTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Severity Level</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                    <TouchableOpacity
                      key={sev}
                      style={[styles.pickerItem, severity === sev && styles.pickerItemActive]}
                      onPress={() => setSeverity(sev)}
                      disabled={isLimitReached}
                    >
                      <Text style={[styles.pickerItemText, severity === sev && styles.pickerItemTextActive]}>
                        {sev}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Describe the Problem</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your hardware issue in detail..."
                placeholderTextColor="#94a3b8"
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
            <Text style={styles.sectionTitle}>📋 Complaint Records</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search my tickets..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {filteredTickets.length === 0 ? (
              <Text style={styles.emptyText}>No tickets recorded.</Text>
            ) : (
              filteredTickets.map(t => (
                <View key={t.id} style={styles.ticketCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.ticketCategory}>{t.category}</Text>
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

                  <View style={styles.divider} />
                  <Text style={styles.description}>{t.description}</Text>
                  <View style={styles.divider} />

                  <View style={styles.cardFooter}>
                    <Text style={styles.footerDate}>
                      Raised: {new Date(t.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.severityVal}>⚠️ {t.severity}</Text>
                  </View>

                  {t.status === 'Resolved' && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesTitle}>IT Support Resolution Notes:</Text>
                      <Text style={styles.notesText}>{t.notes || 'Problem fixed.'}</Text>
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
            <Text style={styles.sectionTitle}>My Profile Details</Text>

            <View style={styles.profileCardFull}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarTextLarge}>
                  {empDetails.name ? empDetails.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={styles.profileNameLarge}>{empDetails.name}</Text>
              <Text style={styles.profileRoleLabel}>{empDetails.role || 'Employee'}</Text>

              <View style={styles.profileInfoList}>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileInfoLabel}>Email Address</Text>
                  <Text style={styles.profileInfoVal}>{empDetails.email || 'N/A'}</Text>
                </View>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileInfoLabel}>Department</Text>
                  <Text style={styles.profileInfoVal}>{empDetails.department || 'Operations'}</Text>
                </View>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileInfoLabel}>Max Ticket Limit</Text>
                  <Text style={styles.profileInfoVal}>{empDetails.ticketLimit || 5} active issues</Text>
                </View>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileInfoLabel}>Open Tickets Raised</Text>
                  <Text style={styles.profileInfoVal}>{totalRaised} tickets</Text>
                </View>
              </View>
            </View>

            <Text style={styles.subTitle}>My Assigned Equipment</Text>
            {activeSystems.length === 0 ? (
              <View style={styles.noSystemCard}>
                <Text style={styles.noSystemText}>No hardware system currently assigned to you.</Text>
              </View>
            ) : (
              activeSystems.map(sys => (
                <View key={sys.id} style={styles.systemCard}>
                  <View style={styles.systemHeader}>
                    <Text style={styles.systemNumberText}>💻 {sys.systemNumber}</Text>
                    <Text style={styles.systemStatusActive}>Assigned</Text>
                  </View>
                  <View style={styles.systemDetailsGrid}>
                    <Text style={styles.specItem}>🧠 <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>CPU:</Text> {sys.cpu}</Text>
                    <Text style={styles.specItem}>⚡ <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>RAM:</Text> {sys.ram}</Text>
                    <Text style={styles.specItem}>💾 <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Storage:</Text> {sys.storage}</Text>
                    <Text style={styles.specItem}>🎮 <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>GPU:</Text> {sys.gpu || 'Integrated'}</Text>
                    <Text style={styles.specItem}>💿 <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>OS:</Text> {sys.os}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'overview':
      default:
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>My Workspace</Text>
            </View>

            {/* Profile Overview */}
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>👤 {empDetails.name}</Text>
              <Text style={styles.profileMeta}>Department: {user.department || 'Operations'}</Text>
              <Text style={styles.profileMeta}>Ticket Limit Status: {totalRaised} / {ticketLimit} used</Text>
            </View>

            {/* Attendance Punch Section */}
            <AttendanceWidget user={user} />

            {/* Assigned Hardware */}
            <Text style={styles.subTitle}>Assigned Hardware Inventory</Text>
            {activeSystems.length === 0 ? (
              <View style={styles.noSystemCard}>
                <Text style={styles.noSystemText}>No hardware system currently assigned to you.</Text>
                <Text style={styles.noSystemSubText}>If you require a machine, please contact IT Support.</Text>
              </View>
            ) : (
              activeSystems.map(sys => (
                <View key={sys.id} style={styles.systemCard}>
                  <View style={styles.systemHeader}>
                    <Text style={styles.systemNo}>{sys.systemNumber}</Text>
                    <Text style={styles.systemModel}>{sys.model}</Text>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.specItem}>🖥️ OS: {sys.os}</Text>
                  <Text style={styles.specItem}>🧠 CPU: {sys.cpu}</Text>
                  <Text style={styles.specItem}>🎮 GPU: {sys.gpu || 'Integrated'}</Text>
                  <Text style={styles.specItem}>💾 Memory/Storage: {sys.ram} / {sys.storage}</Text>
                  <Text style={styles.specItem}>🏷️ Status: {sys.status}</Text>
                </View>
              ))
            )}

            {/* Assignment History logs */}
            <Text style={styles.subTitle}>Device History Logs ({empHistory.length})</Text>
            {empHistory.length === 0 ? (
              <Text style={styles.emptyText}>No device transfers logged.</Text>
            ) : (
              <>
                {currentHistoryLogs.map(log => (
                  <View key={log.id} style={styles.historyRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.historyLogText}>
                        🛠️ {log.action} System <Text style={{ fontWeight: 'bold', color: '#2563eb' }}>{log.systemNumber}</Text>
                      </Text>
                      {log.assignedBy && (
                        <Text style={styles.historySubText}>Assigned by: {log.assignedBy}</Text>
                      )}
                    </View>
                    <Text style={styles.historyTime}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                ))}

                {totalHistoryPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <TouchableOpacity
                      style={[styles.pageBtn, historyPage === 1 && styles.pageBtnDisabled]}
                      onPress={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      <Text style={[styles.pageBtnText, historyPage === 1 && styles.pageBtnTextDisabled]}>
                        ◀ Prev
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfoText}>
                      Page {historyPage} of {totalHistoryPages}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, historyPage === totalHistoryPages && styles.pageBtnDisabled]}
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
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
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
              source={require('../../assets/flymedia-logo.png')}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings & Policies</Text>

            <View style={styles.settingsProfileSection}>
              <Text style={styles.settingsProfileTitle}>👤 My Profile Details</Text>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Name:</Text>
                <Text style={styles.profileDetailValue}>{empDetails.name}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Email:</Text>
                <Text style={styles.profileDetailValue}>{empDetails.email || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Department:</Text>
                <Text style={styles.profileDetailValue}>{empDetails.department || 'Operations'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Role:</Text>
                <Text style={styles.profileDetailValue}>{empDetails.role || 'Employee'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Ticket Limit:</Text>
                <Text style={styles.profileDetailValue}>{empDetails.ticketLimit || 5} active issues</Text>
              </View>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.legalHeader}>1. Privacy Policy</Text>
              <Text style={styles.legalText}>
                {"DeviceDesk collects system specifications, employee assignments, and IT support tickets to facilitate hardware inventory tracking. Data is cached locally on this device and synchronized with your organization's secure database server. We do not share, sell, or distribute your personal details or usage history to any third parties."}
              </Text>

              <Text style={styles.legalHeader}>2. Terms & Conditions</Text>
              <Text style={styles.legalText}>
                This system is provided exclusively for authorized internal corporate inventory tracking and maintenance coordination. Unauthorized access or attempt to tamper with system records is strictly prohibited. All transactions, assignments, and support tickets raised are logged and audited.
              </Text>

              <Text style={styles.legalHeader}>3. Permanent Account Deletion</Text>
              <Text style={styles.legalText}>
                Deleting your account will permanently wipe your profile record, delete your raised tickets, and unassign any active inventory assets. This action is immediate and cannot be undone.
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
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSettingsModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
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
          <View style={styles.drawerContent}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatarContainer}>
                <Text style={styles.drawerAvatarText}>
                  {empDetails.name ? empDetails.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={styles.drawerName}>{empDetails.name}</Text>
              <Text style={styles.drawerEmail}>{empDetails.email || 'employee@devicedesk.com'}</Text>
            </View>

            <View style={styles.drawerItemsContainer}>
              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'overview' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('overview'); setIsDrawerOpen(false); }}
              >
                <AppIcon name="overview" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={styles.drawerItemLabel}>Overview Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'tasks' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('tasks'); setIsDrawerOpen(false); }}
              >
                <AppIcon name="tasks" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={styles.drawerItemLabel}>My Tasks Board</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'attendance' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('attendance'); setIsDrawerOpen(false); }}
              >
                <AppIcon name="attendance" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={styles.drawerItemLabel}>My Attendance Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'profile' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
              >
                <AppIcon name="profile" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={styles.drawerItemLabel}>My Profile Screen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { setShowSettingsModal(true); setIsDrawerOpen(false); }}
              >
                <AppIcon name="shield" size={18} color="#64748b" style={{ marginRight: 12 }} />
                <Text style={styles.drawerItemLabel}>Privacy & Terms</Text>
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
                <Text style={styles.drawerItemLabel}>Delete User Account</Text>
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

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <AppIcon name="overview" size={20} color={activeTab === 'overview' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'overview' && styles.tabLabelActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'file-complaint' && styles.tabItemActive]}
          onPress={() => setActiveTab('file-complaint')}
        >
          <AppIcon name="alert" size={20} color={activeTab === 'file-complaint' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'file-complaint' && styles.tabLabelActive]}>
            File Ticket
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'records' && styles.tabItemActive]}
          onPress={() => setActiveTab('records')}
        >
          <AppIcon name="records" size={20} color={activeTab === 'records' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'records' && styles.tabLabelActive]}>
            My Tickets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'attendance' && styles.tabItemActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <AppIcon name="attendance" size={20} color={activeTab === 'attendance' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'attendance' && styles.tabLabelActive]}>
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <AppIcon name="tasks" size={20} color={activeTab === 'tasks' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'tasks' && styles.tabLabelActive]}>
            My Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
          onPress={() => setActiveTab('chat')}
        >
          <AppIcon name="chat" size={20} color={activeTab === 'chat' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabLabelActive]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>
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
