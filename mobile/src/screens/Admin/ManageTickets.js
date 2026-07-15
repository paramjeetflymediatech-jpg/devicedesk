import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Share,
} from 'react-native';
import {
  getTickets,
  getEmployees,
  getSystems,
  startTicketWork,
  resolveTicket,
  calculateDuration,
  formatDuration,
  subscribe,
} from '../../store/store';

export default function ManageTickets() {
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('All'); // All, Open, In Progress, Resolved

  // Modal / Detail views state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');

  const refreshData = () => {
    setTickets(getTickets());
    setEmployees(getEmployees());
    setSystems(getSystems());
  };

  const handleExportTickets = async () => {
    const headers = ["Ticket ID", "Category", "Description", "Severity", "Status", "System ID", "System Number", "Raised By", "Employee Name", "Created At", "Started At", "Resolved At", "Resolution Remarks"];
    const csvRows = [
      headers.join(","),
      ...tickets.map(t => {
        const emp = employees.find(e => e.id === t.employeeId) || { name: 'Unknown' };
        const sys = systems.find(s => s.id === t.systemId) || { systemNumber: 'N/A' };
        const row = [
          t.id,
          t.category,
          t.description ? `"${t.description.replace(/"/g, '""')}"` : "",
          t.severity,
          t.status,
          t.systemId,
          t.systemNumber || sys.systemNumber,
          t.raisedBy || t.employeeId,
          t.raisedByName || emp.name,
          t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
          t.startedAt ? new Date(t.startedAt).toLocaleString() : "",
          t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : "",
          t.resolutionRemarks || t.notes ? `"${(t.resolutionRemarks || t.notes).replace(/"/g, '""')}"` : ""
        ];
        return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
      })
    ];

    const csvString = "\uFEFF" + csvRows.join("\n");
    
    try {
      await Share.share({
        title: 'DeviceDesk Ticket Reports',
        message: csvString,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export tickets: ' + error.message);
    }
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const handleStartWork = (ticketId) => {
    const res = startTicketWork(ticketId);
    if (res) {
      Alert.alert('Success', 'Ticket marked as "In Progress". Work has started!');
      setSelectedTicket(null);
    } else {
      Alert.alert('Error', 'Failed to update ticket.');
    }
  };

  const handleResolve = (ticketId) => {
    if (!resolutionRemarks.trim()) {
      Alert.alert('Error', 'Please enter resolution remarks.');
      return;
    }
    const res = resolveTicket(ticketId, resolutionRemarks.trim());
    if (res) {
      Alert.alert('Success', 'Ticket marked as "Resolved"!');
      setSelectedTicket(null);
      setResolutionRemarks('');
    } else {
      Alert.alert('Error', 'Failed to resolve ticket.');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const query = searchQuery.toLowerCase();
    const emp = employees.find(e => e.id === t.employeeId) || { name: 'Unknown' };
    const sys = systems.find(s => s.id === t.systemId) || { systemNumber: 'N/A' };
    
    // Filter by status tab
    if (statusTab !== 'All' && t.status !== statusTab) {
      return false;
    }

    return (
      (t.id || '').toLowerCase().includes(query) ||
      (t.category || '').toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      (t.severity || '').toLowerCase().includes(query) ||
      emp.name.toLowerCase().includes(query) ||
      sys.systemNumber.toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.headerBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Employee, SN, Category or Severity..."
          placeholderTextColor="#8b949e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportTickets}>
          <Text style={styles.exportBtnText}>Export 📤</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, statusTab === tab && styles.tabActive]}
            onPress={() => setStatusTab(tab)}
          >
            <Text style={[styles.tabText, statusTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tickets List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredTickets.length === 0 ? (
          <Text style={styles.emptyText}>No tickets found.</Text>
        ) : (
          filteredTickets.map(t => {
            const emp = employees.find(e => e.id === t.employeeId) || { name: 'Unknown Employee' };
            const sys = systems.find(s => s.id === t.systemId) || { systemNumber: 'N/A', model: 'Generic' };
            
            // Calculate timing if resolved
            let resolveTimeStr = '';
            if (t.status === 'Resolved' && t.startedAt && t.resolvedAt) {
              const ms = calculateDuration(t.startedAt, t.resolvedAt);
              resolveTimeStr = formatDuration(ms);
            }

            return (
              <TouchableOpacity
                key={t.id}
                style={styles.ticketCard}
                onPress={() => setSelectedTicket(t)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.ticketCategory}>{t.category}</Text>
                    <Text style={styles.empInfo}>Raised by: {emp.name}</Text>
                  </View>
                  <View style={[styles.statusBadge, 
                    t.status === 'Open' && styles.badgeOpen,
                    t.status === 'In Progress' && styles.badgeProgress,
                    t.status === 'Resolved' && styles.badgeResolved
                  ]}>
                    <Text style={styles.statusText}>{t.status}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.description} numberOfLines={3}>
                  {t.description}
                </Text>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <Text style={styles.footerInfo}>💻 SN: {sys.systemNumber}</Text>
                  <Text style={[styles.severityText, 
                    t.severity === 'Critical' && styles.sevCritical,
                    t.severity === 'High' && styles.sevHigh,
                    t.severity === 'Medium' && styles.sevMedium,
                    t.severity === 'Low' && styles.sevLow
                  ]}>
                    ⚠️ {t.severity}
                  </Text>
                </View>

                {t.status === 'Resolved' && resolveTimeStr ? (
                  <Text style={styles.resolveTimeText}>⏱️ Resolved in {resolveTimeStr}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Ticket Action Modal */}
      {selectedTicket && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={!!selectedTicket}
          onRequestClose={() => setSelectedTicket(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ticket Details</Text>
                <TouchableOpacity onPress={() => { setSelectedTicket(null); setResolutionRemarks(''); }}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>ID:</Text>
                  <Text style={styles.metaValue}>{selectedTicket.id}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Category:</Text>
                  <Text style={styles.metaValue}>{selectedTicket.category}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Severity:</Text>
                  <Text style={styles.metaValue}>{selectedTicket.severity}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Status:</Text>
                  <Text style={styles.metaValue}>{selectedTicket.status}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Raised at:</Text>
                  <Text style={styles.metaValue}>
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </Text>
                </View>

                {selectedTicket.startedAt && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Started at:</Text>
                    <Text style={styles.metaValue}>
                      {new Date(selectedTicket.startedAt).toLocaleString()}
                    </Text>
                  </View>
                )}

                {selectedTicket.resolvedAt && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Resolved at:</Text>
                    <Text style={styles.metaValue}>
                      {new Date(selectedTicket.resolvedAt).toLocaleString()}
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={styles.modalSectionTitle}>Description</Text>
                <Text style={styles.modalDesc}>{selectedTicket.description}</Text>

                <View style={styles.divider} />

                {/* Status Transitions */}
                {selectedTicket.status === 'Open' && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleStartWork(selectedTicket.id)}
                  >
                    <Text style={styles.actionBtnText}>Start Work 🔧</Text>
                  </TouchableOpacity>
                )}

                {selectedTicket.status === 'In Progress' && (
                  <View style={styles.resolveForm}>
                    <Text style={styles.modalSectionTitle}>Resolution Remarks</Text>
                    <TextInput
                      style={styles.remarksInput}
                      value={resolutionRemarks}
                      onChangeText={setResolutionRemarks}
                      placeholder="Explain what steps were taken to resolve this..."
                      placeholderTextColor="#666"
                      multiline
                      numberOfLines={3}
                    />
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.resolveBtnColor]}
                      onPress={() => handleResolve(selectedTicket.id)}
                    >
                      <Text style={styles.actionBtnText}>Mark Resolved ✓</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedTicket.status === 'Resolved' && (
                  <View style={styles.resolvedInfoBox}>
                    <Text style={styles.modalSectionTitle}>Resolution Notes</Text>
                    <Text style={styles.resolutionNotes}>
                      {selectedTicket.notes || 'No remarks provided.'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#161b22',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#f0f6fc',
    marginRight: 10,
  },
  exportBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 3,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  tabActive: {
    backgroundColor: '#1f6feb',
    borderColor: '#58a6ff',
  },
  tabText: {
    fontSize: 11,
    color: '#8b949e',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 15,
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 15,
  },
  ticketCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  empInfo: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 2,
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  divider: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 10,
  },
  description: {
    fontSize: 14,
    color: '#c9d1d9',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: {
    fontSize: 12,
    color: '#8b949e',
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sevCritical: {
    color: '#ff7b72',
  },
  sevHigh: {
    color: '#f0883e',
  },
  sevMedium: {
    color: '#d29922',
  },
  sevLow: {
    color: '#8b949e',
  },
  resolveTimeText: {
    fontSize: 11,
    color: '#8b949e',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#8b949e',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    width: 100,
    fontSize: 14,
    color: '#8b949e',
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    color: '#f0f6fc',
  },
  modalSectionTitle: {
    fontSize: 15,
    color: '#58a6ff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#c9d1d9',
    lineHeight: 20,
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resolveForm: {
    marginVertical: 10,
  },
  remarksInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#f0f6fc',
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  resolveBtnColor: {
    backgroundColor: '#238636',
  },
  resolvedInfoBox: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  resolutionNotes: {
    color: '#c9d1d9',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
