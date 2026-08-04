import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export default function CalendarPickerModal({
  visible,
  title = 'Select Date Range',
  fromDate = '',
  toDate = '',
  onSelectRange,
  onClose,
}) {
  const { isDark, themeColors } = useTheme();

  const [rangeStart, setRangeStart] = useState(fromDate);
  const [rangeEnd, setRangeEnd] = useState(toDate);

  const initialYearMonth = () => {
    const target = fromDate || toDate;
    if (target && target.includes('-')) {
      const parts = target.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  };

  const [currentYearMonth, setCurrentYearMonth] = useState(initialYearMonth);

  useEffect(() => {
    if (visible) {
      setRangeStart(fromDate);
      setRangeEnd(toDate);
      setCurrentYearMonth(initialYearMonth());
    }
  }, [visible, fromDate, toDate]);

  const { year, month } = currentYearMonth;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    if (month === 0) {
      setCurrentYearMonth({ year: year - 1, month: 11 });
    } else {
      setCurrentYearMonth({ year, month: month - 1 });
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setCurrentYearMonth({ year: year + 1, month: 0 });
    } else {
      setCurrentYearMonth({ year, month: month + 1 });
    }
  };

  const handleDayPress = (dateStr) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd('');
    } else if (rangeStart && !rangeEnd) {
      if (dateStr >= rangeStart) {
        setRangeEnd(dateStr);
      } else {
        setRangeStart(dateStr);
        setRangeEnd('');
      }
    }
  };

  // Generate calendar grid
  const getDaysGrid = () => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateString = `${year}-${monthStr}-${dayStr}`;
      days.push({ day, dateString });
    }

    return days;
  };

  const daysGrid = getDaysGrid();
  const todayStr = new Date().toISOString().split('T')[0];

  const handleApply = () => {
    const start = rangeStart;
    const end = rangeEnd || rangeStart;
    onSelectRange(start, end);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.modalContent,
            { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>📅 {title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Range Selection Status Banner */}
          <View style={[styles.rangeBanner, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: themeColors.border }]}>
            <Text style={[styles.rangeText, { color: themeColors.textPrimary }]}>
              {rangeStart ? rangeStart : 'From Date'} ➔ {rangeEnd ? rangeEnd : (rangeStart ? 'To Date' : 'To Date')}
            </Text>
          </View>

          {/* Month & Year Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { borderColor: themeColors.border }]}>
              <Text style={{ color: themeColors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>◀</Text>
            </TouchableOpacity>
            <Text style={[styles.monthYearText, { color: themeColors.textPrimary }]}>
              {monthNames[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { borderColor: themeColors.border }]}>
              <Text style={{ color: themeColors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Day Names Header */}
          <View style={styles.weekDaysRow}>
            {dayNames.map(d => (
              <Text key={d} style={[styles.weekDayText, { color: themeColors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Calendar Days Grid */}
          <View style={styles.daysGridContainer}>
            {daysGrid.map((item, index) => {
              if (!item) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const isStart = item.dateString === rangeStart;
              const isEnd = item.dateString === rangeEnd;
              const isInRange = rangeStart && rangeEnd && item.dateString > rangeStart && item.dateString < rangeEnd;
              const isToday = item.dateString === todayStr;

              return (
                <TouchableOpacity
                  key={item.dateString}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isInRange && [styles.inRangeCell, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }],
                    (isStart || isEnd) && styles.selectedCell,
                  ]}
                  onPress={() => handleDayPress(item.dateString)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: themeColors.textPrimary },
                      isInRange && { color: isDark ? '#93c5fd' : '#1e40af', fontWeight: '700' },
                      isToday && { color: '#2563eb', fontWeight: 'bold' },
                      (isStart || isEnd) && { color: '#ffffff', fontWeight: 'bold' },
                    ]}
                  >
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
              onPress={() => {
                setRangeStart('');
                setRangeEnd('');
                onSelectRange('', '');
                onClose();
              }}
            >
              <Text style={[styles.quickBtnText, { color: themeColors.textPrimary }]}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#2563eb', flex: 2 }]}
              onPress={handleApply}
            >
              <Text style={styles.quickBtnText}>Apply Selection ➔</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    width: '92%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rangeBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 8,
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '800',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 10,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  inRangeCell: {
    borderRadius: 4,
  },
  selectedCell: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  dayText: {
    fontSize: 13.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
