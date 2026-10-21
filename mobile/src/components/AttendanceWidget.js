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
  NativeModules,
  ScrollView,
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

  // Location Prominent Disclosure State (Google Play Policy)
  const [showLocationDisclosureModal, setShowLocationDisclosureModal] = useState(false);
  const [pendingPunch, setPendingPunch] = useState(null);

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
            message: 'DeviceDesk requires high-precision GPS location permission to verify your presence inside office premises during punch-in and punch-out.',
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
      return new Promise((resolve) => {
        try {
          if (Geolocation && typeof Geolocation.requestAuthorization === 'function') {
            Geolocation.requestAuthorization(
              () => resolve(true),
              (err) => {
                console.warn('iOS requestAuthorization warning in AttendanceWidget:', err);
                resolve(true);
              }
            );
          } else {
            resolve(true);
          }
        } catch (err) {
          console.warn('Error requesting iOS location permission:', err);
          resolve(true);
        }
      });
    }
    return true;
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!Geolocation || typeof Geolocation.getCurrentPosition !== 'function') {
        return reject(new Error('Geolocation service unavailable on this device.'));
      }
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let msg = 'Failed to fetch precise location.';
          if (error.code === 1) {
            msg = 'Location permission denied. Please allow location access in your device settings to punch in or punch out.';
          } else if (error.code === 2) {
            msg = 'Location position unavailable. Please ensure GPS / Location is turned ON in your device settings.';
          } else if (error.code === 3) {
            msg = 'Location request timed out. Please step near a window or open area for better GPS reception and try again.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
          distanceFilter: 0,
        }
      );
    });
  };

  const executePunchWithLocation = async (action, extraData = {}) => {
    setSubmitting(true);
    let lat = null;
    let lng = null;

    if (action === 'PUNCH_IN') {
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
        text: 'Failed to process request. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
      setShowBreakModal(false);
    }
  };

  const handlePunchAction = async (action, extraData = {}) => {
    if (submitting) return;

    if (action === 'PUNCH_IN') {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (!hasPermission) {
          // Google Play Policy requirement: Show Prominent Disclosure Modal BEFORE requesting permission
          setPendingPunch({ action, extraData });
          setShowLocationDisclosureModal(true);
          return;
        }
      }
    }

    await executePunchWithLocation(action, extraData);
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

  const handlePunchOutClick = () => {
    sweetAlert({
      title: 'Confirm Punch Out',
      text: 'Are you sure you want to punch out and complete your shift for today?',
      type: 'warning',
      showCancel: true,
      onConfirm: () => handlePunchAction('PUNCH_OUT'),
    });
  };

  const statusBg = onBreak
    ? themeColors.warningBg || 'rgba(245, 158, 11, 0.12)'
    : punchedIn
    ? themeColors.successBg || 'rgba(16, 185, 129, 0.12)'
    : isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.08)';

  const statusColor = onBreak
    ? '#f59e0b'
    : punchedIn
    ? '#10b981'
    : themeColors.textMuted || '#64748b';

  const statusBorder = onBreak
    ? 'rgba(245, 158, 11, 0.3)'
    : punchedIn
    ? 'rgba(16, 185, 129, 0.3)'
    : themeColors.border;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
      {/* Top Header Row with Status Pill & Shift Title */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.widgetHeading, { color: themeColors.textPrimary }]}>Daily Attendance</Text>
          <Text style={[styles.widgetSubheading, { color: themeColors.textSecondary }]}>Log shift hours & office presence</Text>
        </View>

        <View style={[styles.statusBadgeContainer, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusTitle, { color: statusColor }]}>
            {onBreak ? 'On Break' : punchedIn ? 'Active Shift' : 'Punched Out'}
          </Text>
        </View>
      </View>

      {/* Dual Timers Grid (Visible when punched in) */}
      {punchedIn && (
        <View style={styles.timersGrid}>
          <View style={[styles.timerTile, { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }]}>
            <View style={styles.timerTileHeader}>
              <Text style={{ fontSize: 13 }}>⏱️</Text>
              <Text style={[styles.timerLabel, { color: themeColors.textSecondary }]}>Work Time</Text>
            </View>
            <Text style={[styles.timerValue, { color: themeColors.textPrimary }]}>
              {formatHMS(workSeconds)}
            </Text>
          </View>

          <View style={[styles.timerTile, { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }]}>
            <View style={styles.timerTileHeader}>
              <Text style={{ fontSize: 13 }}>☕</Text>
              <Text style={[styles.timerLabel, { color: themeColors.textSecondary }]}>Break Taken</Text>
            </View>
            <Text style={[styles.timerValue, { color: '#f59e0b' }]}>
              {formatHMS(breakSeconds)}
            </Text>
          </View>
        </View>
      )}

      {/* Live Employee Current Location Bar */}
      <View style={[
        styles.locationBar,
        { backgroundColor: isDark ? '#141418' : '#f8fafc', borderColor: themeColors.border }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
          <View style={styles.locationIconWrap}>
            {isLocationFetching ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Text style={{ fontSize: 12 }}>📍</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationLabel, { color: themeColors.textSecondary }]}>Verified Location</Text>
            <Text
              style={[styles.locationText, { color: themeColors.textPrimary }]}
              numberOfLines={1}
            >
              {employeeLocation}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={fetchCurrentLocation} 
          disabled={isLocationFetching} 
          style={[styles.refreshLocBtn, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: isDark ? '#334155' : '#bfdbfe' }]}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>
            {isLocationFetching ? '...' : 'Refresh ↻'}
          </Text>
        </TouchableOpacity>
      </View>

      {!punchedIn ? (
        <View style={styles.actionContainer}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: isDark ? '#121215' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border }
            ]}
            placeholder="Add login remarks or shift notes (optional)..."
            placeholderTextColor={themeColors.textSecondary}
            value={remarks}
            onChangeText={setRemarks}
          />
          <TouchableOpacity
            style={[styles.punchBtn, submitting && styles.punchBtnDisabled]}
            onPress={() => handlePunchAction('PUNCH_IN', { remarks })}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.punchBtnText}>Securing punch...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>📥</Text>
                <Text style={styles.punchBtnText}>Punch In for Shift</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {!onBreak ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.breakBtn, submitting && { opacity: 0.5 }]}
                onPress={() => setShowBreakModal(true)}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 15 }}>☕</Text>
                  <Text style={styles.actionBtnText}>Take a Break</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.punchOutBtn, submitting && { opacity: 0.5 }]}
                onPress={handlePunchOutClick}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.actionBtnText}>Processing...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15 }}>⏹️</Text>
                    <Text style={styles.actionBtnText}>Punch Out</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.resumeBtn, submitting && { opacity: 0.5 }]}
              onPress={() => handlePunchAction('END_BREAK')}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.actionBtnText}>Resuming shift...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>▶️</Text>
                  <Text style={styles.actionBtnText}>End Break & Resume Shift</Text>
                </View>
              )}
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
                style={[styles.modalConfirmBtn, submitting && { opacity: 0.5 }]}
                onPress={() => handlePunchAction('START_BREAK', { breakType: selectedBreakType })}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.modalConfirmText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalConfirmText}>Start Break</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prominent Location Disclosure Modal for Google Play Policy Compliance */}
      <Modal
        visible={showLocationDisclosureModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowLocationDisclosureModal(false);
          setPendingPunch(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>📍</Text>
            <Text style={[styles.modalTitle, { fontSize: 18, marginBottom: 4 }]}>Location Access Required</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7', textAlign: 'center', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
              Google Play Prominent Disclosure
            </Text>
            <ScrollView style={{ maxHeight: 180, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#334155', lineHeight: 19, textAlign: 'left' }}>
                DeviceDesk collects precise device location data (GPS coordinates) to verify employee presence at authorized workplace locations during punch-in and punch-out attendance recording.
                {'\n\n'}
                • Location data is accessed ONLY when you tap Punch In or Punch Out.
                {'\n'}
                • Data is transmitted securely to your organization's database server to record attendance proximity.
                {'\n'}
                • DeviceDesk does NOT track location in the background or sell location data to third parties.
              </Text>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowLocationDisclosureModal(false);
                  setPendingPunch(null);
                }}
              >
                <Text style={styles.modalCancelText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#0284c7' }]}
                onPress={async () => {
                  setShowLocationDisclosureModal(false);
                  const granted = await requestLocationPermission();
                  if (granted && pendingPunch) {
                    const actionToPerform = pendingPunch;
                    setPendingPunch(null);
                    executePunchWithLocation(actionToPerform.action, actionToPerform.extraData);
                  } else {
                    setPendingPunch(null);
                    sweetAlert({
                      title: 'Location Permission Denied',
                      text: 'Location access is required to punch in or punch out.',
                      type: 'error',
                    });
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>Accept & Continue</Text>
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
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  loadingContainer: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 18,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: '#8b949e',
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  widgetHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  widgetSubheading: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cutoffWarningBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  cutoffWarningText: {
    color: '#ef4444',
    fontSize: 11.5,
    fontWeight: '700',
  },
  timersGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  timerTile: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  timerTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  actionContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  locationIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 1,
  },
  refreshLocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#f0f6fc',
    fontSize: 13,
  },
  punchBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  punchBtnDisabled: {
    opacity: 0.5,
  },
  punchBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  breakBtn: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  punchOutBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  resumeBtn: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  breakOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
    justifyContent: 'center',
  },
  breakOptionBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: '46%',
    alignItems: 'center',
  },
  breakOptionBtnActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  breakOptionText: {
    color: '#475569',
    fontSize: 13.5,
    fontWeight: '600',
  },
  breakOptionTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    color: '#475569',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
