import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getApiUrl, setApiUrl, initApiUrl, syncWithServer } from '../utils/api';
import { findEmployeeByCredentials, isAdminCredentials } from '../store/store';

export default function LoginScreen({ onLoginSuccess, onNavigateToForgot }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrlState] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current API host settings
    initApiUrl().then(url => {
      setApiUrlState(url);
    });
  }, []);

  const handleSaveConfig = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!apiUrl.trim()) {
      setErrorMsg('API Server URL cannot be empty.');
      return;
    }
    const success = await setApiUrl(apiUrl);
    if (success) {
      setSuccessMsg('API Server URL updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowConfig(false);
      // Attempt to sync after config change
      setLoading(true);
      const syncResult = await syncWithServer();
      setLoading(false);
      if (!syncResult.success) {
        setErrorMsg('Successfully set URL, but failed to connect to server.');
      }
    } else {
      setErrorMsg('Failed to save API URL.');
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setLoading(true);
    // Sync with server first to make sure we have latest credentials
    await syncWithServer();
    setLoading(false);

    const cleanUsername = identifier.trim();

    // Check admin credentials
    if (isAdminCredentials(cleanUsername, password)) {
      onLoginSuccess({
        id: 'admin',
        name: 'Administrator',
        email: 'admin@devicedesk.com',
        role: 'admin',
      });
      return;
    }

    // Check employee credentials
    const employee = findEmployeeByCredentials(cleanUsername, password);
    if (employee) {
      // Check if employee is admin-like by role
      const isEmployeeAdmin = 
        employee.role === 'Admin' || 
        employee.role === 'Management' || 
        employee.role === 'IT Engineer';

      onLoginSuccess({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: isEmployeeAdmin ? 'admin' : 'employee',
        department: employee.department,
      });
    } else {
      setErrorMsg('⚠️ Invalid username/email or password.');
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
            <Text style={styles.title}>DeviceDesk</Text>
            <Text style={styles.subtitle}>System Tracking & Support Portal</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

            <Text style={styles.label}>Username or Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. admin or employee@yopmail.com"
              placeholderTextColor="#888"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={onNavigateToForgot}>
              <Text style={styles.forgotBtnText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Config Panel */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              {showConfig ? 'Hide Connection Config' : 'Configure Server API Connection ⚙️'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Server Settings</Text>
              <Text style={styles.configDesc}>
                Set the IP/URL of your local running Next.js server (e.g. http://192.168.1.50:3000)
              </Text>

              <Text style={styles.label}>API Base URL</Text>
              <TextInput
                style={styles.input}
                placeholder="http://192.168.1.XX:3000"
                placeholderTextColor="#888"
                value={apiUrl}
                onChangeText={setApiUrlState}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveConfig}>
                <Text style={styles.saveButtonText}>Save & Sync</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Fly Media Technology</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117', // Dark theme background
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#58a6ff', // Theme blue accent
    letterSpacing: 1,
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
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: 8,
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
  loginButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotBtnText: {
    color: '#58a6ff',
    fontSize: 14,
  },
  configToggle: {
    alignItems: 'center',
    marginVertical: 10,
  },
  configToggleText: {
    color: '#8b949e',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  configDesc: {
    color: '#8b949e',
    fontSize: 13,
    marginBottom: 15,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#238636', // Green save button
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
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
  footerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#8b949e',
    fontSize: 12,
  },
});
