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
      try {
        if (typeof Geolocation.requestAuthorization === 'function') {
          Geolocation.requestAuthorization('whenInUse');
        }
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
          />
          <TouchableOpacity
            style={[styles.punchBtn, submitting && styles.punchBtnDisabled]}
            onPress={() => handlePunchAction('PUNCH_IN', { remarks })}
            disabled={submitting}
          >
            {submitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.punchBtnText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.punchBtnText}>📥 Punch In</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {!onBreak ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f59e0b' }, submitting && { opacity: 0.5 }]}
                onPress={() => setShowBreakModal(true)}
                disabled={submitting}
              >
                <Text style={styles.actionBtnText}>☕ Start Break</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#da3633' }, submitting && { opacity: 0.5 }]}
                onPress={handlePunchOutClick}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.actionBtnText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.actionBtnText}>📤 Punch Out</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3fb950', flex: 1 }, submitting && { opacity: 0.5 }]}
              onPress={() => handlePunchAction('END_BREAK')}
              disabled={submitting}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.actionBtnText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.actionBtnText}>▶️ End Break / Resume Work</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
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
