const fs = require('fs');
const path = require('path');

const files = [
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'chat', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'packages', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'billing', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'dashboard', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'seo', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'smo', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'ads', 'page.js'),
  path.join('d:', 'devicedesk', 'app', 'portal', 'client', 'book-service', 'page.js')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // Regex to match the entire <nav> block
  const navRegex = /<nav className="flex-1 p-4 flex flex-col space-y-2(?: overflow-y-auto)?">[\s\S]*?<\/nav>/;
  
  const isDashboard = file.includes('dashboard');
  const isOverview = file.includes('client\\page.js');
  const isChat = file.includes('chat');
  const isPackages = file.includes('packages');
  const isBilling = file.includes('billing');
  const isSEO = file.includes('seo');
  const isSMO = file.includes('smo');
  const isAds = file.includes('ads');
  const isBook = file.includes('book-service');

  const newNav = `<nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Main</div>
        <button onClick={() => window.location.href = '/portal/client/dashboard'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isDashboard ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiGrid size={20} /><span>Dashboard</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isOverview ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiLayout size={20} /><span>Project Overview</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/chat'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isChat ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiMessageSquare size={20} /><span>Project Chat</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/book-service'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isBook ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiEdit3 size={20} /><span>Book Service</span>
        </button>

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Projects</div>
        <button onClick={() => window.location.href = '/portal/client/seo'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isSEO ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiFileText size={20} /><span>SEO Reports</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/smo'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isSMO ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiImage size={20} /><span>SMO Graphics</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/ads'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isAds ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiDollarSign size={20} /><span>PAID Ads</span>
        </button>

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Billing & Packages</div>
        <button onClick={() => window.location.href = '/portal/client/packages'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isPackages ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiBox size={20} /><span>Packages</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/billing'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all ${isBilling ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">
          <FiCreditCard size={20} /><span>Billing</span>
        </button>
      </nav>`;

  content = content.replace(navRegex, newNav);

  // Ensure ALL icons are imported!
  const requiredIcons = ['FiLayout', 'FiMessageSquare', 'FiMenu', 'FiX', 'FiBox', 'FiCreditCard', 'FiGrid', 'FiFileText', 'FiImage', 'FiDollarSign', 'FiDownload', 'FiSend', 'FiEdit3'];
  
  let importLineMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]react-icons\/fi['"]/);
  if (importLineMatch) {
    let existingIcons = importLineMatch[1].split(',').map(i => i.trim());
    for (let icon of requiredIcons) {
      if (!existingIcons.includes(icon)) {
        existingIcons.push(icon);
      }
    }
    const newImportLine = `import { ${existingIcons.join(', ')} } from 'react-icons/fi'`;
    content = content.replace(importLineMatch[0], newImportLine);
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated ' + file);
}
