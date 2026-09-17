import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { fetchCandidateTest, submitCandidateTest } from '../utils/api';
import AppIcon from '../components/AppIcon';

export default function CandidateDashboardScreen({ user, onLogout }) {
  const { themeColors } = useTheme();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mcqData, setMcqData] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const loadTest = async () => {
    try {
      const data = await fetchCandidateTest(user.id);
      if (data.success && data.test) {
        setTest(data.test);
        if (data.test.test_type === 'mcq') {
          try {
            setMcqData(typeof data.test.test_data === 'string' ? JSON.parse(data.test.test_data) : data.test.test_data || []);
          } catch (e) {
            console.error('Failed to parse MCQ data');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load candidate test', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTest();
  }, [user.id]);

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
      'Are you sure you want to submit your test? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, submit it!', 
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await submitCandidateTest(test.id, user.id, answers);
              if (res.success) {
                Alert.alert('Success!', 'Test submitted successfully!', [
                  { text: 'OK', onPress: () => loadTest() }
                ]);
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

  const renderCompleted = () => {
    const correctCount = mcqData.filter(q => q.isCorrect === true).length;
    const wrongCount = mcqData.filter(q => q.isCorrect === false).length;

    return (
      <View style={[styles.card, { backgroundColor: themeColors.card, alignItems: 'center' }]}>
        <View style={styles.completedHeader}>
          <AppIcon name="check-circle" size={48} color="#10b981" />
          <Text style={[styles.title, { marginTop: 15, color: themeColors.text }]}>Assessment Completed</Text>
          <Text style={[styles.subtitle, { color: '#10b981', textAlign: 'center', marginVertical: 10 }]}>
            You have successfully completed this test. Here is your preliminary score:
          </Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, { borderColor: '#10b981' }]}>
            <Text style={[styles.scoreNumber, { color: '#10b981' }]}>{correctCount}</Text>
            <Text style={styles.scoreLabel}>CORRECT</Text>
          </View>
          <View style={[styles.scoreBox, { borderColor: '#ef4444' }]}>
            <Text style={[styles.scoreNumber, { color: '#ef4444' }]}>{wrongCount}</Text>
            <Text style={styles.scoreLabel}>WRONG</Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: themeColors.textSecondary, textAlign: 'center', marginTop: 15 }]}>
          HR will review your full results shortly.
        </Text>
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
          {q.options.map((opt, optIdx) => {
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
            )
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.title, { color: themeColors.text }]}>Welcome to your Assessment</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Please review the instructions below carefully. This environment is monitored. Good luck!
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Loading your test module...</Text>
          </View>
        ) : test ? (
          <>
            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={styles.testHeader}>
                <View style={styles.testTitleRow}>
                  <AppIcon name="file-text" size={24} color="#06b6d4" />
                  <Text style={[styles.testTitle, { color: themeColors.text }]}>{test.test_title}</Text>
                </View>
                <Text style={styles.testDate}>
                  Assigned on {new Date(test.created_at).toLocaleDateString()}
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

              {test.test_type !== 'mcq' && (
                <View style={styles.successNote}>
                  <AppIcon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.successNoteText}>
                    When you are finished, please submit your work directly to the HR contact as instructed.
                  </Text>
                </View>
              )}
            </View>

            {test.test_type === 'mcq' && (
              <View style={{ marginTop: 10 }}>
                {test.status === 'Completed' ? renderCompleted() : renderMcqTest()}
              </View>
            )}
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
  scrollContent: { padding: 20 },
  card: { padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  testHeader: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 15, marginBottom: 15 },
  testTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  testTitle: { fontSize: 18, fontWeight: 'bold' },
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
  
  // Completed Styles
  completedHeader: { alignItems: 'center', marginBottom: 20 },
  scoreRow: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginVertical: 10 },
  scoreBox: { backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, borderWidth: 1, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  scoreNumber: { fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  scoreLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b' }
});
