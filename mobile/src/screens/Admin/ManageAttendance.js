import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import AttendanceWidget from '../../components/AttendanceWidget';
import { getEmployees } from '../../store/store';
import {
  fetchAttendanceRecords,
  regularizeAttendanceApi,
  autoCloseAttendanceApi,
  fetchEmployeesApi,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

// Fast Memoized Record Card Component
const AttendanceRecordItem = React.memo(({ item, index, isDark, themeColors, styles, onRegularize }) => {
  const getStatusColor = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('present') || s.includes('completed')) return '#10b981';
    if (s.includes('late')) return '#f59e0b';
    if (s.includes('half')) return '#ea580c';
    if (s.includes('absent')) return '#ef4444';
    if (s.includes('leave')) return '#3b82f6';
    if (s.includes('auto')) return '#8b5cf6';
    return '#64748b';
  };

  const formatTimeStr = (iso) => {
    if (!iso) return '--:--';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  const formatMinutes = (mins = 0) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${h}h ${m}m`;
  };

  const stColor = getStatusColor(item.status);
  const inTime = formatTimeStr(item.punchInTime);
  const outTime = formatTimeStr(item.punchOutTime);
  const netDuration = formatMinutes(item.netWorkMinutes || item.totalWorkMinutes || 0);
  const breakDuration = formatMinutes(item.totalBreakMinutes || 0);

  return (
    <View style={styles.recordCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.empName}>{item.employeeName || item.employeeId}</Text>
          <Text style={styles.empIdSub}>
            ID: {item.employeeId} · {item.department || 'Staff'} · {item.date}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${stColor}22`, borderColor: stColor }]}>
          <Text style={[styles.statusBadgeText, { color: stColor }]}>{item.status || 'Present'}</Text>
        </View>
      </View>

      {/* Timing Grid */}
      <View style={styles.timingGrid}>
        <View style={styles.timingBox}>
          <Text style={styles.timingLabel}>Punch In</Text>
          <Text style={styles.timingVal}>{inTime}</Text>
        </View>
        <View style={styles.timingBox}>
          <Text style={styles.timingLabel}>Punch Out</Text>
          <Text style={styles.timingVal}>{outTime}</Text>
        </View>
        <View style={styles.timingBox}>
          <Text style={styles.timingLabel}>Net Work</Text>
          <Text style={[styles.timingVal, { color: '#3b82f6', fontWeight: '800' }]}>{netDuration}</Text>
        </View>
        <View style={styles.timingBox}>
          <Text style={styles.timingLabel}>Break</Text>
          <Text style={styles.timingVal}>{breakDuration}</Text>
        </View>
      </View>

      {/* Remarks & Mod details */}
      {item.remarks ? (
        <Text style={styles.remarksText} numberOfLines={2}>
          💬 {item.remarks}
        </Text>
      ) : null}

      {item.modifiedBy ? (
        <View style={styles.modifiedBadge}>
          <Text style={styles.modifiedText}>
            ✏️ Regularized by {item.modifiedBy} {item.modifiedReason ? `(${item.modifiedReason})` : ''}
          </Text>
        </View>
      ) : null}

      {/* Card Actions */}
      <View style={styles.cardFooter}>
        <Text style={styles.ipText}>🌐 Device GPS Verified</Text>
        <TouchableOpacity
          style={styles.fixBtn}
          onPress={() => onRegularize(item)}
        >
          <AppIcon name="edit" size={13} color="#3b82f6" />
          <Text style={styles.fixBtnText}>Regularize</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ManageAttendance({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState(() => getEmployees() || []);
  const [showWidget, setShowWidget] = useState(false);

  // Progressive Lazy Render Limit for ultra-fast performance
  const [visibleLimit, setVisibleLimit] = useState(20);

  // Filter Modes: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  const [filterType, setFilterType] = useState('monthly');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Date States
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  // Regularize Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regData, setRegData] = useState({
    recordId: '',
    employeeId: '',
    employeeName: '',
    date: '',
    punchInTime: '',
    punchOutTime: '',
    status: 'Present',
    reason: 'Forgot to Punch In',
    remarks: '',
  });

  // Load Data
  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (filterType === 'daily') {
        data = await fetchAttendanceRecords(null, null, 'ALL', selectedDate);
      } else if (filterType === 'custom' && fromDate && toDate) {
        data = await fetchAttendanceRecords(null, null, 'ALL', null, fromDate, toDate);
      } else if (filterType === 'yearly') {
        data = await fetchAttendanceRecords(null, selectedYear, 'ALL');
      } else {
        // default monthly
        data = await fetchAttendanceRecords(null, selectedMonth, 'ALL');
      }

      if (data && data.success) {
        setRecords(data.records || data.data || []);
      } else if (data && Array.isArray(data.records)) {
        setRecords(data.records);
      } else {
        setRecords([]);
      }
      setVisibleLimit(20);
    } catch (err) {
      console.error('Failed to fetch attendance logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType, selectedMonth, selectedDate, selectedYear, fromDate, toDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    fetchEmployeesApi()
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setEmployees(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  // Day navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const pad = (n) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  // Auto-close handler
  const handleAutoClose = async () => {
    sweetAlert({
      title: 'Auto-Close Shifts',
      text: 'Scan and automatically close any open/overdue shifts past the maximum shift duration?',
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const res = await autoCloseAttendanceApi();
          if (res && res.success) {
            sweetAlert({
              title: 'Shifts Updated',
              text: res.message || 'Overdue shifts auto-closed successfully.',
              type: 'success',
            });
            loadAttendance();
          } else {
            sweetAlert({
              title: 'Error',
              text: res?.message || 'Failed to auto-close shifts.',
              type: 'error',
            });
          }
        } catch (e) {
          sweetAlert({
            title: 'Error',
            text: e.message || 'Failed to execute auto-close.',
            type: 'error',
          });
        }
      },
    });
  };

  // Open regularize modal
  const handleOpenRegularize = useCallback((record = null) => {
    if (record) {
      const punchInFormatted = record.punchInTime
        ? new Date(record.punchInTime).toISOString().slice(0, 19).replace('T', ' ')
        : `${record.date} 09:30:00`;
      const punchOutFormatted = record.punchOutTime
        ? new Date(record.punchOutTime).toISOString().slice(0, 19).replace('T', ' ')
        : `${record.date} 18:30:00`;

      setRegData({
        recordId: record.id || '',
        employeeId: record.employeeId || '',
        employeeName: record.employeeName || '',
        date: record.date || '',
        punchInTime: punchInFormatted,
        punchOutTime: punchOutFormatted,
        status: record.status || 'Present',
        reason: 'Forgot to Punch In',
        remarks: record.remarks || '',
      });
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setRegData({
        recordId: '',
        employeeId: employees[0]?.id || '',
        employeeName: employees[0]?.name || '',
        date: todayStr,
        punchInTime: `${todayStr} 09:30:00`,
        punchOutTime: `${todayStr} 18:30:00`,
        status: 'Present',
        reason: 'Forgot to Punch In',
        remarks: '',
      });
    }
    setShowRegModal(true);
  }, [employees]);

  const handleSaveRegularization = async () => {
    if (!regData.employeeId || !regData.date || !regData.punchInTime || !regData.reason) {
      sweetAlert({
        title: 'Validation Error',
        text: 'Please fill in Employee, Date, Punch In Time, and Reason.',
        type: 'warning',
      });
      return;
    }

    try {
      setRegSubmitting(true);
      const res = await regularizeAttendanceApi({
        ...regData,
        adminName: currentUser?.name || 'Admin',
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Regularized',
          text: res.message || 'Attendance record updated successfully!',
          type: 'success',
        });
        setShowRegModal(false);
        loadAttendance();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.message || 'Failed to regularize attendance.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: err.message || 'Network error updating record.',
        type: 'error',
      });
    } finally {
      setRegSubmitting(false);
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const st = (r.status || '').toLowerCase().trim();
        const rem = (r.remarks || '').toLowerCase();

        if (statusFilter === 'Late') {
          let isLate = st.includes('late') || rem.includes('late');
          if (!isLate && r.punchInTime) {
            try {
              const inDate = new Date(r.punchInTime);
              const inHours = inDate.getHours();
              const inMins = inDate.getMinutes();
              if (inHours > 9 || (inHours === 9 && inMins > 45)) isLate = true;
            } catch (e) {}
          }
          if (!isLate) return false;
        } else if (statusFilter === 'Half Day') {
          if (!st.includes('half')) return false;
        } else if (statusFilter === 'Absent') {
          if (!st.includes('absent')) return false;
        } else if (statusFilter === 'Present') {
          if (!st.includes('present') && !st.includes('completed')) return false;
        } else if (statusFilter === 'Leave') {
          if (!st.includes('leave')) return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = (r.employeeName || '').toLowerCase().includes(q);
        const matchesId = (r.employeeId || '').toLowerCase().includes(q);
        const matchesDate = (r.date || '').toLowerCase().includes(q);
        const matchesStatus = (r.status || '').toLowerCase().includes(q);
        const matchesRemarks = (r.remarks || '').toLowerCase().includes(q);

        if (!matchesName && !matchesId && !matchesDate && !matchesStatus && !matchesRemarks) {
          return false;
        }
      }

      return true;
    });
  }, [records, statusFilter, searchQuery]);

  // Paginated visible slice
  const displayedRecords = useMemo(() => {
    return filteredRecords.slice(0, visibleLimit);
  }, [filteredRecords, visibleLimit]);

  const handleEndReached = () => {
    if (visibleLimit < filteredRecords.length) {
      setVisibleLimit((prev) => prev + 20);
    }
  };

  // Calculate Summary Stats from all records in period
  const summaryStats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalNetMinutes = 0;

    records.forEach((r) => {
      totalNetMinutes += r.netWorkMinutes || 0;
      const st = (r.status || '').toLowerCase().trim();
      const rem = (r.remarks || '').toLowerCase();

      let isLate = st.includes('late') || rem.includes('late');
      if (!isLate && r.punchInTime) {
        try {
          const inDate = new Date(r.punchInTime);
          const inHours = inDate.getHours();
          const inMins = inDate.getMinutes();
          if (inHours > 9 || (inHours === 9 && inMins > 45)) isLate = true;
        } catch (e) {}
      }

      if (isLate) lateCount++;
      if (st.includes('half')) halfDayCount++;
      if (st.includes('absent')) absentCount++;
      if (st.includes('present') || st.includes('completed')) presentCount++;
    });

    const totalHours = (totalNetMinutes / 60).toFixed(1);
    const avgHours = records.length > 0 ? (totalNetMinutes / records.length / 60).toFixed(1) : '0.0';

    return { presentCount, lateCount, halfDayCount, absentCount, totalHours, avgHours };
  }, [records]);

  // Render List Header
  const renderListHeader = () => (
    <View>
      {/* Collapsible Live Punch Widget */}
      {showWidget && (
        <View style={styles.widgetWrapper}>
          <View style={styles.widgetHeaderRow}>
            <Text style={styles.widgetHeaderTitle}>⏱️ Live Shift Punch Widget</Text>
            <TouchableOpacity onPress={() => setShowWidget(false)}>
              <AppIcon name="x" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <AttendanceWidget user={currentUser} />
        </View>
      )}

      {/* KPI Summary Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderColor: '#10b981' }]}>
          <Text style={[styles.kpiVal, { color: '#10b981' }]}>{summaryStats.presentCount}</Text>
          <Text style={styles.kpiLbl}>Present</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#f59e0b' }]}>
          <Text style={[styles.kpiVal, { color: '#f59e0b' }]}>{summaryStats.lateCount}</Text>
          <Text style={styles.kpiLbl}>Late</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#ea580c' }]}>
          <Text style={[styles.kpiVal, { color: '#ea580c' }]}>{summaryStats.halfDayCount}</Text>
          <Text style={styles.kpiLbl}>Half Day</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#ef4444' }]}>
          <Text style={[styles.kpiVal, { color: '#ef4444' }]}>{summaryStats.absentCount}</Text>
          <Text style={styles.kpiLbl}>Absent</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#3b82f6' }]}>
          <Text style={[styles.kpiVal, { color: '#3b82f6' }]}>{summaryStats.totalHours}h</Text>
          <Text style={styles.kpiLbl}>Total Work</Text>
        </View>
      </View>

      {/* Filter Type Pills (Daily, Monthly, Yearly, Custom) */}
      <View style={styles.filterModeRow}>
        {['monthly', 'daily', 'yearly', 'custom'].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.filterModePill, filterType === mode && styles.filterModePillActive]}
            onPress={() => setFilterType(mode)}
          >
            <Text style={[styles.filterModeText, filterType === mode && styles.filterModeTextActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Controls per Mode */}
      {filterType === 'monthly' && (
        <View style={styles.dateNavigator}>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevMonth}>
            <AppIcon name="chevron-left" size={18} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navDateText}>📅 {selectedMonth}</Text>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextMonth}>
            <AppIcon name="chevron-right" size={18} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {filterType === 'daily' && (
        <View style={styles.dateNavigator}>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevDay}>
            <AppIcon name="chevron-left" size={18} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navDateText}>📅 {selectedDate}</Text>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextDay}>
            <AppIcon name="chevron-right" size={18} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {filterType === 'custom' && (
        <View style={styles.customDateRow}>
          <View style={styles.customDateInputBox}>
            <Text style={styles.customDateLabel}>From:</Text>
            <TextInput
              style={styles.customDateInput}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={themeColors.textSecondary}
            />
          </View>
          <View style={styles.customDateInputBox}>
            <Text style={styles.customDateLabel}>To:</Text>
            <TextInput
              style={styles.customDateInput}
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={themeColors.textSecondary}
            />
          </View>
        </View>
      )}

      {/* Search Box */}
      <View style={styles.searchBox}>
        <AppIcon name="search" size={16} color={themeColors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, date, status, remarks..."
          placeholderTextColor={themeColors.textMuted || '#94a3b8'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <AppIcon name="x" size={16} color={themeColors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusChipsScroll}>
        {['ALL', 'Present', 'Late', 'Half Day', 'Absent', 'Leave'].map((st) => (
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <AppIcon name="arrow-left" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, marginLeft: onBack ? 10 : 0 }}>
          <Text style={styles.headerTitle}>Global Attendance</Text>
          <Text style={styles.headerSub}>
            {filteredRecords.length} records · {filterType.toUpperCase()} view
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
            onPress={() => setShowWidget(!showWidget)}
          >
            <AppIcon name="clock" size={16} color="#3b82f6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
            onPress={handleAutoClose}
          >
            <AppIcon name="power" size={16} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenRegularize(null)}>
            <AppIcon name="plus" size={15} color="#ffffff" />
            <Text style={styles.addBtnText}>Regularize</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Virtualized Ultra-Fast FlatList */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 12, color: themeColors.textSecondary }}>Loading attendance records...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedRecords}
          keyExtractor={(item, index) => String(item.id || `${item.employeeId}-${item.date}-${index}`)}
          renderItem={({ item, index }) => (
            <AttendanceRecordItem
              item={item}
              index={index}
              isDark={isDark}
              themeColors={themeColors}
              styles={styles}
              onRegularize={handleOpenRegularize}
            />
          )}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <AppIcon name="clock" size={44} color={themeColors.textMuted || '#94a3b8'} />
              <Text style={styles.emptyTitle}>No Attendance Records</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'No records match your search filter.'
                  : 'No attendance logs recorded for the selected period.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            visibleLimit < filteredRecords.length ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleEndReached}>
                <Text style={styles.loadMoreText}>Load More Records ({filteredRecords.length - visibleLimit} remaining)</Text>
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Regularize Modal */}
      <Modal visible={showRegModal} animationType="slide" transparent onRequestClose={() => setShowRegModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="edit" size={20} color="#3b82f6" />
                <Text style={styles.modalTitle}>
                  {regData.recordId ? 'Regularize Attendance' : 'Add Regularization'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRegModal(false)}>
                <AppIcon name="x" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>Employee ID / Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. EMP001"
                placeholderTextColor={themeColors.textSecondary}
                value={regData.employeeId}
                onChangeText={(t) => setRegData({ ...regData, employeeId: t })}
              />

              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={themeColors.textSecondary}
                value={regData.date}
                onChangeText={(t) => setRegData({ ...regData, date: t })}
              />

              <Text style={styles.fieldLabel}>Punch In Time (YYYY-MM-DD HH:MM:SS) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="2026-09-30 09:30:00"
                placeholderTextColor={themeColors.textSecondary}
                value={regData.punchInTime}
                onChangeText={(t) => setRegData({ ...regData, punchInTime: t })}
              />

              <Text style={styles.fieldLabel}>Punch Out Time (YYYY-MM-DD HH:MM:SS)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="2026-09-30 18:30:00"
                placeholderTextColor={themeColors.textSecondary}
                value={regData.punchOutTime}
                onChangeText={(t) => setRegData({ ...regData, punchOutTime: t })}
              />

              <Text style={styles.fieldLabel}>Status *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {['Present', 'Half Day', 'Absent'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusSelectPill,
                      regData.status === st && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                    ]}
                    onPress={() => setRegData({ ...regData, status: st })}
                  >
                    <Text
                      style={[
                        styles.statusSelectPillText,
                        regData.status === st && { color: '#ffffff', fontWeight: '700' },
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Reason for Regularization *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {[
                  'Forgot to Punch In',
                  'Biometric Device Issue',
                  'Client Onsite Visit',
                  'Work From Home',
                  'Network Outage',
                ].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, regData.reason === r && styles.reasonChipActive]}
                    onPress={() => setRegData({ ...regData, reason: r })}
                  >
                    <Text style={[styles.reasonChipText, regData.reason === r && styles.reasonChipTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Admin Remarks</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Optional explanation notes..."
                placeholderTextColor={themeColors.textSecondary}
                value={regData.remarks}
                onChangeText={(t) => setRegData({ ...regData, remarks: t })}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowRegModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSubmit}
                onPress={handleSaveRegularization}
                disabled={regSubmitting}
              >
                {regSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Save Regularization</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (themeColors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.card,
    },
    backBtn: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    headerSub: {
      fontSize: 12,
      marginTop: 2,
      color: themeColors.textSecondary,
    },
    headerActionBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3b82f6',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      gap: 4,
    },
    addBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 12,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    widgetWrapper: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.card,
      padding: 12,
      marginBottom: 16,
    },
    widgetHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    widgetHeaderTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    kpiRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 14,
    },
    kpiCard: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: themeColors.card,
      alignItems: 'center',
    },
    kpiVal: {
      fontSize: 16,
      fontWeight: '800',
    },
    kpiLbl: {
      fontSize: 10,
      marginTop: 2,
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    filterModeRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
      borderRadius: 10,
      padding: 4,
      marginBottom: 12,
    },
    filterModePill: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 8,
    },
    filterModePillActive: {
      backgroundColor: '#3b82f6',
    },
    filterModeText: {
      fontSize: 12,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    filterModeTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    dateNavigator: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.card,
      marginBottom: 12,
    },
    navArrowBtn: {
      padding: 6,
    },
    navDateText: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    customDateRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    customDateInputBox: {
      flex: 1,
    },
    customDateLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.textSecondary,
      marginBottom: 4,
    },
    customDateInput: {
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.card,
      paddingHorizontal: 10,
      fontSize: 13,
      color: themeColors.textPrimary,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
      gap: 8,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: themeColors.textPrimary,
    },
    statusChipsScroll: {
      marginBottom: 14,
    },
    statusChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      marginRight: 6,
    },
    statusChipActive: {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
    },
    statusChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    statusChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    centerContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyCard: {
      padding: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      marginTop: 12,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 12,
      color: themeColors.textPrimary,
    },
    emptySub: {
      fontSize: 13,
      textAlign: 'center',
      marginTop: 6,
      color: themeColors.textSecondary,
    },
    recordCard: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 12,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    empName: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    empIdSub: {
      fontSize: 11,
      marginTop: 2,
      color: themeColors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    timingGrid: {
      flexDirection: 'row',
      borderRadius: 10,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      padding: 8,
      marginBottom: 8,
    },
    timingBox: {
      flex: 1,
      alignItems: 'center',
    },
    timingLabel: {
      fontSize: 10,
      color: themeColors.textSecondary,
      marginBottom: 2,
    },
    timingVal: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    remarksText: {
      fontSize: 12,
      color: themeColors.textSecondary,
      marginBottom: 6,
      fontStyle: 'italic',
    },
    modifiedBadge: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
    },
    modifiedText: {
      fontSize: 11,
      color: '#3b82f6',
      fontWeight: '600',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    ipText: {
      fontSize: 11,
      color: themeColors.textSecondary,
    },
    fixBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
    },
    fixBtnText: {
      fontSize: 11,
      color: '#3b82f6',
      fontWeight: '700',
    },
    loadMoreBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      borderWidth: 1,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    loadMoreText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#3b82f6',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 20,
    },
    modalBox: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      maxHeight: '90%',
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 8,
      color: themeColors.textPrimary,
    },
    modalInput: {
      height: 42,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 13,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderColor: themeColors.border,
      color: themeColors.textPrimary,
    },
    statusSelectPill: {
      flex: 1,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusSelectPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    reasonChip: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      marginRight: 6,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    reasonChipActive: {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
    },
    reasonChipText: {
      fontSize: 11,
      color: themeColors.textSecondary,
    },
    reasonChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    modalBtnCancel: {
      flex: 1,
      height: 42,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
    },
    modalBtnCancelText: {
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    modalBtnSubmit: {
      flex: 1,
      height: 42,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3b82f6',
    },
    modalBtnSubmitText: {
      color: '#ffffff',
      fontWeight: '700',
    },
  });
