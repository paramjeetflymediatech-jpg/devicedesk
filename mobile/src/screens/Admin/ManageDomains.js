import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import {
  fetchDomainsApi,
  createDomainApi,
  updateDomainApi,
  deleteDomainApi,
  triggerDomainExpiryCheckApi
} from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ManageDomains({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [domains, setDomains] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, expiring_soon: 0, expired: 0, total_renewal_cost: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [checkingExpiry, setCheckingExpiry] = useState(false);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const initialForm = {
    domain_name: '',
    client_name: '',
    client_email: '',
    registrar: 'GoDaddy',
    registration_date: '',
    expiry_date: '',
    auto_renew: false,
    renewal_cost: '15.99',
    card_details: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const loadDomains = async () => {
    try {
      const res = await fetchDomainsApi(searchQuery, filterStatus);
      if (res && res.success) {
        setDomains(res.data || []);
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load domains on mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [filterStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDomains();
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    loadDomains();
  };

  const handleOpenAdd = () => {
    setEditingDomain(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (domain) => {
    setEditingDomain(domain);
    setFormData({
      domain_name: domain.domain_name || '',
      client_name: domain.client_name || '',
      client_email: domain.client_email || '',
      registrar: domain.registrar || 'GoDaddy',
      registration_date: domain.registration_date ? domain.registration_date.split('T')[0] : '',
      expiry_date: domain.expiry_date ? domain.expiry_date.split('T')[0] : '',
      auto_renew: !!domain.auto_renew,
      renewal_cost: domain.renewal_cost ? String(domain.renewal_cost) : '15.99',
      card_details: domain.card_details || '',
      notes: domain.notes || '',
    });
    setShowModal(true);
  };

  const handleSaveDomain = async () => {
    if (!formData.domain_name.trim() || !formData.expiry_date.trim()) {
      sweetAlert({ title: 'Validation Error', text: 'Domain Name and Expiry Date (YYYY-MM-DD) are required.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (editingDomain) {
        res = await updateDomainApi(editingDomain.id, {
          ...formData,
          renewal_cost: parseFloat(formData.renewal_cost) || 0,
        });
      } else {
        res = await createDomainApi({
          ...formData,
          renewal_cost: parseFloat(formData.renewal_cost) || 0,
        });
      }

      if (res && (res.success || !res.error)) {
        setShowModal(false);
        sweetAlert({
          title: 'Success',
          text: editingDomain ? 'Domain updated successfully!' : 'New domain registered successfully!',
          type: 'success',
        });
        loadDomains();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || res?.message || 'Failed to save domain.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network connection error.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDomain = (domain) => {
    sweetAlert({
      title: 'Delete Domain?',
      text: `Are you sure you want to permanently remove "${domain.domain_name}" from DNS registry?`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const res = await deleteDomainApi(domain.id);
          if (res && res.success) {
            sweetAlert({ title: 'Deleted', text: 'Domain removed from registry.', type: 'success' });
            loadDomains();
          } else {
            sweetAlert({ title: 'Error', text: res?.error || 'Failed to delete domain.', type: 'error' });
          }
        } catch (e) {
          sweetAlert({ title: 'Error', text: 'Network error deleting domain.', type: 'error' });
        }
      }
    });
  };

  const handleCheckExpiry = async () => {
    setCheckingExpiry(true);
    try {
      const res = await triggerDomainExpiryCheckApi();
      if (res && res.success) {
        sweetAlert({
          title: 'Expiry Check Completed ⚡',
          text: `Checked domains! Sent ${res.alerts_sent?.length || 0} expiry notification alerts.`,
          type: 'success',
        });
        loadDomains();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || 'Failed to trigger expiry check.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Failed to run domain expiry check.', type: 'error' });
    } finally {
      setCheckingExpiry(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10b981';
      case 'Expiring Soon': return '#f59e0b';
      case 'Expired': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 18, color: themeColors.accent || '#3b82f6' }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Domains & DNS Registry</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {domains.length} tracked domains
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: '#3b82f6' }]}
          onPress={handleOpenAdd}
        >
          <Text style={styles.headerBtnText}>+ Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: '#f59e0b', marginLeft: 6 }]}
          onPress={handleCheckExpiry}
          disabled={checkingExpiry}
        >
          {checkingExpiry ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.headerBtnText}>⚡ Check</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
      >
        {/* Metric Summary Grid */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={{ fontSize: 18 }}>🌐</Text>
            <Text style={[styles.summaryVal, { color: themeColors.textPrimary }]}>{summary.total || 0}</Text>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={{ fontSize: 18 }}>🟢</Text>
            <Text style={[styles.summaryVal, { color: '#10b981' }]}>{summary.active || 0}</Text>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={{ fontSize: 18 }}>⏳</Text>
            <Text style={[styles.summaryVal, { color: '#f59e0b' }]}>{summary.expiring_soon || 0}</Text>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Expiring</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={{ fontSize: 18 }}>🚨</Text>
            <Text style={[styles.summaryVal, { color: '#ef4444' }]}>{summary.expired || 0}</Text>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Expired</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: themeColors.card, color: themeColors.textPrimary, borderColor: themeColors.border }]}
            placeholder="Search domain, client, email, registrar..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          <TouchableOpacity style={[styles.searchBtn, { backgroundColor: '#3b82f6' }]} onPress={handleSearchSubmit}>
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['ALL', 'Active', 'Expiring Soon', 'Expired'].map(st => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.chip,
                  { backgroundColor: themeColors.card, borderColor: themeColors.border },
                  filterStatus === st && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }
                ]}
                onPress={() => setFilterStatus(st)}
              >
                <Text style={[
                  styles.chipText,
                  { color: themeColors.textSecondary },
                  filterStatus === st && { color: '#ffffff', fontWeight: 'bold' }
                ]}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Domain Cards List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{ color: themeColors.textSecondary, marginTop: 10, fontSize: 13 }}>Loading DNS Registry...</Text>
          </View>
        ) : domains.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🌐</Text>
            <Text style={[styles.noData, { color: themeColors.textSecondary }]}>No domains match your search query.</Text>
          </View>
        ) : (
          domains.map(dom => {
            const daysLeft = dom.days_left;
            const daysLabel = daysLeft === null || daysLeft === undefined 
              ? 'No date' 
              : daysLeft < 0 
                ? `Expired ${Math.abs(daysLeft)}d ago` 
                : daysLeft === 0 
                  ? 'Expires Today' 
                  : `${daysLeft} days remaining`;

            return (
              <View key={dom.id} style={[styles.domainCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.domainName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                      🌐 {dom.domain_name}
                    </Text>
                    <Text style={[styles.registrarSub, { color: themeColors.textSecondary }]}>
                      Registrar: <Text style={{ fontWeight: '700', color: themeColors.textPrimary }}>{dom.registrar || 'GoDaddy'}</Text>
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(dom.status)}22`, borderColor: getStatusColor(dom.status) }]}>
                    <Text style={[styles.statusPillText, { color: getStatusColor(dom.status) }]}>{dom.status}</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                {/* Client & Date Specs */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>👤 Client</Text>
                    <Text style={[styles.infoVal, { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {dom.client_name || 'Unassigned'}
                    </Text>
                    {dom.client_email ? (
                      <Text style={[styles.emailSub, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        ✉️ {dom.client_email}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>📅 Expiry Date</Text>
                    <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                      {dom.expiry_date ? dom.expiry_date.split('T')[0] : 'N/A'}
                    </Text>
                    <Text style={[styles.daysLeftSub, { color: getStatusColor(dom.status) }]}>
                      {daysLabel}
                    </Text>
                  </View>
                </View>

                {/* Bottom Meta & Action Buttons */}
                <View style={styles.cardBottomRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    <View style={[styles.tagPill, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: themeColors.border }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.textPrimary }}>
                        💵 ${dom.renewal_cost || '0.00'}
                      </Text>
                    </View>
                    <View style={[styles.tagPill, { backgroundColor: dom.auto_renew ? '#dcfce7' : '#fee2e2', borderColor: dom.auto_renew ? '#86efac' : '#fca5a5' }]}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: dom.auto_renew ? '#166534' : '#991b1b' }}>
                        {dom.auto_renew ? 'Auto-Renew ON' : 'Auto-Renew OFF'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: '#3b82f6' }]}
                      onPress={() => handleOpenEdit(dom)}
                    >
                      <Text style={{ fontSize: 13 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { backgroundColor: isDark ? '#1e293b' : '#fef2f2', borderColor: '#ef4444' }]}
                      onPress={() => handleDeleteDomain(dom)}
                    >
                      <Text style={{ fontSize: 13 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Domain Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              {editingDomain ? 'Edit Domain Details' : 'Register New Domain'}
            </Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Domain Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="example.com"
                placeholderTextColor={themeColors.textSecondary}
                value={formData.domain_name}
                onChangeText={(v) => setFormData({ ...formData, domain_name: v })}
                autoCapitalize="none"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Client Name</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                    placeholder="John Doe"
                    placeholderTextColor={themeColors.textSecondary}
                    value={formData.client_name}
                    onChangeText={(v) => setFormData({ ...formData, client_name: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Client Email</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                    placeholder="client@mail.com"
                    placeholderTextColor={themeColors.textSecondary}
                    value={formData.client_email}
                    onChangeText={(v) => setFormData({ ...formData, client_email: v })}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Registrar</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                    placeholder="GoDaddy / Namecheap"
                    placeholderTextColor={themeColors.textSecondary}
                    value={formData.registrar}
                    onChangeText={(v) => setFormData({ ...formData, registrar: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Expiry Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                    placeholder="2027-12-31"
                    placeholderTextColor={themeColors.textSecondary}
                    value={formData.expiry_date}
                    onChangeText={(v) => setFormData({ ...formData, expiry_date: v })}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Renewal Cost ($ / ₹)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                    placeholder="15.99"
                    placeholderTextColor={themeColors.textSecondary}
                    value={formData.renewal_cost}
                    onChangeText={(v) => setFormData({ ...formData, renewal_cost: v })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Auto Renew</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Switch
                      value={formData.auto_renew}
                      onValueChange={(val) => setFormData({ ...formData, auto_renew: val })}
                      trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                    />
                    <Text style={{ color: themeColors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                      {formData.auto_renew ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Notes & DNS Remarks</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border, minHeight: 60 }]}
                placeholder="Nameservers, SSL notes, primary registrar account info..."
                placeholderTextColor={themeColors.textSecondary}
                value={formData.notes}
                onChangeText={(v) => setFormData({ ...formData, notes: v })}
                multiline
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#3b82f6' }]}
                disabled={submitting}
                onPress={handleSaveDomain}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>
                    {editingDomain ? 'Update Domain' : 'Save Domain'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { padding: 30, justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryVal: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  summaryLabel: { fontSize: 10, marginTop: 1 },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  searchBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 11.5, fontWeight: '600' },
  domainCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  domainName: { fontSize: 15, fontWeight: 'bold' },
  registrarSub: { fontSize: 11, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusPillText: { fontSize: 10.5, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 10 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10.5, marginBottom: 2 },
  infoVal: { fontSize: 12.5, fontWeight: 'bold' },
  emailSub: { fontSize: 10.5, marginTop: 2 },
  daysLeftSub: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  noData: { fontSize: 13, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  formLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
