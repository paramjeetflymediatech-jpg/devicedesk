const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace indigo with pink
      content = content.replace(/indigo-/g, 'pink-');
      
      const headerStart = '<div className="p-6 border-b border-gray-100 flex items-center space-x-3">';
      const navStart = '<nav ';
      
      const idxStart = content.indexOf(headerStart);
      const idxNav = content.indexOf(navStart, idxStart);
      
      if (idxStart !== -1 && idxNav !== -1) {
        const replacement = `<div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center space-y-3">
        <img src="/flymedia-logo.png" alt="Fly Media Technology" className="h-16 object-contain" />
      </div>
      
      `;
        content = content.substring(0, idxStart) + replacement + content.substring(idxNav);
      }
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir('d:/devicedesk/app/portal/client');
console.log('Done');
