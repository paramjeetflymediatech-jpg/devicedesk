/**
 * Uploads files to the Next.js API using XHR to provide real-time progress updates.
 * Provides real-time upload progress including percentage and speed (MB/s).
 */
export async function uploadFilesWithProgress(files, onProgress) {
  const uploadedUrls = [];

  for (const file of files) {
    try {
      const url = await xhrUpload('/api/upload', file, onProgress);
      uploadedUrls.push(...url);
    } catch (err) {
      console.error('File upload error:', err);
      throw err;
    }
  }

  return uploadedUrls;
}

function xhrUpload(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000; // in seconds
        
        // Calculate speed if at least 500ms passed to avoid erratic jumping
        let speedMBps = 0;
        if (timeDiff > 0.5) {
          const loadedDiff = e.loaded - lastLoaded;
          speedMBps = (loadedDiff / timeDiff) / (1024 * 1024); // MB/s
          lastLoaded = e.loaded;
          lastTime = currentTime;
        }

        const percent = Math.round((e.loaded * 100) / e.total);
        const uploadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
        const totalMB = (e.total / (1024 * 1024)).toFixed(2);

        if (onProgress) {
          onProgress({
            percent,
            speedMBps: speedMBps > 0 ? speedMBps.toFixed(2) : null,
            uploadedMB,
            totalMB,
            fileName: file.name
          });
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res.fileUrls || []);
        } catch (e) {
          reject(new Error('Invalid JSON response from server'));
        }
      } else {
        if (xhr.status === 413) {
          const sizeMB = file?.size ? (file.size / (1024 * 1024)).toFixed(1) : null;
          const sizeText = sizeMB ? ` (${sizeMB} MB)` : '';
          reject(new Error(`The file "${file?.name || 'attachment'}"${sizeText} is too large and exceeds the server upload limit (413 Request Entity Too Large). Please choose a smaller file or share a Google Drive link.`));
        } else {
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed && parsed.error) errorMsg = parsed.error;
          } catch (e) {
            if (xhr.responseText) {
              const match = xhr.responseText.match(/<h1[^>]*>([^<]+)<\/h1>/i) || xhr.responseText.match(/<title[^>]*>([^<]+)<\/title>/i);
              if (match && match[1]) {
                errorMsg = match[1].trim();
              }
            }
          }
          reject(new Error(errorMsg));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error occurred during upload. Please check your internet connection.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));

    xhr.open('POST', url);
    const formData = new FormData();
    formData.append('files', file);
    xhr.send(formData);
  });
}
