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
  getEmployees,
  getSystems,
  addEmployee,
  removeEmployee,
  getDepartments,
  subscribe,
} from '../../store/store';

export default function ManageEmployees() {
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

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }

    const limit = parseInt(ticketLimit, 10);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Error', 'Ticket limit must be a positive number.');
      return;
    }

    const newEmp = addEmployee(
      name.trim(),
      email.trim() || null,
      password.trim() || null,
      role,
      department,
      limit
    );

    Alert.alert('Success', `Employee "${newEmp.name}" added successfully!`);
    setModalVisible(false);
  };

  const handleDelete = (id, empName) => {
    Alert.alert(
      'Confirm Remove',
      `Are you sure you want to remove ${empName}? This will unassign any active IT system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeEmployee(id);
            Alert.alert('Success', 'Employee removed successfully!');
          },
        },
      ]
    );
  };

  const filteredEmployees = employees.filter(e => {
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
});
