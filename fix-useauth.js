const fs = require('fs');
let code = fs.readFileSync('d:/devicedesk/app/admin/client-notes/page.js', 'utf8');

if (!code.includes('const { user } = useAuth();')) {
  code = code.replace(/export default function AdminClientNotesPage\(\) \{[\r\n\s]+const \[notes/, "export default function AdminClientNotesPage() {\n  const { user } = useAuth();\n  const [notes");
}

fs.writeFileSync('d:/devicedesk/app/admin/client-notes/page.js', code);
console.log('done!');
