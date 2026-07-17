import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Image,
} from 'react-native';
import { getTasks, addTask, getEmployees, subscribe } from '../../store/store';
import { sweetAlert } from '../../utils/sweetAlert';
import { getApiUrl } from '../../utils/api';

export default function ManageTasks() {
  const [tasks, setTasks] = useState(() => getTasks());
  const [employees, setEmployees] = useState(() => getEmployees());
  const [searchQuery, setSearchQuery] = useState("");
  
  // Assign Task Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  // View Task Details Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const unsub = subscribe(() => {
      setTasks(getTasks());
      setEmployees(getEmployees());
    });
    return () => unsub();
  }, []);

  const handleAssignTask = () => {
    if (!title.trim()) {
      sweetAlert('Error', 'Please enter task title');
      return;
    }
    if (!assignedTo) {
      sweetAlert('Error', 'Please select a team member');
      return;
    }

    const emp = employees.find(e => e.id === assignedTo);
    const assignedToName = emp ? emp.name : 'Unknown';

    addTask({
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      assignedToName,
      assignedBy: 'admin',
      assignedByName: 'Admin'
    });

    // Reset fields
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setModalVisible(false);
    sweetAlert('Success', 'Task assigned successfully!');
  };

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const filteredTasks = tasks.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.assignedToName || "").toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* HEADER SEARCH BAR */}
      <View style={styles.headerBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor="#8b949e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Assign</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>📅 Tasks List</Text>
        {filteredTasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks found.</Text>
        ) : (
          filteredTasks.map(t => (
            <TouchableOpacity 
              key={t.id} 
              style={styles.taskCard} 
              onPress={() => {
                setSelectedTask(t);
                setDetailModalVisible(true);
              }}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{t.title}</Text>
                <View style={[styles.statusBadge, t.status === 'Completed' ? styles.badgeSuccess : (t.status === 'In Progress' ? styles.badgeProgress : styles.badgePending)]}>
                  <Text style={styles.statusText}>{t.status}</Text>
                </View>
              </View>
              {t.description ? <Text style={styles.taskDesc} numberOfLines={2}>{t.description}</Text> : null}
              <View style={styles.divider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Assignee:</Text>
                <Text style={styles.metaValue}>{t.assignedToName || 'Unassigned'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Time Spent:</Text>
                <Text style={[styles.metaValue, { color: '#58a6ff', fontWeight: 'bold' }]}>
                  {formatDuration(t.totalDuration || 0)}
                </Text>
              </View>
              {t.fileUrl && (
                <Text style={{ color: '#58a6ff', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
                  📎 Attachment Uploaded (Tap to View)
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* MODAL: ASSIGN TASK */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign New Task</Text>
            
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Test software setup"
              placeholderTextColor="#8b949e"
            />

            <Text style={styles.inputLabel}>Task Description</Text>
            <TextInput
              style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Ensure all dependencies are updated..."
              placeholderTextColor="#8b949e"
              multiline={true}
            />

            <Text style={styles.inputLabel}>Assign to Employee</Text>
            <View style={styles.pickerContainer}>
              <ScrollView nestedScrollEnabled={true}>
                {employees.filter(e => e.role !== "Admin" && e.role !== "Management").map(emp => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[styles.pickerItem, assignedTo === emp.id && styles.pickerItemActive]}
                    onPress={() => setAssignedTo(emp.id)}
                  >
                    <Text style={[styles.pickerItemText, assignedTo === emp.id && styles.pickerItemTextActive]}>
                      {emp.name} ({emp.department})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#c9d1d9', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAssignTask}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: VIEW TASK DETAILS */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setDetailModalVisible(false); setSelectedTask(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Task Details</Text>
                
                <Text style={{ color: '#58a6ff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 }}>
                  {selectedTask.title}
                </Text>
                <Text style={{ color: '#8b949e', fontSize: 13, lineHeight: 18, marginBottom: 15 }}>
                  {selectedTask.description || 'No description provided.'}
                </Text>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Status:</Text>
                  <Text style={[styles.metaValue, { fontWeight: 'bold', color: selectedTask.status === 'Completed' ? '#3fb950' : (selectedTask.status === 'In Progress' ? '#58a6ff' : '#d29922') }]}>
                    {selectedTask.status}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Time Spent:</Text>
                  <Text style={[styles.metaValue, { color: '#58a6ff', fontWeight: 'bold' }]}>
                    {formatDuration(selectedTask.totalDuration || 0)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Assignee:</Text>
                  <Text style={styles.metaValue}>{selectedTask.assignedToName || 'Unassigned'}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Assigned By:</Text>
                  <Text style={styles.metaValue}>{selectedTask.assignedByName || 'System'}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Created:</Text>
                  <Text style={styles.metaValue}>
                    {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString() : 'N/A'}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Completed:</Text>
                  <Text style={styles.metaValue}>
                    {selectedTask.completedAt ? new Date(selectedTask.completedAt).toLocaleString() : 'N/A'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <Text style={{ color: '#f0f6fc', fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>
                  Attachments & Uploads
                </Text>

                {selectedTask.fileUrl ? (() => {
                  let urls = [];
                  try {
                    if (selectedTask.fileUrl.startsWith('[')) {
                      urls = JSON.parse(selectedTask.fileUrl);
                    } else {
                      urls = [selectedTask.fileUrl];
                    }
                  } catch (e) {
                    urls = [selectedTask.fileUrl];
                  }

                  return (
                    <View style={{ gap: 12 }}>
                      {urls.map((url, idx) => {
                        const fileAddress = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
                        const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url);
                        return (
                          <View key={idx} style={styles.attachmentCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                              <Text style={{ color: '#8b949e', fontSize: 12 }}>File #{idx + 1}</Text>
                              <TouchableOpacity onPress={() => Linking.openURL(fileAddress)}>
                                <Text style={{ color: '#58a6ff', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                                  Open
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {isImage ? (
                              <Image 
                                source={{ uri: fileAddress }} 
                                style={{ width: '100%', height: 140, borderRadius: 6, resizeMode: 'cover', marginTop: 4 }} 
                                alt="Proof"
                              />
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: '#0d1117', borderRadius: 4 }}>
                                <Text style={{ fontSize: 18 }}>📄</Text>
                                <Text style={{ color: '#8b949e', fontSize: 11, flex: 1 }} numberOfLines={1}>
                                  {url.split('/').pop()}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })() : (
                  <Text style={{ color: '#8b949e', fontSize: 12, fontStyle: 'italic' }}>
                    No attachments uploaded for this task.
                  </Text>
                )}

                <TouchableOpacity 
                  style={[styles.cancelBtn, { marginTop: 20, alignSelf: 'flex-end', width: '100%', alignItems: 'center' }]} 
                  onPress={() => { setDetailModalVisible(false); setSelectedTask(null); }}
                >
                  <Text style={{ color: '#c9d1d9', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  headerBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#f0f6fc',
  },
  addBtn: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c9d1d9',
    marginBottom: 15,
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 20,
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
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    width: 100,
    color: '#8b949e',
    fontSize: 13,
  },
  metaValue: {
    flex: 1,
    color: '#c9d1d9',
    fontSize: 13,
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#f0f6fc',
  },
  pickerContainer: {
    height: 120,
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    backgroundColor: '#0d1117',
    padding: 5,
  },
  pickerItem: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: '#1f6feb',
  },
  pickerItemText: {
    color: '#c9d1d9',
    fontSize: 13,
  },
  pickerItemTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
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
  attachmentCard: {
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#21262d',
  },
});
