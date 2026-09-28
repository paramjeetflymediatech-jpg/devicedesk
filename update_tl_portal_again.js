const fs = require('fs');
const file = 'd:/devicedesk/app/portal/leader/client-requests/page.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "client: req.clientId || 'Unknown Client',",
  "client: req.client_name || req.clientId || 'Unknown Client',\n            assigned_tl_id: req.assigned_tl_id,"
);

content = content.replace(
  "setClientRequests(mappedReqs);",
  "setClientRequests(user ? mappedReqs.filter(r => r.assigned_tl_id === user.id) : []);"
);

content = content.replace(
  "fetchData();\n  }, []);",
  "if (user) fetchData();\n  }, [user]);"
);

fs.writeFileSync(file, content);
console.log("Updated TL portal page.js!");
