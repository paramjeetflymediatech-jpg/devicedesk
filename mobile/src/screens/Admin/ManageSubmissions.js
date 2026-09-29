import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchWorkSubmissionsApi,
  createWorkSubmissionApi,
  updateWorkSubmissionApi,
  fetchEodReportsApi,
  updateEodReportApi
} from '../../utils/api';

const { width } = Dimensions.get('window');

export default function ManageSubmissions({ navigation, onBack }) {
  const { theme, colors } = useTheme();

  // Tab State: 'submissions' | 'eod'
  const [activeTab, setActiveTab] = useState('submissions');

  // Work Submissions State
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');

  // EOD Reports State
  const [eodReports, setEodReports] = useState([]);
  const [loadingEod, setLoadingEod] = useState(false);
  const [eodSearch, setEodSearch] = useState('');
  const [eodStatusFilter, setEodStatusFilter] = useState('ALL');

  // Add Submission Modal
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newTaskId, setNewTaskId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [submittingSub, setSubmittingSub] = useState(false);

  // Status Override Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('Approved');
  const [overrideComment, setOverrideComment] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // EOD Review Modal
  const [showEodReviewModal, setShowEodReviewModal] = useState(false);
  const [selectedEod, setSelectedEod] = useState(null);
  const [eodNewStatus, setEodNewStatus] = useState('Approved');
  const [updatingEod, setUpdatingEod] = useState(false);

  useEffect(() => {
    loadWorkSubmissions();
    loadEodReports();
  }, []);

  const loadWorkSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await fetchWorkSubmissionsApi();
      if (res && res.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load work submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadEodReports = async () => {
    try {
      setLoadingEod(true);
      const res = await fetchEodReportsApi();
      if (res && res.success) {
        setEodReports(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load EOD reports:', err);
    } finally {
      setLoadingEod(false);
    }
  };

  const handleCreateSubmission = async () => {
    if (!newTaskId.trim() || !newProjectId.trim()) {
      Alert.alert('Validation Error', 'Task ID and Project ID are required.');
      return;
    }

    try {
      setSubmittingSub(true);
      const res = await createWorkSubmissionApi({
        task_id: newTaskId.trim(),
        project_id: newProjectId.trim(),
        submitted_by: 'Admin / Manager',
        description: newDescription.trim(),
        file_url: newFileUrl.trim()
      });

      if (res && res.success) {
        Alert.alert('Success', 'Work submission created successfully.');
        setShowAddSubModal(false);
        setNewTaskId('');
        setNewProjectId('');
        setNewDescription('');
        setNewFileUrl('');
        loadWorkSubmissions();
      } else {
        Alert.alert('Error', res.error || 'Failed to create work submission.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Server connection error.');
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleOverrideStatus = async () => {
    if (!selectedSub) return;

    try {
      setUpdatingStatus(true);
      const res = await updateWorkSubmissionApi(selectedSub.id, {
        new_status: overrideStatus,
        comment: overrideComment.trim() || 'Admin Status Override via Mobile',
        changed_by: 'Admin'
      });

      if (res && res.success) {
        Alert.alert('Updated', `Submission status set to ${overrideStatus}.`);
        setShowStatusModal(false);
        setSelectedSub(null);
        setOverrideComment('');
        loadWorkSubmissions();
      } else {
        Alert.alert('Error', res.error || 'Failed to update status.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Server connection error.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateEodStatus = async () => {
    if (!selectedEod) return;

    try {
      setUpdatingEod(true);
      const res = await updateEodReportApi({
        id: selectedEod.id,
        employee_id: selectedEod.employee_id,
        report_text: selectedEod.report_text,
        status: eodNewStatus
      });

      if (res && res.success) {
        Alert.alert('Success', `EOD status marked as ${eodNewStatus}.`);
        setShowEodReviewModal(false);
        setSelectedEod(null);
        loadEodReports();
      } else {
        Alert.alert('Error', res.error || 'Failed to update EOD report.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Server connection error.');
    } finally {
      setUpdatingEod(false);
    }
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter((item) => {
    const q = subSearch.toLowerCase();
    const matchSearch =
      (item.id || '').toLowerCase().includes(q) ||
      (item.project_id || '').toLowerCase().includes(q) ||
      (item.task_id || '').toLowerCase().includes(q) ||
      (item.submitted_by || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);

    const matchStatus =
      subStatusFilter === 'ALL' ||
      (item.status || '').toLowerCase() === subStatusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });

  // Filter EODs
  const filteredEods = eodReports.filter((item) => {
    const q = eodSearch.toLowerCase();
    const matchSearch =
      (item.employee_id || '').toLowerCase().includes(q) ||
      (item.report_text || '').toLowerCase().includes(q) ||
      (item.id || '').toLowerCase().includes(q);

    const matchStatus =
      eodStatusFilter === 'ALL' ||
      (item.status || '').toLowerCase() === eodStatusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });

  // Metrics
  const subMetrics = {
    total: submissions.length,
    approved: submissions.filter((s) => s.status === 'Approved').length,
    published: submissions.filter((s) => s.status === 'Published').length,
    changes: submissions.filter((s) => s.status === 'Changes Requested').length,
    draft: submissions.filter((s) => !s.status || s.status === 'Draft').length
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const eodMetrics = {
    total: eodReports.length,
    today: eodReports.filter((e) => (e.submitted_at || '').startsWith(todayStr)).length,
    submitted: eodReports.filter((e) => e.status === 'Submitted').length,
    approved: eodReports.filter((e) => e.status === 'Approved').length
  };

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const subCardBg = isDark ? '#0f172a' : '#f8fafc';
  const borderCol = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity
          onPress={() => {
            if (onBack) onBack();
            else if (navigation) navigation.goBack();
          }}
          style={styles.backBtn}
        >
          <AppIcon name="arrow-left" size={18} color="#38bdf8" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#38bdf8', marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Submissions & EODs</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            if (activeTab === 'submissions') loadWorkSubmissions();
            else loadEodReports();
          }}
        >
          <AppIcon name="refresh-cw" size={16} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      {/* Main Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            activeTab === 'submissions' && styles.activeMainTab,
            { borderBottomColor: activeTab === 'submissions' ? '#38bdf8' : 'transparent' }
          ]}
          onPress={() => setActiveTab('submissions')}
        >
          <Text
            style={[
              styles.mainTabText,
              { color: activeTab === 'submissions' ? '#38bdf8' : textSecondary }
            ]}
          >
            🚀 Work Submissions ({submissions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            activeTab === 'eod' && styles.activeMainTab,
            { borderBottomColor: activeTab === 'eod' ? '#10b981' : 'transparent' }
          ]}
          onPress={() => setActiveTab('eod')}
        >
          <Text
            style={[
              styles.mainTabText,
              { color: activeTab === 'eod' ? '#10b981' : textSecondary }
            ]}
          >
            📋 Team EODs ({eodReports.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ========================================================= */}
        {/* TAB 1: WORK SUBMISSIONS */}
        {/* ========================================================= */}
        {activeTab === 'submissions' && (
          <View>
            {/* Metrics */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={styles.metricVal}>{subMetrics.total}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Total</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: '#10b98140' }]}>
                <Text style={[styles.metricVal, { color: '#10b981' }]}>{subMetrics.approved}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Approved</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: '#f59e0b40' }]}>
                <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{subMetrics.changes}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Changes Req</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: '#64748b40' }]}>
                <Text style={[styles.metricVal, { color: '#64748b' }]}>{subMetrics.draft}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Drafts</Text>
              </View>
            </View>

            {/* Actions & Search */}
            <View style={styles.searchBarRow}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="Search by ID, task, project, user..."
                placeholderTextColor={textSecondary}
                value={subSearch}
                onChangeText={setSubSearch}
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddSubModal(true)}
              >
                <Text style={styles.addBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {['ALL', 'Draft', 'Approved', 'Published', 'Changes Requested'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.chip,
                    { backgroundColor: subStatusFilter === st ? '#38bdf8' : cardBg, borderColor: borderCol }
                  ]}
                  onPress={() => setSubStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: subStatusFilter === st ? '#0f172a' : textSecondary, fontWeight: subStatusFilter === st ? 'bold' : 'normal' }
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Submissions List */}
            {loadingSubmissions ? (
              <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
            ) : filteredSubmissions.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={{ fontSize: 32 }}>📁</Text>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Work Submissions Found</Text>
                <Text style={{ color: textSecondary, textAlign: 'center', marginTop: 4 }}>
                  No deliverables match your search criteria.
                </Text>
              </View>
            ) : (
              filteredSubmissions.map((item) => {
                let badgeBg = '#334155';
                let badgeText = '#f8fafc';
                if (item.status === 'Approved') {
                  badgeBg = '#10b98120';
                  badgeText = '#10b981';
                } else if (item.status === 'Published') {
                  badgeBg = '#38bdf820';
                  badgeText = '#38bdf8';
                } else if (item.status === 'Changes Requested') {
                  badgeBg = '#ef444420';
                  badgeText = '#ef4444';
                } else if (item.status === 'Draft') {
                  badgeBg = '#64748b20';
                  badgeText = '#94a3b8';
                }

                return (
                  <View key={item.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardSubId, { color: '#38bdf8' }]}>{item.id}</Text>
                        <Text style={[styles.cardUser, { color: textSecondary }]}>By: {item.submitted_by || 'Unknown'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: badgeText }]}>{item.status || 'Draft'}</Text>
                      </View>
                    </View>

                    {/* Task & Project Badges */}
                    <View style={styles.tagsRow}>
                      <View style={[styles.tagBadge, { backgroundColor: subCardBg }]}>
                        <Text style={[styles.tagBadgeText, { color: textSecondary }]}>Project: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{item.project_id || 'N/A'}</Text></Text>
                      </View>
                      <View style={[styles.tagBadge, { backgroundColor: subCardBg }]}>
                        <Text style={[styles.tagBadgeText, { color: textSecondary }]}>Task: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{item.task_id || 'N/A'}</Text></Text>
                      </View>
                    </View>

                    {/* Description */}
                    {item.description ? (
                      <Text style={[styles.descText, { color: textPrimary }]}>{item.description}</Text>
                    ) : null}

                    {/* Attached Deliverable Link */}
                    {item.file_url ? (
                      <TouchableOpacity
                        style={[styles.deliverableBtn, { backgroundColor: subCardBg }]}
                        onPress={() => Linking.openURL(item.file_url).catch(() => Alert.alert('Error', 'Cannot open URL'))}
                      >
                        <Text style={styles.deliverableBtnText}>🔗 View Deliverable Asset</Text>
                      </TouchableOpacity>
                    ) : null}

                    <View style={[styles.cardFooter, { borderTopColor: borderCol }]}>
                      <Text style={[styles.timestampText, { color: textSecondary }]}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                      </Text>
                      <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() => {
                          setSelectedSub(item);
                          setOverrideStatus(item.status || 'Approved');
                          setShowStatusModal(true);
                        }}
                      >
                        <Text style={styles.reviewBtnText}>Override Status ✎</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TEAM EOD REPORTS */}
        {/* ========================================================= */}
        {activeTab === 'eod' && (
          <View>
            {/* EOD Metrics */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={styles.metricVal}>{eodMetrics.total}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Total Reports</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: '#10b98140' }]}>
                <Text style={[styles.metricVal, { color: '#10b981' }]}>{eodMetrics.today}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Today's EODs</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: '#38bdf840' }]}>
                <Text style={[styles.metricVal, { color: '#38bdf8' }]}>{eodMetrics.submitted}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Submitted</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: '#8b5cf640' }]}>
                <Text style={[styles.metricVal, { color: '#8b5cf6' }]}>{eodMetrics.approved}</Text>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>Approved</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={{ marginBottom: 12 }}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="Search by employee ID, summary text..."
                placeholderTextColor={textSecondary}
                value={eodSearch}
                onChangeText={setEodSearch}
              />
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {['ALL', 'Submitted', 'Approved', 'Pending', 'Reviewed'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.chip,
                    { backgroundColor: eodStatusFilter === st ? '#10b981' : cardBg, borderColor: borderCol }
                  ]}
                  onPress={() => setEodStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: eodStatusFilter === st ? '#ffffff' : textSecondary, fontWeight: eodStatusFilter === st ? 'bold' : 'normal' }
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* EOD Reports List */}
            {loadingEod ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
            ) : filteredEods.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={{ fontSize: 32 }}>📝</Text>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No EOD Reports Found</Text>
                <Text style={{ color: textSecondary, textAlign: 'center', marginTop: 4 }}>
                  No End of Day reports submitted matching your filter.
                </Text>
              </View>
            ) : (
              filteredEods.map((eod) => {
                const isSubmitted = (eod.status || '').toLowerCase() === 'submitted';
                const isApproved = (eod.status || '').toLowerCase() === 'approved';

                return (
                  <View key={eod.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={[styles.cardSubId, { color: '#10b981' }]}>
                          Employee: {eod.employee_id}
                        </Text>
                        <Text style={[styles.cardUser, { color: textSecondary }]}>
                          Date: {eod.submitted_at ? new Date(eod.submitted_at).toLocaleString() : 'Today'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isApproved ? '#10b98120' : isSubmitted ? '#38bdf820' : '#f59e0b20'
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isApproved ? '#10b981' : isSubmitted ? '#38bdf8' : '#f59e0b' }
                          ]}
                        >
                          {eod.status || 'Submitted'}
                        </Text>
                      </View>
                    </View>

                    {/* Report Text */}
                    <View style={[styles.eodTextContainer, { backgroundColor: subCardBg, borderColor: borderCol }]}>
                      <Text style={[styles.eodBodyText, { color: textPrimary }]}>
                        {eod.report_text || 'No description provided.'}
                      </Text>
                    </View>

                    {/* Review Action */}
                    <View style={[styles.cardFooter, { borderTopColor: borderCol }]}>
                      <Text style={[styles.timestampText, { color: textSecondary }]}>
                        ID: {eod.id}
                      </Text>
                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => {
                          setSelectedEod(eod);
                          setEodNewStatus(eod.status === 'Approved' ? 'Reviewed' : 'Approved');
                          setShowEodReviewModal(true);
                        }}
                      >
                        <Text style={styles.reviewBtnText}>Review & Verify ✓</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: ADD WORK SUBMISSION */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* MODAL: ADD WORK SUBMISSION */}
      {/* ========================================================= */}
      <Modal visible={showAddSubModal} transparent animationType="slide" onRequestClose={() => setShowAddSubModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Create Work Submission</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                Submit deliverables or task output for review.
              </Text>

              <TextInput
                style={[styles.modalInput, { backgroundColor: subCardBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="Task ID (e.g. TASK_101)"
                placeholderTextColor={textSecondary}
                value={newTaskId}
                onChangeText={setNewTaskId}
              />

              <TextInput
                style={[styles.modalInput, { backgroundColor: subCardBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="Project ID (e.g. PROJ_DEV_01)"
                placeholderTextColor={textSecondary}
                value={newProjectId}
                onChangeText={setNewProjectId}
              />

              <TextInput
                style={[styles.modalInput, { backgroundColor: subCardBg, borderColor: borderCol, color: textPrimary, height: 80 }]}
                placeholder="Description of completed work..."
                placeholderTextColor={textSecondary}
                multiline
                value={newDescription}
                onChangeText={setNewDescription}
              />

              <TextInput
                style={[styles.modalInput, { backgroundColor: subCardBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="Deliverable File URL / Drive Link"
                placeholderTextColor={textSecondary}
                value={newFileUrl}
                onChangeText={setNewFileUrl}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: borderCol }]}
                  onPress={() => setShowAddSubModal(false)}
                >
                  <Text style={{ color: textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleCreateSubmission}
                  disabled={submittingSub}
                >
                  {submittingSub ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Submit Deliverable</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: STATUS OVERRIDE */}
      {/* ========================================================= */}
      <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => { setShowStatusModal(false); setSelectedSub(null); }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Override Submission Status</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                Submission: {selectedSub?.id}
              </Text>

              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Select New Status:</Text>
              <View style={styles.statusSelectRow}>
                {['Draft', 'Approved', 'Published', 'Changes Requested'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusOptionBtn,
                      {
                        backgroundColor: overrideStatus === st ? '#38bdf8' : subCardBg,
                        borderColor: borderCol
                      }
                    ]}
                    onPress={() => setOverrideStatus(st)}
                  >
                    <Text
                      style={{
                        color: overrideStatus === st ? '#0f172a' : textPrimary,
                        fontWeight: overrideStatus === st ? 'bold' : 'normal',
                        fontSize: 12
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: textSecondary, marginTop: 12 }]}>Admin Comment / Feedback:</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: subCardBg, borderColor: borderCol, color: textPrimary, height: 70 }]}
                placeholder="Add review remarks..."
                placeholderTextColor={textSecondary}
                multiline
                value={overrideComment}
                onChangeText={setOverrideComment}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: borderCol }]}
                  onPress={() => {
                    setShowStatusModal(false);
                    setSelectedSub(null);
                  }}
                >
                  <Text style={{ color: textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleOverrideStatus}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Save Status</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: EOD REVIEW */}
      {/* ========================================================= */}
      <Modal visible={showEodReviewModal} transparent animationType="fade" onRequestClose={() => { setShowEodReviewModal(false); setSelectedEod(null); }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Review EOD Report</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                Employee: {selectedEod?.employee_id}
              </Text>

              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Set Verification Status:</Text>
              <View style={styles.statusSelectRow}>
                {['Submitted', 'Approved', 'Reviewed', 'Pending'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusOptionBtn,
                      {
                        backgroundColor: eodNewStatus === st ? '#10b981' : subCardBg,
                        borderColor: borderCol
                      }
                    ]}
                    onPress={() => setEodNewStatus(st)}
                  >
                    <Text
                      style={{
                        color: eodNewStatus === st ? '#ffffff' : textPrimary,
                        fontWeight: eodNewStatus === st ? 'bold' : 'normal',
                        fontSize: 12
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: borderCol }]}
                  onPress={() => {
                    setShowEodReviewModal(false);
                    setSelectedEod(null);
                  }}
                >
                  <Text style={{ color: textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleUpdateEodStatus}
                  disabled={updatingEod}
                >
                  {updatingEod ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Save EOD Status</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  refreshBtn: {
    padding: 6
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  mainTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3
  },
  activeMainTab: {},
  mainTabText: {
    fontSize: 13,
    fontWeight: '700'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  metricCard: {
    width: '48.5%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38bdf8'
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600'
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 13
  },
  addBtn: {
    backgroundColor: '#38bdf8',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addBtnText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 13
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 14
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6
  },
  chipText: {
    fontSize: 12
  },
  emptyContainer: {
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardSubId: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  cardUser: {
    fontSize: 11,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  tagBadgeText: {
    fontSize: 11
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10
  },
  deliverableBtn: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center'
  },
  deliverableBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8
  },
  timestampText: {
    fontSize: 11
  },
  reviewBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  reviewBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: 'bold'
  },
  eodTextContainer: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10
  },
  eodBodyText: {
    fontSize: 13,
    lineHeight: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center'
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16
  },
  modalBox: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 14
  },
  modalInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 10
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  statusSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8
  },
  statusOptionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  confirmBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  confirmBtnText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 13
  }
});
