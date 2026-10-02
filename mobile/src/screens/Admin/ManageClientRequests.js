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
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchClientRequestsApi,
  fetchEmployeesApi,
  fetchTasksApi,
  updateClientRequestApi,
  getApiUrl,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const { width, height } = Dimensions.get('window');

const STATUS_THEMES = {
  Pending: { bg: '#fef3c7', text: '#b45309', border: '#fde68a', darkBg: '#78350f44', darkText: '#fcd34d', dot: '#f59e0b' },
  'In Progress': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', darkBg: '#1e3a8a44', darkText: '#93c5fd', dot: '#3b82f6' },
  Completed: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', darkBg: '#14532d44', darkText: '#86efac', dot: '#10b981' },
  Cancelled: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', darkBg: '#7f1d1d44', darkText: '#fca5a5', dot: '#ef4444' },
};

const SERVICE_ICONS = {
  'Website Development': '🌐',
  'Web Development': '🌐',
  'Website': '🌐',
  'SEO': '📈',
  'SMO': '📱',
  'Social Media': '📱',
  'Google Ads': '🎯',
  'Mobile App': '📲',
  'Graphic Design': '🎨',
  'Custom Software': '💻',
};

// URL Resolver
function resolveMediaUrl(url) {
  if (!url) return '';
  const trimmed = `${url}`.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }
  const apiBase = (getApiUrl() || '').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${apiBase}${cleanPath}`;
}

// Attachments Parser
function parseAttachments(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(v => resolveMediaUrl(v)).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(v => resolveMediaUrl(v)).filter(Boolean);
        }
      } catch (e) {}
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => resolveMediaUrl(s.trim())).filter(Boolean);
    }
    return [resolveMediaUrl(trimmed)].filter(Boolean);
  }
  return [];
}

function isImageFile(url) {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.png') ||
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif') ||
    clean.startsWith('data:image/')
  );
}

function isPdfFile(url) {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.pdf');
}

function isAudioFile(url) {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.mp3') || clean.endsWith('.m4a') || clean.endsWith('.wav') || clean.endsWith('.aac');
}

function getFileName(url) {
  if (!url) return 'Attachment';
  const clean = url.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || 'Attachment';
}

function getFileExt(url) {
  if (!url) return 'FILE';
  const clean = url.split('?')[0];
  const parts = clean.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

export default function ManageClientRequests({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [requests, setRequests] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Assign TL Modal
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [targetReq, setTargetReq] = useState(null);
  const [savingTl, setSavingTl] = useState(false);

  // Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedReqAttachments, setSelectedReqAttachments] = useState([]);
  const [selectedReqDeliverables, setSelectedReqDeliverables] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Media Viewer
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, empRes, taskRes] = await Promise.all([
        fetchClientRequestsApi().catch(() => ({ data: [] })),
        fetchEmployeesApi().catch(() => ({ data: [] })),
        fetchTasksApi().catch(() => ({ data: [] })),
      ]);

      if (reqRes && reqRes.success) {
        setRequests(reqRes.data || []);
      } else if (Array.isArray(reqRes)) {
        setRequests(reqRes);
      } else if (reqRes && reqRes.data) {
        setRequests(reqRes.data);
      }

      if (empRes && empRes.success) {
        const tls = (empRes.data || []).filter(e => {
          const r = `${e.role || ''}`.toLowerCase();
          const dept = `${e.department || ''}`.toLowerCase();
          return (
            r.includes('leader') ||
            r === 'tl' ||
            r.includes('team lead') ||
            dept.includes('leader') ||
            e.isLeader
          ) && e.status !== 'Inactive';
        });
        setTeamLeaders(tls);
      }

      if (taskRes && taskRes.success) {
        setTasks(taskRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load client requests:', err);
      sweetAlert({
        title: 'Error',
        text: 'Failed to load client requests.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenAssignModal = (req) => {
    setTargetReq(req);
    setAssignModalVisible(true);
  };

  const handleAssignTL = async (tlId, tlName) => {
    if (!targetReq) return;
    try {
      setSavingTl(true);
      const res = await updateClientRequestApi({
        id: targetReq.id,
        assigned_tl_id: tlId || null,
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Success',
          text: tlName ? `Assigned to ${tlName}` : 'TL unassigned successfully',
          type: 'success',
        });
        setAssignModalVisible(false);
        setTargetReq(null);
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to assign Team Leader.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Failed to assign TL:', err);
      sweetAlert({
        title: 'Error',
        text: 'Network error while assigning TL.',
        type: 'error',
      });
    } finally {
      setSavingTl(false);
    }
  };

  const handleOpenDetailModal = (req) => {
    setSelectedReq(req);
    const clientFiles = parseAttachments(req.attachment || req.file_url || req.fileUrl);
    setSelectedReqAttachments(clientFiles);

    const matchingTask = tasks.find(t => t.project_id === req.id || t.id === req.id);
    let deliveryFiles = [];
    if (matchingTask && matchingTask.fileUrl) {
      deliveryFiles = parseAttachments(matchingTask.fileUrl);
    }
    setSelectedReqDeliverables(deliveryFiles);

    setDetailModalVisible(true);
  };

  const handleOpenMediaViewer = (files, initialIndex = 0) => {
    if (!files || files.length === 0) return;
    setMediaList(files);
    setActiveMediaIndex(initialIndex);
    setMediaViewerVisible(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedReq) return;
    try {
      setUpdatingStatus(true);
      const res = await updateClientRequestApi({
        id: selectedReq.id,
        status: newStatus,
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Updated',
          text: `Status updated to ${newStatus}`,
          type: 'success',
        });
        setSelectedReq(prev => ({ ...prev, status: newStatus }));
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to update status.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      sweetAlert({
        title: 'Error',
        text: 'Network error while updating status.',
        type: 'error',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const clientName = (req.client_name || req.clientId || '').toLowerCase();
    const serviceType = (req.service_type || '').toLowerCase();
    const requirements = (req.requirements || '').toLowerCase();
    const tlName = (req.tl_name || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesQuery = !q || clientName.includes(q) || serviceType.includes(q) || requirements.includes(q) || tlName.includes(q);
    if (!matchesQuery) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'Unassigned') return !req.assigned_tl_id;
    return (req.status || 'Pending').toLowerCase() === statusFilter.toLowerCase();
  });

  const totalCount = requests.length;
  const pendingCount = requests.filter(r => (r.status || 'Pending').toLowerCase() === 'pending').length;
  const inProgressCount = requests.filter(r => (r.status || '').toLowerCase() === 'in progress').length;
  const completedCount = requests.filter(r => (r.status || '').toLowerCase() === 'completed').length;
  const unassignedCount = requests.filter(r => !r.assigned_tl_id).length;

  const currentMediaUrl = mediaList[activeMediaIndex] || '';
  const currentMediaIsImage = isImageFile(currentMediaUrl);

  // Full-Screen Media Viewer Content
  const renderFullscreenMediaViewerContent = () => {
    if (!currentMediaUrl) return null;

    return (
      <View style={styles.fullscreenModalContainer}>
        <SafeAreaView edges={['top']} style={styles.fullscreenTopBar}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              {getFileName(currentMediaUrl)}
            </Text>
            <Text style={styles.fullscreenCounter}>
              File {activeMediaIndex + 1} of {mediaList.length}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={styles.openExternalBtn}
              onPress={() => Linking.openURL(currentMediaUrl).catch(() => sweetAlert({ title: 'Error', text: 'Cannot open link externally', type: 'error' }))}
              activeOpacity={0.7}
            >
              <Text style={styles.openExternalBtnText}>Open ↗</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeViewerBtn}
              onPress={() => setMediaViewerVisible(false)}
              activeOpacity={0.7}
            >
              <AppIcon name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Center Display */}
        <View style={styles.fullscreenBody}>
          {currentMediaIsImage ? (
            <View style={styles.imageDisplayBox}>
              <Image
                source={{ uri: currentMediaUrl }}
                style={styles.mainImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.docDisplayBox}>
              <View style={styles.docBigBadge}>
                <Text style={{ fontSize: 60 }}>
                  {isPdfFile(currentMediaUrl) ? '📄' : isAudioFile(currentMediaUrl) ? '🎵' : '📁'}
                </Text>
              </View>
              <Text style={styles.docDisplayName} numberOfLines={2}>
                {getFileName(currentMediaUrl)}
              </Text>
              <Text style={styles.docDisplaySub}>
                Type: {getFileExt(currentMediaUrl)} Document
              </Text>
              <TouchableOpacity
                style={styles.docActionBtn}
                onPress={() => Linking.openURL(currentMediaUrl).catch(() => sweetAlert({ title: 'Error', text: 'Cannot open document', type: 'error' }))}
                activeOpacity={0.8}
              >
                <Text style={styles.docActionBtnText}>Open in Device Viewer ↗</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Carousel Arrows */}
          {mediaList.length > 1 && (
            <>
              {activeMediaIndex > 0 && (
                <TouchableOpacity
                  style={[styles.arrowBtn, { left: 14 }]}
                  onPress={() => setActiveMediaIndex(prev => Math.max(0, prev - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.arrowBtnText}>‹</Text>
                </TouchableOpacity>
              )}

              {activeMediaIndex < mediaList.length - 1 && (
                <TouchableOpacity
                  style={[styles.arrowBtn, { right: 14 }]}
                  onPress={() => setActiveMediaIndex(prev => Math.min(mediaList.length - 1, prev + 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.arrowBtnText}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Bottom Thumbnail Bar */}
        {mediaList.length > 1 && (
          <SafeAreaView edges={['bottom']} style={styles.bottomThumbStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, alignItems: 'center' }}>
              {mediaList.map((mUrl, mIdx) => {
                const isActive = mIdx === activeMediaIndex;
                const isImg = isImageFile(mUrl);
                return (
                  <TouchableOpacity
                    key={mIdx}
                    style={[styles.thumbCard, isActive && styles.thumbCardActive]}
                    onPress={() => setActiveMediaIndex(mIdx)}
                    activeOpacity={0.8}
                  >
                    {isImg ? (
                      <Image source={{ uri: mUrl }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.thumbDoc}>
                        <Text style={{ fontSize: 16 }}>{isPdfFile(mUrl) ? '📄' : '📁'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
              <AppIcon name="arrow-left" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>📋 Client Service Requests</Text>
            <Text style={styles.headerSubtitle}>Assign TL & track client deliverables</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
          <AppIcon name="refresh" size={18} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Statistics Summary */}
        <View style={styles.statsGrid}>
          <View style={[styles.statPill, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.statPillVal}>{totalCount}</Text>
            <Text style={styles.statPillLabel}>Total</Text>
          </View>
          <View style={[styles.statPill, { borderLeftColor: '#f59e0b' }]}>
            <Text style={[styles.statPillVal, { color: '#f59e0b' }]}>{unassignedCount}</Text>
            <Text style={styles.statPillLabel}>Unassigned</Text>
          </View>
          <View style={[styles.statPill, { borderLeftColor: '#3b82f6' }]}>
            <Text style={[styles.statPillVal, { color: '#3b82f6' }]}>{inProgressCount}</Text>
            <Text style={styles.statPillLabel}>In Progress</Text>
          </View>
          <View style={[styles.statPill, { borderLeftColor: '#10b981' }]}>
            <Text style={[styles.statPillVal, { color: '#10b981' }]}>{completedCount}</Text>
            <Text style={styles.statPillLabel}>Completed</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <AppIcon name="search" size={18} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client, service, requirement, or TL..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <AppIcon name="close" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterTrack}>
          {['ALL', 'Unassigned', 'Pending', 'In Progress', 'Completed'].map(tab => {
            const isActive = statusFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterBtn,
                  isActive && styles.filterBtnActive,
                  isActive && { backgroundColor: themeColors.brandPrimary || '#2563eb' }
                ]}
                onPress={() => setStatusFilter(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>
                  {tab === 'ALL' ? 'All Requests' : tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Requests List */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.centerText}>Loading service requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>📭</Text>
            <Text style={styles.emptyCardTitle}>No Client Requests Found</Text>
            <Text style={styles.emptyCardSub}>
              {searchQuery ? 'Try adjusting your search query' : 'New client service requests will show up here'}
            </Text>
          </View>
        ) : (
          filteredRequests.map(req => {
            const stTheme = STATUS_THEMES[req.status] || STATUS_THEMES.Pending;
            const statusBg = isDark ? stTheme.darkBg : stTheme.bg;
            const statusColor = isDark ? stTheme.darkText : stTheme.text;
            const serviceIcon = SERVICE_ICONS[req.service_type] || '💼';
            const dateStr = req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const reqFiles = parseAttachments(req.attachment || req.file_url || req.fileUrl);

            return (
              <View key={req.id} style={styles.reqCard}>
                {/* Header Row: Client & Status */}
                <View style={styles.reqCardHeader}>
                  <View style={styles.clientGroup}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {(req.client_name || req.clientId || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.clientTitle} numberOfLines={1}>
                        {req.client_name || req.clientId}
                      </Text>
                      <Text style={styles.clientDate}>{dateStr}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusTag, { backgroundColor: statusBg, borderColor: stTheme.border }]}>
                    <View style={[styles.statusDot, { backgroundColor: stTheme.dot }]} />
                    <Text style={[styles.statusTagText, { color: statusColor }]}>
                      {req.status || 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* Service Tag & Attachments Quick Indicator */}
                <View style={styles.serviceRow}>
                  <View style={styles.servicePill}>
                    <Text style={{ fontSize: 13, marginRight: 6 }}>{serviceIcon}</Text>
                    <Text style={styles.servicePillText}>{req.service_type || 'Service'}</Text>
                  </View>

                  {reqFiles.length > 0 && (
                    <TouchableOpacity
                      style={styles.attachPill}
                      onPress={() => handleOpenMediaViewer(reqFiles, 0)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.attachPillText}>
                        📎 {reqFiles.length} {reqFiles.length === 1 ? 'Attachment' : 'Attachments'} 👁️
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Requirements Snippet */}
                <Text style={styles.reqSnippet} numberOfLines={3}>
                  {req.requirements}
                </Text>

                {/* Attachments Preview Strip */}
                {reqFiles.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {reqFiles.map((fUrl, fIdx) => {
                        const isImg = isImageFile(fUrl);
                        return (
                          <TouchableOpacity
                            key={fIdx}
                            style={styles.stripCard}
                            onPress={() => handleOpenMediaViewer(reqFiles, fIdx)}
                            activeOpacity={0.8}
                          >
                            {isImg ? (
                              <Image source={{ uri: fUrl }} style={styles.stripCardImg} resizeMode="cover" />
                            ) : (
                              <View style={[styles.stripCardDoc, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
                                <Text style={{ fontSize: 14 }}>{isPdfFile(fUrl) ? '📄' : isAudioFile(fUrl) ? '🎵' : '📁'}</Text>
                                <Text style={styles.stripCardExt}>{getFileExt(fUrl)}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                {/* Assigned TL Strip */}
                <View style={[styles.tlBar, !req.assigned_tl_id && styles.tlBarUnassigned]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 16 }}>{req.assigned_tl_id ? '👔' : '⚠️'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tlBarLabel}>Assigned Team Leader:</Text>
                      <Text style={[styles.tlBarVal, !req.assigned_tl_id && { color: '#f59e0b', fontStyle: 'italic' }]} numberOfLines={1}>
                        {req.tl_name || (req.assigned_tl_id ? 'Team Leader' : 'Unassigned (Action Required)')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.assignActionBtn, !req.assigned_tl_id && styles.assignActionBtnUrgent]}
                    onPress={() => handleOpenAssignModal(req)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.assignActionBtnText, !req.assigned_tl_id && { color: '#ffffff' }]}>
                      {req.assigned_tl_id ? 'Reassign ⇄' : 'Assign TL +'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Card Action Button */}
                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => handleOpenDetailModal(req)}
                  activeOpacity={0.7}
                >
                  <AppIcon name="eye" size={15} color="#3b82f6" />
                  <Text style={styles.viewDetailsBtnText}>View Full Requirement & Deliverables</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ASSIGN TEAM LEADER MODAL */}
      <Modal visible={assignModalVisible} transparent animationType="slide" onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text style={{ fontSize: 20 }}>👔</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Assign Team Leader</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    Client: {targetReq?.client_name || targetReq?.clientId} · {targetReq?.service_type}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)} style={styles.closeBtn} activeOpacity={0.7}>
                <AppIcon name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {savingTl ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ marginTop: 12, color: themeColors.textSecondary, fontWeight: '600' }}>
                  Updating assignment...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380, paddingHorizontal: 16 }}>
                <Text style={styles.subHeading}>Choose a Team Leader to delegate this client:</Text>

                {/* Unassign Option */}
                <TouchableOpacity
                  style={[
                    styles.tlCard,
                    !targetReq?.assigned_tl_id && styles.tlCardSelected,
                    { borderColor: '#ef4444' }
                  ]}
                  onPress={() => handleAssignTL(null, null)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tlAvatar, { backgroundColor: '#fee2e2' }]}>
                    <Text style={{ fontSize: 16 }}>⚠️</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.tlName, { color: '#ef4444' }]}>Leave Unassigned</Text>
                    <Text style={styles.tlRole}>Remove current TL assignment</Text>
                  </View>
                  {!targetReq?.assigned_tl_id && (
                    <View style={[styles.radioDot, { backgroundColor: '#ef4444' }]}>
                      <AppIcon name="check" size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>

                {teamLeaders.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: themeColors.textSecondary, textAlign: 'center' }}>
                      No active Team Leaders found in staff list.
                    </Text>
                  </View>
                ) : (
                  teamLeaders.map(tl => {
                    const isSelected = targetReq?.assigned_tl_id === tl.id;
                    return (
                      <TouchableOpacity
                        key={tl.id}
                        style={[styles.tlCard, isSelected && styles.tlCardSelected]}
                        onPress={() => handleAssignTL(tl.id, tl.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.tlAvatar}>
                          <Text style={styles.tlAvatarText}>{(tl.name || 'T').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.tlName}>{tl.name}</Text>
                          <Text style={styles.tlRole}>
                            {tl.role || 'Team Leader'} {tl.department ? `· ${tl.department}` : ''}
                          </Text>
                          {tl.email ? <Text style={styles.tlEmail}>{tl.email}</Text> : null}
                        </View>
                        {isSelected && (
                          <View style={styles.radioDot}>
                            <AppIcon name="check" size={14} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelFooterBtn} onPress={() => setAssignModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.cancelFooterBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL REQUIREMENT & DELIVERABLES DETAIL / FULLSCREEN MEDIA MODAL */}
      <Modal
        visible={detailModalVisible || mediaViewerVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => {
          if (mediaViewerVisible) {
            setMediaViewerVisible(false);
          } else {
            setDetailModalVisible(false);
          }
        }}
      >
        {mediaViewerVisible ? (
          renderFullscreenMediaViewerContent()
        ) : detailModalVisible ? (
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Request Details & Attachments</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedReq?.service_type} · {selectedReq?.client_name || selectedReq?.clientId}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn} activeOpacity={0.7}>
                  <AppIcon name="close" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                {/* Overview Card */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>Client Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Client Name:</Text>
                    <Text style={styles.infoVal}>{selectedReq?.client_name || selectedReq?.clientId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Service Booked:</Text>
                    <Text style={[styles.infoVal, { color: '#3b82f6', fontWeight: '700' }]}>{selectedReq?.service_type}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Submitted Date:</Text>
                    <Text style={styles.infoVal}>
                      {selectedReq?.created_at ? new Date(selectedReq.created_at).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Status Update Card */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>Update Request Status</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {['Pending', 'In Progress', 'Completed', 'Cancelled'].map(st => {
                      const isSelected = (selectedReq?.status || 'Pending').toLowerCase() === st.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.statusSelector,
                            isSelected && styles.statusSelectorActive,
                            isSelected && { backgroundColor: st === 'Completed' ? '#10b981' : st === 'In Progress' ? '#3b82f6' : st === 'Cancelled' ? '#ef4444' : '#f59e0b' }
                          ]}
                          onPress={() => handleUpdateStatus(st)}
                          disabled={updatingStatus}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.statusSelectorText, isSelected && { color: '#ffffff' }]}>
                            {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Full Requirements */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>Requirements Description</Text>
                  <View style={styles.descBox}>
                    <Text style={styles.descText} selectable={true}>
                      {selectedReq?.requirements || 'No description provided.'}
                    </Text>
                  </View>
                </View>

                {/* Client Attachments Section */}
                <View style={styles.sectionCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.sectionLabel}>Client Attachments ({selectedReqAttachments.length})</Text>
                    {selectedReqAttachments.length > 0 && (
                      <TouchableOpacity onPress={() => handleOpenMediaViewer(selectedReqAttachments, 0)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>View All 👁️</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {selectedReqAttachments.length === 0 ? (
                    <Text style={{ fontSize: 12.5, color: themeColors.textSecondary, fontStyle: 'italic', paddingVertical: 4 }}>
                      No attachments provided by client.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {selectedReqAttachments.map((fUrl, idx) => {
                        const isImg = isImageFile(fUrl);
                        const isPdf = isPdfFile(fUrl);
                        const isAud = isAudioFile(fUrl);
                        const fileName = getFileName(fUrl);
                        const ext = getFileExt(fUrl);

                        return (
                          <View key={idx} style={[styles.fileCard, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
                            {isImg ? (
                              <TouchableOpacity
                                style={styles.fileThumbBox}
                                onPress={() => handleOpenMediaViewer(selectedReqAttachments, idx)}
                                activeOpacity={0.8}
                              >
                                <Image source={{ uri: fUrl }} style={styles.fileThumbImg} resizeMode="cover" />
                                <View style={styles.zoomBadge}>
                                  <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: '800' }}>🔍 Zoom</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.fileIconBox}>
                                <Text style={{ fontSize: 24 }}>{isPdf ? '📄' : isAud ? '🎵' : '📁'}</Text>
                                <View style={styles.fileExtPill}>
                                  <Text style={styles.fileExtPillText}>{ext}</Text>
                                </View>
                              </View>
                            )}

                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.fileNameText, { color: themeColors.textPrimary }]} numberOfLines={2}>
                                {fileName}
                              </Text>
                              <Text style={[styles.fileSubText, { color: themeColors.textSecondary }]}>
                                {isImg ? 'Image Attachment' : isPdf ? 'PDF Document' : isAud ? 'Audio Note' : 'Attached File'}
                              </Text>

                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                <TouchableOpacity
                                  style={styles.cardViewBtn}
                                  onPress={() => handleOpenMediaViewer(selectedReqAttachments, idx)}
                                  activeOpacity={0.8}
                                >
                                  <AppIcon name="eye" size={13} color="#3b82f6" />
                                  <Text style={styles.cardViewBtnText}>View</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.cardViewBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: themeColors.border }]}
                                  onPress={() => Linking.openURL(fUrl).catch(() => sweetAlert({ title: 'Error', text: 'Cannot open attachment externally', type: 'error' }))}
                                  activeOpacity={0.8}
                                >
                                  <Text style={{ fontSize: 11, color: themeColors.textPrimary, fontWeight: '700' }}>Open ↗</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Assigned TL Section */}
                <View style={styles.sectionCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.sectionLabel}>Assigned Team Leader</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setDetailModalVisible(false);
                        handleOpenAssignModal(selectedReq);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>Change TL →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 14, color: themeColors.textPrimary, fontWeight: '700', marginTop: 4 }}>
                    {selectedReq?.tl_name || (selectedReq?.assigned_tl_id ? 'Team Leader' : '⚠️ Unassigned')}
                  </Text>
                </View>

                {/* Deliverables Section */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>Project Deliverables & Proofs ({selectedReqDeliverables.length})</Text>
                  {selectedReqDeliverables.length === 0 ? (
                    <Text style={{ fontSize: 12.5, color: themeColors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                      No delivery proof files uploaded yet.
                    </Text>
                  ) : (
                    <View style={{ gap: 8, marginTop: 6 }}>
                      {selectedReqDeliverables.map((file, idx) => {
                        const isImg = isImageFile(file);
                        const isPdf = isPdfFile(file);
                        const fileName = getFileName(file);

                        return (
                          <View key={idx} style={[styles.fileCard, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
                            {isImg ? (
                              <TouchableOpacity
                                style={styles.fileThumbBox}
                                onPress={() => handleOpenMediaViewer(selectedReqDeliverables, idx)}
                                activeOpacity={0.8}
                              >
                                <Image source={{ uri: file }} style={styles.fileThumbImg} resizeMode="cover" />
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.fileIconBox}>
                                <Text style={{ fontSize: 24 }}>{isPdf ? '📄' : '📦'}</Text>
                                <View style={styles.fileExtPill}>
                                  <Text style={styles.fileExtPillText}>{getFileExt(file)}</Text>
                                </View>
                              </View>
                            )}

                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.fileNameText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                {fileName}
                              </Text>
                              <Text style={[styles.fileSubText, { color: themeColors.textSecondary }]}>
                                Proof Deliverable #{idx + 1}
                              </Text>

                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                                <TouchableOpacity
                                  style={styles.cardViewBtn}
                                  onPress={() => handleOpenMediaViewer(selectedReqDeliverables, idx)}
                                  activeOpacity={0.8}
                                >
                                  <AppIcon name="eye" size={13} color="#3b82f6" />
                                  <Text style={styles.cardViewBtnText}>View</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.cardViewBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: themeColors.border }]}
                                  onPress={() => Linking.openURL(file).catch(() => sweetAlert({ title: 'Error', text: 'Cannot open deliverable externally', type: 'error' }))}
                                  activeOpacity={0.8}
                                >
                                  <Text style={{ fontSize: 11, color: themeColors.textPrimary, fontWeight: '700' }}>Open ↗</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={{ height: 24 }} />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelFooterBtn} onPress={() => setDetailModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.cancelFooterBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (themeColors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    backBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 1,
    },
    refreshBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    statPill: {
      width: '48.5%',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderLeftWidth: 4,
      alignItems: 'flex-start',
    },
    statPillVal: {
      fontSize: 16,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    statPillLabel: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 12,
      height: 44,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13.5,
      color: themeColors.textPrimary,
      padding: 0,
    },
    filterScroll: {
      marginBottom: 16,
    },
    filterTrack: {
      gap: 8,
      flexDirection: 'row',
    },
    filterBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    filterBtnActive: {
      borderColor: '#3b82f6',
    },
    filterBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    filterBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    centerBox: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerText: {
      marginTop: 10,
      fontSize: 13,
      color: themeColors.textSecondary,
    },
    emptyCard: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      marginTop: 20,
    },
    emptyCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    emptyCardSub: {
      fontSize: 12,
      color: themeColors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      maxWidth: 240,
    },
    reqCard: {
      backgroundColor: themeColors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 14,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    reqCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    clientGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    clientAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    clientAvatarText: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#93c5fd' : '#1e40af',
    },
    clientTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textPrimary,
      flexShrink: 1,
    },
    clientDate: {
      fontSize: 11,
      color: themeColors.textSecondary,
      marginTop: 1,
    },
    statusTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      flexShrink: 0,
      alignSelf: 'flex-start',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusTagText: {
      fontSize: 11,
      fontWeight: '700',
    },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      flexWrap: 'wrap',
      gap: 8,
    },
    servicePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      maxWidth: '100%',
    },
    servicePillText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textPrimary,
      flexShrink: 1,
    },
    attachPill: {
      backgroundColor: isDark ? '#1e3a8a33' : '#eff6ff',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#3b82f644' : '#bfdbfe',
    },
    attachPillText: {
      fontSize: 11,
      color: '#3b82f6',
      fontWeight: '800',
    },
    reqSnippet: {
      fontSize: 13,
      color: themeColors.textSecondary,
      lineHeight: 18,
      marginBottom: 12,
    },
    stripCard: {
      width: 52,
      height: 52,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    stripCardImg: {
      width: '100%',
      height: '100%',
    },
    stripCardDoc: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stripCardExt: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#3b82f6',
      marginTop: 2,
    },
    tlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: 10,
      flexWrap: 'wrap',
      gap: 8,
    },
    tlBarUnassigned: {
      backgroundColor: isDark ? '#451a0322' : '#fffbeb',
      borderColor: isDark ? '#78350f' : '#fde68a',
    },
    tlBarLabel: {
      fontSize: 10,
      color: themeColors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    tlBarVal: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textPrimary,
      marginTop: 1,
      flexShrink: 1,
    },
    assignActionBtn: {
      backgroundColor: isDark ? '#1e293b' : '#eff6ff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3b82f6',
      alignSelf: 'flex-end',
    },
    assignActionBtnUrgent: {
      backgroundColor: '#f59e0b',
      borderColor: '#d97706',
    },
    assignActionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#3b82f6',
    },
    viewDetailsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      marginTop: 4,
    },
    viewDetailsBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#3b82f6',
    },
    // Modals
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: themeColors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
    },
    subHeading: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textSecondary,
      textTransform: 'uppercase',
      marginVertical: 12,
    },
    tlCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    tlCardSelected: {
      borderColor: '#3b82f6',
      backgroundColor: isDark ? '#1e3a8a22' : '#eff6ff',
    },
    tlAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tlAvatarText: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    tlName: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    tlRole: {
      fontSize: 11.5,
      color: themeColors.textSecondary,
      marginTop: 1,
    },
    tlEmail: {
      fontSize: 11,
      color: '#3b82f6',
      marginTop: 1,
    },
    radioDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#3b82f6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalFooter: {
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    cancelFooterBtn: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    cancelFooterBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    sectionCard: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: themeColors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    infoKey: {
      fontSize: 12.5,
      color: themeColors.textSecondary,
    },
    infoVal: {
      fontSize: 12.5,
      fontWeight: '600',
      color: themeColors.textPrimary,
    },
    statusSelector: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.surface,
    },
    statusSelectorActive: {
      borderColor: 'transparent',
    },
    statusSelectorText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: themeColors.textSecondary,
    },
    descBox: {
      backgroundColor: themeColors.surface,
      borderRadius: 8,
      padding: 10,
      marginTop: 4,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    descText: {
      fontSize: 13,
      color: themeColors.textPrimary,
      lineHeight: 19,
    },
    fileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
    },
    fileThumbBox: {
      width: 68,
      height: 68,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: '#000000',
      position: 'relative',
    },
    fileThumbImg: {
      width: '100%',
      height: '100%',
    },
    zoomBadge: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingVertical: 2,
      alignItems: 'center',
    },
    fileIconBox: {
      width: 68,
      height: 68,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#eff6ff',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    fileExtPill: {
      position: 'absolute',
      bottom: 4,
      backgroundColor: '#3b82f6',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    fileExtPillText: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#ffffff',
    },
    fileNameText: {
      fontSize: 13,
      fontWeight: '700',
    },
    fileSubText: {
      fontSize: 11,
      marginTop: 1,
    },
    cardViewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#1e3a8a33' : '#eff6ff',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#3b82f6',
    },
    cardViewBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#3b82f6',
    },
    // Fullscreen Overlay Lightbox
    fullscreenModalContainer: {
      flex: 1,
      backgroundColor: '#000000',
      width: '100%',
      height: '100%',
    },
    fullscreenOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000000',
      zIndex: 9999999,
      elevation: 9999999,
    },
    fullscreenTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
    },
    fullscreenTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
    fullscreenCounter: {
      fontSize: 11,
      color: '#94a3b8',
      marginTop: 2,
    },
    openExternalBtn: {
      backgroundColor: '#3b82f6',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    openExternalBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    closeViewerBtn: {
      padding: 6,
    },
    fullscreenBody: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    imageDisplayBox: {
      width: width,
      height: height * 0.72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainImage: {
      width: '100%',
      height: '100%',
    },
    docDisplayBox: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    docBigBadge: {
      width: 100,
      height: 100,
      borderRadius: 20,
      backgroundColor: '#1e293b',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    docDisplayName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
      maxWidth: 280,
    },
    docDisplaySub: {
      fontSize: 12,
      color: '#94a3b8',
      marginTop: 6,
      marginBottom: 20,
    },
    docActionBtn: {
      backgroundColor: '#3b82f6',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    docActionBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
    arrowBtn: {
      position: 'absolute',
      top: '45%',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(30, 41, 59, 0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#475569',
    },
    arrowBtnText: {
      fontSize: 26,
      color: '#ffffff',
      fontWeight: '800',
      lineHeight: 28,
    },
    bottomThumbStrip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: '#334155',
    },
    thumbCard: {
      width: 50,
      height: 50,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#475569',
    },
    thumbCardActive: {
      borderColor: '#3b82f6',
    },
    thumbImg: {
      width: '100%',
      height: '100%',
    },
    thumbDoc: {
      width: '100%',
      height: '100%',
      backgroundColor: '#1e293b',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
