import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchPackagesApi,
  createPackageApi,
  updatePackageApi,
  deletePackageApi,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ManagePackages({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [pkgForm, setPkgForm] = useState({
    id: null,
    name: '',
    description: '',
    price: '',
    billing_cycle: 'Monthly',
    featuresText: '',
  });

  const loadPackages = async () => {
    try {
      setLoading(true);
      const res = await fetchPackagesApi();
      if (res && res.success) {
        setPackages(res.packages || []);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPackages();
  };

  const handleSavePackage = async (isEdit = false) => {
    if (!pkgForm.name.trim() || !pkgForm.price.toString().trim()) {
      sweetAlert({
        title: 'Missing Fields',
        text: 'Please enter Package Name and Price.',
        type: 'error',
      });
      return;
    }

    const features = pkgForm.featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const payload = {
      name: pkgForm.name.trim(),
      description: pkgForm.description.trim(),
      price: parseFloat(pkgForm.price) || 0,
      billing_cycle: pkgForm.billing_cycle,
      features,
    };

    setSaving(true);
    try {
      const res = isEdit
        ? await updatePackageApi(pkgForm.id, payload)
        : await createPackageApi(payload);

      if (res && res.success) {
        sweetAlert({
          title: isEdit ? 'Package Updated' : 'Package Created',
          text: `Package "${pkgForm.name}" saved successfully!`,
          type: 'success',
        });
        setShowAddModal(false);
        setShowEditModal(false);
        loadPackages();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to save package.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: 'Network error saving package.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = (pkg) => {
    sweetAlert({
      title: 'Delete Package?',
      text: `Are you sure you want to remove "${pkg.name}"?`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const res = await deletePackageApi(pkg.id);
          if (res && res.success) {
            sweetAlert({
              title: 'Deleted',
              text: 'Package removed successfully.',
              type: 'success',
            });
            loadPackages();
          } else {
            sweetAlert({
              title: 'Error',
              text: res?.error || 'Failed to delete package.',
              type: 'error',
            });
          }
        } catch (err) {
          sweetAlert({
            title: 'Error',
            text: 'Network error deleting package.',
            type: 'error',
          });
        }
      },
    });
  };

  const openEdit = (pkg) => {
    setPkgForm({
      id: pkg.id,
      name: pkg.name || '',
      description: pkg.description || '',
      price: String(pkg.price || ''),
      billing_cycle: pkg.billing_cycle || 'Monthly',
      featuresText: Array.isArray(pkg.features) ? pkg.features.join('\n') : '',
    });
    setShowEditModal(true);
  };

  const openAdd = () => {
    setPkgForm({
      id: null,
      name: '',
      description: '',
      price: '',
      billing_cycle: 'Monthly',
      featuresText: '',
    });
    setShowAddModal(true);
  };

  const filteredPackages = packages.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.billing_cycle || '').toLowerCase().includes(q)
    );
  });

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
            <Text style={styles.title}>📦 Service Packages & Tiers</Text>
            <Text style={styles.subtitle}>Standard pricing plans & service deliverables</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <AppIcon name="plus" size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>New Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <AppIcon name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search package name, billing..."
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
      </View>

      {/* Package List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Loading service packages...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        >
          {filteredPackages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
              <Text style={styles.emptyTitle}>No Service Packages Configured</Text>
              <Text style={styles.emptySubtitle}>Tap "+ New Plan" to add service packages with deliverables.</Text>
            </View>
          ) : (
            filteredPackages.map((pkg) => {
              const features = Array.isArray(pkg.features) ? pkg.features : [];
              return (
                <View key={pkg.id} style={styles.packageCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      {pkg.description ? (
                        <Text style={styles.packageDesc}>{pkg.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>₹{pkg.price}</Text>
                      <Text style={styles.cycleText}>/ {pkg.billing_cycle || 'Monthly'}</Text>
                    </View>
                  </View>

                  {features.length > 0 ? (
                    <View style={styles.featuresBox}>
                      <Text style={styles.featuresTitle}>INCLUDED DELIVERABLES & FEATURES:</Text>
                      {features.map((feat, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <Text style={{ color: '#16a34a', fontSize: 13, marginRight: 6 }}>✓</Text>
                          <Text style={styles.featureText}>{feat}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtnEdit}
                      onPress={() => openEdit(pkg)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="edit" size={14} color="#2563eb" />
                      <Text style={styles.actionBtnEditText}>Edit Plan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnDelete}
                      onPress={() => handleDeletePackage(pkg)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="trash" size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* MODAL: ADD / EDIT PACKAGE */}
      <Modal
        visible={showAddModal || showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showEditModal ? '✏️ Edit Package' : '➕ Create New Service Package'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={true}>
              <Text style={styles.inputLabel}>Package Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SEO Growth Plan / Web Development Pro"
                placeholderTextColor={themeColors.textSecondary}
                value={pkgForm.name}
                onChangeText={(t) => setPkgForm({ ...pkgForm, name: t })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Price (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 15000"
                    placeholderTextColor={themeColors.textSecondary}
                    keyboardType="numeric"
                    value={pkgForm.price}
                    onChangeText={(t) => setPkgForm({ ...pkgForm, price: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Billing Cycle</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    {['Monthly', 'Yearly', 'One-time'].map((bc) => (
                      <TouchableOpacity
                        key={bc}
                        style={[
                          styles.cycleChip,
                          pkgForm.billing_cycle === bc && styles.cycleChipActive,
                        ]}
                        onPress={() => setPkgForm({ ...pkgForm, billing_cycle: bc })}
                      >
                        <Text
                          style={[
                            styles.cycleChipText,
                            pkgForm.billing_cycle === bc && styles.cycleChipTextActive,
                          ]}
                        >
                          {bc}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Short Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief plan summary or target audience"
                placeholderTextColor={themeColors.textSecondary}
                value={pkgForm.description}
                onChangeText={(t) => setPkgForm({ ...pkgForm, description: t })}
              />

              <Text style={styles.inputLabel}>Features / Deliverables (1 per line)</Text>
              <TextInput
                style={[styles.input, { height: 110 }]}
                placeholder="10 Keywords Optimization&#10;Weekly Ranking Reports&#10;On-Page SEO Fixes&#10;Google Analytics Tracking"
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={5}
                value={pkgForm.featuresText}
                onChangeText={(t) => setPkgForm({ ...pkgForm, featuresText: t })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => handleSavePackage(showEditModal)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {showEditModal ? 'Save Changes' : 'Create Package'}
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
    addBtn: {
      backgroundColor: '#2563eb',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
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
    packageCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      padding: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    packageName: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    packageDesc: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    priceContainer: {
      alignItems: 'flex-end',
      backgroundColor: isDark ? '#1e3a8a22' : '#eff6ff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3b82f644',
    },
    priceText: {
      fontSize: 16,
      fontWeight: '900',
      color: '#2563eb',
    },
    cycleText: {
      fontSize: 10,
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    featuresBox: {
      marginTop: 12,
      padding: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
      gap: 6,
    },
    featuresTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: themeColors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureText: {
      fontSize: 12,
      color: themeColors.textPrimary,
      flex: 1,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    actionBtnEdit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    },
    actionBtnEditText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#2563eb',
    },
    actionBtnDelete: {
      padding: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#dc262633',
      backgroundColor: '#dc262611',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalSheet: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: themeColors.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      marginBottom: 12,
    },
    modalCloseCircleBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: themeColors.textPrimary,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    inputLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: themeColors.textSecondary,
      marginTop: 8,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      color: themeColors.textPrimary,
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
    },
    cycleChip: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      alignItems: 'center',
    },
    cycleChipActive: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
    cycleChipText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: themeColors.textSecondary,
    },
    cycleChipTextActive: {
      color: '#ffffff',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    modalSaveBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#2563eb',
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
}
