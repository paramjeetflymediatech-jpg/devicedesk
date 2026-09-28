const fs = require('fs');
const file = 'd:/devicedesk/app/api/client-services/requests/route.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "`SELECT * FROM service_requests WHERE clientId = ? ORDER BY created_at DESC`",
  "`SELECT r.*, c.name as client_name, tl.name as tl_name FROM service_requests r LEFT JOIN employees c ON r.clientId = c.id LEFT JOIN employees tl ON r.assigned_tl_id = tl.id WHERE r.clientId = ? ORDER BY r.created_at DESC`"
);

content = content.replace(
  "`SELECT * FROM service_requests ORDER BY created_at DESC`",
  "`SELECT r.*, c.name as client_name, tl.name as tl_name FROM service_requests r LEFT JOIN employees c ON r.clientId = c.id LEFT JOIN employees tl ON r.assigned_tl_id = tl.id ORDER BY r.created_at DESC`"
);

fs.writeFileSync(file, content);
console.log("Updated route.js!");
