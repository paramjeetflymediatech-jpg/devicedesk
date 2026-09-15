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
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { fetchMarketingAttendance, fetchMarketingAuthorizations, fetchMarketingLocationLogs } from '../../utils/api';
import { getEmployees, subscribe } from '../../store/store';
import AppIcon from '../../components/AppIcon';

export default function ManageMarketing({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history' | 'team'
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [authList, setAuthList] = useState([]);
  const [employees, setEmployees] = useState(() => getEmployees());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('ALL');
  const [selectedTripModal, setSelectedTripModal] = useState(null);
  const [modalTrailLogs, setModalTrailLogs] = useState([]);
  const [loadingTrail, setLoadingTrail] = useState(false);

  useEffect(() => {
    const unsub = subscribe(() => {
      setEmployees(getEmployees());
    });
    return () => unsub();
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [attRes, authRes] = await Promise.all([
        fetchMarketingAttendance(),
        fetchMarketingAuthorizations().catch(() => ({ success: false, data: [] })),
      ]);

      if (attRes && attRes.success && Array.isArray(attRes.data)) {
        setAttendanceRecords(attRes.data);
      }
      if (authRes && authRes.success && Array.isArray(authRes.data)) {
        setAuthList(authRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin marketing data:', err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live polling for admin when on 'live' tracking tab
  useEffect(() => {
    if (activeTab !== 'live') return;
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab, loadData]);

  // When selectedTripModal changes, load its complete GPS location logs
  useEffect(() => {
    if (!selectedTripModal?.id) {
      setModalTrailLogs([]);
      return;
    }
    let isCurrent = true;
    setLoadingTrail(true);
    fetchMarketingLocationLogs(selectedTripModal.id)
      .then((res) => {
        if (isCurrent && res && res.success && Array.isArray(res.data)) {
          setModalTrailLogs(res.data);
        }
      })
      .catch((err) => console.warn('Failed to load trail logs:', err))
      .finally(() => {
        if (isCurrent) setLoadingTrail(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedTripModal?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openMapPin = (lat, lng, label = '') => {
    if (!lat || !lng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}${label ? `(${encodeURIComponent(label)})` : ''}`,
      android: `geo:0,0?q=${lat},${lng}${label ? `(${encodeURIComponent(label)})` : ''}`,
      default: `https://maps.google.com/?q=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  };

  // Derive Team Members: combine employees in marketing dept + authList
  const marketingTeam = React.useMemo(() => {
    const teamMap = new Map();

    // From employees store with department or role matching marketing
    employees.forEach((emp) => {
      const dept = (emp.department || '').toLowerCase();
      const role = (emp.role || '').toLowerCase();
      if (dept.includes('market') || role.includes('market') || dept.includes('sales')) {
        teamMap.set(emp.id, {
          id: emp.id,
          name: emp.name || emp.id,
          email: emp.email || '',
          department: emp.department || 'Marketing',
          role: emp.role || 'Field Executive',
        });
      }
    });

    // From authList
    authList.forEach((auth) => {
      if (!teamMap.has(auth.employeeId)) {
        const matchingEmp = employees.find((e) => e.id === auth.employeeId);
        teamMap.set(auth.employeeId, {
          id: auth.employeeId,
          name: auth.employeeName || matchingEmp?.name || auth.employeeId,
          email: auth.email || matchingEmp?.email || '',
          department: auth.department || matchingEmp?.department || 'Marketing',
          role: auth.role || matchingEmp?.role || 'Field Executive',
        });
      }
    });

    // From attendance records if any employee logged trips
    attendanceRecords.forEach((att) => {
      if (att.employee_id && !teamMap.has(att.employee_id)) {
        const matchingEmp = employees.find((e) => e.id === att.employee_id);
        teamMap.set(att.employee_id, {
          id: att.employee_id,
          name: att.employee_name || matchingEmp?.name || att.employee_id,
          email: att.employee_email || matchingEmp?.email || '',
          department: att.employee_department || matchingEmp?.department || 'Marketing',
          role: 'Field Executive',
        });
      }
    });

    return Array.from(teamMap.values());
  }, [employees, authList, attendanceRecords]);

  // Active trips currently in field (status === 'Checked In')
  const activeTrips = React.useMemo(() => {
    return attendanceRecords.filter((a) => a.status === 'Checked In');
  }, [attendanceRecords]);

  // Filtered trips
  const filteredTrips = React.useMemo(() => {
    return attendanceRecords.filter((item) => {
      const empName = item.employee_name || employees.find((e) => e.id === item.employee_id)?.name || item.employee_id || '';
      const fromLoc = item.from_location || '';
      const toLoc = item.to_location || '';
      const notes = item.notes || '';
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        fromLoc.toLowerCase().includes(q) ||
        toLoc.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q);

      const matchesEmp =
        selectedEmployeeFilter === 'ALL' || item.employee_id === selectedEmployeeFilter;

      return matchesSearch && matchesEmp;
    });
  }, [attendanceRecords, employees, searchQuery, selectedEmployeeFilter]);

  // Format relative elapsed time
  const getElapsedString = (checkInDate) => {
    if (!checkInDate) return '';
    const diffMs = Date.now() - new Date(checkInDate).getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <AppIcon name="arrow-left" size={20} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Marketing Field Operations</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            Live GPS Tracking & Field Work History
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <AppIcon name="refresh-cw" size={18} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary KPI Cards Grid */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={styles.kpiIcon}>👥</Text>
          <Text style={[styles.kpiValue, { color: themeColors.text }]}>{marketingTeam.length}</Text>
          <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Marketing Staff</Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            activeTrips.length > 0 && styles.kpiCardActive,
            { backgroundColor: themeColors.card, borderColor: activeTrips.length > 0 ? '#10b981' : themeColors.border },
          ]}
        >
          <View style={styles.liveIndicatorRow}>
            {activeTrips.length > 0 && <View style={styles.liveDot} />}
            <Text style={styles.kpiIcon}>🚗</Text>
          </View>
          <Text style={[styles.kpiValue, { color: activeTrips.length > 0 ? '#10b981' : themeColors.text }]}>
            {activeTrips.length}
          </Text>
          <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Live In Field</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={styles.kpiIcon}>📍</Text>
          <Text style={[styles.kpiValue, { color: themeColors.text }]}>{attendanceRecords.length}</Text>
          <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Total Trips Logged</Text>
        </View>
      </View>

      {/* Segmented Tab Selector */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#161b22' : '#f1f5f9' }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'live' && [styles.tabButtonActive, { backgroundColor: themeColors.card }],
          ]}
          onPress={() => setActiveTab('live')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {activeTrips.length > 0 && <View style={styles.smallGreenPulse} />}
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'live' ? themeColors.primary : themeColors.textSecondary },
                activeTab === 'live' && styles.tabButtonTextActive,
              ]}
            >
              Live Tracking ({activeTrips.length})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'history' && [styles.tabButtonActive, { backgroundColor: themeColors.card }],
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'history' ? themeColors.primary : themeColors.textSecondary },
              activeTab === 'history' && styles.tabButtonTextActive,
            ]}
          >
            Work History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'team' && [styles.tabButtonActive, { backgroundColor: themeColors.card }],
          ]}
          onPress={() => setActiveTab('team')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'team' ? themeColors.primary : themeColors.textSecondary },
              activeTab === 'team' && styles.tabButtonTextActive,
            ]}
          >
            Team Members
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Team Filter Bar (Visible in History and Team tabs) */}
      {activeTab !== 'live' && (
        <View style={styles.filterSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? '#161b22' : '#ffffff',
                borderColor: themeColors.border,
              },
            ]}
          >
            <AppIcon name="search" size={16} color={themeColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.text }]}
              placeholder="Search member, route or note..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <AppIcon name="close" size={14} color={themeColors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {activeTab === 'history' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.employeeFilterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  selectedEmployeeFilter === 'ALL' && [styles.filterPillActive, { backgroundColor: themeColors.primary }],
                  { borderColor: themeColors.border },
                ]}
                onPress={() => setSelectedEmployeeFilter('ALL')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedEmployeeFilter === 'ALL' ? styles.filterPillTextActive : { color: themeColors.textSecondary },
                  ]}
                >
                  All Staff ({attendanceRecords.length})
                </Text>
              </TouchableOpacity>
              {marketingTeam.map((emp) => {
                const count = attendanceRecords.filter((a) => a.employee_id === emp.id).length;
                const isSelected = selectedEmployeeFilter === emp.id;
                return (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.filterPill,
                      isSelected && [styles.filterPillActive, { backgroundColor: themeColors.primary }],
                      { borderColor: themeColors.border },
                    ]}
                    onPress={() => setSelectedEmployeeFilter(emp.id)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSelected ? styles.filterPillTextActive : { color: themeColors.textSecondary },
                      ]}
                    >
                      {emp.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: 40 }} />
        ) : activeTab === 'live' ? (
          /* ================= LIVE TRACKING TAB ================= */
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.livePulseLarge} />
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  Active Field Visits ({activeTrips.length})
                </Text>
              </View>
              <Text style={[styles.sectionSubtext, { color: themeColors.textSecondary }]}>Real-time GPS status</Text>
            </View>

            {activeTrips.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={styles.emptyIcon}>🚗</Text>
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Marketing Staff Currently in Field</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  When field team members check in on their mobile app, their active route, departure time, and live GPS pin will appear here automatically.
                </Text>
              </View>
            ) : (
              activeTrips.map((trip) => {
                const emp = employees.find((e) => e.id === trip.employee_id);
                const empName = trip.employee_name || emp?.name || trip.employee_id || 'Marketing Member';
                const empDept = trip.employee_department || emp?.department || 'Marketing';
                const hasGps = trip.check_in_latitude && trip.check_in_longitude;

                return (
                  <View
                    key={trip.id}
                    style={[
                      styles.liveTripCard,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: '#10b981',
                      },
                    ]}
                  >
                    {/* Member Info Row */}
                    <View style={styles.liveCardHeader}>
                      <View style={styles.avatarBox}>
                        <Text style={styles.avatarText}>{empName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.liveHeaderDetails}>
                        <Text style={[styles.liveMemberName, { color: themeColors.text }]}>{empName}</Text>
                        <Text style={[styles.liveMemberMeta, { color: themeColors.textSecondary }]}>
                          {empDept} · Started {getElapsedString(trip.check_in_at)}
                        </Text>
                      </View>
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDotSmall} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                    </View>

                    {/* Route Banner */}
                    <View style={[styles.routeBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                      <View style={styles.routeRow}>
                        <Text style={styles.routeFromDot}>🟢</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routeLabel}>FROM</Text>
                          <Text style={[styles.routePlace, { color: themeColors.text }]}>
                            {trip.from_location || 'Origin Point'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.routeDivider} />

                      <View style={styles.routeRow}>
                        <Text style={styles.routeToDot}>🎯</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routeLabel}>DESTINATION</Text>
                          <Text style={[styles.routePlace, { color: themeColors.primary, fontWeight: '700' }]}>
                            {trip.to_location || 'Destination'}
                          </Text>
                        </View>
                      </View>

                      {trip.estimated_km > 0 ? (
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.statusBadge, { backgroundColor: isDark ? '#083344' : '#ecfeff' }]}>
                            <Text style={[styles.statusBadgeText, { color: '#0891b2' }]}>
                              🛣️ Route Distance: {trip.estimated_km} KM
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    {/* Purpose / Notes */}
                    {trip.notes ? (
                      <View style={styles.notesBox}>
                        <Text style={[styles.notesLabel, { color: themeColors.textSecondary }]}>Purpose / Objective:</Text>
                        <Text style={[styles.notesText, { color: themeColors.text }]}>{trip.notes}</Text>
                      </View>
                    ) : null}

                    {/* Live GPS Map Button */}
                    <View style={styles.liveCardFooter}>
                      <View style={styles.gpsCoordinatesBox}>
                        <AppIcon name="map-pin" size={14} color="#10b981" />
                        <Text style={[styles.gpsCoordinatesText, { color: themeColors.textSecondary }]}>
                          {hasGps
                            ? `${Number(trip.check_in_latitude).toFixed(4)}°, ${Number(trip.check_in_longitude).toFixed(4)}°`
                            : 'GPS not captured'}
                        </Text>
                      </View>

                      {hasGps ? (
                        <TouchableOpacity
                          style={styles.openMapBtn}
                          onPress={() =>
                            openMapPin(
                              trip.check_in_latitude,
                              trip.check_in_longitude,
                              `${empName} - Trip to ${trip.to_location || ''}`
                            )
                          }
                        >
                          <AppIcon name="navigation" size={14} color="#ffffff" />
                          <Text style={styles.openMapBtnText}>Track on Live Map</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : activeTab === 'history' ? (
          /* ================= WORK HISTORY TAB ================= */
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Field Visit Logs ({filteredTrips.length})
              </Text>
              <Text style={[styles.sectionSubtext, { color: themeColors.textSecondary }]}>
                {selectedEmployeeFilter === 'ALL' ? 'All Team Records' : 'Filtered Member'}
              </Text>
            </View>

            {filteredTrips.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <AppIcon name="calendar" size={36} color={themeColors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Field Trips Found</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  No visit logs match the selected filter or search term.
                </Text>
              </View>
            ) : (
              filteredTrips.map((item) => {
                const emp = employees.find((e) => e.id === item.employee_id);
                const empName = item.employee_name || emp?.name || item.employee_id || 'Staff';
                const isOngoing = item.status === 'Checked In';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.historyCard,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: isOngoing ? '#10b981' : themeColors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedTripModal(item)}
                  >
                    {/* Header: Employee Name + Status Badge */}
                    <View style={styles.historyCardHeader}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.miniAvatar, { backgroundColor: themeColors.primary }]}>
                          <Text style={styles.miniAvatarText}>{empName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyEmpName, { color: themeColors.text }]} numberOfLines={1}>
                            {empName}
                          </Text>
                          <Text style={[styles.historyTimestamp, { color: themeColors.textSecondary }]}>
                            {item.check_in_at
                              ? new Date(item.check_in_at).toLocaleDateString() +
                                ' · ' +
                                new Date(item.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isOngoing
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
                            { color: isOngoing ? '#10b981' : themeColors.textSecondary },
                          ]}
                        >
                          {item.status || 'Checked Out'}
                        </Text>
                      </View>
                    </View>

                    {/* Route Line */}
                    <View style={styles.historyRouteRow}>
                      <Text style={[styles.historyRouteFrom, { color: themeColors.text }]}>
                        {item.from_location || 'Start'}
                      </Text>
                      <Text style={[styles.historyRouteArrow, { color: themeColors.primary }]}>➔</Text>
                      <Text style={[styles.historyRouteTo, { color: themeColors.primary }]}>
                        {item.to_location || 'Destination'}
                      </Text>
                    </View>

                    {/* Distance Badge & Purpose / Note */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                      {(item.total_km > 0 || item.estimated_km > 0) ? (
                        <View style={[styles.statusBadge, { backgroundColor: isDark ? '#083344' : '#ecfeff', paddingVertical: 2, paddingHorizontal: 6 }]}>
                          <Text style={[styles.statusBadgeText, { color: '#0891b2', fontSize: 10 }]}>
                            🚗 {item.total_km > 0 ? `${item.total_km} KM (Actual)` : `${item.estimated_km} KM (Est.)`}
                          </Text>
                        </View>
                      ) : null}
                      {item.notes ? (
                        <Text style={[styles.historyNotes, { color: themeColors.textSecondary, flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                          📝 {item.notes}
                        </Text>
                      ) : null}
                    </View>

                    {/* Footer with GPS Map Pins */}
                    <View style={styles.historyCardFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {item.check_in_latitude && item.check_in_longitude ? (
                          <TouchableOpacity
                            style={styles.gpsBadge}
                            onPress={() =>
                              openMapPin(
                                item.check_in_latitude,
                                item.check_in_longitude,
                                `${empName} Start Location`
                              )
                            }
                          >
                            <AppIcon name="map-pin" size={12} color="#06b6d4" />
                            <Text style={styles.gpsBadgeText}>Start Pin</Text>
                          </TouchableOpacity>
                        ) : null}

                        {item.check_out_latitude && item.check_out_longitude ? (
                          <TouchableOpacity
                            style={styles.gpsBadge}
                            onPress={() =>
                              openMapPin(
                                item.check_out_latitude,
                                item.check_out_longitude,
                                `${empName} End Location`
                              )
                            }
                          >
                            <AppIcon name="map-pin" size={12} color="#10b981" />
                            <Text style={[styles.gpsBadgeText, { color: '#10b981' }]}>End Pin</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <Text style={[styles.viewDetailsText, { color: themeColors.primary }]}>Details →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          /* ================= TEAM MEMBERS TAB ================= */
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Marketing Team Staff ({marketingTeam.length})
              </Text>
              <Text style={[styles.sectionSubtext, { color: themeColors.textSecondary }]}>
                Authorized Field Executives
              </Text>
            </View>

            {marketingTeam.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <AppIcon name="users" size={36} color={themeColors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Marketing Members Assigned</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  Assign employees to the Marketing department or authorize them in the Web Admin Console.
                </Text>
              </View>
            ) : (
              marketingTeam.map((member) => {
                const totalTrips = attendanceRecords.filter((a) => a.employee_id === member.id).length;
                const isCurrentlyActive = activeTrips.some((a) => a.employee_id === member.id);
                const lastTrip = attendanceRecords.find((a) => a.employee_id === member.id);

                return (
                  <View
                    key={member.id}
                    style={[
                      styles.teamMemberCard,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: isCurrentlyActive ? '#10b981' : themeColors.border,
                      },
                    ]}
                  >
                    <View style={styles.teamMemberTop}>
                      <View
                        style={[
                          styles.avatarBoxLarge,
                          { backgroundColor: isCurrentlyActive ? '#10b981' : themeColors.primary },
                        ]}
                      >
                        <Text style={styles.avatarTextLarge}>{member.name.charAt(0).toUpperCase()}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.teamMemberName, { color: themeColors.text }]}>{member.name}</Text>
                          {isCurrentlyActive ? (
                            <View style={styles.inFieldBadge}>
                              <View style={styles.liveDotSmall} />
                              <Text style={styles.inFieldBadgeText}>IN FIELD</Text>
                            </View>
                          ) : (
                            <View style={styles.idleBadge}>
                              <Text style={styles.idleBadgeText}>IDLE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.teamMemberDept, { color: themeColors.textSecondary }]}>
                          {member.department} · {member.role}
                        </Text>
                        {member.email ? (
                          <Text style={[styles.teamMemberEmail, { color: themeColors.textSecondary }]}>
                            ✉️ {member.email}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.memberStatsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                      <View style={styles.memberStatCol}>
                        <Text style={[styles.memberStatVal, { color: themeColors.primary }]}>{totalTrips}</Text>
                        <Text style={[styles.memberStatLbl, { color: themeColors.textSecondary }]}>Total Trips</Text>
                      </View>

                      <View style={styles.memberStatCol}>
                        <Text style={[styles.memberStatVal, { color: isCurrentlyActive ? '#10b981' : themeColors.text }]}>
                          {isCurrentlyActive ? 'Active Now' : lastTrip ? getElapsedString(lastTrip.check_in_at) : 'None'}
                        </Text>
                        <Text style={[styles.memberStatLbl, { color: themeColors.textSecondary }]}>Last Field Visit</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.viewMemberHistoryBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                        onPress={() => {
                          setSelectedEmployeeFilter(member.id);
                          setActiveTab('history');
                        }}
                      >
                        <Text style={[styles.viewMemberHistoryBtnText, { color: themeColors.primary }]}>
                          View Logs →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* TRIP DETAIL MODAL */}
      <Modal
        visible={!!selectedTripModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTripModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            {selectedTripModal && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>Field Visit Details</Text>
                  <TouchableOpacity onPress={() => setSelectedTripModal(null)} style={styles.modalCloseBtn}>
                    <AppIcon name="close" size={20} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Member Badge */}
                <View style={[styles.modalMemberBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                  <View style={[styles.miniAvatar, { backgroundColor: themeColors.primary }]}>
                    <Text style={styles.miniAvatarText}>
                      {(selectedTripModal.employee_name || selectedTripModal.employee_id || 'M').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalEmpName, { color: themeColors.text }]}>
                      {selectedTripModal.employee_name || selectedTripModal.employee_id}
                    </Text>
                    <Text style={[styles.modalEmpDept, { color: themeColors.textSecondary }]}>
                      {selectedTripModal.employee_department || 'Marketing'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          selectedTripModal.status === 'Checked In'
                            ? '#dcfce7'
                            : '#f1f5f9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: selectedTripModal.status === 'Checked In' ? '#10b981' : '#64748b' },
                      ]}
                    >
                      {selectedTripModal.status}
                    </Text>
                  </View>
                </View>

                {/* Route Section */}
                <View style={styles.modalFieldGroup}>
                  <Text style={[styles.modalFieldLabel, { color: themeColors.textSecondary }]}>ROUTE SUMMARY</Text>
                  <View style={[styles.routeBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <View style={styles.routeRow}>
                      <Text style={styles.routeFromDot}>🟢</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>WHERE FROM</Text>
                        <Text style={[styles.routePlace, { color: themeColors.text }]}>
                          {selectedTripModal.from_location || 'Start point'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeRow}>
                      <Text style={styles.routeToDot}>🎯</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>DESTINATION</Text>
                        <Text style={[styles.routePlace, { color: themeColors.primary, fontWeight: '700' }]}>
                          {selectedTripModal.to_location || 'Destination'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Timestamps */}
                <View style={styles.modalFieldGroup}>
                  <Text style={[styles.modalFieldLabel, { color: themeColors.textSecondary }]}>TIMESTAMPS</Text>
                  <View style={[styles.infoRowBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <View style={styles.infoRowItem}>
                      <Text style={[styles.infoRowLabel, { color: themeColors.textSecondary }]}>Departure / Check In:</Text>
                      <Text style={[styles.infoRowVal, { color: themeColors.text }]}>
                        {selectedTripModal.check_in_at ? new Date(selectedTripModal.check_in_at).toLocaleString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoRowItem}>
                      <Text style={[styles.infoRowLabel, { color: themeColors.textSecondary }]}>Completion / Check Out:</Text>
                      <Text style={[styles.infoRowVal, { color: themeColors.text }]}>
                        {selectedTripModal.check_out_at ? new Date(selectedTripModal.check_out_at).toLocaleString() : 'In Progress'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Purpose / Notes */}
                {selectedTripModal.notes ? (
                  <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalFieldLabel, { color: themeColors.textSecondary }]}>PURPOSE & NOTES</Text>
                    <View style={[styles.modalNotesBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                      <Text style={[styles.modalNotesText, { color: themeColors.text }]}>
                        {selectedTripModal.notes}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Captured GPS Breadcrumb Trail */}
                <View style={styles.modalFieldGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.modalFieldLabel, { color: themeColors.textSecondary, marginBottom: 0 }]}>
                      RECORDED ROUTE TRAIL ({modalTrailLogs.length} COORDINATES)
                    </Text>
                    {loadingTrail && <ActivityIndicator size="small" color={themeColors.primary} />}
                  </View>

                  {modalTrailLogs.length === 0 ? (
                    <View style={[styles.modalNotesBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                      <Text style={[styles.modalNotesText, { color: themeColors.textSecondary, fontStyle: 'italic' }]}>
                        {loadingTrail ? 'Loading coordinates...' : 'No intermediate breadcrumb coordinates logged for this trip yet.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      {modalTrailLogs.map((point, index) => {
                        const isFirst = index === 0;
                        const isLast = index === modalTrailLogs.length - 1;
                        const timeStr = point.recorded_at ? new Date(point.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                        return (
                          <View
                            key={point.id || index}
                            style={[
                              styles.trailPointRow,
                              {
                                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                                borderColor: isFirst ? '#0284c7' : isLast ? '#10b981' : themeColors.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.trailPointBadge,
                                { backgroundColor: isFirst ? '#0284c7' : isLast ? '#10b981' : isDark ? '#334155' : '#e2e8f0' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.trailPointBadgeText,
                                  { color: isFirst || isLast ? '#ffffff' : themeColors.text },
                                ]}
                              >
                                {isFirst ? 'START' : isLast ? 'END' : `#${index + 1}`}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.trailPointCoords, { color: themeColors.text }]}>
                                {Number(point.latitude).toFixed(5)}°, {Number(point.longitude).toFixed(5)}°
                              </Text>
                              <Text style={[styles.trailPointTime, { color: themeColors.textSecondary }]}>
                                ⏱️ {timeStr}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.trailPointMapBtn}
                              onPress={() =>
                                openMapPin(
                                  point.latitude,
                                  point.longitude,
                                  `Waypoint #${index + 1} (${timeStr})`
                                )
                              }
                            >
                              <AppIcon name="map-pin" size={12} color="#0284c7" />
                              <Text style={styles.trailPointMapBtnText}>Map</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* GPS Actions */}
                <View style={styles.modalFieldGroup}>
                  <Text style={[styles.modalFieldLabel, { color: themeColors.textSecondary }]}>QUICK MAP ACTIONS</Text>
                  <View style={{ gap: 8 }}>
                    {selectedTripModal.check_in_latitude && selectedTripModal.check_in_longitude ? (
                      <TouchableOpacity
                        style={styles.modalMapBtn}
                        onPress={() =>
                          openMapPin(
                            selectedTripModal.check_in_latitude,
                            selectedTripModal.check_in_longitude,
                            'Departure GPS Pin'
                          )
                        }
                      >
                        <AppIcon name="map-pin" size={16} color="#ffffff" />
                        <Text style={styles.modalMapBtnText}>Open Departure GPS Pin</Text>
                      </TouchableOpacity>
                    ) : null}

                    {selectedTripModal.check_out_latitude && selectedTripModal.check_out_longitude ? (
                      <TouchableOpacity
                        style={[styles.modalMapBtn, { backgroundColor: '#10b981' }]}
                        onPress={() =>
                          openMapPin(
                            selectedTripModal.check_out_latitude,
                            selectedTripModal.check_out_longitude,
                            'Destination GPS Pin'
                          )
                        }
                      >
                        <AppIcon name="check-circle" size={16} color="#ffffff" />
                        <Text style={styles.modalMapBtnText}>Open Arrival GPS Pin</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.modalCloseFullBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                  onPress={() => setSelectedTripModal(null)}
                >
                  <Text style={[styles.modalCloseFullBtnText, { color: themeColors.text }]}>Close Details</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
  },
  kpiContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiCardActive: {
    borderWidth: 1.5,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  kpiIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    fontWeight: '700',
  },
  smallGreenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  filterSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  employeeFilterScroll: {
    marginTop: 8,
    flexDirection: 'row',
  },
  filterPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 6,
  },
  filterPillActive: {
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtext: {
    fontSize: 11,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  liveTripCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#10b981',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  liveHeaderDetails: {
    flex: 1,
  },
  liveMemberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  liveMemberMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  routeFromDot: {
    fontSize: 12,
    marginTop: 2,
  },
  routeToDot: {
    fontSize: 12,
    marginTop: 2,
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8b949e',
    letterSpacing: 0.5,
  },
  routePlace: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  routeDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 8,
    marginLeft: 20,
  },
  notesBox: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
  },
  liveCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  gpsCoordinatesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsCoordinatesText: {
    fontSize: 11,
    fontWeight: '500',
  },
  openMapBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  openMapBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  historyEmpName: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyTimestamp: {
    fontSize: 10,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
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
    fontSize: 13,
    fontWeight: '700',
  },
  historyNotes: {
    fontSize: 11,
    marginBottom: 8,
  },
  historyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gpsBadgeText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  teamMemberCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  teamMemberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarBoxLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  teamMemberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  teamMemberDept: {
    fontSize: 11,
    marginTop: 2,
  },
  teamMemberEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  inFieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  inFieldBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
  },
  idleBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idleBadgeText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  memberStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  memberStatCol: {
    alignItems: 'flex-start',
  },
  memberStatVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberStatLbl: {
    fontSize: 10,
    marginTop: 1,
  },
  viewMemberHistoryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewMemberHistoryBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalMemberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  modalEmpName: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalEmpDept: {
    fontSize: 11,
    marginTop: 1,
  },
  modalFieldGroup: {
    marginBottom: 16,
  },
  modalFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoRowBox: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoRowLabel: {
    fontSize: 12,
  },
  infoRowVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalNotesBox: {
    borderRadius: 12,
    padding: 12,
  },
  modalNotesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalMapBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  modalMapBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  trailPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  trailPointBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trailPointBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trailPointCoords: {
    fontSize: 12,
    fontWeight: '700',
  },
  trailPointTime: {
    fontSize: 10,
    marginTop: 1,
  },
  trailPointMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    gap: 4,
  },
  trailPointMapBtnText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
  },
  modalCloseFullBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  modalCloseFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
