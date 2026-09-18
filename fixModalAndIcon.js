const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ChatView.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the string literal `<FiBriefcase />` becoming raw text
content = content.replace(/"<FiBriefcase \/>"/g, '<FiBriefcase />');

// 2. Fix Conversation Members modal heading color
content = content.replace(/color: "#fff" }\} \>Conversation Members/g, 'color: "var(--text-primary)" }>Conversation Members');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Modal and Icon successfully!');
