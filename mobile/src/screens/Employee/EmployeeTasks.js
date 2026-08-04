import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
  Platform,
} from 'react-native';
import { getTasks, addTask, updateTask, deleteTask, startTask, stopTask, completeTask, subscribe } from '../../store/store';
import { pick } from '@react-native-documents/picker';
import { getApiUrl } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

export default function EmployeeTasks({ currentUser }) {
  const [tasks, setTasks] = useState(() => getTasks().filter(t => t.assignedTo === currentUser?.id));
  const [now, setNow] = useState(() => Date.now());

  // Task completion modal states
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [activeCompletingId, setActiveCompletingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Self Task states
  const [showSelfModal, setShowSelfModal] = useState(false);
  const [selfTitle, setSelfTitle] = useState('');
  const [selfDesc, setSelfDesc] = useState('');

  const handleCreateSelfTask = () => {
    if (!selfTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }
    addTask({
      title: selfTitle.trim(),
      description: selfDesc.trim(),
      assignedTo: currentUser?.id,
      assignedToName: currentUser?.name || 'Employee',
      assignedBy: currentUser?.id,
      assignedByName: currentUser?.name || 'Employee'
    });
    setSelfTitle('');
    setSelfDesc('');
    setShowSelfModal(false);
    Alert.alert('Success', 'Task created successfully!');
  };

  // Edit Self Task states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTaskId, setEditTaskId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('Pending');

  const handleEditSelfTask = () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }
    const taskToUpdate = getTasks().find(t => t.id === editTaskId);
    const oldStatus = taskToUpdate ? taskToUpdate.status : 'Pending';

    const updatedData = {
      id: editTaskId,
      title: editTitle.trim(),
      description: editDesc.trim(),
      status: editStatus,
    };

    if (editStatus === 'Completed' && oldStatus !== 'Completed') {
      updatedData.completedAt = new Date().toISOString();
    } else if (editStatus !== 'Completed') {
      updatedData.completedAt = null;
    }

    updateTask(updatedData, currentUser?.name || 'Employee');
    setEditModalVisible(false);
    Alert.alert('Success', 'Task updated successfully!');
  };

  const handleDeleteSelfTask = (task) => {
    sweetAlert({
      title: 'Delete Task',
      text: `Are you sure you want to delete your task "${task.title}"?`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        deleteTask(task.id, currentUser?.name || 'Employee');
        sweetAlert({ title: 'Success', text: 'Task deleted successfully!', type: 'success' });
      }
    });
  };

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setTasks(getTasks().filter(t => t.assignedTo === currentUser?.id));
    });
    
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [currentUser]);

  const handleStart = (taskId) => {
    startTask(taskId, currentUser.name);
  };

  const handleStop = (taskId) => {
    stopTask(taskId, currentUser.name);
  };

  const handleCompletePress = (taskId) => {
    Alert.alert(
      'Confirm Completion',
      'Are you sure you want to mark this task as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Complete', 
          onPress: () => {
            setActiveCompletingId(taskId);
            setSelectedFiles([]);
            setCompleteModalVisible(true);
          }
        }
      ]
    );
  };

  const handleSelectFile = async () => {
    try {
      const selected = await pick({
        type: ['*/*'],
        allowMultiSelection: true
      });
      if (selected && selected.length > 0) {
        setSelectedFiles(prev => [...prev, ...selected]);
      }
    } catch (err) {
      if (err.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('File Picker Error', err.message || 'Could not pick file');
      }
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCompletion = async () => {
    if (!activeCompletingId) return;

    setUploading(true);
    let uploadedUrls = [];

    try {
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', {
            uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
            type: file.type || 'application/octet-stream',
            name: file.name || `file_${Date.now()}`
          });
        });

        const baseUrl = getApiUrl();
        const res = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          }
        });

        const data = await res.json();
        if (res.ok && data.success) {
          uploadedUrls = data.fileUrls || [];
        } else {
          throw new Error(data.message || 'Failed to upload attachment files.');
        }
      }

      completeTask(activeCompletingId, currentUser.name, uploadedUrls);

      setCompleteModalVisible(false);
      setActiveCompletingId(null);
      setSelectedFiles([]);
      sweetAlert({
        title: 'Success',
        text: 'Task marked as completed with files attached!',
        type: 'success'
      });
    } catch (err) {
      sweetAlert({
        title: 'Upload Error',
        text: err.message || 'Error uploading task completion proof files.',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const formatHMS = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const calculateTotalDuration = (task) => {
    let duration = task.accumulatedTime || 0;
    if (task.isRunning && task.lastStartedAt) {
      duration += Math.max(0, now - new Date(task.lastStartedAt).getTime());
    }
    return duration;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>📌 My Tasks</Text>
            <Text style={styles.headerSub}>Manage assigned duties and track working time</Text>
          </View>

          <TouchableOpacity 
            style={styles.createTaskBtn}
            onPress={() => setShowSelfModal(true)}
          >
            <Text style={styles.createTaskBtnText}>+ Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks currently assigned to you.</Text>
          </View>
        ) : (
          tasks.map(task => {
            const isSelfTask = task.assignedBy === currentUser?.id;
            return (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[
                      styles.statusBadge,
                      task.status === 'Completed' ? styles.badgeSuccess :
                      task.isRunning ? styles.badgeProgress : styles.badgePending
                    ]}>
                      <Text style={[
                        styles.statusText,
                        task.status === 'Completed' && { color: '#059669' },
                        task.isRunning && { color: '#2563eb' },
                        task.status !== 'Completed' && !task.isRunning && { color: '#d97706' }
                      ]}>
                        {task.status === 'Completed' ? 'Completed' : task.isRunning ? 'Running' : task.status}
                      </Text>
                    </View>

                    {isSelfTask && task.status !== 'Completed' && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#38bdf8' }]}
                          onPress={() => {
                            setEditTaskId(task.id);
                            setEditTitle(task.title);
                            setEditDesc(task.description || '');
                            setEditStatus(task.status);
                            setEditModalVisible(true);
                          }}
                        >
                          <Text style={styles.smallBtnText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#ef4444' }]}
                          onPress={() => handleDeleteSelfTask(task)}
                        >
                          <Text style={styles.smallBtnText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {task.description ? (
                  <Text style={styles.taskDesc}>{task.description}</Text>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.durationRow}>
                  <Text style={styles.durationLabel}>Time Logged:</Text>
                  <Text style={styles.durationValue}>
                    {formatHMS(calculateTotalDuration(task))}
                  </Text>
                </View>

                {task.attachments && task.attachments.length > 0 && (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>Proof Attachments:</Text>
                    {task.attachments.map((url, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        onPress={() => Linking.openURL(url)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}
                      >
                        <Text style={{ fontSize: 12, color: '#2563eb', textDecorationLine: 'underline' }}>
                          📎 Attachment #{idx + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.actionsRow}>
                  {task.status !== 'Completed' ? (
                    <>
                      {!task.isRunning ? (
                        <TouchableOpacity
                          style={styles.startBtn}
                          onPress={() => handleStart(task.id)}
                        >
                          <Text style={styles.btnTextStart}>▶ Start Timer</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.stopBtn}
                          onPress={() => handleStop(task.id)}
                        >
                          <Text style={styles.btnTextStop}>⏸ Pause Timer</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleCompletePress(task.id)}
                      >
                        <Text style={styles.btnTextComplete}>✓ Complete</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={styles.completedText}>
                      ✓ Completed on {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Complete Task Modal */}
      <Modal
        visible={completeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎉 Complete Task</Text>
            <Text style={styles.modalLabel}>
              Optional: Attach completion proof (screenshots, files, or documents).
            </Text>

            <TouchableOpacity 
              style={styles.fileSelectBtn} 
              onPress={handleSelectFile}
              disabled={uploading}
            >
              <Text style={styles.fileSelectText}>📎 Select Proof Files</Text>
            </TouchableOpacity>

            {selectedFiles.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                {selectedFiles.map((file, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#334155', fontSize: 12, flex: 1 }} numberOfLines={1}>
                      📄 {file.name}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveFile(idx)}>
                      <Text style={{ color: '#dc2626', fontSize: 12, marginLeft: 8 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setCompleteModalVisible(false)}
                disabled={uploading}
              >
                <Text style={{ color: '#64748b', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleSubmitCompletion}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '800' }}>Submit & Finish</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Self Task Modal */}
      <Modal
        visible={showSelfModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSelfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>➕ Create New Task</Text>
            
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Update Client Proposal"
              placeholderTextColor="#94a3b8"
              value={selfTitle}
              onChangeText={setSelfTitle}
            />

            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Task details..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={selfDesc}
              onChangeText={setSelfDesc}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setShowSelfModal(false)}
              >
                <Text style={{ color: '#64748b', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleCreateSelfTask}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Self Task Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Edit Task</Text>
            
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Task title..."
              placeholderTextColor="#94a3b8"
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Task details..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={editDesc}
              onChangeText={setEditDesc}
            />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.pickerContainer}>
              <ScrollView nestedScrollEnabled={true}>
                {['Pending', 'In Progress', 'Completed'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.pickerItem, editStatus === st && styles.pickerItemActive]}
                    onPress={() => setEditStatus(st)}
                  >
                    <Text style={[styles.pickerItemText, editStatus === st && styles.pickerItemTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={{ color: '#64748b', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleEditSelfTask}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>Save</Text>
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
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  scrollContent: {
    padding: 18,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14.5,
    fontStyle: 'italic',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  taskDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  durationValue: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnTextStart: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  stopBtn: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnTextStop: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnTextComplete: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  completedText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  badgeProgress: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  badgeSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalLabel: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  fileSelectBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563eb',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  fileSelectText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  createTaskBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createTaskBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    color: '#0f172a',
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  pickerContainer: {
    height: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 5,
  },
  pickerItem: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: '#2563eb',
  },
  pickerItemText: {
    color: '#475569',
    fontSize: 13,
  },
  pickerItemTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
