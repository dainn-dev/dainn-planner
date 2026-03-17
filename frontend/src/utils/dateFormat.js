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
