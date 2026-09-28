import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchClientPackagesApi,
  fetchClientRequestsApi,
  createClientRequestApi,
  fetchClientSeoReportsApi,
  fetchClientSmoGraphicsApi,
  createClientSmoRequestApi,
  fetchClientAdsApi,
  fetchClientInvoicesApi,
  fetchClientNotesApi,
  createClientNoteApi,
  fetchClientDetailsApi,
  updateClientDetailsApi,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ClientDashboard({ user, onLogout }) {
  const { isDark, toggleTheme, themeColors } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [activeTab, setActiveTab] = useState('overview'); // overview, requests, marketing, billing, notes, profile
  const [marketingSubTab, setMarketingSubTab] = useState('seo'); // seo, smo, ads
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Client Data States
  const [packages, setPackages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [seoReports, setSeoReports] = useState([]);
  const [smoRequests, setSmoRequests] = useState([]);
  const [adsCampaigns, setAdsCampaigns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [clientDetails, setClientDetails] = useState(null);

  // Modals & Form States
  const [showBookServiceModal, setShowBookServiceModal] = useState(false);
  const [serviceType, setServiceType] = useState('SEO');
  const [serviceReqs, setServiceReqs] = useState('');
  const [submittingService, setSubmittingService] = useState(false);

  const [showSmoModal, setShowSmoModal] = useState(false);
  const [smoRequirements, setSmoRequirements] = useState('');
  const [submittingSmo, setSubmittingSmo] = useState(false);

  const [noteInput, setNoteInput] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    gst_number: '',
    website_url: '',
    primary_service: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const clientId = user?.id || '';

  const loadAllData = useCallback(async () => {
    if (!clientId) return;
    try {
      // 1. Packages
      fetchClientPackagesApi(clientId)
        .then(res => res.success && setPackages(res.data || []))
        .catch(() => {});

      // 2. Service Requests
      fetchClientRequestsApi(clientId)
        .then(res => res.success && setRequests(res.data || []))
        .catch(() => {});

      // 3. SEO Reports
      fetchClientSeoReportsApi(clientId)
        .then(res => res.success && setSeoReports(res.data || []))
        .catch(() => {});

      // 4. SMO Graphics
      fetchClientSmoGraphicsApi(clientId)
        .then(res => res.success && setSmoRequests(res.data || []))
        .catch(() => {});

      // 5. Ads
      fetchClientAdsApi(clientId)
        .then(res => res.success && setAdsCampaigns(res.data || []))
        .catch(() => {});

      // 6. Invoices
      fetchClientInvoicesApi(clientId)
        .then(res => res.success && setInvoices(res.invoices || []))
        .catch(() => {});

      // 7. Notes
      fetchClientNotesApi(clientId)
        .then(res => res.success && setNotes(res.notes || []))
        .catch(() => {});

      // 8. Client Details
      fetchClientDetailsApi(clientId)
        .then(res => {
          if (res.success && res.data) {
            setClientDetails(res.data);
            setProfileForm({
              company_name: res.data.company_name || '',
              phone: res.data.phone || '',
              whatsapp: res.data.whatsapp || '',
              address: res.data.address || '',
              gst_number: res.data.gst_number || '',
              website_url: res.data.website_url || '',
              primary_service: res.data.primary_service || '',
            });
          }
        })
        .catch(() => {});
    } catch (err) {
      console.error('Error loading client portal data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // 1. Submit Service Request
  const handleBookService = async () => {
    if (!serviceReqs.trim()) {
      sweetAlert({ title: 'Missing Requirements', text: 'Please enter your project requirements.', type: 'warning' });
      return;
    }
    setSubmittingService(true);
    try {
      const res = await createClientRequestApi({
        clientId,
        service_type: serviceType,
        requirements: serviceReqs.trim(),
      });
      if (res.success) {
        sweetAlert({ title: 'Service Request Sent! 🚀', text: 'Our team will review and contact you shortly.', type: 'success' });
        setShowBookServiceModal(false);
        setServiceReqs('');
        fetchClientRequestsApi(clientId).then(r => r.success && setRequests(r.data || []));
      } else {
        throw new Error(res.error || 'Failed to submit request');
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message || 'Could not submit request.', type: 'error' });
    } finally {
      setSubmittingService(false);
    }
  };

  // 2. Submit SMO Graphic Request
  const handleCreateSmoRequest = async () => {
    if (!smoRequirements.trim()) {
      sweetAlert({ title: 'Missing Details', text: 'Please describe the graphic/post required.', type: 'warning' });
      return;
    }
    setSubmittingSmo(true);
    try {
      const res = await createClientSmoRequestApi({
        client_id: clientId,
        requirements: smoRequirements.trim(),
      });
      if (res.success) {
        sweetAlert({ title: 'Creative Request Sent! 🎨', text: 'Our design team has received your creative request.', type: 'success' });
        setShowSmoModal(false);
        setSmoRequirements('');
        fetchClientSmoGraphicsApi(clientId).then(r => r.success && setSmoRequests(r.data || []));
      } else {
        throw new Error(res.error || 'Failed to submit SMO request');
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message || 'Could not submit request.', type: 'error' });
    } finally {
      setSubmittingSmo(false);
    }
  };

  // 3. Submit Project Note
  const handleSendNote = async () => {
    if (!noteInput.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await createClientNoteApi({
        client_id: clientId,
        note: noteInput.trim(),
      });
      if (res.success) {
        setNoteInput('');
        fetchClientNotesApi(clientId).then(r => r.success && setNotes(r.notes || []));
      } else {
        throw new Error(res.error || 'Failed to send note');
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message || 'Could not send message.', type: 'error' });
    } finally {
      setSubmittingNote(false);
    }
  };

  // 4. Save Profile Form
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await updateClientDetailsApi({
        client_id: clientId,
        ...profileForm,
      });
      if (res.success) {
        sweetAlert({ title: 'Profile Updated! ✅', text: 'Company details saved successfully.', type: 'success' });
        setShowEditProfileModal(false);
        loadAllData();
      } else {
        throw new Error(res.error || 'Failed to update profile');
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message || 'Could not save profile.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'active' || s === 'completed' || s === 'paid' || s === 'approved') {
      return { bg: '#05966922', text: '#10b981', border: '#059669' };
    }
    if (s === 'in progress' || s === 'under review') {
      return { bg: '#d9770622', text: '#f59e0b', border: '#d97706' };
    }
    if (s === 'rejected' || s === 'overdue') {
      return { bg: '#dc262622', text: '#ef4444', border: '#dc2626' };
    }
    return { bg: '#3b82f622', text: '#3b82f6', border: '#3b82f6' };
  };

  // Calculation for Overview Metrics
  const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const pendingInvoices = invoices.filter(inv => (inv.status || '').toLowerCase() === 'pending');
  const pendingRequests = requests.filter(req => (req.status || '').toLowerCase() === 'pending');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={styles.hamburgerBtn}
          >
            <AppIcon name="menu" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Image
              source={isDark ? require('../../assets/flymedia_logo_white.png') : require('../../assets/flymedia_logo.png')}
              style={{ width: 130, height: 32 }}
              resizeMode="contain"
            />
            <Text style={[styles.headerSub, { color: themeColors.textSecondary, fontSize: 10 }]}>
              Client Experience Portal
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            sweetAlert({
              title: 'Log Out',
              text: 'Are you sure you want to log out of your client session?',
              type: 'warning',
              showCancel: true,
              onConfirm: onLogout,
            });
          }}
        >
          <Text style={styles.logoutBtnText}>Log Out 🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading client portal...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          >
            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <View>
                {/* Welcome Card */}
                <View style={styles.welcomeCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.welcomeTitle}>
                        Welcome, {clientDetails?.company_name || user?.name || 'Valued Client'}!
                      </Text>
                      <Text style={styles.welcomeSub}>
                        Manage your active digital marketing packages, SEO rankings, and billing statements.
                      </Text>
                    </View>
                    <View style={styles.avatarBubble}>
                      <Text style={styles.avatarText}>
                        {(clientDetails?.company_name || user?.name || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.bookServiceBtn}
                    onPress={() => setShowBookServiceModal(true)}
                  >
                    <Text style={styles.bookServiceBtnText}>+ Book New Service 🚀</Text>
                  </TouchableOpacity>
                </View>

                {/* Metrics Row */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: '#2563eb' }]}>{packages.length}</Text>
                    <Text style={styles.metricLabel}>Active Packages</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{pendingRequests.length}</Text>
                    <Text style={styles.metricLabel}>Pending Requests</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: '#10b981' }]}>₹{totalInvoicesAmount.toLocaleString()}</Text>
                    <Text style={styles.metricLabel}>Total Invoiced</Text>
                  </View>
                </View>

                {/* Quick Marketing Nav Cards */}
                <Text style={styles.sectionHeading}>🎯 Digital Marketing Hub</Text>
                <View style={styles.marketingGrid}>
                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => { setActiveTab('marketing'); setMarketingSubTab('seo'); }}
                  >
                    <Text style={{ fontSize: 24 }}>📈</Text>
                    <Text style={styles.tileTitle}>SEO Reports</Text>
                    <Text style={styles.tileSub}>{seoReports.length} Monthly Reports</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => { setActiveTab('marketing'); setMarketingSubTab('smo'); }}
                  >
                    <Text style={{ fontSize: 24 }}>🎨</Text>
                    <Text style={styles.tileTitle}>SMO Graphics</Text>
                    <Text style={styles.tileSub}>{smoRequests.length} Creatives Logged</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => { setActiveTab('marketing'); setMarketingSubTab('ads'); }}
                  >
                    <Text style={{ fontSize: 24 }}>📢</Text>
                    <Text style={styles.tileTitle}>Paid Ads (PPC)</Text>
                    <Text style={styles.tileSub}>Google & Meta Ads</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => setActiveTab('billing')}
                  >
                    <Text style={{ fontSize: 24 }}>🧾</Text>
                    <Text style={styles.tileTitle}>Invoices & Billing</Text>
                    <Text style={styles.tileSub}>{invoices.length} Statements</Text>
                  </TouchableOpacity>
                </View>

                {/* Active Packages List */}
                <Text style={[styles.sectionHeading, { marginTop: 20 }]}>📦 Your Active Packages ({packages.length})</Text>
                {packages.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>📦</Text>
                    <Text style={styles.emptyTitle}>No Active Packages</Text>
                    <Text style={styles.emptySub}>Contact your account manager or book a service to get started.</Text>
                  </View>
                ) : (
                  packages.map((pkg, idx) => (
                    <View key={pkg.override_id || pkg.package_id || idx} style={styles.packageCard}>
                      <View style={styles.pkgHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pkgName}>{pkg.name}</Text>
                          <Text style={styles.pkgCycle}>Cycle: {pkg.billing_cycle || 'Monthly'}</Text>
                        </View>
                        <View style={styles.pkgPriceBadge}>
                          <Text style={styles.pkgPriceText}>₹{Number(pkg.price || 0).toLocaleString()}</Text>
                        </View>
                      </View>

                      <Text style={styles.pkgDesc}>{pkg.description || 'Full digital marketing & optimization services.'}</Text>

                      {pkg.valid_until_formatted ? (
                        <View style={styles.pkgValidityRow}>
                          <Text style={styles.pkgValidityText}>
                            🗓️ Valid Until: <Text style={{ fontWeight: '700' }}>{pkg.valid_until_formatted}</Text>
                          </Text>
                        </View>
                      ) : null}

                      {Array.isArray(pkg.features_list) && pkg.features_list.length > 0 && (
                        <View style={styles.featuresList}>
                          {pkg.features_list.map((feat, fIdx) => (
                            <View key={fIdx} style={styles.featureItem}>
                              <Text style={{ color: '#10b981', marginRight: 6 }}>✓</Text>
                              <Text style={styles.featureText}>{feat}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB: MARKETING (SEO, SMO, ADS) */}
            {activeTab === 'marketing' && (
              <View>
                {/* Marketing Sub-Tabs */}
                <View style={styles.subTabRow}>
                  <TouchableOpacity
                    style={[styles.subTabBtn, marketingSubTab === 'seo' && styles.subTabBtnActive]}
                    onPress={() => setMarketingSubTab('seo')}
                  >
                    <Text style={[styles.subTabText, marketingSubTab === 'seo' && styles.subTabTextActive]}>
                      📈 SEO Reports ({seoReports.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subTabBtn, marketingSubTab === 'smo' && styles.subTabBtnActive]}
                    onPress={() => setMarketingSubTab('smo')}
                  >
                    <Text style={[styles.subTabText, marketingSubTab === 'smo' && styles.subTabTextActive]}>
                      🎨 SMO Graphics ({smoRequests.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subTabBtn, marketingSubTab === 'ads' && styles.subTabBtnActive]}
                    onPress={() => setMarketingSubTab('ads')}
                  >
                    <Text style={[styles.subTabText, marketingSubTab === 'ads' && styles.subTabTextActive]}>
                      📢 Paid Ads ({adsCampaigns.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sub Tab: SEO */}
                {marketingSubTab === 'seo' && (
                  <View>
                    <Text style={styles.sectionHeading}>Monthly Search Engine Optimization Reports</Text>
                    {seoReports.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={{ fontSize: 28, marginBottom: 6 }}>📊</Text>
                        <Text style={styles.emptyTitle}>No SEO Reports Published Yet</Text>
                        <Text style={styles.emptySub}>Monthly ranking and traffic reports will appear here.</Text>
                      </View>
                    ) : (
                      seoReports.map((rep, idx) => (
                        <View key={rep.id || idx} style={styles.itemCard}>
                          <View style={styles.itemCardHeader}>
                            <View>
                              <Text style={styles.itemCardTitle}>
                                📄 {rep.month} {rep.year} SEO Audit Report
                              </Text>
                              <Text style={styles.itemCardSub}>
                                Published on {new Date(rep.created_at || Date.now()).toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                          {rep.file_url ? (
                            <TouchableOpacity
                              style={styles.downloadLinkBtn}
                              onPress={() => Linking.openURL(rep.file_url).catch(() => {})}
                            >
                              <Text style={styles.downloadLinkText}>📥 Open / Download Full Report</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* Sub Tab: SMO */}
                {marketingSubTab === 'smo' && (
                  <View>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionHeading}>Social Media Graphics & Creatives</Text>
                      <TouchableOpacity
                        style={styles.smallActionBtn}
                        onPress={() => setShowSmoModal(true)}
                      >
                        <Text style={styles.smallActionBtnText}>+ Request Graphic</Text>
                      </TouchableOpacity>
                    </View>

                    {smoRequests.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={{ fontSize: 28, marginBottom: 6 }}>🎨</Text>
                        <Text style={styles.emptyTitle}>No SMO Creative Requests</Text>
                        <Text style={styles.emptySub}>Request custom promotional creatives for Facebook, Instagram & LinkedIn.</Text>
                      </View>
                    ) : (
                      smoRequests.map((req, idx) => {
                        const badge = getStatusBadge(req.status);
                        return (
                          <View key={req.id || idx} style={styles.itemCard}>
                            <View style={styles.itemCardHeader}>
                              <Text style={styles.itemCardTitle}>Creative #{req.id || idx + 1}</Text>
                              <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                                <Text style={[styles.badgeText, { color: badge.text }]}>{req.status || 'Pending'}</Text>
                              </View>
                            </View>
                            <Text style={styles.itemDesc}>{req.requirements}</Text>
                            <Text style={styles.itemFooterDate}>
                              Requested: {new Date(req.created_at || Date.now()).toLocaleDateString()}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* Sub Tab: Paid Ads */}
                {marketingSubTab === 'ads' && (
                  <View>
                    <Text style={styles.sectionHeading}>Google & Meta PPC Campaigns</Text>
                    {adsCampaigns.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={{ fontSize: 28, marginBottom: 6 }}>📢</Text>
                        <Text style={styles.emptyTitle}>No Active Paid Campaigns</Text>
                        <Text style={styles.emptySub}>Reach out to your campaign strategist to activate Google or Meta Ads.</Text>
                      </View>
                    ) : (
                      adsCampaigns.map((ad, idx) => (
                        <View key={ad.id || idx} style={styles.itemCard}>
                          <View style={styles.itemCardHeader}>
                            <Text style={styles.itemCardTitle}>🎯 {ad.platform || 'Google Ads'} Campaign</Text>
                            <View style={[styles.badge, { backgroundColor: '#10b98122', borderColor: '#10b981' }]}>
                              <Text style={[styles.badgeText, { color: '#10b981' }]}>{ad.status || 'Active'}</Text>
                            </View>
                          </View>
                          <Text style={styles.itemDesc}>{ad.campaign_name || ad.details || 'Targeted Lead Generation Campaign'}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}

            {/* TAB: INVOICES & BILLING */}
            {activeTab === 'billing' && (
              <View>
                <Text style={styles.sectionHeading}>Invoices & Payment History ({invoices.length})</Text>
                {invoices.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>🧾</Text>
                    <Text style={styles.emptyTitle}>No Invoices Issued</Text>
                    <Text style={styles.emptySub}>Your invoice statements will appear here upon subscription cycle renewal.</Text>
                  </View>
                ) : (
                  invoices.map((inv, idx) => {
                    const badge = getStatusBadge(inv.status);
                    return (
                      <View key={inv.id || idx} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <View>
                            <Text style={styles.itemCardTitle}>Invoice #{inv.id}</Text>
                            <Text style={styles.itemCardSub}>
                              Package: {inv.package_name || 'Digital Marketing Service'}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                            <Text style={[styles.badgeText, { color: badge.text }]}>{inv.status || 'Pending'}</Text>
                          </View>
                        </View>

                        <View style={styles.invoiceAmountRow}>
                          <Text style={styles.invoiceAmountLabel}>Amount Due:</Text>
                          <Text style={styles.invoiceAmountVal}>₹{Number(inv.amount || 0).toLocaleString()}</Text>
                        </View>

                        <View style={styles.rowBetween}>
                          <Text style={styles.itemFooterDate}>
                            Date: {new Date(inv.created_at || Date.now()).toLocaleDateString()}
                          </Text>
                          {(inv.status || '').toLowerCase() === 'pending' && (
                            <TouchableOpacity
                              style={styles.payNowBtn}
                              onPress={() => {
                                sweetAlert({
                                  title: 'Payment Gateway',
                                  text: `Proceed to pay ₹${Number(inv.amount || 0).toLocaleString()} via UPI / Online Gateway?`,
                                  type: 'info',
                                  showCancel: true,
                                  onConfirm: () => {
                                    Linking.openURL(`https://devicedesk.flymediatech.com/portal/client/billing`).catch(() => {});
                                  }
                                });
                              }}
                            >
                              <Text style={styles.payNowBtnText}>Pay Online 💳</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB: SERVICE REQUESTS */}
            {activeTab === 'requests' && (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionHeading}>Your Service Requests ({requests.length})</Text>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => setShowBookServiceModal(true)}
                  >
                    <Text style={styles.smallActionBtnText}>+ New Request</Text>
                  </TouchableOpacity>
                </View>

                {requests.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>📝</Text>
                    <Text style={styles.emptyTitle}>No Requests Submitted</Text>
                    <Text style={styles.emptySub}>Need website changes, SEO boost, or new creatives? Submit a request.</Text>
                  </View>
                ) : (
                  requests.map((req, idx) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <View key={req.id || idx} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <Text style={styles.itemCardTitle}>📌 {req.service_type || 'Service Request'}</Text>
                          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                            <Text style={[styles.badgeText, { color: badge.text }]}>{req.status || 'Pending'}</Text>
                          </View>
                        </View>
                        <Text style={styles.itemDesc}>{req.requirements}</Text>
                        <Text style={styles.itemFooterDate}>
                          Submitted: {new Date(req.created_at || Date.now()).toLocaleDateString()}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB: PROJECT NOTES / COMMUNICATION */}
            {activeTab === 'notes' && (
              <View>
                <Text style={styles.sectionHeading}>Project Notes & Direct Team Updates</Text>
                <Text style={styles.sectionSubText}>
                  Send instant notes and feedback directly to your dedicated team leader.
                </Text>

                {/* Send Note Box */}
                <View style={styles.noteInputCard}>
                  <TextInput
                    style={styles.noteTextInput}
                    placeholder="Write a note or query for your account manager..."
                    placeholderTextColor={themeColors.textSecondary}
                    multiline
                    numberOfLines={3}
                    value={noteInput}
                    onChangeText={setNoteInput}
                  />
                  <TouchableOpacity
                    style={[styles.sendNoteBtn, submittingNote && styles.btnDisabled]}
                    onPress={handleSendNote}
                    disabled={submittingNote}
                  >
                    {submittingNote ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.sendNoteBtnText}>Send Note 📤</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Notes Stream */}
                {notes.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>💬</Text>
                    <Text style={styles.emptyTitle}>No Communication Notes Yet</Text>
                    <Text style={styles.emptySub}>Leave a note above to communicate directly with your team.</Text>
                  </View>
                ) : (
                  notes.map((n, idx) => (
                    <View key={n.id || idx} style={styles.noteCard}>
                      <View style={styles.noteClientRow}>
                        <Text style={styles.noteClientHeader}>You wrote:</Text>
                        <Text style={styles.noteDate}>
                          {new Date(n.created_at || Date.now()).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.noteText}>{n.note}</Text>

                      {n.tl_reply ? (
                        <View style={styles.replyBox}>
                          <Text style={styles.replyHeader}>🛡️ Team Leader Reply:</Text>
                          <Text style={styles.replyText}>{n.tl_reply}</Text>
                        </View>
                      ) : (
                        <Text style={styles.pendingReplyText}>⏳ Awaiting team response...</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB: CLIENT PROFILE */}
            {activeTab === 'profile' && (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionHeading}>Company & Client Profile</Text>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => setShowEditProfileModal(true)}
                  >
                    <Text style={styles.smallActionBtnText}>✏️ Edit Details</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.profileCard}>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Company / Business Name:</Text>
                    <Text style={styles.profileVal}>{clientDetails?.company_name || 'Not Specified'}</Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Contact Person:</Text>
                    <Text style={styles.profileVal}>{user?.name || 'Client'}</Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Email Address:</Text>
                    <Text style={styles.profileVal}>{user?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Phone Number:</Text>
                    <Text style={styles.profileVal}>{clientDetails?.phone || 'Not Specified'}</Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>WhatsApp Number:</Text>
                    <Text style={styles.profileVal}>{clientDetails?.whatsapp || 'Not Specified'}</Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>GST / Tax Number:</Text>
                    <Text style={styles.profileVal}>{clientDetails?.gst_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Website URL:</Text>
                    <Text style={styles.profileVal}>{clientDetails?.website_url || 'N/A'}</Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Office Address:</Text>
                    <Text style={styles.profileVal}>{clientDetails?.address || 'Not Specified'}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Hamburger Drawer */}
      {isDrawerOpen && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
          <View style={[styles.drawerContent, { backgroundColor: themeColors.drawerBg, borderColor: themeColors.border }]}>
            <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border }]}>
              <View style={[styles.drawerAvatarContainer, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.drawerAvatarText}>
                  {(clientDetails?.company_name || user?.name || 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.drawerName, { color: themeColors.textPrimary }]}>
                {clientDetails?.company_name || user?.name || 'Client'}
              </Text>
              <Text style={[styles.drawerEmail, { color: themeColors.drawerSubtext }]}>
                {user?.email || 'client@devicedesk.com'}
              </Text>
            </View>

            <ScrollView style={styles.drawerItemsContainer}>
              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'overview' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('overview'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>📊</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Overview & Packages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'requests' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('requests'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>📝</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Service Requests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'marketing' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('marketing'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>🎯</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Digital Marketing Hub</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'billing' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('billing'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>🧾</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Invoices & Billing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'notes' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('notes'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>💬</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Project Notes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, activeTab === 'profile' && styles.drawerItemActive]}
                onPress={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
              >
                <Text style={styles.drawerItemIcon}>🏢</Text>
                <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Company Profile</Text>
              </TouchableOpacity>

              {/* Theme Toggle */}
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  {
                    justifyContent: 'space-between',
                    marginTop: 12,
                    marginBottom: 12,
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }
                ]}
                activeOpacity={0.8}
                onPress={toggleTheme}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name={isDark ? 'moon' : 'sun'} size={18} color={isDark ? '#f59e0b' : '#eab308'} style={{ marginRight: 12 }} />
                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText, fontWeight: '700' }]}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: themeColors.switchTrackFalse, true: themeColors.switchTrackTrue }}
                  thumbColor={themeColors.switchThumb}
                />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal: Book Service */}
      <Modal
        visible={showBookServiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Book a New Service</Text>
            <Text style={styles.modalSub}>Select service type and describe your deliverables or scope.</Text>

            <Text style={styles.inputLabel}>Service Type</Text>
            <View style={styles.serviceChips}>
              {['SEO', 'Social Media (SMO)', 'Google / Meta Ads', 'Website Development', 'Graphic Design'].map(st => (
                <TouchableOpacity
                  key={st}
                  style={[styles.serviceChip, serviceType === st && styles.serviceChipActive]}
                  onPress={() => setServiceType(st)}
                >
                  <Text style={[styles.serviceChipText, serviceType === st && styles.serviceChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Project Requirements & Details</Text>
            <TextInput
              style={[styles.input, styles.modalTextArea]}
              placeholder="Describe your goals, targets, or specific changes needed..."
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={serviceReqs}
              onChangeText={setServiceReqs}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowBookServiceModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingService && styles.btnDisabled]}
                onPress={handleBookService}
                disabled={submittingService}
              >
                {submittingService ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Request 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Request SMO Graphic */}
      <Modal
        visible={showSmoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSmoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request Social Media Graphic</Text>
            <Text style={styles.modalSub}>Describe the creative theme, text copy, or promotional banner needed.</Text>

            <Text style={styles.inputLabel}>Graphic Requirements / Caption</Text>
            <TextInput
              style={[styles.input, styles.modalTextArea]}
              placeholder="e.g. Festival post, 20% discount offer banner, new product launch..."
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={smoRequirements}
              onChangeText={setSmoRequirements}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSmoModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingSmo && styles.btnDisabled]}
                onPress={handleCreateSmoRequest}
                disabled={submittingSmo}
              >
                {submittingSmo ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Request Graphic 🎨</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Profile */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ padding: 16, justifyContent: 'center', flexGrow: 1 }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit Company Details</Text>

              <Text style={styles.inputLabel}>Company / Brand Name</Text>
              <TextInput
                style={styles.input}
                value={profileForm.company_name}
                onChangeText={t => setProfileForm(p => ({ ...p, company_name: t }))}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={profileForm.phone}
                onChangeText={t => setProfileForm(p => ({ ...p, phone: t }))}
              />

              <Text style={styles.inputLabel}>WhatsApp Number</Text>
              <TextInput
                style={styles.input}
                value={profileForm.whatsapp}
                onChangeText={t => setProfileForm(p => ({ ...p, whatsapp: t }))}
              />

              <Text style={styles.inputLabel}>GST Number</Text>
              <TextInput
                style={styles.input}
                value={profileForm.gst_number}
                onChangeText={t => setProfileForm(p => ({ ...p, gst_number: t }))}
              />

              <Text style={styles.inputLabel}>Website URL</Text>
              <TextInput
                style={styles.input}
                value={profileForm.website_url}
                onChangeText={t => setProfileForm(p => ({ ...p, website_url: t }))}
              />

              <Text style={styles.inputLabel}>Office Address</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                multiline
                value={profileForm.address}
                onChangeText={t => setProfileForm(p => ({ ...p, address: t }))}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowEditProfileModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, savingProfile && styles.btnDisabled]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Save Changes 💾</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background || (isDark ? '#0f172a' : '#f8fafc'),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || (isDark ? '#1e293b' : '#e2e8f0'),
      backgroundColor: colors.headerBg || (isDark ? '#1e293b' : '#ffffff'),
    },
    hamburgerBtn: {
      padding: 4,
    },
    headerSub: {
      fontWeight: '600',
    },
    logoutBtn: {
      backgroundColor: isDark ? '#334155' : '#fef2f2',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#fca5a5',
    },
    logoutBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#dc2626',
    },
    content: {
      flex: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary || '#64748b',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    welcomeCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    welcomeTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    welcomeSub: {
      fontSize: 12,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 4,
      lineHeight: 18,
    },
    avatarBubble: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#ffffff',
    },
    bookServiceBtn: {
      backgroundColor: '#2563eb',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignSelf: 'flex-start',
      marginTop: 14,
    },
    bookServiceBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    metricVal: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    metricLabel: {
      fontSize: 10.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 10,
    },
    sectionSubText: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginBottom: 12,
    },
    marketingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    marketingTile: {
      width: '48%',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    tileTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginTop: 8,
    },
    tileSub: {
      fontSize: 10.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    packageCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 12,
    },
    pkgHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    pkgName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    pkgCycle: {
      fontSize: 11,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    pkgPriceBadge: {
      backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#10b981',
    },
    pkgPriceText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#10b981',
    },
    pkgDesc: {
      fontSize: 12,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      lineHeight: 18,
      marginBottom: 10,
    },
    pkgValidityRow: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      padding: 8,
      borderRadius: 8,
      marginBottom: 8,
    },
    pkgValidityText: {
      fontSize: 11.5,
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    featuresList: {
      borderTopWidth: 1,
      borderTopColor: colors.border || (isDark ? '#334155' : '#f1f5f9'),
      paddingTop: 8,
      gap: 4,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureText: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
    },
    subTabRow: {
      flexDirection: 'row',
      backgroundColor: colors.headerBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 14,
      gap: 4,
    },
    subTabBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    subTabBtnActive: {
      backgroundColor: '#2563eb',
    },
    subTabText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
    },
    subTabTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    itemCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 10,
    },
    itemCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    itemCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    itemCardSub: {
      fontSize: 11,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    downloadLinkBtn: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      alignItems: 'center',
      marginTop: 8,
    },
    downloadLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2563eb',
    },
    itemDesc: {
      fontSize: 12.5,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      lineHeight: 18,
      marginBottom: 6,
    },
    itemFooterDate: {
      fontSize: 10.5,
      color: colors.textSecondary || '#64748b',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    invoiceAmountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      padding: 8,
      borderRadius: 8,
      marginVertical: 8,
    },
    invoiceAmountLabel: {
      fontSize: 12,
      color: colors.textSecondary || '#64748b',
    },
    invoiceAmountVal: {
      fontSize: 14,
      fontWeight: '800',
      color: '#10b981',
    },
    payNowBtn: {
      backgroundColor: '#10b981',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    payNowBtnText: {
      color: '#ffffff',
      fontSize: 11.5,
      fontWeight: '700',
    },
    noteInputCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 16,
    },
    noteTextInput: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      fontSize: 13,
      minHeight: 70,
      textAlignVertical: 'top',
      marginBottom: 10,
    },
    sendNoteBtn: {
      backgroundColor: '#2563eb',
      borderRadius: 8,
      paddingVertical: 9,
      alignItems: 'center',
    },
    sendNoteBtnText: {
      color: '#ffffff',
      fontSize: 12.5,
      fontWeight: '700',
    },
    noteCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 10,
    },
    noteClientRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    noteClientHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    noteDate: {
      fontSize: 10.5,
      color: colors.textSecondary || '#64748b',
    },
    noteText: {
      fontSize: 12.5,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      lineHeight: 18,
    },
    replyBox: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#2563eb',
    },
    replyHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: '#2563eb',
      marginBottom: 2,
    },
    replyText: {
      fontSize: 12,
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      lineHeight: 16,
    },
    pendingReplyText: {
      fontSize: 10.5,
      color: '#d97706',
      marginTop: 6,
      fontStyle: 'italic',
    },
    profileCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    profileRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || (isDark ? '#334155' : '#f1f5f9'),
    },
    profileLabel: {
      fontSize: 11,
      color: colors.textSecondary || '#64748b',
      fontWeight: '600',
    },
    profileVal: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginTop: 2,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    smallActionBtn: {
      backgroundColor: '#2563eb',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    smallActionBtnText: {
      color: '#ffffff',
      fontSize: 11.5,
      fontWeight: '700',
    },
    emptyCard: {
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      textAlign: 'center',
    },
    drawerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      zIndex: 1000,
    },
    drawerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawerContent: {
      width: 280,
      height: '100%',
      padding: 16,
      borderLeftWidth: 1,
    },
    drawerHeader: {
      alignItems: 'center',
      paddingVertical: 20,
      borderBottomWidth: 1,
      marginBottom: 14,
    },
    drawerAvatarContainer: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    drawerAvatarText: {
      fontSize: 22,
      fontWeight: '800',
      color: '#ffffff',
    },
    drawerName: {
      fontSize: 15,
      fontWeight: '800',
    },
    drawerEmail: {
      fontSize: 11,
      marginTop: 2,
    },
    drawerItemsContainer: {
      flex: 1,
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 4,
    },
    drawerItemActive: {
      backgroundColor: isDark ? '#1e3a8a33' : '#eff6ff',
    },
    drawerItemIcon: {
      fontSize: 16,
      marginRight: 12,
    },
    drawerItemLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    modalSub: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 4,
      marginTop: 8,
    },
    input: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      fontSize: 13,
    },
    modalTextArea: {
      minHeight: 90,
    },
    serviceChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    serviceChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    serviceChipActive: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
    serviceChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary || '#64748b',
    },
    serviceChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    modalButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
    },
    modalCancelText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    modalSubmitBtn: {
      flex: 1.5,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: '#2563eb',
    },
    modalSubmitText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
