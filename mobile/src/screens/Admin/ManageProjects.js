import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import AppIcon from '../../components/AppIcon';
import { fetchProjectsApi, createProjectApi, fetchClientsApi } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';

export default function ManageProjects({ currentUser, onBack }) {
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);

  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, clientRes] = await Promise.all([
        fetchProjectsApi().catch(() => ({ data: [] })),
        fetchClientsApi().catch(() => ({ clients: [] })),
      ]);

      if (projRes && projRes.success) {
        setProjects(projRes.data || []);
      } else if (Array.isArray(projRes)) {
        setProjects(projRes);
      } else if (projRes && projRes.data) {
        setProjects(projRes.data);
      }

      if (clientRes && clientRes.clients) {
        setClients(clientRes.clients || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      sweetAlert({
        title: 'Error',
        text: 'Failed to load projects list.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenAddModal = () => {
    setProjectName('');
    setClientId('');
    setDescription('');
    setModalVisible(true);
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      sweetAlert({
        title: 'Validation Error',
        text: 'Please enter a project name.',
        type: 'warning',
      });
      return;
    }
    if (!clientId.trim()) {
      sweetAlert({
        title: 'Validation Error',
        text: 'Please specify a Client ID or slug.',
        type: 'warning',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await createProjectApi({
        name: projectName.trim(),
        client_id: clientId.trim(),
        description: description.trim(),
      });

      if (res && res.success) {
        sweetAlert({
          title: 'Success',
          text: 'Project created successfully!',
          type: 'success',
        });
        setModalVisible(false);
        loadData();
      } else {
        sweetAlert({
          title: 'Error',
          text: res?.error || 'Failed to create project.',
          type: 'error',
        });
      }
    } catch (err) {
      sweetAlert({
        title: 'Error',
        text: err.message || 'Network error creating project.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (p.name || '').toLowerCase().includes(q) ||
      (p.client_id || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q);

    if (!matchesQuery) return false;
    if (statusFilter === 'ALL') return true;
    return (p.status || 'Active').toUpperCase() === statusFilter.toUpperCase();
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => (p.status || 'Active').toLowerCase() === 'active' || (p.status || '').toLowerCase() === 'inprogress'
  ).length;
  const completedProjects = projects.filter(
    (p) => (p.status || '').toLowerCase() === 'completed'
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <AppIcon name="arrow-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Projects Portfolio</Text>
          <Text style={styles.headerSub}>Client projects, deliverables & tracking</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
          <AppIcon name="plus" size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
      >
        {/* KPI Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <AppIcon name="folder" size={18} color="#06b6d4" />
            </View>
            <Text style={styles.statValue}>{totalProjects}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <AppIcon name="play" size={18} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{activeProjects}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <AppIcon name="check" size={18} color="#6366f1" />
            </View>
            <Text style={styles.statValue}>{completedProjects}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <AppIcon name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects by name, client..."
            placeholderTextColor={themeColors.textMuted || '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="x" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['ALL', 'ACTIVE', 'COMPLETED', 'ON HOLD'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterPill,
                statusFilter === st && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === st && styles.filterPillTextActive,
                ]}
              >
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Project List */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={{ marginTop: 12, color: themeColors.textSecondary }}>Loading projects...</Text>
          </View>
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppIcon name="folder" size={44} color={themeColors.textMuted || '#94a3b8'} />
            <Text style={styles.emptyTitle}>No Projects Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first project to start tracking deliverables.'}
            </Text>
          </View>
        ) : (
          filteredProjects.map((proj) => {
            const isFinished = (proj.status || '').toLowerCase() === 'completed';
            const badgeColor = isFinished ? '#10b981' : '#06b6d4';
            const badgeBg = isFinished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 182, 212, 0.12)';

            return (
              <View
                key={proj.id || `${proj.name}-${Math.random()}`}
                style={styles.projectCard}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBox}>
                    <AppIcon name="grid" size={18} color="#06b6d4" />
                    <Text style={styles.projectName} numberOfLines={1}>
                      {proj.name}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                      {proj.status || 'Active'}
                    </Text>
                  </View>
                </View>

                {proj.description ? (
                  <Text style={styles.projectDesc} numberOfLines={2}>
                    {proj.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <AppIcon name="users" size={13} color={themeColors.textSecondary} />
                    <Text style={styles.footerText}>
                      Client: {proj.client_id || 'N/A'}
                    </Text>
                  </View>

                  {proj.id ? (
                    <View style={styles.footerItem}>
                      <AppIcon name="tag" size={13} color={themeColors.textSecondary} />
                      <Text style={styles.footerText}>
                        ID: #{proj.id}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Project Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="folder" size={20} color="#06b6d4" />
                <Text style={styles.modalTitle}>Add New Project</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <AppIcon name="x" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.fieldLabel}>Project Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Acme Mobile App Redesign"
                placeholderTextColor={themeColors.textMuted || '#94a3b8'}
                value={projectName}
                onChangeText={setProjectName}
              />

              <Text style={styles.fieldLabel}>Client Slug / ID *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. acme_corp or client username"
                placeholderTextColor={themeColors.textMuted || '#94a3b8'}
                value={clientId}
                onChangeText={setClientId}
              />

              {clients.length > 0 ? (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.subHint}>Quick Select from Active Clients:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {clients.slice(0, 8).map((c) => (
                      <TouchableOpacity
                        key={c.id || c.client_code || c.name}
                        style={[styles.clientChip, clientId === (c.client_code || c.name) && styles.clientChipActive]}
                        onPress={() => setClientId(c.client_code || c.name)}
                      >
                        <Text style={[styles.clientChipText, clientId === (c.client_code || c.name) && styles.clientChipTextActive]}>
                          {c.name || c.client_code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Description & Scope</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Deliverables, scope, milestones..."
                placeholderTextColor={themeColors.textMuted || '#94a3b8'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSubmit}
                onPress={handleSaveProject}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Create Project</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (themeColors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.card,
    },
    backBtn: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    headerSub: {
      fontSize: 12,
      marginTop: 2,
      color: themeColors.textSecondary,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#06b6d4',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 4,
    },
    addBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    statIconBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    statLabel: {
      fontSize: 11,
      marginTop: 2,
      fontWeight: '500',
      color: themeColors.textSecondary,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
      gap: 8,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: themeColors.textPrimary,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    filterPill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    filterPillActive: {
      backgroundColor: '#06b6d4',
      borderColor: '#06b6d4',
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    filterPillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    centerContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyCard: {
      padding: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      marginTop: 12,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 12,
      color: themeColors.textPrimary,
    },
    emptySub: {
      fontSize: 13,
      textAlign: 'center',
      marginTop: 6,
      color: themeColors.textSecondary,
    },
    projectCard: {
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 12,
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardTitleBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      marginRight: 8,
    },
    projectName: {
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
      color: themeColors.textPrimary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    projectDesc: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
      color: themeColors.textSecondary,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerText: {
      fontSize: 12,
      color: themeColors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 20,
    },
    modalBox: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      maxHeight: '90%',
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6,
      marginTop: 10,
      color: themeColors.textPrimary,
    },
    subHint: {
      fontSize: 12,
      color: themeColors.textSecondary,
    },
    clientChip: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      marginRight: 6,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    clientChipActive: {
      backgroundColor: '#06b6d4',
    },
    clientChipText: {
      fontSize: 11,
      color: themeColors.textSecondary,
    },
    clientChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    modalInput: {
      height: 44,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 14,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderColor: themeColors.border,
      color: themeColors.textPrimary,
    },
    textArea: {
      height: 90,
      paddingTop: 10,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    modalBtnCancel: {
      flex: 1,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
    },
    modalBtnCancelText: {
      color: themeColors.textSecondary,
      fontWeight: '600',
    },
    modalBtnSubmit: {
      flex: 1,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#06b6d4',
    },
    modalBtnSubmitText: {
      color: '#ffffff',
      fontWeight: '700',
    },
  });
