/**
 * Utilities for detecting and preventing phone number sharing in client notes and replies.
 */

export function containsPhoneNumber(text) {
  if (!text || typeof text !== 'string') return false;

  // Strip URLs and system IDs (e.g., https://..., emp_178911..., note_1789..., pkg_1789...)
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b[a-zA-Z]{2,}_\d+\b/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '');

  // 1. Spaced out / dash-separated digits e.g. "9 8 7 6 5 4 3 2 1 0" or "98-76-54-32-10"
  const spacedMatch = cleaned.match(/(?:\d[\s.,_-]){7,}\d/);
  if (spacedMatch) {
    const digitsOnly = spacedMatch[0].replace(/\D/g, '');
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) return true;
  }

  // 2. Standard phone formats (Indian 10-digit mobile, international, etc.)
  const phoneRegexes = [
    /(?:(?:\+91|91|0)?[-\s]?)?[6-9]\d{4}[-\s]?\d{5}\b/,
    /\b\d{10,14}\b/,
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\b\d{3,4}[-.\s]\d{3,4}[-.\s]\d{3,4}\b/
  ];

  for (const regex of phoneRegexes) {
    const match = cleaned.match(regex);
    if (match) {
      const digitsOnly = match[0].replace(/\D/g, '');
      if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
        return true;
      }
      if (/^[6-9]\d{9}$/.test(digitsOnly)) {
        return true;
      }
    }
  }

  // 3. Keyword followed by numbers
  const keywordRegex = /(?:phone|mobile|call|whatsapp|contact|cell|wa\.me|tel|dial|ph)\s*[:=-]?\s*([0-9\s.,_-]{7,16})/i;
  const kwMatch = cleaned.match(keywordRegex);
  if (kwMatch) {
    const digits = kwMatch[1].replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) return true;
  }

  return false;
}

export const PHONE_POLICY_WARNING =
  'Sharing phone numbers or direct contact details is not permitted. Please keep all communication inside the company portal.';
