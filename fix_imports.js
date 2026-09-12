const fs = require('fs');
const path = require('path');

const files = [
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'chat', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'packages', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'billing', 'page.js')
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Simply replace "from 'react-icons/fi';" with ", FiGrid } from 'react-icons/fi';" 
  // Wait, I need to put it inside the braces.
  // Better: replace '} from \'react-icons/fi\'' with ', FiGrid } from \'react-icons/fi\''
  if (!content.includes('FiGrid }')) {
    content = content.replace(/}\s*from\s*['"]react-icons\/fi['"]/, ', FiGrid } from \'react-icons/fi\'');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed imports in ' + file);
}
