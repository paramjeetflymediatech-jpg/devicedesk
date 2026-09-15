import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';
import { fetchMarketingAttendance, checkInMarketingTrip, checkOutMarketingTrip, postMarketingLocationLog } from '../../utils/api';
import AppIcon from '../../components/AppIcon';

export default function MarketingFieldScreen({ user, onBack }) {
  const { themeColors, isDark } = useTheme();
  const employeeId = user?.id || '';

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  const [attendanceList, setAttendanceList] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'DeviceDesk requires location access to log your field visit GPS coordinates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Android location permission error:', err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      try {
        if (typeof Geolocation.requestAuthorization === 'function') {
          Geolocation.requestAuthorization('whenInUse');
        }
        return true;
      } catch (err) {
        console.warn('iOS location permission error:', err);
        return false;
      }
    }
    return true;
  };

  const getCurrentLocation = () => {
    return new Promise(async (resolve, reject) => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return reject(new Error('Location permission is required to record field trips.'));
      }

      if (!Geolocation || typeof Geolocation.getCurrentPosition !== 'function') {
        return reject(new Error('Geolocation service is unavailable on this device.'));
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
          let msg = 'Failed to fetch GPS location.';
          if (error.code === 1) {
            msg = 'Location permission denied. Please enable location permissions in device settings.';
          } else if (error.code === 2) {
            msg = 'Location unavailable. Please make sure GPS is turned on.';
          } else if (error.code === 3) {
            msg = 'Location request timed out. Please try again.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: Platform.OS === 'android', timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  const loadData = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const res = await fetchMarketingAttendance(employeeId);
      if (res && res.success && Array.isArray(res.data)) {
        setAttendanceList(res.data);
        const currentActive = res.data.find((a) => a.status === 'Checked In');
        setActiveTrip(currentActive || null);
      }
    } catch (err) {
      console.error('Failed to load marketing attendance:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto GPS coordinate logging while a field trip is in progress
  useEffect(() => {
    if (!activeTrip || !employeeId) return;

    let isMounted = true;
    const sendLocationPing = async () => {
      try {
        const coords = await getCurrentLocation();
        if (coords && coords.latitude && coords.longitude && isMounted) {
          await postMarketingLocationLog({
            employee_id: employeeId,
            attendance_id: activeTrip.id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          });
        }
      } catch (e) {
        // Location ping failed silently in background
      }
    };

    // First ping immediately, then repeat every 30 seconds
    sendLocationPing();
    const intervalId = setInterval(sendLocationPing, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeTrip?.id, employeeId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCheckIn = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      sweetAlert({
        title: 'Missing Details',
        text: 'Please specify both "Where From" (Start point) and "Where To" (Destination).',
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const coords = await getCurrentLocation();
      const res = await checkInMarketingTrip({
        employee_id: employeeId,
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        notes: visitNotes.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Trip Started!',
          text: `Checked in from ${fromLocation} to ${toLocation} with live GPS.`,
          type: 'success',
        });
        setFromLocation('');
        setToLocation('');
        setVisitNotes('');
        loadData();
      } else {
        sweetAlert({
          title: 'Check-In Failed',
          text: res?.error || 'Unable to start field trip. Please try again.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'GPS Error',
        text: err.message || 'Could not obtain GPS location.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeTrip) {
      sweetAlert({
        title: 'No Active Trip',
        text: 'You do not have an active field visit to complete.',
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const coords = await getCurrentLocation();
      const res = await checkOutMarketingTrip({
        employee_id: employeeId,
        attendance_id: activeTrip.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Trip Completed!',
          text: 'Field visit check-out recorded successfully.',
          type: 'success',
        });
        setActiveTrip(null);
        loadData();
      } else {
        sweetAlert({
          title: 'Check-Out Failed',
          text: res?.error || 'Unable to complete trip.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'GPS Error',
        text: err.message || 'Could not obtain GPS location.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openMapPin = (lat, lng) => {
    if (!lat || !lng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
      default: `https://maps.google.com/?q=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <AppIcon name="arrow-left" size={20} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Marketing Field Trips</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            GPS Attendance & Route Logger
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <AppIcon name="refresh-cw" size={18} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />}
      >
        {/* Active Trip Banner */}
        {activeTrip ? (
          <View style={[styles.activeBanner, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5', borderColor: '#10b981' }]}>
            <View style={styles.activeHeaderRow}>
              <View style={styles.pulseIndicator}>
                <View style={styles.pulseDot} />
              </View>
              <Text style={[styles.activeBannerTitle, { color: isDark ? '#a7f3d0' : '#065f46' }]}>
                Trip Currently In Progress
              </Text>
            </View>
            <Text style={[styles.activeRoute, { color: isDark ? '#ffffff' : '#0f172a' }]}>
              {activeTrip.from_location || 'Start'} ➔ {activeTrip.to_location || 'Destination'}
            </Text>
            {activeTrip.notes ? (
              <Text style={[styles.activeNotes, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                Purpose: {activeTrip.notes}
              </Text>
            ) : null}
            <Text style={[styles.activeTime, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Started at: {activeTrip.check_in_at ? new Date(activeTrip.check_in_at).toLocaleTimeString() : 'Recently'}
            </Text>

            <TouchableOpacity
              style={[styles.checkOutBtn, submitting && styles.btnDisabled]}
              onPress={handleCheckOut}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <AppIcon name="check-circle" size={18} color="#ffffff" />
                  <Text style={styles.checkOutBtnText}>Check Out (Complete Trip)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Start New Trip Form */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
              <AppIcon name="map-pin" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.cardTitleBox}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Log Field Visit</Text>
              <Text style={[styles.cardSubtitle, { color: themeColors.textSecondary }]}>
                Record route & live GPS check-in
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
              WHERE FROM (START LOCATION) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="e.g. Office / Home / Sector 18"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={fromLocation}
              onChangeText={setFromLocation}
              editable={!submitting && !activeTrip}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
              WHERE TO (DESTINATION) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="e.g. Client Office Sector 62 / Market Meet"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={toLocation}
              onChangeText={setToLocation}
              editable={!submitting && !activeTrip}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>PURPOSE / MEETING NOTES</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="e.g. Client presentation, discussion on quotation"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={visitNotes}
              onChangeText={setVisitNotes}
              editable={!submitting && !activeTrip}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.checkInBtn,
              { backgroundColor: themeColors.primary },
              (submitting || !!activeTrip) && styles.btnDisabled,
            ]}
            onPress={handleCheckIn}
            disabled={submitting || !!activeTrip}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <AppIcon name="navigation" size={18} color="#ffffff" />
                <Text style={styles.checkInBtnText}>
                  {activeTrip ? 'Active Trip in Progress' : 'Check In (Start Trip)'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Trip History Section */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Field Trips</Text>

          {loading && !refreshing ? (
            <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 20 }} />
          ) : attendanceList.length === 0 ? (
            <View style={styles.emptyBox}>
              <AppIcon name="calendar" size={32} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No field visits logged yet.</Text>
            </View>
          ) : (
            attendanceList.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.historyItem,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <View style={styles.historyTopRow}>
                  <View style={styles.historyRouteBox}>
                    <Text style={[styles.historyRouteFrom, { color: themeColors.text }]}>
                      {item.from_location || '-'}
                    </Text>
                    <Text style={[styles.historyRouteArrow, { color: themeColors.primary }]}>➔</Text>
                    <Text style={[styles.historyRouteTo, { color: themeColors.primary }]}>
                      {item.to_location || '-'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'Checked In'
                            ? isDark
                              ? '#064e3b'
                              : '#dcfce7'
                            : isDark
                            ? '#334155'
                            : '#f1f5f9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color: item.status === 'Checked In' ? '#10b981' : themeColors.textSecondary,
                        },
                      ]}
                    >
                      {item.status || 'Checked Out'}
                    </Text>
                  </View>
                </View>

                {item.notes ? (
                  <Text style={[styles.historyNotes, { color: themeColors.textSecondary }]}>
                    Note: {item.notes}
                  </Text>
                ) : null}

                <View style={styles.historyMetaRow}>
                  <Text style={[styles.historyTime, { color: themeColors.textSecondary }]}>
                    {item.check_in_at ? new Date(item.check_in_at).toLocaleDateString() + ' ' + new Date(item.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </Text>

                  {item.check_in_latitude && item.check_in_longitude ? (
                    <TouchableOpacity
                      style={styles.gpsLink}
                      onPress={() => openMapPin(item.check_in_latitude, item.check_in_longitude)}
                    >
                      <AppIcon name="map-pin" size={12} color="#06b6d4" />
                      <Text style={styles.gpsLinkText}>View GPS Map</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeRoute: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  activeNotes: {
    fontSize: 13,
    marginBottom: 4,
  },
  activeTime: {
    fontSize: 12,
    marginBottom: 12,
  },
  checkOutBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  checkOutBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  required: {
    color: '#ef4444',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  checkInBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  historyRouteBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginRight: 8,
  },
  historyRouteFrom: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyRouteArrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyRouteTo: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyNotes: {
    fontSize: 12,
    marginBottom: 6,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTime: {
    fontSize: 11,
  },
  gpsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsLinkText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
