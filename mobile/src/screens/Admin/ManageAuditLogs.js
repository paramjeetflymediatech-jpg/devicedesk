import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import { fetchAuditLogsApi } from '../../utils/api';

export default function ManageAuditLogs({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchAuditLogsApi();
      if (res && res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAuditLogs();
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const entity = String(log.submission_id || log.entity_id || '').toLowerCase();
    const changer = String(log.employee_name || log.changed_by || '').toLowerCase();
    const status = String(log.new_status || log.action || '').toLowerCase();
    const notes = String(log.comment || log.notes || '').toLowerCase();
    return entity.includes(q) || changer.includes(q) || status.includes(q) || notes.includes(q);
  });

  const getStatusColor = (st = '') => {
    const s = st.toLowerCase();
    if (s.includes('approve') || s.includes('resolve') || s.includes('complete')) return '#16a34a';
    if (s.includes('reject') || s.includes('delete') || s.includes('critical')) return '#dc2626';
    if (s.includes('progress') || s.includes('assign') || s.includes('review')) return '#d97706';
    return '#2563eb';
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <AppIcon name="arrow-left" size={18} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>🛡️ System Audit Trail & Logs</Text>
            <Text style={styles.subtitle}>Security events, state transitions & change history</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <AppIcon name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search action, employee, entity, notes..."
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

      {/* Logs List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Loading audit trail records...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        >
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Audit Records Found</Text>
              <Text style={styles.emptySubtitle}>All system actions and status transitions are logged here.</Text>
            </View>
          ) : (
            filteredLogs.map((log) => {
              const statusColor = getStatusColor(log.new_status || log.action || '');
              const timestamp = log.created_at || log.timestamp;
              const formattedDate = timestamp ? new Date(timestamp).toLocaleString() : 'N/A';

              return (
                <TouchableOpacity
                  key={log.id}
                  style={styles.logCard}
                  onPress={() => setSelectedLog(log)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13 }}>⏱️</Text>
                      <Text style={styles.timestampText}>{formattedDate}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {log.new_status || log.action || 'Updated'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardBody}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Changed By:</Text>
                      <Text style={styles.detailVal}>
                        👤 {log.employee_name || log.changed_by || 'System Admin'}
                      </Text>
                    </View>

                    {log.submission_id || log.entity_id ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reference Entity:</Text>
                        <Text style={[styles.detailVal, { color: '#2563eb' }]}>
                          ID #{log.submission_id || log.entity_id}
                        </Text>
                      </View>
                    ) : null}

                    {log.previous_status ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Transition:</Text>
                        <Text style={styles.detailVal}>
                          {log.previous_status} ➔ {log.new_status || log.action}
                        </Text>
                      </View>
                    ) : null}

                    {log.comment || log.notes ? (
                      <View style={styles.commentBox}>
                        <Text style={styles.commentText} numberOfLines={2}>
                          "{log.comment || log.notes}"
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* MODAL: AUDIT LOG DETAILS */}
      {selectedLog && (
        <Modal
          visible={!!selectedLog}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedLog(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🛡️ Audit Record Details</Text>
                <TouchableOpacity onPress={() => setSelectedLog(null)}>
                  <AppIcon name="x" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Log ID:</Text>
                  <Text style={styles.modalVal}>#{selectedLog.id}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Timestamp:</Text>
                  <Text style={styles.modalVal}>
                    {selectedLog.created_at || selectedLog.timestamp || 'N/A'}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Operator / User:</Text>
                  <Text style={styles.modalVal}>
                    {selectedLog.employee_name || selectedLog.changed_by || 'Admin'}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Action / State:</Text>
                  <Text style={[styles.modalVal, { color: getStatusColor(selectedLog.new_status || selectedLog.action), fontWeight: 'bold' }]}>
                    {selectedLog.new_status || selectedLog.action || 'Updated'}
                  </Text>
                </View>
                {selectedLog.submission_id && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Target Entity:</Text>
                    <Text style={styles.modalVal}>Submission #{selectedLog.submission_id}</Text>
                  </View>
                )}
                {selectedLog.comment && (
                  <View style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderWidth: 1, borderColor: themeColors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: themeColors.textSecondary, marginBottom: 4 }}>NOTES / REMARKS</Text>
                    <Text style={{ fontSize: 12.5, color: themeColors.textPrimary }}>{selectedLog.comment}</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedLog(null)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.headerBg,
    },
    backBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
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
    listContent: {
      padding: 16,
      gap: 12,
    },
    centerLoader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    loaderText: {
      marginTop: 10,
      color: themeColors.textSecondary,
      fontSize: 13,
    },
    emptyCard: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      marginTop: 20,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    emptySubtitle: {
      fontSize: 12,
      color: themeColors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    logCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      padding: 14,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timestampText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 10.5,
      fontWeight: '800',
    },
    divider: {
      height: 1,
      backgroundColor: themeColors.border,
      marginVertical: 10,
    },
    cardBody: {
      gap: 6,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    detailLabel: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    detailVal: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    commentBox: {
      marginTop: 6,
      padding: 8,
      borderRadius: 6,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    commentText: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      fontStyle: 'italic',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalSheet: {
      width: '100%',
      maxWidth: 400,
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
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    modalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    modalLabel: {
      fontSize: 12,
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    modalVal: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    closeBtn: {
      marginTop: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#2563eb',
      alignItems: 'center',
    },
    closeBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 12.5,
    },
  });
}
