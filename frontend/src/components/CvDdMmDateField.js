import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Parse stored CV date string to yyyy-mm-dd for &lt;input type="date"&gt;.
 * Supports: yyyy-mm-dd, d/m/yyyy or dd/mm/yyyy, yyyy (→ Jan 1).
 * @returns {string} ISO date, or '' if empty, or null if not parseable (free text e.g. Present).
 */
export function parseCvDateToIso(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (s === '') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, mo - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return null;
}

/** yyyy-mm-dd → DD/MM/YYYY for JSON storage */
export function isoDateToDdMmYyyy(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, mo, d] = iso.split('-');
  return `${d}/${mo}/${y}`;
}

/**
 * Date picker (stores DD/MM/YYYY) with optional text mode for values like "Present".
 */
export default function CvDdMmDateField({ value, onChange, className = '', inputId }) {
  const { t } = useTranslation();
  const raw = typeof value === 'string' ? value : '';
  const iso = parseCvDateToIso(raw);
  const [textMode, setTextMode] = useState(() => Boolean(raw !== '' && iso === null));

  useEffect(() => {
    const i = parseCvDateToIso(raw);
    if (raw !== '' && i === null) setTextMode(true);
  }, [raw]);

  const toggleBtn =
    'text-left text-[11px] font-medium text-primary hover:underline dark:text-blue-400';

  if (textMode) {
    return (
      <div className="flex flex-col gap-1">
        <input
          id={inputId}
          type="text"
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          placeholder={t('myCv.dateTextPlaceholder')}
          autoComplete="off"
        />
        <button
          type="button"
          className={toggleBtn}
          onClick={() => {
            const i = parseCvDateToIso(raw);
            if (i === null) onChange('');
            else onChange(isoDateToDdMmYyyy(i));
            setTextMode(false);
          }}
        >
          {t('myCv.dateUsePickerLink')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        id={inputId}
        type="date"
        value={typeof iso === 'string' ? iso : ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? isoDateToDdMmYyyy(v) : '');
        }}
        className={className}
      />
      <button type="button" className={toggleBtn} onClick={() => setTextMode(true)}>
        {t('myCv.dateUseTextLink')}
      </button>
    </div>
  );
}
