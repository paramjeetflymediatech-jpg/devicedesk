const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'mobile', 'src', 'screens', 'Admin');

const colorMap = {
  "'#f8fafc'": 'themeColors.background',
  "'#ffffff'": 'themeColors.card',
  "'#e2e8f0'": 'themeColors.border',
  "'#0f172a'": 'themeColors.textPrimary',
  "'#334155'": 'themeColors.text',
  "'#64748b'": 'themeColors.textSecondary',
  "'#94a3b8'": 'themeColors.textMuted',
  "'#ef4444'": "'#ef4444'",
  "'#f59e0b'": "'#f59e0b'",
  "'#3b82f6'": 'themeColors.accent',
  "'#2563eb'": 'themeColors.primary',
  "'#10b981'": "'#10b981'"
};

const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  if (file === 'ManageAttendance.js' || file === 'ManageLeaves.js' || file === 'Dashboard.js') return;

  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace colors
  for (const [hex, themeVar] of Object.entries(colorMap)) {
    const hexRegex = new RegExp(`:\\s*${hex}`, 'gi');
    content = content.replace(hexRegex, `: ${themeVar}`);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Forced colors on ${file}`);
});
