import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  getSystems,
  getTickets,
  getEmployees,
  getAssignmentHistory,
  createTicket,
  subscribe,
  syncWithServer,
} from '../../store/store';

export default function EmployeeDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, file-complaint, records
  
  // Data lists
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  
  // Complaint form states
  const [category, setCategory] = useState('RAM/Speed');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = () => {
    setSystems(getSystems());
    setTickets(getTickets());
    setEmployees(getEmployees());
    setAssignmentHistory(getAssignmentHistory());
  };

  useEffect(() => {
    refreshData();
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
  const empHistory = assignmentHistory.filter(h => h.employeeId === user.id);

  // Stats calculation
  const totalRaised = employeeTickets.length;
  const ticketLimit = empDetails.ticketLimit || 5;
  const remainingTickets = Math.max(0, ticketLimit - totalRaised);
  const isLimitReached = totalRaised >= ticketLimit;

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
    Alert.alert('Success', 'Complaint ticket raised successfully!');
    
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
                    ⚠️ Ticket Limit Reached ({totalRaised}/{ticketLimit}). You cannot raise more issues.
                  </Text>
                </View>
              ) : (
                <View style={styles.limitInfoBox}>
                  <Text style={styles.limitInfoText}>
                    Remaining Tickets: {remainingTickets} / {ticketLimit}
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
                placeholderTextColor="#666"
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
              placeholderTextColor="#8b949e"
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
                    <View style={[styles.statusBadge, 
                      t.status === 'Open' && styles.badgeOpen,
                      t.status === 'In Progress' && styles.badgeProgress,
                      t.status === 'Resolved' && styles.badgeResolved
                    ]}>
                      <Text style={styles.statusText}>{t.status}</Text>
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

      case 'overview':
      default:
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>My Workspace</Text>
              <TouchableOpacity style={styles.syncBtn} onPress={handleRefresh}>
                <Text style={styles.syncBtnText}>{refreshing ? 'Syncing...' : 'Sync 🔄'}</Text>
              </TouchableOpacity>
            </View>

            {/* Profile Overview */}
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>👤 {empDetails.name}</Text>
              <Text style={styles.profileMeta}>Department: {user.department || 'Operations'}</Text>
              <Text style={styles.profileMeta}>Ticket Limit Status: {totalRaised} / {ticketLimit} used</Text>
            </View>

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
            <Text style={styles.subTitle}>Device History Logs</Text>
            {empHistory.length === 0 ? (
              <Text style={styles.emptyText}>No device transfers logged.</Text>
            ) : (
              empHistory.map(log => (
                <View key={log.id} style={styles.historyRow}>
                  <Text style={styles.historyLogText}>
                    🛠️ {log.action} System {log.systemNumber}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(log.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>DeviceDesk</Text>
          <Text style={styles.headerSub}>Employee Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Log Out 🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Content wrapper */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Tabs */}
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
          style={[styles.tabItem, activeTab === 'file-complaint' && styles.tabItemActive]}
          onPress={() => setActiveTab('file-complaint')}
        >
          <Text style={styles.tabIcon}>🚨</Text>
          <Text style={[styles.tabLabel, activeTab === 'file-complaint' && styles.tabLabelActive]}>
            File Ticket
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'records' && styles.tabItemActive]}
          onPress={() => setActiveTab('records')}
        >
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={[styles.tabLabel, activeTab === 'records' && styles.tabLabelActive]}>
            My Tickets
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginBottom: 15,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginTop: 25,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginBottom: 8,
  },
  profileMeta: {
    fontSize: 13,
    color: '#8b949e',
    marginTop: 4,
  },
  noSystemCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noSystemText: {
    fontSize: 14,
    color: '#c9d1d9',
    fontWeight: '600',
    textAlign: 'center',
  },
  noSystemSubText: {
    fontSize: 12,
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 5,
  },
  systemCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
  },
  systemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  systemNo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  systemModel: {
    fontSize: 14,
    color: '#c9d1d9',
  },
  divider: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 10,
  },
  specItem: {
    fontSize: 13,
    color: '#8b949e',
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#21262d',
  },
  historyLogText: {
    color: '#c9d1d9',
    fontSize: 13,
  },
  historyTime: {
    color: '#8b949e',
    fontSize: 11,
  },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: '#c9d1d9',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#f0f6fc',
    marginBottom: 15,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 5,
    marginBottom: 15,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#21262d',
  },
  pickerItemActive: {
    backgroundColor: '#1f6feb',
  },
  pickerItemText: {
    color: '#8b949e',
    fontSize: 12,
  },
  pickerItemTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    backgroundColor: '#21262d',
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  limitBanner: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  limitBannerText: {
    color: '#f85149',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  limitInfoBox: {
    backgroundColor: 'rgba(56, 139, 60, 0.15)',
    borderWidth: 1,
    borderColor: '#3fb950',
    borderRadius: 8,
    padding: 8,
    marginBottom: 15,
  },
  limitInfoText: {
    color: '#3fb950',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    color: '#f85149',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    color: '#3fb950',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#f0f6fc',
    marginBottom: 15,
  },
  ticketCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  ticketCategory: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeOpen: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderColor: '#f85149',
  },
  badgeProgress: {
    backgroundColor: 'rgba(210, 153, 34, 0.15)',
    borderColor: '#d29922',
  },
  badgeResolved: {
    backgroundColor: 'rgba(56, 139, 60, 0.15)',
    borderColor: '#3fb950',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  description: {
    fontSize: 13,
    color: '#c9d1d9',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerDate: {
    fontSize: 11,
    color: '#8b949e',
  },
  severityVal: {
    fontSize: 12,
    color: '#c9d1d9',
  },
  notesBox: {
    backgroundColor: '#0d1117',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3fb950',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#8b949e',
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
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
