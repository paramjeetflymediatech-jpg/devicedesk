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
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import {
  fetchCandidatesPoolApi,
  addCandidatePoolApi,
  updateCandidatePoolApi,
  fetchCandidatesListApi,
  evaluateCandidateTestApi,
  approveCandidateRegistrationApi,
} from '../../utils/api';
import { useTheme } from '../../utils/ThemeContext';
import { sweetAlert } from '../../utils/sweetAlert';

const { width } = Dimensions.get('window');

const PREDEFINED_TEMPLATES = {
  aptitude: [
    { question: 'What is 15% of 80?', options: ['10', '12', '15', '20'], correctIndex: 1 },
    { question: 'If all bloops are razzies and all razzies are lazzies, are all bloops lazzies?', options: ['Yes', 'No', 'Cannot be determined', 'Sometimes'], correctIndex: 0 },
    { question: 'A train travels 60 miles in 1.5 hours. What is its average speed in mph?', options: ['30', '40', '45', '50'], correctIndex: 1 },
    { question: 'If a shopkeeper sells an item for $80 and makes a profit of 20%, what was the original cost of the item?', options: ['$60', '$64', '$66.67', '$70'], correctIndex: 2 },
    { question: 'A bag contains 5 red, 3 blue, and 2 green balls. What is the probability of drawing a blue ball?', options: ['1/10', '3/10', '1/5', '2/5'], correctIndex: 1 },
  ],
  english: [
    { question: 'Choose the correct synonym for "Abundant":', options: ['Scarce', 'Plentiful', 'Empty', 'Brief'], correctIndex: 1 },
    { question: 'Identify the grammatically correct sentence:', options: ['He don\'t know nothing.', 'She doesn\'t know anything.', 'They hasn\'t known nothing.', 'I doesn\'t know anything.'], correctIndex: 1 },
    { question: 'What is the antonym of "Expand"?', options: ['Enlarge', 'Shrink', 'Grow', 'Develop'], correctIndex: 1 },
    { question: 'Which word is a synonym for "benevolent"?', options: ['Malevolent', 'Generous', 'Cruel', 'Selfish'], correctIndex: 1 },
    { question: 'Choose the correct spelling:', options: ['Definetely', 'Definitely', 'Definately', 'Definatly'], correctIndex: 1 },
  ],
  frontend: [
    { question: 'Which of the following is NOT a valid CSS position property value?', options: ['static', 'absolute', 'relative', 'floating'], correctIndex: 3 },
    { question: 'In React, what hook is used to handle side effects?', options: ['useState', 'useContext', 'useEffect', 'useReducer'], correctIndex: 2 },
    { question: 'What is the purpose of the virtual DOM in React?', options: ['To store data globally', 'To improve rendering performance', 'To handle routing', 'To manage component state'], correctIndex: 1 },
    { question: 'Which method is used to add an element to the end of a JavaScript array?', options: ['push()', 'pop()', 'unshift()', 'shift()'], correctIndex: 0 },
    { question: 'How do you center a div horizontally in CSS?', options: ['margin: auto;', 'text-align: center;', 'align-items: center;', 'justify-content: center;'], correctIndex: 0 },
  ],
  backend: [
    { question: 'Which HTTP method is commonly used to retrieve data from a server?', options: ['POST', 'GET', 'PUT', 'DELETE'], correctIndex: 1 },
    { question: 'Which status code indicates that a request was successful?', options: ['404', '500', '200', '301'], correctIndex: 2 },
    { question: 'What does REST stand for?', options: ['Representational State Transfer', 'Remote Server Transfer', 'Reliable State Technology', 'Request State Transfer'], correctIndex: 0 },
    { question: 'Which Node.js framework is commonly used to build backend APIs?', options: ['React', 'Express.js', 'Angular', 'Vue.js'], correctIndex: 1 },
    { question: 'Which database is a NoSQL database?', options: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite'], correctIndex: 2 },
  ],
};

export default function ManageCandidates({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  // 'applications' | 'pool' | 'tests'
  const [subTab, setSubTab] = useState('applications');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [candidates, setCandidates] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [tests, setTests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected Entities
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedReg, setSelectedReg] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);

  // Forms
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

  const [approveForm, setApproveForm] = useState({
    testType: 'mcq', // 'mcq' | 'text' | 'file'
    testTitle: '',
    testInstructions: '',
    fileUrl: '',
    mcqData: [],
  });

  const [evalStatus, setEvalStatus] = useState('Selected');
  const [evalFeedback, setEvalFeedback] = useState('');

  // Custom MCQ Question Input
  const [customQuestion, setCustomQuestion] = useState({
    question: '',
    opt1: '',
    opt2: '',
    opt3: '',
    opt4: '',
    correctIndex: 0,
  });

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

  // Add Candidate to Pool
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

  // Update Pool Feedback
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

  // Open Approve Registration Modal
  const handleOpenApprove = (reg) => {
    setSelectedReg(reg);
    setApproveForm({
      testType: 'mcq',
      testTitle: `${reg.role_applied || 'Candidate'} Skill Assessment`,
      testInstructions: 'Please complete all questions within the allocated time limit.',
      fileUrl: '',
      mcqData: [...PREDEFINED_TEMPLATES.aptitude],
    });
    setShowApproveModal(true);
  };

  // Add Predefined Template to MCQs
  const handleApplyTemplate = (templateKey) => {
    const template = PREDEFINED_TEMPLATES[templateKey] || [];
    setApproveForm(prev => ({
      ...prev,
      mcqData: [...prev.mcqData, ...template],
    }));
    sweetAlert({ title: 'Template Added', text: `Added ${template.length} questions from ${templateKey.toUpperCase()} bank.`, type: 'info' });
  };

  // Add Custom MCQ Question
  const handleAddCustomQuestion = () => {
    if (!customQuestion.question.trim() || !customQuestion.opt1.trim() || !customQuestion.opt2.trim()) {
      sweetAlert({ title: 'Incomplete Question', text: 'Please enter question text and at least 2 options.', type: 'info' });
      return;
    }
    const opts = [customQuestion.opt1, customQuestion.opt2, customQuestion.opt3, customQuestion.opt4].filter(Boolean);
    const newQ = {
      question: customQuestion.question.trim(),
      options: opts,
      correctIndex: customQuestion.correctIndex || 0,
    };
    setApproveForm(prev => ({
      ...prev,
      mcqData: [...prev.mcqData, newQ],
    }));
    setCustomQuestion({ question: '', opt1: '', opt2: '', opt3: '', opt4: '', correctIndex: 0 });
  };

  const handleRemoveQuestion = (index) => {
    setApproveForm(prev => {
      const updated = [...prev.mcqData];
      updated.splice(index, 1);
      return { ...prev, mcqData: updated };
    });
  };

  // Submit Registration Approval & Test Assignment
  const handleApproveSubmit = async () => {
    if (!approveForm.testTitle.trim()) {
      sweetAlert({ title: 'Validation', text: 'Test title is required.', type: 'error' });
      return;
    }
    if (approveForm.testType === 'mcq' && approveForm.mcqData.length === 0) {
      sweetAlert({ title: 'Validation', text: 'Please add at least 1 MCQ question or choose a template bank.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await approveCandidateRegistrationApi({
        registrationId: selectedReg.id,
        testTitle: approveForm.testTitle,
        testInstructions: approveForm.testInstructions,
        fileUrl: approveForm.fileUrl,
        testType: approveForm.testType,
        mcqData: approveForm.mcqData,
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Candidate Approved!',
          text: `Test credentials generated and assigned for ${selectedReg.name}.`,
          type: 'success',
        });
        setShowApproveModal(false);
        loadData();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || 'Failed to approve candidate.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network connection failure.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Evaluate Test Submission
  const handleEvaluateSubmit = async () => {
    if (!selectedTest) return;
    setSubmitting(true);
    try {
      const res = await evaluateCandidateTestApi(selectedTest.id, evalStatus, evalFeedback);
      if (res && res.success) {
        sweetAlert({ title: 'Evaluated', text: `Test marked as ${evalStatus}!`, type: 'success' });
        setShowEvaluateModal(false);
        loadData();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || 'Failed to update test evaluation.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network error updating evaluation.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      (r.name || '').toLowerCase().includes(query) ||
      (r.email || '').toLowerCase().includes(query) ||
      (r.phone || '').toLowerCase().includes(query) ||
      (r.role_applied || '').toLowerCase().includes(query);
    const matchStatus = statusFilter === 'ALL' || (r.status || 'Pending').toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

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
      (t.title || t.test_title || '').toLowerCase().includes(query) ||
      (t.status || '').toLowerCase().includes(query)
    );
  });

  const styles = getStyles(themeColors, isDark);

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
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Recruitment & Candidates</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {subTab === 'applications'
              ? `${filteredRegistrations.length} applicant applications`
              : subTab === 'pool'
              ? `${filteredCandidates.length} talent pool candidates`
              : `${filteredTests.length} test submissions`}
          </Text>
        </View>

        {subTab === 'pool' && (
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: '#3b82f6' }]} onPress={() => setShowAddModal(true)}>
            <Text style={styles.headerBtnText}>+ Add Candidate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3 Sub-Tabs Switcher */}
      <View style={[styles.tabSwitcher, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.switcherTab, subTab === 'applications' && styles.switcherTabActive]}
          onPress={() => setSubTab('applications')}
        >
          <Text style={[styles.switcherText, { color: subTab === 'applications' ? '#3b82f6' : themeColors.textSecondary }]}>
            📝 Applications ({registrations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switcherTab, subTab === 'pool' && styles.switcherTabActive]}
          onPress={() => setSubTab('pool')}
        >
          <Text style={[styles.switcherText, { color: subTab === 'pool' ? '#3b82f6' : themeColors.textSecondary }]}>
            👥 Pool ({candidates.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switcherTab, subTab === 'tests' && styles.switcherTabActive]}
          onPress={() => setSubTab('tests')}
        >
          <Text style={[styles.switcherText, { color: subTab === 'tests' ? '#3b82f6' : themeColors.textSecondary }]}>
            🎯 Tests ({tests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <Text style={{ fontSize: 14, color: themeColors.textSecondary, marginRight: 6 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: themeColors.textPrimary }]}
          placeholder="Search by name, role, email, phone..."
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tab Content */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: themeColors.textSecondary, marginTop: 12 }}>Loading records...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        >
          {/* 1. APPLICATIONS / REGISTRATIONS TAB */}
          {subTab === 'applications' && (
            filteredRegistrations.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>📝</Text>
                <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Job Applications</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  {searchQuery ? 'No applicants match your search.' : 'New job applications from the careers portal will appear here.'}
                </Text>
              </View>
            ) : (
              filteredRegistrations.map((reg) => {
                const isApproved = reg.status === 'Approved' || reg.status === 'Test Assigned';
                const isRejected = reg.status === 'Rejected';

                return (
                  <View key={reg.id} style={[styles.itemCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{reg.name}</Text>
                        <Text style={[styles.cardSubTitle, { color: '#3b82f6' }]}>💼 {reg.role_applied || 'General Role'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isApproved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309' }}>
                          {reg.status || 'Pending'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoMetaRow}>
                      <Text style={[styles.infoMetaText, { color: themeColors.textSecondary }]}>📧 {reg.email || 'N/A'}</Text>
                      <Text style={[styles.infoMetaText, { color: themeColors.textSecondary }]}>📞 {reg.phone || 'N/A'}</Text>
                      {reg.experience ? <Text style={[styles.infoMetaText, { color: themeColors.textSecondary }]}>⏱️ Exp: {reg.experience}</Text> : null}
                      {reg.expected_salary ? <Text style={[styles.infoMetaText, { color: themeColors.textSecondary }]}>💰 Expected: {reg.expected_salary}</Text> : null}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                      {reg.resume_url ? (
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                          onPress={() => Linking.openURL(reg.resume_url).catch(() => {})}
                        >
                          <Text style={[styles.miniBtnText, { color: themeColors.textPrimary }]}>📄 Resume</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.miniBtn, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: '#3b82f6', borderWidth: 1 }]}
                        onPress={() => {
                          setSelectedReg(reg);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Text style={[styles.miniBtnText, { color: '#3b82f6' }]}>👁️ Details</Text>
                      </TouchableOpacity>

                      {!isApproved && !isRejected && (
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: '#10b981' }]}
                          onPress={() => handleOpenApprove(reg)}
                        >
                          <Text style={[styles.miniBtnText, { color: '#ffffff' }]}>✅ Approve & Test</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )
          )}

          {/* 2. TALENT POOL TAB */}
          {subTab === 'pool' && (
            filteredCandidates.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>👥</Text>
                <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Talent Pool Candidates</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  Add candidates to your talent pool to track interviews and statuses.
                </Text>
              </View>
            ) : (
              filteredCandidates.map((c) => (
                <View key={c.id} style={[styles.itemCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{c.name}</Text>
                      <Text style={[styles.cardSubTitle, { color: '#3b82f6' }]}>💼 {c.role_applied || 'Role'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#e0e7ff' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#3730a3' }}>{c.status || 'Pending'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoMetaRow}>
                    <Text style={[styles.infoMetaText, { color: themeColors.textSecondary }]}>📧 {c.email || 'N/A'}</Text>
                    <Text style={[styles.infoMetaText, { color: themeColors.textSecondary }]}>📞 {c.phone || 'N/A'}</Text>
                  </View>

                  {c.feedback ? (
                    <View style={[styles.feedbackSnippet, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border }]}>
                      <Text style={{ fontSize: 12, color: themeColors.textSecondary, fontStyle: 'italic' }}>
                        💬 "{c.feedback}"
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    {c.resume_url ? (
                      <TouchableOpacity
                        style={[styles.miniBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                        onPress={() => Linking.openURL(c.resume_url).catch(() => {})}
                      >
                        <Text style={[styles.miniBtnText, { color: themeColors.textPrimary }]}>📄 Resume</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.miniBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={() => {
                        setSelectedCandidate(c);
                        setFeedbackForm({
                          id: c.id,
                          name: c.name,
                          status: c.status || 'Pending',
                          feedback: c.feedback || '',
                        });
                        setShowFeedbackModal(true);
                      }}
                    >
                      <Text style={[styles.miniBtnText, { color: '#ffffff' }]}>📝 Update Status</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}

          {/* 3. TEST SUBMISSIONS TAB */}
          {subTab === 'tests' && (
            filteredTests.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🎯</Text>
                <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Test Submissions</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  Candidate test submissions and scores will appear here.
                </Text>
              </View>
            ) : (
              filteredTests.map((t) => {
                const isDone = t.status === 'Evaluated' || t.status === 'Selected' || t.status === 'Passed';
                return (
                  <View key={t.id} style={[styles.itemCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{t.candidate_name || 'Candidate'}</Text>
                        <Text style={[styles.cardSubTitle, { color: '#06b6d4' }]}>🎯 {t.title || t.test_title || 'Assessment Test'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isDone ? '#dcfce7' : '#fef3c7' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isDone ? '#15803d' : '#b45309' }}>
                          {t.status || 'Pending'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoMetaRow}>
                      <Text style={[styles.infoMetaText, { color: themeColors.textSecondary }]}>📧 {t.candidate_email || 'N/A'}</Text>
                      {t.score !== null && t.score !== undefined ? (
                        <Text style={[styles.infoMetaText, { color: '#10b981', fontWeight: 'bold' }]}>
                          🏆 Score: {t.score} / {t.total_questions || 10}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.miniBtn, { backgroundColor: '#3b82f6' }]}
                        onPress={() => {
                          setSelectedTest(t);
                          setEvalStatus(t.status || 'Selected');
                          setEvalFeedback(t.feedback || '');
                          setShowEvaluateModal(true);
                        }}
                      >
                        <Text style={[styles.miniBtnText, { color: '#ffffff' }]}>⚖️ Evaluate Candidate</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          )}
        </ScrollView>
      )}

      {/* Modal: Approve Registration & Assign Test */}
      <Modal
        visible={showApproveModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowApproveModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                Approve & Assign Test ({selectedReg?.name})
              </Text>
              <TouchableOpacity onPress={() => setShowApproveModal(false)}>
                <Text style={{ fontSize: 18, color: themeColors.textPrimary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 16 }}>
              {/* Test Type Selector */}
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Test Format Type:</Text>
              <View style={styles.pillSelectorRow}>
                {['mcq', 'text', 'file'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.selectorPill,
                      approveForm.testType === type && styles.selectorPillActive,
                      { borderColor: themeColors.border }
                    ]}
                    onPress={() => setApproveForm(prev => ({ ...prev, testType: type }))}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: approveForm.testType === type ? '#fff' : themeColors.textPrimary }}>
                      {type === 'mcq' ? '🔘 Multiple Choice (MCQ)' : type === 'text' ? '📝 Written Instructions' : '📁 Project / File Upload'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Test Title */}
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary, marginTop: 12 }]}>Test Title *</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border }]}
                value={approveForm.testTitle}
                onChangeText={(val) => setApproveForm(prev => ({ ...prev, testTitle: val }))}
                placeholder="e.g. Frontend React Assessment"
                placeholderTextColor={themeColors.textSecondary}
              />

              {/* Instructions */}
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary, marginTop: 10 }]}>Instructions / Brief</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border, minHeight: 60 }]}
                value={approveForm.testInstructions}
                onChangeText={(val) => setApproveForm(prev => ({ ...prev, testInstructions: val }))}
                placeholder="Instructions for candidate..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
              />

              {/* MCQ Template Banks */}
              {approveForm.testType === 'mcq' && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Quick Template Banks (Append):</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    <TouchableOpacity style={[styles.templateBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleApplyTemplate('aptitude')}>
                      <Text style={styles.templateBtnText}>+ Aptitude (5 Qs)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.templateBtn, { backgroundColor: '#10b981' }]} onPress={() => handleApplyTemplate('english')}>
                      <Text style={styles.templateBtnText}>+ English (5 Qs)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.templateBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => handleApplyTemplate('frontend')}>
                      <Text style={styles.templateBtnText}>+ Frontend (5 Qs)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.templateBtn, { backgroundColor: '#f59e0b' }]} onPress={() => handleApplyTemplate('backend')}>
                      <Text style={styles.templateBtnText}>+ Backend (5 Qs)</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Added Questions List */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.textPrimary, marginBottom: 6 }}>
                      Questions in Test ({approveForm.mcqData.length}):
                    </Text>
                    {approveForm.mcqData.map((q, qIdx) => (
                      <View key={qIdx} style={[styles.questionItemCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textPrimary, flex: 1 }}>
                            Q{qIdx + 1}: {q.question}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveQuestion(qIdx)}>
                            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 2 }}>
                          Correct: {q.options[q.correctIndex] || 'Option 1'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApproveModal(false)}>
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#10b981' }]}
                onPress={handleApproveSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Approve & Send Test</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Evaluate Test */}
      <Modal
        visible={showEvaluateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEvaluateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Evaluate Candidate Test</Text>
              <TouchableOpacity onPress={() => setShowEvaluateModal(false)}>
                <Text style={{ fontSize: 18, color: themeColors.textPrimary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: themeColors.textPrimary }}>
                Candidate: {selectedTest?.candidate_name}
              </Text>
              <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 12 }}>
                Test: {selectedTest?.title || selectedTest?.test_title}
              </Text>

              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Evaluation Decision:</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
                {['Selected', 'Passed', 'Under Review', 'Rejected'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.selectorPill,
                      evalStatus === status && styles.selectorPillActive,
                      { borderColor: themeColors.border }
                    ]}
                    onPress={() => setEvalStatus(status)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: evalStatus === status ? '#fff' : themeColors.textPrimary }}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary, marginTop: 10 }]}>Feedback / Notes:</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border, minHeight: 60 }]}
                value={evalFeedback}
                onChangeText={setEvalFeedback}
                placeholder="Enter feedback for HR records..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
              />
            </View>

            <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEvaluateModal(false)}>
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#3b82f6' }]}
                onPress={handleEvaluateSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Evaluation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStyles(colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      gap: 12,
    },
    backBtn: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    headerBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    headerBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    tabSwitcher: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    switcherTab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    switcherTabActive: {
      borderBottomColor: '#3b82f6',
    },
    switcherText: {
      fontSize: 12,
      fontWeight: '700',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      padding: 0,
    },
    centerLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
    },
    listScroll: {
      flex: 1,
    },
    emptyCard: {
      padding: 30,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      marginTop: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    itemCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    cardSubTitle: {
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    infoMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 8,
    },
    infoMetaText: {
      fontSize: 12,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(150,150,150,0.15)',
    },
    miniBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    miniBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    feedbackSnippet: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 8,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalBox: {
      width: '100%',
      maxWidth: 480,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 4,
    },
    pillSelectorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    selectorPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    selectorPillActive: {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
    },
    inputBox: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      marginTop: 2,
    },
    templateBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    templateBtnText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    questionItemCard: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 6,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: 12,
      borderTopWidth: 1,
      gap: 10,
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    submitBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    submitBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
