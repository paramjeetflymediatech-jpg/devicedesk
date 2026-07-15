import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import {
  getSystems,
  getEmployees,
  addSystem,
  updateSystem,
  deleteSystem,
  assignSystemToEmployee,
  subscribe,
} from '../../store/store';

export default function ManageSystems() {
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null); // null means adding a new system
  
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

  const handleSave = () => {
    if (!systemNumber.trim()) {
      Alert.alert('Error', 'Please enter a System Number.');
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
      
      Alert.alert('Success', 'System updated successfully!');
    } else {
      // Add new
      const newSys = addSystem(data);
      if (assignedTo) {
        assignSystemToEmployee(newSys.id, assignedTo, 'Admin');
      }
      Alert.alert('Success', 'System added successfully!');
    }

    setModalVisible(false);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this system? This will unassign any active employee.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSystem(id);
            setModalVisible(false);
            Alert.alert('Success', 'System deleted successfully!');
          },
        },
      ]
    );
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
          placeholder="Search by SN, Model, OS or Employee..."
          placeholderTextColor="#8b949e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
              <TouchableOpacity
                key={s.id}
                style={styles.systemCard}
                onPress={() => openEditModal(s)}
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
              </TouchableOpacity>
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

              <Text style={styles.label}>Assign to Employee</Text>
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
});
