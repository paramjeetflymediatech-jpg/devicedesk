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
      (log.systemNumber || '').toLowerCase().includes(query) ||
      (log.action || '').toLowerCase().includes(query) ||
      (log.assignedBy || '').toLowerCase().includes(query) ||
      (log.employeeId ? emp.name.toLowerCase().includes(query) : false) ||
      (log.timestamp ? new Date(log.timestamp).toLocaleString().toLowerCase() : '').includes(query)
    );
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

  // Pagination calculation
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getBadgeStyle = (action) => {
    const act = (action || '').toLowerCase();
    if (act === 'assigned') return styles.badgeAssigned;
    if (act.includes('added') || act.includes('add')) return styles.badgeAdded;
    if (act.includes('updated') || act.includes('update')) return styles.badgeUpdated;
    if (act.includes('removed') || act.includes('delete') || act.includes('unassigned')) return styles.badgeUnassigned;
    return styles.badgeAdded;
  };

  const getBadgeTextStyle = (action) => {
    const act = (action || '').toLowerCase();
    if (act === 'assigned') return styles.badgeTextAssigned;
    if (act.includes('added') || act.includes('add')) return styles.badgeTextAdded;
    if (act.includes('updated') || act.includes('update')) return styles.badgeTextUpdated;
    if (act.includes('removed') || act.includes('delete') || act.includes('unassigned')) return styles.badgeTextUnassigned;
    return styles.badgeTextAdded;
  };

  const getLogTitle = (log) => {
    const act = (log.action || '').toLowerCase();
    if (log.systemNumber) return `🖥️ ${log.systemNumber}`;
    if (act.includes('employee')) return `👤 Employee Log`;
    if (act.includes('department')) return `🏢 Department Log`;
    return `📜 Audit Log`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>System Tracking & Audit Logs</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportHistory}>
          <Text style={styles.exportBtnText}>📤 Export CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={{ position: 'relative', marginBottom: 15 }}>
        <TextInput
          style={[styles.searchBar, { marginBottom: 0, paddingRight: 40 }]}
          placeholder="Search employee, system, action, department..."
          placeholderTextColor="#8b949e"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setCurrentPage(1);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: [{ translateY: -12 }],
              padding: 4,
            }}
            onPress={() => {
              setSearchQuery('');
              setCurrentPage(1);
            }}
          >
            <Text style={{ color: '#8b949e', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {paginatedHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No audit logs found.</Text>
          </View>
        ) : (
          paginatedHistory.map((log) => {
            const emp = employees.find(e => e.id === log.employeeId);
            const empName = emp ? emp.name : (log.employeeId ? (log.employeeId.startsWith('emp_') ? 'Unknown' : log.employeeId) : 'N/A');
            return (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.sysNum}>{getLogTitle(log)}</Text>
                  <View style={[styles.badge, getBadgeStyle(log.action)]}>
                    <Text style={getBadgeTextStyle(log.action)}>{log.action}</Text>
                  </View>
                </View>
                
                <View style={styles.cardRow}>
                  <Text style={styles.label}>Employee:</Text>
                  <Text style={styles.value}>{empName}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Date/Time:</Text>
                  <Text style={styles.value}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Performed By:</Text>
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
  badgeAdded: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  badgeUpdated: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c9d1d9',
  },
  badgeTextAssigned: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34d399',
  },
  badgeTextUnassigned: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f87171',
  },
  badgeTextAdded: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  badgeTextUpdated: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
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
