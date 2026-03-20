import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { integrationsAPI, USER_SETTINGS_STORAGE_KEY } from '../services/api';
import { formatDateWithWeekday } from '../utils/dateFormat';
import { isStoredAdmin } from '../utils/auth';
import LogoutButton from '../components/LogoutButton';

const MOBILE_BREAKPOINT = 640;

const VIEW_DAY = 'day';
const VIEW_WEEK = 'week';
const VIEW_MONTH = 'month';

function toGoogleDate8(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function startOfWeek(date, weekStartDay) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0..6 (Sun..Sat)
  // Monday is default when weekStartDay !== 'sunday'
  const delta = weekStartDay === 'sunday' ? -dow : -((dow + 6) % 7);
  d.setDate(d.getDate() + delta);
  return d;
}

function computeGoogleDatesParam(currentDate, viewMode, weekStartDay) {
  const base = new Date(currentDate);
  base.setHours(0, 0, 0, 0);

  if (viewMode === VIEW_DAY) {
    const start = base;
    const end = new Date(base);
    end.setHours(0, 0, 0, 0);
    return `${toGoogleDate8(start)}/${toGoogleDate8(end)}`;
  }

  if (viewMode === VIEW_WEEK) {
    const start = startOfWeek(base, weekStartDay);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${toGoogleDate8(start)}/${toGoogleDate8(end)}`;
  }

  // Month view
  const y = base.getFullYear();
  const m = base.getMonth();
  const start = new Date(y, m, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m + 1, 0);
  end.setHours(0, 0, 0, 0);
  return `${toGoogleDate8(start)}/${toGoogleDate8(end)}`;
}

function buildGoogleCalendarEmbedUrl(calendarSrc, { ctz, viewMode, weekStartDay, currentDate }) {
  const id = String(calendarSrc ?? '').trim();
  if (!id) return '';

  const mode = viewMode === VIEW_MONTH ? 'MONTH' : viewMode === VIEW_WEEK ? 'WEEK' : 'AGENDA';
  const wkst = weekStartDay === 'sunday' ? '1' : '2';
  const dates = computeGoogleDatesParam(currentDate, viewMode, weekStartDay);

  const params = new URLSearchParams({
    src: id,
    ctz: ctz || 'UTC',
    mode,
    wkst,
    dates,
  });

  return `https://calendar.google.com/calendar/embed?${params.toString()}`;
}

const CalendarPage = () => {
  const { t } = useTranslation();
  const isAdmin = isStoredAdmin();
  const location = useLocation();

  const [currentDate] = useState(() => new Date());
  const [viewMode] = useState(() => (
    (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) ? VIEW_DAY : VIEW_WEEK
  ));

  const [weekStartDay] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' && localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      const v = stored?.weekStartDay;
      return (v === 'sunday' || v === 'monday') ? v : 'monday';
    } catch {
      return 'monday';
    }
  });

  const browserTimeZone = useMemo(
    () => (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'),
    []
  );

  const [googleCalendarSrcId, setGoogleCalendarSrcId] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [embedSrcLoading, setEmbedSrcLoading] = useState(true);

  const isActive = (path) => {
    if (path === '/settings') {
      return location.pathname.startsWith('/settings');
    }
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard';
    }
    if (path === '/admin/users') {
      return location.pathname.startsWith('/admin/users');
    }
    if (path === '/admin/logs') {
      return location.pathname.startsWith('/admin/logs');
    }
    return location.pathname === path;
  };

  const menuItemBase = 'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors';
  const menuItemActive = 'bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300';
  const menuItemInactive = 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white';

  const googleEmbedUrl = useMemo(() => {
    if (!googleCalendarSrcId) return '';
    return buildGoogleCalendarEmbedUrl(googleCalendarSrcId, {
      ctz: browserTimeZone,
      viewMode,
      weekStartDay,
      currentDate,
    });
  }, [googleCalendarSrcId, browserTimeZone, viewMode, weekStartDay, currentDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setEmbedSrcLoading(true);
      try {
        const r = await integrationsAPI.getGoogleCalendarEmbedSrc();
        const src = r?.src ?? r?.Src;
        if (!cancelled && typeof src === 'string' && src.trim()) {
          setGoogleCalendarSrcId(src.trim());
          if (!cancelled) setEmbedSrcLoading(false);
          return;
        }
      } catch {
        // Token issue / not connected.
      }
      if (!cancelled) setGoogleCalendarSrcId('');
      if (!cancelled) setEmbedSrcLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display overflow-x-hidden min-h-screen flex flex-row">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={t('calendar.googleEmbedTitle')}
          icon="calendar_today"
          notifications={[]}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#101922] p-2 sm:p-4">
          {embedSrcLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-primary">hourglass_empty</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : googleEmbedUrl ? (
            <div className="flex flex-1 flex-col min-h-0">
              <iframe
                key={googleEmbedUrl}
                title={t('calendar.googleEmbedTitle')}
                src={googleEmbedUrl}
                className="w-full h-full flex-1 min-h-0 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                <p className="max-w-md text-sm text-slate-700 dark:text-slate-200 font-medium">
                  {t('calendar.googleEmbedMissingId')}
                </p>
                <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                  {t('calendar.googleEmbedLoginHint')}
                </p>
              </div>
              <Link
                to="/settings/goals"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {t('calendar.settings')}
              </Link>

              <div className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                {viewMode === VIEW_DAY ? formatDateWithWeekday(currentDate) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 z-[51] transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
          <h1 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
          <button
            className="ml-auto p-1 rounded-md text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4 flex-1">
          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                className={`${menuItemBase} ${isActive('/admin/dashboard') ? menuItemActive : menuItemInactive}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>{t('admin.dashboard')}</span>
              </Link>
              <Link
                to="/admin/users"
                className={`${menuItemBase} ${isActive('/admin/users') ? menuItemActive : menuItemInactive}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">people</span>
                <span>{t('admin.users')}</span>
              </Link>
              <Link
                to="/admin/logs"
                className={`${menuItemBase} ${isActive('/admin/logs') ? menuItemActive : menuItemInactive}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">description</span>
                <span>{t('admin.logs')}</span>
              </Link>
              <div className="my-2 border-t border-gray-100 dark:border-slate-700" />
            </>
          )}

          <Link
            to="/daily"
            className={`${menuItemBase} ${isActive('/daily') ? menuItemActive : menuItemInactive}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined fill-1">today</span>
            <span>{t('sidebar.dailyPlan')}</span>
          </Link>
          <Link
            to="/goals"
            className={`${menuItemBase} ${isActive('/goals') ? menuItemActive : menuItemInactive}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">target</span>
            <span>{t('sidebar.goals')}</span>
          </Link>
          <Link
            to="/calendar"
            className={`${menuItemBase} ${isActive('/calendar') ? menuItemActive : menuItemInactive}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>{t('sidebar.calendar')}</span>
          </Link>
          <Link
            to="/settings"
            className={`${menuItemBase} ${isActive('/settings') ? menuItemActive : menuItemInactive}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>{t('sidebar.settings')}</span>
          </Link>

          <div className="mt-auto border-t border-gray-100 dark:border-slate-700 pt-4">
            <LogoutButton labelKey="sidebar.logout" />
          </div>
        </div>
      </nav>
    </div>
  );
};

export default CalendarPage;

