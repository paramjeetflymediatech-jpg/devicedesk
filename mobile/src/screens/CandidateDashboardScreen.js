import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { fetchCandidateTest } from '../utils/api';
import AppIcon from '../components/AppIcon';

export default function CandidateDashboardScreen({ user, onLogout }) {
  const { themeColors } = useTheme();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTest() {
      try {
        const data = await fetchCandidateTest(user.id);
        if (data.success && data.test) {
          setTest(data.test);
        }
      } catch (err) {
        console.warn('Failed to load candidate test', err);
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [user.id]);

  const handleDownload = () => {
    if (test?.file_url) {
      Linking.openURL(test.file_url).catch(err => console.error("Couldn't load page", err));
    }
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

            {test.file_url ? (
              <View style={{ marginTop: 20 }}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Resources</Text>
                <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                  <AppIcon name="download" size={18} color="#06b6d4" />
                  <Text style={styles.downloadButtonText}>Download Provided Resource</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.successNote}>
              <AppIcon name="check-circle" size={20} color="#10b981" />
              <Text style={styles.successNoteText}>
                When you are finished, please submit your work directly to the HR contact as instructed.
              </Text>
            </View>
          </View>
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
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerRole: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  testHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15,
    marginBottom: 15,
  },
  testTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  testDate: {
    fontSize: 12,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  instructionsBox: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  downloadButtonText: {
    color: '#06b6d4',
    fontWeight: '600',
    fontSize: 14,
  },
  successNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginTop: 25,
  },
  successNoteText: {
    color: '#10b981',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  }
});
