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
} from 'react-native';
import {
  fetchCandidatesPoolApi,
  addCandidatePoolApi,
  updateCandidatePoolApi,
  fetchCandidatesListApi,
  evaluateCandidateTestApi,
} from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ManageCandidates({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const [subTab, setSubTab] = useState('pool'); // 'pool' or 'tests'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pool State
  const [candidates, setCandidates] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Tests State
  const [tests, setTests] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    role_applied: '',
    resume_url: '',
  });

  const [feedbackForm, setFeedbackForm] = useState({
    id: '',
    name: '',
    status: 'Pending',
    feedback: '',
  });

  // Evaluate Test Modal State
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [evalStatus, setEvalStatus] = useState('Evaluated');

  const loadData = async () => {
    try {
      if (subTab === 'pool') {
        const poolRes = await fetchCandidatesPoolApi();
        if (poolRes && poolRes.success) {
          setCandidates(poolRes.data || []);
        }
      } else {
        const listRes = await fetchCandidatesListApi();
        if (listRes && listRes.success) {
          setTests(listRes.tests || []);
          setRegistrations(listRes.registrations || []);
        }
      }
    } catch (err) {
      console.error('Failed to load candidate data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [subTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddSubmit = async () => {
    if (!addForm.name.trim()) {
      sweetAlert({ title: 'Validation Error', text: 'Candidate name is required.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await addCandidatePoolApi(addForm);
      if (res && res.success) {
        sweetAlert({ title: 'Success', text: 'Candidate added to talent pool!', type: 'success' });
        setShowAddModal(false);
        setAddForm({ name: '', email: '', phone: '', role_applied: '', resume_url: '' });
        loadData();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || 'Failed to add candidate.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network connection error.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenFeedback = (c) => {
    setSelectedCandidate(c);
    setFeedbackForm({
      id: c.id,
      name: c.name,
      status: c.status || 'Pending',
      feedback: c.feedback || '',
    });
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await updateCandidatePoolApi(feedbackForm.id, feedbackForm.status, feedbackForm.feedback);
      if (res && res.success) {
        sweetAlert({ title: 'Success', text: 'Candidate status and feedback updated!', type: 'success' });
        setShowFeedbackModal(false);
        loadData();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || 'Failed to save feedback.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network connection error.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEvaluate = (test) => {
    setSelectedTest(test);
    setEvalStatus(test.status || 'Evaluated');
    setShowEvaluateModal(true);
  };

  const handleEvaluateSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await evaluateCandidateTestApi(selectedTest.id, evalStatus);
      if (res && res.success) {
        sweetAlert({ title: 'Success', text: `Test status marked as ${evalStatus}!`, type: 'success' });
        setShowEvaluateModal(false);
        loadData();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || 'Failed to update test evaluation.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network error updating test.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Selected':
      case 'Passed':
      case 'Hired':
        return '#10b981';
      case 'Rejected':
      case 'Failed':
        return '#ef4444';
      case 'Under Review':
      case 'Evaluated':
        return '#3b82f6';
      default:
        return '#f59e0b';
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (c.name || '').toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.role_applied || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'ALL' || (c.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredTests = tests.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      (t.candidate_name || '').toLowerCase().includes(query) ||
      (t.candidate_email || '').toLowerCase().includes(query) ||
      (t.title || '').toLowerCase().includes(query) ||
      (t.status || '').toLowerCase().includes(query)
    );
  });

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
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Candidate Management</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {subTab === 'pool' ? `${filteredCandidates.length} pool candidates` : `${filteredTests.length} test submissions`}
          </Text>
        </View>

        {subTab === 'pool' && (
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: '#3b82f6' }]} onPress={() => setShowAddModal(true)}>
            <Text style={styles.headerBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub Tab Switcher (Pool vs Tests) */}
      <View style={[styles.tabSwitcher, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.switcherTab, subTab === 'pool' && styles.switcherTabActive]}
          onPress={() => setSubTab('pool')}
        >
          <Text style={[styles.switcherText, { color: subTab === 'pool' ? '#3b82f6' : themeColors.textSecondary }]}>
            👥 Candidate Pool ({candidates.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switcherTab, subTab === 'tests' && styles.switcherTabActive]}
          onPress={() => setSubTab('tests')}
        >
          <Text style={[styles.switcherText, { color: subTab === 'tests' ? '#3b82f6' : themeColors.textSecondary }]}>
            📝 Assessment Tests ({tests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: themeColors.card, color: themeColors.textPrimary, borderColor: themeColors.border }]}
          placeholder={subTab === 'pool' ? 'Search by candidate name, email, role...' : 'Search tests by candidate or title...'}
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Chips for Pool */}
      {subTab === 'pool' && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {['ALL', 'Pending', 'Selected', 'Rejected'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.chip,
                  { backgroundColor: themeColors.card, borderColor: themeColors.border },
                  statusFilter === st && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                ]}
                onPress={() => setStatusFilter(st)}
              >
                <Text style={[
                  styles.chipText,
                  { color: themeColors.textSecondary },
                  statusFilter === st && { color: '#ffffff', fontWeight: 'bold' }
                ]}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: themeColors.textSecondary, marginTop: 10, fontSize: 13 }}>Loading candidate records...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        >
          {subTab === 'pool' ? (
            filteredCandidates.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🧑‍💼</Text>
                <Text style={[styles.noData, { color: themeColors.textSecondary }]}>No candidates found in this pool.</Text>
              </View>
            ) : (
              filteredCandidates.map((cand) => (
                <View key={cand.id} style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.candName, { color: themeColors.textPrimary }]}>{cand.name}</Text>
                      <Text style={[styles.candRole, { color: '#3b82f6' }]}>🎯 {cand.role_applied || 'General Role'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(cand.status)}22`, borderColor: getStatusColor(cand.status) }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(cand.status) }]}>{cand.status || 'Pending'}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>✉️ Email: <Text style={{ color: themeColors.textPrimary }}>{cand.email || 'N/A'}</Text></Text>
                    {cand.phone ? (
                      <Text style={[styles.infoLabel, { color: themeColors.textSecondary, marginTop: 2 }]}>
                        📞 Phone: <Text style={{ color: themeColors.textPrimary }}>{cand.phone}</Text>
                      </Text>
                    ) : null}
                  </View>

                  {cand.feedback ? (
                    <View style={[styles.feedbackBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.textSecondary }}>Interviewer Feedback:</Text>
                      <Text style={{ fontSize: 12.5, color: themeColors.textPrimary, fontStyle: 'italic', marginTop: 2 }}>"{cand.feedback}"</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={{ fontSize: 10.5, color: themeColors.textSecondary }}>
                      Added: {cand.created_at ? new Date(cand.created_at).toLocaleDateString() : 'Recent'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: isDark ? '#334155' : '#eff6ff', borderColor: '#3b82f6' }]}
                      onPress={() => handleOpenFeedback(cand)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>⚙️ Status & Feedback</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            filteredTests.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📝</Text>
                <Text style={[styles.noData, { color: themeColors.textSecondary }]}>No assessment test submissions found.</Text>
              </View>
            ) : (
              filteredTests.map((test) => (
                <View key={test.id} style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.candName, { color: themeColors.textPrimary }]}>{test.candidate_name || 'Candidate'}</Text>
                      <Text style={[styles.candRole, { color: '#3b82f6' }]}>📝 {test.title || 'Technical Assessment'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(test.status)}22`, borderColor: getStatusColor(test.status) }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(test.status) }]}>{test.status || 'Pending'}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>
                      ✉️ Email: <Text style={{ color: themeColors.textPrimary }}>{test.candidate_email || 'N/A'}</Text>
                    </Text>
                    <Text style={[styles.infoLabel, { color: themeColors.textSecondary, marginTop: 2 }]}>
                      🎯 Score: <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>{test.score !== null && test.score !== undefined ? `${test.score}%` : 'Pending evaluation'}</Text>
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={{ fontSize: 10.5, color: themeColors.textSecondary }}>
                      Submitted: {test.created_at ? new Date(test.created_at).toLocaleDateString() : 'N/A'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: isDark ? '#334155' : '#eff6ff', borderColor: '#3b82f6' }]}
                      onPress={() => handleOpenEvaluate(test)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>⚖️ Evaluate Test</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Add Candidate Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Add Candidate to Pool</Text>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Candidate Full Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={themeColors.textSecondary}
                value={addForm.name}
                onChangeText={(v) => setAddForm({ ...addForm, name: v })}
              />

              <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Email Address</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="candidate@gmail.com"
                placeholderTextColor={themeColors.textSecondary}
                value={addForm.email}
                onChangeText={(v) => setAddForm({ ...addForm, email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Phone Number</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="+91 9876543210"
                placeholderTextColor={themeColors.textSecondary}
                value={addForm.phone}
                onChangeText={(v) => setAddForm({ ...addForm, phone: v })}
                keyboardType="phone-pad"
              />

              <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Role / Position Applied</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="Frontend Developer / Marketing Associate"
                placeholderTextColor={themeColors.textSecondary}
                value={addForm.role_applied}
                onChangeText={(v) => setAddForm({ ...addForm, role_applied: v })}
              />

              <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Resume URL / Link</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="https://drive.google.com/..."
                placeholderTextColor={themeColors.textSecondary}
                value={addForm.resume_url}
                onChangeText={(v) => setAddForm({ ...addForm, resume_url: v })}
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#3b82f6' }]}
                disabled={submitting}
                onPress={handleAddSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Save Candidate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback & Status Modal */}
      <Modal visible={showFeedbackModal} transparent animationType="fade" onRequestClose={() => setShowFeedbackModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Update Candidate Status</Text>
            <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginBottom: 12, textAlign: 'center' }}>
              Candidate: <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>{feedbackForm.name}</Text>
            </Text>

            <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Hiring Status</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['Pending', 'Selected', 'Rejected'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.chip,
                    { flex: 1, alignItems: 'center', backgroundColor: themeColors.background, borderColor: themeColors.border },
                    feedbackForm.status === st && { backgroundColor: getStatusColor(st), borderColor: getStatusColor(st) },
                  ]}
                  onPress={() => setFeedbackForm({ ...feedbackForm, status: st })}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: feedbackForm.status === st ? '#ffffff' : themeColors.textPrimary }}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Interviewer Feedback & Notes</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border, minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Candidate interview performance, skill notes, salary expectation..."
              placeholderTextColor={themeColors.textSecondary}
              value={feedbackForm.feedback}
              onChangeText={(v) => setFeedbackForm({ ...feedbackForm, feedback: v })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }]}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#3b82f6' }]}
                disabled={submitting}
                onPress={handleFeedbackSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Save Feedback</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Evaluate Test Modal */}
      <Modal visible={showEvaluateModal} transparent animationType="fade" onRequestClose={() => setShowEvaluateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Evaluate Assessment Test</Text>
            <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginBottom: 12, textAlign: 'center' }}>
              Candidate: <Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>{selectedTest?.candidate_name}</Text>
            </Text>

            <Text style={[styles.formLabel, { color: themeColors.textPrimary }]}>Select Evaluation Result</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['Evaluated', 'Passed', 'Failed'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.chip,
                    { flex: 1, alignItems: 'center', backgroundColor: themeColors.background, borderColor: themeColors.border },
                    evalStatus === st && { backgroundColor: getStatusColor(st), borderColor: getStatusColor(st) },
                  ]}
                  onPress={() => setEvalStatus(st)}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: evalStatus === st ? '#ffffff' : themeColors.textPrimary }}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }]}
                onPress={() => setShowEvaluateModal(false)}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#3b82f6' }]}
                disabled={submitting}
                onPress={handleEvaluateSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Submit Evaluation</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  tabSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  switcherText: { fontSize: 12.5, fontWeight: '700' },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  filterRow: {
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 11.5, fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  candName: { fontSize: 15, fontWeight: 'bold' },
  candRole: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10.5, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 10 },
  infoRow: { marginBottom: 6 },
  infoLabel: { fontSize: 12 },
  feedbackBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginVertical: 8 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
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
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
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
