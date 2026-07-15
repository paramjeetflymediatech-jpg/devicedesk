import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadCache, syncWithServer, subscribe } from './src/store/store';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import AdminDashboard from './src/screens/Admin/Dashboard';
import EmployeeDashboard from './src/screens/Employee/Dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // login, forgot, admin, employee
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    async function initApp() {
      // 1. Load data from AsyncStorage cache
      await loadCache();
      
      // 2. Perform background sync from the Next.js server
      await syncWithServer();
      
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

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    if (userObj.role === 'admin') {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('employee');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1117" />
        <ActivityIndicator size="large" color="#58a6ff" />
        <Text style={styles.loadingText}>Connecting to DeviceDesk...</Text>
      </View>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
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
      {renderScreen()}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d1117',
  },
  loadingText: {
    marginTop: 15,
    color: '#8b949e',
    fontSize: 16,
  },
});
