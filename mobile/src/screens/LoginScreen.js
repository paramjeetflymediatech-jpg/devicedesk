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
  Image,
  Modal,
} from 'react-native';
import { getApiUrl, setApiUrl, initApiUrl } from '../utils/api';
import { findEmployeeByCredentials, isAdminCredentials, syncWithServer } from '../store/store';
import { sweetAlert } from '../utils/sweetAlert';

export default function LoginScreen({ onLoginSuccess, onNavigateToForgot }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrlState] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [testing, setTesting] = useState(false);

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
      sweetAlert({ title: 'Success', text: 'API Server URL updated successfully!', type: 'success' });
      setShowConfig(false);
      // Attempt to sync after config change
      setLoading(true);
      const syncResult = await syncWithServer();
      setLoading(false);
      if (!syncResult.success) {
        sweetAlert({ title: 'Warning', text: 'Successfully set URL, but failed to connect to server.', type: 'warning' });
      }
    } else {
      sweetAlert({ title: 'Error', text: 'Failed to save API URL.', type: 'error' });
    }
  };

  const handleTestConnection = async () => {
    if (!apiUrl.trim()) {
      sweetAlert({ title: 'Error', text: 'API Base URL cannot be empty.', type: 'error' });
      return;
    }
    setTesting(true);
    try {
      let cleanUrl = apiUrl.trim();
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${cleanUrl}/api/db`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(id);
      if (res.ok) {
        sweetAlert({ title: 'Success', text: 'Server is active and reachable!', type: 'success' });
      } else {
        sweetAlert({ title: 'Connection Failed', text: `Server returned status code ${res.status}`, type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Connection Error', text: 'Failed to reach server: ' + err.message, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!identifier.trim() || !password.trim()) {
      sweetAlert({ title: 'Error', text: 'Please fill in all fields.', type: 'error' });
      return;
    }

    setLoading(true);
    // Sync with server first to make sure we have latest credentials
    await syncWithServer();
    setLoading(false);

    const cleanUsername = identifier.trim();

    // Check admin credentials
    if (isAdminCredentials(cleanUsername, password)) {
      const adminUser = {
        id: 'admin',
        name: 'Administrator',
        email: 'admin@devicedesk.com',
        role: 'admin',
      };
      sweetAlert({
        title: 'Success',
        text: 'Logged in successfully as Administrator.',
        type: 'success',
        onConfirm: () => {
          onLoginSuccess(adminUser);
        }
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

      const empUser = {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: isEmployeeAdmin ? 'admin' : 'employee',
        department: employee.department,
      };

      sweetAlert({
        title: 'Success',
        text: `Welcome back, ${employee.name}!`,
        type: 'success',
        onConfirm: () => {
          onLoginSuccess(empUser);
        }
      });
    } else {
      sweetAlert({ title: 'Error', text: 'Invalid username/email or password.', type: 'error' });
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
            <TouchableOpacity 
              style={styles.gearButton} 
              onPress={() => setShowConfig(true)}
            >
              <Text style={styles.gearIcon}>⚙️ Server Settings</Text>
            </TouchableOpacity>
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

        {/* Server Config Modal */}
        <Modal
          visible={showConfig}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowConfig(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🌐 Server Settings</Text>
              <Text style={styles.configDesc}>
                Set the IP/URL of your corporate Next.js deployment server.
              </Text>

              <Text style={styles.label}>API Base URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://api.yourdomain.com"
                placeholderTextColor="#888"
                value={apiUrl}
                onChangeText={setApiUrlState}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity 
                style={styles.testBtn} 
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator color="#58a6ff" />
                ) : (
                  <Text style={styles.testBtnText}>⚡ Test Connection</Text>
                )}
              </TouchableOpacity>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfig(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConfig}>
                  <Text style={styles.saveBtnText}>Save & Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>DeviceDesk</Text>
            <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setShowLegalModal(true)}>
              <Text style={styles.footerLinkText}>Privacy Policy & Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showLegalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLegalModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Legal & Privacy Policy</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.legalHeader}>1. Privacy Policy</Text>
              <Text style={styles.legalText}>
                DeviceDesk collects system specifications, employee assignments, and IT support tickets to facilitate hardware inventory tracking. Data is cached locally on this device and synchronized with your organization's secure database server. We do not share, sell, or distribute your personal details or usage history to any third parties.
              </Text>
              
              <Text style={styles.legalHeader}>2. Terms & Conditions</Text>
              <Text style={styles.legalText}>
                This system is provided exclusively for authorized internal corporate inventory tracking and maintenance coordination. Unauthorized access or attempt to tamper with system records is strictly prohibited. All transactions, assignments, and support tickets raised are logged and audited.
              </Text>
              
              <Text style={styles.legalHeader}>3. Data & Account Deletion</Text>
              <Text style={styles.legalText}>
                In compliance with App Store guidelines, users have the right to request full account profile and data deletion. Account deletion will permanently erase your employee record, delete your raised tickets, and unassign any active inventory assets. To delete your account, please log in and navigate to the Account Settings menu on your dashboard.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLegalModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 20,
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
  gearButton: {
    marginTop: 15,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
  gearIcon: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  configDesc: {
    color: '#8b949e',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
    textAlign: 'center',
  },
  testBtn: {
    borderWidth: 1,
    borderColor: '#58a6ff',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  testBtnText: {
    color: '#58a6ff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#21262d',
    marginRight: 10,
  },
  cancelBtnText: {
    color: '#c9d1d9',
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#238636',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
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
  footerLinkText: {
    color: '#58a6ff',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 20,
  },
  legalHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginTop: 15,
    marginBottom: 6,
  },
  legalText: {
    fontSize: 13,
    color: '#8b949e',
    lineHeight: 18,
    textAlign: 'justify',
  },
  closeBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
