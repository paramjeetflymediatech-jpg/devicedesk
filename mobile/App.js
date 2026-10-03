import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Text, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCache, syncWithServer, subscribe } from './src/store/store';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AdminDashboard from './src/screens/Admin/Dashboard';
import EmployeeDashboard from './src/screens/Employee/Dashboard';
import CandidateRegistrationScreen from './src/screens/CandidateRegistrationScreen';
import CandidateDashboardScreen from './src/screens/CandidateDashboardScreen';
import ClientDashboard from './src/screens/Client/ClientDashboard';
import LeaderDashboard from './src/screens/Leader/LeaderDashboard';

import { setupPushNotifications, getFcmToken } from './src/utils/notifications';
import { getOrCreateDeviceId, registerDeviceToken, deregisterDeviceToken, fetchMarketingAttendance } from './src/utils/api';
import { startBackgroundTracking, stopBackgroundTracking } from './src/utils/backgroundLocation';
import { initSocket, disconnectSocket, onSocketEvent } from './src/utils/socketService';
import { processOfflineQueue } from './src/utils/offlineQueue';

import SweetAlertModal from './src/components/SweetAlertModal';
import { sweetAlertRef, sweetAlert } from './src/utils/sweetAlert';

import { ThemeProvider, useTheme } from './src/utils/ThemeContext';

