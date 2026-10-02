const fs = require('fs');
const file = 'd:/devicedesk/app/portal/leader/client-requests/page.js';
let code = fs.readFileSync(file, 'utf8');

// Update mappedReqs to include attachment
if (!code.includes('attachment: req.attachment')) {
  code = code.replace(
    /status: req\.status \|\| 'Pending Assignment'/g,
    "status: req.status || 'Pending Assignment',\n            attachment: req.attachment"
  );
}

// Update HTML string in Swal to include attachment
if (!code.includes('Client Attachment')) {
  code = code.replace(
    /<div style="background: #f1f5f9; padding: 12px; border-radius: 6px; max-height: 250px; overflow-y: auto; white-space: pre-wrap; margin-top: 5px;">\$\{req\.details\}<\/div>/g,
    `<div style="background: #f1f5f9; padding: 12px; border-radius: 6px; max-height: 250px; overflow-y: auto; white-space: pre-wrap; margin-top: 5px;">\${req.details}</div>
          \${req.attachment ? \`<p style="margin-top: 15px; margin-bottom: 5px;"><strong>Client Attachment:</strong></p>
          <div style="background: #e0f2fe; padding: 10px; border-radius: 6px;"><a href="\${req.attachment}" target="_blank" style="color: #2563eb; text-decoration: underline;">View Attached File</a></div>\` : ''}`
  );
}

fs.writeFileSync(file, code);
console.log('Fixed attachment display');
