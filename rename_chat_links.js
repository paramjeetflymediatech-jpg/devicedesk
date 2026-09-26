const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const jsFiles = walkSync('d:/devicedesk/app/portal/client').filter(f => f.endsWith('.js'));

for (const f of jsFiles) {
  let content = fs.readFileSync(f, 'utf8');
  let updated = false;

  if (content.includes('/portal/client/chat')) {
    content = content.replace(/\/portal\/client\/chat/g, '/portal/client/notes');
    updated = true;
  }
  if (content.includes('Project Chat')) {
    content = content.replace(/Project Chat/g, 'Project Notes');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
  }
}
