const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ChatView.js');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure react-icons are imported
if (!content.includes("from 'react-icons/fi'")) {
  content = content.replace(
    'import { io } from "socket.io-client";',
    'import { io } from "socket.io-client";\nimport { FiPaperclip, FiCamera, FiMic, FiSend, FiMessageSquare, FiUsers, FiBriefcase, FiDownload, FiFile, FiCornerUpRight, FiX, FiMoreVertical, FiPlay, FiPause } from "react-icons/fi";'
  );
}

// Replace emojis with Icons
const replacements = [
  { match: /📎/g, replace: '<FiPaperclip />' },
  { match: /📷/g, replace: '<FiCamera />' },
  { match: /🎙️/g, replace: '<FiMic />' },
  { match: /🚀/g, replace: '<FiSend />' },
  { match: /💬/g, replace: '<FiMessageSquare />' },
  { match: /🏢/g, replace: '<FiBriefcase />' },
  { match: /👥/g, replace: '<FiUsers />' },
  { match: /📥/g, replace: '<FiDownload />' },
  { match: /📄/g, replace: '<FiFile />' },
  { match: /↪️/g, replace: '<FiCornerUpRight />' },
  { match: /❌/g, replace: '<FiX />' },
  { match: /🎤/g, replace: '<FiMic />' },
];

replacements.forEach(({ match, replace }) => {
  content = content.replace(match, replace);
});

// Fix string templates that were broken by direct `<Fi... />` insertion
content = content.replace(/'<FiPaperclip \/> Document'/g, '(<> <FiPaperclip /> Document </>)');
content = content.replace(/'<FiCamera \/> Photo'/g, '(<> <FiCamera /> Photo </>)');
content = content.replace(/'<FiMic \/> Voice Note'/g, '(<> <FiMic /> Voice Note </>)');
content = content.replace(/`<FiPaperclip \/> \$\{lastMsg.fileName \|\| "File"\}`/g, '(<> <FiPaperclip /> {lastMsg.fileName || "File"} </>)');
content = content.replace(/"<FiPaperclip \/> Document"/g, '(<> <FiPaperclip /> Document </>)');
content = content.replace(/"<FiCamera \/> Photo"/g, '(<> <FiCamera /> Photo </>)');
content = content.replace(/"<FiMic \/> Voice Note"/g, '(<> <FiMic /> Voice Note </>)');

// Fix JSX syntax error in Regexes
content = content.replace(/<FiCornerUpRight \/> Forwarded/g, '<FiCornerUpRight \\/> Forwarded');

fs.writeFileSync(filePath, content, 'utf8');
console.log('ChatView.js patched successfully!');
