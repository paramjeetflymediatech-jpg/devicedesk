import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Vibration,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStats, syncWithServer, getTickets, subscribe, removeEmployee } from '../../store/store';
import { sweetAlert } from '../../utils/sweetAlert';
import ManageSystems from './ManageSystems';
import ManageEmployees from './ManageEmployees';
import ManageTickets from './ManageTickets';
import ManageHistory from './ManageHistory';
import ManageDepartments from './ManageDepartments';
import ManageTasks from './ManageTasks';

const SEVERITY_COLOR = {
  Critical: '#f85149',
  High: '#d29922',
  Medium: '#58a6ff',
  Low: '#3fb950',
};

const STATUS_COLOR = {
  Open: '#f85149',
  'In Progress': '#d29922',
  Resolved: '#3fb950',
};

function getRelativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, systems, employees, tickets, profile
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stats, setStats] = useState(() => getStats());
  const [refreshing, setRefreshing] = useState(false);
  const [recentTickets, setRecentTickets] = useState(() => {
    const all = getTickets();
    return [...all].sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ).slice(0, 5);
  });
  const [newTicketAlert, setNewTicketAlert] = useState(false);

  // Track previous open ticket count to detect new ones
  const prevOpenCountRef = useRef(null);

  const loadData = () => {
    setStats(getStats());
    const all = getTickets();
    // Sort by date descending
    const sorted = [...all].sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    setRecentTickets(sorted.slice(0, 5));

    // Check for new Open tickets to trigger alert
    const openCount = all.filter(t => t.status === 'Open').length;
    if (prevOpenCountRef.current !== null && openCount > prevOpenCountRef.current) {
      // New ticket raised - trigger dual pulse vibration
      Vibration.vibrate([0, 400, 200, 400]);
      setNewTicketAlert(true);
      setTimeout(() => setNewTicketAlert(false), 5000);
    }
    prevOpenCountRef.current = openCount;
  };

  useEffect(() => {
    // Subscribe to store updates (fires after syncWithServer or local changes)
    const unsubscribe = subscribe(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncWithServer();
    loadData();
    setRefreshing(false);
  };

  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {newTicketAlert && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>🔔 New ticket raised! Check Tickets tab.</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
        <TouchableOpacity style={styles.syncBtn} onPress={handleRefresh}>
          <Text style={styles.syncBtnText}>{refreshing ? 'Syncing...' : 'Sync Data 🔄'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stat Cards Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🖥️</Text>
          <Text style={styles.statVal}>{stats.totalSystems}</Text>
          <Text style={styles.statLabel}>Total Systems</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔗</Text>
          <Text style={styles.statVal}>{stats.activeAssignments}</Text>
          <Text style={styles.statLabel}>Assigned Systems</Text>
        </View>

        <View style={[styles.statCard, stats.pendingComplaints > 0 && styles.statCardWarning]}>
          <Text style={styles.statIcon}>🚨</Text>
          <Text style={styles.statVal}>{stats.pendingComplaints}</Text>
          <Text style={styles.statLabel}>Pending Tickets</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statVal}>{stats.avgResolutionTimeStr}</Text>
          <Text style={styles.statLabel}>Avg. Resolve Time</Text>
        </View>
      </View>

      {/* Latest 5 Tickets */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <Text style={styles.sectionCardTitle}>🎫 Latest Tickets</Text>
          <TouchableOpacity onPress={() => setActiveTab('tickets')}>
            <Text style={styles.viewAllLink}>View All →</Text>
          </TouchableOpacity>
        </View>

        {recentTickets.length === 0 ? (
          <Text style={styles.emptyText}>No tickets yet.</Text>
        ) : (
          recentTickets.map(ticket => (
            <View key={ticket.id} style={styles.ticketRow}>
              <View style={styles.ticketLeft}>
                <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[ticket.severity] || '#8b949e' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
                  <Text style={styles.ticketMeta}>
                    {ticket.raisedByName || 'Unknown'} · {ticket.systemNumber || ''} · {getRelativeTime(ticket.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[ticket.status] || '#8b949e'}22`, borderColor: STATUS_COLOR[ticket.status] || '#8b949e' }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[ticket.status] || '#8b949e' }]}>
                  {ticket.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>Welcome back, {user.name}!</Text>
        <Text style={styles.welcomeDesc}>
          {"Use the tabs below to manage your organization's IT infrastructure, track open tickets, and coordinate equipment assignments."}
        </Text>
      </View>
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Administrator Profile</Text>
      
      <View style={styles.profileCardFull}>
        <View style={styles.profileAvatarLarge}>
          <Text style={styles.profileAvatarTextLarge}>A</Text>
        </View>
        <Text style={styles.profileNameLarge}>{user.name || 'Administrator'}</Text>
        <Text style={styles.profileRoleLabel}>Root Administrator</Text>
        
        <View style={styles.profileInfoList}>
          <View style={styles.profileInfoItem}>
            <Text style={styles.profileInfoLabel}>Email Address</Text>
            <Text style={styles.profileInfoVal}>{user.email || 'admin@devicedesk.com'}</Text>
          </View>
          <View style={styles.profileInfoItem}>
            <Text style={styles.profileInfoLabel}>System Access Level</Text>
            <Text style={styles.profileInfoVal}>Full Owner Access</Text>
          </View>
          <View style={styles.profileInfoItem}>
            <Text style={styles.profileInfoLabel}>Assigned Equipment</Text>
            <Text style={styles.profileInfoVal}>Management Server (Remote)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'systems':
        return <ManageSystems currentUser={user} />;
      case 'employees':
        return <ManageEmployees currentUser={user} />;
      case 'tickets':
        return <ManageTickets currentUser={user} />;
      case 'history':
        return <ManageHistory currentUser={user} />;
      case 'departments':
        return <ManageDepartments currentUser={user} />;
      case 'tasks':
        return <ManageTasks currentUser={user} />;
      case 'profile':
        return renderProfile();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setIsDrawerOpen(true)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={styles.hamburgerBtn}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>DeviceDesk</Text>
            <Text style={styles.headerSub}>Admin Console</Text>
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
          <Text style={styles.logoutBtnText}>Log Out 🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {renderContent()}
      </View>

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
                <Text style={styles.drawerAvatarText}>A</Text>
              </View>
              <Text style={styles.drawerName}>{user.name || 'Administrator'}</Text>
              <Text style={styles.drawerEmail}>{user.email || 'admin@devicedesk.com'}</Text>
            </View>

            <View style={styles.drawerItemsContainer}>
              <TouchableOpacity 
                style={[styles.drawerItem, activeTab === 'overview' && styles.drawerItemActive]} 
                onPress={() => { setActiveTab('overview'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>📊</Text>
                <Text style={styles.drawerItemLabel}>Overview Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.drawerItem, activeTab === 'profile' && styles.drawerItemActive]} 
                onPress={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>👤</Text>
                <Text style={styles.drawerItemLabel}>Admin Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.drawerItem, activeTab === 'departments' && styles.drawerItemActive]} 
                onPress={() => { setActiveTab('departments'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>🏢</Text>
                <Text style={styles.drawerItemLabel}>Manage Departments</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.drawerItem, activeTab === 'tasks' && styles.drawerItemActive]} 
                onPress={() => { setActiveTab('tasks'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>📅</Text>
                <Text style={styles.drawerItemLabel}>Manage Tasks</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.drawerItem} 
                onPress={() => { setShowSettingsModal(true); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>⚙️</Text>
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
                      if (user.id !== 'admin') {
                        removeEmployee(user.id);
                      }
                      onLogout();
                    }
                  });
                }}
              >
                <Text style={styles.drawerItemIcon}>⚠️</Text>
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
              <Text style={styles.settingsProfileTitle}>👤 Admin Profile Details</Text>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Name:</Text>
                <Text style={styles.profileDetailValue}>{user.name || 'Administrator'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Email:</Text>
                <Text style={styles.profileDetailValue}>{user.email || 'admin@devicedesk.com'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Role:</Text>
                <Text style={styles.profileDetailValue}>System Administrator</Text>
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
                      if (user.id !== 'admin') {
                        removeEmployee(user.id);
                      }
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

      {/* Bottom Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === 'overview' && styles.tabLabelActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'systems' && styles.tabItemActive]}
          onPress={() => setActiveTab('systems')}
        >
          <Text style={styles.tabIcon}>💻</Text>
          <Text style={[styles.tabLabel, activeTab === 'systems' && styles.tabLabelActive]}>
            Systems
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'employees' && styles.tabItemActive]}
          onPress={() => setActiveTab('employees')}
        >
          <Text style={styles.tabIcon}>👥</Text>
          <Text style={[styles.tabLabel, activeTab === 'employees' && styles.tabLabelActive]}>
            Team Members
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tickets' && styles.tabItemActive]}
          onPress={() => setActiveTab('tickets')}
        >
          <Text style={styles.tabIcon}>🎫</Text>
          <Text style={[styles.tabLabel, activeTab === 'tickets' && styles.tabLabelActive]}>
            Tickets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={styles.tabIcon}>📜</Text>
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
            Logs
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
    zIndex: 10,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  headerSub: {
    fontSize: 12,
    color: '#8b949e',
  },
  logoutBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: '#f85149',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  alertBanner: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  alertBannerText: {
    color: '#f85149',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  syncBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#21262d',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  syncBtnText: {
    color: '#c9d1d9',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  statCardWarning: {
    borderColor: '#d29922',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8b949e',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  viewAllLink: {
    fontSize: 12,
    color: '#58a6ff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 13,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  ticketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  ticketTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f0f6fc',
  },
  ticketMeta: {
    fontSize: 11,
    color: '#8b949e',
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  welcomeCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 8,
  },
  welcomeDesc: {
    fontSize: 14,
    color: '#c9d1d9',
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#58a6ff',
    marginTop: -8,
    paddingTop: 8,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#8b949e',
  },
  tabLabelActive: {
    color: '#58a6ff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 20,
  },
  legalHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginTop: 15,
    marginBottom: 6,
  },
  legalText: {
    fontSize: 13,
    color: '#8b949e',
    lineHeight: 18,
    textAlign: 'justify',
  },
  closeBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  settingsProfileSection: {
    backgroundColor: '#0d1117',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#30363d',
    marginBottom: 15,
  },
  settingsProfileTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    paddingBottom: 6,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  profileDetailLabel: {
    fontSize: 12,
    color: '#8b949e',
    fontWeight: '600',
  },
  profileDetailValue: {
    fontSize: 12,
    color: '#f0f6fc',
    fontWeight: 'bold',
  },
  // Hamburger menu styles
  hamburgerBtn: {
    paddingRight: 12,
  },
  hamburgerIcon: {
    fontSize: 26,
    color: '#58a6ff',
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  drawerContent: {
    width: 280,
    height: '100%',
    backgroundColor: '#161b22',
    borderRightWidth: 1,
    borderColor: '#30363d',
    padding: 20,
    paddingTop: 45,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    paddingBottom: 20,
    marginBottom: 20,
  },
  drawerAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#58a6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  drawerAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0d1117',
  },
  drawerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f0f6fc',
    textAlign: 'center',
  },
  drawerEmail: {
    fontSize: 12,
    color: '#8b949e',
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
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  drawerItemActive: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  drawerItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 14,
    color: '#c9d1d9',
    fontWeight: '600',
  },
  drawerLogoutBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  drawerLogoutText: {
    color: '#f85149',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Profile screen styles
  profileCardFull: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#58a6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarTextLarge: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0d1117',
  },
  profileNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  profileRoleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#58a6ff',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  profileInfoList: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#30363d',
    paddingTop: 15,
  },
  profileInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  profileInfoLabel: {
    fontSize: 13,
    color: '#8b949e',
  },
  profileInfoVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  deleteBtn: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  deleteBtnText: {
    color: '#f85149',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
