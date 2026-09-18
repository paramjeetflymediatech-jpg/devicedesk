const fs = require('fs');

const path = 'src/screens/Admin/Dashboard.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useWindowDimensions to imports
if (!content.includes('useWindowDimensions')) {
  content = content.replace(
    'RefreshControl,',
    'RefreshControl,\n  useWindowDimensions,'
  );
}

// 2. Add width and isTablet to AdminDashboard component
if (!content.includes('const isTablet = width > 768;')) {
  content = content.replace(
    'const [isDrawerOpen, setIsDrawerOpen] = useState(false);',
    'const [isDrawerOpen, setIsDrawerOpen] = useState(false);\n  const { width } = useWindowDimensions();\n  const isTablet = width >= 768;\n  const isLargeTablet = width >= 1024;'
  );
}

// 3. Update getStyles signature to take isTablet and width
if (!content.includes('getStyles = (themeColors, isDark, isTablet, width)')) {
  content = content.replace(
    'const styles = getStyles(themeColors, isDark);',
    'const styles = getStyles(themeColors, isDark, isTablet, width);'
  );
  content = content.replace(
    'const getStyles = (themeColors, isDark) => StyleSheet.create({',
    'const getStyles = (themeColors, isDark, isTablet, width) => StyleSheet.create({'
  );
}

// 4. Update the width in statCard styles
content = content.replace(
  "width: '48%',",
  "width: isTablet ? '23%' : '48%',"
);

// Update overview stat cards
content = content.replace(
  '<Text style={styles.statIcon}>???</Text>',
  '<AppIcon name="monitor" size={24} color={themeColors.primary} style={{marginBottom: 8}} />'
);
content = content.replace(
  '<Text style={styles.statIcon}>??</Text>',
  '<AppIcon name="users" size={24} color={themeColors.primary} style={{marginBottom: 8}} />'
);
content = content.replace(
  '<Text style={styles.statIcon}>??</Text>',
  '<AppIcon name="alert" size={24} color={stats.pendingComplaints > 0 ? "#ef4444" : themeColors.primary} style={{marginBottom: 8}} />'
);
content = content.replace(
  '<Text style={styles.statIcon}>??</Text>',
  '<AppIcon name="clock" size={24} color={themeColors.primary} style={{marginBottom: 8}} />'
);

// Update section titles
content = content.replace(
  '<Text style={styles.sectionCardTitle}>?? Latest Tickets</Text>',
  '<View style={{flexDirection: "row", alignItems: "center", gap: 6}}><AppIcon name="ticket" size={20} color={themeColors.text} /><Text style={styles.sectionCardTitle}>Latest Tickets</Text></View>'
);

// Update Marketing banner
content = content.replace(
  '<Text style={{ fontSize: 18 }}>??</Text>',
  '<AppIcon name="navigation" size={20} color="#ffffff" />'
);

// Replace Sidebar Drawer Items
const drawerReplacements = [
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="dashboard" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="user" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="users" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="calendar" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="monitor" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="group" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="ticket" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="chat" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="navigation" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="clock" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="calendar" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="document" size={20} color={themeColors.textSecondary} style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerItemIcon}>??</Text>', '<AppIcon name="warning" size={20} color="#dc2626" style={{marginRight: 12}} />'],
  ['<Text style={styles.drawerLogoutText}>Log Out ??</Text>', '<View style={{flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8}}><AppIcon name="logout" size={18} color="#ef4444" /><Text style={styles.drawerLogoutText}>Log Out</Text></View>']
];

for (const [from, to] of drawerReplacements) {
  content = content.replace(from, to);
}

// Make responsive changes to drawer width
content = content.replace(
  'drawerContent: {\\n      width: \\'75 %\\',\\n      maxWidth: 320,',
  'drawerContent: {\\n      width: isTablet ? 320 : \\'75 %\\',\\n      maxWidth: 320,'
);

// Make responsive padding in scrollContent
content = content.replace(
  'scrollContent: {\\n      padding: 20,\\n      paddingBottom: 40,\\n    },',
  'scrollContent: {\\n      padding: isTablet ? 30 : 20,\\n      paddingBottom: 40,\\n    },'
);

// Replace section title emojis in sectionCardTitle
content = content.replace(
  '<Text style={styles.sectionCardTitle}>?? Latest Tickets</Text>',
  '<View style={{flexDirection: "row", alignItems: "center", gap: 8}}><AppIcon name="ticket" size={20} color={themeColors.text} /><Text style={styles.sectionCardTitle}>Latest Tickets</Text></View>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Refactoring complete!');
