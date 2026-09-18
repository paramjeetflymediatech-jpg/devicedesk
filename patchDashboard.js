const fs = require('fs');

const file = 'd:/devicedesk/mobile/src/screens/Admin/Dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add ManageAttendance and ManageLeaves to imports
if (!content.includes('import ManageAttendance')) {
  content = content.replace(
    "import ManageMarketing from './ManageMarketing';", 
    "import ManageMarketing from './ManageMarketing';\nimport ManageAttendance from './ManageAttendance';\nimport ManageLeaves from './ManageLeaves';"
  );
}

// 2. Add them to switch statement
if (!content.includes("case 'attendance':")) {
  content = content.replace(
    "        case 'marketing':\n          return <ManageMarketing currentUser={user} onBack={() => setActiveTab('overview')} />;",
    "        case 'marketing':\n          return <ManageMarketing currentUser={user} onBack={() => setActiveTab('overview')} />;\n        case 'attendance':\n          return <ManageAttendance currentUser={user} />;\n        case 'leaves':\n          return <ManageLeaves currentUser={user} />;"
  );
}

// 3. Add to drawer
if (!content.includes("Manage Attendance")) {
  content = content.replace(
    "                </TouchableOpacity>\n\n                <TouchableOpacity\n                  style={styles.drawerItem}\n                  onPress={() => { setShowSettingsModal(true); setIsDrawerOpen(false); }}",
    "                </TouchableOpacity>\n\n                <TouchableOpacity\n                  style={[\n                    styles.drawerItem,\n                    activeTab === 'attendance' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]\n                  ]}\n                  onPress={() => { setActiveTab('attendance'); setIsDrawerOpen(false); }}\n                >\n                  <Text style={styles.drawerItemIcon}>🕒</Text>\n                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Manage Attendance</Text>\n                </TouchableOpacity>\n\n                <TouchableOpacity\n                  style={[\n                    styles.drawerItem,\n                    activeTab === 'leaves' && [styles.drawerItemActive, { backgroundColor: themeColors.drawerItemActive, borderColor: themeColors.drawerItemActiveBorder }]\n                  ]}\n                  onPress={() => { setActiveTab('leaves'); setIsDrawerOpen(false); }}\n                >\n                  <Text style={styles.drawerItemIcon}>🏖️</Text>\n                  <Text style={[styles.drawerItemLabel, { color: themeColors.drawerItemText }]}>Leave Requests</Text>\n                </TouchableOpacity>\n\n                <TouchableOpacity\n                  style={styles.drawerItem}\n                  onPress={() => { setShowSettingsModal(true); setIsDrawerOpen(false); }}"
  );
}

// 4. Change styles to getStyles
content = content.replace("const styles = StyleSheet.create({", "const getStyles = (themeColors, isDark) => StyleSheet.create({");

// 5. Inject styles after existing useTheme declaration
const themeLine = 'const { theme, isDark, toggleTheme, themeColors } = useTheme();';
content = content.replace(
  themeLine,
  `${themeLine}\n  const styles = getStyles(themeColors, isDark);`
);

// 6. Map colors in styles
const colorMap = {
  "'#0d1117'": 'themeColors.background',
  "'#161b22'": 'themeColors.card',
  "'#21262d'": 'themeColors.card',
  "'#30363d'": 'themeColors.border',
  "'#f0f6fc'": 'themeColors.textPrimary',
  "'#c9d1d9'": 'themeColors.text',
  "'#8b949e'": 'themeColors.textSecondary',
  "'#f85149'": "'#ef4444'",
  "'#d29922'": "'#f59e0b'",
  "'#58a6ff'": 'themeColors.accent',
  "'#1f6feb'": 'themeColors.primary',
  "'#238636'": "'#10b981'",
  "'#3fb950'": "'#10b981'"
};

for (const [hex, themeVar] of Object.entries(colorMap)) {
  const hexRegex = new RegExp(`:\\s*${hex}`, 'gi');
  content = content.replace(hexRegex, `: ${themeVar}`);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Dashboard.js');
