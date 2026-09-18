import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ManageLeaves({ currentUser }) {
  const { themeColors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState([]);

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

  const handleUpdateStatus = async (leaveId, newStatus) => {
    try {
      let reason = '';
      if (newStatus === 'Rejected') {
        reason = 'Rejected via mobile app';
      }

      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/leave/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leaveId: leaveId, 
          action: newStatus, 
          rejectionReason: reason,
          reviewerName: currentUser.name || 'HR Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        sweetAlert({ title: 'Success', text: `Leave request ${newStatus.toLowerCase()} successfully.`, type: 'success' });
        fetchLeaves();
      } else {
        sweetAlert({ title: 'Error', text: data.message || 'Failed to update leave request.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network error.', type: 'error' });
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Leave Requests</Text>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
      >
        {leaves.length === 0 ? (
          <Text style={[styles.noData, { color: themeColors.textSecondary }]}>No leave requests found.</Text>
        ) : (
          leaves.map((item, index) => (
            <View key={index} style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.empName, { color: themeColors.textPrimary }]}>{item.employeeName || item.employeeId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>Type: {item.leaveType || 'General'}</Text>
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>Date: {item.startDate} to {item.endDate}</Text>
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>Reason: {item.reason}</Text>

              {item.status === 'Pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#10b981' }]} 
                    onPress={() => handleUpdateStatus(item.id, 'Approved')}
                  >
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} 
                    onPress={() => handleUpdateStatus(item.id, 'Rejected')}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', margin: 16, marginBottom: 8 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  empName: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  detailText: { fontSize: 14, marginBottom: 4 },
  noData: { textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 12 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 12 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
