import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Linking,
  PermissionsAndroid,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import SoundPlayer from 'react-native-sound-player';
import { getEmployees, getSystems, subscribe } from '../store/store';
import { getApiUrl, fetchMarketingAuthorizations, resolveSafeImageUri } from '../utils/api';
import { 
  initSocket, 
  onSocketEvent, 
  sendSocketMessage, 
  editSocketMessage, 
  deleteSocketMessage, 
  sendSocketTyping, 
  sendSocketStopTyping, 
  sendSocketMessagesRead 
} from '../utils/socketService';
import { pick } from '@react-native-documents/picker';
import { launchCamera } from 'react-native-image-picker';
import { useTheme } from '../utils/ThemeContext';
import { sweetAlert } from '../utils/sweetAlert';
import AppIcon from '../components/AppIcon';

export default function ChatScreen({ user, onBack }) {
  const { isDark, themeColors } = useTheme();
  const [activeChatId, setActiveChatId] = useState('general');
  const [showActiveChat, setShowActiveChat] = useState(false); // Mobile toggle between list & room
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsersList, setOnlineUsersList] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [typingUsers, setTypingUsers] = useState({});

  // Back Button Handler
  useEffect(() => {
    const backAction = () => {
      if (showActiveChat) {
        setShowActiveChat(false);
        return true; // prevent default behavior
      } else if (onBack) {
        onBack();
        return true; // prevent default behavior
      }
      return false; // let default behavior happen
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showActiveChat, onBack]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  // Groups state
  const [groups, setGroups] = useState([]);

  // Pinned chats state
  const [pinnedChats, setPinnedChats] = useState([]);
  
  // Read times state for unread badge tracking
  const [readTimes, setReadTimes] = useState({});

  // Load readTimes on mount
  useEffect(() => {
    async function loadReadTimes() {
      try {
        if (user?.id) {
          const saved = await AsyncStorage.getItem(`devicedesk_read_times_${user.id}`);
          if (saved) setReadTimes(JSON.parse(saved));
        }
      } catch (e) {}
    }
    loadReadTimes();
  }, [user]);

  // Update read time when active chat is opened
  useEffect(() => {
    if (showActiveChat && activeChatId && user?.id) {
      const key = String(activeChatId).toLowerCase();
      const now = Date.now();
      setReadTimes(prev => {
        const next = { ...prev, [key]: now };
        AsyncStorage.setItem(`devicedesk_read_times_${user.id}`, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, [showActiveChat, activeChatId, messages.length, user]);

  // Calculate unread count for a given conversation
  const getUnreadCount = (chatId) => {
    const targetId = String(chatId).toLowerCase();
    const lastRead = readTimes[targetId] || 0;
    const currentUserId = String(user?.id || '').toLowerCase();

    const chatMsgs = messages.filter(msg => {
      if (msg.deletedForEveryone) return false;
      if (msg.deletedForUsers) {
        let deletedList = [];
        try {
          deletedList = typeof msg.deletedForUsers === 'string' ? JSON.parse(msg.deletedForUsers) : msg.deletedForUsers;
        } catch (e) {}
        if (deletedList.map(id => String(id).toLowerCase()).includes(currentUserId)) {
          return false;
        }
      }
      const sender = String(msg.senderId).toLowerCase();
      const receiver = String(msg.receiverId).toLowerCase();

      if (sender === currentUserId) return false;

      if (targetId === 'general') {
        return receiver === 'general';
      } else if (targetId.startsWith('group_') || targetId.startsWith('dept_')) {
        return receiver === targetId;
      } else {
        return sender === targetId && receiver === currentUserId;
      }
    });

    return chatMsgs.filter(m => new Date(m.timestamp).getTime() > lastRead).length;
  };
  
  // Three Dots Context Menu state
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);

  // Edit Message state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Forward Message state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardTargetId, setForwardTargetId] = useState('');
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  // Cleared Chats state
  const [clearedChats, setClearedChats] = useState({});

  // Chat Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTab, setDetailsTab] = useState('info'); // info, media, docs, links

  // Open Forward Modal
  const handleOpenForwardModal = () => {
    setForwardSearchQuery('');
    setForwardTargetId('');
    setShowForwardModal(true);
  };

  // Shared media, docs, and links helper

  // WhatsApp Category Filter state
  const [activeFilter, setActiveFilter] = useState('all'); // all, unread, groups, chats

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  // File / Camera attachment upload state
  const [uploading, setUploading] = useState(false);
  const [showUploadConfirmModal, setShowUploadConfirmModal] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);
  const [uploadCaption, setUploadCaption] = useState('');

  // Audio & Video & Image Media Playback state
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [activeImageUrl, setActiveImageUrl] = useState(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [activeAlbumMessage, setActiveAlbumMessage] = useState(null);

  // SoundPlayer finished playing listener
  useEffect(() => {
    let finishedSub = null;
    try {
      finishedSub = SoundPlayer.addEventListener('FinishedPlaying', () => {
        setPlayingAudioId(null);
      });
    } catch (e) {}

    return () => {
      if (finishedSub) finishedSub.remove();
    };
  }, []);

  // Toggle Play Voice Note Audio
  const handleTogglePlayAudio = async (msg) => {
    if (!msg) return;
    if (playingAudioId === msg.id) {
      try {
        SoundPlayer.stop();
      } catch (e) {}
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msg.id);
      const audioUrl = msg.fileUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      try {
        await SoundPlayer.playUrl(audioUrl);
      } catch (e) {
        console.warn('Audio playback error:', e);
      }
      setTimeout(() => {
        setPlayingAudioId(prev => (prev === msg.id ? null : prev));
      }, 7000);
    }
  };

  // Safe File Opener Helper
  const handleOpenFile = async (fileUrl, fileName) => {
    if (!fileUrl) return;
    try {
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          await Linking.openURL(fileUrl);
          return;
        }
      }
      Alert.alert(
        '📎 Attachment Info',
        `File Name: ${fileName || 'Attachment'}\nStatus: Saved to device`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('📎 Attachment Info', `File Name: ${fileName || 'Attachment'}`);
    }
  };
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showMessageInfoModal, setShowMessageInfoModal] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  // Employee list
  const [employees, setEmployees] = useState(getEmployees());
  const [authorizedMarketingIds, setAuthorizedMarketingIds] = useState([]);

  useEffect(() => {
    async function loadMarketingAuth() {
      try {
        const res = await fetchMarketingAuthorizations();
        if (res?.success && Array.isArray(res.data)) {
          setAuthorizedMarketingIds(res.data.map(a => a.employeeId));
        }
      } catch (e) {}
    }
    loadMarketingAuth();
  }, []);

  const isMarketingMember = (emp) => {
    if (!emp) return false;
    const d = (emp.department || '').toLowerCase();
    const r = (emp.role || '').toLowerCase();
    return d === 'marketing' || r.includes('marketing');
  };

  const isUserAuthorizedForMarketing = (currUser) => {
    if (!currUser) return false;
    const r = (currUser.role || '').toLowerCase();
    const d = (currUser.department || '').toLowerCase();
    if (r.includes('admin') || r.includes('superadmin') || r.includes('management')) return true;
    if (d === 'marketing' || r.includes('marketing')) return true;
    if (authorizedMarketingIds.includes(currUser.id)) return true;
    return false;
  };

  const isClientUser = (emp) => {
    if (!emp) return false;
    const r = (emp.role || '').toLowerCase().trim();
    const d = (emp.department || '').toLowerCase().trim();
    const id = String(emp.id || '').toLowerCase().trim();
    return r === 'client' || r.includes('client') || d === 'client' || d.includes('client') || id.startsWith('client_');
  };

  const isEmployeeVisibleInChat = (emp) => {
    if (!emp) return false;
    if (String(emp.id).toLowerCase() === String(user?.id || '').toLowerCase()) return false;

    // Never show Client users in mobile internal chat user list
    if (isClientUser(emp)) return false;

    const currentUserIsMarketing = isMarketingMember(user);
    const targetIsMarketing = isMarketingMember(emp);
    const currentUserHasAccess = isUserAuthorizedForMarketing(user);

    // Case 1: Current user is a Marketing member
    if (currentUserIsMarketing) {
      // Marketing member can only see Admins, Authorized managers, and fellow Marketing teammates
      const targetRole = (emp.role || '').toLowerCase();
      const targetIsAdmin = targetRole.includes('admin') || targetRole.includes('superadmin') || targetRole.includes('management');
      const targetIsAuthorized = authorizedMarketingIds.includes(emp.id);
      return targetIsMarketing || targetIsAdmin || targetIsAuthorized;
    }

    // Case 2: Current user is NOT marketing and NOT authorized
    if (!currentUserHasAccess) {
      // Must hide all marketing members
      if (targetIsMarketing) return false;
    }

    return true;
  };

  const scrollViewRef = useRef(null);

  useEffect(() => {
    const unsub = subscribe(() => {
      setEmployees(getEmployees());
    });
    return () => unsub();
  }, []);

  // Load pinnedChats & clearedChats & pinnedMessages on mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        if (user?.id) {
          const savedPinned = await AsyncStorage.getItem(`devicedesk_pinned_chats_${user.id}`);
          if (savedPinned) setPinnedChats(JSON.parse(savedPinned));

          const savedCleared = await AsyncStorage.getItem(`devicedesk_cleared_chats_${user.id}`);
          if (savedCleared) setClearedChats(JSON.parse(savedCleared));

          const savedPinnedMsgs = await AsyncStorage.getItem(`devicedesk_pinned_msgs_${activeChatId}`);
          if (savedPinnedMsgs) setPinnedMessages(JSON.parse(savedPinnedMsgs));
        }
      } catch (e) {}
    }
    loadPreferences();
  }, [user, activeChatId]);

  // Voice Recording Timer Effect
  useEffect(() => {
    let timer = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordTime(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // Load messages from server & setup real-time socket events
  const fetchMessages = async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/chat`, {
        headers: {
          'x-user-id': String(user?.id || ''),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setGroups(data.groups || []);
      }
    } catch (err) {
      // Fallback silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Socket.io Real-time event listeners
    if (user?.id) {
      initSocket(user);

      const unsubMsg = onSocketEvent('receive-message', (newMsg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (String(newMsg.senderId).toLowerCase() !== String(user.id).toLowerCase()) {
          try {
            SoundPlayer.playSoundFile('notification', 'mp3');
          } catch (e) {}
        }
      });

      const unsubEdit = onSocketEvent('message-edited', (data) => {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: data.content, isEdited: 1, editedAt: data.editedAt } : m));
      });

      const unsubDel = onSocketEvent('message-deleted', (data) => {
        setMessages(prev => prev.map(m => {
          if (m.id === data.messageId) {
            if (data.deleteType === 'everyone') {
              return { ...m, deletedForEveryone: 1 };
            }
          }
          return m;
        }));
      });

      const unsubOnline = onSocketEvent('online-users', (users) => {
        if (Array.isArray(users)) {
          setOnlineUsersList(users.map(u => String(u).toLowerCase()));
        }
      });

      const unsubLastSeen = onSocketEvent('last-seen', (map) => {
        if (map) {
          const normalised = {};
          Object.entries(map).forEach(([k, v]) => { normalised[String(k).toLowerCase()] = v; });
          setLastSeenMap(prev => ({ ...prev, ...normalised }));
        }
      });

      const unsubTyping = onSocketEvent('typing', (data) => {
        if (data && data.senderId) {
          setTypingUsers(prev => ({ ...prev, [String(data.senderId).toLowerCase()]: data.senderName || 'Someone' }));
        }
      });

      const unsubStopTyping = onSocketEvent('stop-typing', (data) => {
        if (data && data.senderId) {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[String(data.senderId).toLowerCase()];
            return next;
          });
        }
      });

      // Periodic backup fetch (every 10s rather than intense 3s polling)
      const interval = setInterval(fetchMessages, 10000);

      return () => {
        unsubMsg();
        unsubEdit();
        unsubDel();
        unsubOnline();
        unsubLastSeen();
        unsubTyping();
        unsubStopTyping();
        clearInterval(interval);
      };
    }
  }, [user]);

  // Pin Chat helper
  const isPinned = (chatId) => pinnedChats.includes(String(chatId).toLowerCase());

  const togglePinChat = async (chatId) => {
    const chatKey = String(chatId).toLowerCase();
    let updated;
    if (pinnedChats.includes(chatKey)) {
      updated = pinnedChats.filter(id => id !== chatKey);
    } else {
      updated = [...pinnedChats, chatKey];
    }
    setPinnedChats(updated);
    try {
      await AsyncStorage.setItem(`devicedesk_pinned_chats_${user?.id}`, JSON.stringify(updated));
    } catch (err) {}
  };

  // Clear Chat Display helper
  const handleClearChatDisplay = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages from this chat view?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            const updated = { ...clearedChats, [String(activeChatId).toLowerCase()]: nowIso };
            setClearedChats(updated);
            try {
              await AsyncStorage.setItem(`devicedesk_cleared_chats_${user?.id}`, JSON.stringify(updated));
            } catch (e) {}
            setShowDetailsModal(false);
          },
        },
      ]
    );
  };

  // Get active messages filtered for user & cleared timestamp
  const getActiveConversationMessages = () => {
    const targetId = String(activeChatId).toLowerCase();
    const currentUserId = String(user?.id || '').toLowerCase();
    const clearCutoffStr = clearedChats[targetId];
    const clearCutoffTime = clearCutoffStr ? new Date(clearCutoffStr).getTime() : 0;

    return messages.filter(msg => {
      // Filter out deleted for self
      if (msg.deletedForUsers) {
        let deletedList = [];
        try {
          deletedList = typeof msg.deletedForUsers === 'string' ? JSON.parse(msg.deletedForUsers) : msg.deletedForUsers;
        } catch (e) {}
        if (deletedList.map(id => String(id).toLowerCase()).includes(currentUserId)) {
          return false;
        }
      }

      // Filter cleared chat timestamp
      if (clearCutoffTime && msg.timestamp && new Date(msg.timestamp).getTime() <= clearCutoffTime) {
        return false;
      }

      if (targetId === 'general') {
        return msg.receiverId === 'general';
      } else if (targetId.startsWith('dept_')) {
        return String(msg.receiverId).toLowerCase() === targetId;
      } else if (targetId.startsWith('group_')) {
        return String(msg.receiverId).toLowerCase() === targetId;
      } else {
        const sender = String(msg.senderId).toLowerCase();
        const receiver = String(msg.receiverId).toLowerCase();
        return (sender === currentUserId && receiver === targetId) || (sender === targetId && receiver === currentUserId);
      }
    });
  };

  // Handle Document & Media Picker (Multiple Selection)
  const handlePickDocument = async (types = []) => {
    try {
      const res = await pick({
        type: types.length > 0 ? types : ['*/*'],
        allowMultiSelection: true,
      });
      if (res && res.length > 0) {
        const formattedList = res.map(file => {
          const fileType = file.type || '';
          const isImage = fileType.startsWith('image');
          const isVideo = fileType.startsWith('video');
          const isAudio = fileType.startsWith('audio');
          const msgType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';
          return { id: `file_${Math.random().toString(36).substring(2, 8)}`, file, msgType, isImage, isVideo, isAudio };
        });

        setPendingUploadFiles(formattedList);
        setUploadCaption('');
        setShowUploadConfirmModal(true);
      }
    } catch (err) {
      // Cancelled by user
    }
  };

  // Remove single file from upload batch
  const handleRemovePendingFile = (fileId) => {
    setPendingUploadFiles(prev => {
      const next = prev.filter(item => item.id !== fileId);
      if (next.length === 0) {
        setShowUploadConfirmModal(false);
      }
      return next;
    });
  };

  // Append More Files to Current Upload Batch
  const handleAddMoreFiles = async (types = []) => {
    try {
      const res = await pick({
        type: types.length > 0 ? types : ['*/*'],
        allowMultiSelection: true,
      });
      if (res && res.length > 0) {
        const formattedList = res.map(file => {
          const fileType = file.type || '';
          const isImage = fileType.startsWith('image');
          const isVideo = fileType.startsWith('video');
          const isAudio = fileType.startsWith('audio');
          const msgType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';
          return { id: `file_${Math.random().toString(36).substring(2, 8)}`, file, msgType, isImage, isVideo, isAudio };
        });

        setPendingUploadFiles(prev => [...prev, ...formattedList]);
      }
    } catch (err) {
      // Cancelled by user
    }
  };

  // Confirm and Send Media Upload
  const handleConfirmSendUpload = async () => {
    if (!pendingUploadFiles || pendingUploadFiles.length === 0) return;
    const filesToSend = [...pendingUploadFiles];
    setShowUploadConfirmModal(false);
    setUploading(true);

    const caption = uploadCaption || '';

    try {
      // 1. Upload files to server /api/upload
      const formData = new FormData();
      filesToSend.forEach((item) => {
        const fileUri = item.file.uri || '';
        formData.append('files', {
          uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
          type: item.file.type || (item.isImage ? 'image/jpeg' : item.isVideo ? 'video/mp4' : item.isAudio ? 'audio/mpeg' : 'application/octet-stream'),
          name: item.file.name || `file_${Date.now()}`
        });
      });

      let uploadedUrls = [];
      try {
        const uploadRes = await fetch(`${getApiUrl()}/api/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success) {
          uploadedUrls = uploadData.fileUrls || [];
        }
      } catch (uploadErr) {
        console.warn('Chat upload server error:', uploadErr);
      }

      if (filesToSend.length > 1) {
        // GROUPED MEDIA ALBUM BATCH
        const mediaItems = filesToSend.map((item, idx) => ({
          url: uploadedUrls[idx] || item.file.uri,
          name: item.file.name,
          type: item.msgType,
        }));

        const newMsg = {
          id: `msg_${Date.now()}`,
          senderId: user?.id || 'anonymous',
          senderName: user?.name || 'User',
          receiverId: activeChatId,
          content: caption || '',
          messageType: 'media_group',
          fileUrl: JSON.stringify(mediaItems),
          fileName: `${mediaItems.length} media files`,
          mediaItems: mediaItems,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, newMsg]);
        try {
          sendSocketMessage(newMsg);
        } catch (sErr) {}

        try {
          await fetch(`${getApiUrl()}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': String(user?.id || ''),
            },
            body: JSON.stringify(newMsg),
          });
        } catch (e) {}
      } else {
        // SINGLE MEDIA ITEM
        const { file, msgType, isImage, isVideo, isAudio } = filesToSend[0];
        const defaultText = isImage ? '📷 Photo' : isVideo ? '🎥 Video' : isAudio ? '🎙️ Voice Note' : `📎 ${file.name || 'File'}`;
        const finalContent = caption ? `${defaultText}\n${caption}` : defaultText;
        const finalFileUrl = uploadedUrls[0] || file.uri;

        const newMsg = {
          id: `msg_${Date.now()}`,
          senderId: user?.id || 'anonymous',
          senderName: user?.name || 'User',
          receiverId: activeChatId,
          content: finalContent,
          messageType: msgType,
          fileUrl: finalFileUrl,
          fileName: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, newMsg]);
        try {
          sendSocketMessage(newMsg);
        } catch (sErr) {}

        try {
          await fetch(`${getApiUrl()}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': String(user?.id || ''),
            },
            body: JSON.stringify(newMsg),
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error('Chat upload error:', err);
    } finally {
      setPendingUploadFiles([]);
      setUploadCaption('');
      setUploading(false);
    }
  };

  // Handle Send Voice Note
  const handleSendVoiceNote = async () => {
    setIsRecording(false);
    const mins = Math.floor(recordTime / 60);
    const secs = recordTime % 60;
    const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const defaultAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || 'anonymous',
      senderName: user?.name || 'User',
      receiverId: activeChatId,
      content: `🎙️ Voice Note (${durStr})`,
      messageType: 'audio',
      fileUrl: defaultAudioUrl,
      fileName: `Voice Note (${durStr}).mp3`,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    try {
      await fetch(`${getApiUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
        },
        body: JSON.stringify(newMsg),
      });
    } catch (e) {}
  };

  // Open Device Hardware Camera Directly
  const handleCameraClick = async () => {
    try {
      if (Platform.OS === 'android') {
        const hasCamPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (!hasCamPerm) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission Required',
              message: 'DeviceDesk requires camera access to take photos for support tickets and chat attachments.',
              buttonPositive: 'Allow',
              buttonNegative: 'Cancel',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Required', 'Camera permission was denied.');
            return;
          }
        }
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.85,
        saveToPhotos: true,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        // Fallback option menu
        Alert.alert(
          '📷 Select Photo Source',
          'Camera access unavailable. Pick photo from gallery?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Gallery', onPress: () => handlePickDocument(['image/*']) },
          ]
        );
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formattedFile = {
          id: `file_${Math.random().toString(36).substring(2, 8)}`,
          file: {
            uri: asset.uri,
            name: asset.fileName || `photo_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize || 0,
          },
          msgType: 'image',
          isImage: true,
          isVideo: false,
          isAudio: false,
        };

        setPendingUploadFiles([formattedFile]);
        setUploadCaption('');
        setShowUploadConfirmModal(true);
      }
    } catch (err) {
      handlePickDocument(['image/*']);
    }
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!inputText || inputText.length === 0) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || 'anonymous',
      senderName: user?.name || 'User',
      receiverId: activeChatId,
      content: inputText,
      messageType: 'text',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    try {
      sendSocketStopTyping(activeChatId);
      sendSocketMessage(newMsg);
    } catch (sErr) {}

    try {
      await fetch(`${getApiUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
        },
        body: JSON.stringify(newMsg),
      });
    } catch (e) {}
  };

  // Edit Message
  const handleSaveEdit = async (msgId) => {
    if (!editingText || editingText.length === 0) return;
    const editedAt = new Date().toISOString();
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editingText, isEdited: 1 } : m));
    setEditingMessageId(null);
    const contentToSave = editingText;
    setEditingText('');

    try {
      editSocketMessage({ messageId: msgId, senderId: user?.id, receiverId: activeChatId, content: contentToSave, editedAt });
    } catch (sErr) {}

    try {
      await fetch(`${getApiUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
        },
        body: JSON.stringify({ messageId: msgId, content: contentToSave, action: 'editMessage' }),
      });
    } catch (e) {}
  };

  // Multi-Selection Toggle (Limit max 15)
  const handleToggleSelectMessage = (msg) => {
    if (!msg || msg.deletedForEveryone) return;
    const isAlreadySelected = selectedMessages.some(m => m.id === msg.id);
    if (isAlreadySelected) {
      setSelectedMessages(prev => prev.filter(m => m.id !== msg.id));
    } else {
      if (selectedMessages.length >= 15) {
        Alert.alert('Selection Limit', 'You can select up to 15 messages at a time.');
        return;
      }
      setSelectedMessages(prev => [...prev, msg]);
    }
  };

  // Toggle Pin Message
  const handleTogglePinMessage = async (msg) => {
    if (!msg) return;
    const isAlreadyPinned = pinnedMessages.includes(msg.id);
    let newPinned = [];
    if (isAlreadyPinned) {
      newPinned = pinnedMessages.filter(id => id !== msg.id);
    } else {
      newPinned = [...pinnedMessages, msg.id];
    }
    setPinnedMessages(newPinned);
    try {
      await AsyncStorage.setItem(`devicedesk_pinned_msgs_${activeChatId}`, JSON.stringify(newPinned));
    } catch (e) {}
    setSelectedMessages([]);
  };

  const isMessagePinned = (msgId) => pinnedMessages.includes(msgId);

  // Helper to render formatted message content with clickable URLs and forwarded tag
  const renderMessageContent = (content, isOwn) => {
    if (!content) return null;

    const isForwarded = content.startsWith('<FiCornerUpRight /> Forwarded') || content.startsWith('Forwarded:\n') || content.startsWith('Forwarded: ') || content.startsWith('↪️ Forwarded\n') || content.startsWith('↪️ Forwarded:');
    const displayContent = content
      .replace(/^<FiCornerUpRight \/> Forwarded\n?/, '')
      .replace(/^Forwarded:\n?/, '')
      .replace(/^Forwarded: /, '')
      .replace(/^↪️ Forwarded\n?/, '')
      .replace(/^↪️ Forwarded: ?/, '');

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = displayContent.split(urlRegex);
    const textColor = isOwn ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a');
    const linkColor = isOwn ? '#bae6fd' : (isDark ? '#38bdf8' : '#0284c7');

    return (
      <View>
        {isForwarded && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 }}>
            <AppIcon name="forward" size={12} color={isOwn ? '#bfdbfe' : '#06b6d4'} />
            <Text style={{ fontSize: 11, color: isOwn ? '#bfdbfe' : '#06b6d4', fontStyle: 'italic', fontWeight: '600' }}>
              Forwarded
            </Text>
          </View>
        )}
        <Text style={[styles.msgText, { color: textColor }]} selectable={true}>
          {parts.map((part, i) => {
            if (part.match(urlRegex)) {
              return (
                <Text
                  key={i}
                  onPress={() => Linking.openURL(part)}
                  style={{
                    color: linkColor,
                    textDecorationLine: 'underline',
                    fontWeight: '600',
                  }}
                >
                  {part}
                </Text>
              );
            }
            return <Text key={i} style={{ color: textColor }}>{part}</Text>;
          })}
        </Text>
      </View>
    );
  };

  // Copy Message Content (supports single or multiple selected messages)
  const handleCopyMessage = (msgOrList) => {
    const list = Array.isArray(msgOrList) 
      ? msgOrList 
      : (msgOrList ? [msgOrList] : selectedMessages);
    
    const validMsgs = (list || []).filter(m => m && (m.content || m.fileUrl || m.fileName));
    if (validMsgs.length === 0) return;

    let textToCopy = '';
    if (validMsgs.length === 1) {
      const single = validMsgs[0];
      const raw = single.content || single.fileUrl || single.fileName || '';
      textToCopy = raw
        .replace(/^<FiCornerUpRight \/> Forwarded\n?/, '')
        .replace(/^Forwarded:\n?/, '')
        .replace(/^Forwarded: /, '')
        .replace(/^↪️ Forwarded\n?/, '')
        .replace(/^↪️ Forwarded: ?/, '');
    } else {
      textToCopy = validMsgs
        .map(m => {
          const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const name = m.senderName || (String(m.senderId).toLowerCase() === String(user?.id || '').toLowerCase() ? 'You' : 'User');
          const content = (m.content || m.fileUrl || m.fileName || `[${m.messageType || 'file'}]`)
            .replace(/^<FiCornerUpRight \/> Forwarded\n?/, '')
            .replace(/^Forwarded:\n?/, '')
            .replace(/^Forwarded: /, '')
            .replace(/^↪️ Forwarded\n?/, '')
            .replace(/^↪️ Forwarded: ?/, '');
          return `[${time}] ${name}: ${content}`;
        })
        .join('\n');
    }

    try {
      Clipboard.setString(textToCopy);
      sweetAlert.info('Copied', validMsgs.length === 1 ? 'Message copied to clipboard' : `${validMsgs.length} messages copied to clipboard`);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
    setSelectedMessages([]);
  };

  // Handle Multi / Single Delete Action
  const handleStartDeleting = () => {
    if (selectedMessages.length === 0) return;
    const targets = [...selectedMessages];

    if (targets.length === 1) {
      handleDeleteMessage(targets[0]);
      return;
    }

    Alert.alert(
      'Delete Messages',
      `Delete ${targets.length} selected messages?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for Everyone',
          style: 'destructive',
          onPress: async () => {
            const targetIds = targets.map(m => m.id);
            setMessages(prev => prev.map(m => targetIds.includes(m.id) ? { ...m, deletedForEveryone: 1 } : m));
            setSelectedMessages([]);

            for (const msg of targets) {
              try {
                deleteSocketMessage({ messageId: msg.id, senderId: user?.id, receiverId: activeChatId, deleteType: 'everyone' });
              } catch (sErr) {}
              try {
                await fetch(`${getApiUrl()}/api/chat`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user?.id || ''),
                  },
                  body: JSON.stringify({ messageId: msg.id, action: 'deleteMessage', deleteType: 'everyone' }),
                });
              } catch (e) {}
            }
          },
        },
        {
          text: 'Delete for Me',
          onPress: async () => {
            const targetIds = targets.map(m => m.id);
            setMessages(prev => prev.filter(m => !targetIds.includes(m.id)));
            setSelectedMessages([]);

            for (const msg of targets) {
              try {
                await fetch(`${getApiUrl()}/api/chat`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user?.id || ''),
                  },
                  body: JSON.stringify({ messageId: msg.id, action: 'deleteMessage', deleteType: 'self' }),
                });
              } catch (e) {}
            }
          },
        },
      ]
    );
  };

  // Delete Message
  const handleDeleteMessage = (msg) => {
    const isOwn = String(msg.senderId).toLowerCase() === String(user?.id || '').toLowerCase();
    const ageMins = (Date.now() - new Date(msg.timestamp).getTime()) / (1000 * 60);
    const canDeleteEveryone = isOwn && ageMins <= 15;

    if (canDeleteEveryone) {
      Alert.alert('Delete Message', 'How would you like to delete this message?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for Everyone',
          style: 'destructive',
          onPress: async () => {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deletedForEveryone: 1 } : m));
            setSelectedMessages([]);
            try {
              deleteSocketMessage({ messageId: msg.id, senderId: user?.id, receiverId: activeChatId, deleteType: 'everyone' });
            } catch (sErr) {}
            try {
              await fetch(`${getApiUrl()}/api/chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': String(user?.id || ''),
                },
                body: JSON.stringify({ messageId: msg.id, action: 'deleteMessage', deleteType: 'everyone' }),
              });
            } catch (e) {}
          },
        },
        {
          text: 'Delete for Me',
          onPress: async () => {
            setMessages(prev => prev.filter(m => m.id !== msg.id));
            setSelectedMessages([]);
            try {
              await fetch(`${getApiUrl()}/api/chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': String(user?.id || ''),
                },
                body: JSON.stringify({ messageId: msg.id, action: 'deleteMessage', deleteType: 'self' }),
              });
            } catch (e) {}
          },
        },
      ]);
    } else {
      Alert.alert('Delete Message', 'Delete this message for yourself?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for Me',
          style: 'destructive',
          onPress: async () => {
            setMessages(prev => prev.filter(m => m.id !== msg.id));
            setSelectedMessages([]);
            try {
              await fetch(`${getApiUrl()}/api/chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': String(user?.id || ''),
                },
                body: JSON.stringify({ messageId: msg.id, action: 'deleteMessage', deleteType: 'self' }),
              });
            } catch (e) {}
          },
        },
      ]);
    }
  };

  // Handle Start Forwarding
  const handleStartForwarding = () => {
    if (selectedMessages.length === 0) return;
    setForwardTargetId('');
    setShowForwardModal(true);
  };

  // Confirm Forwarding selected messages
  const handleConfirmForward = async () => {
    if (!forwardTargetId) return;
    const msgsToForward = selectedMessages.length > 0 ? [...selectedMessages] : forwardingMessage ? [forwardingMessage] : [];
    if (msgsToForward.length === 0) return;

    setShowForwardModal(false);
    setSelectedMessages([]);
    setForwardingMessage(null);

    for (const msg of msgsToForward) {
      const fwdMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: user?.id || 'anonymous',
        senderName: user?.name || 'User',
        receiverId: forwardTargetId,
        content: `↪️ Forwarded\n${msg.content || ''}`,
        messageType: msg.messageType || 'text',
        fileUrl: msg.fileUrl || null,
        fileName: msg.fileName || null,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, fwdMsg]);

      try {
        await fetch(`${getApiUrl()}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': String(user?.id || ''),
          },
          body: JSON.stringify(fwdMsg),
        });
      } catch (e) {}
    }
  };
  const getSharedMediaAndFiles = () => {
    const activeMsgs = getActiveConversationMessages();
    const media = [];
    const docs = [];
    const links = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    activeMsgs.forEach(msg => {
      if (msg.messageType === 'image' || msg.messageType === 'video') {
        media.push({
          id: msg.id,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          fileUrl: msg.fileUrl || msg.content,
          type: msg.messageType,
        });
      } else if (msg.messageType === 'media_group') {
        // Extract all items from the media group
        let mediaItems = [];
        const raw = msg.mediaItems || msg.fileUrl;
        if (Array.isArray(raw)) {
          mediaItems = raw;
        } else if (typeof raw === 'string') {
          try { mediaItems = JSON.parse(raw); } catch (e) { mediaItems = []; }
        }
        mediaItems.forEach((item, idx) => {
          media.push({
            id: `${msg.id}_${idx}`,
            senderName: msg.senderName,
            timestamp: msg.timestamp,
            fileUrl: item.url,
            type: item.type || 'image',
          });
        });
      } else if (msg.messageType === 'file' || msg.messageType === 'audio') {
        docs.push({
          id: msg.id,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          fileName: msg.fileName || (msg.messageType === 'audio' ? 'Voice Note.webm' : 'Attachment'),
          fileUrl: msg.fileUrl,
          type: msg.messageType,
        });
      } else if (msg.messageType === 'text' && msg.content) {
        const matches = msg.content.match(urlRegex);
        if (matches) {
          matches.forEach(url => {
            links.push({
              id: `${msg.id}_${url}`,
              senderName: msg.senderName,
              timestamp: msg.timestamp,
              url: url,
            });
          });
        }
      }
    });

    return { media, docs, links };
  };

  // Multi-Forward Confirmation
  const handleConfirmForwardMulti = async () => {
    if (!forwardTargetId || selectedMessages.length === 0) return;
    for (const msg of selectedMessages) {
      const fwdMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: user?.id || 'anonymous',
        senderName: user?.name || 'User',
        receiverId: forwardTargetId,
        content: `↪️ Forwarded\n${msg.content || ''}`,
        messageType: msg.messageType || 'text',
        fileUrl: msg.fileUrl || null,
        fileName: msg.fileName || null,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, fwdMsg]);
      try {
        await fetch(`${getApiUrl()}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': String(user?.id || ''),
          },
          body: JSON.stringify(fwdMsg),
        });
      } catch (e) {}
    }
    setShowForwardModal(false);
    setSelectedMessages([]);
    setForwardingMessage(null);
  };

  // Helper for last message info
  const getLastMessageInfo = (chatId) => {
    const targetId = String(chatId).toLowerCase();
    const currentUserId = String(user?.id || '').toLowerCase();

    let lastMsg = null;
    messages.forEach(msg => {
      if (msg.deletedForUsers) {
        let deletedList = [];
        try {
          deletedList = typeof msg.deletedForUsers === 'string' ? JSON.parse(msg.deletedForUsers) : msg.deletedForUsers;
        } catch (e) {}
        if (deletedList.map(id => String(id).toLowerCase()).includes(currentUserId)) {
          return;
        }
      }
      let isMatch = false;
      if (targetId === 'general') {
        isMatch = msg.receiverId === 'general';
      } else if (targetId.startsWith('dept_') || targetId.startsWith('group_')) {
        isMatch = String(msg.receiverId).toLowerCase() === targetId;
      } else {
        const sender = String(msg.senderId).toLowerCase();
        const receiver = String(msg.receiverId).toLowerCase();
        isMatch = (sender === currentUserId && receiver === targetId) || (sender === targetId && receiver === currentUserId);
      }
      if (isMatch && msg.timestamp) {
        if (!lastMsg || new Date(msg.timestamp).getTime() > new Date(lastMsg.timestamp).getTime()) {
          lastMsg = msg;
        }
      }
    });

    return {
      timestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
      timeFormatted: lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      content: lastMsg ? (
        lastMsg.deletedForEveryone ? '🚫 Message deleted' :
        lastMsg.messageType === 'image' ? '📷 Photo' :
        lastMsg.messageType === 'video' ? '🎥 Video' :
        lastMsg.messageType === 'audio' ? '🎙️ Voice Note' :
        lastMsg.messageType === 'file' ? `📎 ${lastMsg.fileName || 'File'}` :
        lastMsg.messageType === 'media_group' ? (lastMsg.content ? `🖼️ Album: ${lastMsg.content}` : '🖼️ Media Album') :
        lastMsg.content?.replace(/^↪️ Forwarded\n?/, '↪️ ') || ''
      ) : '',
    };
  };

  // Filter & sort contacts
  const filteredEmployees = employees.filter(emp => {
    if (!isEmployeeVisibleInChat(emp)) return false;
    return emp.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const isPinnedA = isPinned(a.id);
    const isPinnedB = isPinned(b.id);
    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;

    const timeA = getLastMessageInfo(a.id).timestamp;
    const timeB = getLastMessageInfo(b.id).timestamp;
    if (timeA !== timeB) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });

  const sortedGroups = [...groups].sort((a, b) => {
    const isPinnedA = isPinned(a.id);
    const isPinnedB = isPinned(b.id);
    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;

    const timeA = getLastMessageInfo(a.id).timestamp;
    const timeB = getLastMessageInfo(b.id).timestamp;
    if (timeA !== timeB) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });

  // Resolve chat title
  let activeChatTitle = 'General Office Chat';
  if (activeChatId.startsWith('dept_')) {
    activeChatTitle = `${activeChatId.replace('dept_', '')} Department`;
  } else if (activeChatId.startsWith('group_')) {
    activeChatTitle = groups.find(g => g.id === activeChatId)?.name || 'Group Chat';
  } else if (activeChatId !== 'general') {
    activeChatTitle = employees.find(e => e.id === activeChatId)?.name || 'Direct Message';
  }

  const activeMessages = getActiveConversationMessages();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {!showActiveChat ? (
        /* CONVERSATION LIST VIEW */
        <View style={[styles.listContainer, { backgroundColor: themeColors.background }]}>
          {/* Large Prominent Search Bar with Clear Icon */}
          <View style={[styles.largeSearchContainer, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <AppIcon name="search" size={18} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.largeSearchInput, { color: themeColors.textPrimary }]}
              placeholder="Search chats or team members..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <AppIcon name="close" size={16} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* WhatsApp Category Filter Pills */}
          <View style={styles.filterBar}>
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'groups', label: 'Groups' },
              { id: 'chats', label: 'Chats' },
            ].map(f => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                style={[
                  styles.filterChip,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: themeColors.border },
                  activeFilter === f.id && styles.filterChipActive
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: themeColors.textSecondary },
                  activeFilter === f.id && styles.filterChipTextActive
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView 
            style={styles.scrollList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
          >
            {/* Channels Section */}
            <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Channels</Text>

            <TouchableOpacity
              style={[
                styles.chatItem,
                { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.border },
                activeChatId === 'general' && [styles.chatItemActive, { backgroundColor: isDark ? '#334155' : '#eff6ff', borderColor: isDark ? '#475569' : '#bfdbfe' }]
              ]}
              onPress={() => { setActiveChatId('general'); setShowActiveChat(true); }}
            >
              <View style={[styles.avatarBox, { backgroundColor: '#4f46e5' }]}>
                <AppIcon name="group" size={20} color="#ffffff" />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>General Office Chat</Text>
                  {getUnreadCount('general') > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{getUnreadCount('general')}</Text>
                    </View>
                  )}
                  {isPinned('general') && <AppIcon name="pin" size={14} color="#f59e0b" />}
                </View>
                <Text style={[styles.itemSub, { color: themeColors.textSecondary }]}>Company-wide channel</Text>
              </View>
            </TouchableOpacity>

            {user?.department && (
              <TouchableOpacity
                style={[
                  styles.chatItem,
                  { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.border },
                  activeChatId === `dept_${user.department}` && [styles.chatItemActive, { backgroundColor: isDark ? '#334155' : '#eff6ff', borderColor: isDark ? '#475569' : '#bfdbfe' }]
                ]}
                onPress={() => { setActiveChatId(`dept_${user.department}`); setShowActiveChat(true); }}
              >
                <View style={[styles.avatarBox, { backgroundColor: '#8b5cf6' }]}>
                  <AppIcon name="briefcase" size={20} color="#ffffff" />
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemRow}>
                    <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>{user.department} Team</Text>
                    {getUnreadCount(`dept_${user.department}`) > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{getUnreadCount(`dept_${user.department}`)}</Text>
                      </View>
                    )}
                    {isPinned(`dept_${user.department}`) && <AppIcon name="pin" size={14} color="#f59e0b" />}
                  </View>
                  <Text style={[styles.itemSub, { color: themeColors.textSecondary }]}>Department channel</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Custom Groups Section */}
            {sortedGroups.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Group Chats</Text>
                {sortedGroups.map(group => {
                  const lastInfo = getLastMessageInfo(group.id);
                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.chatItem,
                        { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.border },
                        activeChatId === group.id && [styles.chatItemActive, { backgroundColor: isDark ? '#334155' : '#eff6ff', borderColor: isDark ? '#475569' : '#bfdbfe' }]
                      ]}
                      onPress={() => { setActiveChatId(group.id); setShowActiveChat(true); }}
                    >
                      <View style={[styles.avatarBox, { backgroundColor: '#7c3aed' }]}>
                        <AppIcon name="users" size={20} color="#ffffff" />
                      </View>
                      <View style={styles.itemContent}>
                        <View style={styles.itemRow}>
                          <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>{group.name}</Text>
                          <TouchableOpacity onPress={() => togglePinChat(group.id)}>
                            <AppIcon name="pin" size={16} color={isPinned(group.id) ? '#f59e0b' : themeColors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.itemSub, { color: themeColors.textSecondary }]} numberOfLines={1}>
                          {lastInfo.content || 'Group channel'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Direct Messages Section */}
            <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Direct Messages</Text>
            {sortedEmployees.map(emp => {
              const lastInfo = getLastMessageInfo(emp.id);
              const unread = getUnreadCount(emp.id);
              const isEmpOnline = onlineUsersList.includes(String(emp.id).toLowerCase());
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={[
                    styles.chatItem,
                    { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.border },
                    activeChatId === emp.id && [styles.chatItemActive, { backgroundColor: isDark ? '#334155' : '#eff6ff', borderColor: isDark ? '#475569' : '#bfdbfe' }]
                  ]}
                  onPress={() => { setActiveChatId(emp.id); setShowActiveChat(true); }}
                >
                  <View style={[styles.avatarBox, { backgroundColor: '#06b6d4' }]}>
                    <Text style={styles.avatarText}>
                      {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                    {isEmpOnline && (
                      <View style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#10b981',
                        borderWidth: 2,
                        borderColor: themeColors.cardBg || '#ffffff'
                      }} />
                    )}
                  </View>
                  <View style={styles.itemContent}>
                    <View style={styles.itemRow}>
                      <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>{emp.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {unread > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unread}</Text>
                          </View>
                        )}
                        {lastInfo.timeFormatted ? (
                          <Text style={[styles.itemTime, { color: themeColors.textSecondary }]}>{lastInfo.timeFormatted}</Text>
                        ) : null}
                        <TouchableOpacity onPress={() => togglePinChat(emp.id)}>
                          <AppIcon name="pin" size={16} color={isPinned(emp.id) ? '#f59e0b' : themeColors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[styles.itemSub, { color: unread > 0 ? '#0f172a' : themeColors.textSecondary, fontWeight: unread > 0 ? '700' : '400' }]} numberOfLines={1}>
                      {lastInfo.content || `${emp.role} • ${emp.department}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        /* ACTIVE CHAT ROOM VIEW */
        <View style={[styles.roomContainer, { backgroundColor: themeColors.background }]}>
          {selectedMessages.length > 0 ? (
            /* WHATSAPP MULTI-SELECTION HEADER BAR */
            <View style={styles.selectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setSelectedMessages([])}
                  style={styles.backBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <AppIcon name="close" size={20} color="#ffffff" />
                </TouchableOpacity>
                <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginLeft: 12 }}>
                  {selectedMessages.length}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {/* Pin single message */}
                {selectedMessages.length === 1 && (
                  <TouchableOpacity
                    onPress={() => handleTogglePinMessage(selectedMessages[0])}
                    style={styles.headerActionBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  >
                    <AppIcon name="pin" size={18} color={isMessagePinned(selectedMessages[0].id) ? '#f59e0b' : '#ffffff'} />
                  </TouchableOpacity>
                )}

                {/* Copy Message Button (works for single or multiple selection) */}
                <TouchableOpacity
                  onPress={() => handleCopyMessage(selectedMessages)}
                  style={styles.headerActionBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                >
                  <AppIcon name="file" size={18} color="#ffffff" />
                </TouchableOpacity>

                {selectedMessages.length === 1 && (
                  <TouchableOpacity
                    onPress={() => setShowMessageInfoModal(true)}
                    style={styles.headerActionBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  >
                    <AppIcon name="info" size={18} color="#ffffff" />
                  </TouchableOpacity>
                )}

                {/* Multiple & Single Selection Options: Forward & Delete */}
                <TouchableOpacity
                  onPress={handleOpenForwardModal}
                  style={styles.headerActionBtn}
                  activeOpacity={0.7}
                >
                  <AppIcon name="forward" size={18} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleStartDeleting}
                  style={styles.headerActionBtn}
                  activeOpacity={0.7}
                >
                  <AppIcon name="trash" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* STANDARD ROOM HEADER */
            <View style={[styles.roomHeader, { backgroundColor: themeColors.headerBg, borderColor: themeColors.border }]}>
              <TouchableOpacity onPress={() => setShowActiveChat(false)} style={styles.backBtn}>
                <AppIcon name="back" size={20} color={themeColors.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.roomTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>{activeChatTitle}</Text>
                {typingUsers[String(activeChatId).toLowerCase()] ? (
                  <Text style={{ fontSize: 11, color: '#10b981', fontStyle: 'italic' }}>
                    ✍️ {typingUsers[String(activeChatId).toLowerCase()]} is typing...
                  </Text>
                ) : onlineUsersList.includes(String(activeChatId).toLowerCase()) ? (
                  <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '500' }}>
                    🟢 Online
                  </Text>
                ) : lastSeenMap[String(activeChatId).toLowerCase()] ? (
                  <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>
                    Last seen {new Date(lastSeenMap[String(activeChatId).toLowerCase()]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => togglePinChat(activeChatId)} style={styles.headerActionBtn}>
                <AppIcon name="pin" size={18} color={isPinned(activeChatId) ? '#f59e0b' : themeColors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearChatDisplay} style={styles.headerActionBtn}>
                <AppIcon name="trash" size={18} color={themeColors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setDetailsTab('info'); setShowDetailsModal(true); }} style={styles.headerActionBtn}>
                <AppIcon name="info" size={18} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Messages list */}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {activeMessages.length === 0 ? (
              <View style={styles.emptyMessages}>
                <AppIcon name="chat" size={38} color={themeColors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No messages yet. Say hello!</Text>
              </View>
            ) : (
              activeMessages.map(msg => {
                const isOwn = String(msg.senderId).toLowerCase() === String(user?.id || '').toLowerCase();
                const ageMins = (Date.now() - new Date(msg.timestamp).getTime()) / (1000 * 60);
                const canEdit = isOwn && ageMins <= 15 && !msg.deletedForEveryone;
                const isSelected = selectedMessages.some(m => m.id === msg.id);

                return (
                  <TouchableOpacity
                    key={msg.id}
                    activeOpacity={0.9}
                    onLongPress={() => handleToggleSelectMessage(msg)}
                    onPress={() => {
                      if (selectedMessages.length > 0) {
                        handleToggleSelectMessage(msg);
                      }
                    }}
                    style={[
                      styles.msgRowWrapper,
                      isOwn ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                      isSelected && styles.selectedRowWrapper,
                    ]}
                  >
                    {/* Selection Checkmark Badge */}
                    {isSelected && (
                      <View style={styles.rowCheckBadge}>
                        <AppIcon name="check" size={12} color="#ffffff" />
                      </View>
                    )}

                    {!isOwn && (
                      <View style={[styles.msgAvatar, { backgroundColor: '#3b82f6', marginRight: 6 }]}>
                        <Text style={styles.msgAvatarText}>
                          {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.msgBubbleWrapper,
                        isOwn ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
                      ]}
                    >
                      {!isOwn && <Text style={[styles.senderName, { color: isDark ? '#60a5fa' : '#2563eb' }]}>{msg.senderName}</Text>}

                      <View
                        style={[
                          styles.msgBubble,
                          isOwn
                            ? [styles.ownBubble, { backgroundColor: isDark ? '#1d4ed8' : '#2563eb', borderColor: isDark ? '#1e40af' : '#1d4ed8' }]
                            : [styles.otherBubble, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }],
                          isSelected && styles.selectedBubble,
                        ]}
                      >
                        {msg.deletedForEveryone ? (
                          <Text style={[styles.deletedText, { color: themeColors.textSecondary }]}>🚫 This message was deleted</Text>
                        ) : (
                          <>
                            {/* Grouped Media Album Grid Render */}
                            {msg.messageType === 'media_group' ? (
                              (() => {
                                const rawMediaItems = msg.mediaItems || msg.fileUrl;
                                let mediaItems = [];
                                if (Array.isArray(rawMediaItems)) {
                                  mediaItems = rawMediaItems;
                                } else if (typeof rawMediaItems === 'string') {
                                  try {
                                    mediaItems = JSON.parse(rawMediaItems);
                                  } catch (e) {
                                    mediaItems = [];
                                  }
                                }
                                const displayItems = Array.isArray(mediaItems) && mediaItems.length > 0 
                                  ? mediaItems 
                                  : [{ url: msg.fileUrl, name: msg.fileName, type: 'image' }];

                                return (
                                  <View style={styles.mediaGroupContainer}>
                                    <View style={styles.mediaGrid}>
                                      {displayItems.slice(0, 4).map((item, idx) => (
                                        <TouchableOpacity
                                          key={idx}
                                          onPress={() => {
                                            if (idx === 3 && displayItems.length > 4) {
                                              setActiveAlbumMessage({ ...msg, mediaItems: displayItems });
                                            } else if (item.type === 'video') {
                                              setActiveVideoUrl(item.url);
                                            } else if (item.type === 'image' || item.url) {
                                              setActiveImageUrl(item.url);
                                            } else {
                                              handleOpenFile(item.url, item.name);
                                            }
                                          }}
                                          style={styles.mediaGridTile}
                                        >
                                          {(() => {
                                            const resolvedImg = resolveSafeImageUri(item.url);
                                            if ((item.type === 'image' || !item.type) && resolvedImg) {
                                              return <Image source={{ uri: resolvedImg }} style={styles.mediaGridImage} resizeMode="cover" />;
                                            }
                                            return (
                                              <View style={styles.mediaGridPlaceholder}>
                                                <AppIcon name={item.type === 'video' ? 'video' : item.type === 'audio' ? 'mic' : item.type === 'image' ? 'image' : 'file'} size={24} color="#ffffff" />
                                              </View>
                                            );
                                          })()}

                                          {/* Count Badge on 4th item if > 4 */}
                                          {idx === 3 && displayItems.length > 4 && (
                                            <View style={styles.mediaGridOverlay}>
                                              <Text style={styles.mediaGridCountText}>+{displayItems.length - 3}</Text>
                                            </View>
                                          )}
                                        </TouchableOpacity>
                                      ))}
                                    </View>

                                    {msg.content ? (
                                      <View style={{ marginTop: 6 }}>
                                        {renderMessageContent(msg.content, isOwn)}
                                      </View>
                                    ) : null}

                                    {/* View All Media Files Button */}
                                    {displayItems.length > 1 && (
                                      <TouchableOpacity
                                        onPress={() => setActiveAlbumMessage({ ...msg, mediaItems: displayItems })}
                                        style={styles.viewAllAlbumBtn}
                                      >
                                        <Text style={styles.viewAllAlbumText}>
                                          See All ({displayItems.length}) Media Files ➔
                                        </Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                );
                              })()
                            ) : msg.messageType === 'image' && (msg.fileUrl || msg.content?.startsWith('file:') || msg.content?.startsWith('http')) ? (
                              (() => {
                                const resolvedSingleImg = resolveSafeImageUri(msg.fileUrl || msg.content);
                                if (!resolvedSingleImg) {
                                  return (
                                    <View style={[styles.chatMediaImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2c34', borderRadius: 8, padding: 12 }]}>
                                      <AppIcon name="image" size={28} color="#8696a0" />
                                      <Text style={{ color: '#8696a0', fontSize: 11, marginTop: 4 }}>📷 Photo</Text>
                                    </View>
                                  );
                                }
                                return (
                                  <TouchableOpacity
                                    onPress={() => setActiveImageUrl(resolvedSingleImg)}
                                    style={{ marginBottom: 4 }}
                                    activeOpacity={0.85}
                                  >
                                    <Image
                                      source={{ uri: resolvedSingleImg }}
                                      style={styles.chatMediaImage}
                                      resizeMode="cover"
                                    />
                                  </TouchableOpacity>
                                );
                              })()
                            ) : msg.messageType === 'video' ? (
                              /* Video Attachment Card */
                              <TouchableOpacity
                                onPress={() => {
                                  if (msg.fileUrl) {
                                    setActiveVideoUrl(msg.fileUrl);
                                  } else {
                                    handleOpenFile(msg.fileUrl, msg.fileName || 'Video.mp4');
                                  }
                                }}
                                style={[styles.videoCard, { backgroundColor: isOwn ? 'rgba(255,255,255,0.12)' : (isDark ? '#0f172a' : '#f1f5f9') }]}
                              >
                                <View style={styles.videoThumbnailContainer}>
                                  <View style={styles.videoPlayBadge}>
                                    <AppIcon name="play" size={16} color="#ffffff" />
                                  </View>
                                </View>
                                <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <AppIcon name="video" size={14} color={isOwn ? '#ffffff' : themeColors.textPrimary} />
                                  <Text style={{ color: isOwn ? '#ffffff' : themeColors.textPrimary, fontSize: 12, fontWeight: 'bold', flex: 1 }} numberOfLines={1}>
                                    {msg.fileName || 'Video Attachment'}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ) : msg.messageType === 'audio' ? (
                              /* Voice Note Audio Player Render */
                              <View style={[styles.voiceNoteCard, { backgroundColor: isOwn ? 'rgba(255,255,255,0.12)' : (isDark ? '#0f172a' : '#f1f5f9') }]}>
                                <TouchableOpacity
                                  onPress={() => handleTogglePlayAudio(msg)}
                                  style={[styles.voicePlayBtn, { backgroundColor: isOwn ? '#ffffff' : '#2563eb' }]}
                                >
                                  <AppIcon name={playingAudioId === msg.id ? 'pause' : 'play'} size={14} color={isOwn ? '#2563eb' : '#ffffff'} />
                                </TouchableOpacity>

                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  {/* Waveform Graphic */}
                                  <Text style={{ color: playingAudioId === msg.id ? (isOwn ? '#93c5fd' : '#2563eb') : (isOwn ? '#bfdbfe' : themeColors.textSecondary), fontSize: 12, letterSpacing: 2, fontWeight: 'bold' }}>
                                    ıııılıılılıllıılıllı
                                  </Text>
                                  <Text style={{ color: isOwn ? '#dbeafe' : themeColors.textSecondary, fontSize: 10, marginTop: 2 }}>
                                    {msg.content || 'Voice Note'}
                                  </Text>
                                </View>
                              </View>
                            ) : msg.messageType === 'file' ? (
                              /* File / Attachment Card */
                              <TouchableOpacity
                                onPress={() => handleOpenFile(msg.fileUrl, msg.fileName)}
                                style={[
                                  styles.fileCard,
                                  {
                                    backgroundColor: isOwn ? 'rgba(255, 255, 255, 0.15)' : (isDark ? '#0f172a' : '#f1f5f9'),
                                    borderColor: isOwn ? 'rgba(255, 255, 255, 0.25)' : themeColors.border,
                                    borderWidth: 1,
                                  }
                                ]}
                              >
                                <AppIcon name="file" size={20} color={isOwn ? '#ffffff' : '#2563eb'} style={{ marginRight: 8 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: isOwn ? '#ffffff' : themeColors.textPrimary, fontSize: 13, fontWeight: 'bold' }} numberOfLines={1}>
                                    {msg.fileName || 'Attachment'}
                                  </Text>
                                  <Text style={{ color: isOwn ? '#dbeafe' : themeColors.textSecondary, fontSize: 10, marginTop: 2 }}>Tap to open file</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              /* Standard Text Message with clickable links and forwarded badge */
                              renderMessageContent(msg.content, isOwn)
                            )}

                            {/* Bottom Info Bar (Time + Checkmarks + Pin Indicator) */}
                            <View style={styles.bubbleFooter}>
                              {isMessagePinned(msg.id) && <AppIcon name="pin" size={12} color={isOwn ? '#fde047' : '#f59e0b'} style={{ marginRight: 4 }} />}
                              {msg.isEdited ? <Text style={[styles.editedTag, { color: isOwn ? '#bfdbfe' : '#8696a0' }]}>edited • </Text> : null}
                              <Text style={[isOwn ? styles.ownMsgTime : styles.otherMsgTime, { color: isOwn ? '#dbeafe' : themeColors.textSecondary }]}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </Text>
                              {isOwn && <Text style={[styles.checkTicks, { color: '#dbeafe' }]}>  ✓✓</Text>}
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Outgoing User Avatar */}
                    {isOwn && (
                      <View style={[styles.msgAvatar, { backgroundColor: '#1e3a5f', marginLeft: 6 }]}>
                        <Text style={styles.msgAvatarText}>
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'Y'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* WhatsApp Action Input Bar */}
          <View style={[styles.inputBar, { backgroundColor: themeColors.headerBg, borderTopColor: themeColors.border }]}>
            {isRecording ? (
              /* VOICE RECORDING MODE */
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>🔴</Text>
                  <Text style={{ color: '#f85149', fontWeight: 'bold', fontSize: 14 }}>
                    Recording... {Math.floor(recordTime / 60)}:{recordTime % 60 < 10 ? '0' : ''}{recordTime % 60}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={() => setIsRecording(false)} style={{ padding: 6 }}>
                    <AppIcon name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSendVoiceNote} style={styles.sendBtn}>
                    <AppIcon name="send" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* STANDARD INPUT & MEDIA ACTIONS */
              <>
                <TouchableOpacity onPress={() => handlePickDocument([])} style={styles.inputActionBtn}>
                  <AppIcon name="attachment" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCameraClick} style={styles.inputActionBtn}>
                  <AppIcon name="camera" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border }
                  ]}
                  placeholder="Type a message..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={inputText}
                  multiline={true}
                  textAlignVertical="center"
                  onChangeText={(text) => {
                    setInputText(text);
                    if (text.length > 0) {
                      try { sendSocketTyping(activeChatId, user?.name); } catch (e) {}
                    } else {
                      try { sendSocketStopTyping(activeChatId); } catch (e) {}
                    }
                  }}
                />

                {inputText && inputText.length > 0 ? (
                  <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                    <AppIcon name="send" size={18} color="#ffffff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setIsRecording(true)} style={[styles.sendBtn, { backgroundColor: '#3b82f6' }]}>
                    <AppIcon name="mic" size={18} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      )}

      {/* FORWARD MODAL */}
      <Modal visible={showForwardModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Forward Message To...</Text>

            <TextInput
              style={[
                styles.searchInput,
                { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border, marginHorizontal: 0, marginBottom: 10 }
              ]}
              placeholder="Search recipient..."
              placeholderTextColor={themeColors.textSecondary}
              value={forwardSearchQuery}
              onChangeText={setForwardSearchQuery}
            />

            <ScrollView style={{ maxHeight: 280, marginVertical: 6 }}>
              {/* General Office Chat Channel */}
              {'General Office Chat'.toLowerCase().includes(forwardSearchQuery.toLowerCase()) && (
                <TouchableOpacity
                  style={[
                    styles.forwardItem,
                    { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border },
                    forwardTargetId === 'general' && styles.forwardItemActive
                  ]}
                  onPress={() => setForwardTargetId('general')}
                >
                  <Text style={[styles.forwardName, { color: themeColors.textPrimary }]}>🏢 General Office Chat</Text>
                  <Text style={[styles.forwardSub, { color: themeColors.textSecondary }]}>Company-wide channel</Text>
                </TouchableOpacity>
              )}

              {/* Custom Groups */}
              {(groups || []).filter(g => g.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.forwardItem,
                    { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border },
                    forwardTargetId === g.id && styles.forwardItemActive
                  ]}
                  onPress={() => setForwardTargetId(g.id)}
                >
                  <Text style={[styles.forwardName, { color: themeColors.textPrimary }]}>👥 {g.name}</Text>
                  <Text style={[styles.forwardSub, { color: themeColors.textSecondary }]}>Group Chat Channel</Text>
                </TouchableOpacity>
              ))}

              {/* Direct Messages */}
              {sortedEmployees.filter(e => e.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.forwardItem,
                    { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border },
                    forwardTargetId === e.id && styles.forwardItemActive
                  ]}
                  onPress={() => setForwardTargetId(e.id)}
                >
                  <Text style={[styles.forwardName, { color: themeColors.textPrimary }]}>👤 {e.name}</Text>
                  <Text style={[styles.forwardSub, { color: themeColors.textSecondary }]}>{e.role} • {e.department}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowForwardModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmForward}
                disabled={!forwardTargetId}
                style={[styles.modalConfirmBtn, !forwardTargetId && { opacity: 0.5 }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send Forward</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHAT DETAILS & MEDIA MODAL */}
      <Modal visible={showDetailsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%', backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>ℹ️ Conversation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Conversation Header Overview */}
            <View style={{ alignItems: 'center', marginVertical: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
              <View style={[styles.avatarBox, { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2563eb', marginBottom: 8 }]}>
                <Text style={{ fontSize: 22, color: '#fff', fontWeight: 'bold' }}>
                  {activeChatTitle ? activeChatTitle.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
              <Text style={{ color: themeColors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>{activeChatTitle}</Text>
              <Text style={{ color: themeColors.textSecondary, fontSize: 12, marginTop: 3 }}>
                {activeChatId === 'general'
                  ? 'Company-wide announcements'
                  : activeChatId.startsWith('dept_')
                    ? `${activeChatId.replace('dept_', '')} Department`
                    : activeChatId.startsWith('group_')
                      ? 'Group Chat Channel'
                      : 'Direct Message'}
              </Text>
            </View>

            {/* Details Tabs */}
            {(() => {
              const sharedData = getSharedMediaAndFiles();
              return (
                <>
                  <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: themeColors.border, marginBottom: 12 }}>
                    {[
                      { key: 'info', label: 'ℹ️ Info' },
                      { key: 'media', label: `📸 Media (${sharedData.media.length})` },
                      { key: 'docs', label: `📁 Files (${sharedData.docs.length})` },
                      { key: 'links', label: `🔗 Links (${sharedData.links.length})` },
                    ].map(t => (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => setDetailsTab(t.key)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 8,
                          borderBottomWidth: detailsTab === t.key ? 2 : 0,
                          borderBottomColor: '#2563eb',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: detailsTab === t.key ? '#2563eb' : themeColors.textSecondary }}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ScrollView style={{ flex: 1, maxHeight: 260 }}>
                    {detailsTab === 'info' && (
                      <View>
                        {!activeChatId.startsWith('group_') && !activeChatId.startsWith('dept_') && activeChatId !== 'general' ? (() => {
                          const emp = employees.find(e => String(e.id).toLowerCase() === String(activeChatId).toLowerCase());
                          return (
                            <View style={{ gap: 8 }}>
                              <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Role:</Text> {emp?.role || 'Team Member'}</Text>
                              <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Department:</Text> {emp?.department || 'Operations'}</Text>
                              <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Email:</Text> {emp?.email || 'N/A'}</Text>
                            </View>
                          );
                        })() : (
                          <View>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>
                              Channel Members ({sortedEmployees.length})
                            </Text>
                            {sortedEmployees.slice(0, 8).map(e => (
                              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                                <View style={[styles.avatarBox, { width: 24, height: 24, borderRadius: 12, backgroundColor: '#38bdf8', marginRight: 8 }]}>
                                  <Text style={{ fontSize: 10, color: '#fff' }}>{e.name.charAt(0)}</Text>
                                </View>
                                <Text style={{ color: themeColors.textPrimary, fontSize: 12, flex: 1 }}>{e.name}</Text>
                                <Text style={{ color: themeColors.textSecondary, fontSize: 10 }}>{e.role}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Action Buttons */}
                        <TouchableOpacity
                          onPress={() => togglePinChat(activeChatId)}
                          style={{
                            backgroundColor: isPinned(activeChatId) ? 'rgba(245, 158, 11, 0.15)' : (isDark ? '#1e293b' : '#f1f5f9'),
                            borderWidth: 1,
                            borderColor: isPinned(activeChatId) ? '#f59e0b' : themeColors.border,
                            padding: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginTop: 14,
                          }}
                        >
                          <Text style={{ color: isPinned(activeChatId) ? '#f59e0b' : themeColors.textPrimary, fontWeight: 'bold', fontSize: 13 }}>
                            {isPinned(activeChatId) ? '📍 Unpin Conversation' : '📌 Pin Conversation'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            handleClearChatDisplay();
                            setShowDetailsModal(false);
                          }}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            borderWidth: 1,
                            borderColor: '#ef4444',
                            padding: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginTop: 8,
                          }}
                        >
                          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>
                            🧹 Clear Chat Display
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {detailsTab === 'media' && (
                      <View>
                        {sharedData.media.length === 0 ? (
                          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                            <Text style={{ fontSize: 36, marginBottom: 8 }}>🖼️</Text>
                            <Text style={{ color: themeColors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>No shared photos or videos yet.</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                            {sharedData.media.map(m => (
                              <TouchableOpacity
                                key={m.id}
                                onPress={() => {
                                  if (m.type === 'video') {
                                    setActiveVideoUrl(m.fileUrl);
                                  } else {
                                    setActiveImageUrl(m.fileUrl);
                                  }
                                }}
                                style={{
                                  width: 94,
                                  height: 94,
                                  backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  position: 'relative',
                                }}
                              >
                                {(() => {
                                  const resolvedShared = resolveSafeImageUri(m.fileUrl);
                                  if (m.type === 'image' && resolvedShared) {
                                    return (
                                      <Image
                                        source={{ uri: resolvedShared }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                      />
                                    );
                                  }
                                  return (
                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1e293b' : '#cbd5e1' }}>
                                      <Text style={{ fontSize: 28 }}>
                                        {m.type === 'video' ? '🎥' : '🖼️'}
                                      </Text>
                                    </View>
                                  );
                                })()}
                                {m.type === 'video' && (
                                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
                                    <Text style={{ fontSize: 22, color: '#fff' }}>▶️</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {detailsTab === 'docs' && (
                      <View>
                        {sharedData.docs.length === 0 ? (
                          <Text style={{ color: themeColors.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>No shared documents or attachments yet.</Text>
                        ) : (
                          sharedData.docs.map(d => (
                            <View key={d.id} style={{ padding: 10, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: themeColors.border }}>
                              <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: 'bold' }}>📎 {d.fileName}</Text>
                              <Text style={{ color: themeColors.textSecondary, fontSize: 10, marginTop: 2 }}>Sent by {d.senderName}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {detailsTab === 'links' && (
                      <View>
                        {sharedData.links.length === 0 ? (
                          <Text style={{ color: themeColors.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>No shared links or URLs yet.</Text>
                        ) : (
                          sharedData.links.map(l => (
                            <View key={l.id} style={{ padding: 10, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: themeColors.border }}>
                              <Text style={{ color: '#2563eb', fontSize: 12, textDecorationLine: 'underline' }}>🔗 {l.url}</Text>
                              <Text style={{ color: themeColors.textSecondary, fontSize: 10, marginTop: 2 }}>Sent by {l.senderName}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </ScrollView>
                </>
              );
            })()}

            <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: themeColors.textSecondary, fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MESSAGE INFO MODAL */}
      <Modal visible={showMessageInfoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>ℹ️ Message Info</Text>
              <TouchableOpacity onPress={() => setShowMessageInfoModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMessages.length === 1 && selectedMessages[0] && (
              <View style={{ gap: 10, marginVertical: 10 }}>
                <View style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: themeColors.border }}>
                  <Text style={{ color: themeColors.textPrimary, fontSize: 14 }}>{selectedMessages[0].content}</Text>
                </View>

                <View style={{ gap: 6, paddingHorizontal: 4 }}>
                  <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Sender:</Text> {selectedMessages[0].senderName}</Text>
                  <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Delivered Time:</Text> {new Date(selectedMessages[0].timestamp).toLocaleString()}</Text>
                  <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Status:</Text> Delivered ✓✓</Text>
                  {selectedMessages[0].isEdited ? <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: themeColors.textPrimary }}>Edited:</Text> Yes</Text> : null}
                </View>
              </View>
            )}

            <View style={{ marginTop: 14, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowMessageInfoModal(false)} style={styles.modalConfirmBtn}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* IN-APP VIDEO VIEWER MODAL */}
      <Modal visible={!!activeVideoUrl} transparent={false} animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0b141a' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1f2c34' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🎥</Text>
              <Text style={{ color: '#e9edef', fontSize: 16, fontWeight: 'bold' }}>In-App Video Streamer</Text>
            </View>
            <TouchableOpacity onPress={() => { setActiveVideoUrl(null); setIsPlayingVideo(false); }} style={{ padding: 6 }}>
              <Text style={{ color: '#3b82f6', fontSize: 18, fontWeight: 'bold' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b141a', padding: 16 }}>
            {activeVideoUrl ? (
              <View style={{ width: '100%', height: 320, backgroundColor: '#16232b', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3b82f6', padding: 16 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🎬</Text>
                
                <Text style={{ color: '#e9edef', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
                  Video Stream Ready
                </Text>
                <Text style={{ color: '#8696a0', fontSize: 11, textAlign: 'center', marginBottom: 20 }} numberOfLines={2}>
                  {activeVideoUrl}
                </Text>

                <TouchableOpacity
                  onPress={() => setIsPlayingVideo(prev => !prev)}
                  style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 8, marginBottom: 10 }}
                >
                  <Text style={{ fontSize: 28, color: '#fff', marginLeft: isPlayingVideo ? 0 : 3 }}>
                    {isPlayingVideo ? '⏸️' : '▶️'}
                  </Text>
                </TouchableOpacity>

                {isPlayingVideo && (
                  <View style={{ width: '90%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8, marginTop: 10 }}>
                    <Text style={{ color: '#3b82f6', fontSize: 11, fontWeight: 'bold' }}>STREAMING LIVE</Text>
                    <View style={{ flex: 1, height: 4, backgroundColor: '#3b82f6', borderRadius: 2 }} />
                  </View>
                )}
              </View>
            ) : null}

            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => handleOpenFile(activeVideoUrl, 'Video.mp4')}
                style={{ backgroundColor: '#1e3a5f', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>▶️ Launch External Media Player</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MEDIA UPLOAD CONFIRMATION PREVIEW MODAL */}
      <Modal visible={showUploadConfirmModal} transparent={false} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0b141a' }}>
          {/* Header Bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1f2c34' }}>
            <TouchableOpacity
              onPress={() => {
                setShowUploadConfirmModal(false);
                setPendingUploadFiles([]);
                setUploadCaption('');
              }}
              style={{ padding: 6 }}
            >
              <Text style={{ color: '#3b82f6', fontSize: 18, fontWeight: 'bold' }}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={{ color: '#e9edef', fontSize: 15, fontWeight: 'bold' }}>
              Confirm Upload ({pendingUploadFiles.length})
            </Text>
            <TouchableOpacity
              onPress={() => handleAddMoreFiles()}
              style={{ backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>➕ Add More</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Media List Preview Box */}
          <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
            {pendingUploadFiles.map(item => (
              <View key={item.id} style={{ width: '100%', marginBottom: 16, backgroundColor: '#111b21', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2a3942' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1f2c34' }}>
                  <Text style={{ color: '#e9edef', fontSize: 12, fontWeight: 'bold', flex: 1, marginRight: 8 }} numberOfLines={1}>
                    {item.file?.name || 'Media Attachment'}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemovePendingFile(item.id)} style={{ padding: 4 }}>
                    <Text style={{ color: '#f85149', fontSize: 13, fontWeight: 'bold' }}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>

                {(() => {
                  const resolvedPreview = resolveSafeImageUri(item.file?.uri) || (Platform.OS !== 'ios' ? item.file?.uri : null);
                  if (item.isImage && resolvedPreview) {
                    return (
                      <Image
                        source={{ uri: resolvedPreview }}
                        style={{ width: '100%', height: 220 }}
                        resizeMode="contain"
                      />
                    );
                  }
                  return (
                    <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 36, marginBottom: 6 }}>
                        {item.isVideo ? '🎥' : item.isAudio ? '🎙️' : item.isImage ? '📷' : '📄'}
                      </Text>
                      <Text style={{ color: '#8696a0', fontSize: 11 }}>Ready to upload</Text>
                    </View>
                  );
                })()}
              </View>
            ))}

            {/* Optional Caption Input */}
            <View style={{ width: '100%', marginTop: 8 }}>
              <TextInput
                style={{
                  backgroundColor: '#1f2c34',
                  color: '#e9edef',
                  borderRadius: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: '#2a3942',
                }}
                placeholder="Add a caption..."
                placeholderTextColor="#8696a0"
                value={uploadCaption}
                onChangeText={setUploadCaption}
              />
            </View>
          </ScrollView>

          {/* Send Action Bar */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1f2c34', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#e9edef', fontSize: 13, fontWeight: 'bold' }} numberOfLines={1}>
                Sending {pendingUploadFiles.length} file{pendingUploadFiles.length > 1 ? 's' : ''} to: {activeChatTitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleConfirmSendUpload}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 4 }}
            >
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>➤</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ALL MEDIA GALLERY MODAL */}
      <Modal visible={!!activeAlbumMessage} transparent={false} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0b141a' }}>
          {/* Header Bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1f2c34' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🖼️</Text>
              <Text style={{ color: '#e9edef', fontSize: 16, fontWeight: 'bold' }}>
                Media Album ({activeAlbumMessage?.mediaItems?.length || 0} Files)
              </Text>
            </View>
            <TouchableOpacity onPress={() => setActiveAlbumMessage(null)} style={{ padding: 6 }}>
              <Text style={{ color: '#3b82f6', fontSize: 18, fontWeight: 'bold' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Shared Caption Header */}
            {activeAlbumMessage?.content ? (
              <View style={{ backgroundColor: '#1f2c34', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#2a3942' }}>
                <Text style={{ color: '#8696a0', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>SHARED CAPTION</Text>
                <Text style={{ color: '#e9edef', fontSize: 14 }}>{activeAlbumMessage.content}</Text>
              </View>
            ) : null}

            {/* Grid List of All Media Files */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
              {activeAlbumMessage?.mediaItems?.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (item.type === 'video') {
                      setActiveVideoUrl(item.url);
                    } else if (item.type === 'image' || item.url) {
                      setActiveImageUrl(item.url);
                    } else {
                      handleOpenFile(item.url, item.name);
                    }
                  }}
                  style={{ width: '48%', backgroundColor: '#111b21', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#2a3942', marginBottom: 10 }}
                >
                  {(() => {
                    const resolvedGalleryImg = resolveSafeImageUri(item.url);
                    if (item.type === 'image' && resolvedGalleryImg) {
                      return <Image source={{ uri: resolvedGalleryImg }} style={{ width: '100%', height: 140 }} resizeMode="cover" />;
                    }
                    return (
                      <View style={{ height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2c34' }}>
                        <Text style={{ fontSize: 40, marginBottom: 4 }}>
                          {item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📄'}
                        </Text>
                      </View>
                    );
                  })()}
                  <View style={{ padding: 8, backgroundColor: '#1f2c34' }}>
                    <Text style={{ color: '#e9edef', fontSize: 11, fontWeight: 'bold' }} numberOfLines={1}>
                      {item.name || `File ${index + 1}`}
                    </Text>
                    <Text style={{ color: '#3b82f6', fontSize: 10, marginTop: 2 }}>Tap to view</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* IN-APP IMAGE VIEWER MODAL */}
      <Modal visible={!!activeImageUrl} transparent={false} animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Top Bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1f2c34' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>📷</Text>
              <Text style={{ color: '#e9edef', fontSize: 16, fontWeight: 'bold' }}>Image Viewer</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveImageUrl(null)} style={{ padding: 6 }}>
              <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: 'bold' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Full Screen Image Viewport */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            {(() => {
              const resolvedFullImg = resolveSafeImageUri(activeImageUrl);
              if (resolvedFullImg) {
                return (
                  <Image
                    source={{ uri: resolvedFullImg }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                );
              }
              return (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>🖼️</Text>
                  <Text style={{ color: '#8696a0', fontSize: 14 }}>Image preview not available</Text>
                </View>
              );
            })()}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '800',
  },
  listHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  /* LARGE SEARCH BAR */
  largeSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  largeSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    padding: 6,
    marginLeft: 4,
  },
  clearSearchText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: 'bold',
  },

  searchInput: {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginVertical: 3,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  chatItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 16,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  itemTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  pinBadge: {
    fontSize: 12,
  },
  pinIcon: {
    fontSize: 13,
    paddingHorizontal: 4,
  },

  /* ACTIVE CHAT ROOM */
  roomContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    zIndex: 1000,
    elevation: 10,
  },
  selectedBubble: {
    borderWidth: 2,
    borderColor: '#38bdf8',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedRowWrapper: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 8,
    paddingVertical: 4,
  },
  rowCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    alignSelf: 'center',
  },
  rowCheckText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerActionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 24,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  msgRowWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    width: '100%',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    flexShrink: 0,
    backgroundColor: '#eff6ff',
  },
  msgAvatarText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  msgBubbleWrapper: {
    marginBottom: 2,
    maxWidth: '82%',
    flexShrink: 1,
  },
  senderName: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 3,
    marginLeft: 4,
  },
  msgBubble: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  ownBubble: {
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderTopRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopLeftRadius: 2,
  },
  msgText: {
    color: '#0f172a',
    fontSize: 14.5,
    lineHeight: 20,
    flexShrink: 1,
  },
  deletedText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  editedTag: {
    fontSize: 10,
    color: '#8696a0',
    fontStyle: 'italic',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginLeft: 12,
  },
  ownMsgTime: {
    fontSize: 10,
    color: '#64748b',
  },
  otherMsgTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  checkTicks: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  miniDotsBtn: {
    paddingLeft: 6,
    paddingRight: 2,
  },
  miniDotsText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dotsBtnInline: {
    paddingHorizontal: 4,
    paddingVertical: 0,
    marginLeft: 6,
    alignSelf: 'flex-start',
  },
  dotsText: {
    color: '#64748b',
    fontSize: 14,
  },
  menuDropdown: {
    position: 'absolute',
    top: 36,
    right: 8,
    zIndex: 9999,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 140,
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemText: {
    color: '#0f172a',
    fontSize: 13,
  },
  editInput: {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },

  /* MEDIA & VOICE NOTE PLAYER STYLES */
  mediaGroupContainer: {
    maxWidth: 216,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mediaGridTile: {
    width: 104,
    height: 104,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
  },
  mediaGridPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGridCountText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllAlbumBtn: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewAllAlbumText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 'bold',
  },

  chatMediaImage: {
    width: 200,
    height: 160,
    borderRadius: 10,
    marginTop: 2,
  },
  videoCard: {
    width: 200,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 6,
  },
  videoThumbnailContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    minWidth: 180,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    minWidth: 160,
  },

  /* INPUT BAR */
  inputActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 22,
    color: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 14,
  },
  forwardItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  forwardItemActive: {
    borderColor: '#2563eb',
    borderWidth: 1,
    backgroundColor: '#eff6ff',
  },
  forwardName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  forwardSub: {
    color: '#8696a0',
    fontSize: 12,
  },
  modalCancelBtn: {
    padding: 8,
  },
  modalConfirmBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
