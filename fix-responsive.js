const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const pages = walk('d:/devicedesk/app/admin');

let changedFiles = 0;

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Fix header flex layout
  content = content.replace(/className=(['"])((?:(?!['"]).)*?flex justify-between items-center(?:(?!['"]).)*?)(['"])/g, (match, p1, p2, p3) => {
    // If it already has md:flex-row, it might be fixed already
    if (p2.includes('md:flex-row')) return match;
    let newClass = p2.replace('flex justify-between items-center', 'flex flex-col md:flex-row justify-between items-start md:items-center gap-4');
    return `className=${p1}${newClass}${p3}`;
  });

  // 2. Wrap <table ...> in <div className="overflow-x-auto"> if not already wrapped
  // This is a bit tricky with regex, so we'll look for `<table` and insert wrapper.
  // Actually, wait, it's safer to just rely on the global CSS we added in layout.js, 
  // BUT to be 100% sure we can add overflow-x-auto to the table wrapper divs.
  
  // 3. Fix standard search bar flex layouts
  content = content.replace(/className=(['"])((?:(?!['"]).)*?flex items-center gap-3(?:(?!['"]).)*?)(['"])/g, (match, p1, p2, p3) => {
    if (p2.includes('flex-wrap')) return match;
    return `className=${p1}${p2} flex-wrap${p3}`;
  });
  
  // 4. Fix table layouts specifically for pagination and search
  content = content.replace(/className=(['"])((?:(?!['"]).)*?flex justify-between items-center bg-white rounded-t-lg(?:(?!['"]).)*?)(['"])/g, (match, p1, p2, p3) => {
    if (p2.includes('flex-wrap')) return match;
    return `className=${p1}${p2} flex-wrap gap-4${p3}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Fixed:', file);
  }
});

console.log(`Done! Fixed ${changedFiles} files.`);
