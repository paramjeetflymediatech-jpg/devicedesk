const fs = require('fs');
let code = fs.readFileSync('d:/devicedesk/app/admin/client-notes/page.js', 'utf8');

// Replace main container
code = code.replace(/<div className="flex-1 p-6 bg-slate-50\/50 min-h-screen">/, '<div className="page-container p-6">');

// Replace Header
code = code.replace(
  /<h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">[\s\S]*?<\/h1>/,
  '<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">\n        <h1 className="text-2xl font-bold" style={{ color: \'var(--text-primary)\', display: \'flex\', alignItems: \'center\', gap: \'10px\' }}>\n          <FiMessageSquare style={{ color: \'var(--accent-cyan)\' }} /> Client Messages & Notes\n        </h1>\n      </div>'
);

// Replace empty state
code = code.replace(
  /<div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm max-w-4xl">/,
  '<div style={{ background: \'var(--glass-bg)\', padding: \'3rem\', borderRadius: \'12px\', border: \'1px solid var(--glass-border)\', textAlign: \'center\', color: \'var(--text-secondary)\' }}>'
);
code = code.replace(/<FiMessageSquare className="text-4xl mx-auto mb-3 text-slate-300" \/>/, '<FiMessageSquare size={48} style={{ margin: \'0 auto 12px\', color: \'var(--text-muted)\' }} />');

// Remove max-w-4xl from grid to make it full width (responsive)
code = code.replace(/className="grid gap-6 max-w-4xl"/, 'className="grid gap-6"');

// Replace Note Cards
code = code.replace(
  /className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4"/g,
  'className="flex flex-col gap-4" style={{ background: \'var(--glass-bg)\', padding: \'1.5rem\', borderRadius: \'12px\', border: \'1px solid var(--glass-border)\' }}'
);

// Note headers
code = code.replace(/border-b border-slate-100 pb-4/g, ''); // we'll use inline style
code = code.replace(/className="flex justify-between items-start"/, 'className="flex justify-between items-start pb-4" style={{ borderBottom: \'1px solid var(--glass-border)\' }}');

// Note user circle
code = code.replace(
  /className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold"/g,
  'style={{ width: \'40px\', height: \'40px\', borderRadius: \'50%\', background: \'rgba(6, 182, 212, 0.1)\', color: \'var(--accent-cyan)\', display: \'flex\', alignItems: \'center\', justifyContent: \'center\', fontWeight: \'bold\' }}'
);

// Note user text
code = code.replace(/className="font-bold text-slate-800"/g, 'style={{ fontWeight: \'bold\', color: \'var(--text-primary)\' }}');
code = code.replace(/className="text-xs text-slate-500"/g, 'style={{ fontSize: \'0.75rem\', color: \'var(--text-secondary)\' }}');

// Note content body
code = code.replace(
  /className="bg-slate-50 p-4 rounded-lg text-slate-800 whitespace-pre-wrap border border-slate-100 leading-relaxed"/g,
  'style={{ background: \'var(--bg-secondary)\', padding: \'1rem\', borderRadius: \'8px\', color: \'var(--text-primary)\', whiteSpace: \'pre-wrap\', border: \'1px solid var(--glass-border)\', lineHeight: \'1.6\' }}'
);

// View attachment buttons
code = code.replace(
  /className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:shadow-sm px-3 py-1.5 rounded-lg border border-blue-100 transition-all w-fit"/g,
  'style={{ display: \'inline-flex\', alignItems: \'center\', gap: \'6px\', fontSize: \'0.75rem\', fontWeight: \'bold\', color: \'var(--accent-cyan)\', background: \'rgba(6, 182, 212, 0.1)\', padding: \'6px 12px\', borderRadius: \'8px\', border: \'1px solid rgba(6, 182, 212, 0.2)\' }}'
);

code = code.replace(
  /className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100\/60 hover:bg-blue-200 hover:shadow-sm px-3 py-1.5 rounded-lg border border-blue-200 transition-all w-fit"/g,
  'style={{ display: \'inline-flex\', alignItems: \'center\', gap: \'6px\', fontSize: \'0.75rem\', fontWeight: \'bold\', color: \'#a855f7\', background: \'rgba(168, 85, 247, 0.1)\', padding: \'6px 12px\', borderRadius: \'8px\', border: \'1px solid rgba(168, 85, 247, 0.2)\' }}'
);

// Reply section
code = code.replace(
  /className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-2 shadow-sm"/g,
  'style={{ background: \'rgba(168, 85, 247, 0.05)\', borderLeft: \'4px solid #a855f7\', padding: \'1rem\', borderRadius: \'0 8px 8px 0\', marginTop: \'8px\' }}'
);
code = code.replace(/className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide"/g, 'style={{ fontSize: \'0.75rem\', fontWeight: \'bold\', color: \'#a855f7\', marginBottom: \'4px\', textTransform: \'uppercase\' }}');
code = code.replace(/className="text-blue-900 whitespace-pre-wrap leading-relaxed"/g, 'style={{ color: \'var(--text-primary)\', whiteSpace: \'pre-wrap\', lineHeight: \'1.6\' }}');

// Reply Input area
code = code.replace(/className="flex flex-col gap-3 pt-4 border-t border-slate-100 mt-2"/g, 'className="flex flex-col gap-3 pt-4 mt-2" style={{ borderTop: \'1px solid var(--glass-border)\' }}');
code = code.replace(
  /className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm min-h-\[100px\] shadow-sm transition-shadow"/g,
  'className="w-full p-4 text-sm outline-none transition-shadow" style={{ background: \'var(--bg-secondary)\', border: \'1px solid var(--glass-border)\', borderRadius: \'12px\', minHeight: \'100px\', color: \'var(--text-primary)\' }}'
);

// Send button
code = code.replace(
  /className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed min-w-\[130px\] w-full sm:w-auto"/g,
  'className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed" style={{ background: \'var(--accent-cyan)\', color: \'#000\', border: \'none\', minWidth: \'130px\' }}'
);

// Attach label
code = code.replace(
  /className="cursor-pointer text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm font-medium bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm shrink-0"/g,
  'className="cursor-pointer flex items-center gap-1 text-sm font-medium shrink-0 transition-colors" style={{ background: \'var(--bg-secondary)\', color: \'var(--text-secondary)\', border: \'1px solid var(--glass-border)\', padding: \'8px 16px\', borderRadius: \'12px\' }}'
);

fs.writeFileSync('d:/devicedesk/app/admin/client-notes/page.js', code);
console.log('Done!');
