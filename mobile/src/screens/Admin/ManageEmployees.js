import { useTheme } from '../../utils/ThemeContext';
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
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';
import { pickSingleDocument, pickSinglePhoto, takePhotoWithCamera, ensureFileExtension } from '../../utils/filePicker';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import * as XLSX from 'xlsx';
import {
  getEmployees,
  getSystems,
  addEmployee,
  removeEmployee,
  updateEmployee,
  getDepartments,
  addDepartment,
  deleteDepartment,
  getAssignmentHistory,
  subscribe,
  syncWithServer,
} from '../../store/store';

const DOCUMENT_CATEGORIES = [
  'Resume / CV',
  'Government ID Proof',
  'Address Proof',
  'Offer / Appointment Letter',
  'Academic / Degree Certificate',
  'Experience / Relieving Letter',
  'Bank / Salary Slip Document',
  'Other Document'
];

export default function ManageEmployees({ currentUser, user: propUser }) {
  const activeUser = currentUser || propUser;
  const { themeColors, isDark } = useTheme();
  const styles = getStyles(themeColors, isDark);
  const [employees, setEmployees] = useState(() => getEmployees());
  const [systems, setSystems] = useState(() => getSystems());
  const [departments, setDepartments] = useState(() => getDepartments());
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Team Member');
  const [department, setDepartment] = useState('Operations');
  const [ticketLimit, setTicketLimit] = useState('100');

  // Edit Form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('Team Member');
  const [editDepartment, setEditDepartment] = useState('Operations');
  const [editTicketLimit, setEditTicketLimit] = useState('100');

  // Dedicated Document Management Modal states (Independent & fully working for HR / Admin)
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [viewingEmployeeDocs, setViewingEmployeeDocs] = useState(null);
  const [employeeDocsList, setEmployeeDocsList] = useState([]);
  const [isLoadingEmployeeDocs, setIsLoadingEmployeeDocs] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);

  // Document Upload Form states inside Document Modal
  const [docCategory, setDocCategory] = useState('Resume / CV');
  const [docTitle, setDocTitle] = useState('');
  const [pickedDocFile, setPickedDocFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // In-App Document Viewer state
  const [viewingDocModal, setViewingDocModal] = useState({
    visible: false,
    url: '',
    name: '',
    type: '',
  });

  const openDocumentsModal = async (emp) => {
    if (!emp) return;
    // Always close edit modal first so there are never two conflicting modals open on Android
    setEditModalVisible(false);
    setViewingEmployeeDocs(emp);
    setShowUploadSection(false);
    setPickedDocFile(null);
    setDocTitle('');
    setDocCategory('Resume / CV');

    let docs = [];
    if (emp.documents) {
      try {
        docs = typeof emp.documents === 'string' ? JSON.parse(emp.documents) : emp.documents;
      } catch (e) {
        docs = [];
      }
    }
    setEmployeeDocsList(Array.isArray(docs) ? docs : []);
    setDocModalVisible(true);

    // Fetch live documents from server in background
    setIsLoadingEmployeeDocs(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/employees/${emp.id}/documents`, {
        headers: {
          'Accept': 'application/json',
          'x-user-id': String(activeUser?.id || '')
        }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setEmployeeDocsList(data.data);
        updateEmployee(emp.id, { documents: data.data });
      }
    } catch (err) {
      console.warn('Failed to fetch employee documents:', err);
    } finally {
      setIsLoadingEmployeeDocs(false);
    }
  };

  const handlePickDocumentFile = async () => {
    try {
      const file = await pickSingleDocument();
      if (file) {
        setPickedDocFile(file);
        if (!docTitle.trim()) {
          setDocTitle(file.name ? file.name.replace(/\.[^/.]+$/, '') : docCategory.split(' / ')[0]);
        }
      }
    } catch (err) {
      console.warn('Pick document error:', err);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const photo = await pickSinglePhoto();
      if (photo) {
        setPickedDocFile(photo);
        if (!docTitle.trim()) {
          setDocTitle(docCategory.split(' / ')[0]);
        }
      }
    } catch (err) {
      console.warn('Pick photo error:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePhotoWithCamera();
      if (photo) {
        setPickedDocFile(photo);
        if (!docTitle.trim()) {
          setDocTitle(docCategory.split(' / ')[0]);
        }
      }
    } catch (err) {
      console.warn('Take photo error:', err);
    }
  };

  const handleUploadDocumentSubmit = async () => {
    if (!pickedDocFile) {
      sweetAlert({ title: 'File Required', text: 'Please choose a document or photo to upload.', type: 'warning' });
      return;
    }
    if (!viewingEmployeeDocs?.id) return;

    setIsUploadingDoc(true);
    try {
      const safeName = ensureFileExtension(pickedDocFile.name, pickedDocFile.type);
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? pickedDocFile.uri : pickedDocFile.uri.replace('file://', ''),
        type: pickedDocFile.type || 'application/octet-stream',
        name: safeName
      });
      formData.append('type', docCategory);
      formData.append('name', docTitle.trim() || docCategory.split(' / ')[0]);
      formData.append('uploadedBy', activeUser?.name ? `${activeUser.name} (${activeUser.role || 'HR'})` : 'HR / Admin');

      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/employees/${viewingEmployeeDocs.id}/documents`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'x-user-id': String(activeUser?.id || '')
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updatedList = Array.isArray(data.documents) ? data.documents : (data.document ? [data.document, ...employeeDocsList] : employeeDocsList);
        setEmployeeDocsList(updatedList);
        setPickedDocFile(null);
        setDocTitle('');
        setShowUploadSection(false);

        // Update local store and synchronize
        updateEmployee(viewingEmployeeDocs.id, { documents: updatedList });
        await syncWithServer();
        refreshData();

        sweetAlert({
          title: 'Uploaded! 🎉',
          text: `"${docTitle.trim() || safeName}" uploaded successfully for ${viewingEmployeeDocs.name}.`,
          type: 'success'
        });
      } else {
        throw new Error(data.error || data.message || 'Failed to upload document');
      }
    } catch (err) {
      sweetAlert({ title: 'Upload Failed', text: err.message, type: 'error' });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = (docId, docName) => {
    if (!viewingEmployeeDocs?.id) return;
    Alert.alert(
      'Delete Document',
      `Are you sure you want to remove "${docName || 'this document'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const baseUrl = getApiUrl();
              const res = await fetch(`${baseUrl}/api/employees/${viewingEmployeeDocs.id}/documents?docId=${docId}`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'x-user-id': String(activeUser?.id || '')
                }
              });
              const data = await res.json();
              if (res.ok && data.success) {
                const updatedList = Array.isArray(data.documents) 
                  ? data.documents 
                  : employeeDocsList.filter(d => String(d.id) !== String(docId));
                setEmployeeDocsList(updatedList);
                updateEmployee(viewingEmployeeDocs.id, { documents: updatedList });
                await syncWithServer();
                refreshData();
                sweetAlert({ title: 'Deleted', text: 'Document removed successfully.', type: 'success' });
              } else {
                throw new Error(data.error || 'Failed to delete document');
              }
            } catch (err) {
              sweetAlert({ title: 'Error', text: err.message, type: 'error' });
            }
          }
        }
      ]
    );
  };

  const refreshData = () => {
    setEmployees(getEmployees());
    setSystems(getSystems());
    setDepartments(getDepartments());
  };

  const handleToggleStatus = (emp) => {
    const isPaused = emp.status === 'Paused';
    const newStatus = isPaused ? 'Active' : 'Paused';
    const actionLabel = isPaused ? 'activate' : 'pause';

    sweetAlert({
      title: `${isPaused ? 'Activate' : 'Pause'} Account?`,
      text: `Are you sure you want to ${actionLabel} the account of ${emp.name}?`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        updateEmployee(emp.id, { status: newStatus }, currentUser?.name || 'Admin');
        sweetAlert({
          title: 'Success',
          text: `Account of ${emp.name} has been ${isPaused ? 'activated' : 'paused'}.`,
          type: 'success'
        });
      },
    });
  };

  // Department Modal States
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');

  // System Details Modal States
  const [sysModalVisible, setSysModalVisible] = useState(false);
  const [selectedSys, setSelectedSys] = useState(null);

  // Computed values
  const deptEmps = employees.filter(e => e.department && e.department.toLowerCase() === selectedDept.toLowerCase());
  const deptSystems = systems.filter(s => deptEmps.some(e => e.id === s.assignedTo));

  const handleOpenDeptDetails = (deptName) => {
    if (!deptName) return;
    setSelectedDept(deptName);
    setDeptModalVisible(true);
  };

  const handleOpenSysDetails = (sys) => {
    if (!sys) return;
    setSelectedSys(sys);
    setSysModalVisible(true);
  };

  // Import states
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [parsedEmployees, setParsedEmployees] = useState([]);
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
              name: getValue(['name', 'employee name', 'employee', 'full name']),
              email: getValue(['email', 'email address', 'mail']),
              password: getValue(['password', 'pass', 'pwd']),
              role: getValue(['role', 'designation', 'user role']) || 'Team Member',
              department: getValue(['department', 'dept', 'dep']),
              ticketLimit: Number(getValue(['ticket limit', 'limit', 'ticketlimit'])) || 5
            };
          }).filter(e => e.name); // Filter out rows without a name

          if (list.length === 0) {
            sweetAlert({ title: 'No Rows Found', text: 'Could not find any rows with a valid "Name" column.', type: 'warning' });
            return;
          }

          setParsedEmployees(list);
          sweetAlert({ title: 'Parsed!', text: `Successfully loaded ${list.length} team members from "${res.name}".`, type: 'success' });
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
    if (parsedEmployees.length === 0) {
      sweetAlert({ title: 'Error', text: 'No parsed team members to import.', type: 'error' });
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

      let msg = `Successfully imported ${data.imported || 0} team members.`;
      if (data.duplicates && data.duplicates.length > 0) {
        msg += `\nSkipped ${data.duplicates.length} duplicates.`;
      }
      
      sweetAlert({ title: 'Import Successful', text: msg, type: 'success' });
      
      // Close modal and clean up
      setImportModalVisible(false);
      setSelectedFileName('');
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
      sweetAlert({ title: 'Error', text: 'Full Name is required.', type: 'error' });
      return;
    }
    if (!email.trim()) {
      sweetAlert({ title: 'Error', text: 'Email Address is required.', type: 'error' });
      return;
    }
    if (!password.trim()) {
      sweetAlert({ title: 'Error', text: 'Password is required.', type: 'error' });
      return;
    }
    if (!role || !role.trim()) {
      sweetAlert({ title: 'Error', text: 'Role is required.', type: 'error' });
      return;
    }
    if (!department || !department.trim()) {
      sweetAlert({ title: 'Error', text: 'Department is required.', type: 'error' });
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
          email: email.trim(),
          password: password.trim(),
          role,
          department,
          ticketLimit: limit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add team member');

      sweetAlert({ title: 'Success', text: `Team Member "${name.trim()}" added successfully!`, type: 'success' });
      setModalVisible(false);

      // Re-sync store from server
      const { syncWithServer } = require('../../store/store');
      await syncWithServer();
    } catch (err) {
      sweetAlert({ title: 'Error', text: err.message, type: 'error' });
    }
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setEditName(emp.name || '');
    setEditEmail(emp.email || '');
    setEditPassword('');
    setEditRole(emp.role || 'Team Member');
    setEditDepartment(emp.department || (departments.length > 0 ? departments[0].name : 'Operations'));
    setEditTicketLimit(String(emp.ticketLimit !== undefined ? emp.ticketLimit : '100'));
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      sweetAlert({ title: 'Error', text: 'Full Name is required.', type: 'error' });
      return;
    }
    if (!editEmail.trim()) {
      sweetAlert({ title: 'Error', text: 'Email Address is required.', type: 'error' });
      return;
    }
    if (!editRole || !editRole.trim()) {
      sweetAlert({ title: 'Error', text: 'Role is required.', type: 'error' });
      return;
    }
    if (!editDepartment || !editDepartment.trim()) {
      sweetAlert({ title: 'Error', text: 'Department is required.', type: 'error' });
      return;
    }

    const limit = parseInt(editTicketLimit, 10);
    if (isNaN(limit) || limit <= 0) {
      sweetAlert({ title: 'Error', text: 'Ticket limit must be a positive number.', type: 'error' });
      return;
    }

    const payload = {
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
      department: editDepartment,
      ticketLimit: limit,
    };

    if (editPassword.trim()) {
      payload.password = editPassword.trim();
    }

    try {
      const { getApiUrl } = require('../../utils/api');
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Update in local store
      updateEmployee(editingEmployee.id, payload, currentUser?.name || 'Admin');

      sweetAlert({ title: 'Success', text: `Team Member "${editName.trim()}" updated successfully!`, type: 'success' });
      setEditModalVisible(false);
      setEditingEmployee(null);

      // Re-sync store from server if available
      try {
        const { syncWithServer } = require('../../store/store');
        await syncWithServer();
      } catch (syncErr) {
        console.warn('Sync failed:', syncErr);
      }
    } catch (err) {
      // Fallback update locally if network fails
      updateEmployee(editingEmployee.id, payload, currentUser?.name || 'Admin');
      sweetAlert({ title: 'Saved Locally', text: `Team Member updated locally: ${err.message}`, type: 'info' });
      setEditModalVisible(false);
      setEditingEmployee(null);
    }
  };

  const handleDelete = (id, empName) => {
    sweetAlert({
      title: 'Confirm Remove',
      text: `Are you sure you want to remove ${empName}? This will unassign any active IT system.`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        removeEmployee(id, currentUser?.name || 'Admin');
        sweetAlert({ title: 'Success', text: 'Team Member removed successfully!', type: 'success' });
      },
    });
  };
  const handleExportEmployees = async () => {
    try {
      const baseUrl = getApiUrl();
      const exportUrl = `${baseUrl}/api/export?type=employees`;
      await Linking.openURL(exportUrl);
    } catch (error) {
      sweetAlert({ title: 'Error', text: 'Failed to export team members: ' + error.message, type: 'error' });
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
        <View style={{ position: 'relative', flex: 1, marginRight: 10 }}>
          <TextInput
            style={[styles.searchInput, { width: '100%', marginRight: 0, paddingRight: 35 }]}
            placeholder="Search by Name, Department or Role..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: [{ translateY: -12 }],
                padding: 4,
              }}
              onPress={() => setSearchQuery('')}
            >
              <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
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
          <Text style={styles.emptyText}>No team members found.</Text>
        ) : (
          filteredEmployees.map(e => {
            const assignedSys = systems.filter(s => s.assignedTo === e.id);
            return (
              <View key={e.id} style={styles.employeeCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={styles.empName}>{e.name}</Text>
                      {e.status === 'Paused' && (
                        <View style={styles.pausedBadge}>
                          <Text style={styles.pausedBadgeText}>Paused</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.empEmail}>✉️ {e.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.docIcon}
                      onPress={() => openDocumentsModal(e)}
                    >
                      <Text style={styles.docIconText}>📁</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editIcon}
                      onPress={() => openEditModal(e)}
                    >
                      <Text style={styles.editIconText}>✏️</Text>
                    </TouchableOpacity>
                    {!['Admin'].includes(e.role) && (
                      <TouchableOpacity
                        style={[
                          styles.statusBtn,
                          e.status === 'Paused' ? styles.activateBtn : styles.pauseBtn
                        ]}
                        onPress={() => handleToggleStatus(e)}
                      >
                        <Text style={styles.statusBtnText}>
                          {e.status === 'Paused' ? '🔓' : '🔒'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteIcon}
                      onPress={() => handleDelete(e.id, e.name)}
                    >
                      <Text style={styles.deleteIconText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role:</Text>
                    <Text style={styles.detailVal}>{e.role}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dept:</Text>
                    <TouchableOpacity onPress={() => handleOpenDeptDetails(e.department)}>
                      <Text style={[styles.detailVal, { color: themeColors.accent, textDecorationLine: 'underline' }]}>
                        {e.department}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Limit:</Text>
                    <Text style={styles.detailVal}>{e.ticketLimit} tickets</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Hardware & Documents Direct Actions Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={styles.systemsLabel}>Assigned Hardware:</Text>
                    {assignedSys.length === 0 ? (
                      <Text style={styles.noSystems}>None assigned</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {assignedSys.map(s => (
                          <TouchableOpacity key={s.id} onPress={() => handleOpenSysDetails(s)}>
                            <Text style={styles.systemBadge}>
                              🖥️ {s.systemNumber}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Direct Document Management Pill */}
                  {(() => {
                    let docs = [];
                    if (e.documents) {
                      try {
                        docs = typeof e.documents === 'string' ? JSON.parse(e.documents) : e.documents;
                      } catch (err) { docs = []; }
                    }
                    const count = Array.isArray(docs) ? docs.length : 0;
                    return (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: count > 0 ? (themeColors.accent + '18') : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                          borderWidth: 1,
                          borderColor: count > 0 ? themeColors.accent : themeColors.border,
                        }}
                        onPress={() => openDocumentsModal(e)}
                      >
                        <Text style={{ fontSize: 13 }}>📁</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: count > 0 ? themeColors.accent : themeColors.textSecondary }}>
                          {count} {count === 1 ? 'Doc' : 'Docs'}
                        </Text>
                        <Text style={{ fontSize: 11, color: themeColors.accent, fontWeight: '800' }}>+</Text>
                      </TouchableOpacity>
                    );
                  })()}
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
              <Text style={styles.modalTitle}>Add New Team Member</Text>
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

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Please enter your company email"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="e.g. password123"
                placeholderTextColor="#666"
                secureTextEntry
              />

              <Text style={styles.label}>Role</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Team Member', 'Team Leader', 'IT Engineer', 'Management', 'Admin'].map(r => (
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
                placeholder="100"
                placeholderTextColor="#666"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Team Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Team Member Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Team Member</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Tanmay Sharma"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Please enter your company email"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />

              <Text style={styles.label}>New Password (leave blank to keep current)</Text>
              <TextInput
                style={styles.input}
                value={editPassword}
                onChangeText={setEditPassword}
                placeholder="Enter new password"
                placeholderTextColor="#666"
                secureTextEntry
              />

              <Text style={styles.label}>Role</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Team Member', 'Team Leader', 'IT Engineer', 'Management', 'Admin'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.pickerItem, editRole === r && styles.pickerItemActive]}
                      onPress={() => setEditRole(r)}
                    >
                      <Text style={[styles.pickerItemText, editRole === r && styles.pickerItemTextActive]}>
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
                      key={d.id || d.name}
                      style={[styles.pickerItem, editDepartment === d.name && styles.pickerItemActive]}
                      onPress={() => setEditDepartment(d.name)}
                    >
                      <Text style={[styles.pickerItemText, editDepartment === d.name && styles.pickerItemTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Ticket Limit</Text>
              <TextInput
                style={styles.input}
                value={editTicketLimit}
                onChangeText={setEditTicketLimit}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#666"
              />

              {/* Profile Documents Link */}
              {editingEmployee && (
                <View style={{ marginTop: 16, marginBottom: 12, padding: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 10, borderWidth: 1, borderColor: themeColors.border }}>
                  {(() => {
                    let docs = [];
                    if (editingEmployee.documents) {
                      try {
                        docs = typeof editingEmployee.documents === 'string' ? JSON.parse(editingEmployee.documents) : editingEmployee.documents;
                      } catch (e) {
                        docs = [];
                      }
                    }
                    if (!Array.isArray(docs)) docs = [];

                    return (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.text }}>
                            📁 Profile Documents ({docs.length})
                          </Text>
                          <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 2 }}>
                            {docs.length === 0 ? 'No documents on record' : `${docs.length} uploaded document${docs.length === 1 ? '' : 's'}`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: themeColors.accent,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 8,
                          }}
                          onPress={() => openDocumentsModal(editingEmployee)}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#fff' }}>Manage & Upload →</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Update Team Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= DEDICATED MANAGE DOCUMENTS MODAL (HR & ADMIN) ================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={docModalVisible}
        onRequestClose={() => {
          if (viewingDocModal.visible) {
            setViewingDocModal({ visible: false, url: '', name: '', type: '' });
          } else if (!isUploadingDoc) {
            setDocModalVisible(false);
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: viewingDocModal.visible ? (isDark ? '#0b0f17' : '#ffffff') : 'rgba(0,0,0,0.7)', justifyContent: viewingDocModal.visible ? 'flex-start' : 'center', alignItems: viewingDocModal.visible ? 'stretch' : 'center', padding: viewingDocModal.visible ? 0 : 16 }}>
          {viewingDocModal.visible ? (
            <View style={{ flex: 1, width: '100%', height: '100%', alignSelf: 'stretch' }}>
              <DocumentViewerModal
                visible={viewingDocModal.visible}
                onClose={() => setViewingDocModal({ visible: false, url: '', name: '', type: '' })}
                fileUrl={viewingDocModal.url}
                fileName={viewingDocModal.name}
                fileType={viewingDocModal.type}
                inline={true}
              />
            </View>
          ) : (
            <View
              style={{
                backgroundColor: themeColors.card,
                borderWidth: 1,
                borderColor: themeColors.border,
                borderRadius: 20,
                padding: 18,
                width: '100%',
                maxWidth: 520,
                maxHeight: '92%',
              }}
            >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: themeColors.border, paddingBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: themeColors.textPrimary }} numberOfLines={1}>
                  📁 {viewingEmployeeDocs?.name || 'User'} Documents
                </Text>
                <Text style={{ fontSize: 11.5, color: themeColors.textSecondary, marginTop: 2 }}>
                  {viewingEmployeeDocs?.role || 'Team Member'} • {viewingEmployeeDocs?.department || 'Operations'}
                </Text>
              </View>
              <TouchableOpacity
                disabled={isUploadingDoc}
                onPress={() => setDocModalVisible(false)}
                style={{ padding: 6, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 14 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: !showUploadSection ? themeColors.accent : 'transparent',
                  alignItems: 'center',
                }}
                onPress={() => setShowUploadSection(false)}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: !showUploadSection ? '#fff' : themeColors.textSecondary }}>
                  📁 All Documents ({employeeDocsList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: showUploadSection ? themeColors.accent : 'transparent',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setPickedDocFile(null);
                  setDocTitle('');
                  setShowUploadSection(true);
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: showUploadSection ? '#fff' : themeColors.textSecondary }}>
                  📤 + Upload New
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {showUploadSection ? (
                /* === UPLOAD NEW DOCUMENT FORM === */
                <View>
                  {/* Category Picker */}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 6 }}>
                    Document Category *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {DOCUMENT_CATEGORIES.map(cat => {
                        const isSelected = docCategory === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => {
                              setDocCategory(cat);
                              if (!pickedDocFile && !docTitle.trim()) {
                                setDocTitle(cat.split(' / ')[0]);
                              }
                            }}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: isSelected ? themeColors.accent : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                              borderWidth: 1,
                              borderColor: isSelected ? themeColors.accent : themeColors.border,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#fff' : themeColors.text }}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Document Title / Label */}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 6 }}>
                    Document Title / Label *
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: themeColors.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 13.5,
                      color: themeColors.text,
                      marginBottom: 14,
                    }}
                    placeholder="e.g. Aadhaar Card, Offer Letter, Degree"
                    placeholderTextColor={themeColors.textSecondary}
                    value={docTitle}
                    onChangeText={setDocTitle}
                  />

                  {/* Direct Action Pickers (Files, Gallery, Camera) */}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 8 }}>
                    Choose File / Photo Source *
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe',
                        borderRadius: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handlePickDocumentFile}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 4 }}>📁</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.accent, textAlign: 'center' }}>
                        Browse Files
                      </Text>
                      <Text style={{ fontSize: 9.5, color: themeColors.textSecondary, marginTop: 1 }}>PDF, Doc, Sheet</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: isDark ? 'rgba(168, 85, 247, 0.12)' : '#faf5ff',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(168, 85, 247, 0.35)' : '#e9d5ff',
                        borderRadius: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handlePickPhoto}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 4 }}>🖼️</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9333ea', textAlign: 'center' }}>
                        Photo Gallery
                      </Text>
                      <Text style={{ fontSize: 9.5, color: themeColors.textSecondary, marginTop: 1 }}>JPEG, PNG</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#bbf7d0',
                        borderRadius: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handleTakePhoto}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 4 }}>📷</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a', textAlign: 'center' }}>
                        Camera
                      </Text>
                      <Text style={{ fontSize: 9.5, color: themeColors.textSecondary, marginTop: 1 }}>Snap Photo</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Picked File Preview */}
                  {pickedDocFile ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: themeColors.accent + '15',
                        borderWidth: 1,
                        borderColor: themeColors.accent,
                        marginBottom: 16,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 10 }}>
                        <Text style={{ fontSize: 24 }}>
                          {pickedDocFile.type?.includes('pdf') ? '📕' : pickedDocFile.type?.includes('image') ? '🖼️' : '📄'}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: themeColors.text }} numberOfLines={1}>
                            {pickedDocFile.name}
                          </Text>
                          <Text style={{ fontSize: 10.5, color: themeColors.textSecondary, marginTop: 1 }}>
                            {pickedDocFile.size ? `${(pickedDocFile.size / (1024 * 1024)).toFixed(2)} MB • ` : ''}Ready to upload ✅
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setPickedDocFile(null)}
                        style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                      >
                        <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '800' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: themeColors.border, alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ fontSize: 11.5, color: themeColors.textSecondary, fontStyle: 'italic' }}>
                        Select a file or photo above to begin upload
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      disabled={isUploadingDoc || !pickedDocFile}
                      onPress={handleUploadDocumentSubmit}
                      style={{
                        flex: 1,
                        backgroundColor: themeColors.accent,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: (isUploadingDoc || !pickedDocFile) ? 0.6 : 1,
                      }}
                    >
                      {isUploadingDoc ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Uploading to Cloud...</Text>
                        </View>
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                          📤 Upload & Save Document
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={isUploadingDoc}
                      onPress={() => setShowUploadSection(false)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: themeColors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: themeColors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                        Back to List
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* === EXISTING DOCUMENTS LIST === */
                <View>
                  {isLoadingEmployeeDocs ? (
                    <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={themeColors.accent} />
                      <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginTop: 8 }}>Loading documents...</Text>
                    </View>
                  ) : employeeDocsList.length === 0 ? (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <Text style={{ fontSize: 36, marginBottom: 8 }}>📄</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: themeColors.textPrimary, marginBottom: 4 }}>
                        No Documents on Record
                      </Text>
                      <Text style={{ fontSize: 11.5, color: themeColors.textSecondary, textAlign: 'center', marginBottom: 14, paddingHorizontal: 20 }}>
                        No identity proofs or files have been uploaded yet for this team member.
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: themeColors.accent,
                          paddingHorizontal: 16,
                          paddingVertical: 9,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        onPress={() => setShowUploadSection(true)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>+ Upload First Document</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textSecondary }}>
                          Official Records ({employeeDocsList.length})
                        </Text>
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: themeColors.accent + '20',
                            borderWidth: 1,
                            borderColor: themeColors.accent,
                          }}
                          onPress={() => setShowUploadSection(true)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.accent }}>+ Add Document</Text>
                        </TouchableOpacity>
                      </View>

                      {employeeDocsList.map((doc, idx) => {
                        const isPdf = (doc.fileName || doc.fileUrl || '').toLowerCase().endsWith('.pdf') || (doc.type || '').toLowerCase().includes('pdf');
                        const isImg = (doc.fileName || doc.fileUrl || '').toLowerCase().match(/\.(jpe?g|png|webp|gif)$/i);
                        const docIcon = isPdf ? '📕' : isImg ? '🖼️' : '📄';

                        return (
                          <View
                            key={doc.id || String(idx)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                              borderWidth: 1,
                              borderColor: themeColors.border,
                              marginBottom: 8,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 10 }}>
                              <Text style={{ fontSize: 24 }}>{docIcon}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.textPrimary }} numberOfLines={1}>
                                  {doc.name || 'Document'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                                  <View style={{ backgroundColor: themeColors.accent + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: themeColors.accent }}>
                                      {doc.type || 'Other'}
                                    </Text>
                                  </View>
                                  {doc.fileSize && (
                                    <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>
                                      {doc.fileSize}
                                    </Text>
                                  )}
                                  {doc.uploadedBy && (
                                    <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>
                                      • By: {doc.uploadedBy}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <TouchableOpacity
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 6,
                                  backgroundColor: themeColors.accent,
                                }}
                                onPress={() => {
                                  const targetUrl = doc.fileUrl || doc.url || doc.file_url || doc.path || doc.uri;
                                  if (targetUrl) {
                                    setViewingDocModal({
                                      visible: true,
                                      url: targetUrl,
                                      name: doc.name || doc.fileName || 'Document',
                                      type: doc.type || '',
                                    });
                                  } else {
                                    sweetAlert({ title: 'Error', text: 'Document URL not found for this item.', type: 'error' });
                                  }
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>View</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  borderRadius: 6,
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  borderWidth: 1,
                                  borderColor: 'rgba(239, 68, 68, 0.35)',
                                }}
                                onPress={() => handleDeleteDocument(doc.id, doc.name)}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>🗑️</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
          )}
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
              <Text style={styles.modalTitle}>📤 Bulk Import Team Members</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  📁 Choose an Excel (.xlsx, .xls) or CSV file containing your team member list.
                </Text>
                <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 5, color: themeColors.accent }]}>
                  Supported columns: Name*, Email, Password, Role, Department, Ticket Limit
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

              {parsedEmployees.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={[styles.label, { color: themeColors.accent }]}>Parsed Preview ({parsedEmployees.length} rows)</Text>
                  <View style={styles.previewContainer}>
                    <ScrollView nestedScrollEnabled={true}>
                      {parsedEmployees.map((emp, index) => (
                        <View key={index} style={styles.previewRow}>
                          <Text style={styles.previewText}>👤 {emp.name}</Text>
                          <Text style={[styles.previewText, { color: themeColors.textSecondary }]}>🏢 {emp.department} | {emp.role}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleImportSubmit} disabled={loading}>
                    <Text style={styles.saveBtnText}>
                      {loading ? 'Importing...' : `Confirm Import (${parsedEmployees.length} Team Members)`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: DEPARTMENT DETAILS */}
      <Modal
        visible={deptModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏢 Devices: {selectedDept}</Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {deptSystems.length === 0 ? (
                <Text style={styles.emptyText}>No devices assigned to this department.</Text>
              ) : (
                deptSystems.map(sys => {
                  const assignee = employees.find(e => e.id === sys.assignedTo);
                  return (
                    <View key={sys.id} style={styles.deptSysCard}>
                      <View style={styles.deptSysHeader}>
                        <TouchableOpacity onPress={() => { setDeptModalVisible(false); handleOpenSysDetails(sys); }}>
                          <Text style={styles.deptSysLink}>{sys.systemNumber}</Text>
                        </TouchableOpacity>
                        <View style={[styles.statusBadge, sys.status === 'Active' ? styles.badgeSuccess : styles.badgeProgress]}>
                          <Text style={styles.statusText}>{sys.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.deptSysModel}>{sys.model}</Text>
                      <Text style={styles.deptSysSpecs}>
                        CPU: {sys.cpu} | RAM: {sys.ram} | GPU: {sys.gpu || 'N/A'}
                      </Text>
                      <Text style={styles.deptSysAssignee}>
                        Assigned to: {assignee ? assignee.name : 'Unassigned'}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: DEVICE SPECIFICATION DETAILS */}
      <Modal
        visible={sysModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSysModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🖥️ Device Specs Details</Text>
              <TouchableOpacity onPress={() => setSysModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedSys && (
                <View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>System Number:</Text>
                    <Text style={[styles.specValue, { color: themeColors.accent, fontWeight: 'bold' }]}>
                      {selectedSys.systemNumber}
                    </Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Model:</Text>
                    <Text style={styles.specValue}>{selectedSys.model || 'N/A'}</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>OS:</Text>
                    <Text style={styles.specValue}>{selectedSys.os || 'N/A'}</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>CPU:</Text>
                    <Text style={styles.specValue}>{selectedSys.cpu || 'N/A'}</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>GPU:</Text>
                    <Text style={styles.specValue}>{selectedSys.gpu || 'N/A'}</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>RAM:</Text>
                    <Text style={styles.specValue}>{selectedSys.ram || 'N/A'}</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Storage:</Text>
                    <Text style={styles.specValue}>{selectedSys.storage || 'N/A'}</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Status:</Text>
                    <View style={[styles.statusBadge, selectedSys.status === 'Active' ? styles.badgeSuccess : styles.badgeProgress]}>
                      <Text style={styles.statusText}>{selectedSys.status}</Text>
                    </View>
                  </View>
                  <View style={[styles.specRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={styles.specLabel}>Remarks / Hardware Issues:</Text>
                    <Text style={[styles.specValue, { marginTop: 4, fontStyle: 'italic', color: themeColors.textSecondary }]}>
                      {selectedSys.remarks || 'No remarks provided.'}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.historySectionTitle}>📦 Device Assignment History (Past Users):</Text>
                  {(() => {
                    const logs = getAssignmentHistory().filter(log => log.systemId === selectedSys.id);
                    if (logs.length === 0) {
                      return <Text style={styles.emptyHistoryText}>No past assignment logs recorded for this machine.</Text>;
                    }
                    return logs.map(log => {
                      const emp = employees.find(e => e.id === log.employeeId) || { name: 'Unknown' };
                      const isAssigned = log.action.toLowerCase() === 'assigned';
                      return (
                        <View key={log.id} style={styles.historyMiniCard}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
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
                    });
                  })()}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (themeColors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: themeColors.textPrimary,
    marginRight: 10,
  },
  addBtn: {
    backgroundColor: themeColors.primary,
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
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: 30,
    fontSize: 15,
  },
  employeeCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
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
    color: themeColors.textPrimary,
  },
  empEmail: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 3,
  },
  docIcon: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    borderRadius: 6,
    padding: 6,
    marginRight: 8,
  },
  docIconText: {
    fontSize: 14,
  },
  editIcon: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 6,
    padding: 6,
    marginRight: 8,
  },
  editIconText: {
    fontSize: 14,
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
    backgroundColor: themeColors.border,
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
    color: themeColors.textSecondary,
    marginRight: 4,
  },
  detailVal: {
    fontSize: 13,
    color: themeColors.text,
    fontWeight: '500',
  },
  systemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  systemsLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginRight: 6,
    width: '100%',
    marginBottom: 6,
  },
  noSystems: {
    fontSize: 13,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
  },
  systemBadge: {
    fontSize: 12,
    color: themeColors.accent,
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
    backgroundColor: themeColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: themeColors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  closeBtnText: {
    fontSize: 20,
    color: themeColors.textSecondary,
  },
  formContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: themeColors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: themeColors.textPrimary,
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
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
    backgroundColor: themeColors.card,
  },
  pickerItemActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.accent,
  },
  pickerItemText: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  pickerItemTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#10b981',
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
    borderBottomColor: themeColors.card,
    backgroundColor: themeColors.card,
  },
  deptBtn: {
    backgroundColor: themeColors.card,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
  },
  deptBtnText: {
    color: themeColors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  deptCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  deptNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  deptCountText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  deptDeleteBtn: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deptDeleteBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  exportBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exportBtnText: {
    color: themeColors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  importBtn: {
    backgroundColor: '#10b981',
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
    color: themeColors.card,
    fontSize: 13,
    fontWeight: 'bold',
  },
  textArea: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    color: themeColors.textPrimary,
    padding: 12,
    fontSize: 13,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  parseBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  parseBtnText: {
    color: themeColors.text,
    fontWeight: 'bold',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  infoText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  previewContainer: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    backgroundColor: themeColors.background,
    marginBottom: 15,
    padding: 8,
  },
  previewRow: {
    borderBottomWidth: 1,
    borderBottomColor: themeColors.card,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    color: themeColors.textPrimary,
    fontSize: 12,
  },
  selectFileBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectFileBtnText: {
    color: themeColors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  fileSelectedText: {
    color: '#10b981',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  pausedBadge: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  pausedBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBtn: {
    borderRadius: 6,
    padding: 6,
    marginRight: 8,
    borderWidth: 1,
  },
  activateBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  pauseBtn: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  statusBtnText: {
    fontSize: 14,
  },
  deptSysCard: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  deptSysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deptSysLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.accent,
    textDecorationLine: 'underline',
  },
  deptSysModel: {
    fontSize: 13,
    color: themeColors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  deptSysSpecs: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  deptSysAssignee: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.card,
  },
  specLabel: {
    fontSize: 13,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  specValue: {
    fontSize: 13,
    color: themeColors.text,
  },
  historySectionTitle: {
    fontSize: 14,
    color: themeColors.textPrimary,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  historyMiniCard: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  miniBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeAssigned: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: themeColors.accent,
    borderWidth: 0.5,
    borderColor: themeColors.accent,
  },
  badgeUnassigned: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    color: '#ef4444',
    borderWidth: 0.5,
    borderColor: '#ef4444',
  },
  miniDate: {
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  miniText: {
    fontSize: 11,
    color: themeColors.text,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderWidth: 0.5,
    borderColor: '#10b981',
  },
  badgeProgress: {
    backgroundColor: 'rgba(210, 153, 34, 0.15)',
    borderWidth: 0.5,
    borderColor: '#f59e0b',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
});
