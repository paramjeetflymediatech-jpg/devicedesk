/**
 * Indian Standard Time (IST / Asia/Kolkata) Utility Functions Powered by the Temporal API
 * Ensures 100% consistent dates, times, and duration calculations across all server environments and clients.
 */

import { Temporal } from 'temporal-polyfill';

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Converts any date representation (MySQL string, ISO string, epoch ms, Date object)
 * into a Temporal.ZonedDateTime bound to Asia/Kolkata.
 */
export function toIstZonedDateTime(input = null) {
  if (!input) {
    return Temporal.Now.zonedDateTimeISO(IST_TIMEZONE);
  }
  if (typeof input === 'number') {
    return Temporal.Instant.fromEpochMilliseconds(input).toZonedDateTimeISO(IST_TIMEZONE);
  }
  if (input instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(input.getTime()).toZonedDateTimeISO(IST_TIMEZONE);
  }
  let s = String(input).trim();
  // If "YYYY-MM-DD" date only
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return Temporal.PlainDate.from(s).toZonedDateTime({ timeZone: IST_TIMEZONE });
  }
  // Replace space with T for MySQL datetime strings
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }
  // If no timezone offset specified, treat it as local IST PlainDateTime
  if (!s.includes('+') && !s.endsWith('Z') && !s.includes('[')) {
    return Temporal.PlainDateTime.from(s).toZonedDateTime(IST_TIMEZONE);
  }
  if (s.includes('[')) {
    return Temporal.ZonedDateTime.from(s, { disambiguation: 'compatible' });
  }
  return Temporal.Instant.from(s).toZonedDateTimeISO(IST_TIMEZONE);
}

/**
 * Returns comprehensive IST date/time fields using Temporal.ZonedDateTime and Temporal.PlainDate
 */
export function getIstTimeInfo(input = null) {
  const zdt = toIstZonedDateTime(input);
  const plainDate = zdt.toPlainDate();
  const dateStr = plainDate.toString(); // "YYYY-MM-DD"
  const hh = String(zdt.hour).padStart(2, '0');
  const min = String(zdt.minute).padStart(2, '0');
  const ss = String(zdt.second).padStart(2, '0');

  const timeFormatted = zdt.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const timeFormattedWithSec = zdt.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const timeIso = `${dateStr}T${hh}:${min}:${ss}+05:30`;
  const mysqlIstDateTime = `${dateStr} ${hh}:${min}:${ss}`;

  const punchHour = zdt.hour;
  const punchMin = zdt.minute;
  const totalMinutesSinceMidnight = punchHour * 60 + punchMin;
  // Shift cutoff: 09:40 AM IST
  const isLate = totalMinutesSinceMidnight > (9 * 60 + 40);

  return {
    zonedDateTime: zdt,
    plainDate,
    dateStr,
    timeFormatted,
    timeFormattedWithSec,
    timeIso,
    mysqlIstDateTime,
    punchHour,
    punchMin,
    isLate,
    epochMs: zdt.epochMilliseconds
  };
}

/**
 * Returns current or input date as "YYYY-MM-DD" in IST
 */
export function formatLocalDate(input = null) {
  return getIstTimeInfo(input).dateStr;
}

/**
 * Formats any date input into user-facing 12-hour IST time using Temporal
 * Example: "11:52 AM" or "11:52:06 AM"
 */
export function formatIstTime(dtInput, includeSeconds = false) {
  if (!dtInput) return '-';
  try {
    const { timeFormatted, timeFormattedWithSec } = getIstTimeInfo(dtInput);
    return includeSeconds ? timeFormattedWithSec : timeFormatted;
  } catch (e) {
    return String(dtInput);
  }
}

/**
 * Formats any date input into localized IST date string using Temporal
 * Example: "Nov 20, 2026"
 */
export function formatIstDate(dtInput, dateStyle = 'medium') {
  if (!dtInput) return '-';
  try {
    const { zonedDateTime } = getIstTimeInfo(dtInput);
    return zonedDateTime.toLocaleString('en-US', { dateStyle });
  } catch (e) {
    return String(dtInput);
  }
}

/**
 * Parses any date/time into epoch milliseconds using Temporal
 */
export function parseIstMs(dtInput) {
  if (!dtInput) return Date.now();
  try {
    return toIstZonedDateTime(dtInput).epochMilliseconds;
  } catch (e) {
    return Date.now();
  }
}

/**
 * Calculates duration between two timestamps in minutes using Temporal.Duration
 */
export function getMinutesBetween(startInput, endInput) {
  try {
    const start = toIstZonedDateTime(startInput);
    const end = toIstZonedDateTime(endInput);
    const duration = start.until(end, { largestUnit: 'minute' });
    return Math.max(1, Math.floor(duration.minutes));
  } catch (e) {
    return 1;
  }
}

/**
 * Helper to format minutes into human readable "Xh Ym" or "Xm"
 */
export function formatDurationMinutes(totalMinutes) {
  const m = Math.max(0, parseInt(totalMinutes, 10) || 0);
  if (m >= 60) {
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }
  return `${m}m`;
}
