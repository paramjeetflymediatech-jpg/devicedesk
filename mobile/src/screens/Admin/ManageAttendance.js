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
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';

export default function ManageAttendance({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredRecords = records.filter(item => {
    const matchesFilter = filterStatus === 'ALL' || (item.status || '').toLowerCase() === filterStatus.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (item.employeeName || '').toLowerCase().includes(query) ||
      (item.employeeId || '').toLowerCase().includes(query) ||
      (item.date || '').toLowerCase().includes(query);
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
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Global Attendance</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {filteredRecords.length} records found
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
          placeholder="Search by employee name, ID or date..."
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {['ALL', 'Present', 'Absent', 'Half Day', 'Leave'].map(status => (
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
          <Text style={{ color: themeColors.textSecondary, marginTop: 10, fontSize: 13 }}>Loading attendance logs...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        >
          {filteredRecords.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
              <Text style={[styles.noData, { color: themeColors.textSecondary }]}>No attendance records match your criteria.</Text>
            </View>
          ) : (
            filteredRecords.map((item, index) => (
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

                <View style={styles.infoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>📅 Date</Text>
                    <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>{item.date}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>🟢 Punch In</Text>
                    <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                      {item.punchInTime ? new Date(item.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>🔴 Punch Out</Text>
                    <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                      {item.punchOutTime ? new Date(item.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                  </View>
                </View>

                {item.duration ? (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: themeColors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>Total Working Hours:</Text>
                    <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>{Math.floor(item.duration / 60)}h {Math.floor(item.duration % 60)}m</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10.5, marginBottom: 2 },
  infoVal: { fontSize: 12.5, fontWeight: '600' },
  detailText: { fontSize: 12 },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  noData: { textAlign: 'center', fontSize: 13 }
});
