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
  Linking,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchClientsApi,
  createClientApi,
  updateClientApi,
  deleteClientApi,
  resetClientPasswordApi,
  savePackageOverrideApi,
  fetchPackagesApi,
  fetchClientPackagesApi,
  fetchClientSeoReportsApi,
  fetchClientSmoGraphicsApi,
  fetchClientAdsApi,
  fetchClientRequestsApi,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const { width } = Dimensions.get('window');

export default function ManageClients({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [saving, setSaving] = useState(false);

  // View Packages state
  const [clientPackages, setClientPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Client Services state (inside Details / Services Modal)
  const [servicesTab, setServicesTab] = useState('profile'); // profile, seo, smo, ads, requests
  const [clientSeo, setClientSeo] = useState([]);
  const [clientSmo, setClientSmo] = useState([]);
  const [clientAds, setClientAds] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Add Form
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    gst_number: '',
    website_url: '',
    primary_service: 'SEO',
    notes: '',
  });

  // Edit Form
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    status: 'Active',
    company_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    gst_number: '',
    website_url: '',
    primary_service: 'SEO',
    notes: '',
  });

  // Reset Password Form
  const [resetForm, setResetForm] = useState({
    id: '',
    name: '',
    newPassword: '',
  });

  // Custom Pricing Form
  const [pricingForm, setPricingForm] = useState({
    client_id: '',
    client_name: '',
    package_id: '',
    custom_price: '',
    custom_name: '',
    custom_description: '',
    custom_billing_cycle: 'Monthly',
    custom_features: '',
  });

  const loadClients = async () => {
    try {
      setLoading(true);
      const [clientRes, pkgRes] = await Promise.all([
        fetchClientsApi(),
        fetchPackagesApi().catch(() => ({ success: false, packages: [] })),
      ]);

      if (clientRes && clientRes.success) {
        setClients(clientRes.data || []);
      }
      if (pkgRes && pkgRes.success) {
        setPackages(pkgRes.packages || []);
      }
    } catch (err) {
      console.error('Error fetching clients/packages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  // 1. ADD CLIENT
  const handleCreateClient = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      sweetAlert({
        title: 'Missing Fields',
        text: 'Please enter at least Name, Email, and Password.',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await createClientApi(addForm);
      if (res && res.success) {
        sweetAlert({
          title: 'Client Created',
          text: `Client "${addForm.company_name || addForm.name}" created successfully!`,
          type: 'success',
        });
        setShowAddModal(false);
        setAddForm({
          name: '',
          email: '',
          password: '',
          company_name: '',
          phone: '',
          whatsapp: '',
          address: '',
          gst_number: '',
          website_url: '',
          primary_service: 'SEO',
          notes: '',
        });
        loadClients();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to create client.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Network Error',
        text: 'Failed to create client account.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // 2. EDIT CLIENT
  const openEdit = (client) => {
    setEditForm({
      id: client.id,
      name: client.name || '',
      email: client.email || '',
      status: client.status || 'Active',
      company_name: client.company_name || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      address: client.address || '',
      gst_number: client.gst_number || '',
      website_url: client.website_url || '',
      primary_service: client.primary_service || 'SEO',
      notes: client.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateClient = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      sweetAlert({
        title: 'Missing Fields',
        text: 'Client Name and Email cannot be empty.',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await updateClientApi(editForm.id, editForm);
      if (res && res.success) {
        sweetAlert({
          title: 'Client Updated',
          text: 'Client details saved successfully!',
          type: 'success',
        });
        setShowEditModal(false);
        loadClients();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to update client.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Network Error',
        text: 'Failed to update client account.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // 3. DELETE CLIENT
  const handleDeleteClient = (client) => {
    sweetAlert({
      title: 'Delete Client?',
      text: `Are you sure you want to permanently delete "${client.company_name || client.name}"? This cannot be undone.`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const res = await deleteClientApi(client.id);
          if (res && res.success) {
            sweetAlert({
              title: 'Deleted',
              text: 'Client account removed.',
              type: 'success',
            });
            loadClients();
          } else {
            sweetAlert({
              title: 'Error',
              text: res?.error || 'Failed to delete client.',
              type: 'error',
            });
          }
        } catch (err) {
          sweetAlert({
            title: 'Error',
            text: 'Network error deleting client.',
            type: 'error',
          });
        }
      },
    });
  };

  // 4. RESET PASSWORD
  const openResetPassword = (client) => {
    setResetForm({
      id: client.id,
      name: client.company_name || client.name,
      newPassword: '',
    });
    setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetForm.newPassword || resetForm.newPassword.trim().length < 4) {
      sweetAlert({
        title: 'Invalid Password',
        text: 'Please enter a password with at least 4 characters.',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await resetClientPasswordApi(resetForm.id, resetForm.newPassword.trim());
      if (res && res.success) {
        sweetAlert({
          title: 'Password Reset',
          text: `Password updated successfully for ${resetForm.name}!`,
          type: 'success',
        });
        setShowResetModal(false);
        setResetForm({ id: '', name: '', newPassword: '' });
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to reset password.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Network Error',
        text: 'Failed to reset password.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // 5. CUSTOM PACKAGE PRICING
  const openPricingModal = async (client) => {
    setPricingForm({
      client_id: client.id,
      client_name: client.company_name || client.name,
      package_id: '',
      custom_price: '',
      custom_name: '',
      custom_description: '',
      custom_billing_cycle: 'Monthly',
      custom_features: '',
    });
    setShowPricingModal(true);

    try {
      const pkgRes = await fetchPackagesApi(client.id);
      if (pkgRes && pkgRes.packages) {
        // If there's an existing first package override, default to it
        const firstPkg = pkgRes.packages[0];
        if (firstPkg) {
          setPricingForm({
            client_id: client.id,
            client_name: client.company_name || client.name,
            package_id: String(firstPkg.id),
            custom_price: String(firstPkg.price || ''),
            custom_name: firstPkg.name || '',
            custom_description: firstPkg.description || '',
            custom_billing_cycle: firstPkg.billing_cycle || 'Monthly',
            custom_features: Array.isArray(firstPkg.features)
              ? firstPkg.features.join('\n')
              : (firstPkg.features || '').replace(/<[^>]*>?/gm, ''),
          });
        }
      }
    } catch (err) {
      console.log('Error loading client specific packages:', err);
    }
  };

  const onSelectBasePackage = (pkgId) => {
    if (!pkgId) {
      setPricingForm((prev) => ({
        ...prev,
        package_id: '',
        custom_price: '',
        custom_name: '',
        custom_description: '',
        custom_billing_cycle: 'Monthly',
        custom_features: '',
      }));
      return;
    }
    const found = packages.find((p) => String(p.id) === String(pkgId));
    if (found) {
      const featText = Array.isArray(found.features)
        ? found.features.join('\n')
        : (found.features || '').replace(/<[^>]*>?/gm, '');

      setPricingForm((prev) => ({
        ...prev,
        package_id: String(found.id),
        custom_price: String(found.price || ''),
        custom_name: found.name || '',
        custom_description: found.description || '',
        custom_billing_cycle: found.billing_cycle || 'Monthly',
        custom_features: featText,
      }));
    }
  };

  const handleSavePricing = async () => {
    if (!pricingForm.package_id) {
      sweetAlert({
        title: 'Select Package',
        text: 'Please select a base package to customize.',
        type: 'error',
      });
      return;
    }
    if (!pricingForm.custom_price || isNaN(parseFloat(pricingForm.custom_price))) {
      sweetAlert({
        title: 'Invalid Price',
        text: 'Please enter a valid numeric price.',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: pricingForm.client_id,
        package_id: pricingForm.package_id,
        custom_price: parseFloat(pricingForm.custom_price),
        custom_name: pricingForm.custom_name,
        custom_description: pricingForm.custom_description,
        custom_billing_cycle: pricingForm.custom_billing_cycle,
        custom_features: pricingForm.custom_features,
      };

      const res = await savePackageOverrideApi(payload);
      if (res && res.success) {
        sweetAlert({
          title: 'Pricing Saved',
          text: `Custom pricing for ${pricingForm.client_name} saved successfully!`,
          type: 'success',
        });
        setShowPricingModal(false);
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to save custom pricing.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Network Error',
        text: 'Failed to save package override.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // 6. VIEW ACTIVE PACKAGES
  const openViewPackages = async (client) => {
    setSelectedClient(client);
    setShowPackagesModal(true);
    setLoadingPackages(true);
    setClientPackages([]);

    try {
      const res = await fetchPackagesApi(client.id);
      if (res && res.success && res.packages) {
        setClientPackages(res.packages);
      } else {
        // Fallback to my-packages route
        const altRes = await fetchClientPackagesApi(client.id);
        if (altRes && altRes.success) {
          setClientPackages(altRes.packages || altRes.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching client packages:', err);
    } finally {
      setLoadingPackages(false);
    }
  };

  // 7. MANAGE SERVICES & DETAILED PROFILE
  const openDetailsAndServices = async (client) => {
    setSelectedClient(client);
    setServicesTab('profile');
    setShowDetailsModal(true);
    setLoadingServices(true);

    try {
      const [seo, smo, ads, reqs] = await Promise.all([
        fetchClientSeoReportsApi(client.id).catch(() => ({ data: [] })),
        fetchClientSmoGraphicsApi(client.id).catch(() => ({ data: [] })),
        fetchClientAdsApi(client.id).catch(() => ({ data: [] })),
        fetchClientRequestsApi(client.id).catch(() => ({ data: [] })),
      ]);

      setClientSeo(seo.data || []);
      setClientSmo(smo.data || []);
      setClientAds(ads.data || []);
      setClientRequests(reqs.data || []);
    } catch (err) {
      console.error('Error fetching services details:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (c.name || '').toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.primary_service || '').toLowerCase().includes(q);

    if (statusFilter === 'All') return matchesQuery;
    return matchesQuery && (c.status || 'Active').toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <AppIcon name="arrow-left" size={18} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>👥 Client CRM Directory</Text>
            <Text style={styles.subtitle}>Portals, pricing overrides, services & passwords</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <AppIcon name="plus" size={15} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.filterSection}>
        <View style={styles.searchBox}>
          <AppIcon name="search" size={15} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search company, contact, email..."
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
          {['All', 'Active', 'Inactive'].map((st) => {
            const count = st === 'All' ? clients.length : clients.filter(c => (c.status || 'Active') === st).length;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
                onPress={() => setStatusFilter(st)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                  {st} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Clients List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Loading client accounts...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        >
          {filteredClients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🏢</Text>
              <Text style={styles.emptyTitle}>No Client Records Found</Text>
              <Text style={styles.emptySubtitle}>Tap "+ Add Client" to create your first corporate client profile.</Text>
            </View>
          ) : (
            filteredClients.map((client) => {
              const isActive = (client.status || 'Active') === 'Active';
              const companyName = client.company_name || client.name;
              const contactName = client.name;

              return (
                <View key={client.id} style={styles.clientCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {companyName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.companyName} numberOfLines={1}>
                          {companyName}
                        </Text>
                        <Text style={styles.contactName} numberOfLines={1}>
                          👤 {contactName} • {client.primary_service || 'Services'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusPill, isActive ? styles.statusActive : styles.statusInactive]}>
                      <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                        {client.status || 'Active'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>📧 Email:</Text>
                      <Text style={styles.infoVal} numberOfLines={1}>{client.email}</Text>
                    </View>

                    {client.phone ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>📞 Phone:</Text>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${client.phone}`)}>
                          <Text style={[styles.infoVal, { color: '#2563eb', fontWeight: '700' }]}>{client.phone}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {client.website_url ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🌐 Web:</Text>
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(
                              client.website_url.startsWith('http')
                                ? client.website_url
                                : `https://${client.website_url}`
                            )
                          }
                        >
                          <Text style={[styles.infoVal, { color: '#0891b2', fontWeight: '700' }]} numberOfLines={1}>
                            {client.website_url}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  {/* Complete Website CRM Actions Toolbar */}
                  <View style={styles.actionsRow}>
                    {/* Action 1: Reset Password (Amber) */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionResetBtn]}
                      onPress={() => openResetPassword(client)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="key" size={13} color="#d97706" />
                      <Text style={[styles.actionBtnText, { color: '#d97706' }]}>Reset</Text>
                    </TouchableOpacity>

                    {/* Action 2: Custom Package Pricing (Green) */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPriceBtn]}
                      onPress={() => openPricingModal(client)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="dollar" size={13} color="#16a34a" />
                      <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Pricing</Text>
                    </TouchableOpacity>

                    {/* Action 3: View Active Packages (Sky Blue) */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPkgBtn]}
                      onPress={() => openViewPackages(client)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="box" size={13} color="#0284c7" />
                      <Text style={[styles.actionBtnText, { color: '#0284c7' }]}>Packages</Text>
                    </TouchableOpacity>

                    {/* Action 4: Manage Services / Details (Indigo) */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionServicesBtn]}
                      onPress={() => openDetailsAndServices(client)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="layout" size={13} color="#6366f1" />
                      <Text style={[styles.actionBtnText, { color: '#6366f1' }]}>Services</Text>
                    </TouchableOpacity>

                    {/* Action 5: Edit Client (Cyan) */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionEditBtn]}
                      onPress={() => openEdit(client)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="edit" size={13} color="#0891b2" />
                    </TouchableOpacity>

                    {/* Action 6: Delete Client (Red) */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionDeleteBtn]}
                      onPress={() => handleDeleteClient(client)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="trash" size={13} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ======================================================== */}
      {/* 1. MODAL: RESET PASSWORD                                 */}
      {/* ======================================================== */}
      <Modal visible={showResetModal} transparent animationType="fade" onRequestClose={() => setShowResetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <AppIcon name="key" size={18} color="#d97706" />
                <Text style={[styles.modalTitle, { color: '#d97706' }]}>Reset Client Password</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                onPress={() => setShowResetModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 14 }}>
              Set a new login password for <Text style={{ fontWeight: '800', color: themeColors.textPrimary }}>{resetForm.name}</Text>:
            </Text>

            <Text style={styles.inputLabel}>New Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={themeColors.textSecondary}
              secureTextEntry={false}
              value={resetForm.newPassword}
              onChangeText={(t) => setResetForm({ ...resetForm, newPassword: t })}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowResetModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#d97706' }]}
                onPress={handleResetPassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: CUSTOM PACKAGE PRICING OVERRIDE                */}
      {/* ======================================================== */}
      <Modal visible={showPricingModal} transparent animationType="slide" onRequestClose={() => setShowPricingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <AppIcon name="dollar" size={18} color="#16a34a" />
                <Text style={[styles.modalTitle, { color: '#16a34a' }]} numberOfLines={1}>
                  Pricing: {pricingForm.client_name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                onPress={() => setShowPricingModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={true}>
              <Text style={styles.inputLabel}>Select Base Package *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {packages.map((pkg) => {
                    const isSelected = String(pricingForm.package_id) === String(pkg.id);
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={[
                          styles.packageSelectCard,
                          isSelected && styles.packageSelectCardActive,
                        ]}
                        onPress={() => onSelectBasePackage(pkg.id)}
                      >
                        <Text style={[styles.pkgSelectTitle, isSelected && { color: '#ffffff' }]}>
                          {pkg.name}
                        </Text>
                        <Text style={[styles.pkgSelectPrice, isSelected && { color: '#dbeafe' }]}>
                          ${pkg.price} / {pkg.billing_cycle || 'Mo'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Custom Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. VIP Dedicated Plan"
                    placeholderTextColor={themeColors.textSecondary}
                    value={pricingForm.custom_name}
                    onChangeText={(t) => setPricingForm({ ...pricingForm, custom_name: t })}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Custom Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 499.00"
                    placeholderTextColor={themeColors.textSecondary}
                    keyboardType="numeric"
                    value={pricingForm.custom_price}
                    onChangeText={(t) => setPricingForm({ ...pricingForm, custom_price: t })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Billing Cycle</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {['Monthly', 'Yearly', 'One-Time'].map((cycle) => (
                  <TouchableOpacity
                    key={cycle}
                    style={[
                      styles.filterChip,
                      pricingForm.custom_billing_cycle === cycle && { backgroundColor: '#16a34a', borderColor: '#16a34a' },
                    ]}
                    onPress={() => setPricingForm({ ...pricingForm, custom_billing_cycle: cycle })}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '700',
                        color: pricingForm.custom_billing_cycle === cycle ? '#fff' : themeColors.textSecondary,
                      }}
                    >
                      {cycle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Custom Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Short description of this customized plan..."
                placeholderTextColor={themeColors.textSecondary}
                value={pricingForm.custom_description}
                onChangeText={(t) => setPricingForm({ ...pricingForm, custom_description: t })}
              />

              <Text style={styles.inputLabel}>Custom Features / Deliverables (1 per line)</Text>
              <TextInput
                style={[styles.input, { height: 90 }]}
                placeholder="20 Keywords Ranked&#10;Weekly Backlinks&#10;24/7 Dedicated Support"
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
                value={pricingForm.custom_features}
                onChangeText={(t) => setPricingForm({ ...pricingForm, custom_features: t })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPricingModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#16a34a' }]}
                onPress={handleSavePricing}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Custom Price</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 3. MODAL: VIEW ACTIVE PACKAGES                           */}
      {/* ======================================================== */}
      <Modal visible={showPackagesModal} transparent animationType="slide" onRequestClose={() => setShowPackagesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <AppIcon name="box" size={18} color="#0284c7" />
                <Text style={[styles.modalTitle, { color: '#0284c7' }]} numberOfLines={1}>
                  Packages: {selectedClient?.company_name || selectedClient?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                onPress={() => setShowPackagesModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingPackages ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={{ marginTop: 8, fontSize: 12, color: themeColors.textSecondary }}>
                  Loading subscribed packages...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true}>
                {clientPackages.length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: themeColors.textPrimary }}>
                      No Packages Assigned
                    </Text>
                    <Text style={{ fontSize: 11.5, color: themeColors.textSecondary, textAlign: 'center', marginTop: 4 }}>
                      Use the Pricing action to configure customized packages for this client.
                    </Text>
                  </View>
                ) : (
                  clientPackages.map((pkg) => {
                    const features = Array.isArray(pkg.features)
                      ? pkg.features
                      : typeof pkg.features === 'string'
                      ? pkg.features
                          .replace(/<\/?[^>]+(>|$)/g, '\n')
                          .split('\n')
                          .map((f) => f.trim())
                          .filter(Boolean)
                      : [];

                    return (
                      <View key={pkg.id} style={styles.pkgDetailCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.pkgDetailName}>{pkg.name}</Text>
                            {pkg.description ? (
                              <Text style={styles.pkgDetailDesc}>{pkg.description}</Text>
                            ) : null}
                          </View>
                          <View style={styles.pkgPriceBadge}>
                            <Text style={styles.pkgPriceVal}>${pkg.price}</Text>
                            <Text style={styles.pkgCycleVal}>/{pkg.billing_cycle || 'Mo'}</Text>
                          </View>
                        </View>

                        {features.length > 0 && (
                          <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: themeColors.border }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 4 }}>
                              FEATURES & DELIVERABLES:
                            </Text>
                            {features.map((feat, idx) => (
                              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
                                <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '800' }}>✓</Text>
                                <Text style={{ fontSize: 12, color: themeColors.textPrimary, flex: 1 }}>
                                  {feat}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Bottom Close Action Button */}
            <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: themeColors.border }}>
              <TouchableOpacity
                style={[styles.modalCloseFooterBtn, { backgroundColor: '#0284c7' }]}
                onPress={() => setShowPackagesModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseFooterText}>✕ Close Packages</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL: MANAGE SERVICES & COMPLETE PROFILE             */}
      {/* ======================================================== */}
      {selectedClient && (
        <Modal visible={showDetailsModal} transparent animationType="slide" onRequestClose={() => setShowDetailsModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <AppIcon name="layout" size={18} color="#6366f1" />
                  <Text style={[styles.modalTitle, { color: '#6366f1' }]} numberOfLines={1}>
                    {selectedClient.company_name || selectedClient.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseCircleBtn}
                  onPress={() => setShowDetailsModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Service Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'profile', label: 'Profile', icon: 'user' },
                    { id: 'seo', label: 'SEO Reports', icon: 'file' },
                    { id: 'smo', label: 'SMO Graphics', icon: 'image' },
                    { id: 'ads', label: 'Paid Ads', icon: 'dollar' },
                    { id: 'requests', label: 'Booked Services', icon: 'search' },
                  ].map((tb) => (
                    <TouchableOpacity
                      key={tb.id}
                      style={[
                        styles.filterChip,
                        servicesTab === tb.id && { backgroundColor: '#6366f1', borderColor: '#6366f1' },
                      ]}
                      onPress={() => setServicesTab(tb.id)}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: servicesTab === tb.id ? '#ffffff' : themeColors.textSecondary,
                        }}
                      >
                        {tb.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {loadingServices ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={{ marginTop: 8, fontSize: 12, color: themeColors.textSecondary }}>
                    Fetching service updates...
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={true}>
                  {/* TAB: PROFILE */}
                  {servicesTab === 'profile' && (
                    <View style={{ gap: 6 }}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Company:</Text>
                        <Text style={styles.detailVal}>{selectedClient.company_name || selectedClient.name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Contact Person:</Text>
                        <Text style={styles.detailVal}>{selectedClient.name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email Address:</Text>
                        <Text style={styles.detailVal}>{selectedClient.email}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailVal}>{selectedClient.phone || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Primary Service:</Text>
                        <Text style={styles.detailVal}>{selectedClient.primary_service || 'General'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Website:</Text>
                        <Text style={styles.detailVal}>{selectedClient.website_url || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>GST Number:</Text>
                        <Text style={styles.detailVal}>{selectedClient.gst_number || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Full Address:</Text>
                        <Text style={styles.detailVal}>{selectedClient.address || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Status:</Text>
                        <Text
                          style={[
                            styles.detailVal,
                            { color: selectedClient.status === 'Active' ? '#16a34a' : '#dc2626', fontWeight: 'bold' },
                          ]}
                        >
                          {selectedClient.status || 'Active'}
                        </Text>
                      </View>
                      {selectedClient.notes ? (
                        <View style={styles.notesBox}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: themeColors.textSecondary, marginBottom: 4 }}>
                            INTERNAL NOTES & CONTRACT
                          </Text>
                          <Text style={{ fontSize: 12, color: themeColors.textPrimary }}>{selectedClient.notes}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* TAB: SEO REPORTS */}
                  {servicesTab === 'seo' && (
                    <View style={{ gap: 8 }}>
                      {clientSeo.length === 0 ? (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                          <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>No SEO reports uploaded yet.</Text>
                        </View>
                      ) : (
                        clientSeo.map((r) => (
                          <View key={r.id} style={styles.serviceItemCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontWeight: '800', color: themeColors.textPrimary, fontSize: 13 }}>
                                📊 {r.month} {r.year}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '700' }}>{r.status || 'Active'}</Text>
                            </View>
                            {r.file_url ? (
                              <TouchableOpacity onPress={() => Linking.openURL(r.file_url)} style={{ marginTop: 6 }}>
                                <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '700' }}>
                                  🔗 Open Report File
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ))
                      )}
                    </View>
                  )}

                  {/* TAB: SMO GRAPHICS */}
                  {servicesTab === 'smo' && (
                    <View style={{ gap: 8 }}>
                      {clientSmo.length === 0 ? (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                          <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>No SMO graphic requests submitted.</Text>
                        </View>
                      ) : (
                        clientSmo.map((r) => (
                          <View key={r.id} style={styles.serviceItemCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>
                                📅 {new Date(r.created_at || Date.now()).toLocaleDateString()}
                              </Text>
                              <View style={[styles.statusPill, r.status === 'Completed' ? styles.statusActive : styles.statusInactive]}>
                                <Text style={[styles.statusText, r.status === 'Completed' ? styles.statusTextActive : styles.statusTextInactive]}>
                                  {r.status || 'Pending'}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 12, color: themeColors.textPrimary, marginTop: 6 }}>
                              {r.requirements}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}

                  {/* TAB: PAID ADS */}
                  {servicesTab === 'ads' && (
                    <View style={{ gap: 8 }}>
                      {clientAds.length === 0 ? (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                          <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>No Ads campaigns configured.</Text>
                        </View>
                      ) : (
                        clientAds.map((d) => (
                          <View key={d.id} style={styles.serviceItemCard}>
                            <Text style={{ fontWeight: '800', color: themeColors.textPrimary, fontSize: 13, marginBottom: 6 }}>
                              🎯 {d.platform}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                              <Text style={{ fontSize: 11.5, color: themeColors.textSecondary }}>Total Budget:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textPrimary }}>${parseFloat(d.total_budget || 0).toFixed(2)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                              <Text style={{ fontSize: 11.5, color: themeColors.textSecondary }}>Spent:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>${parseFloat(d.spent_amount || 0).toFixed(2)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderTopWidth: 1, borderTopColor: themeColors.border, marginTop: 4 }}>
                              <Text style={{ fontSize: 11.5, color: themeColors.textSecondary }}>Balance:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>${parseFloat(d.pending_balance || 0).toFixed(2)}</Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}

                  {/* TAB: SERVICE REQUESTS */}
                  {servicesTab === 'requests' && (
                    <View style={{ gap: 8 }}>
                      {clientRequests.length === 0 ? (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                          <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>No booked service requests.</Text>
                        </View>
                      ) : (
                        clientRequests.map((req) => (
                          <View key={req.id} style={styles.serviceItemCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontWeight: '800', color: themeColors.textPrimary, fontSize: 12.5 }}>
                                {req.service_type || 'Service'}
                              </Text>
                              <Text style={{ fontSize: 10.5, color: '#2563eb', fontWeight: '700' }}>
                                {req.status || 'Pending'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, color: themeColors.textPrimary, marginTop: 4 }}>
                              {req.requirements}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Bottom Close Action Button */}
              <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: themeColors.border }}>
                <TouchableOpacity
                  style={[styles.modalCloseFooterBtn, { backgroundColor: '#6366f1' }]}
                  onPress={() => setShowDetailsModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseFooterText}>✕ Close Services & Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: ADD CLIENT                                     */}
      {/* ======================================================== */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ Add New Corporate Client</Text>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={true}>
              <Text style={styles.inputLabel}>Company Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acme Corporation"
                placeholderTextColor={themeColors.textSecondary}
                value={addForm.company_name}
                onChangeText={(t) => setAddForm({ ...addForm, company_name: t })}
              />

              <Text style={styles.inputLabel}>Primary Contact Person *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor={themeColors.textSecondary}
                value={addForm.name}
                onChangeText={(t) => setAddForm({ ...addForm, name: t })}
              />

              <Text style={styles.inputLabel}>Client Login Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="client@acme.com"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={addForm.email}
                onChangeText={(t) => setAddForm({ ...addForm, email: t })}
              />

              <Text style={styles.inputLabel}>Portal Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Set secure password"
                placeholderTextColor={themeColors.textSecondary}
                secureTextEntry={false}
                value={addForm.password}
                onChangeText={(t) => setAddForm({ ...addForm, password: t })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 9876543210"
                    placeholderTextColor={themeColors.textSecondary}
                    keyboardType="phone-pad"
                    value={addForm.phone}
                    onChangeText={(t) => setAddForm({ ...addForm, phone: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Primary Service</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="SEO / Web / Video"
                    placeholderTextColor={themeColors.textSecondary}
                    value={addForm.primary_service}
                    onChangeText={(t) => setAddForm({ ...addForm, primary_service: t })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Website URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://acme.com"
                placeholderTextColor={themeColors.textSecondary}
                autoCapitalize="none"
                value={addForm.website_url}
                onChangeText={(t) => setAddForm({ ...addForm, website_url: t })}
              />

              <Text style={styles.inputLabel}>GST / Tax Number</Text>
              <TextInput
                style={styles.input}
                placeholder="GSTIN..."
                placeholderTextColor={themeColors.textSecondary}
                autoCapitalize="characters"
                value={addForm.gst_number}
                onChangeText={(t) => setAddForm({ ...addForm, gst_number: t })}
              />

              <Text style={styles.inputLabel}>Internal Notes / Contract Details</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Contract terms, deliverables, etc."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={3}
                value={addForm.notes}
                onChangeText={(t) => setAddForm({ ...addForm, notes: t })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleCreateClient}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Create Client</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 6. MODAL: EDIT CLIENT                                    */}
      {/* ======================================================== */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Client Profile</Text>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={true}>
              <Text style={styles.inputLabel}>Company Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.company_name}
                onChangeText={(t) => setEditForm({ ...editForm, company_name: t })}
              />

              <Text style={styles.inputLabel}>Contact Name *</Text>
              <TextInput
                style={styles.input}
                value={editForm.name}
                onChangeText={(t) => setEditForm({ ...editForm, name: t })}
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={editForm.email}
                autoCapitalize="none"
                onChangeText={(t) => setEditForm({ ...editForm, email: t })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {['Active', 'Inactive'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.filterChip,
                          editForm.status === st && {
                            backgroundColor: st === 'Active' ? '#16a34a' : '#dc2626',
                            borderColor: 'transparent',
                          },
                        ]}
                        onPress={() => setEditForm({ ...editForm, status: st })}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: editForm.status === st ? '#fff' : themeColors.textSecondary,
                          }}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Primary Service</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.primary_service}
                    onChangeText={(t) => setEditForm({ ...editForm, primary_service: t })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={editForm.phone}
                onChangeText={(t) => setEditForm({ ...editForm, phone: t })}
              />

              <Text style={styles.inputLabel}>Website URL</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                value={editForm.website_url}
                onChangeText={(t) => setEditForm({ ...editForm, website_url: t })}
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                numberOfLines={3}
                value={editForm.notes}
                onChangeText={(t) => setEditForm({ ...editForm, notes: t })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleUpdateClient}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
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
    clientCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBg,
      padding: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: '#2563eb22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#2563eb',
    },
    companyName: {
      fontSize: 14,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    contactName: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusActive: {
      backgroundColor: '#16a34a22',
    },
    statusInactive: {
      backgroundColor: '#dc262622',
    },
    statusText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    statusTextActive: {
      color: '#16a34a',
    },
    statusTextInactive: {
      color: '#dc2626',
    },
    divider: {
      height: 1,
      backgroundColor: themeColors.border,
      marginVertical: 10,
    },
    cardBody: {
      gap: 4,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    infoLabel: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      width: 60,
    },
    infoVal: {
      fontSize: 12,
      color: themeColors.textPrimary,
      flex: 1,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '700',
    },
    actionResetBtn: {
      borderColor: 'rgba(217, 119, 6, 0.3)',
      backgroundColor: 'rgba(217, 119, 6, 0.1)',
    },
    actionPriceBtn: {
      borderColor: 'rgba(22, 163, 74, 0.3)',
      backgroundColor: 'rgba(22, 163, 74, 0.1)',
    },
    actionPkgBtn: {
      borderColor: 'rgba(2, 132, 199, 0.3)',
      backgroundColor: 'rgba(2, 132, 199, 0.1)',
    },
    actionServicesBtn: {
      borderColor: 'rgba(99, 102, 241, 0.3)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    actionEditBtn: {
      borderColor: 'rgba(8, 145, 178, 0.3)',
      backgroundColor: 'rgba(8, 145, 178, 0.1)',
      paddingHorizontal: 7,
    },
    actionDeleteBtn: {
      borderColor: 'rgba(220, 38, 38, 0.3)',
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      paddingHorizontal: 7,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
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
    modalCloseFooterBtn: {
      width: '100%',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseFooterText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
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
      flex: 1.5,
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
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    detailLabel: {
      fontSize: 12,
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    detailVal: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.textPrimary,
      maxWidth: '65%',
      textAlign: 'right',
    },
    notesBox: {
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    packageSelectCard: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    packageSelectCardActive: {
      backgroundColor: '#16a34a',
      borderColor: '#16a34a',
    },
    pkgSelectTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    pkgSelectPrice: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    pkgDetailCard: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      marginBottom: 10,
    },
    pkgDetailName: {
      fontSize: 13.5,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    pkgDetailDesc: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    pkgPriceBadge: {
      backgroundColor: 'rgba(2, 132, 199, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignItems: 'center',
    },
    pkgPriceVal: {
      fontSize: 13,
      fontWeight: '800',
      color: '#0284c7',
    },
    pkgCycleVal: {
      fontSize: 9.5,
      color: '#0284c7',
      fontWeight: '600',
    },
    serviceItemCard: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    },
  });
}
