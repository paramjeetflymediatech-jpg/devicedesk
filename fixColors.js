const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'mobile', 'src', 'screens', 'Admin');

const colorMap = {
  '#0d1117': '#f8fafc',
  '#161b22': '#ffffff',
  '#21262d': '#ffffff', // sometimes used for buttons
  '#30363d': '#e2e8f0',
  '#8b949e': '#64748b',
  '#c9d1d9': '#334155',
  '#f0f6fc': '#0f172a',
  '#f85149': '#ef4444',
  '#ff7b72': '#ef4444',
  '#d29922': '#f59e0b',
  '#58a6ff': '#3b82f6',
  '#1f6feb': '#2563eb',
  '#238636': '#10b981',
  '#3fb950': '#10b981',
  '#1f2328': '#ffffff'
};

const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [dark, light] of Object.entries(colorMap)) {
    const regex1 = new RegExp(dark, 'gi');
    if (regex1.test(content)) {
      content = content.replace(regex1, light);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated colors in ${file}`);
  }
});
