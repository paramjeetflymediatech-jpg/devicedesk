import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';

const SweetAlertModal = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    text: '',
    type: 'success', // success, error, warning, info
    showCancel: false,
    onConfirm: null,
  });

  useImperativeHandle(ref, () => ({
    show: (newConfig) => {
      setConfig({
        title: newConfig.title || '',
        text: newConfig.text || '',
        type: newConfig.type || 'success',
        showCancel: !!newConfig.showCancel,
        onConfirm: newConfig.onConfirm || null,
      });
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
    }
  }));

  const handleConfirm = () => {
    setVisible(false);
    if (config.onConfirm) {
      config.onConfirm();
    }
  };

  const getTheme = () => {
    switch (config.type) {
      case 'error':
        return {
          color: '#dc2626',
          bgColor: '#fef2f2',
          borderColor: '#fca5a5',
          btnBg: '#dc2626',
        };
      case 'warning':
        return {
          color: '#d97706',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
          btnBg: '#d97706',
        };
      case 'info':
        return {
          color: '#0284c7',
          bgColor: '#f0f9ff',
          borderColor: '#bae6fd',
          btnBg: '#0284c7',
        };
      case 'success':
      default:
        return {
          color: '#16a34a',
          bgColor: '#f0fdf4',
          borderColor: '#86efac',
          btnBg: '#0f172a',
        };
    }
  };

  const renderIcon = () => {
    const theme = getTheme();
    const size = 32;

    switch (config.type) {
      case 'error':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Line x1="15" y1="9" x2="9" y2="15" />
            <Line x1="9" y1="9" x2="15" y2="15" />
          </Svg>
        );
      case 'warning':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <Line x1="12" y1="9" x2="12" y2="13" />
            <Line x1="12" y1="17" x2="12.01" y2="17" />
          </Svg>
        );
      case 'info':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="16" x2="12" y2="12" />
            <Line x1="12" y1="8" x2="12.01" y2="8" />
          </Svg>
        );
      case 'success':
      default:
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="20 6 9 17 4 12" />
          </Svg>
        );
    }
  };

  const theme = getTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.sweetOverlay}>
        <View style={styles.sweetBox}>
          
          {/* Status Icon Badge */}
          <View style={[styles.sweetIconCircle, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
            {renderIcon()}
          </View>

          {/* Title & Body */}
          {config.title ? <Text style={styles.sweetTitle}>{config.title}</Text> : null}
          {config.text ? <Text style={styles.sweetText}>{config.text}</Text> : null}

          {/* Action Buttons */}
          <View style={styles.sweetButtonRow}>
            {config.showCancel ? (
              <TouchableOpacity 
                style={styles.sweetCancelBtn} 
                onPress={() => setVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.sweetCancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity 
              style={[
                styles.sweetConfirmBtn, 
                { backgroundColor: theme.btnBg, flex: config.showCancel ? 1 : 0, paddingHorizontal: config.showCancel ? 0 : 36 }
              ]} 
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Text style={styles.sweetConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  sweetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
  },
  sweetBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  sweetIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sweetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sweetText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
    fontWeight: '500',
  },
  sweetButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  sweetCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sweetCancelText: {
    color: '#475569',
    fontSize: 14.5,
    fontWeight: '700',
  },
  sweetConfirmBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sweetConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

SweetAlertModal.displayName = 'SweetAlertModal';

export default SweetAlertModal;
