import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestForgotPasswordLink } from '../utils/api';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen({ onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestLink = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestForgotPasswordLink(targetEmail);
      setSuccessMsg(res.message || 'A password reset link has been sent to your email. Please check your inbox and open the link on your web browser to set a new password.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header & Logo Image */}
          <View style={styles.headerContainer}>
            <Image
              source={require('../assets/flymedia-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            {/* <View style={styles.subTagPill}>
              <Text style={styles.subTagPillText}>🔑 PASSWORD RECOVERY</Text>
            </View> */}

            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered email address below. We will send a single-use password reset link to your email.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {errorMsg ? (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successAlert}>
                <Text style={styles.successAlertText}>✓ {successMsg}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Registered Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Please enter your email address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton]} 
              onPress={handleRequestLink}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={onNavigateToLogin} activeOpacity={0.8}>
              <Text style={styles.backButtonText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 25,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 230,
    height: 75,
    marginBottom: 12,
    alignSelf: 'center',
  },
  subTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  subTagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14.5,
    color: '#0f172a',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  backButtonText: {
    color: '#0f172a',
    fontSize: 13.5,
    fontWeight: '700',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorAlertText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  successAlertText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
