const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ChatView.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Revert ALL `<FiCornerUpRight \/>` back to `<FiCornerUpRight />`
content = content.replace(/<FiCornerUpRight \\\/>/g, '<FiCornerUpRight />');

// 2. ONLY fix the regex literals!
// The regex literals look like: /^\<FiCornerUpRight \/> Forwarded\n?/
// In the source code as text, it's literally: /^<FiCornerUpRight /> Forwarded\n?/
content = content.replace(/\/\^<FiCornerUpRight \/> Forwarded\\n\?\//g, '/^<FiCornerUpRight \\/> Forwarded\\n?/');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed JSX syntax!');
