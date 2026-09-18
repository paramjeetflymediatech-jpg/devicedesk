const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ChatView.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace specific styles in the modals for visibility in light mode

// 1. Inputs: color: "#fff" -> color: "var(--text-primary)", background: "rgba(255,255,255,0.02)" -> "var(--bg-primary)"
content = content.replace(/background: "rgba\(255,255,255,0\.02\)"/g, 'background: "var(--bg-primary)"');
content = content.replace(/background: "rgba\(0,0,0,0\.2\)"/g, 'background: "var(--bg-primary)"');

// 2. Member list containers
content = content.replace(/maxHeight: "180px",/g, 'maxHeight: "350px", flexGrow: 1,');

// 3. Fix colors manually using string replace for exact matches
content = content.replace(/color: "#fff",\n(.*?)outline: "none"/g, 'color: "var(--text-primary)",\n$1outline: "none"');
content = content.replace(/color: "#fff" }\} \>Add Members to Group/g, 'color: "var(--text-primary)" }>Add Members to Group');

// Cancel buttons text color
content = content.replace(/color: "#fff", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "0\.85rem" }}/g, 'color: "var(--text-primary)", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem" }}');

// Modal X buttons
content = content.replace(/color: "#fff", cursor: "pointer", fontSize: "1\.2rem"/g, 'color: "var(--text-primary)", cursor: "pointer", fontSize: "1.2rem"');

// Fix Checkbox labels (the span wrapper might have inherited #fff)
content = content.replace(/color: "#fff",\n\s*marginRight: "8px"/g, 'color: "var(--text-primary)",\n                          marginRight: "8px"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modals patched successfully!');
