/**
 * Utilities for detecting and preventing phone number sharing in client notes and replies.
 */

export function containsPhoneNumber(text) {
  if (!text || typeof text !== 'string') return false;

  // Strip URLs and system IDs (e.g., https://..., emp_178911..., note_1789..., pkg_1789...)
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b[a-zA-Z]{2,}_\d+\b/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '') // dates like 2026-10-21
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ''); // times like 10:30:00

  // 1. Spaced out / dash-separated digits e.g. "9 8 7", "9 8 7 4" or "98-76-54" or "9-8-7-4"
  const spacedMatch = cleaned.match(/(?:\d[\s.,_-]){2,}\d/);
  if (spacedMatch) {
    const digitsOnly = spacedMatch[0].replace(/\D/g, '');
    if (digitsOnly.length >= 3 && digitsOnly.length <= 15) return true;
  }

  // 2. Keyword followed by numbers (e.g. "call 987", "phone: 1234", "whatsapp: 98...", "ph: 98...", "no: 987")
  const keywordRegex = /(?:phone|mobile|mob|call|whatsapp|contact|cell|wa\.me|wa|tel|dial|ph|number|num|no\.?)(?:\s+(?:me|at|on|is|no|number|num))?\s*[:=-]?\s*([0-9\s.,_-]{3,16})/i;
  const kwMatch = cleaned.match(keywordRegex);
  if (kwMatch) {
    const digits = kwMatch[1].replace(/\D/g, '');
    if (digits.length >= 3 && digits.length <= 15) return true;
  }

  // 3. Standard phone formats & partial phone numbers (Indian mobile starting 6-9 with 3+ digits, international with +, chunked, etc.)
  const phoneRegexes = [
    // Indian mobile starting with 6-9 (with optional +91 or 0), matching 3 to 10+ digits e.g. 987, 9874, 9876543210
    /(?:(?:\+91|91|0)?[-\s]?)?[6-9]\d{2,}\b/,
    // International prefix (+ or 00) followed by 3+ digits e.g. +1 555, +44 1234
    /(?:\+\d{1,4}|\b00\d{1,3})[-\s]?\d{3,}\b/,
    // Standard 7 to 15 digit sequence
    /\b\d{7,15}\b/,
    // Parenthesis formatted (555) 123 or (555) 123-4567
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}/,
    // Chunked numbers: 987-654, 987.654, 987 654
    /\b\d{3,4}[-.\s]\d{3,4}\b/
  ];

  for (const regex of phoneRegexes) {
    const match = cleaned.match(regex);
    if (match) {
      const digitsOnly = match[0].replace(/\D/g, '');
      if (digitsOnly.length >= 3 && digitsOnly.length <= 15) {
        return true;
      }
    }
  }

  return false;
}

export const PHONE_POLICY_WARNING =
  'Sharing phone numbers or direct contact details is not permitted. Please keep all communication inside the company portal.';