function MainAppContent() {
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, login, forgot, admin, employee, client, leader
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [, setTick] = useState(0);
  const { themeColors } = useTheme();

  useEffect(() => {
    async function initApp() {
      try {
        // 1. Initialize push notifications
        try {
          await setupPushNotifications();
        } catch (err) {
          console.warn('Could not initialize push notifications:', err);
        }

        // 2. Load data from AsyncStorage cache
        try {
          await loadCache();
        } catch (err) {
          console.warn('Failed to load cache:', err);
        }
        
        // 3. Process pending offline actions & perform sync
        try {
          await processOfflineQueue();
          await syncWithServer();
        } catch (err) {
          console.warn('Initial server sync failed:', err);
        }

        // 4. Check for persistent user session
        try {
          const storedUser = await AsyncStorage.getItem('@currentUser');
          if (storedUser) {
            const userObj = JSON.parse(storedUser);
            setCurrentUser(userObj);
            
            // Connect to real-time socket
            try {
              initSocket(userObj);
            } catch (sockErr) {
              console.warn('Socket initialization error on startup:', sockErr);
            }

            const roleLower = (userObj.role || '').toLowerCase().trim();
            const dbRoleLower = (userObj.dbRole || '').toLowerCase().trim();
            const deptLower = (userObj.department || '').toLowerCase().trim();

            const isLeader =
              dbRoleLower === 'team leader' ||
              dbRoleLower === 'tl' ||
              dbRoleLower === 'team lead' ||
              dbRoleLower === 'team_lead' ||
              dbRoleLower.includes('leader') ||
              roleLower === 'team leader' ||
              roleLower === 'tl' ||
              roleLower.includes('leader') ||
              Boolean(userObj.isLeader);

            const isHR =
              !isLeader &&
              (dbRoleLower === 'hr' || dbRoleLower.includes('hr') || roleLower.includes('hr') || deptLower === 'hr' || deptLower.includes('hr') || deptLower.includes('human resource'));

            const isDnsAdmin =
              !isLeader &&
              (roleLower === 'dns manager' || deptLower === 'dns manager' || roleLower.includes('dns') || dbRoleLower.includes('dns'));

            const isPureAdmin =
              !isLeader &&
              (dbRoleLower === 'admin' || dbRoleLower === 'superadmin' || dbRoleLower === 'management');

            const isITSupport =
              !isLeader &&
              (dbRoleLower === 'it support' || deptLower === 'it support' || dbRoleLower === 'it_support');

            const isAdmin =
              !isLeader &&
              (isPureAdmin || isHR || isDnsAdmin || isITSupport || (roleLower.includes('admin') && !isLeader));

            if (isLeader) {
              setCurrentScreen('leader');
            } else if (isAdmin) {
              setCurrentScreen('admin');
            } else if (roleLower === 'candidate' || dbRoleLower === 'candidate') {
              setCurrentScreen('candidateDashboard');
            } else if (roleLower === 'client' || dbRoleLower === 'client') {
              setCurrentScreen('client');
            } else {
              setCurrentScreen('employee');
            }

            // Silently register device token on launch for persistence
            try {
              const fcmToken = await getFcmToken();
              const deviceId = await getOrCreateDeviceId();
              const deviceModel = Platform.OS === 'android' ? 'Android Device' : 'iOS Device';
              if (fcmToken) {
                await registerDeviceToken(userObj.id, fcmToken, deviceId, deviceModel);
              }
            } catch (tokenErr) {
              console.warn('Silent device token registration failed (non-fatal):', tokenErr);
            }

            // If marketing employee has an active trip, ensure continuous background tracking is running
            try {
              const isMkt = (userObj.department || '').toLowerCase() === 'marketing' || (userObj.role || '').toLowerCase().includes('marketing');
              if (isMkt) {
                fetchMarketingAttendance(userObj.id).then((res) => {
                  const active = res?.data?.find((a) => a.status === 'Checked In');
                  if (active) {
                    startBackgroundTracking({ employeeId: userObj.id, attendanceId: active.id });
                  }
                }).catch(() => {});
              }
            } catch (bgErr) {
              console.warn('Background tracking launch check error (non-fatal):', bgErr);
            }
          } else {
            setCurrentScreen('welcome');
          }
        } catch (err) {
          console.error('Failed to load persistent user session:', err);
          setCurrentScreen('welcome');
        }
      } catch (fatalErr) {
        console.error('Fatal initialization error:', fatalErr);
        setCurrentScreen('welcome');
      } finally {
        setLoading(false);
      }
    }
    
    initApp();

    // Subscribe to store notifications so App re-renders when cache updates
    const unsubscribe = subscribe(() => {
      setTick(t => t + 1);
    });

    // Start background sync polling every 6 seconds
    const intervalId = setInterval(syncWithServer, 6000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const handleLoginSuccess = async (userObj) => {
    setCurrentUser(userObj);
    try {
      await AsyncStorage.setItem('@currentUser', JSON.stringify(userObj));
    } catch (err) {
      console.error('Failed to persist user session:', err);
    }

    // Connect to real-time socket
    try {
      initSocket(userObj);
    } catch (sockErr) {
      console.warn('Socket connection error on login:', sockErr);
    }

    // Register device token upon successful login
    try {
      const fcmToken = await getFcmToken();
      const deviceId = await getOrCreateDeviceId();
      const deviceModel = Platform.OS === 'android' ? 'Android Device' : 'iOS Device';
      if (fcmToken) {
        await registerDeviceToken(userObj.id, fcmToken, deviceId, deviceModel);
      }
    } catch (tokenErr) {
      console.warn('Device token registration failed on login (non-fatal):', tokenErr);
    }

    const roleLower = (userObj.role || '').toLowerCase().trim();
    const dbRoleLower = (userObj.dbRole || '').toLowerCase().trim();
    const deptLower = (userObj.department || '').toLowerCase().trim();

    const isLeader =
      dbRoleLower === 'team leader' ||
      dbRoleLower === 'tl' ||
      dbRoleLower === 'team lead' ||
      dbRoleLower === 'team_lead' ||
      dbRoleLower.includes('leader') ||
      roleLower === 'team leader' ||
      roleLower === 'tl' ||
      roleLower.includes('leader') ||
      Boolean(userObj.isLeader);

    const isHR =
      !isLeader &&
      (dbRoleLower === 'hr' || dbRoleLower.includes('hr') || roleLower.includes('hr') || deptLower === 'hr' || deptLower.includes('hr') || deptLower.includes('human resource'));

    const isDnsAdmin =
      !isLeader &&
      (roleLower === 'dns manager' || deptLower === 'dns manager' || roleLower.includes('dns') || dbRoleLower.includes('dns'));

    const isPureAdmin =
      !isLeader &&
      (dbRoleLower === 'admin' || dbRoleLower === 'superadmin' || dbRoleLower === 'management');

    const isITSupport =
      !isLeader &&
      (dbRoleLower === 'it support' || deptLower === 'it support' || dbRoleLower === 'it_support');

    const isAdmin =
      !isLeader &&
      (isPureAdmin || isHR || isDnsAdmin || isITSupport || (roleLower.includes('admin') && !isLeader));

    if (isLeader) {
      setCurrentScreen('leader');
    } else if (isAdmin) {
      setCurrentScreen('admin');
    } else if (roleLower === 'candidate' || dbRoleLower === 'candidate') {
      setCurrentScreen('candidateDashboard');
    } else if (roleLower === 'client' || dbRoleLower === 'client') {
      setCurrentScreen('client');
    } else {
      setCurrentScreen('employee');
    }
  };

  const handleLogout = async () => {
    // 0. Stop background tracking service & disconnect socket
    try {
      await stopBackgroundTracking();
    } catch (err) {
      console.warn('Stop background tracking on logout error (non-fatal):', err);
    }

    try {
      disconnectSocket();
    } catch (sockErr) {
      console.warn('Socket disconnect error (non-fatal):', sockErr);
    }

    // 1. Get tokens & deviceId to deregister on server
    let fcmToken = null;
    let deviceId = null;
    try {
      fcmToken = await getFcmToken();
      deviceId = await getOrCreateDeviceId();
    } catch (err) {
      console.warn('Could not read device tokens for deregistration (non-fatal):', err);
    }

    // 2. Clear local session states
    setCurrentUser(null);
    setCurrentScreen('welcome');

    // 3. Clear local Storage key
    try {
      await AsyncStorage.removeItem('@currentUser');
    } catch (err) {
      console.error('Failed to clear persistent user session:', err);
    }

    // 4. Deregister device entry from server DB
    if (fcmToken || deviceId) {
      try {
        await deregisterDeviceToken(fcmToken, deviceId);
      } catch (err) {
        console.warn('Failed to deregister device token on server (non-fatal):', err);
      }
    }
  };

  const renderScreen = () => {
    const roleLower = (currentUser?.role || '').toLowerCase().trim();
    const dbRoleLower = (currentUser?.dbRole || '').toLowerCase().trim();
    const deptLower = (currentUser?.department || '').toLowerCase().trim();

    const isLeader =
      dbRoleLower === 'team leader' ||
      dbRoleLower === 'tl' ||
      dbRoleLower === 'team lead' ||
      dbRoleLower === 'team_lead' ||
      dbRoleLower.includes('leader') ||
      roleLower === 'team leader' ||
      roleLower === 'tl' ||
      roleLower.includes('leader') ||
      Boolean(currentUser?.isLeader);

    const isHR =
      !isLeader &&
      (dbRoleLower === 'hr' || dbRoleLower.includes('hr') || roleLower.includes('hr') || deptLower === 'hr' || deptLower.includes('hr') || deptLower.includes('human resource'));

    const isDnsAdmin =
      !isLeader &&
      (roleLower === 'dns manager' || deptLower === 'dns manager' || roleLower.includes('dns') || dbRoleLower.includes('dns'));

    const isPureAdmin =
      !isLeader &&
      (dbRoleLower === 'admin' || dbRoleLower === 'superadmin' || dbRoleLower === 'management');

    const isITSupport =
      !isLeader &&
      (dbRoleLower === 'it support' || deptLower === 'it support' || dbRoleLower === 'it_support');

    const isAdmin =
      !isLeader &&
      (isPureAdmin || isHR || isDnsAdmin || isITSupport || (roleLower.includes('admin') && !isLeader));

    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={() => setCurrentScreen('login')}
            onRegister={() => setCurrentScreen('candidateRegistration')}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordScreen
            onNavigateToLogin={() => setCurrentScreen('login')}
          />
        );
      case 'admin': {
        return (
          <AdminDashboard
            user={currentUser}
            onLogout={handleLogout}
            onSwitchToLeader={isLeader ? () => setCurrentScreen('leader') : undefined}
            onSwitchToEmployee={!isPureAdmin ? () => setCurrentScreen('employee') : undefined}
          />
        );
      }
      case 'leader': {
        return (
          <LeaderDashboard
            user={currentUser}
            onLogout={handleLogout}
            onSwitchToEmployee={() => setCurrentScreen('employee')}
          />
        );
      }
      case 'employee': {
        return (
          <EmployeeDashboard
            user={currentUser}
            onLogout={handleLogout}
            onSwitchToLeader={isLeader ? () => setCurrentScreen('leader') : undefined}
            onSwitchToAdmin={!isLeader && isAdmin ? () => setCurrentScreen('admin') : undefined}
          />
        );
      }
      case 'candidateRegistration':
        return (
          <CandidateRegistrationScreen
            onNavigateBack={() => setCurrentScreen('welcome')}
          />
        );
      case 'candidateDashboard':
        return (
          <CandidateDashboardScreen
            user={currentUser}
            onLogout={handleLogout}
          />
        );
      case 'client':
        return (
          <ClientDashboard
            user={currentUser}
            onLogout={handleLogout}
          />
        );
      case 'login':
      default:
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToForgot={() => setCurrentScreen('forgot')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.headerBg} />
      
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
          <ActivityIndicator size="large" color={themeColors.accent || '#3b82f6'} />
        </View>
      ) : (
        renderScreen()
      )}
      
      <SweetAlertModal ref={sweetAlertRef} />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
});
