import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Share,
  Linking,
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';
import { pick } from '@react-native-documents/picker';
import * as XLSX from 'xlsx';
import {
  getSystems,
  getEmployees,
  addSystem,
  updateSystem,
  deleteSystem,
  assignSystemToEmployee,
  getAssignmentHistory,
  getTickets,
  subscribe,
} from '../../store/store';

export default function ManageSystems() {
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null); // null means adding a new system
  
  // History Modal States
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHistorySys, setSelectedHistorySys] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [sysTickets, setSysTickets] = useState([]);
  
  // Form states
  const [systemNumber, setSystemNumber] = useState('');
  const [cpu, setCpu] = useState('');
  const [gpu, setGpu] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [os, setOs] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('Active'); // Active, Under Repair, Retired
  const [assignedTo, setAssignedTo] = useState('');
  const [remarks, setRemarks] = useState('');

  const refreshData = () => {
    setSystems(getSystems());
    setEmployees(getEmployees());
  };

  // Import states
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [parsedSystems, setParsedSystems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSelectFile = async () => {
    try {
      const [res] = await pick({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values'
        ]
      });

      if (!res || !res.uri) return;
      setSelectedFileName(res.name);

      // Read file content
      const fileUri = res.uri;
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const base64 = reader.result.split(',')[1];
          const workbook = XLSX.read(base64, { type: 'base64' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          if (!json || json.length === 0) {
            sweetAlert({ title: 'Empty File', text: 'No rows found in the selected Excel sheet.', type: 'warning' });
            return;
          }

          // Map parsed objects to standard keys based on header synonyms
          const list = json.map(row => {
            const getValue = (synonyms) => {
              const key = Object.keys(row).find(k => synonyms.includes(k.toLowerCase().trim()));
              return key ? String(row[key]).trim() : '';
            };

            return {
              systemNumber: getValue(['system number', 'systemnumber', 'system_number', 'sn', 'serial number', 'serialno']),
              model:        getValue(['model', 'model name', 'machine model']),
              os:           getValue(['os', 'operating system', 'system os']),
              cpu:          getValue(['cpu', 'processor', 'system cpu']),
              gpu:          getValue(['gpu', 'graphics', 'graphics card']),
              ram:          getValue(['ram', 'memory', 'system ram']),
              storage:      getValue(['storage', 'hard drive', 'disk']),
              status:       getValue(['status', 'state', 'condition']) || 'Active',
              assignedTo:   getValue(['assigned to', 'employee email', 'assigned employee', 'employee']),
              remarks:      getValue(['remarks', 'comments', 'notes']),
            };
          }).filter(s => s.systemNumber); // Filter out rows without system number

          if (list.length === 0) {
            sweetAlert({ title: 'No Rows Found', text: 'Could not find any rows with a valid "System Number" column.', type: 'warning' });
            return;
          }

          setParsedSystems(list);
          sweetAlert({ title: 'Parsed!', text: `Successfully loaded ${list.length} systems from "${res.name}".`, type: 'success' });
        } catch (parseErr) {
          sweetAlert({ title: 'Read Error', text: 'Failed to parse Excel file: ' + parseErr.message, type: 'error' });
        }
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      if (err.message && err.message.includes('User canceled')) {
        return;
      }
      sweetAlert({ title: 'Picker Error', text: err.message, type: 'error' });
    }
  };

  const handleImportSubmit = async () => {
    if (parsedSystems.length === 0) {
      sweetAlert({ title: 'Error', text: 'No parsed systems to import.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { getApiUrl } = require('../../utils/api');
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/import-systems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systems: parsedSystems })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Import failed');

      let msg = `Successfully imported ${data.imported || 0} systems.`;
      if (data.duplicates && data.duplicates.length > 0) {
        msg += `\nSkipped ${data.duplicates.length} duplicate system numbers.`;
      }
      if (data.errors && data.errors.length > 0) {
        msg += `\nErrors in ${data.errors.length} records.`;
      }

      sweetAlert({ title: 'Import Successful', text: msg, type: 'success' });

      // Close modal and clean up
      setImportModalVisible(false);
      setSelectedFileName('');
      setParsedSystems([]);

      // Sync and refresh store
      const { syncWithServer } = require('../../store/store');
      await syncWithServer();
    } catch (err) {
      sweetAlert({ title: 'Import Failed', text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Subscribe to store updates
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingSystem(null);
    setSystemNumber(`SN${systems.length + 11}`);
    setCpu('Intel Core i5');
    setGpu('Integrated Graphics');
    setRam('16 GB');
    setStorage('512 GB SSD');
    setOs('Windows 11 Pro');
    setModel('Generic PC');
    setStatus('Active');
    setAssignedTo('');
    setRemarks('');
    setModalVisible(true);
  };

  const openEditModal = (system) => {
    setEditingSystem(system);
    setSystemNumber(system.systemNumber || '');
    setCpu(system.cpu || '');
    setGpu(system.gpu || '');
    setRam(system.ram || '');
    setStorage(system.storage || '');
    setOs(system.os || '');
    setModel(system.model || '');
    setStatus(system.status || 'Active');
    setAssignedTo(system.assignedTo || '');
    setRemarks(system.remarks || '');
    setModalVisible(true);
  };

  const openHistoryModal = (sys) => {
    setSelectedHistorySys(sys);
    const logs = getAssignmentHistory().filter(h => h.systemId === sys.id);
    const tkts = getTickets().filter(t => t.systemId === sys.id);
    setHistoryLogs(logs);
    setSysTickets(tkts);
    setHistoryModalVisible(true);
  };

  const handleDownloadSystemReport = async () => {
    if (!selectedHistorySys) return;
    const sys = selectedHistorySys;
    const sysLogs = historyLogs;
    const sysTkts = sysTickets;
    const csvRows = [];
    
    csvRows.push("SYSTEM SPECIFICATION REPORT");
    csvRows.push(`System Number,${sys.systemNumber}`);
    csvRows.push(`Model,${sys.model || "N/A"}`);
    csvRows.push(`Operating System,${sys.os || "N/A"}`);
    csvRows.push(`CPU,${sys.cpu || "N/A"}`);
    csvRows.push(`GPU,${sys.gpu || "Integrated"}`);
    csvRows.push(`RAM,${sys.ram || "N/A"}`);
    csvRows.push(`Storage,${sys.storage || "N/A"}`);
    csvRows.push(`Current Status,${sys.status || "Active"}`);
    csvRows.push("");
    
    csvRows.push("ASSIGNMENT HISTORY LOGS");
    csvRows.push("Log ID,Action,Team Member ID,Team Member Name,Timestamp,Assigned By");
    sysLogs.forEach(log => {
      const emp = employees.find(e => e.id === log.employeeId) || { name: "Unknown" };
      csvRows.push(`${log.id},${log.action},${log.employeeId},${emp.name},${new Date(log.timestamp).toLocaleString()},${log.assignedBy || "System"}`);
    });
    csvRows.push("");
    
    csvRows.push("ISSUES AND COMPLAINTS BOARD");
    csvRows.push("Ticket ID,Category,Description,Severity,Status,Created At,Resolved At,Notes");
    sysTkts.forEach(t => {
      const descEscaped = t.description ? `"${t.description.replace(/"/g, '""')}"` : "";
      const notesEscaped = t.resolutionRemarks || t.notes ? `"${(t.resolutionRemarks || t.notes).replace(/"/g, '""')}"` : "";
      csvRows.push(`${t.id},${t.category},${descEscaped},${t.severity},${t.status},${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : ""},${notesEscaped}`);
    });
    
    const csvString = "\uFEFF" + csvRows.join("\n");
    try {
      await Share.share({
        title: `DeviceDesk Report - ${sys.systemNumber}`,
        message: csvString,
      });
    } catch (error) {
      sweetAlert({ title: 'Error', text: 'Failed to share report: ' + error.message, type: 'error' });
    }
  };

  const handleExportSystems = async () => {
    try {
      const baseUrl = getApiUrl();
      const exportUrl = `${baseUrl}/api/export?type=systems`;
      await Linking.openURL(exportUrl);
    } catch (error) {
      sweetAlert({ title: 'Error', text: 'Failed to export systems: ' + error.message, type: 'error' });
    }
  };

  const handleSave = () => {
    if (!systemNumber.trim()) {
      sweetAlert({ title: 'Error', text: 'Please enter a System Number.', type: 'error' });
      return;
    }

    const data = {
      systemNumber: systemNumber.trim(),
      cpu: cpu.trim(),
      gpu: gpu.trim(),
      ram: ram.trim(),
      storage: storage.trim(),
      os: os.trim(),
      model: model.trim(),
      status: status,
      remarks: remarks.trim(),
      assignedTo: assignedTo || null,
    };

    if (editingSystem) {
      // Update existing
      const updated = { ...editingSystem, ...data };
      updateSystem(updated);
      
      // Update assignee relationship
      assignSystemToEmployee(editingSystem.id, assignedTo || null, 'Admin');
      
      sweetAlert({ title: 'Success', text: 'System updated successfully!', type: 'success' });
    } else {
      // Add new
      const newSys = addSystem(data);
      if (assignedTo) {
        assignSystemToEmployee(newSys.id, assignedTo, 'Admin');
      }
      sweetAlert({ title: 'Success', text: 'System added successfully!', type: 'success' });
    }

    setModalVisible(false);
  };

  const handleDelete = (id) => {
    sweetAlert({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this system? This will unassign any active team member.',
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        deleteSystem(id);
        setModalVisible(false);
        sweetAlert({ title: 'Success', text: 'System deleted successfully!', type: 'success' });
      },
    });
  };

  const filteredSystems = systems.filter(s => {
    const query = searchQuery.toLowerCase();
    const employee = employees.find(e => e.id === s.assignedTo);
    const empName = employee ? employee.name.toLowerCase() : 'unassigned';
    return (
      (s.systemNumber || '').toLowerCase().includes(query) ||
      (s.cpu || '').toLowerCase().includes(query) ||
      (s.gpu || '').toLowerCase().includes(query) ||
      (s.os || '').toLowerCase().includes(query) ||
      (s.model || '').toLowerCase().includes(query) ||
      (s.remarks || '').toLowerCase().includes(query) ||
      empName.includes(query)
    );
  });

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by SN, Model, OS or Team Member..."
          placeholderTextColor="#8b949e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportSystems}>
          <Text style={styles.exportBtnText}>Excel 📥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.importBtn} onPress={() => setImportModalVisible(true)}>
          <Text style={styles.importBtnText}>Import 📤</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Systems List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredSystems.length === 0 ? (
          <Text style={styles.emptyText}>No systems found.</Text>
        ) : (
          filteredSystems.map(s => {
            const assignee = employees.find(e => e.id === s.assignedTo);
            return (
              <View
                key={s.id}
                style={styles.systemCard}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.sysNo}>{s.systemNumber}</Text>
                    <Text style={styles.model}>{s.model}</Text>
                  </View>
                  <View style={[styles.statusBadge, s.status === 'Active' ? styles.statusActive : styles.statusRepair]}>
                    <Text style={styles.statusText}>{s.status}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.specsContainer}>
                  <Text style={styles.specText}>💻 OS: {s.os}</Text>
                  <Text style={styles.specText}>🧠 CPU: {s.cpu}</Text>
                  <Text style={styles.specText}>🎮 GPU: {s.gpu || 'Integrated'}</Text>
                  <Text style={styles.specText}>💾 RAM/Storage: {s.ram} / {s.storage}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.assigneeContainer}>
                  <Text style={styles.assigneeLabel}>Assigned To:</Text>
                  <Text style={styles.assigneeName}>
                    {assignee ? `👤 ${assignee.name} (${assignee.department})` : 'Unassigned'}
                  </Text>
                </View>

                {s.remarks ? (
                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksText}>📝 {s.remarks}</Text>
                  </View>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.cardActionsContainer}>
                  <TouchableOpacity style={styles.editActionBtn} onPress={() => openEditModal(s)}>
                    <Text style={styles.editActionText}>✏️ Edit Specs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.historyActionBtn} onPress={() => openHistoryModal(s)}>
                    <Text style={styles.historyActionText}>📜 History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSystem ? 'Edit IT System' : 'Add IT System'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>System Number</Text>
              <TextInput
                style={styles.input}
                value={systemNumber}
                onChangeText={setSystemNumber}
                placeholder="e.g. SN15"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Model Name</Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
                placeholder="e.g. Apple Mac mini M4"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Operating System</Text>
              <TextInput
                style={styles.input}
                value={os}
                onChangeText={setOs}
                placeholder="e.g. macOS Sequoia"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Processor (CPU)</Text>
              <TextInput
                style={styles.input}
                value={cpu}
                onChangeText={setCpu}
                placeholder="e.g. Apple M4 10-Core"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Graphic Card (GPU)</Text>
              <TextInput
                style={styles.input}
                value={gpu}
                onChangeText={setGpu}
                placeholder="e.g. NVIDIA RTX 4060 / Integrated"
                placeholderTextColor="#666"
              />

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>RAM</Text>
                  <TextInput
                    style={styles.input}
                    value={ram}
                    onChangeText={setRam}
                    placeholder="e.g. 16 GB"
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={[styles.flexHalf, { marginLeft: 10 }]}>
                  <Text style={styles.label}>Storage</Text>
                  <TextInput
                    style={styles.input}
                    value={storage}
                    onChangeText={setStorage}
                    placeholder="e.g. 256 GB SSD"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.tabContainer}>
                {['Active', 'Under Repair', 'Retired'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.tab, status === opt && styles.tabActive]}
                    onPress={() => setStatus(opt)}
                  >
                    <Text style={[styles.tabText, status === opt && styles.tabTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Assign to Team Member</Text>
              <View style={styles.pickerContainer}>
                {/* Custom Picker simulation for stability */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 5 }}>
                  <TouchableOpacity
                    style={[styles.pickerItem, assignedTo === '' && styles.pickerItemActive]}
                    onPress={() => setAssignedTo('')}
                  >
                    <Text style={[styles.pickerItemText, assignedTo === '' && styles.pickerItemTextActive]}>
                      None (Unassign)
                    </Text>
                  </TouchableOpacity>
                  {employees.map(e => (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.pickerItem, assignedTo === e.id && styles.pickerItemActive]}
                      onPress={() => setAssignedTo(e.id)}
                    >
                      <Text style={[styles.pickerItemText, assignedTo === e.id && styles.pickerItemTextActive]}>
                        {e.name} ({e.department})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Handwritten notes, warranty details..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save System</Text>
              </TouchableOpacity>

              {editingSystem && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(editingSystem.id)}
                >
                  <Text style={styles.deleteBtnText}>Delete System</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: SYSTEM HISTORY REPORT ================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🖥️ History: {selectedHistorySys?.systemNumber}</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {selectedHistorySys && (
                <>
                  {/* System Overview Panel */}
                  <View style={styles.overviewPanel}>
                    <View style={styles.overviewHeader}>
                      <Text style={styles.overviewTitle}>{selectedHistorySys.model || 'Generic PC'}</Text>
                      <TouchableOpacity style={styles.shareBtn} onPress={handleDownloadSystemReport}>
                        <Text style={styles.shareBtnText}>📤 Share CSV</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.overviewSpecs}>
                      OS: {selectedHistorySys.os}{'\n'}
                      CPU: {selectedHistorySys.cpu}{'\n'}
                      GPU: {selectedHistorySys.gpu || 'Integrated'}{'\n'}
                      RAM/Storage: {selectedHistorySys.ram} / {selectedHistorySys.storage}
                    </Text>
                  </View>

                  {/* Assignment Logs Section */}
                  <View style={styles.historySection}>
                    <Text style={styles.sectionSub}>Assignment History Logs</Text>
                    {historyLogs.length === 0 ? (
                      <Text style={styles.historyEmptyText}>No assignment logs recorded.</Text>
                    ) : (
                      historyLogs.map(log => {
                        const emp = employees.find(e => e.id === log.employeeId) || { name: 'Unknown' };
                        const isAssigned = log.action.toLowerCase() === 'assigned';
                        return (
                          <View key={log.id} style={styles.historyMiniCard}>
                            <View style={styles.miniCardRow}>
                              <Text style={[styles.miniBadge, isAssigned ? styles.badgeAssigned : styles.badgeUnassigned]}>
                                {log.action}
                              </Text>
                              <Text style={styles.miniDate}>
                                {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                              </Text>
                            </View>
                            <Text style={styles.miniText}>Team Member: {emp.name}</Text>
                            <Text style={styles.miniText}>By: {log.assignedBy || 'System'}</Text>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Related Tickets Section */}
                  <View style={styles.historySection}>
                    <Text style={styles.sectionSub}>Related IT Issues</Text>
                    {sysTickets.length === 0 ? (
                      <Text style={styles.historyEmptyText}>No issues raised for this machine.</Text>
                    ) : (
                      sysTickets.map(t => (
                        <View key={t.id} style={styles.historyMiniCard}>
                          <View style={styles.miniCardRow}>
                            <Text style={styles.tktId}>#{t.id}</Text>
                            <Text style={[styles.miniBadge, styles.badgeUnassigned]}>{t.severity}</Text>
                            <Text style={[styles.miniBadge, styles.badgeAssigned]}>{t.status}</Text>
                          </View>
                          <Text style={styles.miniText}>Cat: {t.category}</Text>
                          <Text style={styles.miniText} numberOfLines={2}>Desc: {t.description}</Text>
                          {t.resolvedAt ? (
                            <Text style={styles.miniText}>Resolved: {new Date(t.resolvedAt).toLocaleDateString()}</Text>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Import Systems Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={importModalVisible}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📤 Bulk Import Systems</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  📁 Choose an Excel (.xlsx, .xls) or CSV file containing your systems list.
                </Text>
                <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 5, color: '#58a6ff' }]}>
                  Supported columns: System Number*, Model, OS, CPU, GPU, RAM, Storage, Status, Assigned To, Remarks
                </Text>
              </View>

              <TouchableOpacity style={styles.selectFileBtn} onPress={handleSelectFile}>
                <Text style={styles.selectFileBtnText}>
                  {selectedFileName ? `📄 ${selectedFileName}` : '📁 Select Excel / CSV File'}
                </Text>
              </TouchableOpacity>

              {selectedFileName ? (
                <Text style={styles.fileSelectedText}>
                  File loaded. Press Confirm below to import.
                </Text>
              ) : null}

              {parsedSystems.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={[styles.label, { color: '#58a6ff' }]}>Parsed Preview ({parsedSystems.length} rows)</Text>
                  <View style={styles.previewContainer}>
                    <ScrollView nestedScrollEnabled={true}>
                      {parsedSystems.map((sys, index) => (
                        <View key={index} style={styles.previewRow}>
                          <Text style={styles.previewText}>💻 {sys.systemNumber}</Text>
                          <Text style={[styles.previewText, { color: '#8b949e' }]}>{sys.model} | {sys.assignedTo || 'Unassigned'}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleImportSubmit} disabled={loading}>
                    <Text style={styles.saveBtnText}>
                      {loading ? 'Importing...' : `Confirm Import (${parsedSystems.length} Systems)`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
    alignItems: 'center',
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
    marginRight: 10,
  },
  addBtn: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    padding: 15,
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 15,
  },
  systemCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sysNo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  model: {
    fontSize: 13,
    color: '#c9d1d9',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusActive: {
    backgroundColor: 'rgba(56, 139, 60, 0.15)',
    borderWidth: 1,
    borderColor: '#3fb950',
  },
  statusRepair: {
    backgroundColor: 'rgba(210, 153, 34, 0.15)',
    borderWidth: 1,
    borderColor: '#d29922',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  divider: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 10,
  },
  specsContainer: {
    gap: 4,
  },
  specText: {
    fontSize: 13,
    color: '#8b949e',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeLabel: {
    fontSize: 12,
    color: '#8b949e',
    marginRight: 6,
  },
  assigneeName: {
    fontSize: 13,
    color: '#c9d1d9',
    fontWeight: '500',
  },
  remarksBox: {
    marginTop: 8,
    backgroundColor: '#21262d',
    padding: 8,
    borderRadius: 6,
  },
  remarksText: {
    fontSize: 12,
    color: '#8b949e',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#8b949e',
  },
  formContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#c9d1d9',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#f0f6fc',
    marginBottom: 15,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  flexHalf: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 3,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#1f6feb',
  },
  tabText: {
    fontSize: 12,
    color: '#8b949e',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  pickerContainer: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 5,
    marginBottom: 15,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#21262d',
  },
  pickerItemActive: {
    backgroundColor: '#1f6feb',
    borderColor: '#58a6ff',
  },
  pickerItemText: {
    color: '#8b949e',
    fontSize: 12,
  },
  pickerItemTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  deleteBtnText: {
    color: '#f85149',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editActionBtn: {
    flex: 1,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  editActionText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '600',
  },
  historyActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#58a6ff',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  historyActionText: {
    color: '#58a6ff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalScroll: {
    paddingBottom: 30,
  },
  overviewPanel: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    paddingBottom: 6,
    marginBottom: 8,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  overviewSpecs: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
  },
  shareBtn: {
    backgroundColor: 'rgba(46, 160, 67, 0.15)',
    borderWidth: 1,
    borderColor: '#3fb950',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  shareBtnText: {
    color: '#3fb950',
    fontSize: 11,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: 20,
  },
  sectionSub: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#c9d1d9',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    paddingBottom: 6,
    marginBottom: 10,
  },
  historyEmptyText: {
    color: '#8b949e',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 5,
  },
  historyMiniCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  miniCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#c9d1d9',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  badgeAssigned: {
    backgroundColor: 'rgba(46, 160, 67, 0.15)',
    color: '#3fb950',
  },
  badgeUnassigned: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    color: '#f85149',
  },
  miniDate: {
    fontSize: 11,
    color: '#8b949e',
    marginLeft: 'auto',
  },
  miniText: {
    fontSize: 12,
    color: '#c9d1d9',
    marginVertical: 1,
  },
  tktId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginRight: 8,
  },
  exportBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exportBtnText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 'bold',
  },
  importBtn: {
    backgroundColor: '#238636',
    borderWidth: 1,
    borderColor: '#2ea44f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  importBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  textArea: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    color: '#f0f6fc',
    padding: 12,
    fontSize: 13,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  parseBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  parseBtnText: {
    color: '#c9d1d9',
    fontWeight: 'bold',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  infoText: {
    color: '#8b949e',
    fontSize: 12,
    lineHeight: 16,
  },
  previewContainer: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    backgroundColor: '#0d1117',
    marginBottom: 15,
    padding: 8,
  },
  previewRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    color: '#f0f6fc',
    fontSize: 12,
  },
  closeIcon: {
    fontSize: 18,
    color: '#8b949e',
    fontWeight: 'bold',
  },
  selectFileBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectFileBtnText: {
    color: '#58a6ff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fileSelectedText: {
    color: '#3fb950',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
});
