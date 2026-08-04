import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const THEME_KEY = '@theme_mode';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      }
    }
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, nextTheme);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  };

  const isDark = theme === 'dark';

  const themeColors = isDark
    ? {
        mode: 'dark',
        background: '#0f172a',
        cardBg: '#1e293b',
        headerBg: '#1e293b',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        border: '#334155',
        drawerBg: '#1e293b',
        drawerHeaderBg: '#0f172a',
        drawerItemActive: '#334155',
        drawerItemActiveBorder: '#475569',
        drawerItemText: '#f1f5f9',
        drawerSubtext: '#94a3b8',
        statusBar: 'light-content',
        switchTrackFalse: '#475569',
        switchTrackTrue: '#2563eb',
        switchThumb: '#f8fafc',
      }
    : {
        mode: 'light',
        background: '#f8fafc',
        cardBg: '#ffffff',
        headerBg: '#ffffff',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        drawerBg: '#ffffff',
        drawerHeaderBg: '#f8fafc',
        drawerItemActive: '#eff6ff',
        drawerItemActiveBorder: '#bfdbfe',
        drawerItemText: '#334155',
        drawerSubtext: '#64748b',
        statusBar: 'dark-content',
        switchTrackFalse: '#cbd5e1',
        switchTrackTrue: '#2563eb',
        switchThumb: '#ffffff',
      };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
