const fs = require('fs');

function fixBookService() {
  let file = 'd:/devicedesk/app/portal/client/book-service/page.js';
  let code = fs.readFileSync(file, 'utf8');

  if(!code.includes('Please Buy Package First')) {
    const search = `<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Tell Us Your Requirements</h3>`;
    
    const replace = `{activePackages.length === 0 ? (
              <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-2xl shadow-sm mb-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-white shadow-sm text-rose-500 rounded-full flex items-center justify-center mb-5">
                  <FiCreditCard size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Please Buy Package First</h3>
                <p className="text-gray-600 mb-6 max-w-md">You need an active package subscription to book services. Please buy a package first as per your requirement.</p>
                <a href="/portal/client/packages" className="bg-pink-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-pink-700 transition-colors inline-block">
                  View Packages
                </a>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Tell Us Your Requirements</h3>`;

    code = code.replace(search, replace);
    
    const search2 = `</form>
              </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">`;
    const replace2 = `</form>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">`;
            
    code = code.replace(search2, replace2);
    
    fs.writeFileSync(file, code);
    console.log('Fixed book-service');
  }
}

function fixNotes() {
  let file = 'd:/devicedesk/app/portal/client/notes/page.js';
  let code = fs.readFileSync(file, 'utf8');

  if(!code.includes('Please Buy Package First')) {
    const search = `<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <FiEdit3 className="mr-2 text-indigo-600" />
                Write a Note to Management
              </h3>`;
    
    const replace = `{activePackages.length === 0 ? (
              <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-2xl shadow-sm mb-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-white shadow-sm text-rose-500 rounded-full flex items-center justify-center mb-5">
                  <FiCreditCard size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Please Buy Package First</h3>
                <p className="text-gray-600 mb-6 max-w-md">You need an active package subscription to write notes to management. Please buy a package first as per your requirement.</p>
                <a href="/portal/client/packages" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-colors inline-block">
                  View Packages
                </a>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <FiEdit3 className="mr-2 text-indigo-600" />
                Write a Note to Management
              </h3>`;

    code = code.replace(search, replace);
    
    const search2 = `</div>
              </form>
            </div>

            {/* List of Previous Notes */}`;
    const replace2 = `</div>
              </form>
            </div>
            )}

            {/* List of Previous Notes */}`;
            
    code = code.replace(search2, replace2);
    
    fs.writeFileSync(file, code);
    console.log('Fixed notes');
  }
}

fixBookService();
fixNotes();
