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
} from 'react-native';
import { getTasks, addTask, startTask, stopTask, completeTask, subscribe } from '../../store/store';
import { pick } from '@react-native-documents/picker';
import { getApiUrl } from '../../utils/api';

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

  const loadData = () => {
    setTasks(getTasks().filter(t => t.assignedTo === currentUser?.id));
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
        type: ['*/*'], // Accept all file formats
        allowMultiSelection: true
      });
      if (selected && selected.length > 0) {
        setSelectedFiles(selected);
      }
    } catch (err) {
      console.log('Picker cancelled/failed', err);
    }
  };

  const handleSubmitCompletion = async () => {
    let uploadedUrl = null;
    if (selectedFiles && selectedFiles.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', {
            uri: file.uri,
            name: file.name || 'attachment',
            type: file.type || 'application/octet-stream'
          });
        });

        const uploadRes = await fetch(`${getApiUrl()}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success) {
          uploadedUrl = JSON.stringify(uploadData.fileUrls);
        } else {
          Alert.alert('Upload Failed', uploadData.error || 'Failed to upload work files.');
          setUploading(false);
          return;
        }
      } catch (err) {
        Alert.alert('Upload Error', err.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    completeTask(activeCompletingId, currentUser.name, uploadedUrl);
    setSelectedFiles([]);
    setActiveCompletingId(null);
    setCompleteModalVisible(false);
    Alert.alert('Completed', 'Task marked as completed successfully!');
  };

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.headerTitle}>📅 My Tasks</Text>
            <Text style={styles.headerSub}>Track and manage your work hours</Text>
          </View>
          <TouchableOpacity 
            style={styles.createTaskBtn} 
            onPress={() => setShowSelfModal(true)}
          >
            <Text style={styles.createTaskBtnText}>+ Create Self Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks assigned to you yet.</Text>
          </View>
        ) : (
          tasks.map(t => {
            let displayDuration = t.totalDuration || 0;
            if (t.status === 'In Progress' && t.startedAt) {
              const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
              displayDuration += Math.max(0, elapsed);
            }

            return (
              <View key={t.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <View style={[styles.statusBadge, t.status === 'Completed' ? styles.badgeSuccess : (t.status === 'In Progress' ? styles.badgeProgress : styles.badgePending)]}>
                    <Text style={styles.statusText}>{t.status}</Text>
                  </View>
                </View>
                
                {t.description ? <Text style={styles.taskDesc}>{t.description}</Text> : null}
                
                <View style={styles.divider} />
                
                <View style={styles.durationRow}>
                  <Text style={styles.durationLabel}>Time Worked:</Text>
                  <Text style={styles.durationValue}>{formatDuration(displayDuration)}</Text>
                </View>

                {t.fileUrl && (() => {
                  let urls = [];
                  try {
                    if (t.fileUrl.startsWith('[')) {
                      urls = JSON.parse(t.fileUrl);
                    } else {
                      urls = [t.fileUrl];
                    }
                  } catch (e) {
                    urls = [t.fileUrl];
                  }

                  return (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ color: '#8b949e', fontSize: 12 }}>📎 Attachments ({urls.length}):</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                        {urls.map((url, idx) => (
                          <TouchableOpacity 
                            key={idx}
                            onPress={() => Linking.openURL(url.startsWith('http') ? url : `${getApiUrl()}${url}`)}
                          >
                            <Text style={{ color: '#58a6ff', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                              File {urls.length > 1 ? `#${idx + 1}` : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })()}

                <View style={styles.actionsRow}>
                  {t.status === 'Pending' && (
                    <TouchableOpacity style={styles.startBtn} onPress={() => handleStart(t.id)}>
                      <Text style={styles.btnText}>▶️ Start Work</Text>
                    </TouchableOpacity>
                  )}
                  {t.status === 'In Progress' && (
                    <>
                      <TouchableOpacity style={styles.stopBtn} onPress={() => handleStop(t.id)}>
                        <Text style={styles.btnText}>⏸️ Stop Work</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.completeBtn} 
                        onPress={() => handleCompletePress(t.id)}
                      >
                        <Text style={styles.btnText}>✅ Complete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {t.status === 'Completed' && (
                    <Text style={styles.completedText}>
                      Completed at {t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : 'N/A'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL: TASK COMPLETION FILE UPLOAD */}
      <Modal
        visible={completeModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Work & Upload Proof</Text>
            <Text style={styles.modalLabel}>
              You can select and upload multiple files/images of any format to submit as proof of completion for this task.
            </Text>

            <TouchableOpacity style={styles.fileSelectBtn} onPress={handleSelectFile} disabled={uploading}>
              <Text style={styles.fileSelectText}>
                {selectedFiles.length > 0 ? `📎 ${selectedFiles.length} files selected` : '📁 Choose Files / Take Photos'}
              </Text>
            </TouchableOpacity>

            {selectedFiles.length > 0 && (
              <ScrollView style={{ maxHeight: 80, marginBottom: 15 }}>
                {selectedFiles.map((file, idx) => (
                  <Text key={idx} style={{ color: '#8b949e', fontSize: 12, marginBottom: 3 }}>
                    - {file.name}
                  </Text>
                ))}
              </ScrollView>
            )}

            {uploading ? (
              <View style={{ marginVertical: 15, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#58a6ff" />
                <Text style={{ color: '#8b949e', fontSize: 12, marginTop: 6 }}>Uploading attachment...</Text>
              </View>
            ) : null}

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setCompleteModalVisible(false)} 
                disabled={uploading}
              >
                <Text style={{ color: '#c9d1d9', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleSubmitCompletion}
                disabled={uploading}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit & Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal: Create Self Task */}
      <Modal
        visible={showSelfModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSelfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Self Task</Text>
            <Text style={styles.modalLabel}>
              Enter the title and description to assign a new task to yourself.
            </Text>
            
            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Code Review & Testing"
              placeholderTextColor="#8b949e"
              value={selfTitle}
              onChangeText={setSelfTitle}
            />
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Provide context or description of the task..."
              placeholderTextColor="#8b949e"
              multiline={true}
              value={selfDesc}
              onChangeText={setSelfDesc}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setShowSelfModal(false)}
              >
                <Text style={{ color: '#c9d1d9', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleCreateSelfTask}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Create</Text>
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
    backgroundColor: '#0d1117',
  },
  header: {
    padding: 20,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderColor: '#30363d',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  headerSub: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 4,
  },
  scrollContent: {
    padding: 15,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8b949e',
    fontSize: 15,
  },
  taskCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f0f6fc',
    flex: 1,
    marginRight: 10,
  },
  taskDesc: {
    fontSize: 13,
    color: '#8b949e',
    lineHeight: 18,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 8,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationLabel: {
    color: '#8b949e',
    fontSize: 13,
  },
  durationValue: {
    color: '#58a6ff',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#58a6ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  stopBtn: {
    backgroundColor: 'rgba(240, 136, 62, 0.15)',
    borderWidth: 1,
    borderColor: '#f0883e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  completeBtn: {
    backgroundColor: 'rgba(56, 139, 60, 0.15)',
    borderWidth: 1,
    borderColor: '#3fb950',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnText: {
    color: '#f0f6fc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  completedText: {
    color: '#8b949e',
    fontSize: 12,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: 'rgba(210, 153, 34, 0.15)',
    borderColor: '#d29922',
  },
  badgeProgress: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    borderColor: '#58a6ff',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(56, 139, 60, 0.15)',
    borderColor: '#3fb950',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalLabel: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  fileSelectBtn: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#58a6ff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  fileSelectText: {
    color: '#58a6ff',
    fontWeight: 'bold',
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
    borderRadius: 8,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#238636',
  },
  createTaskBtn: {
    backgroundColor: '#238636',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createTaskBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    color: '#c9d1d9',
    padding: 10,
    fontSize: 14,
    marginBottom: 16,
  },
});
