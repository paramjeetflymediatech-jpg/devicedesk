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
        accent: '#3b82f6',
        background: '#09090b',
        card: '#000000',
        cardBg: '#000000',
        headerBg: '#000000',
        text: '#f8fafc',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        border: '#27272a',
        inputBg: '#000000',
        inputBorder: '#27272a',
        drawerBg: '#000000',
        drawerHeaderBg: '#09090b',
        drawerItemActive: '#18181b',
        drawerItemActiveBorder: '#27272a',
        drawerItemText: '#f1f5f9',
        drawerSubtext: '#94a3b8',
        statusBar: 'light-content',
        switchTrackFalse: '#27272a',
        switchTrackTrue: '#2563eb',
        switchThumb: '#f8fafc',
      }
    : {
        mode: 'light',
        primary: '#2563eb',
        accent: '#2563eb',
        background: '#f8fafc',
        card: '#ffffff',
        cardBg: '#ffffff',
        headerBg: '#ffffff',
        text: '#0f172a',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
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
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, themeColors, colors: themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
