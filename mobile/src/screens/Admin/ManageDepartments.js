import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { sweetAlert } from '../../utils/sweetAlert';
import {
  getDepartments,
  addDepartment,
  deleteDepartment,
  getEmployees,
  subscribe,
} from '../../store/store';

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  const refreshData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const handleSaveDept = () => {
    if (!newDeptName.trim()) {
      sweetAlert({ title: 'Error', text: 'Please enter a department name.', type: 'error' });
      return;
    }
    const res = addDepartment(newDeptName.trim());
    if (res) {
      sweetAlert({ title: 'Success', text: `Department "${newDeptName.trim()}" added successfully!`, type: 'success' });
      setNewDeptName('');
      setModalVisible(false);
      refreshData();
    } else {
      sweetAlert({ title: 'Error', text: 'Department already exists or name is invalid.', type: 'error' });
    }
  };

  const handleDeleteDept = (dept) => {
    const count = employees.filter(
      (e) => e.department && e.department.toLowerCase() === dept.name.toLowerCase()
    ).length;

    if (count > 0) {
      sweetAlert({
        title: 'Cannot Delete',
        text: `Department "${dept.name}" is assigned to ${count} employee(s).`,
        type: 'error',
      });
      return;
    }

    sweetAlert({
      title: 'Confirm Delete',
      text: `Are you sure you want to delete "${dept.name}"?`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        deleteDepartment(dept.id);
        refreshData();
        sweetAlert({ title: 'Success', text: 'Department removed successfully.', type: 'success' });
      },
    });
  };

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.actionHeader}>
        <View style={{ position: 'relative', flex: 1, marginRight: 10 }}>
          <TextInput
            style={[styles.searchInput, { width: '100%', marginRight: 0, paddingRight: 35 }]}
            placeholder="Search departments..."
            placeholderTextColor="#8b949e"
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
              <Text style={{ color: '#8b949e', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>➕ Add Dept</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {filteredDepts.length === 0 ? (
          <Text style={styles.emptyText}>No departments found.</Text>
        ) : (
          filteredDepts.map((dept) => {
            const empCount = employees.filter(
              (e) => e.department && e.department.toLowerCase() === dept.name.toLowerCase()
            ).length;

            return (
              <View key={dept.id} style={styles.deptCard}>
                <View style={styles.deptInfo}>
                  <Text style={styles.deptName}>🏢 {dept.name}</Text>
                  <Text style={styles.deptMeta}>{empCount} active employees</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteDept(dept)}
                >
                  <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Department Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Department</Text>
            
            <Text style={styles.label}>Department Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sales, Marketing, IT Support"
              placeholderTextColor="#8b949e"
              value={newDeptName}
              onChangeText={setNewDeptName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setNewDeptName('');
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDept}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  actionHeader: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#c9d1d9',
    marginRight: 10,
  },
  addBtn: {
    backgroundColor: '#238636',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  scrollContainer: {
    padding: 15,
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 40,
  },
  deptCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f0f6fc',
  },
  deptMeta: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 4,
  },
  deleteBtn: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteBtnText: {
    color: '#f85149',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#58a6ff',
    marginBottom: 15,
  },
  label: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 40,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#c9d1d9',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#21262d',
  },
  cancelBtnText: {
    color: '#c9d1d9',
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#238636',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
