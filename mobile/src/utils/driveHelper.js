import { Linking, Alert } from 'react-native';
import { sweetAlert } from './sweetAlert';

/**
 * Checks if a string is a valid Google Drive or Google Docs URL
 */
export function isDriveUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.includes('drive.google.com') ||
    clean.includes('docs.google.com') ||
    clean.includes('sheets.google.com')
  );
}

/**
 * Categorizes a Google Drive link
 */
export function getDriveLinkMeta(url) {
  if (!url) return null;
  const str = String(url).trim();
  const lower = str.toLowerCase();

  let type = 'folder';
  let label = 'Google Drive Folder';

  if (lower.includes('/folders/') || lower.includes('id=')) {
    type = 'folder';
    label = 'Requirements Folder';
  } else if (lower.includes('document/d/') || lower.includes('/document/')) {
    type = 'doc';
    label = 'Google Doc';
  } else if (lower.includes('spreadsheets/d/') || lower.includes('/spreadsheets/')) {
    type = 'sheet';
    label = 'Google Sheet';
  } else if (lower.includes('presentation/d/') || lower.includes('/presentation/')) {
    type = 'slide';
    label = 'Google Slides';
  } else if (lower.includes('/file/d/')) {
    type = 'file';
    label = 'Google Drive File';
  }

  return { url: str, type, label };
}

/**
 * Extracts all Google Drive links from arbitrary values (string, array, or object fields)
 */
export function extractDriveLinks(source) {
  if (!source) return [];
  const found = new Set();
  const results = [];

  const addIfDrive = (text) => {
    if (!text || typeof text !== 'string') return;
    // Regex matching any drive.google.com or docs.google.com URL
    const regex = /https?:\/\/(?:drive|docs|sheets)\.google\.com\/[^\s"')<>]+/gi;
    const matches = text.match(regex);
    if (matches) {
      matches.forEach(rawUrl => {
        const clean = rawUrl.replace(/[.,;)]+$/, '');
        if (!found.has(clean)) {
          found.add(clean);
          results.push(getDriveLinkMeta(clean));
        }
      });
    }
  };

  const traverse = (val) => {
    if (!val) return;
    if (typeof val === 'string') {
      addIfDrive(val);
      // If it's JSON encoded
      if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(val);
          traverse(parsed);
        } catch (e) {}
      }
    } else if (Array.isArray(val)) {
      val.forEach(item => traverse(item));
    } else if (typeof val === 'object') {
      // Check common property names
      const priorityKeys = [
        'drive_url',
        'drive_link',
        'driveUrl',
        'driveLink',
        'google_drive',
        'googleDrive',
        'attachment',
        'attachments',
        'fileUrl',
        'file_url',
        'client_attachment',
        'client_attachments',
        'description',
        'requirement',
        'notes',
        'note',
        'message'
      ];
      priorityKeys.forEach(k => {
        if (val[k]) traverse(val[k]);
      });
    }
  };

  traverse(source);
  return results;
}

/**
 * Opens a Google Drive link safely
 */
export async function openDriveLink(url) {
  if (!url) {
    sweetAlert({
      title: 'Missing Link',
      text: 'No Google Drive URL provided.',
      type: 'info'
    });
    return;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback
      await Linking.openURL(url);
    }
  } catch (err) {
    console.log('Error opening Google Drive link:', err);
    sweetAlert({
      title: 'Could Not Open Link',
      text: 'Unable to open Google Drive URL. Please make sure you have internet access or a browser installed: ' + url,
      type: 'error'
    });
  }
}
