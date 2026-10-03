import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { pick } from '@react-native-documents/picker';
import Video from 'react-native-video';
import { useTheme } from '../../utils/ThemeContext';
import { fetchAllClientNotesApi, replyClientNoteApi, getApiUrl } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

const { width } = Dimensions.get('window');

export default function ManageClientNotes({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Reply states per noteId
  const [replyTextMap, setReplyTextMap] = useState({});
  const [replyAttachmentsMap, setReplyAttachmentsMap] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  // Media preview modal
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  // Audio player state & ref
  const audioPlayerRef = useRef(null);
  const [audioPaused, setAudioPaused] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(true);

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isImageUrl = (url) => typeof url === 'string' && /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url);
  const isVideoUrl = (url) => typeof url === 'string' && /\.(mp4|webm|mov|ogg|mkv|3gp|avi)($|\?)/i.test(url);
  const isAudioUrl = (url) => typeof url === 'string' && /\.(mp3|wav|ogg|m4a|aac|flac)($|\?)/i.test(url);

  const loadNotes = async () => {
    try {
      const res = await fetchAllClientNotesApi();
      if (res && res.success) {
        setNotes(res.notes || res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch client notes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const handlePickAttachment = async (noteId) => {
    try {
      const [res] = await pick({
        type: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/plain'],
      });
      if (res && res.uri) {
        setReplyAttachmentsMap(prev => ({
          ...prev,
          [noteId]: [...(prev[noteId] || []), res]
        }));
      }
    } catch (err) {
      if (err.message && !err.message.includes('user canceled')) {
        console.warn('File pick error:', err);
      }
    }
  };

  const handleRemoveAttachment = (noteId, index) => {
    setReplyAttachmentsMap(prev => {
      const updated = [...(prev[noteId] || [])];
      updated.splice(index, 1);
      return { ...prev, [noteId]: updated };
    });
  };

  const handleSendReply = async (noteId) => {
    const replyText = replyTextMap[noteId]?.trim();
    const attachments = replyAttachmentsMap[noteId] || [];

    if (!replyText && attachments.length === 0) {
      sweetAlert({ title: 'Validation', text: 'Please enter a message or select an attachment.', type: 'info' });
      return;
    }

    setSubmittingReplyId(noteId);
    try {
      let attachmentUrls = [];
      if (attachments.length > 0) {
        // Upload attachments
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            type: file.type || 'application/octet-stream',
            name: file.name || `attachment_${Date.now()}`,
          });

          const currentApiUrl = getApiUrl();
          const uploadRes = await fetch(`${currentApiUrl}/api/upload`, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json',
            },
          });
          const uploadData = await uploadRes.json();
          if (uploadData && uploadData.url) {
            attachmentUrls.push(uploadData.url);
          }
        }
      }

      const attachmentStr = attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null;

      const res = await replyClientNoteApi({
        id: noteId,
        tl_reply: replyText,
        tl_attachment: attachmentStr,
        replied_by_name: currentUser?.name || 'Admin',
      });

      if (res && res.success) {
        sweetAlert({ title: 'Success', text: 'Reply sent to client successfully!', type: 'success' });
        setReplyTextMap(prev => ({ ...prev, [noteId]: '' }));
        setReplyAttachmentsMap(prev => ({ ...prev, [noteId]: [] }));
        loadNotes();
      } else {
        sweetAlert({ title: 'Error', text: res?.error || 'Failed to send reply.', type: 'error' });
      }
    } catch (err) {
      sweetAlert({ title: 'Error', text: 'Network connection or upload failure.', type: 'error' });
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const filteredNotes = notes.filter(n => {
    const q = search.toLowerCase();
    return (
      !q ||
      (n.client_id || n.clientId || '').toLowerCase().includes(q) ||
      (n.client_name || n.clientName || '').toLowerCase().includes(q) ||
      (n.note || n.message || '').toLowerCase().includes(q) ||
      (n.tl_reply || '').toLowerCase().includes(q)
    );
  });

  const parseAttachments = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [raw];
    } catch {
      return [raw];
    }
  };

  const styles = getStyles(themeColors, isDark);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 18, color: themeColors.accent || '#3b82f6' }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Client Messages & Notes</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {filteredNotes.length} client discussions across accounts
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}
          onPress={onRefresh}
          disabled={loading || refreshing}
        >
          <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '700' }}>
            {refreshing ? '⟳ ...' : '⟳ Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <Text style={{ fontSize: 14, color: themeColors.textSecondary, marginRight: 6 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: themeColors.textPrimary }]}
          placeholder="Search by client ID, name, message..."
          placeholderTextColor={themeColors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Notes List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: themeColors.textSecondary, marginTop: 12 }}>Loading client messages...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        >
          {filteredNotes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>💬</Text>
              <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Client Notes Found</Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                {search ? 'No discussions match your search query.' : 'There are no notes or messages posted by clients yet.'}
              </Text>
            </View>
          ) : (
            filteredNotes.map((item) => {
              const clientAttach = parseAttachments(item.attachment);
              const tlAttach = parseAttachments(item.tl_attachment);
              const currentPendingAttach = replyAttachmentsMap[item.id] || [];
              const isSending = submittingReplyId === item.id;

              return (
                <View key={item.id} style={[styles.noteCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  {/* Note Header */}
                  <View style={styles.noteHeader}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {(item.client_name || item.client_id || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.clientName, { color: themeColors.textPrimary }]}>
                        {item.client_name || `Client #${item.client_id}`}
                      </Text>
                      <Text style={[styles.noteDate, { color: themeColors.textSecondary }]}>
                        ID: {item.client_id} • 📅 {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: item.tl_reply ? '#dcfce7' : '#fef3c7' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: item.tl_reply ? '#15803d' : '#b45309' }}>
                        {item.tl_reply ? 'Replied' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Client Note Content */}
                  <View style={[styles.noteBubble, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: themeColors.border }]}>
                    <Text style={[styles.noteMessageText, { color: themeColors.textPrimary }]}>
                      {item.note || item.message || '(Empty message)'}
                    </Text>

                    {/* Client Attachments */}
                    {clientAttach.length > 0 && (
                      <View style={styles.attachGrid}>
                        {clientAttach.map((attUrl, aIdx) => (
                          <TouchableOpacity
                            key={aIdx}
                            style={[styles.attachChip, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                            onPress={() => {
                              if (isImageUrl(attUrl) || isVideoUrl(attUrl) || isAudioUrl(attUrl)) {
                                setPreviewAttachmentUrl(attUrl);
                                setPreviewError(false);
                              } else {
                                Linking.openURL(attUrl).catch(() => {});
                              }
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>
                              {isImageUrl(attUrl) ? '🖼️ View Image' : isVideoUrl(attUrl) ? '🎥 Watch Video' : isAudioUrl(attUrl) ? '🎵 Play Audio' : '📎 Open File'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Existing Reply Section */}
                  {item.tl_reply ? (
                    <View style={[styles.replyBox, { backgroundColor: isDark ? '#064e3b22' : '#f0fdf4', borderColor: '#10b981' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 13 }}>💬</Text>
                        <Text style={[styles.replySender, { color: isDark ? '#a7f3d0' : '#065f46' }]}>
                          Reply from {item.replied_by_name || 'Admin / Management'}:
                        </Text>
                      </View>
                      <Text style={[styles.replyBodyText, { color: themeColors.textPrimary }]}>
                        {item.tl_reply}
                      </Text>

                      {/* Reply Attachments */}
                      {tlAttach.length > 0 && (
                        <View style={styles.attachGrid}>
                          {tlAttach.map((attUrl, aIdx) => (
                            <TouchableOpacity
                              key={aIdx}
                              style={[styles.attachChip, { backgroundColor: isDark ? '#064e3b' : '#bbf7d0' }]}
                              onPress={() => {
                                if (isImageUrl(attUrl) || isVideoUrl(attUrl) || isAudioUrl(attUrl)) {
                                  setPreviewAttachmentUrl(attUrl);
                                  setPreviewError(false);
                                } else {
                                  Linking.openURL(attUrl).catch(() => {});
                                }
                              }}
                            >
                              <Text style={{ fontSize: 12 }}>
                                {isImageUrl(attUrl) ? '🖼️ Reply Image' : isVideoUrl(attUrl) ? '🎥 Reply Video' : isAudioUrl(attUrl) ? '🎵 Reply Audio' : '📎 Reply File'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}

                  {/* Reply Input Form */}
                  <View style={[styles.replyInputSection, { borderTopColor: themeColors.border }]}>
                    {/* Selected pending attachments */}
                    {currentPendingAttach.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {currentPendingAttach.map((file, fIdx) => (
                          <View key={fIdx} style={[styles.pendingChip, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
                            <Text style={[styles.pendingChipText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                              📎 {file.name || `File ${fIdx + 1}`}
                            </Text>
                            <TouchableOpacity onPress={() => handleRemoveAttachment(item.id, fIdx)}>
                              <Text style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: 4 }}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput
                        style={[styles.replyTextInput, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: themeColors.textPrimary, borderColor: themeColors.border }]}
                        placeholder={item.tl_reply ? "Update / send another reply..." : "Write reply to client..."}
                        placeholderTextColor={themeColors.textSecondary}
                        value={replyTextMap[item.id] || ''}
                        onChangeText={(val) => setReplyTextMap(prev => ({ ...prev, [item.id]: val }))}
                        multiline
                      />

                      <TouchableOpacity
                        style={[styles.attachBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                        onPress={() => handlePickAttachment(item.id)}
                      >
                        <Text style={{ fontSize: 16 }}>📎</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: '#3b82f6' }]}
                        onPress={() => handleSendReply(item.id)}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.sendBtnText}>Send</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Media Preview Modal */}
      {previewAttachmentUrl && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewAttachmentUrl(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Attachment Preview</Text>
                <TouchableOpacity onPress={() => setPreviewAttachmentUrl(null)} style={styles.closeModalBtn}>
                  <Text style={{ fontSize: 18, color: themeColors.textPrimary }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {isImageUrl(previewAttachmentUrl) ? (
                  <Image
                    source={{ uri: previewAttachmentUrl }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : isVideoUrl(previewAttachmentUrl) ? (
                  <Video
                    source={{ uri: previewAttachmentUrl }}
                    style={styles.previewVideo}
                    controls={true}
                    resizeMode="contain"
                  />
                ) : isAudioUrl(previewAttachmentUrl) ? (
                  <View style={styles.audioPlayerBox}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>🎵</Text>
                    <Text style={[styles.audioLabel, { color: themeColors.textPrimary }]}>Audio Recording</Text>
                    <Video
                      ref={audioPlayerRef}
                      source={{ uri: previewAttachmentUrl }}
                      paused={audioPaused}
                      onLoad={(data) => {
                        setAudioDuration(data.duration);
                        setAudioLoading(false);
                      }}
                      onProgress={(data) => setAudioCurrentTime(data.currentTime)}
                      onEnd={() => {
                        setAudioPaused(true);
                        setAudioCurrentTime(0);
                      }}
                      style={{ width: 0, height: 0 }}
                    />
                    <TouchableOpacity
                      style={styles.audioPlayBtn}
                      onPress={() => setAudioPaused(!audioPaused)}
                    >
                      <Text style={{ fontSize: 22, color: '#fff' }}>{audioPaused ? '▶' : '⏸'}</Text>
                    </TouchableOpacity>
                    <Text style={{ color: themeColors.textSecondary, marginTop: 8 }}>
                      {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={{ fontSize: 36, marginBottom: 10 }}>📄</Text>
                    <Text style={{ color: themeColors.textPrimary, marginBottom: 12 }}>External Document</Text>
                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: '#3b82f6', paddingHorizontal: 20 }]}
                      onPress={() => Linking.openURL(previewAttachmentUrl).catch(() => {})}
                    >
                      <Text style={styles.sendBtnText}>Open in Browser</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function getStyles(colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      gap: 12,
    },
    backBtn: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    refreshBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      padding: 0,
    },
    centerLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
    },
    listScroll: {
      flex: 1,
    },
    emptyCard: {
      padding: 30,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      marginTop: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    noteCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 14,
    },
    noteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    clientAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#06b6d4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clientAvatarText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 15,
    },
    clientName: {
      fontSize: 14.5,
      fontWeight: '800',
    },
    noteDate: {
      fontSize: 11,
      marginTop: 2,
    },
    statusTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    noteBubble: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 10,
    },
    noteMessageText: {
      fontSize: 13,
      lineHeight: 19,
    },
    attachGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    attachChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    replyBox: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
    },
    replySender: {
      fontSize: 12,
      fontWeight: '700',
    },
    replyBodyText: {
      fontSize: 13,
      lineHeight: 18,
    },
    replyInputSection: {
      paddingTop: 10,
      borderTopWidth: 1,
    },
    pendingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      maxWidth: width * 0.7,
    },
    pendingChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    replyTextInput: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 12.5,
      maxHeight: 70,
    },
    attachBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    sendBtnText: {
      color: '#fff',
      fontSize: 12.5,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalBox: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    closeModalBtn: {
      padding: 4,
    },
    modalBody: {
      padding: 16,
      alignItems: 'center',
    },
    previewImage: {
      width: '100%',
      height: 250,
    },
    previewVideo: {
      width: '100%',
      height: 250,
    },
    audioPlayerBox: {
      alignItems: 'center',
      padding: 20,
    },
    audioLabel: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 12,
    },
    audioPlayBtn: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: '#3b82f6',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
