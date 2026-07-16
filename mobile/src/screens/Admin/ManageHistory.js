import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Share,
  Linking,
} from 'react-native';
import { getApiUrl } from '../../utils/api';
import { sweetAlert } from '../../utils/sweetAlert';
import {
  getAssignmentHistory,
  getEmployees,
  subscribe,
} from '../../store/store';

export default function ManageHistory() {
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const refreshData = () => {
    setHistory(getAssignmentHistory());
    setEmployees(getEmployees());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const handleExportHistory = async () => {
    try {
      const baseUrl = getApiUrl();
      const exportUrl = `${baseUrl}/api/export?type=history`;
      await Linking.openURL(exportUrl);
    } catch (error) {
      sweetAlert({ title: 'Error', text: 'Failed to export transfer logs: ' + error.message, type: 'error' });
    }
  };

  // Filter logs
  const filteredHistory = history.filter(log => {
    const query = searchQuery.toLowerCase();
    const emp = employees.find(e => e.id === log.employeeId) || { name: 'Unknown' };
    
    return (
      log.systemNumber.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      (log.assignedBy || '').toLowerCase().includes(query) ||
      emp.name.toLowerCase().includes(query) ||
      (log.timestamp ? new Date(log.timestamp).toLocaleString().toLowerCase() : '').includes(query)
    );
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

  // Pagination calculation
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transfer & Assignment Logs</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportHistory}>
          <Text style={styles.exportBtnText}>📤 Export CSV</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="Search employee, system, action..."
        placeholderTextColor="#8b949e"
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          setCurrentPage(1);
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {paginatedHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transfer history logs found.</Text>
          </View>
        ) : (
          paginatedHistory.map((log) => {
            const emp = employees.find(e => e.id === log.employeeId) || { name: 'Unknown' };
            const isAssigned = log.action.toLowerCase() === 'assigned';
            return (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.sysNum}>🖥️ {log.systemNumber}</Text>
                  <View style={[styles.badge, isAssigned ? styles.badgeAssigned : styles.badgeUnassigned]}>
                    <Text style={styles.badgeText}>{log.action}</Text>
                  </View>
                </View>
                
                <View style={styles.cardRow}>
                  <Text style={styles.label}>Employee:</Text>
                  <Text style={styles.value}>{emp.name}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Date/Time:</Text>
                  <Text style={styles.value}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Assigned By:</Text>
                  <Text style={styles.value}>{log.assignedBy || 'System'}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            <Text style={styles.pageBtnText}>← Prev</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            <Text style={styles.pageBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c9d1d9',
  },
  exportBtn: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#58a6ff',
  },
  exportBtnText: {
    color: '#58a6ff',
    fontWeight: '600',
    fontSize: 12,
  },
  searchBar: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#c9d1d9',
    marginBottom: 15,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8b949e',
    fontSize: 14,
  },
  logCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    paddingBottom: 8,
    marginBottom: 8,
  },
  sysNum: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badgeAssigned: {
    backgroundColor: 'rgba(46, 160, 67, 0.15)',
  },
  badgeUnassigned: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c9d1d9',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  label: {
    color: '#8b949e',
    fontSize: 13,
  },
  value: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#30363d',
    backgroundColor: '#0d1117',
  },
  pageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    color: '#c9d1d9',
    fontSize: 13,
  },
  pageInfo: {
    color: '#8b949e',
    fontSize: 13,
  },
});
