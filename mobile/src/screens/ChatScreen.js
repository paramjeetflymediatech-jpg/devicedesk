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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundPlayer from 'react-native-sound-player';
import { getEmployees, getSystems, subscribe } from '../store/store';
import { getApiUrl } from '../utils/api';
import { pick } from '@react-native-documents/picker';

export default function ChatScreen({ user, onBack }) {
  const [activeChatId, setActiveChatId] = useState('general');
  const [showActiveChat, setShowActiveChat] = useState(false); // Mobile toggle between list & room
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Groups state
  const [groups, setGroups] = useState([]);

  // Pinned chats state
  const [pinnedChats, setPinnedChats] = useState([]);
  
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
      try {
        if (msg.fileUrl && (msg.fileUrl.startsWith('http://') || msg.fileUrl.startsWith('https://'))) {
          await SoundPlayer.playUrl(msg.fileUrl);
        }
      } catch (e) {
        // Safe catch for local content URI or player exception
      }
      setTimeout(() => {
        setPlayingAudioId(prev => prev === msg.id ? null : prev);
      }, 5000);
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

  // Load messages from server
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
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

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
  const handleClearChatDisplay = async () => {
    const nowIso = new Date().toISOString();
    const updated = { ...clearedChats, [String(activeChatId).toLowerCase()]: nowIso };
    setClearedChats(updated);
    try {
      await AsyncStorage.setItem(`devicedesk_cleared_chats_${user?.id}`, JSON.stringify(updated));
    } catch (e) {}
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

    const caption = uploadCaption.trim();

    if (filesToSend.length > 1) {
      // GROUPED MEDIA ALBUM BATCH
      const mediaItems = filesToSend.map(item => ({
        url: item.file.uri,
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

      const newMsg = {
        id: `msg_${Date.now()}`,
        senderId: user?.id || 'anonymous',
        senderName: user?.name || 'User',
        receiverId: activeChatId,
        content: finalContent,
        messageType: msgType,
        fileUrl: file.uri,
        fileName: file.name,
        fileSize: file.size,
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
    }

    setPendingUploadFiles([]);
    setUploadCaption('');
    setUploading(false);
  };

  // Handle Send Voice Note
  const handleSendVoiceNote = async () => {
    setIsRecording(false);
    const mins = Math.floor(recordTime / 60);
    const secs = recordTime % 60;
    const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || 'anonymous',
      senderName: user?.name || 'User',
      receiverId: activeChatId,
      content: `🎙️ Voice Note (${durStr})`,
      messageType: 'audio',
      fileName: `Voice Note (${durStr}).webm`,
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

  // Send Message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || 'anonymous',
      senderName: user?.name || 'User',
      receiverId: activeChatId,
      content: inputText.trim(),
      messageType: 'text',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

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
    if (!editingText.trim()) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editingText.trim(), isEdited: 1 } : m));
    setEditingMessageId(null);
    setEditingText('');

    try {
      await fetch(`${getApiUrl()}/api/chat`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
        },
        body: JSON.stringify({ messageId: msgId, content: editingText.trim(), action: 'editMessage' }),
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

  // Copy Message Content
  const handleCopyMessage = (msg) => {
    if (!msg || !msg.content) return;
    Alert.alert('Message Copied', 'Message content copied to clipboard.');
    setSelectedMessages([]);
  };

  // Handle Multi / Single Delete Action
  const handleStartDeleting = () => {
    if (selectedMessages.length === 0) return;
    const targets = [...selectedMessages];

    Alert.alert(
      'Delete Messages',
      `Delete ${targets.length} selected message${targets.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const targetIds = targets.map(m => m.id);
            setMessages(prev => prev.filter(m => !targetIds.includes(m.id)));
            setSelectedMessages([]);

            for (const msg of targets) {
              try {
                await fetch(`${getApiUrl()}/api/chat`, {
                  method: 'DELETE',
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
            try {
              await fetch(`${getApiUrl()}/api/chat`, {
                method: 'DELETE',
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
            try {
              await fetch(`${getApiUrl()}/api/chat`, {
                method: 'DELETE',
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
            try {
              await fetch(`${getApiUrl()}/api/chat`, {
                method: 'DELETE',
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
    if (String(emp.id).toLowerCase() === String(user?.id || '').toLowerCase()) return false;
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
    <SafeAreaView style={styles.container}>
      {!showActiveChat ? (
        /* CONVERSATION LIST VIEW */
        <View style={styles.listContainer}>
          {/* Large Prominent Search Bar with Clear Icon */}
          <View style={styles.largeSearchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.largeSearchInput}
              placeholder="Search chats or team members..."
              placeholderTextColor="#8696a0"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
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
                style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeFilter === f.id && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scrollList}>
            {/* Channels Section */}
            <Text style={styles.sectionHeader}>Channels</Text>

            <TouchableOpacity
              style={[styles.chatItem, activeChatId === 'general' && styles.chatItemActive]}
              onPress={() => { setActiveChatId('general'); setShowActiveChat(true); }}
            >
              <View style={[styles.avatarBox, { backgroundColor: '#4f46e5' }]}>
                <Text style={styles.avatarText}>🏢</Text>
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>General Office Chat</Text>
                  {isPinned('general') && <Text style={styles.pinBadge}>📌</Text>}
                </View>
                <Text style={styles.itemSub}>Company-wide channel</Text>
              </View>
            </TouchableOpacity>

            {/* Custom Groups Section */}
            {sortedGroups.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Group Chats</Text>
                {sortedGroups.map(group => {
                  const lastInfo = getLastMessageInfo(group.id);
                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.chatItem, activeChatId === group.id && styles.chatItemActive]}
                      onPress={() => { setActiveChatId(group.id); setShowActiveChat(true); }}
                    >
                      <View style={[styles.avatarBox, { backgroundColor: '#7c3aed' }]}>
                        <Text style={styles.avatarText}>👥</Text>
                      </View>
                      <View style={styles.itemContent}>
                        <View style={styles.itemRow}>
                          <Text style={styles.itemName}>{group.name}</Text>
                          <TouchableOpacity onPress={() => togglePinChat(group.id)}>
                            <Text style={styles.pinIcon}>{isPinned(group.id) ? '📍' : '📌'}</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.itemSub} numberOfLines={1}>
                          {lastInfo.content || 'Group channel'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Direct Messages Section */}
            <Text style={styles.sectionHeader}>Direct Messages</Text>
            {sortedEmployees.map(emp => {
              const lastInfo = getLastMessageInfo(emp.id);
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={[styles.chatItem, activeChatId === emp.id && styles.chatItemActive]}
                  onPress={() => { setActiveChatId(emp.id); setShowActiveChat(true); }}
                >
                  <View style={[styles.avatarBox, { backgroundColor: '#06b6d4' }]}>
                    <Text style={styles.avatarText}>
                      {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={styles.itemContent}>
                    <View style={styles.itemRow}>
                      <Text style={styles.itemName}>{emp.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {lastInfo.timeFormatted ? (
                          <Text style={styles.itemTime}>{lastInfo.timeFormatted}</Text>
                        ) : null}
                        <TouchableOpacity onPress={() => togglePinChat(emp.id)}>
                          <Text style={styles.pinIcon}>{isPinned(emp.id) ? '📍' : '📌'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemSub} numberOfLines={1}>
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
        <View style={styles.roomContainer}>
          {selectedMessages.length > 0 ? (
            /* WHATSAPP MULTI-SELECTION HEADER BAR */
            <View style={styles.selectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setSelectedMessages([])}
                  style={styles.backBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={{ color: '#3b82f6', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
                <Text style={{ color: '#e9edef', fontSize: 17, fontWeight: 'bold', marginLeft: 12 }}>
                  {selectedMessages.length}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {/* Single Selection Only Options */}
                {selectedMessages.length === 1 && (
                  <>
                    <TouchableOpacity
                      onPress={() => handleTogglePinMessage(selectedMessages[0])}
                      style={styles.headerActionBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    >
                      <Text style={{ fontSize: 18 }}>{isMessagePinned(selectedMessages[0].id) ? '📍' : '📌'}</Text>
                    </TouchableOpacity>

                    {/* Copy Message - ONLY SHOW FOR TEXT MESSAGES */}
                    {(!selectedMessages[0].messageType || selectedMessages[0].messageType === 'text') && (
                      <TouchableOpacity
                        onPress={() => handleCopyMessage(selectedMessages[0])}
                        style={styles.headerActionBtn}
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 18 }}>📋</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => setShowMessageInfoModal(true)}
                      style={styles.headerActionBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    >
                      <Text style={{ fontSize: 18 }}>ℹ️</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Multiple & Single Selection Options: Forward & Delete */}
                <TouchableOpacity
                  onPress={handleOpenForwardModal}
                  style={styles.headerActionBtn}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20 }}>↪️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleStartDeleting}
                  style={styles.headerActionBtn}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* STANDARD ROOM HEADER */
            <View style={styles.roomHeader}>
              <TouchableOpacity onPress={() => setShowActiveChat(false)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>⬅️</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.roomTitle} numberOfLines={1}>{activeChatTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => togglePinChat(activeChatId)} style={styles.headerActionBtn}>
                <Text style={{ fontSize: 16 }}>{isPinned(activeChatId) ? '📍' : '📌'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearChatDisplay} style={styles.headerActionBtn}>
                <Text style={{ fontSize: 16 }}>🧹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setDetailsTab('info'); setShowDetailsModal(true); }} style={styles.headerActionBtn}>
                <Text style={{ fontSize: 16 }}>ℹ️</Text>
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
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                <Text style={{ color: '#8b949e', fontSize: 13 }}>No messages yet. Say hello!</Text>
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
                        <Text style={styles.rowCheckText}>✓</Text>
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
                      {!isOwn && <Text style={styles.senderName}>{msg.senderName}</Text>}

                      <View
                        style={[
                          styles.msgBubble,
                          isOwn ? styles.ownBubble : styles.otherBubble,
                          isSelected && styles.selectedBubble,
                        ]}
                      >
                        {msg.deletedForEveryone ? (
                          <Text style={styles.deletedText}>🚫 This message was deleted</Text>
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
                                          {item.type === 'image' || !item.type ? (
                                            <Image source={{ uri: item.url }} style={styles.mediaGridImage} resizeMode="cover" />
                                          ) : (
                                            <View style={styles.mediaGridPlaceholder}>
                                              <Text style={{ fontSize: 24 }}>{item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📄'}</Text>
                                            </View>
                                          )}

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
                                      <Text style={[styles.msgText, { marginTop: 6 }]}>
                                        {msg.content}
                                      </Text>
                                    ) : null}

                                    {/* View All Media Files Button */}
                                    {displayItems.length > 1 && (
                                      <TouchableOpacity
                                        onPress={() => setActiveAlbumMessage({ ...msg, mediaItems: displayItems })}
                                        style={styles.viewAllAlbumBtn}
                                      >
                                        <Text style={styles.viewAllAlbumText}>
                                          🖼️ See All ({displayItems.length}) Media Files ➔
                                        </Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                );
                              })()
                            ) : msg.messageType === 'image' && (msg.fileUrl || msg.content?.startsWith('file:')) ? (
                              <TouchableOpacity
                                onPress={() => setActiveImageUrl(msg.fileUrl || msg.content)}
                                style={{ marginBottom: 4 }}
                                activeOpacity={0.85}
                              >
                                <Image
                                  source={{ uri: msg.fileUrl || msg.content }}
                                  style={styles.chatMediaImage}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
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
                                style={styles.videoCard}
                              >
                                <View style={styles.videoThumbnailContainer}>
                                  <View style={styles.videoPlayBadge}>
                                    <Text style={{ fontSize: 18, color: '#fff' }}>▶️</Text>
                                  </View>
                                </View>
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ color: '#e9edef', fontSize: 12, fontWeight: 'bold' }} numberOfLines={1}>
                                    🎥 {msg.fileName || 'Video Attachment'}
                                  </Text>
                                  <Text style={{ color: '#3b82f6', fontSize: 10, fontWeight: 'bold' }}>Tap to play video ▶️</Text>
                                </View>
                              </TouchableOpacity>
                            ) : msg.messageType === 'audio' ? (
                              /* Voice Note Audio Player Render */
                              <View style={styles.voiceNoteCard}>
                                <TouchableOpacity
                                  onPress={() => handleTogglePlayAudio(msg)}
                                  style={styles.voicePlayBtn}
                                >
                                  <Text style={{ color: '#fff', fontSize: 14 }}>
                                    {playingAudioId === msg.id ? '⏸️' : '▶️'}
                                  </Text>
                                </TouchableOpacity>

                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  {/* Waveform Graphic */}
                                  <Text style={{ color: playingAudioId === msg.id ? '#3b82f6' : '#8696a0', fontSize: 12, letterSpacing: 2, fontWeight: 'bold' }}>
                                    ıııılıılılıllıılıllı
                                  </Text>
                                  <Text style={{ color: '#8696a0', fontSize: 10, marginTop: 2 }}>
                                    {msg.content || 'Voice Note'}
                                  </Text>
                                </View>
                              </View>
                            ) : msg.messageType === 'file' ? (
                              /* File / Attachment Card */
                              <TouchableOpacity
                                onPress={() => handleOpenFile(msg.fileUrl, msg.fileName)}
                                style={styles.fileCard}
                              >
                                <Text style={{ fontSize: 20, marginRight: 8 }}>📄</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: '#e9edef', fontSize: 13, fontWeight: 'bold' }} numberOfLines={1}>
                                    {msg.fileName || 'Attachment'}
                                  </Text>
                                  <Text style={{ color: '#8696a0', fontSize: 10 }}>Tap to open file</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              /* Standard Text Message */
                              <Text style={styles.msgText}>
                                {msg.content}
                              </Text>
                            )}

                            {/* Bottom Info Bar (Time + Checkmarks + Pin Indicator) */}
                            <View style={styles.bubbleFooter}>
                              {isMessagePinned(msg.id) && <Text style={{ fontSize: 11, color: '#ffd700', marginRight: 4 }}>📌</Text>}
                              {msg.isEdited ? <Text style={styles.editedTag}>edited • </Text> : null}
                              <Text style={isOwn ? styles.ownMsgTime : styles.otherMsgTime}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </Text>
                              {isOwn && <Text style={styles.checkTicks}>  ✓✓</Text>}
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
          <View style={styles.inputBar}>
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
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSendVoiceNote} style={styles.sendBtn}>
                    <Text style={styles.sendBtnText}>➤</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* STANDARD INPUT & MEDIA ACTIONS */
              <>
                <TouchableOpacity onPress={() => handlePickDocument([])} style={styles.inputActionBtn}>
                  <Text style={{ fontSize: 18 }}>📎</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handlePickDocument(['image/*'])} style={styles.inputActionBtn}>
                  <Text style={{ fontSize: 18 }}>📷</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#8696a0"
                  value={inputText}
                  onChangeText={setInputText}
                />

                {inputText.trim().length > 0 ? (
                  <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                    <Text style={styles.sendBtnText}>➤</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setIsRecording(true)} style={[styles.sendBtn, { backgroundColor: '#3b82f6' }]}>
                    <Text style={{ fontSize: 18 }}>🎙️</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Forward Message To...</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search recipient..."
              placeholderTextColor="#8b949e"
              value={forwardSearchQuery}
              onChangeText={setForwardSearchQuery}
            />

            <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
              {/* General Office Chat Channel */}
              {'General Office Chat'.toLowerCase().includes(forwardSearchQuery.toLowerCase()) && (
                <TouchableOpacity
                  style={[styles.forwardItem, forwardTargetId === 'general' && styles.forwardItemActive]}
                  onPress={() => setForwardTargetId('general')}
                >
                  <Text style={styles.forwardName}>🏢 General Office Chat</Text>
                  <Text style={styles.forwardSub}>Company-wide channel</Text>
                </TouchableOpacity>
              )}

              {/* Custom Groups */}
              {(groups || []).filter(g => g.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.forwardItem, forwardTargetId === g.id && styles.forwardItemActive]}
                  onPress={() => setForwardTargetId(g.id)}
                >
                  <Text style={styles.forwardName}>👥 {g.name}</Text>
                  <Text style={styles.forwardSub}>Group Chat Channel</Text>
                </TouchableOpacity>
              ))}

              {/* Direct Messages */}
              {sortedEmployees.filter(e => e.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.forwardItem, forwardTargetId === e.id && styles.forwardItemActive]}
                  onPress={() => setForwardTargetId(e.id)}
                >
                  <Text style={styles.forwardName}>👤 {e.name}</Text>
                  <Text style={styles.forwardSub}>{e.role} • {e.department}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowForwardModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: '#8b949e' }}>Cancel</Text>
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
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>ℹ️ Conversation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: '#8b949e', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Conversation Header Overview */}
            <View style={{ alignItems: 'center', marginVertical: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#30363d' }}>
              <View style={[styles.avatarBox, { width: 50, height: 50, borderRadius: 12, backgroundColor: '#0284c7', marginBottom: 6 }]}>
                <Text style={{ fontSize: 22, color: '#fff', fontWeight: 'bold' }}>
                  {activeChatTitle ? activeChatTitle.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
              <Text style={{ color: '#f0f6fc', fontSize: 16, fontWeight: 'bold' }}>{activeChatTitle}</Text>
              <Text style={{ color: '#8b949e', fontSize: 12, marginTop: 2 }}>
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
                  <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#30363d', marginBottom: 12 }}>
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
                          borderBottomColor: '#38bdf8',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: detailsTab === t.key ? '#38bdf8' : '#8b949e' }}>
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
                              <Text style={{ color: '#8b949e', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#c9d1d9' }}>Role:</Text> {emp?.role || 'Team Member'}</Text>
                              <Text style={{ color: '#8b949e', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#c9d1d9' }}>Department:</Text> {emp?.department || 'Operations'}</Text>
                              <Text style={{ color: '#8b949e', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#c9d1d9' }}>Email:</Text> {emp?.email || 'N/A'}</Text>
                            </View>
                          );
                        })() : (
                          <View>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#8b949e', textTransform: 'uppercase', marginBottom: 6 }}>
                              Channel Members ({employees.length})
                            </Text>
                            {employees.slice(0, 8).map(e => (
                              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                                <View style={[styles.avatarBox, { width: 24, height: 24, borderRadius: 6, backgroundColor: '#38bdf8', marginRight: 8 }]}>
                                  <Text style={{ fontSize: 10, color: '#fff' }}>{e.name.charAt(0)}</Text>
                                </View>
                                <Text style={{ color: '#c9d1d9', fontSize: 12, flex: 1 }}>{e.name}</Text>
                                <Text style={{ color: '#8b949e', fontSize: 10 }}>{e.role}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Action Buttons */}
                        <TouchableOpacity
                          onPress={() => togglePinChat(activeChatId)}
                          style={{
                            backgroundColor: isPinned(activeChatId) ? 'rgba(255, 215, 0, 0.15)' : '#21262d',
                            borderWidth: 1,
                            borderColor: isPinned(activeChatId) ? '#ffd700' : '#30363d',
                            padding: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginTop: 14,
                          }}
                        >
                          <Text style={{ color: isPinned(activeChatId) ? '#ffd700' : '#c9d1d9', fontWeight: 'bold', fontSize: 13 }}>
                            {isPinned(activeChatId) ? '📍 Unpin Conversation' : '📌 Pin Conversation'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            handleClearChatDisplay();
                            setShowDetailsModal(false);
                          }}
                          style={{
                            backgroundColor: 'rgba(248, 81, 73, 0.15)',
                            borderWidth: 1,
                            borderColor: '#f85149',
                            padding: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginTop: 8,
                          }}
                        >
                          <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 13 }}>
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
                            <Text style={{ color: '#8b949e', fontSize: 13, fontStyle: 'italic' }}>No shared photos or videos yet.</Text>
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
                                  backgroundColor: '#111b21',
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  position: 'relative',
                                }}
                              >
                                {m.type === 'image' && m.fileUrl ? (
                                  <Image
                                    source={{ uri: m.fileUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2c34' }}>
                                    <Text style={{ fontSize: 28 }}>
                                      {m.type === 'video' ? '🎥' : '🖼️'}
                                    </Text>
                                  </View>
                                )}
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
                          <Text style={{ color: '#8b949e', fontSize: 12, fontStyle: 'italic' }}>No shared documents or attachments yet.</Text>
                        ) : (
                          sharedData.docs.map(d => (
                            <View key={d.id} style={{ padding: 8, backgroundColor: '#0d1117', borderRadius: 6, marginBottom: 6 }}>
                              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>📎 {d.fileName}</Text>
                              <Text style={{ color: '#8b949e', fontSize: 10 }}>Sent by {d.senderName}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {detailsTab === 'links' && (
                      <View>
                        {sharedData.links.length === 0 ? (
                          <Text style={{ color: '#8b949e', fontSize: 12, fontStyle: 'italic' }}>No shared links or URLs yet.</Text>
                        ) : (
                          sharedData.links.map(l => (
                            <View key={l.id} style={{ padding: 8, backgroundColor: '#0d1117', borderRadius: 6, marginBottom: 6 }}>
                              <Text style={{ color: '#38bdf8', fontSize: 12, textDecorationLine: 'underline' }}>🔗 {l.url}</Text>
                              <Text style={{ color: '#8b949e', fontSize: 10 }}>Sent by {l.senderName}</Text>
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
                <Text style={{ color: '#8b949e', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MESSAGE INFO MODAL */}
      <Modal visible={showMessageInfoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>ℹ️ Message Info</Text>
              <TouchableOpacity onPress={() => setShowMessageInfoModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: '#8b949e', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMessages.length === 1 && selectedMessages[0] && (
              <View style={{ gap: 10, marginVertical: 10 }}>
                <View style={{ backgroundColor: '#202c33', padding: 12, borderRadius: 10 }}>
                  <Text style={{ color: '#e9edef', fontSize: 14 }}>{selectedMessages[0].content}</Text>
                </View>

                <View style={{ gap: 6, paddingHorizontal: 4 }}>
                  <Text style={{ color: '#8696a0', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#e9edef' }}>Sender:</Text> {selectedMessages[0].senderName}</Text>
                  <Text style={{ color: '#8696a0', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#e9edef' }}>Delivered Time:</Text> {new Date(selectedMessages[0].timestamp).toLocaleString()}</Text>
                  <Text style={{ color: '#8696a0', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#e9edef' }}>Status:</Text> Delivered ✓✓</Text>
                  {selectedMessages[0].isEdited ? <Text style={{ color: '#8696a0', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#e9edef' }}>Edited:</Text> Yes</Text> : null}
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

                {item.isImage ? (
                  <Image
                    source={{ uri: item.file.uri }}
                    style={{ width: '100%', height: 220 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 36, marginBottom: 6 }}>
                      {item.isVideo ? '🎥' : item.isAudio ? '🎙️' : '📄'}
                    </Text>
                    <Text style={{ color: '#8696a0', fontSize: 11 }}>Ready to upload</Text>
                  </View>
                )}
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
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.url }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                  ) : (
                    <View style={{ height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2c34' }}>
                      <Text style={{ fontSize: 40, marginBottom: 4 }}>
                        {item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📄'}
                      </Text>
                    </View>
                  )}
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
              <Text style={{ color: '#3b82f6', fontSize: 18, fontWeight: 'bold' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Full Screen Image Viewport */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            {activeImageUrl ? (
              <Image
                source={{ uri: activeImageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141a', // WhatsApp Deep Dark Background
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f2c34', // WhatsApp Teal-Dark Header
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    color: '#3b82f6', // WhatsApp Green Accent
    fontSize: 18,
    fontWeight: 'bold',
  },
  listHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#e9edef',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111b21',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#202c33',
  },
  filterChipActive: {
    backgroundColor: '#1e3a5f',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8696a0',
  },
  filterChipTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  /* LARGE SEARCH BAR */
  largeSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202c33', // WhatsApp Dark Search Pill
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 12,
    marginTop: -28,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a3942',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  largeSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#e9edef',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    padding: 6,
    marginLeft: 4,
  },
  clearSearchText: {
    color: '#8696a0',
    fontSize: 16,
    fontWeight: 'bold',
  },

  searchInput: {
    backgroundColor: '#161b22',
    color: '#f0f6fc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8696a0',
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
    borderRadius: 12,
    marginVertical: 3,
    backgroundColor: '#111b21',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2c34',
  },
  chatItemActive: {
    backgroundColor: '#2a3942',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22, // Circular avatars like WhatsApp
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
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
    fontWeight: '600',
    color: '#e9edef',
  },
  itemSub: {
    fontSize: 13,
    color: '#8696a0',
    marginTop: 3,
  },
  itemTime: {
    fontSize: 11,
    color: '#8696a0',
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
    backgroundColor: '#0b141a',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1f2c34', // WhatsApp Top Bar
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1f2c34', // WhatsApp Selection Header
    borderBottomWidth: 1,
    borderBottomColor: '#3b82f6',
    zIndex: 1000,
    elevation: 10,
  },
  selectedBubble: {
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  selectedRowWrapper: {
    backgroundColor: '#102a24', // WhatsApp Full-Width Emerald Row Highlight
    borderRadius: 8,
    paddingVertical: 4,
  },
  rowCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    alignSelf: 'center',
  },
  rowCheckText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e9edef',
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
  },
  msgAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  msgBubbleWrapper: {
    marginBottom: 2,
    maxWidth: '82%',
    flexShrink: 1,
  },
  senderName: {
    fontSize: 11,
    color: '#25d366', // WhatsApp Sender Name Accent
    fontWeight: 'bold',
    marginBottom: 3,
    marginLeft: 4,
  },
  msgBubble: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  ownBubble: {
    backgroundColor: '#1e3a5f', // DeviceDesk Blue Outgoing
    borderTopRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#1e293b', // DeviceDesk Dark Incoming
    borderTopLeftRadius: 2,
  },
  msgText: {
    color: '#e9edef',
    fontSize: 14.5,
    lineHeight: 20,
    flexShrink: 1,
  },
  deletedText: {
    color: '#8696a0',
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
    color: '#aebac1',
  },
  otherMsgTime: {
    fontSize: 10,
    color: '#8696a0',
  },
  checkTicks: {
    fontSize: 11,
    color: '#53bdeb', // WhatsApp Blue Ticks
    fontWeight: 'bold',
  },
  miniDotsBtn: {
    paddingLeft: 6,
    paddingRight: 2,
  },
  miniDotsText: {
    color: '#8696a0',
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
    color: '#8696a0',
    fontSize: 14,
  },
  menuDropdown: {
    position: 'absolute',
    top: 36,
    right: 8,
    zIndex: 9999,
    backgroundColor: '#233138',
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 140,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#344651',
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemText: {
    color: '#e9edef',
    fontSize: 13,
  },
  editInput: {
    backgroundColor: '#111b21',
    color: '#e9edef',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
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
    backgroundColor: '#111b21',
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGridCountText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllAlbumBtn: {
    marginTop: 8,
    backgroundColor: '#1f2c34',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2a3942',
  },
  viewAllAlbumText: {
    color: '#3b82f6',
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
    backgroundColor: '#111b21',
    borderRadius: 10,
    padding: 6,
  },
  videoThumbnailContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#1f2c34',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 168, 132, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#111b21',
    borderRadius: 20,
    minWidth: 180,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111b21',
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
    backgroundColor: '#1f2c34', // WhatsApp Footer Bar
    borderTopWidth: 1,
    borderTopColor: '#222d34',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a3942', // WhatsApp Pill Input
    borderRadius: 22,
    color: '#e9edef',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#3b82f6', // WhatsApp Emerald Green Action Circle
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 26, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111b21',
    borderWidth: 1,
    borderColor: '#222d34',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 14,
  },
  forwardItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#202c33',
    marginBottom: 6,
  },
  forwardItemActive: {
    borderColor: '#3b82f6',
    borderWidth: 1,
    backgroundColor: '#1e3a5f',
  },
  forwardName: {
    color: '#e9edef',
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
});
