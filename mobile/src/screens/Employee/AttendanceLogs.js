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

  const statuses = ['ALL', 'Present', 'Late', 'Half Day', 'Completed', 'Overtime'];

  const getLogs = async () => {
    setLoading(true);
    try {
      // employeeId is user.id, status filter is statusFilter
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
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Half Day':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f85149', border: 'rgba(239, 68, 68, 0.3)' };
      case 'Overtime':
        return { bg: 'rgba(139, 92, 246, 0.15)', text: '#a371f7', border: 'rgba(139, 92, 246, 0.3)' };
      case 'Completed':
      case 'Present':
      default:
        return { bg: 'rgba(56, 139, 253, 0.15)', text: '#58a6ff', border: 'rgba(56, 139, 253, 0.3)' };
    }
  };

  // Generate last 6 months list for easy horizontal clicking
  const getMonthsList = () => {
    const list = [];
    const d = new Date();
    d.setDate(1); // Avoid overflow bug on 31st of the month
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
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>📅 Attendance Logs & Summary</Text>

      {/* Summary Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Present Days</Text>
          <Text style={[styles.statValue, { color: '#58a6ff' }]}>
            {summary?.presentCount || 0}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Late Days</Text>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {summary?.lateCount || 0}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Work Hours</Text>
          <Text style={[styles.statValue, { color: '#a371f7' }]}>
            {(() => {
              const mins = summary?.totalNetMinutes ?? Math.round((parseFloat(summary?.totalWorkHours || 0)) * 60);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return `${h}h ${m}m`;
            })()}
          </Text>
        </View>
      </View>

      {/* Month horizontal scroll filter */}
      <Text style={styles.filterTitle}>Select Month</Text>
      <View style={styles.monthScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {getMonthsList().map((m) => (
            <TouchableOpacity
              key={m.val}
              style={[
                styles.monthBtn,
                selectedMonth === m.val && styles.monthBtnActive
              ]}
              onPress={() => {
                setSelectedMonth(m.val);
                setSelectedDay('');
              }}
            >
              <Text style={[
                styles.monthText,
                selectedMonth === m.val && styles.monthTextActive
              ]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Day Filter */}
      <View style={styles.dayFilterRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filterTitle}>Filter by Specific Day</Text>
          <View style={styles.dayInputContainer}>
            <TextInput
              style={styles.dayInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8b949e"
              value={selectedDay}
              onChangeText={setSelectedDay}
            />
            {selectedDay ? (
              <TouchableOpacity
                onPress={() => setSelectedDay('')}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Status Chips */}
      <Text style={styles.filterTitle}>Filter by Status</Text>
      <View style={styles.statusScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusChip,
                statusFilter === status && styles.statusChipActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.statusChipText,
                statusFilter === status && styles.statusChipTextActive
              ]}>
                {status === 'ALL' ? 'All Statuses' : status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Logs Table / List */}
      <Text style={styles.subTitle}>Records ({filteredRecords.length})</Text>

      {loading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="small" color="#58a6ff" />
          <Text style={styles.spinnerText}>Loading attendance records...</Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <Text style={styles.emptyText}>No records found for this criteria.</Text>
      ) : (
        filteredRecords.map((r) => {
          const colors = getStatusColor(r.status);
          const netMins = r.netWorkMinutes || 0;
          const h = Math.floor(netMins / 60);
          const m = netMins % 60;

          const inTime = r.punchInTime
            ? new Date(r.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-';
          const outTime = r.punchOutTime
            ? new Date(r.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : r.punchInTime ? 'Active' : '-';

          return (
            <View key={r.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordDate}>{r.date}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: colors.bg, borderColor: colors.border }
                ]}>
                  <Text style={[styles.statusText, { color: colors.text }]}>{r.status}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.recordDetailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Punch In</Text>
                  <Text style={styles.detailValue}>{inTime}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Punch Out</Text>
                  <Text style={styles.detailValue}>{outTime}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Break Time</Text>
                  <Text style={styles.detailValue}>{r.totalBreakMinutes || 0}m</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Net Work</Text>
                  <Text style={[styles.detailValue, { color: '#58a6ff', fontWeight: 'bold' }]}>
                    {h}h {m}m
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
    padding: 15,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 15,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginTop: 20,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#8b949e',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8b949e',
    marginBottom: 8,
    marginTop: 10,
  },
  monthScrollContainer: {
    marginBottom: 12,
  },
  monthBtn: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  monthBtnActive: {
    borderColor: '#58a6ff',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
  },
  monthText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '600',
  },
  monthTextActive: {
    color: '#58a6ff',
  },
  dayFilterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
  },
  dayInput: {
    flex: 1,
    color: '#f0f6fc',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtn: {
    paddingHorizontal: 12,
  },
  clearBtnText: {
    color: '#8b949e',
    fontSize: 14,
  },
  statusScrollContainer: {
    marginBottom: 15,
  },
  statusChip: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: '#58a6ff',
    borderColor: '#58a6ff',
  },
  statusChipText: {
    color: '#c9d1d9',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#0d1117',
    fontWeight: 'bold',
  },
  spinnerContainer: {
    alignItems: 'center',
    padding: 30,
  },
  spinnerText: {
    color: '#8b949e',
    fontSize: 13,
    marginTop: 8,
  },
  emptyText: {
    color: '#8b949e',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 30,
  },
  recordCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 10,
  },
  recordDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    color: '#8b949e',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#c9d1d9',
  },
});
