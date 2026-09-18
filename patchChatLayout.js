const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ChatView.js');
let content = fs.readFileSync(filePath, 'utf8');

// The better way is to add the Tailwind class for hiding on mobile
content = content.replace(
  /\{\/\* MAIN CHAT AREA \*\/\}\s*<div style=\{\{/g,
  '{/* MAIN CHAT AREA */}\n      <div className={showMobileSidebar ? "hidden md:flex flex-grow h-full relative" : "flex flex-grow h-full relative"} style={{'
);

content = content.replace(
  /className="chat-sidebar"\s*style=\{\{\s*width: "320px",/g,
  'className={`chat-sidebar ${showMobileSidebar ? "flex w-full" : "hidden"} md:flex md:w-[320px] flex-col h-full shrink-0 border-r border-[var(--glass-border)] bg-[var(--bg-secondary)]`}\n        style={{ width: "100%", maxWidth: "320px",'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Layout patched successfully!');
