import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import { fetchSubscriptionsApi } from '../../utils/api';

export default function ManageSubscriptions({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Expired'

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetchSubscriptionsApi();
      if (res && res.success) {
        setSubscriptions(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (sub.client_name || '').toLowerCase().includes(q) ||
      (sub.client_email || '').toLowerCase().includes(q) ||
      (sub.package_name || '').toLowerCase().includes(q) ||
      (sub.billing_cycle || '').toLowerCase().includes(q);

    if (statusFilter === 'Active') return matchesQuery && !sub.is_expired;
    if (statusFilter === 'Expired') return matchesQuery && sub.is_expired;
    return matchesQuery;
  });

  const activeCount = subscriptions.filter((s) => !s.is_expired).length;
  const expiredCount = subscriptions.filter((s) => s.is_expired).length;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <AppIcon name="arrow-left" size={18} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>📜 Subscriptions Tracker</Text>
            <Text style={styles.subtitle}>Active client contracts, billing cycles & validity</Text>
          </View>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.filterSection}>
        <View style={styles.searchBox}>
          <AppIcon name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search client, package..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="x" size={14} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {[
            { id: 'All', label: `All (${subscriptions.length})` },
            { id: 'Active', label: `🟢 Active (${activeCount})` },
            { id: 'Expired', label: `🔴 Expired (${expiredCount})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterChip, statusFilter === tab.id && styles.filterChipActive]}
              onPress={() => setStatusFilter(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, statusFilter === tab.id && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Subscriptions List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Loading client subscriptions...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        >
          {filteredSubscriptions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📜</Text>
              <Text style={styles.emptyTitle}>No Subscriptions Found</Text>
              <Text style={styles.emptySubtitle}>No matching client package subscriptions recorded.</Text>
            </View>
          ) : (
            filteredSubscriptions.map((sub, idx) => {
              const isExpired = sub.is_expired;
              return (
                <View key={sub.subscription_id || idx} style={styles.subCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{sub.client_name}</Text>
                      <Text style={styles.clientEmail}>{sub.client_email}</Text>
                    </View>
                    <View style={[styles.statusBadge, isExpired ? styles.statusExpired : styles.statusActive]}>
                      <Text style={[styles.statusBadgeText, isExpired ? styles.statusBadgeTextExpired : styles.statusBadgeTextActive]}>
                        {isExpired ? 'EXPIRED' : 'ACTIVE'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Plan & Pricing */}
                  <View style={styles.planRow}>
                    <View style={styles.planIconBox}>
                      <Text style={{ fontSize: 18 }}>📦</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageName}>{sub.package_name}</Text>
                      <Text style={styles.packagePrice}>
                        ₹{sub.price} / {sub.billing_cycle}
                      </Text>
                    </View>
                  </View>

                  {/* Dates Box */}
                  <View style={styles.datesBox}>
                    <View style={styles.dateCol}>
                      <Text style={styles.dateLabel}>Subscribed Date:</Text>
                      <Text style={styles.dateVal}>📅 {sub.start_date_formatted || 'N/A'}</Text>
                    </View>
                    <View style={styles.dateCol}>
                      <Text style={styles.dateLabel}>Valid Until:</Text>
                      <Text style={[styles.dateVal, { color: isExpired ? '#ef4444' : '#10b981', fontWeight: '800' }]}>
                        ⏱️ {sub.valid_until_formatted || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

function getStyles(themeColors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.headerBg,
    },
    backBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    filterSection: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      gap: 8,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: themeColors.textPrimary,
      padding: 0,
    },
    filterTabs: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    filterChipActive: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
    filterChipText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    filterChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    centerLoader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    loaderText: {
      marginTop: 10,
      color: themeColors.textSecondary,
      fontSize: 13,
    },
    emptyCard: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      marginTop: 20,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    emptySubtitle: {
      fontSize: 12,
      color: themeColors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    subCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      padding: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    clientName: {
      fontSize: 14.5,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    clientEmail: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 1,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusActive: {
      backgroundColor: '#16a34a22',
      borderWidth: 1,
      borderColor: '#16a34a',
    },
    statusExpired: {
      backgroundColor: '#dc262622',
      borderWidth: 1,
      borderColor: '#dc2626',
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    statusBadgeTextActive: {
      color: '#16a34a',
    },
    statusBadgeTextExpired: {
      color: '#dc2626',
    },
    divider: {
      height: 1,
      backgroundColor: themeColors.border,
      marginVertical: 10,
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    planIconBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: '#2563eb22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    packageName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    packagePrice: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2563eb',
      marginTop: 1,
    },
    datesBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      padding: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    dateCol: {
      flex: 1,
    },
    dateLabel: {
      fontSize: 10.5,
      color: themeColors.textSecondary,
      fontWeight: '600',
      marginBottom: 2,
    },
    dateVal: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
  });
}
