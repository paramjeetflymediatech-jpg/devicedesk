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
import AppIcon from '../components/AppIcon';

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

  const [showPassword, setShowPassword] = useState(false);

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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Top Bar with Server Settings Gear */}
          {/* <View style={styles.topBarRow}>
            <View style={styles.subTagPill}>
              <Text style={styles.subTagPillText}>✨ ENTERPRISE PORTAL</Text>
            </View>
            <TouchableOpacity 
              style={styles.gearButton} 
              onPress={() => setShowConfig(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.gearIcon}>⚙️ Server API</Text>
            </TouchableOpacity>
          </View> */}

          {/* Header & Logo */}
          <View style={styles.headerContainer}>
            <Image
              source={require('../assets/flymedia_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>System Tracking & Support Portal</Text>
          </View>

          {/* Clean White Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In to Account</Text>

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

            {/* Email Field */}
            <Text style={styles.label}>Username or Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Please enter your company email"
                placeholderTextColor="#94a3b8"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Field */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={onNavigateToForgot} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.forgotBtnText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { paddingRight: 45 }]}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppIcon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Solid Black Login Button */}
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading} activeOpacity={0.88}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In →</Text>
              )}
            </TouchableOpacity>
          </View>



          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Secured by DeviceDesk  </Text>
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
              <Text style={styles.legalHeader}>1. Privacy Policy & Data Collection</Text>
              <Text style={styles.legalText}>
                {"DeviceDesk collects system specifications, employee assignments, attendance location coordinates (GPS), camera photos for ticket attachments, and push notification tokens to facilitate corporate inventory and attendance tracking. Data is stored securely in encrypted databases."}
              </Text>

              <Text style={styles.legalHeader}>2. Location & Media Usage</Text>
              <Text style={styles.legalText}>
                Location permissions are accessed only during attendance punch-in and punch-out to verify office presence. Camera permissions are used exclusively to capture hardware issue photos for IT support tickets and chat attachments.
              </Text>

              <Text style={styles.legalHeader}>3. Terms & Conditions</Text>
              <Text style={styles.legalText}>
                This system is provided exclusively for authorized internal corporate inventory tracking and maintenance coordination. Unauthorized access or attempt to tamper with system records is strictly prohibited.
              </Text>

              <Text style={styles.legalHeader}>4. Data & Account Deletion</Text>
              <Text style={styles.legalText}>
                In compliance with Google Play Developer Program policies, users have the right to request full account profile and data deletion within the app settings or via our public web portal at:
                {"\n"}
                https://devicedesk.app/account-deletion
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
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 25,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  subTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subTagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
  },
  gearButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  gearIcon: {
    color: '#0f172a',
    fontSize: 11.5,
    fontWeight: '700',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoImage: {
    width: 230,
    height: 75,
    marginBottom: 8,
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '500',
    textAlign: 'center',
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
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  forgotBtnText: {
    color: '#0284c7',
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 18,
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
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
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
  footerContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  footerLinkText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  configDesc: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
  testBtn: {
    borderWidth: 1,
    borderColor: '#0f172a',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  testBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13.5,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalScroll: {
    marginBottom: 16,
  },
  legalHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
  },
  legalText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 19,
  },
  closeBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
