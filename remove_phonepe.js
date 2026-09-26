const fs = require('fs');

let billingCode = fs.readFileSync('d:/devicedesk/app/portal/client/billing/page.js', 'utf8');

// replace handlePayment
billingCode = billingCode.replace(
  /const handlePayment = async \(e\) => \{[\s\S]*?catch \(err\) \{\s*Swal\.fire\('Error', 'Network error occurred\.', 'error'\);\s*setPaymentLoading\(false\);\s*\}\s*\};/,
  `const handlePayment = async (e) => { e.preventDefault(); Swal.fire('Notice', 'Payments are processed offline via cash.', 'info'); };`
);

// replace Pay Now button
billingCode = billingCode.replace(
  /<button\s*onClick=\{\(\) => \{ setPaymentAmount\(inv.amount\); window.scrollTo\(\{ top: 0, behavior: 'smooth' \}\); \}\}\s*className="px-4 py-2 bg-pink-50 text-pink-700 hover:bg-pink-100 font-bold rounded-lg transition-colors text-sm"\s*>\s*Pay Now\s*<\/button>/g,
  `<span className="px-4 py-2 bg-gray-50 text-gray-600 font-bold rounded-lg text-sm italic">Offline Cash Payment</span>`
);

fs.writeFileSync('d:/devicedesk/app/portal/client/billing/page.js', billingCode, 'utf8');
console.log('Billing page updated');
