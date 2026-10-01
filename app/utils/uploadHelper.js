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
          reject(new Error('Invalid JSON response'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network Error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload Aborted')));

    xhr.open('POST', url);
    const formData = new FormData();
    formData.append('files', file);
    xhr.send(formData);
  });
}
