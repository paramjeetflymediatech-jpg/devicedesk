import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { getStats, syncWithServer } from '../../store/store';
import ManageSystems from './ManageSystems';
import ManageEmployees from './ManageEmployees';
import ManageTickets from './ManageTickets';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, systems, employees, tickets
  const [stats, setStats] = useState({
    totalSystems: 0,
    activeAssignments: 0,
    pendingComplaints: 0,
    resolvedCount: 0,
    avgResolutionTimeStr: 'N/A',
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = () => {
    setStats(getStats());
  };

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncWithServer();
    loadStats();
    setRefreshing(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'systems':
        return <ManageSystems />;
      case 'employees':
        return <ManageEmployees />;
      case 'tickets':
        return <ManageTickets />;
      case 'overview':
      default:
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
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

            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome back, {user.name}!</Text>
              <Text style={styles.welcomeDesc}>
                Use the tabs below to manage your organization's IT infrastructure, track open tickets, and coordinate equipment assignments.
              </Text>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>DeviceDesk</Text>
          <Text style={styles.headerSub}>Admin Console</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Log Out 🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {renderContent()}
      </View>

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
            Employees
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
});
