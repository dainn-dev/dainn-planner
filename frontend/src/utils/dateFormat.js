/**
 * Date/time formatting from user settings (localStorage user_settings).
 * Uses general.dateFormat, general.timeFormat, general.language when available.
 */

const USER_SETTINGS_STORAGE_KEY = 'user_settings';

function getStoredSettings() {
  try {
    const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Detect date order from settings dateFormat string (e.g. "2024-12-31 (YYYY-MM-DD)" or "31/12/2024 (DD/MM/YYYY)").
 * @returns {'ymd'|'dmy'|'mdy'}
 */
function getDateOrder() {
  const settings = getStoredSettings();
  const fmt = settings?.general?.dateFormat ?? settings?.general?.dateformat ?? '';
  const upper = fmt.toUpperCase();
  if (upper.includes('YYYY-MM-DD') || upper.includes('YYYY/MM/DD')) return 'ymd';
  if (upper.includes('DD/MM/YYYY') || upper.includes('DD-MM-YYYY')) return 'dmy';
  if (upper.includes('MM/DD/YYYY') || upper.includes('MM-DD-YYYY')) return 'mdy';
  const lang = settings?.general?.language ?? 'vi';
  return lang === 'en' ? 'mdy' : 'dmy';
}

/**
 * @returns {{ locale: string, hour12: boolean, dateOrder: string }}
 */
export function getFormatSettings() {
  const settings = getStoredSettings();
  const general = settings?.general;
  const language = general?.language ?? 'vi';
  const timeFormat = general?.timeFormat ?? '24';
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const hour12 = timeFormat !== '24';
  const dateOrder = getDateOrder();
  return { locale, hour12, dateOrder };
}

/**
 * Format date parts according to user's dateFormat setting (YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY).
 * @param {Date} d
 * @param {'ymd'|'dmy'|'mdy'} dateOrder
 * @returns {string}
 */
function formatDateByOrder(d, dateOrder) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (dateOrder === 'ymd') return `${year}-${month}-${day}`;
  if (dateOrder === 'dmy') return `${day}/${month}/${year}`;
  return `${month}/${day}/${year}`;
}

/**
 * Format a date for display (date only) using user's dateFormat and locale from settings.
 * @param {Date | string | number} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { dateOrder } = getFormatSettings();
  return formatDateByOrder(d, dateOrder);
}

/**
 * Format time for display using user's 12/24 preference from settings.
 * @param {Date | string | number} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { locale, hour12 } = getFormatSettings();
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: undefined,
    hour12,
  });
}

/**
 * Format date and time for display using settings.
 * @param {Date | string | number} date
 * @returns {string}
 */
export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { locale, hour12, dateOrder } = getFormatSettings();
  const dateStr = formatDateByOrder(d, dateOrder);
  const timeStr = d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
  return `${dateStr} ${timeStr}`;
}

/**
 * Format date with weekday using locale and date order from settings.
 * @param {Date | string | number} date
 * @returns {string}
 */
export function formatDateWithWeekday(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { locale, dateOrder } = getFormatSettings();
  const weekday = d.toLocaleDateString(locale, { weekday: 'long' });
  const dateStr = formatDateByOrder(d, dateOrder);
  return `${weekday}, ${dateStr}`;
}

/**
 * Local calendar date YYYY-MM-DD (not UTC — avoids wrong day near midnight).
 * @param {Date | string | number} date
 * @returns {string}
 */
export function formatLocalDateIso(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Local wall-clock time as HH:mm (24h). Use for API-derived instants and &lt;input type="time"&gt;.
 * Do not use ISO string slice(11,16) — that is UTC in "…Z" responses (e.g. Google Calendar).
 * @param {Date | string | number} date
 * @returns {string | null}
 */
export function formatLocalTimeHHmm(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Local calendar date + local time → UTC ISO string for the API.
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:mm
 * @returns {string | null}
 */
export function localDateTimeToUtcIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const tp = timeStr.split(':');
  const h = Number(tp[0]);
  const min = tp.length > 1 ? Number(tp[1]) : 0;
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31 || Number.isNaN(h) || Number.isNaN(min)) return null;
  const dt = new Date(y, mo - 1, d, h, min, 0, 0);
  return dt.toISOString();
}

/**
 * Start/end of a local calendar day as UTC ISO (all-day events).
 * @param {string} dateStr YYYY-MM-DD
 */
export function localDateStartUtcIso(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d, 0, 0, 0, 0).toISOString();
}

/** @param {string} dateStr YYYY-MM-DD */
export function localDateEndUtcIso(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d, 23, 59, 59, 999).toISOString();
}
