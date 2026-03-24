import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Smile,
  FileText,
  Headphones,
  User,
  Star,
  Heart,
  Camera,
  Coffee,
  Book,
  Code,
  Briefcase,
  Award,
  Check,
  Clock,
  Cloud,
  Download,
  Edit,
  Eye,
  Gift,
  Globe,
  Key,
  Lock,
  Mail,
  Map,
  Music,
  Phone,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Trash2,
  Upload,
  Zap,
  ClipboardList,
  BarChart,
  Binoculars,
  Sun,
  Calendar,
  ChevronDown,
  CircleHelp,
} from 'lucide-react';

/** Keys must stay aligned with `cv-next` fact-icons / service-icons */
const LUCIDE_BY_NAME = {
  Smile,
  FileText,
  Headphones,
  User,
  Star,
  Heart,
  Camera,
  Coffee,
  Book,
  Code,
  Briefcase,
  Award,
  Check,
  Clock,
  Cloud,
  Download,
  Edit,
  Eye,
  Gift,
  Globe,
  Key,
  Lock,
  Mail,
  Map,
  Music,
  Phone,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Trash2,
  Upload,
  Zap,
  ClipboardList,
  BarChart,
  Binoculars,
  Sun,
  Calendar,
};

const SEARCH_INPUT =
  'w-full rounded-lg border border-zinc-200/90 dark:border-slate-600 bg-zinc-50/90 py-2 pl-9 pr-3 text-sm text-zinc-900 dark:bg-slate-800/90 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80';

const ROW_BTN =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-slate-800';

function PickerIcon({ name }) {
  const C = name && LUCIDE_BY_NAME[name] ? LUCIDE_BY_NAME[name] : CircleHelp;
  return <C className="h-4 w-4 shrink-0 text-zinc-500 dark:text-slate-400" aria-hidden />;
}

/**
 * Searchable icon field with Lucide preview (Facts / Services in My CV).
 * @param {string} value
 * @param {(next: string) => void} onChange
 * @param {string[]} optionNames sorted display names
 * @param {string} placeholder empty-state label
 * @param {string} [className] trigger classes (e.g. CV_INPUT_NESTED)
 */
export default function CvIconPicker({ value, onChange, optionNames, placeholder, className = '' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const knownSet = useMemo(() => new Set(optionNames), [optionNames]);
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
    return optionNames.filter((name) => !q || name.toLowerCase().includes(q));
  }, [optionNames, query]);

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
        className={`${className} flex w-full cursor-pointer items-center gap-2 text-left`}
      >
        <PickerIcon name={isKnown ? rawValue : ''} />
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
                  <PickerIcon name="" />
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
                  <PickerIcon name={name} />
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
