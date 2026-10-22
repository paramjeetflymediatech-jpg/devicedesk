'use client';
import React from 'react';
import { FiExternalLink, FiFolder, FiFileText } from 'react-icons/fi';

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
  let subtext = 'Client Requirements & Files';

  if (lower.includes('/folders/') || lower.includes('id=')) {
    type = 'folder';
    label = 'Requirements Folder';
    subtext = 'Google Drive Folder';
  } else if (lower.includes('document/d/') || lower.includes('/document/')) {
    type = 'doc';
    label = 'Google Doc';
    subtext = 'Requirements Document';
  } else if (lower.includes('spreadsheets/d/') || lower.includes('/spreadsheets/')) {
    type = 'sheet';
    label = 'Google Sheet';
    subtext = 'Spreadsheet & Data';
  } else if (lower.includes('presentation/d/') || lower.includes('/presentation/')) {
    type = 'slide';
    label = 'Google Slides';
    subtext = 'Presentation Deck';
  } else if (lower.includes('/file/d/')) {
    type = 'file';
    label = 'Google Drive File';
    subtext = 'Shared File Asset';
  }

  return { url: str, type, label, subtext };
}

/**
 * Extracts all Google Drive links from arbitrary values (string, array, or object)
 */
export function extractDriveLinks(source) {
  if (!source) return [];
  const found = new Set();
  const results = [];

  const addIfDrive = (text) => {
    if (!text || typeof text !== 'string') return;
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
      if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(val);
          traverse(parsed);
        } catch (e) {}
      }
    } else if (Array.isArray(val)) {
      val.forEach(item => traverse(item));
    } else if (typeof val === 'object') {
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
        'message',
        'content'
      ];
      priorityKeys.forEach(k => {
        if (val[k]) traverse(val[k]);
      });
    }
  };

  traverse(source);
  return results;
}

export function GoogleDriveIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7.71 3.5L1.15 15h6.43L14.14 3.5H7.71z" fill="#0F9D58" />
      <path d="M16.29 3.5H9.86L16.42 15h6.43L16.29 3.5z" fill="#4285F4" />
      <path d="M4 19.5L1.5 15h13l2.5 4.5H4z" fill="#FFBA00" />
    </svg>
  );
}

/**
 * Modern Google Drive Folder / Link Badge for Website Admin Panel & Chat
 */
export default function GoogleDriveBadge({ source, url, compact = false, className = '' }) {
  const links = url ? [getDriveLinkMeta(url)].filter(Boolean) : extractDriveLinks(source);

  if (!links || links.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 my-1.5 w-full ${className}`}>
      {links.map((item, index) => {
        if (compact) {
          return (
            <a
              key={index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs max-w-full shadow-sm"
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                borderColor: 'rgba(59, 130, 246, 0.25)',
                color: 'var(--text-primary)'
              }}
              title={item.url}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-xs border border-slate-200 dark:border-slate-700">
                  <GoogleDriveIcon size={13} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[11px] truncate text-blue-600 dark:text-blue-400 group-hover:underline">
                    {item.label}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                Drive <FiExternalLink size={10} />
              </span>
            </a>
          );
        }

        return (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 w-full"
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(6, 182, 212, 0.06) 100%)',
              borderColor: 'rgba(59, 130, 246, 0.25)',
            }}
            title={item.url}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm border border-slate-200/80 dark:border-slate-700">
                <GoogleDriveIcon size={22} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 group-hover:underline tracking-tight">
                    {item.label}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Google Drive
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Click to open folder and verify client project files ↗
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-600 text-white group-hover:bg-blue-700 shadow-sm shrink-0 transition-colors">
              <span>View Folder</span>
              <FiExternalLink size={12} />
            </div>
          </a>
        );
      })}
    </div>
  );
}
