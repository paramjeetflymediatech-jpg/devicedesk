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
  RefreshControl,
} from 'react-native';
import { getTasks, addTask, updateTask, deleteTask, startTask, stopTask, completeTask, subscribe, syncWithServer } from '../../store/store';
import { pickFilesOrPhotos } from '../../utils/filePicker';
import { getApiUrl, fetchClientRequestsApi, updateTaskStatusApi } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import GoogleDriveBadge from '../../components/GoogleDriveBadge';

export default function EmployeeTasks({ currentUser }) {
  const { isDark, themeColors } = useTheme();
  const styles = getStyles(themeColors, isDark);
  const [tasks, setTasks] = useState(() => getTasks().filter(t => t.assignedTo === currentUser?.id));
  const [clientRequests, setClientRequests] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  // View Task & Client Request Details modal states
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedLinkedRequest, setSelectedLinkedRequest] = useState(null);

  const resolveMediaUrl = (url) => {
    if (!url) return '';
    const trimmed = `${url}`.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('file://')
    ) {
      return trimmed;
    }
    const apiBase = (getApiUrl() || '').replace(/\/+$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${apiBase}${cleanPath}`;
  };

  const parseAttachments = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map((v) => resolveMediaUrl(v)).filter(Boolean);
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((v) => resolveMediaUrl(v)).filter(Boolean);
          }
        } catch (e) {}
      }
      if (trimmed.includes(',')) {
        return trimmed.split(',').map((s) => resolveMediaUrl(s.trim())).filter(Boolean);
      }
      return [resolveMediaUrl(trimmed)].filter(Boolean);
    }
    return [];
  };

  const getClientAttachments = (task, linkedReq) => {
    const combined = [];
    if (linkedReq) {
      if (linkedReq.attachment) combined.push(linkedReq.attachment);
      if (linkedReq.attachments) combined.push(linkedReq.attachments);
      if (linkedReq.fileUrl) combined.push(linkedReq.fileUrl);
      if (linkedReq.file_url) combined.push(linkedReq.file_url);
      if (linkedReq.files) combined.push(linkedReq.files);
    }
    if (task) {
      if (task.client_attachment) combined.push(task.client_attachment);
      if (task.client_attachments) combined.push(task.client_attachments);
      if (task.attachment) combined.push(task.attachment);
      if (task.attachments && Array.isArray(task.attachments) && !task.completedAt) {
        combined.push(...task.attachments);
      }
      if (task.fileUrl && !task.completedAt) combined.push(task.fileUrl);
    }

    const allParsed = [];
    combined.forEach(val => {
      const list = parseAttachments(val);
      list.forEach(url => {
        if (url && !allParsed.includes(url)) {
          allParsed.push(url);
        }
      });
    });
    return allParsed;
  };

  const handleOpenAttachment = (url) => {
    if (!url) {
      sweetAlert({ title: 'Attachment Missing', text: 'No attachment found for this item.', type: 'info' });
      return;
    }
    const resolved = resolveMediaUrl(url);
    Linking.openURL(resolved).catch(() => {
      Alert.alert('Error', 'Could not open attachment URL: ' + resolved);
    });
  };

  const loadClientRequests = async () => {
    try {
      const res = await fetchClientRequestsApi();
      if (res && (res.data || Array.isArray(res))) {
        setClientRequests(res.data || res || []);
      }
    } catch (e) {
      console.log('Failed to fetch client requests in employee tasks:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await syncWithServer();
    await loadClientRequests();
    setTasks(getTasks().filter(t => t.assignedTo === currentUser?.id));
    setRefreshing(false);
  };

  const handleOpenDetails = async (task) => {
    setSelectedTask(task);
    
    // 1. Check existing in-memory cache
    let allReqs = clientRequests || [];
    let linked = allReqs.find(r => 
      task.project_id && (String(r.id) === String(task.project_id) || String(r._id) === String(task.project_id))
    ) || null;

    setSelectedLinkedRequest(linked);
    setDetailsModalVisible(true);

    // 2. Fetch fresh requests in background to guarantee attachments are always retrieved
    try {
      const res = await fetchClientRequestsApi();
      const freshReqs = res?.data || res || [];
      if (Array.isArray(freshReqs) && freshReqs.length > 0) {
        setClientRequests(freshReqs);
        const freshLinked = freshReqs.find(r => 
          task.project_id && (String(r.id) === String(task.project_id) || String(r._id) === String(task.project_id))
        ) || null;
        if (freshLinked) {
          setSelectedLinkedRequest(freshLinked);
        }
      }
    } catch (e) {
      console.log('Error fetching fresh client requests on view details:', e);
    }
  };

  // Task completion modal states
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [activeCompletingId, setActiveCompletingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [completionNote, setCompletionNote] = useState('');
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
    let isMounted = true;
    fetchClientRequestsApi()
      .then((res) => {
        if (isMounted && res && (res.data || Array.isArray(res))) {
          setClientRequests(res.data || res || []);
        }
      })
      .catch((e) => {
        console.log('Failed to fetch client requests in employee tasks:', e);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const currentTasks = getTasks().filter(t => t.assignedTo === currentUser?.id);
      setTasks(currentTasks);
      if (selectedTask) {
        const updated = currentTasks.find(t => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      }
    });
    
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [currentUser, selectedTask]);

  const handleStart = async (taskId) => {
    startTask(taskId, currentUser.name);
    setTasks(getTasks().filter(t => t.assignedTo === currentUser?.id));
    try {
      await updateTaskStatusApi(taskId, 'In Progress');
    } catch (e) {
      console.log('Error updating task status on server:', e);
    }
  };

  const handleStop = async (taskId) => {
    stopTask(taskId, currentUser.name);
    setTasks(getTasks().filter(t => t.assignedTo === currentUser?.id));
    try {
      await updateTaskStatusApi(taskId, 'Pending');
    } catch (e) {
      console.log('Error updating task status on server:', e);
    }
  };

  const handleCompletePress = (taskId) => {
    setActiveCompletingId(taskId);
    setSelectedFiles([]);
    setCompletionNote('');
    setCompleteModalVisible(true);
  };

  const handleSelectFile = async () => {
    try {
      const selected = await pickFilesOrPhotos({
        allowMultiSelection: true,
        includeCamera: true,
      });
      if (selected && selected.length > 0) {
        setSelectedFiles(prev => [...prev, ...selected]);
      }
    } catch (err) {
      console.log('File selection error:', err);
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
            'x-user-id': String(currentUser?.id || '')
          }
        });

        const data = await res.json();
        if (res.ok && data.success) {
          uploadedUrls = data.fileUrls || [];
        } else {
          throw new Error(data.message || 'Failed to upload attachment files.');
        }
      }

      const noteVal = completionNote.trim();

      // Complete in local store
      completeTask(activeCompletingId, currentUser.name, uploadedUrls, noteVal);

      // Sync status with backend
      try {
        await updateTaskStatusApi(activeCompletingId, 'Completed', uploadedUrls, noteVal);
      } catch (e) {
        console.log('Error syncing task completion with server:', e);
      }

      setTasks(getTasks().filter(t => t.assignedTo === currentUser?.id));
      setCompleteModalVisible(false);
      setActiveCompletingId(null);
      setSelectedFiles([]);
      setCompletionNote('');
      sweetAlert({
        title: 'Success',
        text: 'Task marked as completed successfully!',
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

  const isTaskRunning = (task) => {
    if (!task) return false;
    return !!(task.isRunning || (task.status === 'In Progress' && !!task.startedAt));
  };

  const isTaskStarted = (task) => {
    if (!task) return false;
    const running = isTaskRunning(task);
    const hasWorked = !!(
      task.startedAt || 
      task.lastStartedAt || 
      (task.totalDuration && task.totalDuration > 0) || 
      (task.accumulatedTime && task.accumulatedTime > 0)
    );
    return running || hasWorked || task.status === 'In Progress';
  };

  const calculateTotalDuration = (task) => {
    if (!task) return 0;
    let duration = (task.accumulatedTime || (task.totalDuration ? task.totalDuration * 1000 : 0)) || 0;
    const startTimestamp = task.lastStartedAt || task.startedAt;
    if (isTaskRunning(task) && startTimestamp) {
      duration += Math.max(0, now - new Date(startTimestamp).getTime());
    }
    return duration;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Modern Executive Header */}
      <View style={[styles.header, { backgroundColor: themeColors.headerBg, borderColor: themeColors.borderLight || themeColors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIconSquircle}>
                <AppIcon name="tasks" size={18} color="#ffffff" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>My Tasks</Text>
                <Text style={[styles.headerSub, { color: themeColors.textSecondary }]}>
                  {tasks.filter(t => t.status !== 'Completed').length} active • {tasks.filter(t => t.status === 'Completed').length} completed
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.createTaskBtn}
            onPress={() => setShowSelfModal(true)}
            activeOpacity={0.82}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <AppIcon name="plus" size={13} color="#ffffff" />
              <Text style={styles.createTaskBtnText}>New Task</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
      >
        {tasks.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: themeColors.cardBg, borderColor: themeColors.borderLight || themeColors.border }]}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="check" size={24} color={themeColors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>All Caught Up</Text>
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No pending tasks currently assigned to your sprint.</Text>
            <TouchableOpacity 
              style={[styles.emptyActionBtn, { borderColor: themeColors.borderLight || themeColors.border }]}
              onPress={() => setShowSelfModal(true)}
            >
              <Text style={[styles.emptyActionBtnText, { color: themeColors.primary || '#3b82f6' }]}>+ Create Self Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tasks.map(task => {
            const isSelfTask = task.assignedBy === currentUser?.id;
            const isClientRequestTask = !!(
              task.project_id || 
              (task.title && task.title.toLowerCase().startsWith('client request:')) ||
              (task.assignedByName && task.assignedByName.toLowerCase().includes('leader')) ||
              task.client_attachment
            );

            const matchingReq = (clientRequests || []).find(r => 
              task.project_id && (String(r.id) === String(task.project_id) || String(r._id) === String(task.project_id))
            );
            const cardClientFiles = getClientAttachments(task, matchingReq);
            const running = isTaskRunning(task);

            return (
              <View 
                key={task.id} 
                style={[
                  styles.taskCard, 
                  { 
                    backgroundColor: themeColors.cardBg, 
                    borderColor: running ? (themeColors.primary || '#3b82f6') : (themeColors.borderLight || themeColors.border) 
                  },
                  running && styles.taskCardRunning
                ]}
              >
                <View style={styles.taskHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.taskTitle, { color: themeColors.textPrimary }]}>{task.title}</Text>
                    {isClientRequestTask ? (
                      <View style={[styles.clientRequestPill, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.14)' : '#f3e8ff', borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : '#e9d5ff' }]}>
                        <AppIcon name="users" size={11} color={isDark ? '#c084fc' : '#7c3aed'} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#c084fc' : '#7c3aed' }}>
                          Client Request {task.assignedByName ? `• ${task.assignedByName}` : ''}
                        </Text>
                      </View>
                    ) : task.assignedByName && !isSelfTask ? (
                      <Text style={[styles.assignedByText, { color: themeColors.textSecondary }]}>
                        Assigned by {task.assignedByName}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[
                      styles.statusPill,
                      task.status === 'Completed' ? styles.statusPillSuccess :
                      running ? styles.statusPillRunning : styles.statusPillPending
                    ]}>
                      <View style={[
                        styles.statusDot,
                        task.status === 'Completed' ? { backgroundColor: '#10b981' } :
                        running ? { backgroundColor: '#3b82f6' } : { backgroundColor: '#f59e0b' }
                      ]} />
                      <Text style={[
                        styles.statusPillText,
                        task.status === 'Completed' && { color: isDark ? '#34d399' : '#059669' },
                        running && { color: isDark ? '#60a5fa' : '#2563eb' },
                        task.status !== 'Completed' && !running && { color: isDark ? '#fbbf24' : '#d97706' }
                      ]}>
                        {task.status === 'Completed' ? 'Completed' : running ? 'In Progress' : task.status}
                      </Text>
                    </View>

                    {isSelfTask && task.status !== 'Completed' && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe', borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd', borderWidth: 1 }]}
                          onPress={() => {
                            setEditTaskId(task.id);
                            setEditTitle(task.title);
                            setEditDesc(task.description || '');
                            setEditStatus(task.status);
                            setEditModalVisible(true);
                          }}
                        >
                          <AppIcon name="edit" size={13} color={isDark ? '#38bdf8' : '#0284c7'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca', borderWidth: 1 }]}
                          onPress={() => handleDeleteSelfTask(task)}
                        >
                          <AppIcon name="trash" size={13} color={isDark ? '#f87171' : '#dc2626'} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {task.description ? (
                  <Text style={[styles.taskDesc, { color: themeColors.textSecondary }]} numberOfLines={3}>{task.description}</Text>
                ) : null}

                {/* Detected Google Drive Requirement Folder - ONLY visible to Admin and assigned Team Leader */}
                {(currentUser?.role === 'Admin' || currentUser?.role === 'Management' || (matchingReq && String(matchingReq.assigned_tl_id) === String(currentUser?.id))) && (
                  <GoogleDriveBadge source={[task, matchingReq]} isDark={isDark} themeColors={themeColors} />
                )}

                {/* Client attachments badge on card if present */}
                {cardClientFiles.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.attachmentBadge, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.14)' : '#f5f3ff', borderColor: isDark ? 'rgba(124, 58, 237, 0.35)' : '#ddd6fe' }]}
                    onPress={() => handleOpenDetails(task)}
                    activeOpacity={0.8}
                  >
                    <AppIcon name="paperclip" size={12} color={isDark ? '#c4b5fd' : '#6d28d9'} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#c4b5fd' : '#6d28d9' }}>
                      {cardClientFiles.length} Client Attachment{cardClientFiles.length > 1 ? 's' : ''} • Tap to Preview
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Time Logged Executive Capsule */}
                <View style={[styles.durationCapsule, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc', borderColor: themeColors.borderLight || themeColors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="clock" size={13} color={running ? (themeColors.primary || '#3b82f6') : themeColors.textSecondary} />
                    <Text style={[styles.durationCapsuleLabel, { color: themeColors.textSecondary }]}>Time Logged</Text>
                  </View>
                  <Text style={[
                    styles.durationCapsuleValue, 
                    { color: running ? (themeColors.primary || '#3b82f6') : themeColors.textPrimary }
                  ]}>
                    {formatHMS(calculateTotalDuration(task))}
                  </Text>
                </View>

                {task.attachments && task.attachments.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.attachmentHeaderLabel, { color: themeColors.textSecondary }]}>Proof Attachments:</Text>
                    {task.attachments.map((url, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        onPress={() => handleOpenAttachment(url)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2, gap: 5 }}
                      >
                        <AppIcon name="paperclip" size={13} color={isDark ? '#60a5fa' : '#2563eb'} />
                        <Text style={{ fontSize: 12, color: isDark ? '#60a5fa' : '#2563eb', textDecorationLine: 'underline' }}>
                          Attachment #{idx + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Card Actions Container */}
                <View style={styles.cardActionsContainer}>
                  <TouchableOpacity
                    style={[styles.viewDetailsBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9', borderColor: themeColors.borderLight || themeColors.border }]}
                    onPress={() => handleOpenDetails(task)}
                    activeOpacity={0.78}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <AppIcon name="eye" size={13} color={themeColors.textSecondary} />
                      <Text style={[styles.btnTextViewDetails, { color: themeColors.textPrimary }]}>Details</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.actionsRow}>
                    {task.status !== 'Completed' ? (
                      <>
                        {!running ? (
                          <TouchableOpacity
                            style={[styles.actionBtnPrimary, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff', borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe' }]}
                            onPress={() => handleStart(task.id)}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <AppIcon name="play" size={12} color={isDark ? '#60a5fa' : '#2563eb'} />
                              <Text style={[styles.actionBtnPrimaryText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
                                {isTaskStarted(task) ? 'Resume' : 'Start'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtnWarning, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb', borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a' }]}
                            onPress={() => handleStop(task.id)}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <AppIcon name="pause" size={12} color={isDark ? '#fbbf24' : '#d97706'} />
                              <Text style={[styles.actionBtnWarningText, { color: isDark ? '#fbbf24' : '#d97706' }]}>Pause</Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        {isTaskStarted(task) && (
                          <TouchableOpacity
                            style={[styles.actionBtnSuccess, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5', borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0' }]}
                            onPress={() => handleCompletePress(task.id)}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <AppIcon name="check" size={12} color={isDark ? '#34d399' : '#059669'} />
                              <Text style={[styles.actionBtnSuccessText, { color: isDark ? '#34d399' : '#059669' }]}>Complete</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <View style={[styles.completedBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5', borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0' }]}>
                        <AppIcon name="check" size={12} color={isDark ? '#34d399' : '#059669'} />
                        <Text style={[styles.completedBadgeText, { color: isDark ? '#34d399' : '#059669' }]}>
                          Done {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Task & Client Request Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailsModalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            {/* Modal Header */}
            <View style={[styles.detailsModalHeader, { borderBottomColor: themeColors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <AppIcon name="file-text" size={20} color={isDark ? '#60a5fa' : '#2563eb'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailsModalTitle, { color: themeColors.textPrimary }]}>
                    Task & Request Details
                  </Text>
                  <Text style={[styles.detailsModalSub, { color: themeColors.textSecondary }]}>
                    {selectedLinkedRequest ? 'Delegated Client Service Request' : 'Assigned Task Information'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.closeIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }]}
                onPress={() => setDetailsModalVisible(false)}
              >
                <AppIcon name="x" size={18} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable details */}
            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 14 }}>
                {/* Title and Status Banner */}
                <View style={[styles.infoBannerCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#bfdbfe' }]}>
                  <Text style={[styles.taskDetailTitle, { color: themeColors.textPrimary }]}>{selectedTask.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={[
                      styles.statusBadge,
                      selectedTask.status === 'Completed' ? styles.badgeSuccess :
                      selectedTask.isRunning ? styles.badgeProgress : styles.badgePending
                    ]}>
                      <Text style={[
                        styles.statusText,
                        selectedTask.status === 'Completed' && { color: isDark ? '#34d399' : '#059669' },
                        selectedTask.isRunning && { color: isDark ? '#60a5fa' : '#2563eb' },
                        selectedTask.status !== 'Completed' && !selectedTask.isRunning && { color: isDark ? '#fbbf24' : '#d97706' }
                      ]}>
                        {selectedTask.status === 'Completed' ? 'Completed' : selectedTask.isRunning ? 'Active / Running' : selectedTask.status}
                      </Text>
                    </View>

                    <View style={[styles.timeChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff' }]}>
                      <AppIcon name="clock" size={13} color={isDark ? '#60a5fa' : '#2563eb'} />
                      <Text style={[styles.timeChipText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
                        {formatHMS(calculateTotalDuration(selectedTask))}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Assignment Meta Details */}
                <View style={[styles.sectionCard, { backgroundColor: isDark ? themeColors.background : '#f8fafc', borderColor: themeColors.border }]}>
                  <Text style={[styles.sectionCardHeader, { color: themeColors.textPrimary }]}>Assignment Info</Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>Assigned By:</Text>
                    <Text style={[styles.metaValue, { color: themeColors.textPrimary }]}>
                      {selectedTask.assignedByName || (selectedTask.assignedBy === currentUser?.id ? 'Self' : 'Team Leader / Admin')}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>Assigned To:</Text>
                    <Text style={[styles.metaValue, { color: themeColors.textPrimary }]}>
                      {selectedTask.assignedToName || currentUser?.name || 'Employee'}
                    </Text>
                  </View>

                  {selectedTask.completedAt && (
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>Completed On:</Text>
                      <Text style={[styles.metaValue, { color: '#059669' }]}>
                        {new Date(selectedTask.completedAt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Task Instructions & TL Note */}
                <View style={[styles.sectionCard, { backgroundColor: isDark ? themeColors.background : '#f8fafc', borderColor: themeColors.border }]}>
                  <Text style={[styles.sectionCardHeader, { color: themeColors.textPrimary }]}>Task Description & Notes</Text>
                  <Text style={[styles.sectionBodyText, { color: themeColors.textPrimary }]}>
                    {selectedTask.description || 'No additional task instructions provided.'}
                  </Text>
                </View>

                {/* Linked Client Request & Client Attachments Section */}
                {(() => {
                  const clientFiles = getClientAttachments(selectedTask, selectedLinkedRequest);
                  const isClientReq = !!(
                    selectedLinkedRequest ||
                    (selectedTask.title && selectedTask.title.toLowerCase().includes('client request')) ||
                    selectedTask.project_id ||
                    selectedTask.client_attachment ||
                    clientFiles.length > 0
                  );

                  if (!isClientReq && clientFiles.length === 0) return null;

                  const clientName = selectedLinkedRequest?.company_name || selectedLinkedRequest?.client_name || selectedTask.client_name || 'Client';
                  const serviceType = selectedLinkedRequest?.service_type || selectedTask.client_service_type || (selectedTask.title ? selectedTask.title.replace(/^Client Request:\s*/i, '') : 'Service Request');
                  const reqStatus = selectedLinkedRequest?.status || 'Assigned';
                  const targetDate = selectedLinkedRequest?.target_date || selectedLinkedRequest?.due_date || null;
                  const requirements = selectedLinkedRequest?.requirements || selectedTask.client_requirements || null;

                  return (
                    <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.08)' : '#f5f3ff', borderColor: isDark ? 'rgba(124, 58, 237, 0.25)' : '#ddd6fe' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <AppIcon name="users" size={16} color={isDark ? '#a78bfa' : '#7c3aed'} />
                        <Text style={[styles.sectionCardHeader, { color: isDark ? '#c4b5fd' : '#6d28d9', marginBottom: 0 }]}>
                          Original Client Request & Attachments
                        </Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>Client / Company:</Text>
                        <Text style={[styles.metaValue, { color: themeColors.textPrimary }]}>
                          {clientName}
                        </Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>Service Type:</Text>
                        <Text style={[styles.metaValue, { color: isDark ? '#a78bfa' : '#7c3aed', fontWeight: '700' }]}>
                          {serviceType}
                        </Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>Request Status:</Text>
                        <Text style={[styles.metaValue, { color: themeColors.textPrimary }]}>
                          {reqStatus}
                        </Text>
                      </View>

                      {targetDate ? (
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>Target Date:</Text>
                          <Text style={[styles.metaValue, { color: themeColors.textPrimary }]}>
                            {targetDate}
                          </Text>
                        </View>
                      ) : null}

                      {requirements ? (
                        <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                          <Text style={[styles.metaLabel, { color: themeColors.textSecondary, marginBottom: 4 }]}>Client Requirements:</Text>
                          <Text style={[styles.sectionBodyText, { color: themeColors.textPrimary }]}>
                            {requirements}
                          </Text>
                        </View>
                      ) : null}

                      {/* Detected Google Drive Folder in Task Details Modal - ONLY visible to Admin and assigned Team Leader */}
                      {(currentUser?.role === 'Admin' || currentUser?.role === 'Management' || (selectedLinkedRequest && String(selectedLinkedRequest.assigned_tl_id) === String(currentUser?.id))) && (
                        <GoogleDriveBadge source={[selectedTask, selectedLinkedRequest]} isDark={isDark} themeColors={themeColors} />
                      )}

                      {/* Client Attached Files */}
                      <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                        <Text style={[styles.metaLabel, { color: themeColors.textSecondary, marginBottom: 8, fontWeight: '700' }]}>
                          📎 Client Attachments ({clientFiles.length}):
                        </Text>
                        {clientFiles.length === 0 ? (
                          <Text style={{ fontSize: 12, color: themeColors.textSecondary, fontStyle: 'italic' }}>
                            No files attached with this request.
                          </Text>
                        ) : (
                          <View style={{ flexDirection: 'column', gap: 8 }}>
                            {clientFiles.map((fileUrl, fIdx) => {
                              const fileName = fileUrl.split('/').pop().split('?')[0] || `Client_Attachment_${fIdx + 1}`;
                              return (
                                <TouchableOpacity
                                  key={fIdx}
                                  style={[styles.attachmentCardRow, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#ede9fe', borderColor: isDark ? '#7c3aed' : '#c4b5fd' }]}
                                  onPress={() => handleOpenAttachment(fileUrl)}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                    <AppIcon name="paperclip" size={16} color={isDark ? '#c4b5fd' : '#6d28d9'} />
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.attachmentChipText, { color: isDark ? '#c4b5fd' : '#6d28d9' }]} numberOfLines={1}>
                                        {fileName}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: isDark ? '#a78bfa' : '#7c3aed', marginTop: 1 }}>
                                        Tap to View / Download
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={[styles.openBadge, { backgroundColor: isDark ? '#7c3aed' : '#6d28d9' }]}>
                                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>Open ↗</Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })()}

                {/* Submitted Proof Attachments */}
                {selectedTask.completedAt && selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <View style={[styles.sectionCard, { backgroundColor: isDark ? themeColors.background : '#f8fafc', borderColor: themeColors.border }]}>
                    <Text style={[styles.sectionCardHeader, { color: themeColors.textPrimary }]}>Task Completion Proofs</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {selectedTask.attachments.map((proofUrl, pIdx) => (
                        <TouchableOpacity
                          key={pIdx}
                          style={[styles.attachmentChip, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', borderColor: isDark ? '#3b82f6' : '#bfdbfe' }]}
                          onPress={() => handleOpenAttachment(proofUrl)}
                        >
                          <AppIcon name="paperclip" size={14} color={isDark ? '#60a5fa' : '#2563eb'} />
                          <Text style={[styles.attachmentChipText, { color: isDark ? '#60a5fa' : '#2563eb' }]} numberOfLines={1}>
                            📄 Proof #{pIdx + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Modal Footer Actions */}
            <View style={[styles.detailsModalFooter, { borderTopColor: themeColors.border }]}>
              {selectedTask && selectedTask.status !== 'Completed' ? (
                <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                  {!isTaskRunning(selectedTask) ? (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe' }]}
                      onPress={() => handleStart(selectedTask.id)}
                    >
                      <AppIcon name="play" size={14} color={isDark ? '#60a5fa' : '#2563eb'} />
                      <Text style={[styles.modalActionBtnText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
                        {isTaskStarted(selectedTask) ? 'Resume Timer' : 'Start Timer'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a' }]}
                      onPress={() => handleStop(selectedTask.id)}
                    >
                      <AppIcon name="pause" size={14} color={isDark ? '#fbbf24' : '#d97706'} />
                      <Text style={[styles.modalActionBtnText, { color: isDark ? '#fbbf24' : '#d97706' }]}>Pause Timer</Text>
                    </TouchableOpacity>
                  )}

                  {isTaskStarted(selectedTask) && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: isDark ? '#059669' : '#059669', borderColor: '#059669' }]}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        handleCompletePress(selectedTask.id);
                      }}
                    >
                      <AppIcon name="check" size={14} color="#ffffff" />
                      <Text style={[styles.modalActionBtnText, { color: '#ffffff' }]}>Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.closeDetailBtn, { backgroundColor: isDark ? themeColors.background : '#f1f5f9', borderColor: themeColors.border }]}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={{ color: themeColors.textPrimary, fontWeight: '700', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Task & Upload Proof Modal */}
      <Modal
        visible={completeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!uploading) setCompleteModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#34d399' : '#059669' }]}>Complete Task</Text>
            <Text style={styles.modalLabel}>
              Attach completion proof, documents, or screenshots (optional) and confirm task completion.
            </Text>

            <TouchableOpacity 
              style={[styles.fileSelectBtn, { backgroundColor: isDark ? themeColors.background : '#f8fafc', borderColor: isDark ? '#34d399' : '#059669' }]}
              onPress={handleSelectFile}
              disabled={uploading}
            >
              <AppIcon name="paperclip" size={24} color={isDark ? '#34d399' : '#059669'} />
              <Text style={[styles.fileSelectText, { color: isDark ? '#34d399' : '#059669', marginTop: 6 }]}>
                {selectedFiles.length > 0 ? '+ Add More Proof Files' : 'Select Proof Files / Documents'}
              </Text>
            </TouchableOpacity>

            {selectedFiles.length > 0 && (
              <View style={{ marginBottom: 12, maxHeight: 120 }}>
                <ScrollView nestedScrollEnabled={true}>
                  {selectedFiles.map((file, idx) => (
                    <View 
                      key={idx} 
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: 8,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                        borderRadius: 8,
                        marginBottom: 6
                      }}
                    >
                      <Text style={{ fontSize: 12, color: themeColors.textPrimary, flex: 1 }} numberOfLines={1}>
                        📎 {file.name || `File ${idx + 1}`}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => handleRemoveFile(idx)}
                        disabled={uploading}
                        style={{ paddingHorizontal: 6 }}
                      >
                        <AppIcon name="x" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: themeColors.textPrimary, marginTop: 4 }]}>
              Completion Note / Remarks (For Team Leader):
            </Text>
            <TextInput
              style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
              placeholder="Enter work summary, notes, or remarks for your Team Leader..."
              placeholderTextColor={themeColors.textSecondary}
              value={completionNote}
              onChangeText={setCompletionNote}
              multiline
              editable={!uploading}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: isDark ? themeColors.background : '#f1f5f9', borderColor: themeColors.border }]}
                onPress={() => {
                  setCompleteModalVisible(false);
                  setActiveCompletingId(null);
                  setSelectedFiles([]);
                  setCompletionNote('');
                }}
                disabled={uploading}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#059669' }]}
                onPress={handleSubmitCompletion}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="check" size={14} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '800' }}>Submit & Complete</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Self Task Modal */}
      <Modal
        visible={showSelfModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSelfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <Text style={styles.modalTitle}>Create New Task</Text>

            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Routine Maintenance, System Update..."
              placeholderTextColor={themeColors.textSecondary}
              value={selfTitle}
              onChangeText={setSelfTitle}
            />

            <Text style={styles.inputLabel}>Description / Notes</Text>
            <TextInput
              style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Enter task details..."
              placeholderTextColor={themeColors.textSecondary}
              value={selfDesc}
              onChangeText={setSelfDesc}
              multiline
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowSelfModal(false);
                  setSelfTitle('');
                  setSelfDesc('');
                }}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '700' }}>Cancel</Text>
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
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <Text style={styles.modalTitle}>Edit Task</Text>

            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Task Title"
              placeholderTextColor={themeColors.textSecondary}
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Task Description"
              placeholderTextColor={themeColors.textSecondary}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleEditSelfTask}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (themeColors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: themeColors.headerBg,
    borderBottomWidth: 1,
    borderColor: themeColors.borderLight || themeColors.border,
  },
  headerIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: themeColors.primary || '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: themeColors.primary || '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11.5,
    color: themeColors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    color: themeColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  taskCard: {
    backgroundColor: themeColors.cardBg,
    borderWidth: 1,
    borderColor: themeColors.borderLight || themeColors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardRunning: {
    borderLeftWidth: 3.5,
    borderLeftColor: themeColors.primary || '#3b82f6',
    shadowColor: themeColors.primary || '#3b82f6',
    shadowOpacity: isDark ? 0.25 : 0.12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  clientRequestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  assignedByText: {
    fontSize: 11.5,
    marginTop: 3,
    fontWeight: '500',
  },
  taskDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10,
  },
  durationCapsule: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  durationCapsuleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  durationCapsuleValue: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.borderLight || themeColors.border,
    marginVertical: 10,
  },
  attachmentHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  viewDetailsBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  btnTextViewDetails: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionBtnPrimary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnWarning: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  actionBtnWarningText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSuccess: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  actionBtnSuccessText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  completedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusPillPending: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
  },
  statusPillRunning: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.14)' : '#eff6ff',
    borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe',
  },
  statusPillSuccess: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: themeColors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  detailsModalContent: {
    backgroundColor: themeColors.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: themeColors.border,
    maxHeight: '88%',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: themeColors.border,
  },
  detailsModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  detailsModalSub: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  infoBannerCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  taskDetailTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionCardHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  sectionBodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  attachmentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  openBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '100%',
  },
  attachmentChipText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  detailsModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: themeColors.border,
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  closeDetailBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#60a5fa' : '#2563eb',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalLabel: {
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  fileSelectBtn: {
    backgroundColor: isDark ? themeColors.background : '#f8fafc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: isDark ? '#3b82f6' : '#2563eb',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  fileSelectText: {
    color: isDark ? '#60a5fa' : '#2563eb',
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
    backgroundColor: isDark ? themeColors.background : '#f1f5f9',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: isDark ? '#2563eb' : '#2563eb',
  },
  createTaskBtn: {
    backgroundColor: isDark ? '#2563eb' : '#2563eb',
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
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: isDark ? themeColors.background : '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    color: themeColors.textPrimary,
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
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: isDark ? themeColors.background : '#f8fafc',
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
    color: themeColors.textPrimary,
    fontSize: 13,
  },
  pickerItemTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
