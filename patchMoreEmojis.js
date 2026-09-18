const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ChatView.js');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure the new icons are imported
const newIcons = ['FiMapPin', 'FiTrash2', 'FiInfo'];
newIcons.forEach(icon => {
  if (!content.includes(icon)) {
    content = content.replace(
      '} from "react-icons/fi";',
      `, ${icon} } from "react-icons/fi";`
    );
  }
});

// Replace Emojis with react-icons components
const replacements = [
  { match: /📌/g, replace: '<FiMapPin />' },
  { match: /🧹/g, replace: '<FiTrash2 />' },
  { match: /ℹ️/g, replace: '<FiInfo />' },
];

replacements.forEach(({ match, replace }) => {
  content = content.replace(match, replace);
});

// Fix any string literals that might have broken due to direct string replacement
content = content.replace(/"<FiMapPin \/> Pinned"/g, '(<> <FiMapPin /> Pinned </>)');
content = content.replace(/"<FiMapPin \/> Pin"/g, '(<> <FiMapPin /> Pin </>)');
content = content.replace(/"<FiMapPin \/> Unpin Conversation"/g, '(<> <FiMapPin /> Unpin Conversation </>)');
content = content.replace(/"<FiMapPin \/> Pin Conversation"/g, '(<> <FiMapPin /> Pin Conversation </>)');
content = content.replace(/"<FiTrash2 \/> Clear Chat"/g, '(<> <FiTrash2 /> Clear Chat </>)');
content = content.replace(/"<FiTrash2 \/> Clear Chat Display"/g, '(<> <FiTrash2 /> Clear Chat Display </>)');
content = content.replace(/"<FiInfo \/> Info"/g, '(<> <FiInfo /> Info </>)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Extra Emojis patched successfully!');
