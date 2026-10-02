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
  Switch,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import { getStats, syncWithServer, getTickets, subscribe, removeEmployee } from '../../store/store';
import { sweetAlert } from '../../utils/sweetAlert';
import { playTicketSound } from '../../utils/sound';
import ManageSystems from './ManageSystems';
import ManageEmployees from './ManageEmployees';
import ManageTickets from './ManageTickets';
import ManageHistory from './ManageHistory';
import ManageDepartments from './ManageDepartments';
import ManageTasks from './ManageTasks';
import ManageMarketing from './ManageMarketing';
import ManageAttendance from './ManageAttendance';
import ManageLeaves from './ManageLeaves';
import ManageDomains from './ManageDomains';
import ManageCandidates from './ManageCandidates';
import ManageSubmissions from './ManageSubmissions';
import ManageScreenshots from './ManageScreenshots';
import ManageClients from './ManageClients';
import ManagePackages from './ManagePackages';
import ManageSubscriptions from './ManageSubscriptions';
import ManageTeamHierarchy from './ManageTeamHierarchy';
import ManageAuditLogs from './ManageAuditLogs';
import ManageProjects from './ManageProjects';
import ManageClientRequests from './ManageClientRequests';
import LeaderDashboard from '../Leader/LeaderDashboard';
import ChatScreen from '../ChatScreen';

const SEVERITY_COLOR = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#3b82f6',
  Low: '#10b981',
};

