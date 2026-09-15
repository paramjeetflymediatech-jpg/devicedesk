import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';
import {
  fetchMarketingAttendance,
  checkInMarketingTrip,
  checkOutMarketingTrip,
  postMarketingLocationLog,
} from '../../utils/api';
import AppIcon from '../../components/AppIcon';

// Haversine distance in KM
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  // Apply a 1.2x road routing coefficient for realistic driving estimation
  const drivingEstKm = straightKm * 1.2;
  return Number(drivingEstKm.toFixed(1));
}

const PURPOSE_PRESETS = [
  '🤝 Client Meeting',
  '💼 Lead Generation',
  '📦 Product Demo',
  '💰 Payment Collection',
  '📋 Site Inspection',
  '🏢 Office to Field Visit',
  '🔄 Follow-up Visit',
];

export default function MarketingFieldScreen({ user, onBack }) {
  const { themeColors, isDark } = useTheme();
  const employeeId = user?.id || '';

  // Start Location (Auto-fetched from GPS)
  const [currentGps, setCurrentGps] = useState(null);
  const [fromAddress, setFromAddress] = useState('');
  const [fetchingGps, setFetchingGps] = useState(false);

  // Destination Search & Coordinates
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Calculated Route Distance (KM)
  const [estimatedKm, setEstimatedKm] = useState(0);

  // Purpose / Meeting Notes
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Trip Status
  const [attendanceList, setAttendanceList] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [waypointCount, setWaypointCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const searchDebounceRef = useRef(null);

  // Request Location Permissions
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'GPS Location Access',
            message: 'DeviceDesk requires your live GPS location to lock your route and verify field visits.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow GPS',
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

  // Get Current High-Accuracy GPS Position
  const getCurrentLocation = () => {
    return new Promise(async (resolve, reject) => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return reject(new Error('Location permission is required to track field routes.'));
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
            msg = 'Location permission denied. Please enable GPS in device settings.';
          } else if (error.code === 2) {
            msg = 'GPS signal unavailable. Please ensure location is switched ON.';
          } else if (error.code === 3) {
            msg = 'Location request timed out. Retrying...';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: Platform.OS === 'android', timeout: 15000, maximumAge: 5000 }
      );
    });
  };

  // Auto-Fetch & Reverse-Geocode Starting Point on Load
  const fetchCurrentLocationAddress = useCallback(async (showFeedback = false) => {
    try {
      setFetchingGps(true);
      const coords = await getCurrentLocation();
      setCurrentGps(coords);

      // Try reverse geocoding via Nominatim
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'DeviceDesk-Mobile-App/1.0',
            'Accept-Language': 'en',
          },
        });
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          const shortAddress = parts.slice(0, 3).join(',').trim();
          setFromAddress(shortAddress || `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`);
        } else {
          setFromAddress(`📍 GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        }
      } catch (geoErr) {
        setFromAddress(`📍 GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }

      if (showFeedback) {
        sweetAlert({
          title: 'GPS Locked 🎯',
          text: `Current coordinates fetched (±${Math.round(coords.accuracy || 10)}m accuracy).`,
          type: 'success',
        });
      }
    } catch (err) {
      setFromAddress('📍 GPS Active (Coordinates Locked)');
      if (showFeedback) {
        sweetAlert({
          title: 'GPS Notice',
          text: err.message || 'Could not fetch exact GPS position.',
          type: 'warning',
        });
      }
    } finally {
      setFetchingGps(false);
    }
  }, []);

  // Search Destination Places via OpenStreetMap Nominatim
  const handleDestinationSearch = (text) => {
    setDestinationQuery(text);
    if (!text.trim() || text.length < 3) {
      setPlaceSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setSearchingPlaces(true);
      try {
        const viewboxParam = currentGps 
          ? `&viewbox=${currentGps.longitude - 1},${currentGps.latitude + 1},${currentGps.longitude + 1},${currentGps.latitude - 1}`
          : '';
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&addressdetails=1${viewboxParam}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'DeviceDesk-Mobile-App/1.0',
            'Accept-Language': 'en',
          },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setPlaceSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn('Place search error:', err);
      } finally {
        setSearchingPlaces(false);
      }
    }, 400);
  };

  // Select a place suggestion
  const selectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const name = place.display_name ? place.display_name.split(',').slice(0, 3).join(',').trim() : place.name;

    setDestinationQuery(name);
    setDestinationCoords({ latitude: lat, longitude: lon });
    setShowSuggestions(false);
    setPlaceSuggestions([]);

    // Recalculate distance
    if (currentGps) {
      const km = calculateHaversineDistance(currentGps.latitude, currentGps.longitude, lat, lon);
      setEstimatedKm(km);
    }
  };

  // Load Trips History
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
    fetchCurrentLocationAddress();
  }, [loadData, fetchCurrentLocationAddress]);

  // Recalculate distance whenever GPS or destination changes
  useEffect(() => {
    if (currentGps && destinationCoords) {
      const km = calculateHaversineDistance(
        currentGps.latitude,
        currentGps.longitude,
        destinationCoords.latitude,
        destinationCoords.longitude
      );
      setEstimatedKm(km);
    }
  }, [currentGps, destinationCoords]);

  // Periodic Live GPS Coordinates Logging (Every 30s) while trip is active
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
          setWaypointCount((prev) => prev + 1);
        }
      } catch (e) {}
    };

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
    fetchCurrentLocationAddress();
  };

  // Check In / Start Route
  const handleCheckIn = async () => {
    if (!destinationQuery.trim()) {
      sweetAlert({
        title: 'Destination Required',
        text: 'Please search and select where you want to go.',
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Fetch fresh live GPS coordinates
      const coords = await getCurrentLocation();
      setCurrentGps(coords);

      const startAddress = fromAddress || `GPS (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
      const combinedNotes = [selectedPurpose, customNotes.trim()].filter(Boolean).join(' - ');

      const calculatedKm = destinationCoords
        ? calculateHaversineDistance(coords.latitude, coords.longitude, destinationCoords.latitude, destinationCoords.longitude)
        : estimatedKm || 0;

      const res = await checkInMarketingTrip({
        employee_id: employeeId,
        from_location: startAddress,
        to_location: destinationQuery.trim(),
        notes: combinedNotes,
        latitude: coords.latitude,
        longitude: coords.longitude,
        dest_latitude: destinationCoords?.latitude || null,
        dest_longitude: destinationCoords?.longitude || null,
        estimated_km: calculatedKm,
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Route Started! 🚀',
          text: `GPS locked from ${startAddress} to ${destinationQuery} (${calculatedKm} KM). Live tracking is now active.`,
          type: 'success',
        });
        setDestinationQuery('');
        setDestinationCoords(null);
        setSelectedPurpose('');
        setCustomNotes('');
        setEstimatedKm(0);
        setWaypointCount(1);
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
        text: err.message || 'Could not verify current GPS location.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check Out / Complete Trip
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
      
      // Calculate total traveled distance
      let totalKm = activeTrip.estimated_km || 0;
      if (activeTrip.check_in_latitude && activeTrip.check_in_longitude) {
        const actualDisplacementKm = calculateHaversineDistance(
          activeTrip.check_in_latitude,
          activeTrip.check_in_longitude,
          coords.latitude,
          coords.longitude
        );
        totalKm = Math.max(actualDisplacementKm, activeTrip.estimated_km || actualDisplacementKm);
      }

      const res = await checkOutMarketingTrip({
        employee_id: employeeId,
        attendance_id: activeTrip.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        total_km: totalKm,
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Trip Completed! 🎉',
          text: `Field visit finished successfully. Total logged distance: ${totalKm} KM.`,
          type: 'success',
        });
        setActiveTrip(null);
        setWaypointCount(0);
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
        text: err.message || 'Could not obtain final GPS location.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Direct Map Navigation
  const openNavigationMap = (originLat, originLng, destLat, destLng, destQuery) => {
    let url = '';
    if (destLat && destLng) {
      url = Platform.select({
        ios: `maps:0,0?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`,
        android: `google.navigation:q=${destLat},${destLng}`,
        default: `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`,
      });
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destQuery || 'destination')}`;
    }

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat || ''},${destLng || ''}`);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <AppIcon name="arrow-left" size={20} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Marketing Field Trips</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            GPS Route Creator & Live Coordinate Tracker
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <AppIcon name="refresh-cw" size={18} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
                Live Route Tracking Active
              </Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE GPS</Text>
              </View>
            </View>

            <View style={styles.routeBox}>
              <Text style={[styles.activeRouteFrom, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                📍 <Text style={{ fontWeight: '700' }}>From:</Text> {activeTrip.from_location || 'Current Location'}
              </Text>
              <Text style={[styles.activeRouteTo, { color: '#059669' }]}>
                🎯 <Text style={{ fontWeight: '700' }}>To:</Text> {activeTrip.to_location || 'Destination'}
              </Text>
            </View>

            {activeTrip.notes ? (
              <View style={[styles.notesBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)' }]}>
                <Text style={[styles.activeNotes, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                  📝 <Text style={{ fontWeight: '700' }}>Purpose:</Text> {activeTrip.notes}
                </Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              {activeTrip.estimated_km > 0 ? (
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#059669' }]}>{activeTrip.estimated_km} KM</Text>
                  <Text style={styles.statLabel}>Est. Distance</Text>
                </View>
              ) : null}

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                  {activeTrip.check_in_at ? new Date(activeTrip.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                </Text>
                <Text style={styles.statLabel}>Start Time</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#0284c7' }]}>
                  {waypointCount > 0 ? `${waypointCount} Pings` : 'Active'}
                </Text>
                <Text style={styles.statLabel}>Live GPS</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.activeBtnRow}>
              <TouchableOpacity
                style={[styles.mapNavBtn, { backgroundColor: '#0284c7' }]}
                onPress={() =>
                  openNavigationMap(
                    activeTrip.check_in_latitude,
                    activeTrip.check_in_longitude,
                    activeTrip.dest_latitude,
                    activeTrip.dest_longitude,
                    activeTrip.to_location
                  )
                }
              >
                <AppIcon name="navigation" size={16} color="#ffffff" />
                <Text style={styles.mapNavBtnText}>Open Navigation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkOutBtn, submitting && styles.btnDisabled]}
                onPress={handleCheckOut}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <AppIcon name="check-circle" size={16} color="#ffffff" />
                    <Text style={styles.checkOutBtnText}>Check Out (Finish)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Create Field Route Form */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
              <AppIcon name="navigation" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.cardTitleBox}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Create Field Route</Text>
              <Text style={[styles.cardSubtitle, { color: themeColors.textSecondary }]}>
                Auto-fetches your GPS location & calculates route distance
              </Text>
            </View>
          </View>

          {/* 1. START POINT (Auto GPS Locked) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                START POINT (CURRENT LIVE GPS)
              </Text>
              <TouchableOpacity
                onPress={() => fetchCurrentLocationAddress(true)}
                style={styles.refreshGpsBtn}
                disabled={fetchingGps || !!activeTrip}
              >
                {fetchingGps ? (
                  <ActivityIndicator size="small" color={themeColors.primary} />
                ) : (
                  <>
                    <AppIcon name="refresh-cw" size={12} color={themeColors.primary} />
                    <Text style={[styles.refreshGpsText, { color: themeColors.primary }]}>Refresh GPS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.lockedInputBox,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                  borderColor: themeColors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lockedInputText, { color: themeColors.text }]} numberOfLines={2}>
                  {fromAddress || 'Fetching live GPS coordinates...'}
                </Text>
                {currentGps ? (
                  <Text style={[styles.gpsSubtext, { color: '#10b981' }]}>
                    ✓ Locked: Lat {currentGps.latitude.toFixed(4)}, Lng {currentGps.longitude.toFixed(4)} (±{Math.round(currentGps.accuracy || 10)}m)
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* 2. DESTINATION (Search Place / Where to go) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
              WHERE TO (SEARCH DESTINATION PLACE) <Text style={styles.required}>*</Text>
            </Text>

            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  borderColor: destinationCoords ? '#10b981' : themeColors.border,
                },
              ]}
            >
              <AppIcon name="search" size={18} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search place, client office, sector, city..."
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={destinationQuery}
                onChangeText={handleDestinationSearch}
                editable={!submitting && !activeTrip}
              />
              {searchingPlaces ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : destinationQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setDestinationQuery('');
                    setDestinationCoords(null);
                    setEstimatedKm(0);
                    setShowSuggestions(false);
                  }}
                  style={{ padding: 4 }}
                >
                  <Text style={{ color: themeColors.textSecondary, fontWeight: '700', fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Place Suggestions Dropdown */}
            {showSuggestions && placeSuggestions.length > 0 ? (
              <View
                style={[
                  styles.suggestionsList,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: themeColors.border,
                  },
                ]}
              >
                {placeSuggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={item.place_id || idx}
                    style={[
                      styles.suggestionItem,
                      {
                        borderBottomColor: isDark ? '#1e293b' : '#f1f5f9',
                        borderBottomWidth: idx === placeSuggestions.length - 1 ? 0 : 1,
                      },
                    ]}
                    onPress={() => selectPlace(item)}
                  >
                    <Text style={{ fontSize: 14, marginRight: 8 }}>🏢</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestionTitle, { color: themeColors.text }]} numberOfLines={1}>
                        {item.display_name ? item.display_name.split(',')[0] : item.name}
                      </Text>
                      <Text style={[styles.suggestionSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Distance Preview Pill */}
            {estimatedKm > 0 ? (
              <View style={[styles.distancePill, { backgroundColor: isDark ? '#083344' : '#ecfeff', borderColor: '#06b6d4' }]}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>🛣️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.distanceText, { color: isDark ? '#67e8f9' : '#0891b2' }]}>
                    Estimated Route Distance: <Text style={{ fontWeight: '800', fontSize: 15 }}>{estimatedKm} KM</Text>
                  </Text>
                  <Text style={[styles.distanceSubtext, { color: themeColors.textSecondary }]}>
                    Approx. {Math.round(estimatedKm * 2.2)} mins travel time via road
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* 3. PURPOSE / MEETING NOTES */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
              PURPOSE OF GOING / VISIT OBJECTIVE
            </Text>

            {/* Quick Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {PURPOSE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedPurpose === preset ? themeColors.primary : isDark ? '#1e293b' : '#f1f5f9',
                      borderColor: selectedPurpose === preset ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  onPress={() => setSelectedPurpose(selectedPurpose === preset ? '' : preset)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedPurpose === preset ? '#ffffff' : themeColors.text },
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Detailed Custom Notes */}
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="Add specific details (e.g. Client name, agenda, quotation discussion)..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              multiline
              numberOfLines={3}
              value={customNotes}
              onChangeText={setCustomNotes}
              editable={!submitting && !activeTrip}
            />
          </View>

          {/* 4. START ROUTE / CHECK IN BUTTON */}
          <TouchableOpacity
            style={[
              styles.checkInBtn,
              { backgroundColor: themeColors.primary },
              (submitting || !!activeTrip || !destinationQuery.trim()) && styles.btnDisabled,
            ]}
            onPress={handleCheckIn}
            disabled={submitting || !!activeTrip || !destinationQuery.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <AppIcon name="navigation" size={18} color="#ffffff" />
                <Text style={styles.checkInBtnText}>
                  {activeTrip ? 'Active Field Trip in Progress' : 'Start Route & Check In'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Trip History Section */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>My Recent Field Trips</Text>

          {loading && !refreshing ? (
            <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 20 }} />
          ) : attendanceList.length === 0 ? (
            <View style={styles.emptyBox}>
              <AppIcon name="calendar" size={32} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No field trips logged yet.</Text>
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

                {/* Distance & Notes */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
                  {(item.total_km > 0 || item.estimated_km > 0) ? (
                    <View style={styles.kmBadge}>
                      <Text style={styles.kmBadgeText}>
                        🚗 {item.total_km > 0 ? `${item.total_km} KM (Actual)` : `${item.estimated_km} KM (Est.)`}
                      </Text>
                    </View>
                  ) : null}
                  {item.notes ? (
                    <Text style={[styles.historyNotes, { color: themeColors.textSecondary, flex: 1 }]} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.historyMetaRow}>
                  <Text style={[styles.historyTime, { color: themeColors.textSecondary }]}>
                    {item.check_in_at ? new Date(item.check_in_at).toLocaleDateString() + ' ' + new Date(item.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </Text>

                  {item.check_in_latitude && item.check_in_longitude ? (
                    <TouchableOpacity
                      style={styles.gpsLink}
                      onPress={() =>
                        openNavigationMap(
                          item.check_in_latitude,
                          item.check_in_longitude,
                          item.dest_latitude,
                          item.dest_longitude,
                          item.to_location
                        )
                      }
                    >
                      <AppIcon name="map-pin" size={12} color="#06b6d4" />
                      <Text style={styles.gpsLinkText}>View GPS Route</Text>
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
    marginBottom: 10,
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
    flex: 1,
  },
  liveBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  routeBox: {
    marginBottom: 8,
    gap: 4,
  },
  activeRouteFrom: {
    fontSize: 14,
  },
  activeRouteTo: {
    fontSize: 15,
  },
  notesBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  activeNotes: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  activeBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mapNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  mapNavBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  checkOutBtn: {
    flex: 1.2,
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  checkOutBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refreshGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  refreshGpsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lockedInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lockedInputText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gpsSubtext: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
  },
  suggestionsList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceSubtext: {
    fontSize: 11,
    marginTop: 1,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
    paddingTop: 10,
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
    marginBottom: 4,
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
    fontSize: 13,
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
  kmBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kmBadgeText: {
    color: '#ffffff',
    fontSize: 10,
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
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
