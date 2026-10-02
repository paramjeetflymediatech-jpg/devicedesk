const fs = require('fs');
let code = fs.readFileSync('d:/devicedesk/app/admin/client-notes/page.js', 'utf8');

if (!code.includes('currentPage')) {
  // Add state variables
  code = code.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(true);\n  const [currentPage, setCurrentPage] = useState(1);\n  const notesPerPage = 10;");

  // Add pagination logic before return
  code = code.replace(/if \(loading\) return/, "const indexOfLastNote = currentPage * notesPerPage;\n  const indexOfFirstNote = indexOfLastNote - notesPerPage;\n  const currentNotes = notes.slice(indexOfFirstNote, indexOfLastNote);\n  const totalPages = Math.ceil(notes.length / notesPerPage);\n\n  if (loading) return");

  // Replace notes.map with currentNotes.map
  code = code.replace(/\{notes\.map\(note => \(/, '{currentNotes.map(note => (');

  // Add Pagination UI before the closing div of the list container
  const paginationUI = `
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 p-4" style={{ background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Showing {indexOfFirstNote + 1} to {Math.min(indexOfLastNote, notes.length)} of {notes.length} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className="w-10 h-10 rounded-lg font-bold transition-all"
                  style={{
                    background: currentPage === i + 1 ? 'var(--accent-cyan)' : 'var(--bg-secondary)',
                    color: currentPage === i + 1 ? '#fff' : 'var(--text-primary)',
                    border: currentPage === i + 1 ? 'none' : '1px solid var(--glass-border)'
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      `;

  code = code.replace(/<\/\div>[\r\n\s]*\)\}\([\r\n\s]*\{\/\* Attachment Preview Modal \/\*\/}/, `</div>${paginationUI})}\n\n      {/* Attachment Preview Modal */}`);
  
  fs.writeFileSync('d:/devicedesk/app/admin/client-notes/page.js', code);
  console.log('Pagination added!');
} else {
  console.log('Pagination already exists.');
}