const STATUS_COLOR = {
  Open: '#ef4444',
  'In Progress': '#f59e0b',
  Resolved: '#10b981',
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

export default function AdminDashboard({ user, onLogout, onSwitchToEmployee }) {
  const { theme, isDark, toggleTheme, themeColors } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const dbRoleStr = `${user?.dbRole || user?.role || ''}`.toLowerCase().trim();
  const deptStr = `${user?.department || ''}`.toLowerCase().trim();

  const isAdminUser =
    dbRoleStr === 'admin' ||
    dbRoleStr === 'superadmin' ||
    dbRoleStr === 'management'

  const isSuperAdmin =
    isAdminUser ||
    (user?.role || '').toLowerCase().includes('admin') ||
    (user?.role || '').toLowerCase().includes('superadmin');

  const isITSupport = !isAdminUser && (dbRoleStr === 'it support' || dbRoleStr === 'it_support' || dbRoleStr === 'it' || deptStr.includes('it'));

  const isHRUser = !isAdminUser && (dbRoleStr === 'hr' || dbRoleStr.includes('hr') || deptStr.includes('hr'));

  const isDnsManager = !isAdminUser && (dbRoleStr === 'dns manager' || dbRoleStr.includes('dns') || deptStr.includes('dns'));

  const isTeamLeader = !isSuperAdmin && (dbRoleStr === 'team leader' || dbRoleStr === 'leader' || dbRoleStr.includes('leader') || user?.isLeader);

  const isMarketingRole = isAdminUser || dbRoleStr.includes('marketing') || deptStr.includes('marketing');

  const defaultTab = isDnsManager ? 'domains' : (isHRUser ? 'employees' : 'overview');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Back Button Handler
  useEffect(() => {
    const backAction = () => {
      if (activeTab !== defaultTab) {
        setActiveTab(defaultTab);
        return true; // prevent default behavior
      }
      return false; // let default behavior happen (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [activeTab, defaultTab]);

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
      // New ticket raised - trigger sound and vibration
      playTicketSound('ticket_raised');
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
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} />}
    >
      {newTicketAlert && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>🔔 New ticket raised! Check Tickets tab.</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
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

      {/* Latest 5 Tickets - IT Support & Admin */}
      {(isAdminUser || isITSupport) && (
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
                  <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[ticket.severity] || '#64748b' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
                    <Text style={styles.ticketMeta}>
                      {ticket.raisedByName || 'Unknown'} · {ticket.systemNumber || ''} · {getRelativeTime(ticket.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[ticket.status] || '#64748b'}22`, borderColor: STATUS_COLOR[ticket.status] || '#64748b' }]}>
                  <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[ticket.status] || '#64748b' }]}>
                    {ticket.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Quick Access: Attendance & Leaves Management (Admin & HR) */}
      {(isAdminUser || isHRUser) && (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            style={[styles.quickCardHalf, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: isDark ? '#334155' : '#bfdbfe' }]}
            onPress={() => setActiveTab('attendance')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.textPrimary }}>Attendance</Text>
                <Text style={{ fontSize: 10.5, color: themeColors.textSecondary }}>View daily punch logs</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCardHalf, { backgroundColor: isDark ? '#1e293b' : '#f0fdf4', borderColor: isDark ? '#334155' : '#bbf7d0' }]}
            onPress={() => setActiveTab('leaves')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>🌴</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.textPrimary }}>Leave Requests</Text>
                <Text style={{ fontSize: 10.5, color: themeColors.textSecondary }}>Approve/reject leaves</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Domain & DNS Management Quick Link (Admin & DNS Manager) */}
      {(isAdminUser || isDnsManager) && (
        <TouchableOpacity
          style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#1e1b4b22' : '#eef2ff', borderColor: '#6366f1', marginBottom: 16 }]}
          onPress={() => setActiveTab('domains')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🌐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#c7d2fe' : '#3730a3' }}>
                  Domains & DNS Registry
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                  Expiry tracking, SSL status & automated renewal alerts
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366f1' }}>Manage →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Work Submissions & Team EODs Quick Link (Admin Only) */}
      {isAdminUser && (
        <TouchableOpacity
          style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#1e3a8a22' : '#eff6ff', borderColor: '#3b82f6', marginBottom: 16 }]}
          onPress={() => setActiveTab('submissions')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🚀</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#bfdbfe' : '#1e40af' }}>
                  Work Submissions & EODs
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                  Review deliverables, client project status & team daily reports
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>Review →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Candidate Pool & Recruitment Quick Link (Admin & HR) */}
      {(isAdminUser || isHRUser) && (
        <TouchableOpacity
          style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#3b076422' : '#faf5ff', borderColor: '#a855f7', marginBottom: 16 }]}
          onPress={() => setActiveTab('candidates')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🧑‍💼</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#e9d5ff' : '#6b21a8' }}>
                  Candidate Pool & Recruitment
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                  Screen candidates, assess tests & record feedback
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#a855f7' }}>Review →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Marketing Operations Quick Link (Admin & Marketing) */}
      {(isAdminUser || isMarketingRole) && (
        <TouchableOpacity
          style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#064e3b22' : '#ecfdf5', borderColor: '#10b981', marginBottom: 16 }]}
          onPress={() => setActiveTab('marketing')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🚗</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#a7f3d0' : '#065f46' }}>
                  Marketing Field Tracking
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                  Live GPS monitoring & team visit logs
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>View Live →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Desktop Screenshots Live Monitoring Quick Link (Admin Only) */}
      {isAdminUser && (
        <TouchableOpacity
          style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#1e3a8a22' : '#eff6ff', borderColor: '#2563eb', marginBottom: 16 }]}
          onPress={() => setActiveTab('screenshots')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🖥️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#bfdbfe' : '#1e40af' }}>
                  Desktop Live Monitoring
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                  Live workstation screenshots, active logs & activity scores
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>Monitor →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Team Leader Portal Quick Link (Team Leader only, hidden for Superadmin) */}
      {!isSuperAdmin && isTeamLeader && (
        <TouchableOpacity
          style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#1e1b4b22' : '#f5f3ff', borderColor: '#7c3aed', marginBottom: 16 }]}
          onPress={() => setActiveTab('leader')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>👔</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#ddd6fe' : '#5b21b6' }}>
                  Team Leader Portal
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                  Team EOD reviews, task delegations & client requests
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#7c3aed' }}>Open →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* CRM & Projects Quick Actions Grid (Admin & HR) */}
      {isAdminUser && (
        <>
          <TouchableOpacity
            style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#022c2222' : '#f0fdf4', borderColor: '#10b981', marginBottom: 16 }]}
            onPress={() => setActiveTab('clients')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#bbf7d0' : '#15803d' }}>
                    Client CRM & Portals
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                    Manage customer accounts, portal links & credentials
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>Manage →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#1e3a8a22' : '#eff6ff', borderColor: '#3b82f6', marginBottom: 16 }]}
            onPress={() => setActiveTab('client_requests')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>📋</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#bfdbfe' : '#1e40af' }}>
                    Client Service Requests
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                    Assign incoming client tasks to Team Leaders & track deliverables
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>Assign TL →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#08334422' : '#ecfeff', borderColor: '#06b6d4', marginBottom: 16 }]}
            onPress={() => setActiveTab('projects')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>📁</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#a5f3fc' : '#0e7490' }}>
                    Projects Portfolio Board
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                    Track client scopes, deliverables & progress
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#06b6d4' }}>View →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#312e8122' : '#eef2ff', borderColor: '#6366f1', marginBottom: 16 }]}
            onPress={() => setActiveTab('subscriptions')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>💳</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#c7d2fe' : '#4338ca' }}>
                    Subscriptions & Packages
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                    Monitor client billing, active plans & renewal cycles
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366f1' }}>Track →</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {(isAdminUser || isHRUser) && (
        <TouchableOpacity
          style={[styles.marketingCardBanner, { backgroundColor: isDark ? '#43140722' : '#fff7ed', borderColor: '#ea580c', marginBottom: 16 }]}
          onPress={() => setActiveTab('hierarchy')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🌳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#fed7aa' : '#c2410c' }}>
                  Team Hierarchy Tree
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                  Visual reporting lines & TL assignments
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ea580c' }}>View Tree →</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>Welcome back, {user.name}!</Text>
        <Text style={styles.welcomeDesc}>
          {isAdminUser
            ? "Use the tabs to manage your organization's IT infrastructure, track open tickets, monitor teams, and coordinate equipment assignments."
            : isHRUser
              ? "Manage employee directory, track daily attendance, review leave requests, and assess recruitment candidates."
              : isITSupport
                ? "Monitor hardware fleet inventory, assign devices, and resolve incoming technical support tickets."
                : "Manage domain portfolios, DNS configurations, and company workspace tools."}
        </Text>
      </View>
    </ScrollView>
  );

  const renderProfile = () => {
    const roleLabel = isAdminUser
      ? 'Root Administrator'
      : isHRUser
        ? 'HR Specialist'
        : isITSupport
          ? 'IT Support Specialist'
          : isDnsManager
            ? 'DNS Administrator'
            : user.role || 'Team Member';

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>User Profile</Text>

        <View style={styles.profileCardFull}>
          <View style={styles.profileAvatarLarge}>
            <Text style={styles.profileAvatarTextLarge}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
          <Text style={styles.profileNameLarge}>{user.name || 'User'}</Text>
          <Text style={styles.profileRoleLabel}>{roleLabel}</Text>

          <View style={styles.profileInfoList}>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Email Address</Text>
              <Text style={styles.profileInfoVal}>{user.email || 'N/A'}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Department</Text>
              <Text style={styles.profileInfoVal}>{user.department || (isAdminUser ? 'Executive Management' : isHRUser ? 'Human Resources' : isITSupport ? 'IT & Infrastructure' : 'Operations')}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>System Access Level</Text>
              <Text style={styles.profileInfoVal}>{isAdminUser ? 'Full Owner Access' : isHRUser ? 'HR Manager Access' : isITSupport ? 'IT Operations Access' : 'Specialized Role'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

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
      case 'domains':
        return <ManageDomains currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'candidates':
        return <ManageCandidates currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'submissions':
        return <ManageSubmissions currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'screenshots':
        return <ManageScreenshots user={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'leader':
        return <LeaderDashboard user={user} onNavigateBack={() => setActiveTab(defaultTab)} onLogout={onLogout} />;
      case 'marketing':
        return <ManageMarketing currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'attendance':
        return <ManageAttendance currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'leaves':
        return <ManageLeaves currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'clients':
        return <ManageClients currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'packages':
        return <ManagePackages currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'subscriptions':
        return <ManageSubscriptions currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'hierarchy':
        return <ManageTeamHierarchy currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'audit_logs':
        return <ManageAuditLogs currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'projects':
        return <ManageProjects currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'client_requests':
        return <ManageClientRequests currentUser={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'chat':
        return <ChatScreen user={user} onBack={() => setActiveTab(defaultTab)} />;
      case 'profile':
        return renderProfile();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  if (activeTab === 'leader') {
    return (
      <LeaderDashboard
        user={user}
        onLogout={onLogout}
        onSwitchToEmployee={() => setActiveTab('overview')}
      />
    );
  }

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
            <Image
              source={isDark ? require('../../assets/flymedia_logo_white.png') : require('../../assets/flymedia_logo.png')}
              style={{ width: 130, height: 32 }}
              resizeMode="contain"
            />
            <Text style={[styles.headerSub, { color: themeColors.textSecondary, fontSize: 10 }]}>
              {isAdminUser ? 'Admin Console' : isHRUser ? 'HR Portal' : isITSupport ? 'IT Support Desk' : isDnsManager ? 'DNS Manager' : 'Control Panel'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!isSuperAdmin && onSwitchToEmployee && (
            <TouchableOpacity
              style={[
                styles.employeeSwitchPill,
                {
                  backgroundColor: isDark ? '#1e293b' : (isHRUser ? '#fdf2f8' : '#eff6ff'),
                  borderColor: isDark ? '#3b82f6' : (isHRUser ? '#f472b6' : '#bfdbfe'),
                }
              ]}
              onPress={onSwitchToEmployee}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11 }}>👤</Text>
              <Text style={[styles.employeeSwitchPillText, { color: isHRUser ? '#db2777' : '#2563eb' }]}>
                Employee
              </Text>
            </TouchableOpacity>
          )}

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
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Hamburger Drawer Overlay - Role-Based */}
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
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={[styles.drawerName, { color: themeColors.textPrimary }]}>{user.name || 'User'}</Text>
              <Text style={[styles.drawerEmail, { color: themeColors.drawerSubtext }]}>{user.email || 'user@devicedesk.com'}</Text>
              <View style={{ backgroundColor: isHRUser ? '#ec489922' : '#2563eb22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 10.5, color: isHRUser ? '#ec4899' : '#2563eb', fontWeight: '700' }}>
                  {isAdminUser ? 'Root Administrator' : isHRUser ? 'HR Administrator' : isITSupport ? 'IT Support' : isDnsManager ? 'DNS Manager' : 'Staff'}
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.drawerItemsContainer}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* My Employee Portal Switch */}
              {!isSuperAdmin && onSwitchToEmployee && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    {
                      backgroundColor: isDark ? '#1e293b' : (isHRUser ? '#fdf2f8' : '#eff6ff'),
                      borderColor: isDark ? '#334155' : (isHRUser ? '#fbcfe8' : '#bfdbfe'),
                      borderWidth: 1,
                      marginTop: 6,
                      marginBottom: 8,
                    }
                  ]}
                  onPress={() => {
                    setIsDrawerOpen(false);
                    onSwitchToEmployee();
                  }}
                >
                  <Text style={styles.drawerItemIcon}>👤</Text>
                  <Text style={[styles.drawerItemLabel, { color: isHRUser ? '#db2777' : '#2563eb', fontWeight: '800' }]}>
                    My Employee Portal &rarr;
                  </Text>
                </TouchableOpacity>
              )}

              {/* Overview Dashboard - Admin, IT Support, HR */}
              {(isAdminUser || isITSupport || isHRUser) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'overview' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('overview'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>📊</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Overview Dashboard</Text>
                </TouchableOpacity>
              )}

              {/* Systems Fleet - Admin, IT Support */}
              {(isAdminUser || isITSupport) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'systems' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('systems'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>💻</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Systems Fleet</Text>
                </TouchableOpacity>
              )}

              {/* Employees Directory / Teams - Admin, IT Support, HR */}
              {(isAdminUser || isITSupport) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'employees' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('employees'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>👥</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Employees Directory</Text>
                </TouchableOpacity>
              )}

              {/* Support Tickets - Admin, IT Support */}
              {(isAdminUser || isITSupport) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'tickets' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('tickets'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🎫</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Support Tickets</Text>
                </TouchableOpacity>
              )}

              {/* Assignment History - Admin, IT Support */}
              {(isAdminUser || isITSupport) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'history' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('history'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>📜</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Assignment History</Text>
                </TouchableOpacity>
              )}

              {/* Chat Workspace - All Users */}
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  activeTab === 'chat' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                ]}
                onPress={() => { setActiveTab('chat'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>💬</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Chat Workspace</Text>
              </TouchableOpacity>

              {/* Manage Departments - Admin, IT Support, HR */}
              {(isAdminUser || isITSupport || isHRUser) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'departments' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('departments'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🏢</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Manage Departments</Text>
                </TouchableOpacity>
              )}

              {/* Manage Tasks - Admin, IT Support */}
              {(isAdminUser || isITSupport) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'tasks' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('tasks'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>📅</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Manage Tasks</Text>
                </TouchableOpacity>
              )}

              {/* Global Attendance - Admin, HR */}
              {(isAdminUser ) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'attendance' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('attendance'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>📋</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Global Attendance</Text>
                </TouchableOpacity>
              )}

              {/* Leave Applications - Admin, HR */}
              {(isAdminUser ) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'leaves' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('leaves'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🌴</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Leave Applications</Text>
                </TouchableOpacity>
              )}

              {/* Candidate Pool & Tests - Admin, HR */}
              {(isAdminUser ) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'candidates' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('candidates'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🧑‍💼</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Candidate Pool & Tests</Text>
                </TouchableOpacity>
              )}

              {/* Domains & DNS - Admin, DNS Manager */}
              {(isAdminUser || isDnsManager) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'domains' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('domains'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🌐</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Domains & DNS</Text>
                </TouchableOpacity>
              )}



              {/* Work Submissions & EODs - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'submissions' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('submissions'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🚀</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Work Submissions & EODs</Text>
                </TouchableOpacity>
              )}

              {/* Desktop Live Monitoring - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'screenshots' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('screenshots'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🖥️</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Desktop Live Monitoring</Text>
                </TouchableOpacity>
              )}

              {/* Team Leader Portal - Only for Team Leaders who are not pure SuperAdmins */}
              {!isSuperAdmin && isTeamLeader && (
                <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 16 }}>
                  <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.2)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>👔</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563eb' }}>TL Portal</Text>
                    </View>
                    <Switch
                      value={activeTab === 'leader'}
                      onValueChange={(val) => {
                        setActiveTab(val ? 'leader' : defaultTab);
                        setIsDrawerOpen(false);
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={activeTab === 'leader' ? '#3b82f6' : '#f8fafc'}
                    />
                  </View>
                </View>
              )}
 

              {/* Marketing Field Trips - Admin & Marketing */}
              {(isAdminUser || isMarketingRole) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'marketing' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('marketing'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🚗</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Marketing Field Trips</Text>
                </TouchableOpacity>
              )}

              {/* Client CRM Records - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'clients' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('clients'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🏢</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Client CRM Records</Text>
                </TouchableOpacity>
              )}

              {/* Client Service Requests & TL Assignment - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'client_requests' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('client_requests'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>📋</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Client Service Requests</Text>
                </TouchableOpacity>
              )}

              {/* Service Packages - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'packages' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('packages'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>📦</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Service Packages</Text>
                </TouchableOpacity>
              )}

              {/* Subscriptions Tracker - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'subscriptions' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('subscriptions'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>💳</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Subscriptions Tracker</Text>
                </TouchableOpacity>
              )}

              {/* Visual Team Hierarchy - Admin & HR */}
              {(isAdminUser || isHRUser) && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'hierarchy' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('hierarchy'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🌳</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Visual Team Hierarchy</Text>
                </TouchableOpacity>
              )}

              {/* System Audit Logs - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'audit_logs' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('audit_logs'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>🛡️</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>System Audit Logs</Text>
                </TouchableOpacity>
              )}

              {/* Projects Portfolio Board - Admin Only */}
              {isAdminUser && (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTab === 'projects' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                  ]}
                  onPress={() => { setActiveTab('projects'); setIsDrawerOpen(false); }}
                >
                  <Text style={styles.drawerItemIcon}>📁</Text>
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Projects Portfolio</Text>
                </TouchableOpacity>
              )}

              {/* Admin / User Profile - All */}
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  activeTab === 'profile' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]
                ]}
                onPress={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>👤</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Profile Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { setShowSettingsModal(true); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>⚙️</Text>
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
                      if (user.id !== 'admin') {
                        removeEmployee(user.id);
                      }
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
              <Text style={styles.settingsProfileTitle}>👤 Profile Details</Text>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Name:</Text>
                <Text style={styles.profileDetailValue}>{user.name || 'User'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Email:</Text>
                <Text style={styles.profileDetailValue}>{user.email || 'user@devicedesk.com'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Role:</Text>
                <Text style={styles.profileDetailValue}>{isAdminUser ? 'Root Administrator' : isHRUser ? 'HR Specialist' : isITSupport ? 'IT Support Specialist' : isDnsManager ? 'DNS Administrator' : 'Staff'}</Text>
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

      {/* Role-Based Bottom Navigation Tabs */}
      <View style={styles.tabBar}>
        {isHRUser ? (
          <>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'employees' && styles.tabItemActive]}
              onPress={() => setActiveTab('employees')}
            >
              <Text style={styles.tabIcon}>👥</Text>
              <Text style={[styles.tabLabel, activeTab === 'employees' && styles.tabLabelActive]}>
                Teams
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'attendance' && styles.tabItemActive]}
              onPress={() => setActiveTab('attendance')}
            >
              <Text style={styles.tabIcon}>📋</Text>
              <Text style={[styles.tabLabel, activeTab === 'attendance' && styles.tabLabelActive]}>
                Attendance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'leaves' && styles.tabItemActive]}
              onPress={() => setActiveTab('leaves')}
            >
              <Text style={styles.tabIcon}>🌴</Text>
              <Text style={[styles.tabLabel, activeTab === 'leaves' && styles.tabLabelActive]}>
                Leaves
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'candidates' && styles.tabItemActive]}
              onPress={() => setActiveTab('candidates')}
            >
              <Text style={styles.tabIcon}>🧑‍💼</Text>
              <Text style={[styles.tabLabel, activeTab === 'candidates' && styles.tabLabelActive]}>
                Candidates
              </Text>
            </TouchableOpacity>

          </>
        ) : isDnsManager ? (
          <>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'domains' && styles.tabItemActive]}
              onPress={() => setActiveTab('domains')}
            >
              <Text style={styles.tabIcon}>🌐</Text>
              <Text style={[styles.tabLabel, activeTab === 'domains' && styles.tabLabelActive]}>
                Domains
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
              onPress={() => setActiveTab('chat')}
            >
              <Text style={styles.tabIcon}>💬</Text>
              <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabLabelActive]}>
                Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Text style={styles.tabIcon}>👤</Text>
              <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
                Profile
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
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
                Teams
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
              style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
              onPress={() => setActiveTab('chat')}
            >
              <Text style={styles.tabIcon}>💬</Text>
              <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabLabelActive]}>
                Chat
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
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (themeColors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
    zIndex: 10,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.accent,
  },
  headerSub: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  employeeSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  employeeSwitchPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: '#ef4444',
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
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  alertBannerText: {
    color: '#ef4444',
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
    color: themeColors.textPrimary,
  },
  syncBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: themeColors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  syncBtnText: {
    color: themeColors.text,
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
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  statCardWarning: {
    borderColor: '#f59e0b',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
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
    color: themeColors.textPrimary,
  },
  viewAllLink: {
    fontSize: 12,
    color: themeColors.accent,
    fontWeight: '600',
  },
  emptyText: {
    color: themeColors.textSecondary,
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
    borderBottomColor: themeColors.card,
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
    color: themeColors.textPrimary,
  },
  ticketMeta: {
    fontSize: 11,
    color: themeColors.textSecondary,
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
  quickCardHalf: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  marketingCardBanner: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  welcomeCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.accent,
    marginBottom: 8,
  },
  welcomeDesc: {
    fontSize: 14,
    color: themeColors.text,
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: themeColors.accent,
    marginTop: -8,
    paddingTop: 8,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  tabLabelActive: {
    color: themeColors.accent,
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
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.accent,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 20,
  },
  legalHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginTop: 15,
    marginBottom: 6,
  },
  legalText: {
    fontSize: 13,
    color: themeColors.textSecondary,
    lineHeight: 18,
    textAlign: 'justify',
  },
  closeBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  settingsProfileSection: {
    backgroundColor: themeColors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: 15,
  },
  settingsProfileTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: themeColors.accent,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.card,
    paddingBottom: 6,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  profileDetailLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  profileDetailValue: {
    fontSize: 12,
    color: themeColors.textPrimary,
    fontWeight: 'bold',
  },
  // Hamburger menu styles
  hamburgerBtn: {
    paddingRight: 12,
  },
  hamburgerIcon: {
    fontSize: 26,
    color: themeColors.accent,
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
    width: 290,
    height: '100%',
    backgroundColor: themeColors.card,
    borderRightWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 24,
    flexDirection: 'column',
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    paddingBottom: 16,
    marginBottom: 12,
  },
  drawerAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  drawerAvatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: themeColors.background,
  },
  drawerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    textAlign: 'center',
  },
  drawerEmail: {
    fontSize: 12,
    color: themeColors.textSecondary,
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
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  drawerItemActive: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  drawerItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 14,
    color: themeColors.text,
    fontWeight: '600',
  },
  drawerLogoutBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  drawerLogoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Profile screen styles
  profileCardFull: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarTextLarge: {
    fontSize: 36,
    fontWeight: 'bold',
    color: themeColors.background,
  },
  profileNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  profileRoleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.accent,
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
    borderTopColor: themeColors.border,
    paddingTop: 15,
  },
  profileInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.card,
  },
  profileInfoLabel: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  profileInfoVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  deleteBtn: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
