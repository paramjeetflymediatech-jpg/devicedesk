import { useTheme } from '../../utils/ThemeContext';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Share,
  Linking,
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';
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
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);
  const [tickets, setTickets] = useState(() => getTickets());
  const [employees, setEmployees] = useState(() => getEmployees());
  const [systems, setSystems] = useState(() => getSystems());
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
    try {
      const baseUrl = getApiUrl();
      const exportUrl = `${baseUrl}/api/export?type=tickets`;
      await Linking.openURL(exportUrl);
    } catch (error) {
      sweetAlert({ title: 'Error', text: 'Failed to export tickets: ' + error.message, type: 'error' });
    }
  };

  useEffect(() => {
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const handleStartWork = (ticketId) => {
    const res = startTicketWork(ticketId);
    if (res) {
      sweetAlert({ title: 'Success', text: 'Ticket marked as "In Progress". Work has started!', type: 'success' });
      setSelectedTicket(null);
    } else {
      sweetAlert({ title: 'Error', text: 'Failed to update ticket.', type: 'error' });
    }
  };

  const handleResolve = (ticketId) => {
    if (!resolutionRemarks.trim()) {
      sweetAlert({ title: 'Error', text: 'Please enter resolution remarks.', type: 'error' });
      return;
    }
    const res = resolveTicket(ticketId, resolutionRemarks.trim());
    if (res) {
      sweetAlert({ title: 'Success', text: 'Ticket marked as "Resolved"!', type: 'success' });
      setSelectedTicket(null);
      setResolutionRemarks('');
    } else {
      sweetAlert({ title: 'Error', text: 'Failed to resolve ticket.', type: 'error' });
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
        <View style={{ position: 'relative', flex: 1, marginRight: 10 }}>
          <TextInput
            style={[styles.searchInput, { width: '100%', marginRight: 0, paddingRight: 35 }]}
            placeholder="Search by Employee, SN, Category or Severity..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: [{ translateY: -12 }],
                padding: 4,
              }}
              onPress={() => setSearchQuery('')}
            >
              <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
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

                {(selectedTicket.updatedAt || selectedTicket.resolvedAt || selectedTicket.startedAt) && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Updated at:</Text>
                    <Text style={[styles.metaValue, { color: themeColors.accent, fontWeight: 'bold' }]}>
                      {new Date(selectedTicket.updatedAt || selectedTicket.resolvedAt || selectedTicket.startedAt || selectedTicket.createdAt).toLocaleString()}
                    </Text>
                  </View>
                )}

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

const getStyles = (themeColors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: themeColors.card,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: themeColors.textPrimary,
    marginRight: 10,
  },
  exportBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportBtnText: {
    color: themeColors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.card,
    borderBottomWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 3,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tabActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.accent,
  },
  tabText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: themeColors.card,
  },
  listContainer: {
    padding: 15,
  },
  emptyText: {
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: 30,
    fontSize: 15,
  },
  ticketCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
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
    color: themeColors.accent,
  },
  empInfo: {
    fontSize: 12,
    color: themeColors.textSecondary,
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
    borderColor: '#ef4444',
  },
  badgeProgress: {
    backgroundColor: 'rgba(210, 153, 34, 0.15)',
    borderColor: '#f59e0b',
  },
  badgeResolved: {
    backgroundColor: 'rgba(56, 139, 60, 0.15)',
    borderColor: '#10b981',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: 10,
  },
  description: {
    fontSize: 14,
    color: themeColors.text,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sevCritical: {
    color: '#ef4444',
  },
  sevHigh: {
    color: '#f0883e',
  },
  sevMedium: {
    color: '#f59e0b',
  },
  sevLow: {
    color: themeColors.textSecondary,
  },
  resolveTimeText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: themeColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: themeColors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  closeBtnText: {
    fontSize: 20,
    color: themeColors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    width: 100,
    fontSize: 14,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  modalSectionTitle: {
    fontSize: 15,
    color: themeColors.accent,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: themeColors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: themeColors.primary,
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
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: themeColors.textPrimary,
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  resolveBtnColor: {
    backgroundColor: '#10b981',
  },
  resolvedInfoBox: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  resolutionNotes: {
    color: themeColors.text,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
