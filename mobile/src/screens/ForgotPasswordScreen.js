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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findEmployeeByEmail, sendMockEmail, resetPasswordByEmail } from '../store/store';

export default function ForgotPasswordScreen({ onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // email, reset
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestLink = () => {
    setErrorMsg('');
    setSuccessMsg('');

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const isDefaultAdmin = targetEmail.toLowerCase() === 'admin@devicedesk.com' || targetEmail.toLowerCase() === 'admin';
    const cleanEmail = isDefaultAdmin ? 'admin@devicedesk.com' : targetEmail;
    
    const emp = findEmployeeByEmail(cleanEmail);

    if (emp || isDefaultAdmin) {
      // Send mock email
      const resetLink = `http://localhost:3000/reset-password?email=${encodeURIComponent(cleanEmail)}`;
      sendMockEmail(
        cleanEmail,
        'Reset your DeviceDesk Password',
        `Hello,\n\nYou requested a password reset for your DeviceDesk account.\n\nPlease click the link below to set a new password:\n\n${resetLink}\n\nBest Regards,\nIT Support Team`
      );

      setSuccessMsg('A password reset link has been mock-sent to your email. You can also set a new password directly below:');
      setStep('reset');
      setEmail(cleanEmail); // Set to resolved email
    } else {
      setErrorMsg('No account found with this email address.');
    }
  };

  const handleResetPassword = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!password.trim()) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const res = resetPasswordByEmail(email, password);

    if (res.success) {
      setSuccessMsg('Password updated successfully! Redirecting you back to login...');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onNavigateToLogin();
      }, 2500);
    } else {
      setErrorMsg(res.message || 'Failed to update password.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Header & Brand Logo */}
          <View style={styles.headerContainer}>
            <View style={styles.logoGradient}>
              <Text style={styles.logoText}>DD</Text>
            </View>
            <Text style={styles.title}>
              {step === 'email' ? 'Forgot Password' : 'Set New Password'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email' 
                ? 'Enter your registered email to receive a password reset link'
                : 'Enter your new credentials below'}
            </Text>
          </View>

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

            {step === 'email' ? (
              /* Step 1: Request Reset */
              <View>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. sarabjot@devicedesk.com"
                  placeholderTextColor="#8b949e"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleRequestLink}>
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Step 2: Set New Password */
              <View>
                <Text style={styles.label}>Account Email</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={email}
                  editable={false}
                />

                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#8b949e"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#8b949e"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleResetPassword}>
                  <Text style={styles.primaryButtonText}>Update Password</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.backButton} onPress={onNavigateToLogin}>
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
    backgroundColor: '#0d1117',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00f0ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8b949e',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f0f6fc',
    marginBottom: 20,
  },
  disabledInput: {
    opacity: 0.6,
    color: '#8b949e',
  },
  primaryButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1f6feb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#30363d',
  },
  backButtonText: {
    color: '#8b949e',
    fontSize: 14,
    fontWeight: '600',
  },
  errorAlert: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorAlertText: {
    color: '#f85149',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  successAlert: {
    backgroundColor: 'rgba(57, 219, 109, 0.1)',
    borderWidth: 1,
    borderColor: '#39db6d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  successAlertText: {
    color: '#39db6d',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
