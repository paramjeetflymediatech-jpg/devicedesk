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
import {
  getEmployees,
  getSystems,
  addEmployee,
  removeEmployee,
  getDepartments,
  addDepartment,
  deleteDepartment,
  subscribe,
} from '../../store/store';

export default function ManageEmployees({ currentUser }) {
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Team Member');
  const [department, setDepartment] = useState('Operations');
  const [ticketLimit, setTicketLimit] = useState('5');

  const refreshData = () => {
    setEmployees(getEmployees());
    setSystems(getSystems());
    setDepartments(getDepartments());
  };

  // Import states
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedEmployees, setParsedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleParseEmployees = () => {
    try {
      if (!pasteText.trim()) {
        sweetAlert({ title: 'Error', text: 'Please paste some Excel or CSV data first.', type: 'error' });
        return;
      }
      
      const lines = pasteText.trim().split('\n');
      if (lines.length < 2) {
        sweetAlert({ title: 'Error', text: 'Data must include at least a header row and one data row.', type: 'error' });
        return;
      }

      const headerLine = lines[0];
      const sep = headerLine.includes('\t') ? '\t' : ',';
      const headers = headerLine.split(sep).map(h => h.trim().toLowerCase().replace(/(^["']|["']$)/g, ''));

      // Find indexes
      const nameIdx = headers.findIndex(h => h === 'name' || h === 'employee name' || h === 'employee');
      const emailIdx = headers.findIndex(h => h === 'email' || h === 'email address');
      const passwordIdx = headers.findIndex(h => h === 'password' || h === 'pass');
      const roleIdx = headers.findIndex(h => h === 'role');
      const deptIdx = headers.findIndex(h => h === 'department' || h === 'dept');
      const limitIdx = headers.findIndex(h => h === 'ticket limit' || h === 'limit' || h === 'ticketlimit');

      if (nameIdx === -1) {
        sweetAlert({ title: 'Error', text: 'Could not find "Name" column in headers.', type: 'error' });
        return;
      }

      const list = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const vals = line.split(sep).map(v => v.trim().replace(/(^["']|["']$)/g, ''));
        
        const empName = vals[nameIdx] || '';
        if (!empName) continue;

        const empEmail = emailIdx !== -1 ? vals[emailIdx] : '';
        const empPass = passwordIdx !== -1 ? vals[passwordIdx] : '';
        const empRole = roleIdx !== -1 ? vals[roleIdx] : 'Team Member';
        const empDept = deptIdx !== -1 ? vals[deptIdx] : 'General';
        const empLimit = limitIdx !== -1 ? Number(vals[limitIdx]) || 5 : 5;

        list.push({
          name: empName,
          email: empEmail,
          password: empPass,
          role: empRole,
          department: empDept,
          ticketLimit: empLimit
        });
      }

      if (list.length === 0) {
        sweetAlert({ title: 'No Rows Found', text: 'Could not parse any valid rows. Please check headers and data.', type: 'warning' });
        return;
      }

      setParsedEmployees(list);
      sweetAlert({ title: 'Parsed!', text: `Successfully parsed ${list.length} employees. Review the preview below before importing.`, type: 'success' });
    } catch (err) {
      sweetAlert({ title: 'Parse Error', text: err.message, type: 'error' });
    }
  };

  const handleImportSubmit = async () => {
    if (parsedEmployees.length === 0) {
      sweetAlert({ title: 'Error', text: 'No parsed employees to import.', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const { getApiUrl } = require('../../utils/api');
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/import-employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: parsedEmployees })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Import failed');

      let msg = `Successfully imported ${data.imported || 0} employees.`;
      if (data.duplicates && data.duplicates.length > 0) {
        msg += `\nSkipped ${data.duplicates.length} duplicates.`;
      }
      
      sweetAlert({ title: 'Import Successful', text: msg, type: 'success' });
      
      // Close modal and clean up
      setImportModalVisible(false);
      setPasteText('');
      setParsedEmployees([]);

      // Sync and refresh
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
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Team Member');
    setDepartment(departments.length > 0 ? departments[0].name : 'Operations');
    setTicketLimit('5');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      sweetAlert({ title: 'Error', text: 'Please enter a name.', type: 'error' });
      return;
    }

    const limit = parseInt(ticketLimit, 10);
    if (isNaN(limit) || limit <= 0) {
      sweetAlert({ title: 'Error', text: 'Ticket limit must be a positive number.', type: 'error' });
      return;
    }

    try {
      const { getApiUrl } = require('../../utils/api');
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          password: password.trim() || null,
          role,
          department,
          ticketLimit: limit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add employee');

      sweetAlert({ title: 'Success', text: `Employee "${name.trim()}" added successfully!`, type: 'success' });
      setModalVisible(false);

      // Re-sync store from server
      const { syncWithServer } = require('../../store/store');
      await syncWithServer();
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message, type: 'error' });
    }
  };

  const handleDelete = (id, empName) => {
    sweetAlert({
      title: 'Confirm Remove',
      text: `Are you sure you want to remove ${empName}? This will unassign any active IT system.`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        removeEmployee(id);
        sweetAlert({ title: 'Success', text: 'Employee removed successfully!', type: 'success' });
      },
    });
  };
  const handleExportEmployees = async () => {
    try {
      const baseUrl = getApiUrl();
      const exportUrl = `${baseUrl}/api/export?type=employees`;
      await Linking.openURL(exportUrl);
    } catch (error) {
      sweetAlert({ title: 'Error', text: 'Failed to export employees: ' + error.message, type: 'error' });
    }
  };

  const filteredEmployees = employees.filter(e => {
    // 1. Don't show currently logged-in user
    if (e.id === currentUser?.id) return false;

    // 2. Don't show other admin role users in the general list (to match web changes)
    if (e.role === 'Admin') return false;

    const query = searchQuery.toLowerCase();
    return (
      (e.name || '').toLowerCase().includes(query) ||
      (e.email || '').toLowerCase().includes(query) ||
      (e.role || '').toLowerCase().includes(query) ||
      (e.department || '').toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Name, Department or Role..."
          placeholderTextColor="#8b949e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportEmployees}>
          <Text style={styles.exportBtnText}>Excel 📥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.importBtn} onPress={() => setImportModalVisible(true)}>
          <Text style={styles.importBtnText}>Import 📤</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>



      {/* Employees List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredEmployees.length === 0 ? (
          <Text style={styles.emptyText}>No employees found.</Text>
        ) : (
          filteredEmployees.map(e => {
            const assignedSys = systems.filter(s => s.assignedTo === e.id);
            return (
              <View key={e.id} style={styles.employeeCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.empName}>{e.name}</Text>
                    <Text style={styles.empEmail}>✉️ {e.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteIcon}
                    onPress={() => handleDelete(e.id, e.name)}
                  >
                    <Text style={styles.deleteIconText}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role:</Text>
                    <Text style={styles.detailVal}>{e.role}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dept:</Text>
                    <Text style={styles.detailVal}>{e.department}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Limit:</Text>
                    <Text style={styles.detailVal}>{e.ticketLimit} tickets</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.systemsContainer}>
                  <Text style={styles.systemsLabel}>Assigned Hardware:</Text>
                  {assignedSys.length === 0 ? (
                    <Text style={styles.noSystems}>None assigned</Text>
                  ) : (
                    assignedSys.map(s => (
                      <Text key={s.id} style={styles.systemBadge}>
                        🖥️ {s.systemNumber} ({s.model})
                      </Text>
                    ))
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Employee</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Tanmay Sharma"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Email Address (Optional)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Auto-generated if empty"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password (Optional)</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Auto-generated if empty"
                placeholderTextColor="#666"
                secureTextEntry
              />

              <Text style={styles.label}>Role</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Team Member', 'IT Engineer', 'Management', 'Admin'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.pickerItem, role === r && styles.pickerItemActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.pickerItemText, role === r && styles.pickerItemTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Department</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {departments.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.pickerItem, department === d.name && styles.pickerItemActive]}
                      onPress={() => setDepartment(d.name)}
                    >
                      <Text style={[styles.pickerItemText, department === d.name && styles.pickerItemTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Ticket Limit</Text>
              <TextInput
                style={styles.input}
                value={ticketLimit}
                onChangeText={setTicketLimit}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor="#666"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Employee</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={importModalVisible}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📤 Bulk Import Employees</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  📋 Copy cells from your Excel or Google Sheets (with headers) and paste below.
                </Text>
                <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 5, color: '#58a6ff' }]}>
                  Supported headers: Name*, Email, Password, Role, Department, Ticket Limit
                </Text>
              </View>

              <Text style={styles.label}>Paste Excel / TSV Data Here</Text>
              <TextInput
                style={styles.textArea}
                multiline={true}
                numberOfLines={8}
                placeholder="Name&#9;Email&#9;Password&#9;Role&#9;Department&#9;Ticket Limit&#10;John Doe&#9;john@yopmail.com&#9;john123&#9;Team Member&#9;Sales&#9;5"
                placeholderTextColor="#8b949e"
                value={pasteText}
                onChangeText={setPasteText}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity style={styles.parseBtn} onPress={handleParseEmployees}>
                <Text style={styles.parseBtnText}>🔍 Parse & Preview Data</Text>
              </TouchableOpacity>

              {parsedEmployees.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={[styles.label, { color: '#58a6ff' }]}>Parsed Preview ({parsedEmployees.length} rows)</Text>
                  <View style={styles.previewContainer}>
                    <ScrollView nestedScrollEnabled={true}>
                      {parsedEmployees.map((emp, index) => (
                        <View key={index} style={styles.previewRow}>
                          <Text style={styles.previewText}>👤 {emp.name}</Text>
                          <Text style={[styles.previewText, { color: '#8b949e' }]}>🏢 {emp.department} | {emp.role}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleImportSubmit} disabled={loading}>
                    <Text style={styles.saveBtnText}>
                      {loading ? 'Importing...' : `Confirm Import (${parsedEmployees.length} Employees)`}
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
  employeeCard: {
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
    alignItems: 'center',
  },
  empName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  empEmail: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 3,
  },
  deleteIcon: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
    borderRadius: 6,
    padding: 6,
  },
  deleteIconText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#8b949e',
    marginRight: 4,
  },
  detailVal: {
    fontSize: 13,
    color: '#c9d1d9',
    fontWeight: '500',
  },
  systemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  systemsLabel: {
    fontSize: 12,
    color: '#8b949e',
    marginRight: 6,
    width: '100%',
    marginBottom: 6,
  },
  noSystems: {
    fontSize: 13,
    color: '#8b949e',
    fontStyle: 'italic',
  },
  systemBadge: {
    fontSize: 12,
    color: '#58a6ff',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 2,
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
    maxHeight: '80%',
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
    marginBottom: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deptShortcutContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    backgroundColor: '#161b22',
  },
  deptBtn: {
    backgroundColor: '#21262d',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
  },
  deptBtnText: {
    color: '#58a6ff',
    fontWeight: '600',
    fontSize: 13,
  },
  deptCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  deptNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  deptCountText: {
    fontSize: 11,
    color: '#8b949e',
    marginTop: 2,
  },
  deptDeleteBtn: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deptDeleteBtnText: {
    color: '#f85149',
    fontSize: 11,
    fontWeight: '600',
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
});
