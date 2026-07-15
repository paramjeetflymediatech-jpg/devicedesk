import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { resetPassword } from '../store/store';

export default function ForgotPasswordScreen({ onNavigateToLogin }) {
  const [role, setRole] = useState('employee'); // employee, admin
  const [name, setName] = useState('');
  const [verifyField, setVerifyField] = useState(''); // department for employee, adminAccessKey for admin
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleReset = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !verifyField.trim() || !newPassword.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    const res = resetPassword(role, name.trim(), verifyField.trim(), newPassword.trim());

    if (res.success) {
      setSuccessMsg(res.message);
      setName('');
      setVerifyField('');
      setNewPassword('');
    } else {
      setErrorMsg(res.message || 'Verification failed.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Account Credentials Recovery</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Details</Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

            {/* Role selector */}
            <Text style={styles.label}>I am an:</Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, role === 'employee' && styles.tabActive]}
                onPress={() => {
                  setRole('employee');
                  setVerifyField('');
                  setErrorMsg('');
                }}
              >
                <Text style={[styles.tabText, role === 'employee' && styles.tabTextActive]}>
                  Employee
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, role === 'admin' && styles.tabActive]}
                onPress={() => {
                  setRole('admin');
                  setVerifyField('');
                  setErrorMsg('');
                }}
              >
                <Text style={[styles.tabText, role === 'admin' && styles.tabTextActive]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Username / Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tanmay or Sarabjot"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            {role === 'admin' ? (
              <>
                <Text style={styles.label}>Admin Access Key</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter admin access verification key"
                  placeholderTextColor="#888"
                  secureTextEntry
                  value={verifyField}
                  onChangeText={setVerifyField}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Department Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Operations or IT Support"
                  placeholderTextColor="#888"
                  value={verifyField}
                  onChangeText={setVerifyField}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#888"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset Password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={onNavigateToLogin}>
              <Text style={styles.backBtnText}>← Back to Sign In</Text>
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
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  subtitle: {
    fontSize: 14,
    color: '#8b949e',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 3,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#1f6feb',
  },
  tabText: {
    fontSize: 14,
    color: '#8b949e',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#f0f6fc',
    marginBottom: 15,
  },
  resetButton: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 20,
  },
  backBtnText: {
    color: '#8b949e',
    fontSize: 14,
  },
  errorText: {
    color: '#f85149',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    color: '#3fb950',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
});
