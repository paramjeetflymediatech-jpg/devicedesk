const fs = require('fs');
const file = 'd:/devicedesk/app/portal/leader/client-requests/page.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import Pagination from '../../../components/Pagination';", "import Pagination from '../../../components/Pagination';\nimport { useAuth } from '../../auth/AuthContext';");
content = content.replace("const [assigning, setAssigning] = useState(false);", "const [assigning, setAssigning] = useState(false);\n  const { user } = useAuth();");
content = content.replace("status: req.status || 'Pending Assignment'\n          }));\n          setClientRequests(mappedReqs);", "status: req.status || 'Pending Assignment',\n            assigned_tl_id: req.assigned_tl_id\n          }));\n          setClientRequests(user ? mappedReqs.filter(r => r.assigned_tl_id === user.id) : []);");
content = content.replace("fetchData();\n  }, []);", "fetchData();\n    }\n    if (user) fetchData();\n  }, [user]);");

fs.writeFileSync(file, content);
console.log("Replaced!");
