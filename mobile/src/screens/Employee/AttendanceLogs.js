import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { fetchAttendanceRecords } from '../../utils/api';

export default function AttendanceLogs({ user }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = useState(''); // "YYYY-MM-DD"
  const [statusFilter, setStatusFilter] = useState('ALL');

  const statuses = ['ALL', 'Present', 'Late', 'Half Day', 'Completed', 'Overtime', 'Auto Closed'];

  const getLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceRecords(user.id, selectedMonth, statusFilter);
      if (data.success) {
        setRecords(data.records || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching attendance records on mobile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLogs();
  }, [selectedMonth, statusFilter]);

  // Apply Day Filter client-side
  const filteredRecords = records.filter((r) => {
    if (selectedDay && r.date !== selectedDay) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Late':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
      case 'Half Day':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' };
      case 'Auto Closed':
        return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
      case 'Overtime':
        return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' };
      case 'Completed':
      case 'Present':
      default:
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    }
  };

  const getMonthsList = () => {
    const list = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 0; i < 6; i++) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      list.push({ val: `${year}-${month}`, label });
      d.setMonth(d.getMonth() - 1);
    }
    return list.reverse();
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>📅 Attendance Logs & Summary</Text>

      {/* Summary Stat Cards Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Present Days</Text>
          <Text style={[styles.statValue, { color: '#059669' }]}>
            {summary?.presentCount || 0}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Late Days</Text>
          <Text style={[styles.statValue, { color: '#d97706' }]}>
            {summary?.lateCount || 0}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Hours</Text>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>
            {summary?.totalWorkHours || 0} hrs
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Overtime</Text>
          <Text style={[styles.statValue, { color: '#7e22ce' }]}>
            {summary?.overtimeCount || 0}
          </Text>
        </View>
      </View>

      {/* Month Selector Bar */}
      <Text style={styles.filterSectionTitle}>Select Month</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScrollContainer}>
        {getMonthsList().map((m) => (
          <TouchableOpacity
            key={m.val}
            style={[styles.monthChip, selectedMonth === m.val && styles.monthChipActive]}
            onPress={() => setSelectedMonth(m.val)}
          >
            <Text style={[styles.monthChipText, selectedMonth === m.val && styles.monthChipTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Specific Date Filter Input */}
      <View style={styles.dateInputRow}>
        <Text style={styles.filterSectionTitle}>Filter by Specific Day (YYYY-MM-DD):</Text>
        <View style={styles.dateInputContainer}>
          <TextInput
            style={styles.dateInput}
            placeholder="e.g. 2026-08-04"
            placeholderTextColor="#94a3b8"
            value={selectedDay}
            onChangeText={setSelectedDay}
            maxLength={10}
          />
          {selectedDay ? (
            <TouchableOpacity onPress={() => setSelectedDay('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Status Filter Chips */}
      <Text style={styles.filterSectionTitle}>Status Filter</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScrollContainer}>
        {statuses.map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.statusChip, statusFilter === st && styles.statusChipActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.statusChipText, statusFilter === st && styles.statusChipTextActive]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Record List */}
      {loading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator color="#2563eb" size="large" />
          <Text style={styles.spinnerText}>Loading attendance records...</Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No attendance records found for this period.</Text>
        </View>
      ) : (
        filteredRecords.map((r) => {
          const colors = getStatusColor(r.status);
          return (
            <View key={r.id || r.date} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordDate}>📆 {r.date}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statusText, { color: colors.text }]}>
                    {r.status || 'Present'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.recordDetailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>IN TIME</Text>
                  <Text style={styles.detailValue}>{r.punchInTimeFormatted || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>OUT TIME</Text>
                  <Text style={styles.detailValue}>{r.punchOutTimeFormatted || '--:--'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>BREAKS</Text>
                  <Text style={styles.detailValue}>{r.totalBreakMinutes || 0}m</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>NET WORK</Text>
                  <Text style={[styles.detailValue, { color: '#2563eb', fontWeight: '800' }]}>
                    {r.netWorkHoursFormatted || '00:00:00'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  monthScrollContainer: {
    marginBottom: 16,
  },
  monthChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  monthChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  monthChipText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },
  monthChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dateInputRow: {
    marginBottom: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
  },
  dateInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  clearBtn: {
    paddingHorizontal: 12,
  },
  clearBtnText: {
    color: '#64748b',
    fontSize: 14,
  },
  statusScrollContainer: {
    marginBottom: 16,
  },
  statusChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  statusChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  spinnerContainer: {
    alignItems: 'center',
    padding: 35,
  },
  spinnerText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  recordDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9.5,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },
});
