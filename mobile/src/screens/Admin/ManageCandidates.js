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
  Alert,
} from 'react-native';
import {
  fetchCandidatesPoolApi,
  addCandidatePoolApi,
  updateCandidatePoolApi,
  fetchCandidatesListApi,
  evaluateCandidateTestApi,
  approveCandidateRegistrationApi,
  deleteCandidateApplicationApi,
  deleteCandidateTestApi,
  deleteCandidatePoolApi,
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
  const [showTestDetailsModal, setShowTestDetailsModal] = useState(false);
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
      // Fetch both list and pool concurrently so counts and cross-matching are always available
      const [listRes, poolRes] = await Promise.all([
        fetchCandidatesListApi().catch(() => ({ success: false })),
        fetchCandidatesPoolApi().catch(() => ({ success: false })),
      ]);

      const poolData = (poolRes && poolRes.success && Array.isArray(poolRes.data)) ? poolRes.data : [];
      setCandidates(poolData);

      const rawRegs = (listRes && listRes.success && Array.isArray(listRes.registrations)) ? listRes.registrations : [];
      setRegistrations(rawRegs);

      const rawTests = (listRes && listRes.success && Array.isArray(listRes.tests)) ? listRes.tests : [];

      // Resolve candidate details for each test
      const resolvedTests = rawTests.map((t) => {
        let resolvedName = t.candidate_name;
        let resolvedEmail = t.candidate_email;
        let resolvedPhone = t.candidate_phone || '';
        let resolvedPosition = t.candidate_position || '';

        if (resolvedName === 'null' || resolvedName === 'undefined' || resolvedName === 'N/A') resolvedName = '';
        if (resolvedEmail === 'null' || resolvedEmail === 'undefined' || resolvedEmail === 'N/A') resolvedEmail = '';

        const isNameEmpty = !resolvedName || resolvedName.trim() === '' || resolvedName.toLowerCase() === 'candidate';

        if (isNameEmpty) {
          // 1. Direct ID match
          let match = rawRegs.find(r => r.id === t.candidate_employee_id);

          // 2. Email match
          if (!match && resolvedEmail) {
            match = rawRegs.find(r => r.email && r.email.toLowerCase() === resolvedEmail.toLowerCase());
          }

          // 3. Proximity timestamp match
          if (!match) {
            const getNumericTs = (str) => {
              if (!str) return NaN;
              const nums = str.replace(/[^0-9]/g, '').slice(0, 13);
              return nums.length >= 10 ? parseInt(nums, 10) : NaN;
            };
            const testTs = getNumericTs(t.candidate_employee_id) || getNumericTs(t.id);
            if (!isNaN(testTs)) {
              let closest = null;
              let minDiff = 25 * 60 * 1000; // within 25 minutes
              for (const r of rawRegs) {
                const regTs = getNumericTs(r.id);
                if (!isNaN(regTs)) {
                  const diff = Math.abs(testTs - regTs);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closest = r;
                  }
                }
              }
              if (closest) match = closest;
            }
          }

          // 4. Candidate Pool match
          if (!match && poolData.length > 0) {
            if (resolvedEmail) {
              match = poolData.find(c => c.email && c.email.toLowerCase() === resolvedEmail.toLowerCase());
            }
            if (!match) {
              match = poolData.find(c => c.id === t.candidate_employee_id);
            }
            if (!match) {
              const getNumericTs = (str) => {
                if (!str) return NaN;
                const nums = str.replace(/[^0-9]/g, '').slice(0, 13);
                return nums.length >= 10 ? parseInt(nums, 10) : NaN;
              };
              const testTs = getNumericTs(t.candidate_employee_id) || getNumericTs(t.id);
              if (!isNaN(testTs)) {
                let closest = null;
                let minDiff = 60 * 60 * 1000;
                for (const c of poolData) {
                  const poolTs = getNumericTs(c.id);
                  if (!isNaN(poolTs)) {
                    const diff = Math.abs(testTs - poolTs);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closest = c;
                    }
                  }
                }
                if (closest) match = closest;
              }
            }
          }

          // 5. Match by role or unclaimed approved registration
          if (!match) {
            const testTitleLower = (t.title || t.test_title || '').toLowerCase();
            const poolMatch = poolData.find(c => c.role_applied && testTitleLower.includes(c.role_applied.toLowerCase()));
            if (poolMatch) match = poolMatch;
          }

          if (match) {
            resolvedName = match.name || resolvedName;
            resolvedEmail = resolvedEmail || match.email || '';
            resolvedPhone = resolvedPhone || match.phone || '';
            resolvedPosition = resolvedPosition || match.position_applied || match.role_applied || '';
          }
        }

        // Fill remaining phone/position
        if (resolvedName && (!resolvedPhone || !resolvedPosition)) {
          const regMatch = rawRegs.find(r => 
            (r.name && r.name.toLowerCase() === resolvedName.toLowerCase()) ||
            (resolvedEmail && r.email && r.email.toLowerCase() === resolvedEmail.toLowerCase())
          );
          if (regMatch) {
            resolvedPhone = resolvedPhone || regMatch.phone || '';
            resolvedPosition = resolvedPosition || regMatch.position_applied || regMatch.role_applied || '';
          }
          if (!resolvedPhone || !resolvedPosition) {
            const poolMatch = poolData.find(c => 
              (c.name && c.name.toLowerCase() === resolvedName.toLowerCase()) ||
              (resolvedEmail && c.email && c.email.toLowerCase() === resolvedEmail.toLowerCase())
            );
            if (poolMatch) {
              resolvedPhone = resolvedPhone || poolMatch.phone || '';
              resolvedPosition = resolvedPosition || poolMatch.role_applied || '';
            }
          }
        }

        // Score calculation from test_data
        let calculatedScore = t.score;
        let totalCount = t.total_questions || null;
        let parsedQuestions = null;

        if (t.test_data) {
          try {
            const p = typeof t.test_data === 'string' ? JSON.parse(t.test_data) : t.test_data;
            if (Array.isArray(p)) {
              parsedQuestions = p;
              totalCount = p.length;
              const correct = p.filter(q => q.isCorrect === true || q.isCorrect === 'true' || q.isCorrect === 1).length;
              if (calculatedScore === null || calculatedScore === undefined) {
                calculatedScore = correct;
              }
            }
          } catch (e) {}
        }

        return {
          ...t,
          candidate_name: (resolvedName && resolvedName !== 'Candidate') ? resolvedName : (resolvedEmail ? resolvedEmail.split('@')[0] : 'Applicant Candidate'),
          candidate_email: resolvedEmail || '',
          candidate_phone: resolvedPhone || '',
          candidate_position: resolvedPosition || '',
          score: calculatedScore,
          total_questions: totalCount,
          parsedQuestions,
        };
      });

      setTests(resolvedTests);
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

  const handleDeleteApplication = (reg) => {
    Alert.alert(
      'Delete Application',
      `Are you sure you want to delete the application for ${reg.name}? This will permanently remove their application and test credentials.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteCandidateApplicationApi(reg.id);
              if (res && res.success) {
                sweetAlert({ title: 'Deleted', text: 'Application removed successfully.', type: 'success' });
                loadData();
              } else {
                sweetAlert({ title: 'Error', text: res?.error || 'Failed to delete application.', type: 'error' });
              }
            } catch (err) {
              sweetAlert({ title: 'Error', text: 'Network error deleting application.', type: 'error' });
            }
          }
        }
      ]
    );
  };

  const handleDeleteTest = (t) => {
    Alert.alert(
      'Delete Assigned Test',
      `Are you sure you want to delete the test "${t.title || t.test_title || 'Test'}" assigned to ${t.candidate_name || 'Candidate'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteCandidateTestApi(t.id);
              if (res && res.success) {
                sweetAlert({ title: 'Deleted', text: 'Assigned test removed successfully.', type: 'success' });
                loadData();
              } else {
                sweetAlert({ title: 'Error', text: res?.error || 'Failed to delete assigned test.', type: 'error' });
              }
            } catch (err) {
              sweetAlert({ title: 'Error', text: 'Network error deleting test.', type: 'error' });
            }
          }
        }
      ]
    );
  };

  const handleDeletePoolCandidate = (c) => {
    Alert.alert(
      'Delete Candidate',
      `Are you sure you want to remove ${c.name} from the talent pool?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteCandidatePoolApi(c.id);
              if (res && res.success) {
                sweetAlert({ title: 'Deleted', text: 'Candidate removed from talent pool.', type: 'success' });
                loadData();
              } else {
                sweetAlert({ title: 'Error', text: res?.error || 'Failed to delete candidate.', type: 'error' });
              }
            } catch (err) {
              sweetAlert({ title: 'Error', text: 'Network error deleting candidate.', type: 'error' });
            }
          }
        }
      ]
    );
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
      (t.candidate_phone || '').toLowerCase().includes(query) ||
      (t.candidate_position || '').toLowerCase().includes(query) ||
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
                    <View style={styles.actionsContainer}>
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

                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: isDark ? '#451a1a' : '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}
                          onPress={() => handleDeleteApplication(reg)}
                        >
                          <Text style={[styles.miniBtnText, { color: '#ef4444' }]}>🗑️ Delete</Text>
                        </TouchableOpacity>
                      </View>

                      {!isApproved && !isRejected && (
                        <TouchableOpacity
                          style={[styles.primaryApproveBtn, { backgroundColor: '#10b981' }]}
                          onPress={() => handleOpenApprove(reg)}
                        >
                          <Text style={styles.primaryApproveBtnText}>✅ Approve & Assign Test</Text>
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

                    <TouchableOpacity
                      style={[styles.miniBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                      onPress={() => handleDeletePoolCandidate(c)}
                    >
                      <Text style={[styles.miniBtnText, { color: '#ef4444' }]}>🗑️ Delete</Text>
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
                  {searchQuery ? 'No test tasks match your search filter.' : 'Candidate test submissions and scores will appear here.'}
                </Text>
              </View>
            ) : (
              filteredTests.map((t) => {
                const isCompleted = t.status === 'Completed';
                const isEvaluated = t.status === 'Evaluated' || t.status === 'Selected' || t.status === 'Passed';
                const isRejected = t.status === 'Rejected';

                const statusBg = isCompleted ? '#dcfce7' : isEvaluated ? '#e0e7ff' : isRejected ? '#fee2e2' : '#fef3c7';
                const statusColor = isCompleted ? '#15803d' : isEvaluated ? '#3730a3' : isRejected ? '#b91c1c' : '#b45309';
                const statusLabel = isCompleted ? '✓ Submitted' : isEvaluated ? `🏆 ${t.status}` : isRejected ? '✕ Rejected' : '⏳ In Progress';

                const hasScore = t.score !== null && t.score !== undefined && t.total_questions;
                const scorePercent = hasScore ? Math.round((t.score / t.total_questions) * 100) : 0;
                const isPassing = scorePercent >= 50;

                return (
                  <View key={t.id} style={[styles.itemCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    {/* Header: Candidate Name, Position, Status */}
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
                          {t.candidate_name || 'Candidate'}
                        </Text>
                        {t.candidate_position ? (
                          <Text style={[styles.cardSubTitle, { color: '#3b82f6' }]}>
                            💼 {t.candidate_position}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Test Info Banner */}
                    <View style={[styles.testMetaBanner, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284c7' }}>
                          🎯 {t.title || t.test_title || 'Skill Assessment'}
                        </Text>
                        <View style={[styles.testTypeChip, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: themeColors.textSecondary }}>
                            {t.test_type === 'mcq' ? `MCQ Quiz (${t.total_questions || 'N/A'} Qs)` : 'Written Task'}
                          </Text>
                        </View>
                      </View>
                      {t.created_at ? (
                        <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 4 }}>
                          📅 Assigned: {new Date(t.created_at).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>

                    {/* Contact Details */}
                    <View style={styles.infoMetaRow}>
                      {t.candidate_email ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${t.candidate_email}`).catch(() => {})}>
                          <Text style={[styles.infoMetaText, { color: '#3b82f6' }]}>📧 {t.candidate_email}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {t.candidate_phone ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${t.candidate_phone}`).catch(() => {})}>
                          <Text style={[styles.infoMetaText, { color: '#10b981' }]}>📞 {t.candidate_phone}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Score / Performance Box */}
                    {hasScore ? (
                      <View style={[styles.scoreBox, { backgroundColor: isDark ? '#064e3b22' : '#ecfdf5', borderColor: '#10b98144' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 15 }}>🏆</Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#10b981' }}>
                              Score: {t.score} / {t.total_questions}
                            </Text>
                          </View>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: isPassing ? '#10b98122' : '#f59e0b22' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: isPassing ? '#10b981' : '#f59e0b' }}>
                              {scorePercent}% • {isPassing ? 'Passed' : 'Needs Review'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {/* Instructions snippet */}
                    {t.test_instructions && t.test_instructions !== 'Please complete the multiple choice questions below.' ? (
                      <View style={[styles.instructionsBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border }]}>
                        <Text style={{ fontSize: 11.5, color: themeColors.textSecondary }} numberOfLines={2}>
                          📋 <Text style={{ fontWeight: '600' }}>Instructions: </Text>{t.test_instructions}
                        </Text>
                      </View>
                    ) : null}

                    {/* Feedback quote snippet */}
                    {t.feedback ? (
                      <View style={[styles.feedbackSnippet, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: '#3b82f644' }]}>
                        <Text style={{ fontSize: 12, color: themeColors.textSecondary, fontStyle: 'italic' }}>
                          💬 Feedback: "{t.feedback}"
                        </Text>
                      </View>
                    ) : null}

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                      <View style={styles.actionsRow}>
                        {t.parsedQuestions && t.parsedQuestions.length > 0 ? (
                          <TouchableOpacity
                            style={[styles.miniBtn, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: '#0ea5e9', borderWidth: 1 }]}
                            onPress={() => {
                              setSelectedTest(t);
                              setShowTestDetailsModal(true);
                            }}
                          >
                            <Text style={[styles.miniBtnText, { color: '#0ea5e9' }]}>👁️ View Answers</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: '#3b82f6' }]}
                          onPress={() => {
                            setSelectedTest(t);
                            setEvalStatus(t.status === 'Completed' ? 'Selected' : (t.status || 'Selected'));
                            setEvalFeedback(t.feedback || '');
                            setShowEvaluateModal(true);
                          }}
                        >
                          <Text style={[styles.miniBtnText, { color: '#ffffff' }]}>⚖️ Evaluate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: isDark ? '#451a1a' : '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}
                          onPress={() => handleDeleteTest(t)}
                        >
                          <Text style={[styles.miniBtnText, { color: '#ef4444' }]}>🗑️ Delete</Text>
                        </TouchableOpacity>
                      </View>
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
              {/* Candidate Info Header */}
              <View style={[styles.evalCandidateBanner, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: themeColors.textPrimary }}>
                  {selectedTest?.candidate_name || 'Candidate'}
                </Text>
                {selectedTest?.candidate_position ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6', marginTop: 2 }}>
                    💼 {selectedTest?.candidate_position}
                  </Text>
                ) : null}
                {selectedTest?.candidate_email ? (
                  <Text style={{ fontSize: 11.5, color: themeColors.textSecondary, marginTop: 2 }}>
                    📧 {selectedTest?.candidate_email}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 11.5, color: '#0284c7', marginTop: 2 }}>
                  🎯 {selectedTest?.title || selectedTest?.test_title || 'Assessment'}
                </Text>
                {selectedTest?.score !== null && selectedTest?.score !== undefined && selectedTest?.total_questions ? (
                  <View style={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: isDark ? '#064e3b33' : '#dcfce7', alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#15803d' }}>
                      🏆 Submission Score: {selectedTest.score} / {selectedTest.total_questions} ({Math.round((selectedTest.score / selectedTest.total_questions) * 100)}%)
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Evaluation Decision:</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8, flexWrap: 'wrap' }}>
                {['Selected', 'Passed', 'Under Review', 'Rejected'].map(status => {
                  const isActive = evalStatus === status;
                  let pillBg = isActive ? '#3b82f6' : (isDark ? '#1e293b' : '#f8fafc');
                  if (isActive && status === 'Selected') pillBg = '#10b981';
                  if (isActive && status === 'Rejected') pillBg = '#ef4444';

                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.selectorPill,
                        { backgroundColor: pillBg, borderColor: isActive ? pillBg : themeColors.border }
                      ]}
                      onPress={() => setEvalStatus(status)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#fff' : themeColors.textPrimary }}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary, marginTop: 10 }]}>Feedback / Notes:</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border, minHeight: 65, textAlignVertical: 'top' }]}
                value={evalFeedback}
                onChangeText={setEvalFeedback}
                placeholder="Enter feedback or interview notes for HR records..."
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

      {/* Modal: Test Submission Answers / Details */}
      <Modal
        visible={showTestDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTestDetailsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: themeColors.card, borderColor: themeColors.border, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                  Test Answers: {selectedTest?.candidate_name || 'Candidate'}
                </Text>
                <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 2 }}>
                  {selectedTest?.title || selectedTest?.test_title || 'Assessment'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTestDetailsModal(false)}>
                <Text style={{ fontSize: 18, color: themeColors.textPrimary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Score header */}
            {selectedTest?.score !== null && selectedTest?.score !== undefined && selectedTest?.total_questions ? (
              <View style={{ padding: 12, backgroundColor: isDark ? '#064e3b22' : '#ecfdf5', borderBottomWidth: 1, borderBottomColor: '#10b98133', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981' }}>
                  Final Score: {selectedTest.score} / {selectedTest.total_questions} ({Math.round((selectedTest.score / selectedTest.total_questions) * 100)}%)
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: selectedTest.score >= (selectedTest.total_questions / 2) ? '#10b981' : '#f59e0b' }}>
                  {selectedTest.score >= (selectedTest.total_questions / 2) ? '✓ Passed' : '⚠️ Needs Review'}
                </Text>
              </View>
            ) : null}

            <ScrollView style={{ padding: 14 }}>
              {selectedTest?.parsedQuestions && selectedTest.parsedQuestions.length > 0 ? (
                selectedTest.parsedQuestions.map((q, idx) => {
                  const isCorrect = q.isCorrect === true || q.isCorrect === 'true' || q.isCorrect === 1;
                  const candidateChoice = q.candidateChoice;
                  const correctIndex = q.correctIndex;

                  return (
                    <View key={idx} style={[styles.questionItemCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isCorrect ? '#10b98155' : '#ef444455', marginBottom: 12, padding: 12 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: themeColors.textSecondary }}>
                          Question {idx + 1}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isCorrect ? '#10b981' : '#ef4444' }}>
                          {isCorrect ? '✓ Correct (+1)' : '✗ Incorrect (0)'}
                        </Text>
                      </View>

                      <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.textPrimary, marginBottom: 8 }}>
                        {q.question}
                      </Text>

                      {/* Options */}
                      {Array.isArray(q.options) && q.options.map((opt, optIdx) => {
                        const isChosenByCandidate = candidateChoice === optIdx;
                        const isTheCorrectOption = correctIndex === optIdx;

                        let optBg = 'transparent';
                        let optBorder = themeColors.border;
                        let optTextColor = themeColors.textPrimary;
                        let badgeText = '';

                        if (isTheCorrectOption) {
                          optBg = isDark ? '#064e3b33' : '#dcfce7';
                          optBorder = '#10b981';
                          optTextColor = '#15803d';
                          badgeText = '✓ Correct Answer';
                        }
                        if (isChosenByCandidate && !isCorrect) {
                          optBg = isDark ? '#451a1a33' : '#fee2e2';
                          optBorder = '#ef4444';
                          optTextColor = '#b91c1c';
                          badgeText = '✗ Candidate Choice';
                        } else if (isChosenByCandidate && isCorrect) {
                          badgeText = '✓ Candidate Choice (Correct)';
                        }

                        return (
                          <View
                            key={optIdx}
                            style={{
                              padding: 8,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: optBorder,
                              backgroundColor: optBg,
                              marginBottom: 4,
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 12, color: optTextColor, flex: 1, fontWeight: isTheCorrectOption || isChosenByCandidate ? '700' : '400' }}>
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </Text>
                            {badgeText ? (
                              <Text style={{ fontSize: 10, fontWeight: '700', color: optTextColor, marginLeft: 6 }}>
                                {badgeText}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                  No question-level response details found for this submission.
                </Text>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => setShowTestDetailsModal(false)}
              >
                <Text style={styles.submitBtnText}>Done</Text>
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
    actionsContainer: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(150,150,150,0.15)',
      gap: 8,
    },
    actionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 8,
    },
    miniBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    primaryApproveBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    primaryApproveBtnText: {
      color: '#ffffff',
      fontSize: 12.5,
      fontWeight: '800',
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
    testMetaBanner: {
      marginTop: 8,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    testTypeChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    scoreBox: {
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 8,
    },
    instructionsBox: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 8,
    },
    evalCandidateBanner: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 14,
    },
  });
}
