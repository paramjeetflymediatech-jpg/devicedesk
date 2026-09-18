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
  "'#ef4444'": "'#ef4444'", // keep red explicit unless we have themeColors.danger
  "'#f59e0b'": "'#f59e0b'",
  "'#3b82f6'": 'themeColors.accent',
  "'#2563eb'": 'themeColors.primary',
  "'#10b981'": "'#10b981'"
};

const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  // Skip already dynamic ones if any
  if (file === 'ManageAttendance.js' || file === 'ManageLeaves.js' || file === 'Dashboard.js') return;

  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add import if missing
  if (!content.includes("import { useTheme }")) {
    content = content.replace("import React", "import { useTheme } from '../../utils/ThemeContext';\nimport React");
  }

  // 2. Change StyleSheet.create to getStyles
  if (content.includes('const styles = StyleSheet.create({')) {
    content = content.replace('const styles = StyleSheet.create({', 'const getStyles = (themeColors, isDark) => StyleSheet.create({');
    
    // 3. Inject hook and styles instantiation inside component
    const funcRegex = /(export default function\s+\w+\s*\([^)]*\)\s*\{)/;
    if (funcRegex.test(content) && !content.includes('const styles = getStyles(')) {
      if (content.includes('const { theme, isDark, toggleTheme, themeColors } = useTheme();')) {
        // Just inject getStyles
        content = content.replace(funcRegex, `$1\n  const styles = getStyles(themeColors, isDark);`);
      } else {
        // Inject both
        content = content.replace(funcRegex, `$1\n  const { themeColors, isDark } = useTheme();\n  const styles = getStyles(themeColors, isDark);`);
      }
    } else {
      console.log(`Could not inject hook into ${file}`);
    }

    // 4. Replace colors inside the file
    // We only replace them in the styles area (but a global replace for these specific hex strings is generally safe enough in RN style files)
    for (const [hex, themeVar] of Object.entries(colorMap)) {
      // replace only if it's the right side of a colon (style value)
      const hexRegex = new RegExp(`:\\s*${hex}`, 'gi');
      content = content.replace(hexRegex, `: ${themeVar}`);
    }

    // Fix some edge cases where styles was imported or used incorrectly
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${file}`);
  }
});
