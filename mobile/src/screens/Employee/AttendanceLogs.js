import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { fetchAttendanceRecords } from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import CalendarPickerModal from '../../components/CalendarPickerModal';

const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch(e) {
    return '--:--';
  }
};

const formatDuration = (minutes) => {
  if (!minutes) return '00:00:00';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
};

export default function AttendanceLogs({ user }) {
  const { isDark, themeColors } = useTheme();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await getLogs();
    setRefreshing(false);
  };

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [fromDate, setFromDate] = useState(''); // "YYYY-MM-DD"
  const [toDate, setToDate] = useState('');     // "YYYY-MM-DD"
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Calendar Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const statuses = ['ALL', 'Present', 'Late', 'Half Day', 'Completed', 'Overtime', 'Auto Closed'];

  const getLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceRecords(user.id, selectedMonth, 'ALL');
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
  }, [selectedMonth]);

  // Apply Date Range and Status Filter client-side
  const filteredRecords = records.filter((r) => {
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;

    if (statusFilter !== 'ALL') {
      const st = (r.status || '').toLowerCase().trim();
      const rem = (r.remarks || '').toLowerCase();

      if (statusFilter === 'Late') {
        let isLate = st.includes('late') || rem.includes('late');
        if (!isLate && r.punchInTime) {
          try {
            const pDate = new Date(r.punchInTime);
            if (pDate.getHours() * 60 + pDate.getMinutes() > 580) { // Punched in after 09:40 AM
              isLate = true;
            }
          } catch(e) {}
        }
        if (!isLate) return false;
      } else if (statusFilter === 'Overtime') {
        if (!st.includes('overtime') && !rem.includes('overtime')) return false;
      } else if (statusFilter === 'Half Day') {
        if (!st.includes('half') && !rem.includes('half')) return false;
      } else {
        if (st !== statusFilter.toLowerCase()) return false;
      }
    }
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

  // Dynamic summary computation for mobile view
  const computedSummary = useMemo(() => {
    let totalNetMinutes = 0;
    let presentCount = 0;
    let lateCount = 0;
    let overtimeCount = 0;

    filteredRecords.forEach((r) => {
      totalNetMinutes += (r.netWorkMinutes || 0);
      const st = (r.status || '').toLowerCase().trim();
      const rem = (r.remarks || '').toLowerCase();

      let isLate = st.includes('late') || rem.includes('late');
      if (!isLate && r.punchInTime) {
        try {
          const pDate = new Date(r.punchInTime);
          const hrs = pDate.getHours();
          const mins = pDate.getMinutes();
          if (hrs * 60 + mins > 580) { // Punched in after 09:40 AM
            isLate = true;
          }
        } catch (e) {}
      }

      if (isLate) {
        lateCount++;
        presentCount++;
      } else if (st === 'present' || st === 'completed' || st === 'overtime' || st === 'active') {
        presentCount++;
      }

      if (st.includes('overtime') || rem.includes('overtime')) {
        overtimeCount++;
      }
    });

    if (summary && filteredRecords.length === records.length) {
      presentCount = Math.max(presentCount, summary.presentCount || 0);
      lateCount = Math.max(lateCount, summary.lateCount || 0);
    }

    const totalWorkHours = (totalNetMinutes / 60).toFixed(1);

    return {
      presentCount,
      lateCount,
      totalWorkHours,
      overtimeCount
    };
  }, [filteredRecords, summary, records.length]);

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
    >
      <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>📅 Attendance Logs & Summary</Text>

      {/* Summary Stat Cards Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Present Days</Text>
          <Text style={[styles.statValue, { color: '#059669' }]}>
            {computedSummary.presentCount}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Late Days</Text>
          <Text style={[styles.statValue, { color: '#d97706' }]}>
            {computedSummary.lateCount}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Total Hours</Text>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>
            {computedSummary.totalWorkHours} hrs
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Overtime</Text>
          <Text style={[styles.statValue, { color: '#7e22ce' }]}>
            {computedSummary.overtimeCount}
          </Text>
        </View>
      </View>

      {/* Month Selector Bar */}
      {/* <Text style={[styles.filterSectionTitle, { color: themeColors.textPrimary }]}>Select Month</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScrollContainer}>
        {getMonthsList().map((m) => (
          <TouchableOpacity
            key={m.val}
            style={[
              styles.monthChip,
              { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: themeColors.border },
              selectedMonth === m.val && styles.monthChipActive
            ]}
            onPress={() => setSelectedMonth(m.val)}
          >
            <Text style={[
              styles.monthChipText,
              { color: themeColors.textPrimary },
              selectedMonth === m.val && styles.monthChipTextActive
            ]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView> */}

      {/* Single Calendar Date Range Filter */}
      <View style={styles.dateInputRow}>
        <Text style={[styles.filterSectionTitle, { color: themeColors.textPrimary }]}>Filter by Date Range:</Text>
        <TouchableOpacity
          style={[
            styles.dateInputContainer,
            { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: themeColors.border, paddingRight: 4 }
          ]}
          onPress={() => setShowCalendarModal(true)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16, marginLeft: 10 }}>📅</Text>
          <TextInput
            style={[
              styles.dateInput,
              { color: themeColors.textPrimary, fontWeight: (fromDate || toDate) ? '700' : '400' }
            ]}
            placeholder="Select Date Range..."
            placeholderTextColor={themeColors.textSecondary}
            value={fromDate || toDate ? `${fromDate || 'Start'} ➔ ${toDate || 'End'}` : ''}
            editable={false}
            pointerEvents="none"
          />
          {(fromDate || toDate) ? (
            <TouchableOpacity onPress={() => { setFromDate(''); setToDate(''); }} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Status Filter Chips */}
      <Text style={[styles.filterSectionTitle, { color: themeColors.textPrimary }]}>Status Filter</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScrollContainer}>
        {statuses.map((st) => (
          <TouchableOpacity
            key={st}
            style={[
              styles.statusChip,
              { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: themeColors.border },
              statusFilter === st && styles.statusChipActive
            ]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[
              styles.statusChipText,
              { color: themeColors.textPrimary },
              statusFilter === st && styles.statusChipTextActive
            ]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Record List */}
      {loading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator color="#2563eb" size="large" />
          <Text style={[styles.spinnerText, { color: themeColors.textSecondary }]}>Loading attendance records...</Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No attendance records found for this period.</Text>
        </View>
      ) : (
        filteredRecords.map((r) => {
          const colors = getStatusColor(r.status);
          return (
            <View key={r.id || r.date} style={[styles.recordCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
              <View style={styles.recordHeader}>
                <Text style={[styles.recordDate, { color: themeColors.textPrimary }]}>📆 {r.date}</Text>
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

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              <View style={styles.recordDetailsRow}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>IN TIME</Text>
                  <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{r.punchInTimeFormatted || formatTime(r.punchInTime) || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>OUT TIME</Text>
                  <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{r.punchOutTimeFormatted || formatTime(r.punchOutTime) || '--:--'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>BREAKS</Text>
                  <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{r.totalBreakMinutes || 0}m</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>NET WORK</Text>
                  <Text style={[styles.detailValue, { color: '#2563eb', fontWeight: '800' }]}>
                    {r.netWorkHoursFormatted || formatDuration(r.netWorkMinutes)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Single Calendar Picker Modal */}
      <CalendarPickerModal
        visible={showCalendarModal}
        title="Select Date Range"
        fromDate={fromDate}
        toDate={toDate}
        onSelectRange={(start, end) => {
          setFromDate(start);
          setToDate(end);
        }}
        onClose={() => setShowCalendarModal(false)}
      />
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
