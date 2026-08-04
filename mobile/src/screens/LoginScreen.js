import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl, setApiUrl, initApiUrl } from '../utils/api';
import { findEmployeeByCredentials, isAdminCredentials, syncWithServer } from '../store/store';
import { sweetAlert } from '../utils/sweetAlert';

const { width } = Dimensions.get('window');

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
    const cleanUsername = identifier.trim();
    const baseUrl = getApiUrl();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanUsername, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok && data.success) {
        syncWithServer().catch(() => { });
        setLoading(false);

        sweetAlert({
          title: 'Success',
          text: `Welcome back, ${data.user.name}!`,
          type: 'success',
          onConfirm: () => {
            onLoginSuccess(data.user);
          }
        });
        return;
      } else {
        setLoading(false);
        sweetAlert({
          title: response.status === 403 ? 'Account Paused' : 'Error',
          text: data.message || 'Invalid credentials.',
          type: 'error'
        });
        return;
      }
    } catch (err) {
      console.log('Server login failed or timed out, trying offline fallback:', err.message);
    }

    if (isAdminCredentials(cleanUsername, password)) {
      setLoading(false);
      const adminUser = {
        id: 'admin',
        name: 'Administrator',
        email: 'admin@devicedesk.com',
        role: 'admin',
      };
      sweetAlert({
        title: 'Success',
        text: 'Logged in successfully as Administrator (Offline).',
        type: 'success',
        onConfirm: () => {
          onLoginSuccess(adminUser);
        }
      });
      return;
    }

    const employee = findEmployeeByCredentials(cleanUsername, password);
    setLoading(false);

    if (employee) {
      if (employee.status === 'Paused') {
        sweetAlert({
          title: 'Account Paused',
          text: '🚫 Your account has been paused due to suspicious activities. Please contact Admin/IT Support.',
          type: 'error'
        });
        return;
      }
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
        text: `Welcome back, ${employee.name}! (Offline)`,
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
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Decorative Glow Elements */}
      <View style={styles.glowCyan} />
      <View style={styles.glowPurple} />

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

            <View style={styles.subTagPill}>
              <Text style={styles.subTagPillText}>✨ ENTERPRISE PORTAL</Text>
            </View>

            {/* <Text style={styles.title}>DeviceDesk</Text> */}
            <Text style={styles.subtitle}>System Tracking & Support Portal</Text>
          </View>

          {/* Form Glass Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In to Account</Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

            <Text style={styles.label}>Username or Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. sarabjot@devicedesk.com"
              placeholderTextColor="#edf1f7ff"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={onNavigateToForgot} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.forgotBtnText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#e0e7f0ff"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading} activeOpacity={0.88}>
              {loading ? (
                <ActivityIndicator color="#0b0f19" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ alignItems: 'center', marginTop: 16, paddingVertical: 8 }} 
              onPress={onNavigateToForgot}
            >
              <Text style={{ color: '#00f0ff', fontSize: 13.5, fontWeight: '700' }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Server Config Modal */}
          <Modal
            visible={showConfig}
            transparent={true}
            animationType="fade"
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
                  placeholderTextColor="#64748b"
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
                    <ActivityIndicator color="#00f0ff" />
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

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Secured by DeviceDesk Enterprise v2.4</Text>
            <TouchableOpacity style={{ marginTop: 6 }} onPress={() => setShowLegalModal(true)}>
              <Text style={styles.footerLinkText}>Privacy Policy & Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Legal Modal */}
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
                {"DeviceDesk collects system specifications, employee assignments, and IT support tickets to facilitate hardware inventory tracking. Data is cached locally on this device and synchronized with your organization's secure database server."}
              </Text>

              <Text style={styles.legalHeader}>2. Terms & Conditions</Text>
              <Text style={styles.legalText}>
                This system is provided exclusively for authorized internal corporate inventory tracking and maintenance coordination. Unauthorized access or attempt to tamper with system records is strictly prohibited.
              </Text>

              <Text style={styles.legalHeader}>3. Data & Account Deletion</Text>
              <Text style={styles.legalText}>
                In compliance with App Store guidelines, users have the right to request full account profile and data deletion.
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
    backgroundColor: '#ffffffff',
    position: 'relative',
  },
  glowCyan: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(88, 136, 139, 0.07)',
  },
  glowPurple: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(168, 85, 247, 0.07)',
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
    width: 220,
    height: 75,
    marginBottom: 12,
    alignSelf: 'center',
  },
  subTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    marginBottom: 10,
  },
  subTagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00f0ff',
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000000ff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#3a3e44ff',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(20, 29, 46, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e9e9e9ff',
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0b0f19',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14.5,
    color: '#ffffff',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#00f0ff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#050914',
    letterSpacing: 0.5,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  forgotBtnText: {
    color: '#00f0ff',
    fontSize: 13,
    fontWeight: '600',
  },
  gearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  gearIcon: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  configDesc: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
  testBtn: {
    borderWidth: 1,
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  testBtnText: {
    color: '#00f0ff',
    fontWeight: '700',
    fontSize: 13.5,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#00f0ff',
  },
  saveBtnText: {
    color: '#050914',
    fontWeight: '800',
  },
  errorText: {
    color: '#f85149',
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#39db6d',
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#64748b',
    fontSize: 11.5,
    fontWeight: '500',
  },
  footerLinkText: {
    color: '#00f0ff',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#141d2e',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00f0ff',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 16,
  },
  legalHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 6,
  },
  legalText: {
    fontSize: 12.5,
    color: '#94a3b8',
    lineHeight: 18,
  },
  closeBtn: {
    backgroundColor: '#00f0ff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#050914',
    fontSize: 14,
    fontWeight: '800',
  },
});
