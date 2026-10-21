import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Linking, 
  Alert,
  RefreshControl,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { fetchCandidateTest, submitCandidateTest } from '../utils/api';
import AppIcon from '../components/AppIcon';

export default function CandidateDashboardScreen({ user, onLogout }) {
  const { themeColors, isDark } = useTheme();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mcqData, setMcqData] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const loadTest = useCallback(async (isPullToRefresh = false) => {
    if (!user?.id) return;
    if (isPullToRefresh) setRefreshing(true);
    try {
      const data = await fetchCandidateTest(user.id);
      if (data.success && data.test) {
        setTest(data.test);
        if (data.test.test_type === 'mcq') {
          try {
            setMcqData(typeof data.test.test_data === 'string' ? JSON.parse(data.test.test_data) : data.test.test_data || []);
          } catch (e) {
            console.error('Failed to parse MCQ data', e);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load candidate test', err);
    } finally {
      setLoading(false);
      if (isPullToRefresh) setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTest();
  }, [loadTest]);

  const handleDownload = () => {
    if (test?.file_url) {
      Linking.openURL(test.file_url).catch(err => console.error("Couldn't load page", err));
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < mcqData.length) {
      Alert.alert('Incomplete Assessment', 'Please answer all questions before submitting your test.');
      return;
    }

    Alert.alert(
      'Submit Assessment',
      'Are you sure you want to finalize your submission? Your score will be calculated and forwarded directly to HR for evaluation.',
      [
        { text: 'Review Answers', style: 'cancel' },
        { 
          text: 'Confirm & Submit', 
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await submitCandidateTest(test.id, user.id, answers);
              if (res.success) {
                Alert.alert(
                  'Submitted Successfully! 🎉', 
                  'Your assessment results have been recorded and forwarded to HR for evaluation.',
                  [{ text: 'View Evaluation', onPress: () => loadTest() }]
                );
                loadTest();
              } else {
                Alert.alert('Submission Error', res.error || 'Failed to submit test');
              }
            } catch (err) {
              Alert.alert('Network Error', 'Could not submit test. Please check your connection.');
            } finally {
              setSubmitting(false);
            }
          } 
        }
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // Determine if candidate has submitted the test
  const isSubmitted = test && test.status && test.status !== 'Pending';

  // Compute MCQ Metrics
  const correctCount = mcqData.filter(q => q.isCorrect === true).length;
  const wrongCount = mcqData.filter(q => q.isCorrect === false).length;
  const totalCount = mcqData.length || (correctCount + wrongCount);
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : (test?.score || 0);

  // Status Theme & HR Evaluation Configuration
  const getStatusConfig = () => {
    const s = (test?.status || '').toLowerCase();
    if (s === 'selected' || s === 'passed') {
      return {
        badge: 'CONFIRMED: SELECTED',
        title: 'HR Confirmation: Selected 🎉',
        desc: 'Congratulations! The HR recruitment team has evaluated your performance and confirmed your selection for the next round.',
        bg: '#064e3b',
        cardBg: isDark ? '#064e3b' : '#ecfdf5',
        border: '#10b981',
        text: isDark ? '#ecfdf5' : '#065f46',
        badgeBg: '#10b981',
        iconColor: '#34d399',
        iconName: 'award',
        ratingLabel: '🏆 Outstanding (Top Tier)'
      };
    }
    if (s === 'under review') {
      return {
        badge: 'HR REVIEW IN PROGRESS',
        title: 'Assessment Under Review ⏳',
        desc: 'Your test results were received. HR is currently reviewing your assessment details and feedback.',
        bg: '#1e3a8a',
        cardBg: isDark ? '#1e3a8a' : '#eff6ff',
        border: '#3b82f6',
        text: isDark ? '#eff6ff' : '#1e40af',
        badgeBg: '#3b82f6',
        iconColor: '#60a5fa',
        iconName: 'clock',
        ratingLabel: '⏳ In Evaluation'
      };
    }
    if (s === 'rejected') {
      return {
        badge: 'EVALUATION FINALIZED',
        title: 'Application Concluded',
        desc: 'Thank you for taking the time to complete the test. Your application will remain active in our talent directory.',
        bg: '#7f1d1d',
        cardBg: isDark ? '#7f1d1d' : '#fef2f2',
        border: '#ef4444',
        text: isDark ? '#fef2f2' : '#991b1b',
        badgeBg: '#ef4444',
        iconColor: '#f87171',
        iconName: 'alert',
        ratingLabel: 'Completed'
      };
    }
    if (s === 'evaluated') {
      return {
        badge: 'EVALUATED BY HR',
        title: 'Evaluation Completed 📋',
        desc: 'HR has completed evaluating your submission. Check the official remarks and roadmap below.',
        bg: '#312e81',
        cardBg: isDark ? '#312e81' : '#eef2ff',
        border: '#6366f1',
        text: isDark ? '#eef2ff' : '#3730a3',
        badgeBg: '#6366f1',
        iconColor: '#818cf8',
        iconName: 'check-circle',
        ratingLabel: accuracy >= 70 ? '🌟 Good Standard' : 'Evaluated'
      };
    }
    // Default: Completed / Submitted
    return {
      badge: 'AWAITING HR REVIEW',
      title: 'Submitted - Pending HR Confirmation 🕒',
      desc: 'Your assessment was submitted successfully. The HR team will review your score and confirm evaluation remarks shortly.',
      bg: '#78350f',
      cardBg: isDark ? '#78350f' : '#fffbeb',
      border: '#f59e0b',
      text: isDark ? '#fef3c7' : '#92400e',
      badgeBg: '#f59e0b',
      iconColor: '#fbbf24',
      iconName: 'check-circle',
      ratingLabel: accuracy >= 85 ? '🏆 Outstanding (85%+)' : accuracy >= 70 ? '🌟 Good (70-84%)' : accuracy >= 50 ? '👍 Satisfactory' : '⚠️ Below Benchmark'
    };
  };

  const statusConfig = getStatusConfig();
  const isHrEvaluated = !!(test?.feedback || (test?.status && test.status !== 'Completed' && test.status !== 'Pending'));
  const isSelected = test?.status === 'Selected' || test?.status === 'Passed';

  // =========================================================================
  // SUBMITTED / EVALUATION VIEW
  // =========================================================================
  const renderEvaluationView = () => {
    return (
      <View style={styles.evalContainer}>
        {/* 1. Hero Status Banner */}
        <View style={[styles.heroCard, { backgroundColor: statusConfig.cardBg, borderColor: statusConfig.border }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.statusChip, { backgroundColor: statusConfig.badgeBg }]}>
              <Text style={styles.statusChipText}>{statusConfig.badge}</Text>
            </View>
            <TouchableOpacity 
              style={styles.refreshCircleBtn} 
              onPress={() => loadTest(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <AppIcon name="refresh" size={16} color="#0284c7" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.heroBody}>
            <View style={[styles.heroIconWrap, { backgroundColor: statusConfig.badgeBg + '22' }]}>
              <AppIcon name={statusConfig.iconName} size={36} color={statusConfig.badgeBg} />
            </View>
            <Text style={[styles.heroTitle, { color: statusConfig.text }]}>{statusConfig.title}</Text>
            <Text style={[styles.heroDesc, { color: statusConfig.text }]}>{statusConfig.desc}</Text>
          </View>

          <View style={[styles.heroFooter, { borderTopColor: statusConfig.border + '33' }]}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>TEST</Text>
              <Text style={[styles.metaVal, { color: statusConfig.text }]} numberOfLines={1}>{test.test_title}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SUBMITTED</Text>
              <Text style={[styles.metaVal, { color: statusConfig.text }]}>
                {test?.submitted_at ? formatDate(test.submitted_at) : 'Recorded'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Executive Score & Performance Pill */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <AppIcon name="award" size={20} color="#0284c7" />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Performance Metrics</Text>
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>{statusConfig.ratingLabel}</Text>
            </View>
          </View>

          {/* Accuracy Spotlight */}
          <View style={styles.accuracySpotlight}>
            <View style={styles.accuracyCenter}>
              <Text style={styles.accuracyNumber}>{accuracy}%</Text>
              <Text style={styles.accuracySub}>OVERALL ACCURACY</Text>
            </View>
          </View>

          {/* 3 Metric Pills */}
          <View style={styles.metricRow}>
            <View style={[styles.metricPill, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Text style={[styles.metricNum, { color: themeColors.text }]}>{totalCount}</Text>
              <Text style={styles.metricLabel}>TOTAL QUESTIONS</Text>
            </View>
            <View style={[styles.metricPill, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5', borderColor: '#10b981', borderWidth: 1 }]}>
              <Text style={[styles.metricNum, { color: '#10b981' }]}>{correctCount}</Text>
              <Text style={[styles.metricLabel, { color: '#059669' }]}>CORRECT</Text>
            </View>
            <View style={[styles.metricPill, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2', borderColor: '#ef4444', borderWidth: 1 }]}>
              <Text style={[styles.metricNum, { color: '#ef4444' }]}>{wrongCount}</Text>
              <Text style={[styles.metricLabel, { color: '#b91c1c' }]}>INCORRECT</Text>
            </View>
          </View>
        </View>

        {/* 3. Official HR Feedback Box */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <AppIcon name="file-text" size={20} color="#0284c7" />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Official HR Feedback</Text>
            </View>
            {test?.evaluated_at && (
              <Text style={styles.timeTag}>{formatDate(test.evaluated_at)}</Text>
            )}
          </View>

          {test?.feedback ? (
            <View style={styles.feedbackCard}>
              <Text style={styles.quoteMark}>“</Text>
              <Text style={[styles.feedbackBody, { color: themeColors.text }]}>
                {test.feedback}
              </Text>
              <View style={styles.feedbackSignature}>
                <AppIcon name="check-circle" size={15} color="#10b981" />
                <Text style={styles.feedbackSignee}>Confirmed by HR Recruitment Team</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyFeedbackWrap, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
              <AppIcon name="clock" size={26} color="#f59e0b" />
              <Text style={[styles.emptyFeedbackTitle, { color: themeColors.text }]}>HR Evaluation Queued</Text>
              <Text style={styles.emptyFeedbackText}>
                Your submission is received. Quantitative scores are recorded above; qualitative evaluation notes will appear here once finalized by HR.
              </Text>
            </View>
          )}
        </View>

        {/* 4. Recruitment Stage Roadmap */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <AppIcon name="check-circle" size={20} color="#0284c7" />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Hiring Process Pipeline</Text>
            </View>
          </View>

          <View style={styles.roadmapWrap}>
            {/* Step 1 */}
            <View style={styles.roadmapItem}>
              <View style={[styles.roadmapNode, styles.roadmapNodeCompleted]}>
                <AppIcon name="check" size={12} color="#fff" />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={[styles.roadmapTitle, { color: themeColors.text }]}>1. Test Assigned</Text>
                <Text style={styles.roadmapSub}>{formatDate(test?.created_at)}</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.roadmapItem}>
              <View style={[styles.roadmapNode, styles.roadmapNodeCompleted]}>
                <AppIcon name="check" size={12} color="#fff" />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={[styles.roadmapTitle, { color: themeColors.text }]}>2. Test Submitted</Text>
                <Text style={styles.roadmapSub}>
                  {test?.submitted_at ? formatDate(test.submitted_at) : 'Completed'}
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.roadmapItem}>
              <View style={[
                styles.roadmapNode, 
                isHrEvaluated ? styles.roadmapNodeCompleted : styles.roadmapNodeActive
              ]}>
                <AppIcon name={isHrEvaluated ? "check" : "clock"} size={12} color="#fff" />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={[styles.roadmapTitle, { color: themeColors.text }]}>
                  3. HR Performance Evaluation
                </Text>
                <Text style={[styles.roadmapSub, isHrEvaluated && { color: '#10b981', fontWeight: '700' }]}>
                  {isHrEvaluated 
                    ? `Confirmed ${test?.evaluated_at ? formatDate(test.evaluated_at) : ''}`
                    : 'Review in progress by HR team'}
                </Text>
              </View>
            </View>

            {/* Step 4 */}
            <View style={[styles.roadmapItem, { borderLeftWidth: 0, paddingBottom: 0 }]}>
              <View style={[
                styles.roadmapNode, 
                isSelected ? styles.roadmapNodeCompleted : styles.roadmapNodePending
              ]}>
                <AppIcon name={isSelected ? "check" : "award"} size={12} color={isSelected ? "#fff" : "#94a3b8"} />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={[styles.roadmapTitle, { color: themeColors.text }]}>
                  4. Final Interview / Offer
                </Text>
                <Text style={styles.roadmapSub}>
                  {isSelected ? 'Selected! HR will contact you shortly.' : 'Awaiting HR evaluation decision'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Detailed Question Review (MCQ) */}
        {test?.test_type === 'mcq' && mcqData.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity 
              style={styles.reviewToggleRow}
              onPress={() => setShowReview(!showReview)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>{mcqData.length}</Text>
                </View>
                <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                  Review Question Answers
                </Text>
              </View>
              <AppIcon name={showReview ? "chevron-up" : "chevron-down"} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {showReview && (
              <View style={styles.reviewList}>
                {mcqData.map((q, idx) => {
                  const isCorrect = q.isCorrect === true;
                  const selectedIdx = q.selectedOption !== undefined ? q.selectedOption : answers[idx];

                  return (
                    <View 
                      key={idx} 
                      style={[
                        styles.reviewCard, 
                        { 
                          backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                          borderColor: isCorrect ? '#10b981' : '#ef4444' 
                        }
                      ]}
                    >
                      <View style={styles.reviewHeader}>
                        <View style={[styles.reviewResultBadge, { backgroundColor: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                          <AppIcon name={isCorrect ? "check" : "x"} size={12} color={isCorrect ? "#10b981" : "#ef4444"} />
                          <Text style={[styles.reviewResultText, { color: isCorrect ? "#10b981" : "#ef4444" }]}>
                            {isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                          </Text>
                        </View>
                        <Text style={styles.reviewCategory}>{q.category || `Question ${idx + 1}`}</Text>
                      </View>

                      <Text style={[styles.reviewQuestionText, { color: themeColors.text }]}>
                        {idx + 1}. {q.question}
                      </Text>

                      <View style={styles.reviewOptionsWrap}>
                        {q.options && q.options.map((opt, optIdx) => {
                          const wasChosen = selectedIdx === optIdx;
                          const isTheCorrectOne = optIdx === q.correctAnswer;

                          let pillBg = isDark ? '#0f172a' : '#ffffff';
                          let pillBorder = isDark ? '#334155' : '#e2e8f0';
                          let pillTextColor = themeColors.textSecondary;

                          if (wasChosen && isCorrect) {
                            pillBg = isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5';
                            pillBorder = '#10b981';
                            pillTextColor = '#059669';
                          } else if (wasChosen && !isCorrect) {
                            pillBg = isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2';
                            pillBorder = '#ef4444';
                            pillTextColor = '#dc2626';
                          } else if (isTheCorrectOne && !isCorrect) {
                            pillBg = isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5';
                            pillBorder = '#10b981';
                            pillTextColor = '#059669';
                          }

                          return (
                            <View 
                              key={optIdx} 
                              style={[styles.reviewOptionPill, { backgroundColor: pillBg, borderColor: pillBorder }]}
                            >
                              <View style={styles.reviewOptionLeft}>
                                <View style={[styles.reviewSmallDot, { backgroundColor: pillBorder }]} />
                                <Text style={[styles.reviewOptionLabel, { color: pillTextColor }]}>
                                  {opt}
                                </Text>
                              </View>
                              {wasChosen && (
                                <Text style={[styles.choiceTag, { color: isCorrect ? '#059669' : '#dc2626' }]}>
                                  Your Choice
                                </Text>
                              )}
                              {!wasChosen && isTheCorrectOne && (
                                <Text style={[styles.choiceTag, { color: '#059669' }]}>
                                  Correct
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* 6. Collapsible Original Instructions */}
        <TouchableOpacity 
          style={[styles.instructionsToggleBtn, { backgroundColor: themeColors.card }]}
          onPress={() => setShowInstructions(!showInstructions)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="file-text" size={16} color={themeColors.textSecondary} />
            <Text style={[styles.instructionsToggleText, { color: themeColors.textSecondary }]}>
              {showInstructions ? 'Hide Test Brief & Instructions' : 'View Original Test Brief & Instructions'}
            </Text>
          </View>
          <AppIcon name={showInstructions ? "chevron-up" : "chevron-down"} size={16} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {showInstructions && (
          <View style={[styles.instructionsCard, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.instructionsBody, { color: themeColors.text }]}>
              {test.test_instructions || 'No specific instructions provided.'}
            </Text>
            {test.file_url && (
              <TouchableOpacity style={styles.downloadPill} onPress={handleDownload}>
                <AppIcon name="download" size={16} color="#0284c7" />
                <Text style={styles.downloadPillText}>Download Attached Resource File</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 7. Action Button: Live Status Check */}
        <TouchableOpacity 
          style={styles.liveRefreshBtn} 
          onPress={() => loadTest(true)}
          disabled={refreshing}
          activeOpacity={0.8}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <AppIcon name="refresh" size={18} color="#fff" />
              <Text style={styles.liveRefreshBtnText}>Check Live HR Confirmation</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // =========================================================================
  // ACTIVE TEST TAKING VIEW (MCQ)
  // =========================================================================
  const renderTestTakingView = () => {
    if (mcqData.length === 0) return null;
    const q = mcqData[currentPage];
    const progressPercent = ((currentPage + 1) / mcqData.length) * 100;

    return (
      <View style={styles.testTakingWrap}>
        {/* Progress Tracker Card */}
        <View style={[styles.card, { backgroundColor: themeColors.card, marginBottom: 16 }]}>
          <View style={styles.testProgressHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{q.category || 'Assessment'}</Text>
            </View>
            <Text style={[styles.questionCountText, { color: themeColors.textSecondary }]}>
              Question <Text style={{ color: themeColors.text, fontWeight: '800' }}>{currentPage + 1}</Text> of {mcqData.length}
            </Text>
          </View>

          {/* Smooth Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Active Question Card */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.questionTitle, { color: themeColors.text }]}>
            {q.question}
          </Text>

          {/* Options */}
          <View style={styles.optionsWrap}>
            {q.options && q.options.map((opt, optIdx) => {
              const isSelected = answers[currentPage] === optIdx;

              return (
                <TouchableOpacity 
                  key={optIdx} 
                  style={[
                    styles.optionTouchable, 
                    { 
                      backgroundColor: isSelected 
                        ? (isDark ? 'rgba(2,132,199,0.18)' : '#f0f9ff') 
                        : (isDark ? '#1e293b' : '#f8fafc'),
                      borderColor: isSelected ? '#0284c7' : (isDark ? '#334155' : '#e2e8f0'),
                      borderWidth: isSelected ? 2 : 1
                    }
                  ]}
                  onPress={() => setAnswers({ ...answers, [currentPage]: optIdx })}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.radioCircle, 
                    isSelected && { borderColor: '#0284c7', backgroundColor: '#0284c7' }
                  ]}>
                    {isSelected ? (
                      <View style={styles.radioWhiteCenter} />
                    ) : (
                      <Text style={[styles.optionLetter, { color: themeColors.textSecondary }]}>
                        {String.fromCharCode(65 + optIdx)}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.optionLabelText, 
                    { color: isSelected ? (isDark ? '#38bdf8' : '#0369a1') : themeColors.text },
                    isSelected && { fontWeight: '700' }
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Navigation Controls */}
          <View style={styles.navControlsRow}>
            <TouchableOpacity 
              style={[
                styles.navBtn, 
                styles.navBtnOutline, 
                { borderColor: themeColors.border, opacity: currentPage === 0 ? 0.35 : 1 }
              ]} 
              onPress={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              <AppIcon name="chevron-left" size={18} color={themeColors.text} />
              <Text style={[styles.navBtnText, { color: themeColors.text }]}>Previous</Text>
            </TouchableOpacity>

            {currentPage < mcqData.length - 1 ? (
              <TouchableOpacity 
                style={[styles.navBtn, styles.navBtnPrimary]} 
                onPress={() => setCurrentPage(prev => Math.min(mcqData.length - 1, prev + 1))}
              >
                <Text style={styles.navBtnPrimaryText}>Next Question</Text>
                <AppIcon name="chevron-right" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.navBtn, styles.navBtnSubmit, submitting && { opacity: 0.7 }]} 
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <AppIcon name="check-circle" size={18} color="#fff" />
                    <Text style={styles.navBtnSubmitText}>Submit Test</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0f172a' }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Sleek Top Navigation Bar */}
      <View style={styles.topNavbar}>
        <View style={styles.navbarProfile}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{user?.name?.charAt(0) || 'C'}</Text>
          </View>
          <View>
            <Text style={styles.candidateName} numberOfLines={1}>{user?.name || 'Candidate'}</Text>
            <View style={styles.portalPill}>
              <Text style={styles.portalPillText}>CANDIDATE ID: #{user?.id}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.navbarActions}>
          <TouchableOpacity 
            style={styles.navIconBtn} 
            onPress={() => loadTest(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#38bdf8" />
            ) : (
              <AppIcon name="refresh" size={18} color="#38bdf8" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <AppIcon name="log-out" size={18} color="#fca5a5" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={[styles.scrollWrap, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadTest(true)} 
            colors={['#0284c7']} 
          />
        }
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={[styles.loadingTitle, { color: themeColors.text }]}>Connecting to Candidate Portal</Text>
            <Text style={styles.loadingSub}>Retrieving test assignments and live evaluation status...</Text>
          </View>
        ) : test ? (
          <>
            {/* If NOT submitted yet, show Test Overview banner on top */}
            {!isSubmitted && (
              <View style={[styles.card, { backgroundColor: themeColors.card, marginBottom: 16 }]}>
                <View style={styles.testMetaHeader}>
                  <View style={styles.testTitleLeft}>
                    <AppIcon name="file-text" size={22} color="#0284c7" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.testHeroTitle, { color: themeColors.text }]}>{test.test_title}</Text>
                      <Text style={styles.testHeroDate}>Assigned on {formatDate(test.created_at)}</Text>
                    </View>
                  </View>
                </View>

                {test.test_instructions ? (
                  <View style={[styles.instructionsBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <Text style={styles.instructionsHead}>Instructions:</Text>
                    <Text style={[styles.instructionsParagraph, { color: themeColors.text }]}>
                      {test.test_instructions}
                    </Text>
                  </View>
                ) : null}

                {test.test_type !== 'mcq' && test.file_url ? (
                  <TouchableOpacity style={styles.downloadResourceBtn} onPress={handleDownload}>
                    <AppIcon name="download" size={18} color="#0284c7" />
                    <Text style={styles.downloadResourceText}>Download Provided Task Resource</Text>
                  </TouchableOpacity>
                ) : null}

                {test.test_type !== 'mcq' && (
                  <View style={styles.practicalNoteBox}>
                    <AppIcon name="check-circle" size={18} color="#10b981" />
                    <Text style={styles.practicalNoteText}>
                      When you finish this task, submit your deliverables directly to your HR contact.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Render Evaluation View or Test Taking View */}
            {isSubmitted ? (
              renderEvaluationView()
            ) : test.test_type === 'mcq' ? (
              renderTestTakingView()
            ) : null}
          </>
        ) : (
          <View style={[styles.card, styles.emptyStateCard, { backgroundColor: themeColors.card }]}>
            <AppIcon name="award" size={48} color="#94a3b8" />
            <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>No Assessment Assigned</Text>
            <Text style={styles.emptyStateDesc}>
              HR has not yet linked a test to your candidate account. Please contact your hiring coordinator for assistance.
            </Text>
            <TouchableOpacity style={styles.emptyRefreshBtn} onPress={() => loadTest(true)}>
              <Text style={styles.emptyRefreshText}>Refresh Status</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollWrap: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Top Navbar
  topNavbar: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  navbarProfile: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3
  },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
  candidateName: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  portalPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2
  },
  portalPillText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  navbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Base Card
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },

  // Loading & Empty States
  loadingBox: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontSize: 16, fontWeight: '700', marginTop: 16 },
  loadingSub: { fontSize: 12, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  emptyStateCard: { alignItems: 'center', paddingVertical: 45, paddingHorizontal: 25 },
  emptyStateTitle: { fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptyStateDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  emptyRefreshBtn: { marginTop: 20, backgroundColor: '#0284c7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyRefreshText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Hero Status Card
  heroCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusChipText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  refreshCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2
  },
  heroBody: { alignItems: 'center', textAlign: 'center', paddingVertical: 6 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 6, opacity: 0.9 },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1
  },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  metaVal: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Card Headers
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  timeTag: { fontSize: 11, color: '#94a3b8' },

  // Performance Spotlight & Metrics
  ratingPill: { backgroundColor: 'rgba(2, 132, 199, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ratingPillText: { color: '#0284c7', fontSize: 11, fontWeight: '700' },
  accuracySpotlight: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  accuracyCenter: { alignItems: 'center' },
  accuracyNumber: { fontSize: 36, fontWeight: '900', color: '#38bdf8' },
  accuracySub: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginTop: 2 },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricPill: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  metricNum: { fontSize: 20, fontWeight: '900' },
  metricLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginTop: 4 },

  // HR Feedback Box
  feedbackCard: {
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.18)'
  },
  quoteMark: { fontSize: 28, lineHeight: 22, color: '#0284c7', fontWeight: 'bold' },
  feedbackBody: { fontSize: 14, lineHeight: 22, marginTop: -6, fontStyle: 'italic' },
  feedbackSignature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(2, 132, 199, 0.12)'
  },
  feedbackSignee: { fontSize: 11, color: '#10b981', fontWeight: '700' },
  emptyFeedbackWrap: { padding: 22, borderRadius: 14, alignItems: 'center', textAlign: 'center', gap: 6 },
  emptyFeedbackTitle: { fontSize: 14, fontWeight: '700' },
  emptyFeedbackText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

  // Roadmap Pipeline
  roadmapWrap: { paddingLeft: 8 },
  roadmapItem: {
    flexDirection: 'row',
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
    paddingLeft: 18,
    paddingBottom: 22,
    position: 'relative'
  },
  roadmapNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    position: 'absolute',
    left: -12,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  roadmapNodeCompleted: { backgroundColor: '#10b981' },
  roadmapNodeActive: { backgroundColor: '#f59e0b' },
  roadmapNodePending: { backgroundColor: '#e2e8f0' },
  roadmapContent: { flex: 1 },
  roadmapTitle: { fontSize: 13, fontWeight: '800' },
  roadmapSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  // Review Accordion
  reviewToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  reviewBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  reviewList: { marginTop: 14, gap: 12 },
  reviewCard: { padding: 14, borderRadius: 12, borderWidth: 1.5 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewResultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reviewResultText: { fontSize: 11, fontWeight: '800' },
  reviewCategory: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  reviewQuestionText: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginBottom: 8 },
  reviewOptionsWrap: { gap: 6 },
  reviewOptionPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1
  },
  reviewOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  reviewSmallDot: { width: 6, height: 6, borderRadius: 3 },
  reviewOptionLabel: { fontSize: 12, fontWeight: '500', flex: 1 },
  choiceTag: { fontSize: 10, fontWeight: '800' },

  // Collapsible Instructions
  instructionsToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12
  },
  instructionsToggleText: { fontSize: 13, fontWeight: '600' },
  instructionsCard: { padding: 16, borderRadius: 14, marginBottom: 14 },
  instructionsBody: { fontSize: 13, lineHeight: 20 },
  downloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start'
  },
  downloadPillText: { color: '#0284c7', fontSize: 12, fontWeight: '700' },

  // Live Refresh Action Button
  liveRefreshBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  liveRefreshBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Test Taking Mode Elements
  testProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { backgroundColor: 'rgba(2, 132, 199, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  categoryBadgeText: { color: '#0284c7', fontSize: 11, fontWeight: '800' },
  questionCountText: { fontSize: 12 },
  progressBarTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#0284c7', borderRadius: 3 },
  questionTitle: { fontSize: 16, fontWeight: '800', lineHeight: 24, marginBottom: 18 },
  optionsWrap: { gap: 10 },
  optionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12
  },
  radioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioWhiteCenter: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  optionLetter: { fontSize: 12, fontWeight: '700' },
  optionLabelText: { fontSize: 14, flex: 1, lineHeight: 20 },
  navControlsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 },
  navBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  navBtnOutline: { borderWidth: 1 },
  navBtnText: { fontSize: 14, fontWeight: '700' },
  navBtnPrimary: { backgroundColor: '#0f172a' },
  navBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  navBtnSubmit: { backgroundColor: '#0284c7' },
  navBtnSubmitText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Non-submitted Test Overview Header
  testMetaHeader: { marginBottom: 14 },
  testTitleLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  testHeroTitle: { fontSize: 17, fontWeight: '800' },
  testHeroDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  instructionsBox: { padding: 14, borderRadius: 12, marginTop: 8 },
  instructionsHead: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 4 },
  instructionsParagraph: { fontSize: 13, lineHeight: 20 },
  downloadResourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    alignSelf: 'flex-start'
  },
  downloadResourceText: { color: '#0284c7', fontSize: 13, fontWeight: '700' },
  practicalNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginTop: 14
  },
  practicalNoteText: { color: '#065f46', fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 }
});
