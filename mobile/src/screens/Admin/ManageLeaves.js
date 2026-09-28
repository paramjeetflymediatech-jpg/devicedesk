import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ManageLeaves({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rejection modal
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchLeaves = async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/leave/list?status=ALL`);
      const data = await res.json();
      if (data.success) {
        setLeaves(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  const handleUpdateStatus = async (leaveId, newStatus, reason = '') => {
    setSubmittingAction(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/leave/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leaveId: leaveId, 
          action: newStatus, 
          rejectionReason: reason || (newStatus === 'Rejected' ? 'Rejected by HR Admin' : ''),
          reviewerName: currentUser?.name || 'HR Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedLeave(null);
        sweetAlert({ title: 'Success', text: `Leave request ${newStatus.toLowerCase()} successfully.`, type: 'success' });
        fetchLeaves();
      } else {
        sweetAlert({ title: 'Error', text: data.message || 'Failed to update leave request.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network error.', type: 'error' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return '#10b981';
      case 'Rejected': return '#ef4444';
      case 'Pending': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const filteredLeaves = leaves.filter(item => {
    const matchesFilter = filterStatus === 'ALL' || (item.status || '').toLowerCase() === filterStatus.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (item.employeeName || '').toLowerCase().includes(query) ||
      (item.employeeId || '').toLowerCase().includes(query) ||
      (item.leaveType || '').toLowerCase().includes(query) ||
      (item.reason || '').toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 18, color: themeColors.accent || '#3b82f6' }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Leave Applications</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {filteredLeaves.length} applications found
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Text style={{ fontSize: 16 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: themeColors.card, color: themeColors.textPrimary, borderColor: themeColors.border }]}
          placeholder="Search by employee, category or reason..."
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {['ALL', 'Pending', 'Approved', 'Rejected'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.chip,
                { backgroundColor: themeColors.card, borderColor: themeColors.border },
                filterStatus === status && { backgroundColor: themeColors.accent || '#3b82f6', borderColor: themeColors.accent || '#3b82f6' }
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[
                styles.chipText,
                { color: themeColors.textSecondary },
                filterStatus === status && { color: '#ffffff', fontWeight: 'bold' }
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.accent || '#3b82f6'} />
          <Text style={{ color: themeColors.textSecondary, marginTop: 10, fontSize: 13 }}>Loading leave requests...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        >
          {filteredLeaves.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🌴</Text>
              <Text style={[styles.noData, { color: themeColors.textSecondary }]}>No leave requests match your criteria.</Text>
            </View>
          ) : (
            filteredLeaves.map((item, index) => (
              <View key={item.id || index} style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.empName, { color: themeColors.textPrimary }]}>{item.employeeName || item.employeeId}</Text>
                    <Text style={[styles.empIdSub, { color: themeColors.textSecondary }]}>ID: {item.employeeId} · {item.department || 'Operations'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}22`, borderColor: getStatusColor(item.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                <View style={{ marginBottom: 8 }}>
                  <Text style={[styles.detailCategory, { color: themeColors.accent || '#3b82f6' }]}>🌴 {item.leaveType || 'General Leave'}</Text>
                  <Text style={[styles.detailDates, { color: themeColors.textPrimary }]}>
                    📅 {item.startDate || item.fromDate} to {item.endDate || item.toDate} ({item.totalDays || 1} Day{(item.totalDays || 1) > 1 ? 's' : ''})
                  </Text>
                  <Text style={[styles.detailReason, { color: themeColors.textSecondary }]}>"{item.reason}"</Text>
                </View>

                {item.rejectionReason ? (
                  <View style={[styles.rejectionBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }]}>
                    <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: 'bold' }}>Rejection Reason:</Text>
                    <Text style={{ color: themeColors.textPrimary, fontSize: 12, marginTop: 2 }}>{item.rejectionReason}</Text>
                  </View>
                ) : null}

                {item.status === 'Pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#10b981' }]} 
                      onPress={() => {
                        sweetAlert({
                          title: 'Approve Leave',
                          text: `Are you sure you want to approve ${item.employeeName || 'this employee'}'s leave request?`,
                          type: 'warning',
                          showCancel: true,
                          onConfirm: () => handleUpdateStatus(item.id, 'Approved'),
                        });
                      }}
                    >
                      <Text style={styles.actionBtnText}>✓ Approve</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} 
                      onPress={() => {
                        setSelectedLeave(item);
                        setRejectReason('');
                        setShowRejectModal(true);
                      }}
                    >
                      <Text style={styles.actionBtnText}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Rejection Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Reject Leave Application</Text>
            <Text style={[styles.modalSub, { color: themeColors.textSecondary }]}>
              Please specify the reason for rejecting {selectedLeave?.employeeName}'s leave application.
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="e.g. Critical project deadline, staffing shortage..."
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ef4444' }]}
                disabled={submittingAction}
                onPress={() => handleUpdateStatus(selectedLeave.id, 'Rejected', rejectReason)}
              >
                {submittingAction ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  filterRow: {
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empName: { fontSize: 15, fontWeight: 'bold' },
  empIdSub: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 10 },
  detailCategory: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  detailDates: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  detailReason: { fontSize: 12.5, fontStyle: 'italic', lineHeight: 17 },
  rejectionBox: { padding: 8, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  noData: { textAlign: 'center', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  modalSub: { fontSize: 12.5, marginBottom: 12, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  }
});
