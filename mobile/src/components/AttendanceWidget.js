import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  fetchAttendanceStatus,
  postAttendancePunch,
} from '../utils/api';
import { sweetAlert } from '../utils/sweetAlert';

export default function AttendanceWidget({ user, onStatusChange }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState('Tea Break');
  const [remarks, setRemarks] = useState('');

  // Live ticking timers
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const timerRef = useRef(null);

  const getStatus = async () => {
    if (!user || !user.id) return;
    try {
      const data = await fetchAttendanceStatus(user.id);
      if (data.success) {
        setStatusData(data);
        setWorkSeconds(data.elapsedWorkSeconds || 0);
        setBreakSeconds(data.elapsedBreakSeconds || 0);
        if (onStatusChange) {
          onStatusChange(data);
        }
      }
    } catch (err) {
      console.error('Error fetching attendance status on mobile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStatus();
  }, [user?.id]);

  // Live timer ticking
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (statusData?.punchedIn) {
      timerRef.current = setInterval(() => {
        if (statusData.onBreak) {
          setBreakSeconds((prev) => prev + 1);
        } else {
          setWorkSeconds((prev) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [statusData?.punchedIn, statusData?.onBreak]);

  const handlePunchAction = async (action, extraData = {}) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const data = await postAttendancePunch(
        user.id,
        user.name,
        action,
        extraData.breakType || '',
        extraData.remarks || ''
      );

      if (data.success) {
        sweetAlert({
          title: 'Success',
          text: data.message,
          type: 'success',
        });
        setRemarks('');
        await getStatus();
      } else {
        sweetAlert({
          title: 'Restricted',
          text: data.message,
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: 'Failed to update attendance. Check network.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
      setShowBreakModal(false);
    }
  };

  const formatHMS = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#58a6ff" />
        <Text style={styles.loadingText}>Loading attendance status...</Text>
      </View>
    );
  }

  const punchedIn = statusData?.punchedIn;
  const onBreak = statusData?.onBreak;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.statusBadgeContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: onBreak ? '#f59e0b' : punchedIn ? '#3fb950' : '#8b949e' }
          ]} />
          <Text style={styles.statusTitle}>
            {onBreak ? 'On Break' : punchedIn ? 'Active Work' : 'Punched Out'}
          </Text>
        </View>

        {punchedIn && (
          <View style={styles.timersContainer}>
            <View style={styles.timerBlock}>
              <Text style={styles.timerLabel}>💻 Work Time</Text>
              <Text style={styles.timerValue}>{formatHMS(workSeconds)}</Text>
            </View>
            <View style={styles.timerBlock}>
              <Text style={styles.timerLabel}>☕ Break Time</Text>
              <Text style={[styles.timerValue, { color: '#f59e0b' }]}>{formatHMS(breakSeconds)}</Text>
            </View>
          </View>
        )}
      </View>

      {!punchedIn ? (
        <View style={styles.actionContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add login remarks (optional)..."
            placeholderTextColor="#8b949e"
            value={remarks}
            onChangeText={setRemarks}
          />
          <TouchableOpacity
            style={styles.punchBtn}
            onPress={() => handlePunchAction('PUNCH_IN', { remarks })}
            disabled={submitting}
          >
            <Text style={styles.punchBtnText}>📥 Punch In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {!onBreak ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => setShowBreakModal(true)}
                disabled={submitting}
              >
                <Text style={styles.actionBtnText}>☕ Start Break</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#da3633' }]}
                onPress={() => handlePunchAction('PUNCH_OUT')}
                disabled={submitting}
              >
                <Text style={styles.actionBtnText}>📤 Punch Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3fb950', flex: 1 }]}
              onPress={() => handlePunchAction('END_BREAK')}
              disabled={submitting}
            >
              <Text style={styles.actionBtnText}>▶️ End Break / Resume Work</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Break Type selection modal */}
      <Modal
        visible={showBreakModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBreakModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>☕ Select Break Type</Text>
            
            <View style={styles.breakOptions}>
              {['Tea Break', 'Lunch Break', 'Smoke Break', 'Other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.breakOptionBtn,
                    selectedBreakType === type && styles.breakOptionBtnActive,
                  ]}
                  onPress={() => setSelectedBreakType(type)}
                >
                  <Text style={[
                    styles.breakOptionText,
                    selectedBreakType === type && styles.breakOptionTextActive,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowBreakModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => handlePunchAction('START_BREAK', { breakType: selectedBreakType })}
              >
                <Text style={styles.modalConfirmText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
  },
  loadingContainer: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    color: '#8b949e',
    marginLeft: 10,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusTitle: {
    color: '#f0f6fc',
    fontWeight: 'bold',
    fontSize: 15,
  },
  timersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBlock: {
    alignItems: 'flex-end',
    marginLeft: 15,
  },
  timerLabel: {
    fontSize: 10,
    color: '#8b949e',
    marginBottom: 2,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#58a6ff',
  },
  actionContainer: {
    marginTop: 5,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f0f6fc',
    fontSize: 13,
    marginBottom: 10,
  },
  punchBtn: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  punchBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 14,
    padding: 20,
    width: '90%',
    maxWidth: 320,
  },
  modalTitle: {
    color: '#f0f6fc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  breakOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  breakOptionBtn: {
    width: '48%',
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  breakOptionBtnActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  breakOptionText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '600',
  },
  breakOptionTextActive: {
    color: '#f59e0b',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelBtn: {
    width: '45%',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#8b949e',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    width: '45%',
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
