import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ManageAttendance({ currentUser }) {
  const { themeColors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState([]);

  const fetchAttendance = async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/attendance/list?status=ALL`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#10b981';
      case 'Absent': return '#ef4444';
      case 'Half Day': return '#f59e0b';
      case 'Leave': return '#3b82f6';
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
      <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Global Attendance</Text>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
      >
        {records.length === 0 ? (
          <Text style={[styles.noData, { color: themeColors.textSecondary }]}>No attendance records found.</Text>
        ) : (
          records.map((item, index) => (
            <View key={index} style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.empName, { color: themeColors.textPrimary }]}>{item.employeeName || item.employeeId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>Date: {item.date}</Text>
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>In: {item.punchInTime ? new Date(item.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}  |  Out: {item.punchOutTime ? new Date(item.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>Duration: {item.duration ? `${Math.floor(item.duration/60)}h ${Math.floor(item.duration%60)}m` : '--'}</Text>
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
  noData: { textAlign: 'center', marginTop: 20, fontStyle: 'italic' }
});
