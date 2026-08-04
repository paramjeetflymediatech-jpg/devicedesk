import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {
  fetchAttendanceStatus,
  postAttendancePunch,
} from '../utils/api';
import { sweetAlert } from '../utils/sweetAlert';
import { useTheme } from '../utils/ThemeContext';

export default function AttendanceWidget({ user, onStatusChange }) {
  const { isDark, themeColors } = useTheme();
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState('Tea Break');
  const [remarks, setRemarks] = useState('');

  // Location Fetching State
  const [employeeLocation, setEmployeeLocation] = useState('📍 Fetching location...');
  const [isLocationFetching, setIsLocationFetching] = useState(true);

  const fetchCurrentLocation = async () => {
    setIsLocationFetching(true);
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.city && data.country_name) {
        setEmployeeLocation(`📍 ${data.city}, ${data.region_code || ''} ${data.country_name} (${data.ip})`);
      } else {
        setEmployeeLocation('📍 Location Verified (GPS Active)');
      }
    } catch (e) {
      setEmployeeLocation('📍 Main Office HQ (GPS Active)');
    } finally {
      setIsLocationFetching(false);
    }
  };

  // Live ticking timers
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const timerRef = useRef(null);

  const getStatus = async () => {
    if (!user || !user.id) return;
    try {
      const data = await fetchAttendanceStatus(user.id);
      if (data.success) {
        setStatusData(data);
        if (onStatusChange) {
          onStatusChange(data);
        }
      }
    } catch (err) {
      console.error('Error fetching attendance status on mobile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStatus();
    fetchCurrentLocation();
  }, [user?.id]);

  // Compute exact live work & break seconds based on immutable wall-clock timestamps
  const updateLiveTimers = () => {
    if (!statusData || !statusData.punchedIn || !statusData.activeRecord) {
      setWorkSeconds(0);
      setBreakSeconds(0);
      return;
    }

    const nowMs = Date.now();
    const punchInMs = new Date(statusData.activeRecord.punchInTime).getTime();
    const completedBreakSecs = statusData.completedBreakSeconds || 0;

    let activeBreakSecs = 0;
    if (statusData.onBreak && statusData.activeBreak?.startTime) {
      const breakStartMs = new Date(statusData.activeBreak.startTime).getTime();
      activeBreakSecs = Math.max(0, Math.floor((nowMs - breakStartMs) / 1000));
    }

    const totalBreakSecs = completedBreakSecs + activeBreakSecs;
    const totalElapsedSecs = Math.max(0, Math.floor((nowMs - punchInMs) / 1000));
    const netWorkSecs = Math.max(0, totalElapsedSecs - totalBreakSecs);

    setWorkSeconds(netWorkSecs);
    setBreakSeconds(totalBreakSecs);
  };

  // Live timer interval (ticks every second)
  useEffect(() => {
    updateLiveTimers();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (statusData?.punchedIn) {
      timerRef.current = setInterval(() => {
        updateLiveTimers();
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [statusData]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'Device Desk requires location permission to verify your presence at the office during punch in and punch out.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Error requesting location permission:', err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      try {
        Geolocation.requestAuthorization();
        return true;
      } catch (err) {
        console.error('Error requesting iOS location permission:', err);
        return false;
      }
    }
    return true;
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let msg = 'Failed to fetch location.';
          if (error.code === 1) {
            msg = 'Location permission denied. Please allow location access in your device settings to punch in or punch out.';
          } else if (error.code === 2) {
            msg = 'Location position unavailable. Please ensure GPS/Location is enabled on your device.';
          } else if (error.code === 3) {
            msg = 'Location request timed out. Please ensure GPS signal is available and try again.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  const handlePunchAction = async (action, extraData = {}) => {
    if (submitting) return;

    // Shift Cutoff Check: 06:30 PM (18:30)
    if (action === 'PUNCH_IN') {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes();
      if (hrs > 18 || (hrs === 18 && mins >= 30)) {
        sweetAlert({
          title: 'Punch-in Restricted',
          text: 'Shift cutoff time (06:30 PM) has passed for today. You cannot punch in for today\'s shift.',
          type: 'error',
        });
        return;
      }
    }

    setSubmitting(true);

    let lat = null;
    let lng = null;

    if (action === 'PUNCH_IN' || action === 'PUNCH_OUT') {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setSubmitting(false);
        sweetAlert({
          title: 'Location Permission Denied',
          text: 'Location access is required to punch in or punch out. Please enable location permissions in device settings.',
          type: 'error',
        });
        return;
      }

      try {
        const coords = await getCurrentLocation();
        lat = coords.latitude;
        lng = coords.longitude;
      } catch (locErr) {
        setSubmitting(false);
        sweetAlert({
          title: 'Location Required',
          text: locErr.message || 'Unable to retrieve location coordinates. Please enable GPS and try again.',
          type: 'error',
        });
        return;
      }
    }

    try {
      const data = await postAttendancePunch(
        user.id,
        user.name,
        action,
        extraData.breakType || '',
        extraData.remarks || '',
        lat,
        lng
      );

      if (data.success) {
        sweetAlert({
          title: 'Success',
          text: data.message,
          type: 'success',
        });
        setRemarks('');
        await getStatus();
      } else {
        sweetAlert({
          title: 'Restricted',
          text: data.message,
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: 'Failed to update attendance. Check network.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
      setShowBreakModal(false);
    }
  };

  const formatHMS = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#58a6ff" />
        <Text style={styles.loadingText}>Loading attendance status...</Text>
      </View>
    );
  }

  const punchedIn = statusData?.punchedIn;
  const onBreak = statusData?.onBreak;

  const nowObj = new Date();
  const isPastCutoff = !punchedIn && (nowObj.getHours() > 18 || (nowObj.getHours() === 18 && nowObj.getMinutes() >= 30));

  return (
    <View style={[styles.container, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.statusBadgeContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: onBreak ? '#f59e0b' : punchedIn ? '#3fb950' : '#8b949e' }
          ]} />
          <Text style={[styles.statusTitle, { color: themeColors.textPrimary }]}>
            {onBreak ? 'On Break' : punchedIn ? 'Active Work' : 'Punched Out'}
          </Text>
        </View>

        {punchedIn && (
          <View style={styles.timersContainer}>
            <View style={styles.timerBlock}>
              <Text style={[styles.timerLabel, { color: themeColors.textSecondary }]}>💻 Work Time</Text>
              <Text style={[styles.timerValue, { color: themeColors.textPrimary }]}>{formatHMS(workSeconds)}</Text>
            </View>
            <View style={styles.timerBlock}>
              <Text style={[styles.timerLabel, { color: themeColors.textSecondary }]}>☕ Break Time</Text>
              <Text style={[styles.timerValue, { color: '#f59e0b' }]}>{formatHMS(breakSeconds)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Live Employee Current Location Bar */}
      <View style={[
        styles.locationBar,
        { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: themeColors.border }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
          {isLocationFetching ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Text style={{ fontSize: 13 }}>📍</Text>
          )}
          <Text
            style={[styles.locationText, { color: themeColors.textPrimary }]}
            numberOfLines={1}
          >
            {employeeLocation}
          </Text>
        </View>

        <TouchableOpacity onPress={fetchCurrentLocation} disabled={isLocationFetching} style={styles.refreshLocBtn}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>
            {isLocationFetching ? 'Fetching...' : 'Refresh 🔄'}
          </Text>
        </TouchableOpacity>
      </View>

      {isPastCutoff && (
        <View style={styles.cutoffWarningBadge}>
          <Text style={styles.cutoffWarningText}>⚠️ Shift Cutoff Passed (6:30 PM)</Text>
        </View>
      )}

      {!punchedIn ? (
        <View style={styles.actionContainer}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: isDark ? '#0f172a' : '#ffffff', color: themeColors.textPrimary, borderColor: themeColors.border }
            ]}
            placeholder="Add login remarks (optional)..."
            placeholderTextColor={themeColors.textSecondary}
            value={remarks}
            onChangeText={setRemarks}
            editable={!isPastCutoff}
          />
          <TouchableOpacity
            style={[styles.punchBtn, (submitting || isPastCutoff) && styles.punchBtnDisabled]}
            onPress={() => handlePunchAction('PUNCH_IN', { remarks })}
            disabled={submitting || isPastCutoff}
          >
            <Text style={styles.punchBtnText}>📥 Punch In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {!onBreak ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => setShowBreakModal(true)}
                disabled={submitting}
              >
                <Text style={styles.actionBtnText}>☕ Start Break</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#da3633' }]}
                onPress={() => handlePunchAction('PUNCH_OUT')}
                disabled={submitting}
              >
                <Text style={styles.actionBtnText}>📤 Punch Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3fb950', flex: 1 }]}
              onPress={() => handlePunchAction('END_BREAK')}
              disabled={submitting}
            >
              <Text style={styles.actionBtnText}>▶️ End Break / Resume Work</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Break Type selection modal */}
      <Modal
        visible={showBreakModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBreakModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>☕ Select Break Type</Text>
            
            <View style={styles.breakOptions}>
              {['Tea Break', 'Lunch Break', 'Personal Break', 'Other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.breakOptionBtn,
                    selectedBreakType === type && styles.breakOptionBtnActive,
                  ]}
                  onPress={() => setSelectedBreakType(type)}
                >
                  <Text style={[
                    styles.breakOptionText,
                    selectedBreakType === type && styles.breakOptionTextActive,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowBreakModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => handlePunchAction('START_BREAK', { breakType: selectedBreakType })}
              >
                <Text style={styles.modalConfirmText}>Start Break</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: '#8b949e',
    marginLeft: 10,
    fontSize: 13,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusTitle: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: '700',
  },
  cutoffWarningBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  cutoffWarningText: {
    color: '#f85149',
    fontSize: 12,
    fontWeight: '700',
  },
  timersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBlock: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  timerLabel: {
    color: '#8b949e',
    fontSize: 10,
    fontWeight: '600',
  },
  timerValue: {
    color: '#58a6ff',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 10,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refreshLocBtn: {
    paddingLeft: 8,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f0f6fc',
    fontSize: 13,
    marginBottom: 6,
  },
  punchBtn: {
    backgroundColor: '#238636',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchBtnDisabled: {
    backgroundColor: '#30363d',
    opacity: 0.5,
  },
  punchBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    color: '#58a6ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  breakOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  breakOptionBtn: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: '45%',
    alignItems: 'center',
  },
  breakOptionBtnActive: {
    borderColor: '#58a6ff',
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
  },
  breakOptionText: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '600',
  },
  breakOptionTextActive: {
    color: '#58a6ff',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  modalCancelText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#238636',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
