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
  RefreshControl 
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { fetchCandidateTest, submitCandidateTest } from '../utils/api';
import AppIcon from '../components/AppIcon';

export default function CandidateDashboardScreen({ user, onLogout }) {
  const { themeColors } = useTheme();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mcqData, setMcqData] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showReview, setShowReview] = useState(false);

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
      Alert.alert('Incomplete Test', 'Please answer all questions before submitting.');
      return;
    }

    Alert.alert(
      'Submit Assessment?',
      'Are you sure you want to submit your test? This action will calculate your score and submit it for HR evaluation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Submit Test', 
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await submitCandidateTest(test.id, user.id, answers);
              if (res.success) {
                Alert.alert(
                  'Submitted Successfully! 🎉', 
                  'Your assessment has been submitted to HR for evaluation.',
                  [{ text: 'View Evaluation', onPress: () => loadTest() }]
                );
                loadTest();
              } else {
                Alert.alert('Error', res.error || 'Failed to submit test');
              }
            } catch (err) {
              Alert.alert('Error', 'Network error during submission.');
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
        title: 'HR Evaluation Confirmed: Selected 🎉',
        desc: 'Congratulations! The HR recruitment team has reviewed your performance and confirmed your selection for the next stage.',
        bg: '#ecfdf5',
        border: '#10b981',
        text: '#065f46',
        badgeBg: '#10b981',
        iconName: 'award',
        ratingLabel: '🏆 Outstanding (Top Candidate)'
      };
    }
    if (s === 'under review') {
      return {
        badge: 'HR REVIEW IN PROGRESS',
        title: 'Assessment Under HR Evaluation ⏳',
        desc: 'The HR team is currently reviewing your assessment results and candidate profile. Updates will appear here shortly.',
        bg: '#eff6ff',
        border: '#3b82f6',
        text: '#1e40af',
        badgeBg: '#3b82f6',
        iconName: 'clock',
        ratingLabel: '⏳ In Evaluation'
      };
    }
    if (s === 'rejected') {
      return {
        badge: 'EVALUATION FINALIZED',
        title: 'HR Status: Application Concluded',
        desc: 'Thank you for your effort in completing this assessment. While this position was not matched, your profile remains in our talent pool.',
        bg: '#fef2f2',
        border: '#ef4444',
        text: '#991b1b',
        badgeBg: '#ef4444',
        iconName: 'alert',
        ratingLabel: 'Evaluated'
      };
    }
    if (s === 'evaluated') {
      return {
        badge: 'EVALUATED BY HR',
        title: 'HR Evaluation Completed 📋',
        desc: 'The HR team has completed evaluating your submission. Check the official feedback remarks below for detailed notes.',
        bg: '#eef2ff',
        border: '#6366f1',
        text: '#3730a3',
        badgeBg: '#6366f1',
        iconName: 'check-circle',
        ratingLabel: accuracy >= 70 ? '🌟 Good Performance' : 'Evaluated'
      };
    }
    // Submitted / Completed / Default
    return {
      badge: 'AWAITING HR CONFIRMATION',
      title: 'Submitted - Pending HR Confirmation 🕒',
      desc: 'Your assessment was submitted successfully. The HR team has received your score and will confirm your evaluation status shortly.',
      bg: '#fffbeb',
      border: '#f59e0b',
      text: '#92400e',
      badgeBg: '#f59e0b',
      iconName: 'check-circle',
      ratingLabel: accuracy >= 85 ? '🏆 Outstanding (85%+)' : accuracy >= 70 ? '🌟 Good (70-84%)' : accuracy >= 50 ? '👍 Satisfactory' : '⚠️ Needs Improvement'
    };
  };

  const statusConfig = getStatusConfig();
  const isHrEvaluated = !!(test?.feedback || (test?.status && test.status !== 'Completed' && test.status !== 'Pending'));
  const isSelected = test?.status === 'Selected' || test?.status === 'Passed';

  const renderCompleted = () => {
    return (
      <View style={{ gap: 16 }}>
        {/* Top Evaluation Status Card */}
        <View style={[styles.card, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1.5 }]}>
          <View style={styles.evalTopRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.badgeBg }]}>
              <Text style={styles.statusBadgeText}>{statusConfig.badge}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.refreshIconBtn, { backgroundColor: '#fff' }]} 
              onPress={() => loadTest(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={statusConfig.badgeBg} />
              ) : (
                <AppIcon name="refresh" size={16} color={statusConfig.badgeBg} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.evalHeaderContent}>
            <AppIcon name={statusConfig.iconName} size={36} color={statusConfig.badgeBg} />
            <Text style={[styles.evalTitle, { color: statusConfig.text }]}>{statusConfig.title}</Text>
            <Text style={[styles.evalDesc, { color: statusConfig.text }]}>{statusConfig.desc}</Text>
          </View>
        </View>

        {/* HR Evaluation Feedback Box */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="file-text" size={20} color="#06b6d4" />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Official HR Feedback</Text>
            </View>
            {test?.evaluated_at && (
              <Text style={styles.metaSubtext}>Reviewed {formatDate(test.evaluated_at)}</Text>
            )}
          </View>

          {test?.feedback ? (
            <View style={styles.hrFeedbackBox}>
              <Text style={styles.hrFeedbackQuote}>“</Text>
              <Text style={[styles.hrFeedbackText, { color: themeColors.text }]}>
                {test.feedback}
              </Text>
              <View style={styles.hrSignatureRow}>
                <AppIcon name="check-circle" size={14} color="#10b981" />
                <Text style={styles.hrSignatureText}>Verified by HR Recruitment Team</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyFeedbackBox, { backgroundColor: themeColors.background }]}>
              <AppIcon name="clock" size={24} color="#94a3b8" />
              <Text style={[styles.emptyFeedbackTitle, { color: themeColors.text }]}>HR Review Pending</Text>
              <Text style={[styles.emptyFeedbackDesc, { color: themeColors.textSecondary }]}>
                The recruitment team has your test submission on file. Detailed remarks and next-round directions will appear here once evaluation is complete.
              </Text>
            </View>
          )}
        </View>

        {/* Performance Scorecard */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text, marginBottom: 12 }]}>Performance Breakdown</Text>
          
          {/* Main Accuracy Indicator */}
          <View style={styles.accuracyBanner}>
            <View>
              <Text style={styles.accuracyLabel}>OVERALL ACCURACY</Text>
              <Text style={styles.accuracyValue}>{accuracy}%</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>{statusConfig.ratingLabel}</Text>
            </View>
          </View>

          {/* 4 Stat Grid */}
          <View style={styles.statGrid}>
            <View style={[styles.statBox, { backgroundColor: themeColors.background }]}>
              <Text style={[styles.statVal, { color: themeColors.text }]}>{totalCount}</Text>
              <Text style={styles.statLbl}>QUESTIONS</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#ecfdf5', borderColor: '#10b981', borderWidth: 1 }]}>
              <Text style={[styles.statVal, { color: '#10b981' }]}>{correctCount}</Text>
              <Text style={[styles.statLbl, { color: '#065f46' }]}>CORRECT</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#fef2f2', borderColor: '#ef4444', borderWidth: 1 }]}>
              <Text style={[styles.statVal, { color: '#ef4444' }]}>{wrongCount}</Text>
              <Text style={[styles.statLbl, { color: '#991b1b' }]}>WRONG / MISSED</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: themeColors.background }]}>
              <Text style={[styles.statValSmall, { color: themeColors.text }]} numberOfLines={1}>
                {test?.submitted_at ? formatDate(test.submitted_at) : 'Completed'}
              </Text>
              <Text style={styles.statLbl}>SUBMITTED</Text>
            </View>
          </View>
        </View>

        {/* Recruitment Pipeline Timeline */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text, marginBottom: 14 }]}>Recruitment Roadmap</Text>
          
          <View style={styles.timelineContainer}>
            {/* Step 1: Assigned */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.timelineNodeDone]}>
                <AppIcon name="check" size={14} color="#fff" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: themeColors.text }]}>1. Test Assigned</Text>
                <Text style={styles.timelineSubtitle}>{formatDate(test?.created_at)}</Text>
              </View>
            </View>

            {/* Step 2: Submitted */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.timelineNodeDone]}>
                <AppIcon name="check" size={14} color="#fff" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: themeColors.text }]}>2. Test Submitted</Text>
                <Text style={styles.timelineSubtitle}>{test?.submitted_at ? formatDate(test.submitted_at) : 'Completed'}</Text>
              </View>
            </View>

            {/* Step 3: HR Evaluation */}
            <View style={styles.timelineItem}>
              <View style={[
                styles.timelineNode, 
                isHrEvaluated ? styles.timelineNodeDone : styles.timelineNodeActive
              ]}>
                <AppIcon name={isHrEvaluated ? "check" : "clock"} size={14} color="#fff" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: themeColors.text }]}>
                  3. HR Evaluation & Confirmation
                </Text>
                <Text style={styles.timelineSubtitle}>
                  {isHrEvaluated ? (test?.evaluated_at ? `Completed on ${formatDate(test.evaluated_at)}` : 'Status updated by HR') : 'In progress by HR team'}
                </Text>
              </View>
            </View>

            {/* Step 4: Final Interview / Selection */}
            <View style={[styles.timelineItem, { borderLeftWidth: 0, paddingBottom: 0 }]}>
              <View style={[
                styles.timelineNode, 
                isSelected ? styles.timelineNodeDone : styles.timelineNodePending
              ]}>
                <AppIcon name={isSelected ? "check" : "award"} size={14} color={isSelected ? "#fff" : "#94a3b8"} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: themeColors.text }]}>
                  4. Final Interview / Onboarding
                </Text>
                <Text style={styles.timelineSubtitle}>
                  {isSelected ? 'Shortlisted & Confirmed! HR will contact you.' : 'Pending HR evaluation decision'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Question-by-Question Review Accordion (for MCQ) */}
        {test?.test_type === 'mcq' && mcqData.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity 
              style={styles.reviewToggleBtn}
              onPress={() => setShowReview(!showReview)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="file-text" size={18} color="#06b6d4" />
                <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                  Review Questions ({mcqData.length})
                </Text>
              </View>
              <AppIcon name={showReview ? "chevron-up" : "chevron-down"} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {showReview && (
              <View style={{ marginTop: 16, gap: 12 }}>
                {mcqData.map((q, idx) => {
                  const isCorrect = q.isCorrect === true;
                  const selectedIdx = q.selectedOption !== undefined ? q.selectedOption : answers[idx];

                  return (
                    <View 
                      key={idx} 
                      style={[
                        styles.reviewQuestionCard, 
                        { 
                          backgroundColor: themeColors.background,
                          borderColor: isCorrect ? '#10b981' : '#ef4444' 
                        }
                      ]}
                    >
                      <View style={styles.reviewHeaderRow}>
                        <Text style={[styles.reviewBadge, { color: isCorrect ? '#10b981' : '#ef4444' }]}>
                          Q{idx + 1} • {isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                        </Text>
                        {q.category && (
                          <Text style={styles.reviewCategoryText}>{q.category}</Text>
                        )}
                      </View>

                      <Text style={[styles.reviewQuestionText, { color: themeColors.text }]}>
                        {q.question}
                      </Text>

                      <View style={{ gap: 6, marginTop: 8 }}>
                        {q.options && q.options.map((opt, optIdx) => {
                          const wasChosen = selectedIdx === optIdx;
                          const isTheCorrectOne = optIdx === q.correctAnswer;

                          let optBg = themeColors.card;
                          let optBorder = '#cbd5e1';
                          let optColor = themeColors.textSecondary;

                          if (wasChosen && isCorrect) {
                            optBg = '#ecfdf5';
                            optBorder = '#10b981';
                            optColor = '#065f46';
                          } else if (wasChosen && !isCorrect) {
                            optBg = '#fef2f2';
                            optBorder = '#ef4444';
                            optColor = '#991b1b';
                          } else if (isTheCorrectOne && !isCorrect) {
                            optBg = '#ecfdf5';
                            optBorder = '#10b981';
                            optColor = '#065f46';
                          }

                          return (
                            <View 
                              key={optIdx} 
                              style={[
                                styles.reviewOptionRow, 
                                { backgroundColor: optBg, borderColor: optBorder }
                              ]}
                            >
                              <View style={styles.reviewOptionIconWrap}>
                                {wasChosen && isCorrect && <AppIcon name="check" size={14} color="#10b981" />}
                                {wasChosen && !isCorrect && <AppIcon name="x" size={14} color="#ef4444" />}
                                {!wasChosen && isTheCorrectOne && <AppIcon name="check" size={14} color="#10b981" />}
                              </View>
                              <Text style={[styles.reviewOptionText, { color: optColor }]}>
                                {opt}
                                {wasChosen && ' (Your Answer)'}
                                {!wasChosen && isTheCorrectOne && ' (Correct Answer)'}
                              </Text>
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

        {/* Live Refresh Status Action Button */}
        <TouchableOpacity 
          style={[styles.refreshStatusBtn, refreshing && { opacity: 0.7 }]}
          onPress={() => loadTest(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <AppIcon name="refresh" size={18} color="#fff" />
              <Text style={styles.refreshStatusBtnText}>Check Live HR Status</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderMcqTest = () => {
    if (mcqData.length === 0) return null;
    const q = mcqData[currentPage];

    return (
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <View style={styles.mcqHeaderRow}>
          <View style={styles.partBadge}>
            <Text style={styles.partBadgeText}>Part: {q.category || 'General'}</Text>
          </View>
          <Text style={styles.questionCounter}>
            Question {currentPage + 1} of {mcqData.length}
          </Text>
        </View>
        
        <Text style={[styles.questionText, { color: themeColors.text }]}>{q.question}</Text>
        
        <View style={styles.optionsContainer}>
          {q.options && q.options.map((opt, optIdx) => {
            const isSelected = answers[currentPage] === optIdx;
            return (
              <TouchableOpacity 
                key={optIdx} 
                style={[
                  styles.optionRow, 
                  { backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.05)' : themeColors.background },
                  isSelected && { borderColor: '#06b6d4', borderWidth: 2 }
                ]}
                onPress={() => setAnswers({ ...answers, [currentPage]: optIdx })}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInnerCircle} />}
                </View>
                <Text style={[styles.optionText, { color: isSelected ? themeColors.text : themeColors.textSecondary }, isSelected && { fontWeight: 'bold' }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonOutline, currentPage === 0 && { opacity: 0.5 }]} 
            onPress={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            <Text style={[styles.navButtonOutlineText, { color: themeColors.textSecondary }]}>Previous</Text>
          </TouchableOpacity>

          {currentPage < mcqData.length - 1 ? (
            <TouchableOpacity 
              style={[styles.navButton, styles.navButtonSolid, { backgroundColor: themeColors.text }]} 
              onPress={() => setCurrentPage(prev => Math.min(mcqData.length - 1, prev + 1))}
            >
              <Text style={[styles.navButtonSolidText, { color: themeColors.background }]}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.navButton, styles.submitButton, submitting && { opacity: 0.7 }]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Assessment'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.headerBg }]}>
        <View style={styles.headerProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'C'}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{user?.name}</Text>
            <Text style={styles.headerRole}>Candidate Assessment Portal</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <AppIcon name="log-out" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadTest(true)} 
            colors={['#06b6d4']} 
          />
        }
      >
        
        {/* Welcome / Header Banner */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.title, { color: themeColors.text }]}>Welcome to your Assessment Portal</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            {isSubmitted 
              ? 'Your assessment has been recorded. Review your performance breakdown and live HR evaluation status below.'
              : 'Please review the test instructions carefully. Once submitted, your score and answers will be reviewed by HR.'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Loading your test module...</Text>
          </View>
        ) : test ? (
          <>
            {/* Test Details Card */}
            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={styles.testHeader}>
                <View style={styles.testTitleRow}>
                  <AppIcon name="file-text" size={24} color="#06b6d4" />
                  <Text style={[styles.testTitle, { color: themeColors.text }]}>{test.test_title}</Text>
                </View>
                <Text style={styles.testDate}>
                  Assigned on {formatDate(test.created_at)}
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Instructions / Task Details</Text>
              <View style={[styles.instructionsBox, { backgroundColor: themeColors.background }]}>
                <Text style={[styles.instructionsText, { color: themeColors.text }]}>
                  {test.test_instructions}
                </Text>
              </View>

              {test.test_type !== 'mcq' && test.file_url ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Resources</Text>
                  <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                    <AppIcon name="download" size={18} color="#06b6d4" />
                    <Text style={styles.downloadButtonText}>Download Provided Resource</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {test.test_type !== 'mcq' && !isSubmitted && (
                <View style={styles.successNote}>
                  <AppIcon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.successNoteText}>
                    When you are finished, submit your work directly to your HR contact as instructed.
                  </Text>
                </View>
              )}
            </View>

            {/* Assessment Section / Evaluation Screen */}
            <View style={{ marginTop: 10 }}>
              {isSubmitted ? (
                renderCompleted()
              ) : test.test_type === 'mcq' ? (
                renderMcqTest()
              ) : null}
            </View>
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: themeColors.card, alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={[styles.title, { color: themeColors.text }]}>No active tests assigned</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary, textAlign: 'center' }]}>
              HR has not yet assigned a specific test to your profile. Please contact them if you believe this is an error.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 15, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerRole: { color: '#cbd5e1', fontSize: 12 },
  logoutButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: { padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  testHeader: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 15, marginBottom: 15 },
  testTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  testTitle: { fontSize: 17, fontWeight: 'bold' },
  testDate: { fontSize: 12, color: '#64748b' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 5 },
  instructionsBox: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  instructionsText: { fontSize: 14, lineHeight: 22 },
  downloadButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: 12, borderRadius: 8, alignSelf: 'flex-start' },
  downloadButtonText: { color: '#06b6d4', fontWeight: '600', fontSize: 14 },
  successNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 15, borderRadius: 12, marginTop: 25 },
  successNoteText: { color: '#10b981', flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  
  // MCQ Specific Styles
  mcqHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  partBadge: { backgroundColor: 'rgba(6, 182, 212, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  partBadgeText: { color: '#06b6d4', fontWeight: 'bold', fontSize: 12 },
  questionCounter: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  questionText: { fontSize: 16, lineHeight: 24, marginBottom: 25, fontWeight: '600' },
  optionsContainer: { gap: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  radioCircle: { height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  radioCircleSelected: { borderColor: '#06b6d4' },
  radioInnerCircle: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#06b6d4' },
  optionText: { fontSize: 15, flex: 1 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 15 },
  navButton: { paddingVertical: 14, paddingHorizontal: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1 },
  navButtonOutline: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  navButtonOutlineText: { fontWeight: 'bold', fontSize: 15 },
  navButtonSolid: { backgroundColor: '#0f172a' },
  navButtonSolidText: { fontWeight: 'bold', fontSize: 15 },
  submitButton: { backgroundColor: '#06b6d4' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  
  // Evaluation Banner
  evalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  refreshIconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  evalHeaderContent: { alignItems: 'center', textAlign: 'center', paddingVertical: 8 },
  evalTitle: { fontSize: 17, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  evalDesc: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6, opacity: 0.9 },

  // HR Feedback Card
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  metaSubtext: { fontSize: 11, color: '#94a3b8' },
  hrFeedbackBox: { backgroundColor: 'rgba(6, 182, 212, 0.05)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.2)' },
  hrFeedbackQuote: { fontSize: 24, lineHeight: 20, color: '#06b6d4', fontWeight: 'bold' },
  hrFeedbackText: { fontSize: 14, lineHeight: 22, marginTop: -4, fontStyle: 'italic' },
  hrSignatureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(6, 182, 212, 0.15)' },
  hrSignatureText: { fontSize: 11, color: '#10b981', fontWeight: '700' },
  emptyFeedbackBox: { padding: 20, borderRadius: 12, alignItems: 'center', textAlign: 'center', gap: 6 },
  emptyFeedbackTitle: { fontSize: 14, fontWeight: '700' },
  emptyFeedbackDesc: { fontSize: 12, lineHeight: 18, textAlign: 'center' },

  // Performance Scorecard
  accuracyBanner: { backgroundColor: '#0f172a', borderRadius: 14, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  accuracyLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  accuracyValue: { color: '#38bdf8', fontSize: 32, fontWeight: '900', marginTop: 2 },
  ratingBadge: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  ratingBadgeText: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: '45%', padding: 14, borderRadius: 12, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800' },
  statValSmall: { fontSize: 13, fontWeight: '700' },
  statLbl: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 4, letterSpacing: 0.5 },

  // Timeline
  timelineContainer: { paddingLeft: 6 },
  timelineItem: { flexDirection: 'row', borderLeftWidth: 2, borderLeftColor: '#e2e8f0', paddingLeft: 16, paddingBottom: 22, position: 'relative' },
  timelineNode: { width: 22, height: 22, borderRadius: 11, position: 'absolute', left: -12, top: 0, alignItems: 'center', justifyContent: 'center' },
  timelineNodeDone: { backgroundColor: '#10b981' },
  timelineNodeActive: { backgroundColor: '#3b82f6' },
  timelineNodePending: { backgroundColor: '#e2e8f0' },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '700' },
  timelineSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  // Review Accordion
  reviewToggleBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewQuestionCard: { padding: 14, borderRadius: 12, borderWidth: 1.5, marginTop: 6 },
  reviewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewBadge: { fontSize: 12, fontWeight: '800' },
  reviewCategoryText: { fontSize: 11, color: '#64748b' },
  reviewQuestionText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  reviewOptionRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1 },
  reviewOptionIconWrap: { width: 20, alignItems: 'center', marginRight: 6 },
  reviewOptionText: { fontSize: 12, flex: 1, fontWeight: '500' },

  // Bottom Status Refresh Button
  refreshStatusBtn: { backgroundColor: '#0284c7', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, elevation: 2 },
  refreshStatusBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});
