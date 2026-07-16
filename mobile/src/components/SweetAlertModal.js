import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';

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

  const getIconColor = () => {
    switch (config.type) {
      case 'error': return '#da3633';
      case 'warning': return '#f0883e';
      case 'info': return '#58a6ff';
      case 'success':
      default:
        return '#3fb950';
    }
  };

  const getIcon = () => {
    switch (config.type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success':
      default:
        return '✔️';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.sweetOverlay}>
        <View style={styles.sweetBox}>
          <View style={[styles.sweetIconCircle, { borderColor: getIconColor() }]}>
            <Text style={styles.sweetIconText}>{getIcon()}</Text>
          </View>
          {config.title ? <Text style={styles.sweetTitle}>{config.title}</Text> : null}
          {config.text ? <Text style={styles.sweetText}>{config.text}</Text> : null}
          <View style={styles.sweetButtonRow}>
            {config.showCancel ? (
              <TouchableOpacity 
                style={styles.sweetCancelBtn} 
                onPress={() => setVisible(false)}
              >
                <Text style={styles.sweetCancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity 
              style={[styles.sweetConfirmBtn, { backgroundColor: getIconColor(), marginLeft: config.showCancel ? 10 : 0 }]} 
              onPress={handleConfirm}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  sweetBox: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  sweetIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sweetIconText: {
    fontSize: 32,
  },
  sweetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f0f6fc',
    marginBottom: 10,
    textAlign: 'center',
  },
  sweetText: {
    fontSize: 14,
    color: '#8b949e',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  sweetButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sweetCancelBtn: {
    flex: 1,
    backgroundColor: '#30363d',
    borderWidth: 1,
    borderColor: '#444c56',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  sweetCancelText: {
    color: '#c9d1d9',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sweetConfirmBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sweetConfirmText: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default SweetAlertModal;
