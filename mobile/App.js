import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCache, syncWithServer, subscribe } from './src/store/store';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AdminDashboard from './src/screens/Admin/Dashboard';
import EmployeeDashboard from './src/screens/Employee/Dashboard';

import { setupPushNotifications, getFcmToken } from './src/utils/notifications';
import { getOrCreateDeviceId, registerDeviceToken, deregisterDeviceToken } from './src/utils/api';

import SweetAlertModal from './src/components/SweetAlertModal';
import { sweetAlertRef } from './src/utils/sweetAlert';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, login, forgot, admin, employee
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [, setTick] = useState(0);

  useEffect(() => {
    async function initApp() {
      // 1. Initialize push notifications
      try {
        await setupPushNotifications();
      } catch (err) {
        console.warn('Could not initialize push notifications:', err);
      }

      // 2. Load data from AsyncStorage cache
      await loadCache();
      
      // 3. Perform background sync from the Next.js server
      await syncWithServer();

      // 4. Check for persistent user session
      try {
        const storedUser = await AsyncStorage.getItem('@currentUser');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          setCurrentUser(userObj);
          if (userObj.role === 'admin') {
            setCurrentScreen('admin');
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
        } else {
          setCurrentScreen('welcome');
        }
      } catch (err) {
        console.error('Failed to load persistent user session:', err);
        setCurrentScreen('welcome');
      }
      
      setLoading(false);
    }
    
    initApp();

    // Subscribe to store notifications so App re-renders when cache updates
    const unsubscribe = subscribe(() => {
      setTick(t => t + 1);
    });

    // Start background sync polling every 5 seconds
    const intervalId = setInterval(syncWithServer, 5000);

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

    if (userObj.role === 'admin') {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('employee');
    }
  };

  const handleLogout = async () => {
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
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={() => setCurrentScreen('login')}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordScreen
            onNavigateToLogin={() => setCurrentScreen('login')}
          />
        );
      case 'admin':
        return (
          <AdminDashboard
            user={currentUser}
            onLogout={handleLogout}
          />
        );
      case 'employee':
        return (
          <EmployeeDashboard
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
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />
      
      {!loading && renderScreen()}
      
      <SweetAlertModal ref={sweetAlertRef} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
});
