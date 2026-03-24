import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Github,
  Youtube,
  Twitch,
  Dribbble,
  Globe,
  Globe2,
  ChevronDown,
  CircleHelp,
  Search,
} from 'lucide-react';

/**
 * Canonical names — keep in sync with `cv-next/lib/constants/social-platforms.ts` (SOCIAL_PLATFORM_OPTIONS).
 */
const SOCIAL_PLATFORM_NAMES = [
  'Twitter',
  'Facebook',
  'Instagram',
  'LinkedIn',
  'GitHub',
  'YouTube',
  'TikTok',
  'Pinterest',
  'Reddit',
  'Discord',
  'Twitch',
  'Medium',
  'Behance',
  'Dribbble',
  'Other',
];

/** Sorted for search UX (same pattern as fact icons). */
const SOCIAL_PLATFORM_OPTIONS = [...SOCIAL_PLATFORM_NAMES].sort((a, b) => a.localeCompare(b));

const SOCIAL_ICON_BY_PLATFORM = {
  Twitter,
  Facebook,
  Instagram,
  LinkedIn: Linkedin,
  GitHub: Github,
  YouTube: Youtube,
  TikTok: Globe,
  Pinterest: Globe,
  Reddit: Globe,
  Discord: Globe,
  Twitch,
  Medium: Globe,
  Behance: Globe,
  Dribbble,
  Other: Globe2,
};

const SEARCH_INPUT =
  'w-full rounded-lg border border-zinc-200/90 dark:border-slate-600 bg-zinc-50/90 py-2 pl-9 pr-3 text-sm text-zinc-900 dark:bg-slate-800/90 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80';

const ROW_BTN =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-slate-800';

function PlatformIcon({ platform }) {
  const C =
    platform && SOCIAL_ICON_BY_PLATFORM[platform] ? SOCIAL_ICON_BY_PLATFORM[platform] : CircleHelp;
  return <C className="h-4 w-4 shrink-0 text-zinc-500 dark:text-slate-400" aria-hidden />;
}

/**
 * Searchable social platform field with Lucide icons (My CV profile socials).
 * @param {string} value
 * @param {(next: string) => void} onChange
 * @param {string} placeholder
 * @param {string} [className]
 */
export default function CvSocialPlatformPicker({ value, onChange, placeholder, className = '' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const knownSet = useMemo(() => new Set(SOCIAL_PLATFORM_OPTIONS), []);
  const rawValue = typeof value === 'string' ? value : '';
  const isKnown = knownSet.has(rawValue);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SOCIAL_PLATFORM_OPTIONS.filter((name) => !q || name.toLowerCase().includes(q));
  }, [query]);

  const legacyExtra = useMemo(() => {
    if (!rawValue || isKnown) return null;
    const q = query.trim().toLowerCase();
    if (q && !rawValue.toLowerCase().includes(q)) return null;
    return rawValue;
  }, [rawValue, isKnown, query]);

  const select = (v) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const displayLabel = !rawValue ? placeholder : rawValue;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${className} flex w-full min-h-[42px] cursor-pointer items-center gap-2 text-left`}
      >
        <PlatformIcon platform={isKnown ? rawValue : ''} />
        <span className={`min-w-0 flex-1 truncate ${!rawValue ? 'text-zinc-400 dark:text-slate-500' : ''}`}>
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900">
          <div className="border-b border-zinc-200/80 p-2 dark:border-slate-600">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('myCv.iconPicker.searchPlaceholder')}
                className={SEARCH_INPUT}
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-[min(280px,50vh)] overflow-y-auto p-1" role="listbox">
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={!rawValue}
                className={ROW_BTN}
                onClick={() => select('')}
              >
                <span className="text-zinc-400 dark:text-slate-500">{placeholder}</span>
              </button>
            </li>
            {legacyExtra ? (
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={rawValue === legacyExtra}
                  className={ROW_BTN}
                  onClick={() => select(legacyExtra)}
                >
                  <PlatformIcon platform="" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{legacyExtra}</span>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    {t('myCv.iconPicker.legacyBadge')}
                  </span>
                </button>
              </li>
            ) : null}
            {filtered.map((name) => (
              <li key={name} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={rawValue === name}
                  className={ROW_BTN}
                  onClick={() => select(name)}
                >
                  <PlatformIcon platform={name} />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
