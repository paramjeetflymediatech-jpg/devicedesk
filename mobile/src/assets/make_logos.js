const fs = require('fs');
const path = require('path');

// Clean valid 1x1 PNG base64 data fallback that AAPT can parse seamlessly
// PNG header: \x89PNG\r\n\x1a\n
const validPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const buffer = Buffer.from(validPngBase64, 'base64');

fs.writeFileSync(path.join(__dirname, 'flymedia_logo_white.png'), buffer);
fs.writeFileSync(path.join(__dirname, 'flymedia_logo.png'), buffer);

console.log('Successfully generated valid AAPT compliant PNG logo assets!');
