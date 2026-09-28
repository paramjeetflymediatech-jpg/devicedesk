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
} from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import {
  fetchEodReportsApi,
  submitEodReportApi,
  fetchWorkSubmissionsApi,
  createWorkSubmissionApi,
} from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

export default function EODSubmission({ currentUser, onBack }) {
  const { isDark, themeColors } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [activeTab, setActiveTab] = useState('eod'); // 'eod' | 'submissions'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // EOD State
  const [eodList, setEodList] = useState([]);
  const [todayEod, setTodayEod] = useState(null);
  const [eodText, setEodText] = useState('');
  const [submittingEod, setSubmittingEod] = useState(false);

  // Work Submissions State
  const [submissions, setSubmissions] = useState([]);
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [taskIdInput, setTaskIdInput] = useState('');
  const [projectIdInput, setProjectIdInput] = useState('');
  const [subDescInput, setSubDescInput] = useState('');
  const [subUrlInput, setSubUrlInput] = useState('');
  const [savingSubmission, setSavingSubmission] = useState(false);

  const todayDateStr = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      // 1. Fetch EOD reports for this employee
      const eodRes = await fetchEodReportsApi(currentUser.id);
      if (eodRes.success && Array.isArray(eodRes.data)) {
        setEodList(eodRes.data);
        const today = eodRes.data.find(
          r => (r.submitted_at || '').startsWith(todayDateStr) || r.date === todayDateStr
        );
        if (today) {
          setTodayEod(today);
          setEodText(today.report_text || '');
        } else {
          setTodayEod(null);
        }
      }

      // 2. Fetch Work Submissions
      const subRes = await fetchWorkSubmissionsApi();
      if (subRes.success && Array.isArray(subRes.data)) {
        const mySubs = subRes.data.filter(
          s => s.submitted_by === currentUser.id || s.submitted_by === currentUser.name
        );
        setSubmissions(mySubs);
      }
    } catch (err) {
      console.error('Error loading EOD data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, todayDateStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Submit EOD Handler
  const handleSubmitEod = async () => {
    if (!eodText.trim()) {
      sweetAlert({
        title: 'Empty Report',
        text: 'Please describe your daily achievements, tasks, and progress before submitting.',
        type: 'warning',
      });
      return;
    }

    setSubmittingEod(true);
    try {
      const res = await submitEodReportApi({
        employee_id: currentUser.id,
        report_text: eodText.trim(),
        status: 'Submitted',
      });

      if (res.success) {
        sweetAlert({
          title: 'EOD Submitted! 🎉',
          text: 'Your daily End of Day report has been submitted to team leaders and management.',
          type: 'success',
        });
        loadData();
      } else {
        throw new Error(res.error || 'Failed to submit report');
      }
    } catch (err) {
      sweetAlert({
        title: 'Submission Failed',
        text: err.message || 'Could not save EOD report. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmittingEod(false);
    }
  };

  // Append Template Helper
  const handleAppendTemplate = (template) => {
    setEodText(prev => (prev ? prev + '\n' + template : template));
  };

  // Submit Work Deliverable Handler
  const handleCreateWorkSubmission = async () => {
    if (!taskIdInput.trim() || !projectIdInput.trim() || !subDescInput.trim()) {
      sweetAlert({
        title: 'Missing Details',
        text: 'Please enter Task ID, Project ID, and a work description.',
        type: 'warning',
      });
      return;
    }

    setSavingSubmission(true);
    try {
      const res = await createWorkSubmissionApi({
        task_id: taskIdInput.trim(),
        project_id: projectIdInput.trim(),
        submitted_by: currentUser.id || currentUser.name,
        description: subDescInput.trim(),
        file_url: subUrlInput.trim() || null,
      });

      if (res.success) {
        sweetAlert({
          title: 'Work Submitted! 🚀',
          text: 'Your deliverable has been submitted for review.',
          type: 'success',
        });
        setShowAddSubModal(false);
        setTaskIdInput('');
        setProjectIdInput('');
        setSubDescInput('');
        setSubUrlInput('');
        loadData();
      } else {
        throw new Error(res.error || 'Failed to submit deliverable');
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: err.message || 'Could not submit work deliverable.',
        type: 'error',
      });
    } finally {
      setSavingSubmission(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'Draft').toLowerCase();
    if (s === 'approved' || s === 'reviewed' || s === 'submitted') {
      return { bg: '#05966922', text: '#10b981', border: '#059669' };
    }
    if (s === 'changes requested' || s === 'rejected') {
      return { bg: '#dc262622', text: '#ef4444', border: '#dc2626' };
    }
    if (s === 'under review' || s === 'in progress') {
      return { bg: '#d9770622', text: '#f59e0b', border: '#d97706' };
    }
    return { bg: '#47556922', text: '#94a3b8', border: '#475569' };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <AppIcon name="chevron-left" size={20} color={themeColors.textPrimary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily EOD & Deliverables</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={{ fontSize: 16 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'eod' && styles.tabButtonActive]}
          onPress={() => setActiveTab('eod')}
        >
          <Text style={[styles.tabText, activeTab === 'eod' && styles.tabTextActive]}>
            📋 Daily EOD Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'submissions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('submissions')}
        >
          <Text style={[styles.tabText, activeTab === 'submissions' && styles.tabTextActive]}>
            🚀 Work Submissions ({submissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeTab === 'eod' ? (
            /* ==================== EOD TAB ==================== */
            <View>
              {/* Today's Status Banner */}
              <View style={[styles.bannerCard, todayEod ? styles.bannerSubmitted : styles.bannerPending]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 26 }}>{todayEod ? '✅' : '⏰'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>
                      {todayEod ? "Today's EOD Submitted" : "Today's EOD Pending"}
                    </Text>
                    <Text style={styles.bannerSub}>
                      {todayEod
                        ? `Logged at ${new Date(todayEod.submitted_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Status: ${todayEod.status || 'Submitted'}`
                        : 'Submit your end-of-day summary before logging out.'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Template Chips */}
              <Text style={styles.sectionLabel}>⚡ Fast Format Quick-Tags</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => handleAppendTemplate('• Completed Task: ')}
                >
                  <Text style={styles.chipText}>+ Task Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => handleAppendTemplate('• Bug Fix: ')}
                >
                  <Text style={styles.chipText}>+ Bug Fixed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => handleAppendTemplate('• Client Meeting: ')}
                >
                  <Text style={styles.chipText}>+ Meeting</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => handleAppendTemplate('• Blocker / Pending: ')}
                >
                  <Text style={styles.chipText}>+ Blocker</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => handleAppendTemplate('• Plan for Tomorrow: ')}
                >
                  <Text style={styles.chipText}>+ Next Day Plan</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* EOD Input Form */}
              <View style={styles.formCard}>
                <Text style={styles.formLabel}>
                  {todayEod ? "Update Today's Summary" : "What did you accomplish today?"}
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={`• Built user profile screens\n• Fixed authentication token refresh\n• Conducted code review with team\n• Next: Complete unit tests`}
                  placeholderTextColor={themeColors.textSecondary}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  value={eodText}
                  onChangeText={setEodText}
                />

                <TouchableOpacity
                  style={[styles.submitButton, submittingEod && styles.buttonDisabled]}
                  onPress={handleSubmitEod}
                  disabled={submittingEod}
                >
                  {submittingEod ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {todayEod ? 'Update EOD Report 💾' : 'Submit EOD Report 🚀'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Past EOD History */}
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                📅 Past EOD History ({eodList.length})
              </Text>
              {eodList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No past EOD reports found.</Text>
                </View>
              ) : (
                eodList.map((item, index) => {
                  const badge = getStatusBadge(item.status);
                  const isToday =
                    (item.submitted_at || '').startsWith(todayDateStr) ||
                    item.date === todayDateStr;

                  return (
                    <View key={item.id || index} style={styles.historyCard}>
                      <View style={styles.historyHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14 }}>🗓️</Text>
                          <Text style={styles.historyDate}>
                            {item.submitted_at
                              ? new Date(item.submitted_at).toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : item.date || 'Past Report'}
                          </Text>
                          {isToday && (
                            <View style={styles.todayPill}>
                              <Text style={styles.todayPillText}>TODAY</Text>
                            </View>
                          )}
                        </View>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: badge.text }]}>
                            {item.status || 'Submitted'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.historyReportText}>{item.report_text}</Text>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            /* ==================== WORK SUBMISSIONS TAB ==================== */
            <View>
              {/* Header with New Submission Button */}
              <View style={styles.subHeaderRow}>
                <View>
                  <Text style={styles.sectionLabel}>Deliverables & Submissions</Text>
                  <Text style={styles.sectionSub}>
                    Submit pull requests, live links, designs & deliverables for client projects
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addSubBtn}
                  onPress={() => setShowAddSubModal(true)}
                >
                  <Text style={styles.addSubBtnText}>+ New Work</Text>
                </TouchableOpacity>
              </View>

              {submissions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
                  <Text style={styles.emptyTitle}>No Deliverables Submitted Yet</Text>
                  <Text style={styles.emptyText}>
                    Use the button above to submit your completed tasks or PRs for review.
                  </Text>
                </View>
              ) : (
                submissions.map((sub, index) => {
                  const badge = getStatusBadge(sub.status);
                  return (
                    <View key={sub.id || index} style={styles.subCard}>
                      <View style={styles.subCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subProjectTitle}>
                            Project: {sub.project_id || 'General'}
                          </Text>
                          <Text style={styles.subTaskId}>Task ID: #{sub.task_id}</Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: badge.text }]}>
                            {sub.status || 'Draft'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.subDesc}>{sub.description}</Text>

                      {sub.file_url ? (
                        <TouchableOpacity
                          style={styles.urlButton}
                          onPress={() => Linking.openURL(sub.file_url).catch(() => {})}
                        >
                          <AppIcon name="external-link" size={14} color="#3b82f6" />
                          <Text style={styles.urlButtonText} numberOfLines={1}>
                            {sub.file_url}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <View style={styles.subCardFooter}>
                        <Text style={styles.subFooterText}>
                          Submitted:{' '}
                          {sub.created_at
                            ? new Date(sub.created_at).toLocaleDateString()
                            : 'Recently'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal: Add Work Submission */}
      <Modal
        visible={showAddSubModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSubModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Work Deliverable</Text>
            <Text style={styles.modalSub}>
              Attach task code, PR links, or project deliverables for review.
            </Text>

            <Text style={styles.inputLabel}>Project ID / Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. PRJ-CRM-01"
              placeholderTextColor={themeColors.textSecondary}
              value={projectIdInput}
              onChangeText={setProjectIdInput}
            />

            <Text style={styles.inputLabel}>Task ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. TSK-104"
              placeholderTextColor={themeColors.textSecondary}
              value={taskIdInput}
              onChangeText={setTaskIdInput}
            />

            <Text style={styles.inputLabel}>Work Description *</Text>
            <TextInput
              style={[styles.input, styles.modalTextArea]}
              placeholder="Describe deliverables, features completed, and testing notes..."
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={subDescInput}
              onChangeText={setSubDescInput}
            />

            <Text style={styles.inputLabel}>Deliverable URL (GitHub / Figma / Drive)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://github.com/... or https://figma.com/..."
              placeholderTextColor={themeColors.textSecondary}
              autoCapitalize="none"
              value={subUrlInput}
              onChangeText={setSubUrlInput}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddSubModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingSubmission && styles.buttonDisabled]}
                onPress={handleCreateWorkSubmission}
                disabled={savingSubmission}
              >
                {savingSubmission ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Work 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    refreshBtn: {
      padding: 6,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.headerBg || (isDark ? '#1e293b' : '#ffffff'),
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || (isDark ? '#1e293b' : '#e2e8f0'),
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
    },
    tabButtonActive: {
      backgroundColor: '#2563eb',
    },
    tabText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
    },
    tabTextActive: {
      color: '#ffffff',
      fontWeight: '700',
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
    bannerCard: {
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      marginBottom: 16,
    },
    bannerSubmitted: {
      backgroundColor: isDark ? '#064e3b22' : '#ecfdf5',
      borderColor: '#10b981',
    },
    bannerPending: {
      backgroundColor: isDark ? '#78350f22' : '#fffbeb',
      borderColor: '#f59e0b',
    },
    bannerTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    bannerSub: {
      fontSize: 11.5,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 8,
    },
    sectionSub: {
      fontSize: 11,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      marginTop: 2,
      marginBottom: 12,
    },
    chipsRow: {
      flexDirection: 'row',
      marginBottom: 14,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? '#1e293b' : '#e0f2fe',
      marginRight: 8,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#bae6fd',
    },
    chipText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: '#0284c7',
    },
    formCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 8,
    },
    textArea: {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      fontSize: 13,
      minHeight: 140,
      marginBottom: 14,
    },
    submitButton: {
      backgroundColor: '#2563eb',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    buttonDisabled: {
      opacity: 0.6,
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
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 12,
      color: colors.textSecondary || (isDark ? '#94a3b8' : '#64748b'),
      textAlign: 'center',
    },
    historyCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 10,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    historyDate: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    todayPill: {
      backgroundColor: '#3b82f6',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    todayPillText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#ffffff',
    },
    historyReportText: {
      fontSize: 12.5,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      lineHeight: 18,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    subHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    addSubBtn: {
      backgroundColor: '#2563eb',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addSubBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    subCard: {
      backgroundColor: colors.cardBg || (isDark ? '#1e293b' : '#ffffff'),
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border || (isDark ? '#334155' : '#e2e8f0'),
      marginBottom: 12,
    },
    subCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    subProjectTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a'),
    },
    subTaskId: {
      fontSize: 11,
      color: '#3b82f6',
      fontWeight: '600',
      marginTop: 2,
    },
    subDesc: {
      fontSize: 12.5,
      color: colors.textSecondary || (isDark ? '#cbd5e1' : '#475569'),
      lineHeight: 18,
      marginBottom: 8,
    },
    urlButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? '#0f172a' : '#eff6ff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#1e3a8a' : '#bfdbfe',
      marginBottom: 8,
    },
    urlButtonText: {
      fontSize: 11.5,
      color: '#2563eb',
      fontWeight: '600',
      flex: 1,
    },
    subCardFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border || (isDark ? '#334155' : '#f1f5f9'),
      paddingTop: 8,
    },
    subFooterText: {
      fontSize: 10.5,
      color: colors.textSecondary || '#64748b',
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
      minHeight: 80,
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
  });
