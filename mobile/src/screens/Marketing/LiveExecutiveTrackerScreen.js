import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import { onSocketEvent, offSocketEvent } from '../../utils/socketService';
import { getApiUrl, deleteMarketingTripRecord } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Haversine distance in KM
function getHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c * 1.2).toFixed(2));
}

export default function LiveExecutiveTrackerScreen({
  trip,
  executive,
  user,
  onBack,
}) {
  const { themeColors, isDark } = useTheme();

  // Active Trip Data
  const [activeTrip, setActiveTrip] = useState(trip || null);
  const [waypoints, setWaypoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Location & Telemetry
  const [currentLat, setCurrentLat] = useState(
    trip?.current_latitude || trip?.check_in_latitude || 28.6139
  );
  const [currentLng, setCurrentLng] = useState(
    trip?.current_longitude || trip?.check_in_longitude || 77.2090
  );
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [calculatedSpeedKmH, setCalculatedSpeedKmH] = useState(0);

  // Map Zoom / Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeViewTab, setActiveViewTab] = useState('map'); // 'map' | 'trail' | 'info'

  // Pulse animation for vehicle marker
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, radarAnim]);

  // Fetch Full Waypoint Route History
  const fetchTrailData = async (isSilent = false) => {
    if (!activeTrip?.id) return;
    if (!isSilent) setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(
        `${apiUrl}/api/marketing/location?attendance_id=${encodeURIComponent(
          activeTrip.id
        )}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setWaypoints(data.data);
        const latest = data.data[data.data.length - 1];
        if (latest && latest.latitude && latest.longitude) {
          setCurrentLat(Number(latest.latitude));
          setCurrentLng(Number(latest.longitude));
          setLastUpdate(new Date(latest.recorded_at || Date.now()));
        }
      }
    } catch (e) {
      console.warn('Failed to load trail waypoints:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrailData();
    const interval = setInterval(() => {
      fetchTrailData(true);
    }, 10000); // 10s polling backup
    return () => clearInterval(interval);
  }, [activeTrip?.id]);

  // Listen for Real-Time WebSocket Location Updates
  useEffect(() => {
    const handleLocationUpdate = (data) => {
      if (!data) return;
      if (
        data.attendanceId === activeTrip?.id ||
        data.employeeId === (activeTrip?.employee_id || executive?.id)
      ) {
        if (data.latitude && data.longitude) {
          const newLat = Number(data.latitude);
          const newLng = Number(data.longitude);

          // Calculate instant approximate speed
          const distKm = getHaversineKm(currentLat, currentLng, newLat, newLng);
          const timeElapsedSec = (new Date() - lastUpdate) / 1000;
          if (timeElapsedSec > 1 && distKm > 0.005) {
            const speed = (distKm / (timeElapsedSec / 3600)).toFixed(0);
            setCalculatedSpeedKmH(Math.min(120, Number(speed)));
          }

          setCurrentLat(newLat);
          setCurrentLng(newLng);
          setLastUpdate(new Date(data.timestamp || Date.now()));

          setWaypoints((prev) => [
            ...prev,
            {
              id: 'loc_' + Date.now(),
              latitude: newLat,
              longitude: newLng,
              accuracy: data.accuracy,
              recorded_at: new Date().toISOString(),
            },
          ]);
        }
      }
    };

    const unsub = onSocketEvent('marketing-location-update', handleLocationUpdate);
    return () => {
      unsub();
    };
  }, [activeTrip?.id, currentLat, currentLng, lastUpdate]);

  // Coordinates Bounds for SVG Map Projection
  const startLat = Number(activeTrip?.check_in_latitude || currentLat);
  const startLng = Number(activeTrip?.check_in_longitude || currentLng);
  const destLat = Number(activeTrip?.dest_latitude || currentLat + 0.02);
  const destLng = Number(activeTrip?.dest_longitude || currentLng + 0.02);

  // Compute bounding box
  const allCoords = [
    { lat: startLat, lng: startLng },
    { lat: destLat, lng: destLng },
    { lat: currentLat, lng: currentLng },
    ...waypoints.map((w) => ({ lat: Number(w.latitude), lng: Number(w.longitude) })),
  ].filter((c) => !isNaN(c.lat) && !isNaN(c.lng));

  const minLat = Math.min(...allCoords.map((c) => c.lat)) - 0.004 / zoomLevel;
  const maxLat = Math.max(...allCoords.map((c) => c.lat)) + 0.004 / zoomLevel;
  const minLng = Math.min(...allCoords.map((c) => c.lng)) - 0.004 / zoomLevel;
  const maxLng = Math.max(...allCoords.map((c) => c.lng)) + 0.004 / zoomLevel;

  const latSpan = maxLat - minLat || 0.01;
  const lngSpan = maxLng - minLng || 0.01;

  // Project GPS to Map View Coordinates (0 to 360 x 0 to 340)
  const MAP_W = SCREEN_WIDTH - 32;
  const MAP_H = 320;

  const projectToMap = (lat, lng) => {
    const x = ((lng - minLng) / lngSpan) * (MAP_W - 60) + 30;
    const y = MAP_H - (((lat - minLat) / latSpan) * (MAP_H - 60) + 30);
    return { x, y };
  };

  const startPt = projectToMap(startLat, startLng);
  const destPt = projectToMap(destLat, destLng);
  const currPt = projectToMap(currentLat, currentLng);

  // Build SVG Path from Waypoints
  const pathD = useMemo(() => {
    if (waypoints.length < 2) {
      return `M ${startPt.x} ${startPt.y} Q ${(startPt.x + destPt.x) / 2 + 20} ${
        (startPt.y + destPt.y) / 2 - 20
      } ${destPt.x} ${destPt.y}`;
    }
    return waypoints.reduce((acc, wp, idx) => {
      const pt = projectToMap(Number(wp.latitude), Number(wp.longitude));
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [waypoints, startPt, destPt, minLat, maxLat, minLng, maxLng]);

  // Trip Distance Calculations
  const totalEstimatedKm = Number(
    activeTrip?.estimated_km || getHaversineKm(startLat, startLng, destLat, destLng) || 1
  );
  const coveredKm = Number(
    getHaversineKm(startLat, startLng, currentLat, currentLng)
  );
  const remainingKm = Math.max(0, totalEstimatedKm - coveredKm).toFixed(1);
  const percentComplete = Math.min(
    100,
    Math.max(5, Math.round((coveredKm / (totalEstimatedKm || 1)) * 100))
  );

  const executiveName =
    activeTrip?.employee_name ||
    executive?.name ||
    activeTrip?.employee_id ||
    'Field Executive';
  const executiveDept =
    activeTrip?.employee_department ||
    executive?.department ||
    'Marketing Team';

  // Open Native Navigation (Google Maps / Apple Maps)
  const openLiveNavigation = () => {
    const origin = `${currentLat},${currentLng}`;
    const destination = `${destLat},${destLng}`;
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?saddr=${origin}&daddr=${destination}`
        : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          activeTrip?.to_location || 'Destination'
        )}`
      );
    });
  };

  const handleCallExecutive = () => {
    const phone = executive?.phone || executive?.mobile || '';
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Linking.openURL(`tel:`);
    }
  };

  const handleWhatsAppExecutive = () => {
    const phone = (executive?.whatsapp || executive?.phone || '').replace(/[^0-9]/g, '');
    if (phone) {
      Linking.openURL(`https://wa.me/${phone}?text=Hello%20${encodeURIComponent(executiveName)}`);
    }
  };

  const dbRole = (user?.dbRole || user?.role || '').toLowerCase();
  const isSuperAdminOrAdmin =
    dbRole.includes('admin') ||
    dbRole.includes('superadmin') ||
    dbRole.includes('management');

  const handleDeleteThisTrip = () => {
    if (!activeTrip?.id) return;
    sweetAlert({
      title: 'Delete Trip Record?',
      text: 'Permanently remove this trip and its recorded GPS coordinates?',
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      onConfirm: async () => {
        try {
          const res = await deleteMarketingTripRecord(activeTrip.id);
          if (res?.success) {
            sweetAlert({
              title: 'Deleted! 🗑️',
              text: 'Trip record has been deleted.',
              type: 'success',
            });
            if (onBack) onBack();
          } else {
            sweetAlert({
              title: 'Delete Failed',
              text: res?.error || 'Could not delete record.',
              type: 'error',
            });
          }
        } catch (e) {
          sweetAlert({
            title: 'Error',
            text: e.message || 'Server error',
            type: 'error',
          });
        }
      },
    });
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#090d16' : '#f8fafc' },
      ]}
    >
      {/* Header Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderBottomColor: isDark ? '#1f2937' : '#e2e8f0',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: isDark ? '#1f2937' : '#f1f5f9' },
          ]}
          onPress={onBack}
        >
          <AppIcon
            name="chevron-left"
            size={22}
            color={themeColors.textPrimary}
          />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.livePulseDot} />
            <Text
              style={[
                styles.headerTitle,
                { color: themeColors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {executiveName}
            </Text>
          </View>
          <Text
            style={[
              styles.headerSubtitle,
              { color: themeColors.textSecondary },
            ]}
          >
            Live GPS Tracking • Updated {lastUpdate.toLocaleTimeString()}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: '#10b981' }]}
            onPress={() => fetchTrailData(false)}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>
              ⚡ Live
            </Text>
          </TouchableOpacity>

          {isSuperAdminOrAdmin && (
            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: '#ef4444', paddingHorizontal: 10 }]}
              onPress={handleDeleteThisTrip}
            >
              <AppIcon name="trash-2" size={14} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTrailData(false);
            }}
          />
        }
      >
        {/* ======================================================== */}
        {/* INTERACTIVE RAPIDO / TAXI MAP RADAR CANVAS              */}
        {/* ======================================================== */}
        <View style={styles.mapContainer}>
          <View
            style={[
              styles.mapCard,
              {
                backgroundColor: isDark ? '#0f172a' : '#0f172a',
                borderColor: isDark ? '#334155' : '#1e293b',
              },
            ]}
          >
            {/* Map Top Status Pill */}
            <View style={styles.mapOverlayHeader}>
              <View style={styles.taxiStatusBadge}>
                <Text style={{ fontSize: 12 }}>🚗</Text>
                <Text style={styles.taxiStatusText}>
                  {calculatedSpeedKmH > 0
                    ? `${calculatedSpeedKmH} km/h • In Motion`
                    : 'Live On Route'}
                </Text>
              </View>

              {/* Zoom Controls */}
              <View style={styles.mapControlsRow}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
                >
                  <Text style={styles.zoomBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoomLevel((z) => Math.max(0.6, z - 0.3))}
                >
                  <Text style={styles.zoomBtnText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.zoomBtn, { width: 34 }]}
                  onPress={() => setZoomLevel(1)}
                >
                  <Text style={{ fontSize: 13 }}>🎯</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SVG Interactive Map Area */}
            <View style={{ width: MAP_W, height: MAP_H, overflow: 'hidden' }}>
              <Svg width={MAP_W} height={MAP_H}>
                <Defs>
                  <LinearGradient
                    id="routeGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                    <Stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
                  </LinearGradient>
                  <LinearGradient
                    id="radarFill"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </LinearGradient>
                </Defs>

                {/* Road Grid Lines / Radar Circles */}
                <Circle
                  cx={currPt.x}
                  cy={currPt.y}
                  r="60"
                  fill="url(#radarFill)"
                  stroke="rgba(59, 130, 246, 0.25)"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <Circle
                  cx={currPt.x}
                  cy={currPt.y}
                  r="110"
                  fill="none"
                  stroke="rgba(59, 130, 246, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="6,6"
                />

                {/* Map Grid Guidelines */}
                <Line
                  x1="0"
                  y1={MAP_H / 2}
                  x2={MAP_W}
                  y2={MAP_H / 2}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
                <Line
                  x1={MAP_W / 2}
                  y1="0"
                  x2={MAP_W / 2}
                  y2={MAP_H}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />

                {/* Planned / Actual Route Path */}
                <Path
                  d={pathD}
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Animated Dashed Overlay */}
                <Path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="6,8"
                  strokeOpacity="0.6"
                />

                {/* Waypoint History Dots */}
                {waypoints.map((wp, i) => {
                  const p = projectToMap(
                    Number(wp.latitude),
                    Number(wp.longitude)
                  );
                  return (
                    <Circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r="2.5"
                      fill="#60a5fa"
                      opacity="0.7"
                    />
                  );
                })}

                {/* 🟢 ORIGIN PIN */}
                <G>
                  <Circle
                    cx={startPt.x}
                    cy={startPt.y}
                    r="12"
                    fill="rgba(16, 185, 129, 0.3)"
                  />
                  <Circle
                    cx={startPt.x}
                    cy={startPt.y}
                    r="7"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <SvgText
                    x={startPt.x}
                    y={startPt.y - 12}
                    fill="#10b981"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    START
                  </SvgText>
                </G>

                {/* 🔴 DESTINATION PIN */}
                <G>
                  <Circle
                    cx={destPt.x}
                    cy={destPt.y}
                    r="14"
                    fill="rgba(239, 68, 68, 0.3)"
                  />
                  <Circle
                    cx={destPt.x}
                    cy={destPt.y}
                    r="8"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <SvgText
                    x={destPt.x}
                    y={destPt.y - 14}
                    fill="#ef4444"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    DROP
                  </SvgText>
                </G>

                {/* 🟡 MOVING VEHICLE / EXECUTIVE LIVE PIN */}
                <G>
                  <Circle
                    cx={currPt.x}
                    cy={currPt.y}
                    r="20"
                    fill="rgba(245, 158, 11, 0.25)"
                  />
                  <Circle
                    cx={currPt.x}
                    cy={currPt.y}
                    r="12"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <SvgText
                    x={currPt.x}
                    y={currPt.y + 4}
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    🚗
                  </SvgText>
                </G>
              </Svg>
            </View>

            {/* Bottom Overlay: Direct Navigation Button */}
            <View style={styles.mapFooterBar}>
              <View>
                <Text style={styles.mapCoordsText}>
                  📍 {currentLat.toFixed(5)}°, {currentLng.toFixed(5)}°
                </Text>
                <Text style={styles.mapTrailCountText}>
                  {waypoints.length} GPS Waypoints Recorded
                </Text>
              </View>

              <TouchableOpacity
                style={styles.navOpenBtn}
                onPress={openLiveNavigation}
              >
                <Text style={styles.navOpenBtnText}>Google Maps ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* RAPIDO / UBER RIDE DETAILS BOTTOM SHEET CARD            */}
        {/* ======================================================== */}
        <View style={styles.detailsContainer}>
          {/* 1. Driver / Executive Profile Header */}
          <View
            style={[
              styles.executiveCard,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.executiveRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {executiveName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.onlineBadge} />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[
                    styles.executiveName,
                    { color: themeColors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {executiveName}
                </Text>
                <Text
                  style={[
                    styles.executiveDept,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  {executiveDept} • ID: {activeTrip?.employee_id || 'MKT'}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>
                    🛡️ Live GPS Verified
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.actionCircleBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleCallExecutive}
                >
                  <Text style={{ fontSize: 16 }}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionCircleBtn, { backgroundColor: '#2563eb' }]}
                  onPress={handleWhatsAppExecutive}
                >
                  <Text style={{ fontSize: 16 }}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Live Trip Progress & ETA */}
            <View
              style={[
                styles.tripProgressBox,
                {
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressSub}>Estimated Remaining</Text>
                  <Text style={styles.progressMain}>
                    ~{remainingKm} KM Remaining
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.progressSub}>Progress</Text>
                  <Text style={[styles.progressMain, { color: '#10b981' }]}>
                    {percentComplete}% Done
                  </Text>
                </View>
              </View>

              {/* Horizontal Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${percentComplete}%` },
                  ]}
                />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? '#94a3b8' : '#64748b',
                  marginTop: 6,
                }}
              >
                Covered: {coveredKm.toFixed(1)} KM of {totalEstimatedKm} KM
              </Text>
            </View>

            {/* 3. Pickup & Drop Locations Timeline */}
            <View style={styles.timelineContainer}>
              {/* Pickup Point */}
              <View style={styles.timelineRow}>
                <View style={styles.timelineDotGreen} />
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineLabel}>PICKUP / START POINT</Text>
                  <Text
                    style={[
                      styles.timelineAddress,
                      { color: themeColors.textPrimary },
                    ]}
                  >
                    {activeTrip?.from_location || 'GPS Starting Position'}
                  </Text>
                  <Text style={styles.timelineTime}>
                    Checked In:{' '}
                    {activeTrip?.check_in_at
                      ? new Date(activeTrip.check_in_at).toLocaleTimeString()
                      : 'Recently'}
                  </Text>
                </View>
              </View>

              {/* Connecting Vertical Line */}
              <View style={styles.timelineConnector} />

              {/* Drop-Off Point */}
              <View style={styles.timelineRow}>
                <View style={styles.timelineDotRed} />
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineLabel}>DESTINATION / CLIENT</Text>
                  <Text
                    style={[
                      styles.timelineAddress,
                      { color: themeColors.textPrimary, fontWeight: '800' },
                    ]}
                  >
                    {activeTrip?.to_location || 'Field Visit Location'}
                  </Text>
                  {activeTrip?.notes ? (
                    <View style={styles.notesPill}>
                      <Text style={styles.notesPillText}>
                        🎯 {activeTrip.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* 4. Full-Width Navigation Call-To-Action */}
            <TouchableOpacity
              style={styles.mainNavButton}
              onPress={openLiveNavigation}
            >
              <Text style={styles.mainNavButtonText}>
                🚗 Start Turn-by-Turn Navigation (Google Maps)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 5. Waypoint Trail History Section */}
          <View
            style={[
              styles.trailCard,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.trailHeaderRow}>
              <Text
                style={[
                  styles.trailHeaderTitle,
                  { color: themeColors.textPrimary },
                ]}
              >
                📍 GPS Breadcrumb Log ({waypoints.length} Points)
              </Text>
              <TouchableOpacity
                onPress={() => fetchTrailData(false)}
                style={styles.refreshMiniBtn}
              >
                <Text style={styles.refreshMiniBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator
                size="small"
                color="#3b82f6"
                style={{ padding: 20 }}
              />
            ) : waypoints.length === 0 ? (
              <Text style={styles.emptyTrailText}>
                Collecting initial GPS satellite coordinates...
              </Text>
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {waypoints
                  .slice(-5)
                  .reverse()
                  .map((wp, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.trailItem,
                        {
                          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                          borderColor: isDark ? '#334155' : '#e2e8f0',
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 13 }}>📌</Text>
                        <View>
                          <Text
                            style={[
                              styles.trailItemCoords,
                              { color: themeColors.textPrimary },
                            ]}
                          >
                            {Number(wp.latitude).toFixed(5)}°,{' '}
                            {Number(wp.longitude).toFixed(5)}°
                          </Text>
                          <Text style={styles.trailItemTime}>
                            {new Date(wp.recorded_at).toLocaleTimeString()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>Logged</Text>
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scroll: {
    flex: 1,
  },
  mapContainer: {
    padding: 16,
  },
  mapCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  mapOverlayHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    gap: 6,
  },
  taxiStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  mapControlsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: -2,
  },
  mapFooterBar: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapCoordsText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mapTrailCountText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  navOpenBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  navOpenBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  detailsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  executiveCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  executiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  executiveName: {
    fontSize: 16,
    fontWeight: '800',
  },
  executiveDept: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  actionCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripProgressBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  progressMain: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b82f6',
    marginTop: 2,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  timelineContainer: {
    marginTop: 18,
    position: 'relative',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDotGreen: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginTop: 3,
  },
  timelineDotRed: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginTop: 3,
  },
  timelineConnector: {
    position: 'absolute',
    left: 6,
    top: 17,
    bottom: 25,
    width: 2,
    backgroundColor: '#cbd5e1',
  },
  timelineTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  timelineAddress: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  notesPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  notesPillText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  mainNavButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainNavButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  trailCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  trailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trailHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  refreshMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshMiniBtnText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyTrailText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  trailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  trailItemCoords: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  trailItemTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  activePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
});
