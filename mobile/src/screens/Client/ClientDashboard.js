import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pick } from '@react-native-documents/picker';
import Video from 'react-native-video';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchClientPackagesApi,
  fetchPackagesApi,
  purchasePackageApi,
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
  getApiUrl,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const { width } = Dimensions.get('window');

export default function ClientDashboard({ user, onLogout }) {
  const { isDark, toggleTheme, themeColors } = useTheme();
  const styles = getStyles(themeColors, isDark);

  // Navigation tabs: 'overview', 'packages', 'requests', 'seo', 'smo', 'ads', 'billing', 'notes', 'profile'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Client Data States
  const [activePackages, setActivePackages] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [seoReports, setSeoReports] = useState([]);
  const [smoRequests, setSmoRequests] = useState([]);
  const [adsCampaigns, setAdsCampaigns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [clientDetails, setClientDetails] = useState(null);

  // Package Card Expanders
  const [expandedPkgs, setExpandedPkgs] = useState({});
  const [expandedFeatures, setExpandedFeatures] = useState({});
  const [purchasingPkgId, setPurchasingPkgId] = useState(null);

  // Modals & Form States
  const [showBookServiceModal, setShowBookServiceModal] = useState(false);
  const [serviceType, setServiceType] = useState('SEO');
  const [serviceReqs, setServiceReqs] = useState('');
  const [submittingService, setSubmittingService] = useState(false);

  const [showSmoModal, setShowSmoModal] = useState(false);
  const [smoRequirements, setSmoRequirements] = useState('');
  const [submittingSmo, setSubmittingSmo] = useState(false);

  const [noteInput, setNoteInput] = useState('');
  const [noteAttachments, setNoteAttachments] = useState([]);
  const [uploadingNoteAttachments, setUploadingNoteAttachments] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  // Audio player state & ref
  const audioPlayerRef = useRef(null);
  const [audioPaused, setAudioPaused] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(true);

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isImageUrl = (url) => typeof url === 'string' && /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url);
  const isVideoUrl = (url) => typeof url === 'string' && /\.(mp4|webm|mov|ogg|mkv|3gp|avi)($|\?)/i.test(url);
  const isAudioUrl = (url) => typeof url === 'string' && /\.(mp3|wav|ogg|m4a|aac|flac)($|\?)/i.test(url);

  const handleOpenAttachment = (url) => {
    if (!url) {
      sweetAlert({ title: 'Attachment Missing', text: 'No attachment found for this item.', type: 'info' });
      return;
    }
    setPreviewError(false);
    setAudioPaused(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioLoading(true);
    setPreviewAttachmentUrl(url);
  };

  const handleClosePreview = () => {
    setPreviewAttachmentUrl(null);
    setPreviewError(false);
    setAudioPaused(true);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  };

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
      setLoading(true);

      const [
        myPkgsRes,
        allPkgsRes,
        reqsRes,
        seoRes,
        smoRes,
        adsRes,
        invsRes,
        notesRes,
        detailsRes,
      ] = await Promise.all([
        fetchClientPackagesApi(clientId).catch(() => ({ data: [] })),
        fetchPackagesApi(clientId).catch(() => ({ packages: [] })),
        fetchClientRequestsApi(clientId).catch(() => ({ data: [] })),
        fetchClientSeoReportsApi(clientId).catch(() => ({ data: [] })),
        fetchClientSmoGraphicsApi(clientId).catch(() => ({ data: [] })),
        fetchClientAdsApi(clientId).catch(() => ({ data: [] })),
        fetchClientInvoicesApi(clientId).catch(() => ({ invoices: [] })),
        fetchClientNotesApi(clientId).catch(() => ({ notes: [] })),
        fetchClientDetailsApi(clientId).catch(() => ({ data: null })),
      ]);

      if (myPkgsRes && myPkgsRes.success) {
        setActivePackages(myPkgsRes.data || []);
      }
      if (allPkgsRes && allPkgsRes.success) {
        setAllPackages(allPkgsRes.packages || []);
      }
      if (reqsRes && reqsRes.success) {
        setRequests(reqsRes.data || []);
      }
      if (seoRes && seoRes.success) {
        setSeoReports(seoRes.data || []);
      }
      if (smoRes && smoRes.success) {
        setSmoRequests(smoRes.data || []);
      }
      if (adsRes && adsRes.success) {
        setAdsCampaigns(adsRes.data || []);
      }
      if (invsRes && invsRes.success) {
        setInvoices(invsRes.invoices || invsRes.data || []);
      }
      if (notesRes && notesRes.success) {
        setNotes(notesRes.notes || notesRes.data || []);
      }
      if (detailsRes && detailsRes.success && detailsRes.data) {
        setClientDetails(detailsRes.data);
        setProfileForm({
          company_name: detailsRes.data.company_name || '',
          phone: detailsRes.data.phone || '',
          whatsapp: detailsRes.data.whatsapp || '',
          address: detailsRes.data.address || '',
          gst_number: detailsRes.data.gst_number || '',
          website_url: detailsRes.data.website_url || '',
          primary_service: detailsRes.data.primary_service || '',
        });
      }
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
      if (res && res.success) {
        sweetAlert({ title: 'Service Request Sent! 🚀', text: 'Our team will review and contact you shortly.', type: 'success' });
        setShowBookServiceModal(false);
        setServiceReqs('');
        fetchClientRequestsApi(clientId).then(r => r.success && setRequests(r.data || []));
      } else {
        throw new Error(res?.error || 'Failed to submit request');
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
      if (res && res.success) {
        sweetAlert({ title: 'Creative Request Sent! 🎨', text: 'Our design team has received your creative request.', type: 'success' });
        setShowSmoModal(false);
        setSmoRequirements('');
        fetchClientSmoGraphicsApi(clientId).then(r => r.success && setSmoRequests(r.data || []));
      } else {
        throw new Error(res?.error || 'Failed to submit SMO request');
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message || 'Could not submit request.', type: 'error' });
    } finally {
      setSubmittingSmo(false);
    }
  };

  // 3. Purchase / Activate Package
  const handleBuyPackage = (pkg) => {
    sweetAlert({
      title: 'Activate Subscription?',
      text: `Subscribe to "${pkg.name}" for $${pkg.price} / ${pkg.billing_cycle || 'Monthly'}? An invoice statement will be generated.`,
      type: 'info',
      showCancel: true,
      onConfirm: async () => {
        setPurchasingPkgId(pkg.id);
        try {
          const res = await purchasePackageApi(clientId, pkg.id);
          if (res && res.success) {
            sweetAlert({
              title: 'Package Activated! 🎉',
              text: res.message || 'Your package subscription is now active.',
              type: 'success',
            });
            loadAllData();
          } else {
            sweetAlert({
              title: 'Error',
              text: res?.error || 'Failed to activate package.',
              type: 'error',
            });
          }
        } catch (err) {
          sweetAlert({
            title: 'Error',
            text: 'Network error processing package activation.',
            type: 'error',
          });
        } finally {
          setPurchasingPkgId(null);
        }
      },
    });
  };

  // Pick Note Attachments
  const handlePickNoteAttachment = async () => {
    try {
      const res = await pick({
        type: ['*/*'],
        allowMultiSelection: true,
      });
      if (res && res.length > 0) {
        const oversized = res.some(f => (f.size || f.fileSize || 0) > 100 * 1024 * 1024);
        if (oversized) {
          sweetAlert({ title: 'File Too Large', text: 'Selected files must be less than or equal to 100MB.', type: 'warning' });
          return;
        }
        setNoteAttachments(prev => [...prev, ...res]);
      }
    } catch (e) {
      // User cancelled
    }
  };

  const handleRemoveNoteAttachment = (index) => {
    setNoteAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // 4. Submit Project Note
  const handleSendNote = async () => {
    if (!noteInput.trim() && noteAttachments.length === 0) return;
    setSubmittingNote(true);
    try {
      let attachmentUrls = [];
      if (noteAttachments.length > 0) {
        setUploadingNoteAttachments(true);
        const formData = new FormData();
        noteAttachments.forEach((file) => {
          const fileUri = file.uri || '';
          formData.append('files', {
            uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
            type: file.type || 'application/octet-stream',
            name: file.name || `file_${Date.now()}`
          });
        });

        const uploadRes = await fetch(`${getApiUrl()}/api/upload`, {
          method: 'POST',
          body: formData,
          headers: { 
            'Accept': 'application/json',
            'x-user-id': String(clientId || user?.id || '')
          },
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success && uploadData.fileUrls) {
          attachmentUrls = uploadData.fileUrls;
        } else {
          throw new Error(uploadData?.error || 'Failed to upload attachments');
        }
      }

      const attachmentStr = attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null;
      const res = await createClientNoteApi({
        client_id: clientId,
        note: noteInput.trim(),
        attachment: attachmentStr,
      });
      if (res && res.success) {
        setNoteInput('');
        setNoteAttachments([]);
        sweetAlert({ title: 'Note Sent! 💬', text: 'Your note and attachments have been delivered to your team leader.', type: 'success' });
        fetchClientNotesApi(clientId).then(r => r.success && setNotes(r.notes || r.data || []));
      } else {
        throw new Error(res?.error || 'Failed to send note');
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message || 'Could not send message.', type: 'error' });
    } finally {
      setSubmittingNote(false);
      setUploadingNoteAttachments(false);
    }
  };

  // 5. Save Profile Form
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await updateClientDetailsApi({
        client_id: clientId,
        ...profileForm,
      });
      if (res && res.success) {
        sweetAlert({ title: 'Profile Updated! ✅', text: 'Company details saved successfully.', type: 'success' });
        setShowEditProfileModal(false);
        loadAllData();
      } else {
        throw new Error(res?.error || 'Failed to update profile');
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
    if (s === 'rejected' || s === 'overdue' || s === 'expired') {
      return { bg: '#dc262622', text: '#ef4444', border: '#dc2626' };
    }
    return { bg: '#3b82f622', text: '#3b82f6', border: '#3b82f6' };
  };

  // Metrics for Overview
  const totalAdBudget = adsCampaigns.reduce((acc, ad) => acc + parseFloat(ad.total_budget || 0), 0);
  const totalAdSpent = adsCampaigns.reduce((acc, ad) => acc + parseFloat(ad.spent_amount || 0), 0);
  const pendingRequestsCount = requests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const latestSEO = seoReports.length > 0 ? seoReports[0] : null;

  const navMenuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: 'grid' },
    { id: 'packages', label: 'Subscription Packages', icon: 'box' },
    { id: 'requests', label: 'Book & Track Services', icon: 'tasks' },
    { id: 'seo', label: 'SEO Reports', icon: 'file' },
    { id: 'smo', label: 'SMO Graphics', icon: 'image' },
    { id: 'ads', label: 'PAID Ads (PPC)', icon: 'dollar' },
    { id: 'billing', label: 'Invoices & Billing', icon: 'ticket' },
    { id: 'notes', label: 'Project Notes & TL Chat', icon: 'chat' },
    { id: 'profile', label: 'Company Profile', icon: 'user' },
  ];

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
            <Text style={styles.headerTitle}>
              {clientDetails?.company_name || user?.name || 'Client Portal'}
            </Text>
            <Text style={[styles.headerSub, { color: themeColors.textSecondary }]}>
              {navMenuItems.find(m => m.id === activeTab)?.label || 'Client Experience Portal'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            sweetAlert({
              title: 'Log Out',
              text: 'Are you sure you want to log out of your client portal?',
              type: 'warning',
              showCancel: true,
              onConfirm: onLogout,
            });
          }}
        >
          <Text style={styles.logoutBtnText}>Log Out 🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content View */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading client dashboard...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          >
            {/* ======================================================== */}
            {/* 1. TAB: OVERVIEW                                         */}
            {/* ======================================================== */}
            {activeTab === 'overview' && (
              <View>
                {/* Welcome Banner */}
                <View style={styles.welcomeCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.welcomeTitle}>
                        Welcome back, {clientDetails?.company_name || user?.name || 'Valued Client'}!
                      </Text>
                      <Text style={styles.welcomeSub}>
                        Here's your live progress on digital campaigns, SEO rankings, and active deliverables.
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
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookServiceBtnText}>+ Book a New Service 🚀</Text>
                  </TouchableOpacity>
                </View>

                {/* 4 Stat Cards */}
                <View style={styles.metricsGrid}>
                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setActiveTab('packages')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.metricIconBox, { backgroundColor: '#2563eb22' }]}>
                      <AppIcon name="box" size={18} color="#2563eb" />
                    </View>
                    <Text style={[styles.metricVal, { color: '#2563eb' }]}>{activePackages.length}</Text>
                    <Text style={styles.metricLabel}>Active Subscriptions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setActiveTab('ads')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.metricIconBox, { backgroundColor: '#10b98122' }]}>
                      <AppIcon name="dollar" size={18} color="#10b981" />
                    </View>
                    <Text style={[styles.metricVal, { color: '#10b981' }]}>
                      ${totalAdSpent.toLocaleString()}
                    </Text>
                    <Text style={styles.metricLabel}>Total Ad Spend</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setActiveTab('requests')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.metricIconBox, { backgroundColor: '#f59e0b22' }]}>
                      <AppIcon name="tasks" size={18} color="#f59e0b" />
                    </View>
                    <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{pendingRequestsCount}</Text>
                    <Text style={styles.metricLabel}>Pending Requests</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setActiveTab('seo')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.metricIconBox, { backgroundColor: '#06b6d422' }]}>
                      <AppIcon name="file" size={18} color="#06b6d4" />
                    </View>
                    <Text style={[styles.metricVal, { color: '#06b6d4', fontSize: 13 }]} numberOfLines={1}>
                      {latestSEO ? `${latestSEO.month} ${latestSEO.year}` : 'N/A'}
                    </Text>
                    <Text style={styles.metricLabel}>Latest SEO Audit</Text>
                  </TouchableOpacity>
                </View>

                {/* Active Packages Strip */}
                {activePackages.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionHeading}>📦 Current Package Status</Text>
                      <TouchableOpacity onPress={() => setActiveTab('packages')}>
                        <Text style={styles.seeAllLink}>View All &rarr;</Text>
                      </TouchableOpacity>
                    </View>

                    {activePackages.map((pkg) => (
                      <View key={pkg.override_id || pkg.package_id || pkg.id} style={styles.packageCard}>
                        <View style={styles.pkgHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pkgName}>{pkg.name}</Text>
                            <Text style={styles.pkgCycle}>{pkg.billing_cycle || 'Monthly'} Plan</Text>
                          </View>
                          <View style={[styles.statusPill, pkg.is_expired ? styles.statusInactive : styles.statusActive]}>
                            <Text style={[styles.statusText, pkg.is_expired ? styles.statusTextInactive : styles.statusTextActive]}>
                              {pkg.is_expired ? 'Expired' : 'Active'}
                            </Text>
                          </View>
                        </View>
                        {pkg.valid_until_formatted ? (
                          <Text style={styles.pkgValidityText}>
                            🗓️ Valid Until: <Text style={{ fontWeight: '700' }}>{pkg.valid_until_formatted}</Text>
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Quick Marketing Hub Nav */}
                <Text style={[styles.sectionHeading, { marginTop: 18 }]}>🎯 Marketing Services Hub</Text>
                <View style={styles.marketingGrid}>
                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => setActiveTab('seo')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24 }}>📈</Text>
                    <Text style={styles.tileTitle}>SEO Reports</Text>
                    <Text style={styles.tileSub}>{seoReports.length} Reports Logged</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => setActiveTab('smo')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24 }}>🎨</Text>
                    <Text style={styles.tileTitle}>SMO Graphics</Text>
                    <Text style={styles.tileSub}>{smoRequests.length} Creatives</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => setActiveTab('ads')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24 }}>📢</Text>
                    <Text style={styles.tileTitle}>Paid Ads (PPC)</Text>
                    <Text style={styles.tileSub}>Google & Meta Ads</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.marketingTile}
                    onPress={() => setActiveTab('billing')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24 }}>🧾</Text>
                    <Text style={styles.tileTitle}>Invoices & Billing</Text>
                    <Text style={styles.tileSub}>{invoices.length} Statements</Text>
                  </TouchableOpacity>
                </View>

                {/* Recent Submissions */}
                <View style={{ marginTop: 16 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionHeading}>📝 Recent Service Requests</Text>
                    <TouchableOpacity onPress={() => setActiveTab('requests')}>
                      <Text style={styles.seeAllLink}>View All &rarr;</Text>
                    </TouchableOpacity>
                  </View>

                  {requests.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={{ fontSize: 28, marginBottom: 4 }}>📝</Text>
                      <Text style={styles.emptyTitle}>No Submissions Yet</Text>
                      <Text style={styles.emptySub}>Book a service to submit your requirements.</Text>
                    </View>
                  ) : (
                    requests.slice(0, 3).map((req) => {
                      const badge = getStatusBadge(req.status);
                      return (
                        <View key={req.id} style={styles.itemCard}>
                          <View style={styles.itemCardHeader}>
                            <Text style={styles.itemCardTitle}>{req.service_type || 'Service Request'}</Text>
                            <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                              <Text style={[styles.badgeText, { color: badge.text }]}>{req.status || 'Pending'}</Text>
                            </View>
                          </View>
                          <Text style={styles.itemDesc} numberOfLines={2}>{req.requirements}</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={styles.itemFooterDate}>
                              📅 {new Date(req.created_at || Date.now()).toLocaleDateString()}
                            </Text>
                            {req.tl_name ? (
                              <Text style={{ fontSize: 11, color: '#6366f1', fontWeight: '700' }}>
                                🛡️ TL: {req.tl_name}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* 2. TAB: PACKAGES & SUBSCRIPTIONS STORE                   */}
            {/* ======================================================== */}
            {activeTab === 'packages' && (
              <View>
                {/* Active Subscriptions Section */}
                {activePackages.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.sectionHeading}>⚡ Your Active Subscriptions</Text>
                    {activePackages.map((pkg) => (
                      <View key={pkg.override_id || pkg.package_id || pkg.id} style={styles.activePackageHeroCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.activePkgHeroTitle}>{pkg.name}</Text>
                            <Text style={styles.activePkgHeroCycle}>{pkg.billing_cycle || 'Monthly'} Plan</Text>
                          </View>
                          <View style={[styles.statusPill, pkg.is_expired ? styles.statusInactive : styles.statusActive]}>
                            <Text style={[styles.statusText, pkg.is_expired ? styles.statusTextInactive : styles.statusTextActive]}>
                              {pkg.is_expired ? 'Expired' : 'Active'}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                          <Text style={{ fontSize: 11.5, color: themeColors.textSecondary }}>
                            Started: {pkg.start_date_formatted || 'Active'}
                          </Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: pkg.is_expired ? '#ef4444' : '#10b981' }}>
                            Valid: {pkg.valid_until_formatted || 'Ongoing'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Available Packages Catalog */}
                <Text style={styles.sectionHeading}>📦 Available Subscription Packages</Text>
                {allPackages.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>📦</Text>
                    <Text style={styles.emptyTitle}>No Packages Available</Text>
                    <Text style={styles.emptySub}>Contact support for customized enterprise plans.</Text>
                  </View>
                ) : (
                  allPackages.map((pkg) => {
                    const isSubscribed = activePackages.some(
                      (ap) => String(ap.package_id) === String(pkg.id) && !ap.is_expired
                    );
                    const features = Array.isArray(pkg.features)
                      ? pkg.features
                      : typeof pkg.features === 'string'
                      ? pkg.features.replace(/<\/?[^>]+(>|$)/g, '\n').split('\n').map((f) => f.trim()).filter(Boolean)
                      : [];

                    const isExpanded = expandedPkgs[pkg.id];
                    const isFeatExpanded = expandedFeatures[pkg.id];

                    return (
                      <View key={pkg.id} style={styles.packageCard}>
                        <View style={styles.pkgHeader}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.pkgName}>{pkg.name}</Text>
                            <Text style={styles.pkgDesc}>
                              {pkg.description && pkg.description.length > 80
                                ? isExpanded
                                  ? pkg.description
                                  : `${pkg.description.slice(0, 80)}...`
                                : pkg.description}
                            </Text>
                            {pkg.description && pkg.description.length > 80 ? (
                              <TouchableOpacity onPress={() => setExpandedPkgs({ ...expandedPkgs, [pkg.id]: !isExpanded })}>
                                <Text style={{ color: '#2563eb', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                                  {isExpanded ? 'Read Less' : 'Read More'}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          <View style={styles.pkgPriceBadge}>
                            <Text style={styles.pkgPriceText}>${pkg.price}</Text>
                            <Text style={{ fontSize: 9.5, color: '#10b981', textAlign: 'center' }}>/{pkg.billing_cycle || 'Mo'}</Text>
                          </View>
                        </View>

                        {/* Features List */}
                        {features.length > 0 && (
                          <View style={styles.featuresList}>
                            {(isFeatExpanded ? features : features.slice(0, 4)).map((feat, fIdx) => (
                              <View key={fIdx} style={styles.featureItem}>
                                <Text style={{ color: '#10b981', marginRight: 6, fontWeight: 'bold' }}>✓</Text>
                                <Text style={styles.featureText}>{feat}</Text>
                              </View>
                            ))}
                            {features.length > 4 && (
                              <TouchableOpacity onPress={() => setExpandedFeatures({ ...expandedFeatures, [pkg.id]: !isFeatExpanded })}>
                                <Text style={{ color: '#2563eb', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                                  {isFeatExpanded ? 'View Less' : `+ ${features.length - 4} More Features`}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {/* Buy / Subscribed CTA */}
                        {isSubscribed ? (
                          <View style={styles.subscribedBtn}>
                            <Text style={styles.subscribedBtnText}>✓ Currently Subscribed</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.buyNowBtn}
                            onPress={() => handleBuyPackage(pkg)}
                            disabled={purchasingPkgId === pkg.id}
                            activeOpacity={0.8}
                          >
                            {purchasingPkgId === pkg.id ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <Text style={styles.buyNowBtnText}>Subscribe Now 🚀</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ======================================================== */}
            {/* 3. TAB: BOOK SERVICE & TRACK REQUESTS                    */}
            {/* ======================================================== */}
            {activeTab === 'requests' && (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionHeading}>📝 Service Requests ({requests.length})</Text>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => setShowBookServiceModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.smallActionBtnText}>+ Book Service</Text>
                  </TouchableOpacity>
                </View>

                {requests.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>📝</Text>
                    <Text style={styles.emptyTitle}>No Requests Submitted</Text>
                    <Text style={styles.emptySub}>Tap "+ Book Service" to submit your project requirements.</Text>
                  </View>
                ) : (
                  requests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <View key={req.id} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <Text style={styles.itemCardTitle}>📌 {req.service_type || 'Service Request'}</Text>
                          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                            <Text style={[styles.badgeText, { color: badge.text }]}>{req.status || 'Pending'}</Text>
                          </View>
                        </View>
                        <Text style={styles.itemDesc}>{req.requirements}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={styles.itemFooterDate}>
                            Submitted: {new Date(req.created_at || Date.now()).toLocaleDateString()}
                          </Text>
                          {req.tl_name ? (
                            <Text style={{ fontSize: 11, color: '#6366f1', fontWeight: '700' }}>
                              🛡️ Assigned TL: {req.tl_name}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ======================================================== */}
            {/* 4. TAB: SEO REPORTS                                      */}
            {/* ======================================================== */}
            {activeTab === 'seo' && (
              <View>
                <Text style={styles.sectionHeading}>📈 Monthly SEO Audit & Ranking Reports</Text>
                {seoReports.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>📊</Text>
                    <Text style={styles.emptyTitle}>No SEO Reports Published Yet</Text>
                    <Text style={styles.emptySub}>Monthly ranking and traffic reports will appear here.</Text>
                  </View>
                ) : (
                  seoReports.map((rep) => (
                    <View key={rep.id} style={styles.itemCard}>
                      <View style={styles.itemCardHeader}>
                        <View>
                          <Text style={styles.itemCardTitle}>
                            📄 {rep.month} {rep.year} SEO Audit Report
                          </Text>
                          <Text style={styles.itemCardSub}>
                            Published: {new Date(rep.created_at || Date.now()).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: '#10b98122', borderColor: '#10b981' }]}>
                          <Text style={[styles.badgeText, { color: '#10b981' }]}>{rep.status || 'Active'}</Text>
                        </View>
                      </View>
                      {rep.file_url ? (
                        <TouchableOpacity
                          style={styles.downloadLinkBtn}
                          onPress={() => Linking.openURL(rep.file_url).catch(() => {})}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.downloadLinkText}>📥 Open / Download Full Report</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ======================================================== */}
            {/* 5. TAB: SMO GRAPHICS                                     */}
            {/* ======================================================== */}
            {activeTab === 'smo' && (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionHeading}>🎨 Social Media Creatives & Banners</Text>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => setShowSmoModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.smallActionBtnText}>+ Request Graphic</Text>
                  </TouchableOpacity>
                </View>

                {smoRequests.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>🎨</Text>
                    <Text style={styles.emptyTitle}>No Creative Requests</Text>
                    <Text style={styles.emptySub}>Request promotional banners for Facebook, Instagram & LinkedIn.</Text>
                  </View>
                ) : (
                  smoRequests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <View key={req.id} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <Text style={styles.itemCardTitle}>🎨 Creative Request #{req.id}</Text>
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

            {/* ======================================================== */}
            {/* 6. TAB: PAID ADS (PPC)                                   */}
            {/* ======================================================== */}
            {activeTab === 'ads' && (
              <View>
                <Text style={styles.sectionHeading}>📢 PPC & Paid Ads Campaign Metrics</Text>
                {adsCampaigns.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>📢</Text>
                    <Text style={styles.emptyTitle}>No Active Paid Campaigns</Text>
                    <Text style={styles.emptySub}>Reach out to your campaign strategist to activate Google or Meta Ads.</Text>
                  </View>
                ) : (
                  adsCampaigns.map((ad) => {
                    const totalB = parseFloat(ad.total_budget || 0);
                    const spent = parseFloat(ad.spent_amount || 0);
                    const pct = totalB > 0 ? Math.min((spent / totalB) * 100, 100) : 0;

                    return (
                      <View key={ad.id} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <Text style={styles.itemCardTitle}>🎯 {ad.platform || 'Google Ads'}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
                            ${spent.toFixed(2)} / ${totalB.toFixed(2)}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${pct}%`, backgroundColor: pct > 90 ? '#dc2626' : '#2563eb' },
                            ]}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                          <Text style={{ fontSize: 11.5, color: themeColors.textSecondary }}>
                            Spent: <Text style={{ fontWeight: '700', color: '#dc2626' }}>${spent.toFixed(2)}</Text>
                          </Text>
                          <Text style={{ fontSize: 11.5, color: themeColors.textSecondary }}>
                            Remaining: <Text style={{ fontWeight: '700', color: '#10b981' }}>${parseFloat(ad.pending_balance || 0).toFixed(2)}</Text>
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ======================================================== */}
            {/* 7. TAB: INVOICES & BILLING                               */}
            {/* ======================================================== */}
            {activeTab === 'billing' && (
              <View>
                <Text style={styles.sectionHeading}>🧾 Invoices & Payment Records ({invoices.length})</Text>
                {invoices.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>🧾</Text>
                    <Text style={styles.emptyTitle}>No Invoices Issued</Text>
                    <Text style={styles.emptySub}>Statements will appear here upon subscription cycle renewal.</Text>
                  </View>
                ) : (
                  invoices.map((inv) => {
                    const badge = getStatusBadge(inv.status);
                    return (
                      <View key={inv.id} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <View>
                            <Text style={styles.itemCardTitle}>Invoice #{inv.id}</Text>
                            <Text style={styles.itemCardSub}>{inv.package_name || 'Service Package'}</Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                            <Text style={[styles.badgeText, { color: badge.text }]}>{inv.status || 'Pending'}</Text>
                          </View>
                        </View>

                        <View style={styles.invoiceAmountRow}>
                          <Text style={styles.invoiceAmountLabel}>Amount Due:</Text>
                          <Text style={styles.invoiceAmountVal}>${Number(inv.amount || 0).toLocaleString()}</Text>
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
                                  title: 'Online Payment',
                                  text: `Proceed to pay $${Number(inv.amount || 0).toLocaleString()} online?`,
                                  type: 'info',
                                  showCancel: true,
                                  onConfirm: () => {
                                    Linking.openURL('https://devicedesk.flymediatech.com/portal/client/billing').catch(() => {});
                                  },
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

            {/* ======================================================== */}
            {/* 8. TAB: PROJECT NOTES & TL DIRECT CHAT                   */}
            {/* ======================================================== */}
            {activeTab === 'notes' && (
              <View>
                <Text style={styles.sectionHeading}>💬 Project Notes & Team Updates</Text>
                <Text style={styles.sectionSubText}>
                  Send instant notes and feedback directly to your dedicated team leader.
                </Text>

                {/* Send Note Box */}
                <View style={styles.noteInputCard}>
                  <TextInput
                    style={styles.noteTextInput}
                    placeholder="Write a message or query for your account manager..."
                    placeholderTextColor={themeColors.textSecondary}
                    multiline
                    numberOfLines={3}
                    value={noteInput}
                    onChangeText={setNoteInput}
                  />

                  {/* Selected Attachments List */}
                  {noteAttachments.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {noteAttachments.map((att, idx) => (
                        <View key={idx} style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isDark ? '#1e293b' : '#eff6ff',
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isDark ? '#3b82f6' : '#bfdbfe',
                          gap: 6,
                          maxWidth: '100%'
                        }}>
                          <Text style={{ fontSize: 11, color: isDark ? '#93c5fd' : '#1d4ed8', maxWidth: 180 }} numberOfLines={1}>
                            📎 {att.name || `File ${idx + 1}`}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveNoteAttachment(idx)}>
                            <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold' }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions: Attach Files & Send Note */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? '#334155' : '#f1f5f9',
                        paddingVertical: 9,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isDark ? '#475569' : '#cbd5e1',
                        gap: 6
                      }}
                      onPress={handlePickNoteAttachment}
                      disabled={submittingNote || uploadingNoteAttachments}
                    >
                      <Text style={{ color: isDark ? '#f8fafc' : '#334155', fontSize: 12.5, fontWeight: '600' }}>
                        📎 Attach Files
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.sendNoteBtn, 
                        { flex: 1.2 },
                        (submittingNote || uploadingNoteAttachments) && styles.btnDisabled
                      ]}
                      onPress={handleSendNote}
                      disabled={submittingNote || uploadingNoteAttachments}
                    >
                      {submittingNote || uploadingNoteAttachments ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.sendNoteBtnText}>
                            {uploadingNoteAttachments ? 'Uploading...' : 'Sending...'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.sendNoteBtnText}>Send Note 📤</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Notes Stream */}
                {notes.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>💬</Text>
                    <Text style={styles.emptyTitle}>No Communication Notes Yet</Text>
                    <Text style={styles.emptySub}>Leave a note above to communicate directly with your team.</Text>
                  </View>
                ) : (
                  notes.map((n) => (
                    <View key={n.id} style={styles.noteCard}>
                      <View style={styles.noteClientRow}>
                        <Text style={styles.noteClientHeader}>You wrote:</Text>
                        <Text style={styles.noteDate}>
                          {new Date(n.created_at || Date.now()).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.noteText}>{n.note}</Text>

                      {/* Client Attachments */}
                      {n.attachment && (() => {
                        let urls = [];
                        try {
                          urls = JSON.parse(n.attachment);
                          if (!Array.isArray(urls)) urls = [n.attachment];
                        } catch(e) {
                          urls = [n.attachment];
                        }
                        return (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 4 }}>
                            {urls.map((url, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: isDark ? '#1e293b' : '#eff6ff',
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: isDark ? '#3b82f6' : '#bfdbfe',
                                  gap: 5
                                }}
                                onPress={() => handleOpenAttachment(url)}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#93c5fd' : '#2563eb' }}>
                                  📎 View Attachment {urls.length > 1 ? idx + 1 : ''}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        );
                      })()}

                      {n.tl_reply ? (
                        <View style={styles.replyBox}>
                          <Text style={styles.replyHeader}>🛡️ Team Leader Reply:</Text>
                          <Text style={styles.replyText}>{n.tl_reply}</Text>

                          {/* TL Reply Attachments */}
                          {n.tl_attachment && (() => {
                            let urls = [];
                            try {
                              urls = JSON.parse(n.tl_attachment);
                              if (!Array.isArray(urls)) urls = [n.tl_attachment];
                            } catch(e) {
                              urls = [n.tl_attachment];
                            }
                            return (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                {urls.map((url, idx) => (
                                  <TouchableOpacity
                                    key={idx}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      backgroundColor: isDark ? '#0f172a' : '#f0fdf4',
                                      paddingHorizontal: 10,
                                      paddingVertical: 6,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: isDark ? '#22c55e' : '#bbf7d0',
                                      gap: 5
                                    }}
                                    onPress={() => handleOpenAttachment(url)}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#86efac' : '#16a34a' }}>
                                      📎 View TL Attachment {urls.length > 1 ? idx + 1 : ''}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            );
                          })()}
                        </View>
                      ) : (
                        <Text style={styles.pendingReplyText}>⏳ Awaiting team response...</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ======================================================== */}
            {/* 9. TAB: COMPANY PROFILE                                  */}
            {/* ======================================================== */}
            {activeTab === 'profile' && (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionHeading}>🏢 Corporate Account Details</Text>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => setShowEditProfileModal(true)}
                  >
                    <Text style={styles.smallActionBtnText}>✏️ Edit Profile</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.profileCard}>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Company / Brand Name:</Text>
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

      {/* ======================================================== */}
      {/* HAMBURGER SIDEBAR / DRAWER                               */}
      {/* ======================================================== */}
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
              <Text style={[styles.drawerName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                {clientDetails?.company_name || user?.name || 'Client'}
              </Text>
              <Text style={[styles.drawerEmail, { color: themeColors.drawerSubtext }]} numberOfLines={1}>
                {user?.email || 'client@devicedesk.com'}
              </Text>
            </View>

            <ScrollView style={styles.drawerItemsContainer} showsVerticalScrollIndicator={false}>
              {navMenuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                    onPress={() => {
                      setActiveTab(item.id);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <AppIcon
                      name={item.icon}
                      size={18}
                      color={isActive ? '#2563eb' : themeColors.drawerItemText}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.drawerItemLabel,
                        { color: isActive ? '#2563eb' : themeColors.drawerItemText, fontWeight: isActive ? '800' : '600' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Theme Toggle */}
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  {
                    justifyContent: 'space-between',
                    marginTop: 14,
                    marginBottom: 14,
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleTheme}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name={isDark ? 'moon' : 'sun'} size={18} color={isDark ? '#f59e0b' : '#eab308'} style={{ marginRight: 10 }} />
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

      {/* ======================================================== */}
      {/* MODAL: BOOK NEW SERVICE                                  */}
      {/* ======================================================== */}
      <Modal
        visible={showBookServiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚀 Book a New Service</Text>
              <TouchableOpacity onPress={() => setShowBookServiceModal(false)}>
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Service Category *</Text>
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

            <Text style={styles.inputLabel}>Project Scope & Requirements *</Text>
            <TextInput
              style={[styles.input, styles.modalTextArea]}
              placeholder="Describe your goals, targets, or specific deliverables needed..."
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

      {/* ======================================================== */}
      {/* MODAL: REQUEST SMO GRAPHIC                               */}
      {/* ======================================================== */}
      <Modal
        visible={showSmoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSmoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎨 Request Social Media Creative</Text>
              <TouchableOpacity onPress={() => setShowSmoModal(false)}>
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Creative Requirements & Text Copy *</Text>
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

      {/* ======================================================== */}
      {/* MODAL: EDIT CORPORATE PROFILE                            */}
      {/* ======================================================== */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Corporate Details</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <AppIcon name="x" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true}>
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
                keyboardType="phone-pad"
                onChangeText={t => setProfileForm(p => ({ ...p, phone: t }))}
              />

              <Text style={styles.inputLabel}>WhatsApp Number</Text>
              <TextInput
                style={styles.input}
                value={profileForm.whatsapp}
                keyboardType="phone-pad"
                onChangeText={t => setProfileForm(p => ({ ...p, whatsapp: t }))}
              />

              <Text style={styles.inputLabel}>GST / Tax Number</Text>
              <TextInput
                style={styles.input}
                value={profileForm.gst_number}
                onChangeText={t => setProfileForm(p => ({ ...p, gst_number: t }))}
              />

              <Text style={styles.inputLabel}>Website URL</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                value={profileForm.website_url}
                onChangeText={t => setProfileForm(p => ({ ...p, website_url: t }))}
              />

              <Text style={styles.inputLabel}>Office Address</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={profileForm.address}
                onChangeText={t => setProfileForm(p => ({ ...p, address: t }))}
              />
            </ScrollView>

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
        </View>
      </Modal>

      {/* ATTACHMENT FULLSCREEN VIEWER MODAL */}
      <Modal
        visible={!!previewAttachmentUrl}
        transparent
        animationType="fade"
        onRequestClose={handleClosePreview}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.94)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16
        }}>
          {/* Top Bar with Open In Browser & Close Buttons */}
          <View style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 50 : 25,
            left: 20,
            right: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}
              onPress={() => previewAttachmentUrl && Linking.openURL(previewAttachmentUrl).catch(() => {})}
            >
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>Open External ↗</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                width: 38,
                height: 38,
                borderRadius: 19,
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onPress={handleClosePreview}
            >
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Media Display or Error Fallback */}
          {previewError ? (
            <View style={{ width: '100%', height: '70%', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <AppIcon name="warning" size={32} color="#ef4444" />
              </View>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>No Attachment Found</Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18, maxWidth: 280 }}>
                The attachment file could not be found or failed to load from the server.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.25)'
                }}
                onPress={() => previewAttachmentUrl && Linking.openURL(previewAttachmentUrl).catch(() => {})}
              >
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>Try Direct Link ↗</Text>
              </TouchableOpacity>
            </View>
          ) : isImageUrl(previewAttachmentUrl) ? (
            <View style={{ width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{ uri: previewAttachmentUrl }}
                style={{ width: '100%', height: '100%', borderRadius: 8 }}
                resizeMode="contain"
                onError={() => setPreviewError(true)}
              />
            </View>
          ) : isVideoUrl(previewAttachmentUrl) ? (
            <View style={{ width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' }}>
              <Video
                source={{ uri: previewAttachmentUrl }}
                style={{ width: '100%', height: '100%' }}
                controls={true}
                resizeMode="contain"
                paused={false}
                onError={() => setPreviewError(true)}
              />
            </View>
          ) : isAudioUrl(previewAttachmentUrl) ? (
            <View style={{ width: '100%', maxWidth: 350, backgroundColor: 'rgba(30, 41, 59, 0.95)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 }}>
              {/* Background Video engine powering audio */}
              <Video
                ref={audioPlayerRef}
                source={{ uri: previewAttachmentUrl }}
                style={{ width: 0, height: 0, position: 'absolute' }}
                paused={audioPaused}
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                onLoad={(data) => {
                  setAudioLoading(false);
                  setAudioDuration(data.duration || 0);
                }}
                onProgress={(data) => {
                  setAudioCurrentTime(data.currentTime || 0);
                }}
                onEnd={() => {
                  setAudioPaused(true);
                  setAudioCurrentTime(audioDuration);
                }}
                onError={() => {
                  setAudioLoading(false);
                  setPreviewError(true);
                }}
              />

              {/* Glowing Icon Header */}
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(236, 72, 153, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(236, 72, 153, 0.4)' }}>
                <Text style={{ fontSize: 34 }}>🎙️</Text>
              </View>

              <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '800', marginBottom: 4, textAlign: 'center' }}>
                Audio Recording
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, marginBottom: 20, textAlign: 'center', paddingHorizontal: 10 }} numberOfLines={1}>
                {previewAttachmentUrl.split('/').pop()}
              </Text>

              {/* Interactive Progress Bar */}
              <View style={{ width: '100%', height: 18, justifyContent: 'center', marginBottom: 4 }}>
                <View style={{ width: '100%', height: 6, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 3, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      backgroundColor: '#ec4899',
                      borderRadius: 3,
                      width: `${audioDuration > 0 ? Math.min(100, (audioCurrentTime / audioDuration) * 100) : 0}%`
                    }}
                  />
                </View>
              </View>

              {/* Time Indicators */}
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 12, fontWeight: '700' }}>
                  {formatAudioTime(audioCurrentTime)}
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontWeight: '600' }}>
                  {audioLoading ? 'Loading...' : formatAudioTime(audioDuration)}
                </Text>
              </View>

              {/* Audio Controls Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                {/* Replay Button */}
                <TouchableOpacity
                  style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => {
                    audioPlayerRef.current?.seek(0);
                    setAudioCurrentTime(0);
                    setAudioPaused(false);
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 17 }}>↺</Text>
                </TouchableOpacity>

                {/* Rewind 10s */}
                <TouchableOpacity
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => {
                    const newTime = Math.max(0, audioCurrentTime - 10);
                    audioPlayerRef.current?.seek(newTime);
                    setAudioCurrentTime(newTime);
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>-10s</Text>
                </TouchableOpacity>

                {/* Main Play / Pause Button */}
                <TouchableOpacity
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: '#ec4899',
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#ec4899',
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 6
                  }}
                  onPress={() => {
                    if (audioCurrentTime >= audioDuration && audioDuration > 0) {
                      audioPlayerRef.current?.seek(0);
                      setAudioCurrentTime(0);
                      setAudioPaused(false);
                    } else {
                      setAudioPaused(!audioPaused);
                    }
                  }}
                >
                  {audioLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <AppIcon name={audioPaused ? 'play' : 'pause'} size={24} color="#ffffff" />
                  )}
                </TouchableOpacity>

                {/* Forward 10s */}
                <TouchableOpacity
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => {
                    if (audioDuration > 0) {
                      const newTime = Math.min(audioDuration, audioCurrentTime + 10);
                      audioPlayerRef.current?.seek(newTime);
                      setAudioCurrentTime(newTime);
                    }
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>+10s</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : previewAttachmentUrl ? (
            <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59, 130, 246, 0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 30 }}>📄</Text>
              </View>
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 }}>
                Document Attachment
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, textAlign: 'center', marginBottom: 20, maxWidth: 260 }} numberOfLines={2}>
                {previewAttachmentUrl.split('/').pop()}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#ec4899',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#ec4899',
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4
                }}
                onPress={() => Linking.openURL(previewAttachmentUrl).catch(() => {})}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>Open / Download File ↗</Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    headerSub: {
      fontSize: 11,
      marginTop: 2,
    },
    logoutBtn: {
      backgroundColor: isDark ? '#334155' : '#fef2f2',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#fca5a5',
    },
    logoutBtnText: {
      fontSize: 11.5,
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
      fontSize: 13,
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
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 16,
    },
    welcomeTitle: {
      fontSize: 17,
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
      width: 42,
      height: 42,
      borderRadius: 12,
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
      borderRadius: 8,
      paddingVertical: 9,
      paddingHorizontal: 14,
      alignSelf: 'flex-start',
      marginTop: 12,
    },
    bookServiceBtnText: {
      color: '#ffffff',
      fontSize: 12.5,
      fontWeight: '700',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    metricCard: {
      width: (width - 42) / 2,
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    metricIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    metricVal: {
      fontSize: 18,
      fontWeight: '800',
    },
    metricLabel: {
      fontSize: 11,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    sectionHeading: {
      fontSize: 14.5,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 10,
    },
    sectionSubText: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginBottom: 12,
    },
    seeAllLink: {
      fontSize: 12,
      color: '#2563eb',
      fontWeight: '700',
    },
    marketingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    marketingTile: {
      width: (width - 42) / 2,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
    },
    tileTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginTop: 6,
    },
    tileSub: {
      fontSize: 10.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    packageCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 12,
    },
    activePackageHeroCard: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: '#2563eb44',
      borderLeftWidth: 4,
      borderLeftColor: '#2563eb',
      marginBottom: 10,
    },
    activePkgHeroTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    activePkgHeroCycle: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
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
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#10b981',
      alignItems: 'center',
    },
    pkgPriceText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#10b981',
    },
    pkgDesc: {
      fontSize: 12,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      lineHeight: 17,
      marginTop: 4,
    },
    pkgValidityText: {
      fontSize: 11.5,
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginTop: 6,
    },
    featuresList: {
      borderTopWidth: 1,
      borderTopColor: colors.border || (isDark ? '#334155' : '#f1f5f9'),
      paddingTop: 8,
      marginTop: 8,
      gap: 4,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureText: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      flex: 1,
    },
    buyNowBtn: {
      backgroundColor: '#2563eb',
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    buyNowBtnText: {
      color: '#ffffff',
      fontSize: 12.5,
      fontWeight: '700',
    },
    subscribedBtn: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border || '#cbd5e1',
    },
    subscribedBtnText: {
      color: '#10b981',
      fontSize: 12,
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
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      flex: 1,
      paddingRight: 6,
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
      fontSize: 12,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      lineHeight: 17,
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
    progressBarBg: {
      height: 6,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      borderRadius: 3,
      overflow: 'hidden',
      marginVertical: 4,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
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
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 14,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
    },
    emptyTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    emptySub: {
      fontSize: 11.5,
      color: colors.textSecondary || '#64748b',
      textAlign: 'center',
      marginTop: 4,
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
    drawerOverlay: {
      position: 'absolute',
      inset: 0,
      zIndex: 100,
      flexDirection: 'row',
    },
    drawerBackdrop: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    drawerContent: {
      width: '78%',
      maxWidth: 300,
      height: '100%',
      borderRightWidth: 1,
      paddingTop: 10,
    },
    drawerHeader: {
      padding: 16,
      borderBottomWidth: 1,
    },
    drawerAvatarContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    drawerAvatarText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '800',
    },
    drawerName: {
      fontSize: 15,
      fontWeight: '800',
    },
    drawerEmail: {
      fontSize: 11.5,
      marginTop: 2,
    },
    drawerItemsContainer: {
      flex: 1,
      padding: 12,
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
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
    },
    drawerItemLabel: {
      fontSize: 12.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    inputLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSecondary || '#64748b',
      marginTop: 8,
      marginBottom: 4,
    },
    input: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      fontSize: 13,
    },
    modalTextArea: {
      minHeight: 80,
    },
    serviceChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 6,
    },
    serviceChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
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
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
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
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    modalSubmitBtn: {
      flex: 1.5,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#2563eb',
      alignItems: 'center',
    },
    modalSubmitText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#ffffff',
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
