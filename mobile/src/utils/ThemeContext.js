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
        primary: '#3b82f6',
        primaryLight: 'rgba(59, 130, 246, 0.15)',
        accent: '#3b82f6',
        background: '#09090b',
        surface: '#121215',
        card: '#18181b',
        cardBg: '#18181b',
        cardSubtle: '#141418',
        cardElevated: '#1f1f23',
        headerBg: '#09090b',
        text: '#f8fafc',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        border: '#27272a',
        borderLight: '#1f1f23',
        inputBg: '#121215',
        inputBorder: '#27272a',
        drawerBg: '#121215',
        drawerHeaderBg: '#09090b',
        drawerItemActive: '#1f2430',
        drawerItemActiveBorder: '#2563eb44',
        drawerItemText: '#f1f5f9',
        drawerSubtext: '#94a3b8',
        statusBar: 'light-content',
        switchTrackFalse: '#27272a',
        switchTrackTrue: '#2563eb',
        switchThumb: '#f8fafc',
        success: '#10b981',
        successBg: 'rgba(16, 185, 129, 0.14)',
        warning: '#f59e0b',
        warningBg: 'rgba(245, 158, 11, 0.14)',
        danger: '#ef4444',
        dangerBg: 'rgba(239, 68, 68, 0.14)',
        purple: '#a855f7',
        purpleBg: 'rgba(168, 85, 247, 0.14)',
        cyan: '#06b6d4',
        cyanBg: 'rgba(6, 182, 212, 0.14)',
        pillActive: 'rgba(59, 130, 246, 0.15)',
      }
    : {
        mode: 'light',
        primary: '#2563eb',
        primaryLight: 'rgba(37, 99, 235, 0.08)',
        accent: '#2563eb',
        background: '#f8fafc',
        surface: '#ffffff',
        card: '#ffffff',
        cardBg: '#ffffff',
        cardSubtle: '#f8fafc',
        cardElevated: '#ffffff',
        headerBg: '#ffffff',
        text: '#0f172a',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        borderLight: '#f1f5f9',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        drawerBg: '#ffffff',
        drawerHeaderBg: '#f8fafc',
        drawerItemActive: '#eff6ff',
        drawerItemActiveBorder: '#bfdbfe',
        drawerItemText: '#1e293b',
        drawerSubtext: '#64748b',
        statusBar: 'dark-content',
        switchTrackFalse: '#cbd5e1',
        switchTrackTrue: '#2563eb',
        switchThumb: '#ffffff',
        success: '#059669',
        successBg: 'rgba(16, 185, 129, 0.1)',
        warning: '#d97706',
        warningBg: 'rgba(245, 158, 11, 0.1)',
        danger: '#dc2626',
        dangerBg: 'rgba(239, 68, 68, 0.1)',
        purple: '#7c3aed',
        purpleBg: 'rgba(124, 58, 237, 0.1)',
        cyan: '#0891b2',
        cyanBg: 'rgba(8, 145, 178, 0.1)',
        pillActive: 'rgba(37, 99, 235, 0.08)',
      };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, themeColors, colors: themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
