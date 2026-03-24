import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import { eventsAPI, googleEventsAPI, integrationsAPI, notificationsAPI, USER_SETTINGS_STORAGE_KEY } from '../services/api';
import { isStoredAdmin } from '../utils/auth';
import { toast } from '../utils/toast';
import { formatDateWithWeekday, formatLocalDateIso, formatLocalTimeHHmm } from '../utils/dateFormat';

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

function buildGoogleCalendarEmbedUrl(calendarSrc, { ctz, viewMode, weekStartDay, currentDate, hl }) {
  const id = String(calendarSrc ?? '').trim();
  if (!id) return '';

  const mode = viewMode === VIEW_MONTH ? 'MONTH' : viewMode === VIEW_WEEK ? 'WEEK' : 'AGENDA';
  const wkst = weekStartDay === 'sunday' ? '1' : '2';
  const dates = computeGoogleDatesParam(currentDate, viewMode, weekStartDay);

  const params = new URLSearchParams({
    src: id,
    ctz: ctz || 'UTC',
    hl: hl || 'en',
    mode,
    wkst,
    dates,
  });

  return `https://calendar.google.com/calendar/embed?${params.toString()}`;
}

function toDatetimeLocalValueFromIso(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function toDateInputValueFromUtcIso(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function utcDateInputToIso(dateStr) {
  if (!dateStr) return null;
  // Interpret input `YYYY-MM-DD` as UTC date.
  const v = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(v.getTime())) return null;
  return v.toISOString();
}

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const isAdmin = isStoredAdmin();

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [googleCalendarSrcId, setGoogleCalendarSrcId] = useState('');
  const [embedReloadKey, setEmbedReloadKey] = useState(0);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);

  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  ));
  const [eventsOpen, setEventsOpen] = useState(false);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // CalendarEventDto
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    isAllDay: false,
    startDate: '', // YYYY-MM-DD when isAllDay
    endDate: '', // YYYY-MM-DD when isAllDay
    startDateTime: '', // datetime-local when !isAllDay
    endDateTime: '', // datetime-local when !isAllDay
    location: '',
    color: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);


  const googleEmbedUrl = useMemo(() => {
    if (!googleCalendarSrcId) return '';
    return buildGoogleCalendarEmbedUrl(googleCalendarSrcId, {
      ctz: browserTimeZone,
      hl: i18n.language || 'en',
      viewMode,
      weekStartDay,
      currentDate,
    });
  }, [googleCalendarSrcId, browserTimeZone, i18n.language, viewMode, weekStartDay, currentDate]);

  const eventRange = useMemo(() => {
    const base = new Date(currentDate);
    base.setHours(0, 0, 0, 0);

    if (viewMode === VIEW_DAY) {
      const d = formatLocalDateIso(base);
      return { startStr: d, endStr: d };
    }

    if (viewMode === VIEW_WEEK) {
      const start = startOfWeek(base, weekStartDay);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startStr: formatLocalDateIso(start), endStr: formatLocalDateIso(end) };
    }

    // Month
    const y = base.getFullYear();
    const m = base.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { startStr: formatLocalDateIso(start), endStr: formatLocalDateIso(end) };
  }, [currentDate, viewMode, weekStartDay]);

  const loadEvents = async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await eventsAPI.getEvents({ startDate: eventRange.startStr, endDate: eventRange.endStr });
      const list = res?.data ?? res?.items ?? res ?? [];
      setEvents(Array.isArray(list) ? list : []);
    } catch (e) {
      setEventsError(e?.message || 'Failed to load events');
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventRange.startStr, eventRange.endStr]);

  const openCreateModal = () => {
    const baseDateStr = formatLocalDateIso(new Date(currentDate));
    const start = new Date(currentDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(10, 0, 0, 0);

    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      isAllDay: false,
      startDate: baseDateStr,
      endDate: baseDateStr,
      startDateTime: toDatetimeLocalValueFromIso(start.toISOString()),
      endDateTime: toDatetimeLocalValueFromIso(end.toISOString()),
      location: '',
      color: '',
    });
    setEventModalOpen(true);
  };

  const openEditModal = (evt) => {
    const isGoogle = evt?.source === 'Google';
    const allDay = !!evt?.isAllDay;
    setEditingEvent(evt);

    setEventForm({
      title: evt?.title ?? '',
      description: evt?.description ?? '',
      isAllDay: allDay,
      startDate: allDay ? toDateInputValueFromUtcIso(evt?.startDate) : '',
      endDate: allDay ? toDateInputValueFromUtcIso(evt?.endDate) : '',
      startDateTime: !allDay ? toDatetimeLocalValueFromIso(evt?.startDate) : '',
      endDateTime: !allDay ? toDatetimeLocalValueFromIso(evt?.endDate) : '',
      location: evt?.location ?? '',
      color: evt?.color ?? '',
    });

    setEventModalOpen(true);
    // Prevent unused warning if isGoogle isn't used yet.
    void isGoogle;
  };

  const closeModal = () => {
    setEventModalOpen(false);
    setEditingEvent(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await integrationsAPI.getGoogleCalendarEmbedSrc();
        const src = r?.src ?? r?.Src;
        if (!cancelled && typeof src === 'string' && src.trim()) {
          setGoogleCalendarSrcId(src.trim());
          return;
        }
      } catch {
        // Token issue / not connected.
      }
      if (!cancelled) setGoogleCalendarSrcId('');
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    notificationsAPI.getNotifications({ limit: 20 })
      .then((data) => setNotifications(Array.isArray(data) ? data : (data?.notifications ?? [])))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display min-h-screen flex flex-row overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={t('calendar.googleEmbedTitle')}
          icon="calendar_month"
          extraButtons={[
            <button
              key="events-toggle"
              type="button"
              onClick={() => setEventsOpen((v) => !v)}
              className={`flex items-center justify-center gap-2 h-10 cursor-pointer rounded-lg px-4 text-sm font-bold leading-normal tracking-[0.015em] transition-colors border ${
                eventsOpen
                  ? 'bg-[#1380ec] text-white border-[#1380ec] hover:bg-blue-600'
                  : 'bg-white dark:bg-slate-800 text-[#111418] dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
              aria-pressed={eventsOpen}
              title={t('calendar.eventsInDay')}
            >
              <span className="material-symbols-outlined text-[18px]">event_note</span>
              <span className="hidden sm:inline">{t('calendar.eventsInDay')}</span>
              {!eventsOpen && events.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-[#1380ec] text-white text-[10px] font-bold">
                  {events.length}
                </span>
              )}
            </button>,
          ]}
          actionButton={{
            text: t('calendar.addEvent'),
            icon: 'add',
            onClick: openCreateModal,
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-[#101922] overflow-x-hidden p-2 sm:p-4">
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4">
            <div className="flex-1 min-h-0 h-full">
              {googleEmbedUrl ? (
                <div className="flex flex-col flex-1 min-h-0 h-full">
                  <iframe
                    key={`${googleEmbedUrl}::${embedReloadKey}`}
                    title={t('calendar.googleEmbedTitle')}
                    src={googleEmbedUrl}
                    className="w-full h-full flex-1 min-h-0 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center h-full">
                  <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{t('calendar.googleEmbedMissingId')}</p>
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

            {eventsOpen && (
            <div className="w-full lg:w-[360px] flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40">
                <div className="flex flex-col min-w-0">
                  <div className="text-sm font-semibold text-[#111418] dark:text-slate-100 truncate">
                    {t('calendar.eventsInDay')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {viewMode === VIEW_DAY ? formatDateWithWeekday(currentDate) : `${eventRange.startStr} - ${eventRange.endStr}`}
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1 text-gray-500 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setEventsOpen(false)}
                  aria-label={t('common.close') ?? 'Close'}
                  title={t('common.close') ?? 'Close'}
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="mt-3 flex-1 min-h-0 overflow-y-auto px-1">
                {eventsLoading && (
                  <div className="p-3 text-sm text-gray-500 dark:text-slate-300">Loading…</div>
                )}

                {!eventsLoading && eventsError && (
                  <div className="p-3 text-sm text-red-600 dark:text-red-400">{eventsError}</div>
                )}

                {!eventsLoading && !eventsError && events.length === 0 && (
                  <div className="p-3 text-sm text-gray-500 dark:text-slate-400">
                    {t('calendar.noEvents') ?? 'No events'}
                  </div>
                )}

                {!eventsLoading && !eventsError && events.length > 0 && (
                  <div className="flex flex-col gap-2 px-1 pb-2">
                    {events.map((evt) => {
                      const isGoogle = evt?.source === 'Google';
                      const isAllDay = !!evt?.isAllDay;
                      const startText = isAllDay
                        ? toDateInputValueFromUtcIso(evt?.startDate)
                        : (formatLocalTimeHHmm(evt?.startDate) ?? '');
                      const endText = isAllDay
                        ? toDateInputValueFromUtcIso(evt?.endDate)
                        : (formatLocalTimeHHmm(evt?.endDate) ?? '');
                      const timeLine = isAllDay ? startText : `${startText}${endText ? ` - ${endText}` : ''}`;

                      return (
                        <div key={isGoogle ? evt.externalId : evt.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/20 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-[#111418] dark:text-slate-100 truncate">
                                {evt.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                {timeLine}
                              </div>
                            </div>

                            {isGoogle && (
                              <span className="shrink-0 inline-flex items-center rounded-md bg-primary/10 text-primary dark:bg-primary/20 text-[10px] px-2 py-1 font-semibold">
                                {t('calendar.viewGoogleCalendar')}
                              </span>
                            )}
                          </div>

                          {evt.description && (
                            <div className="text-xs text-gray-600 dark:text-slate-300 mt-2 line-clamp-2">
                              {evt.description}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3">
                            <button
                              type="button"
                              className="p-1 rounded-md text-gray-500 hover:text-primary dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              onClick={() => openEditModal(evt)}
                              aria-label={t('common.edit')}
                              title={t('common.edit')}
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              onClick={async () => {
                                try {
                                  if (!window.confirm(`${t('calendar.deleteEvent')}?`)) return;
                                  if (isGoogle) {
                                    await googleEventsAPI.deleteGoogleEvent(evt.externalId);
                                  } else {
                                    await eventsAPI.deleteEvent(evt.id);
                                  }
                                  await loadEvents();
                                  setEmbedReloadKey((k) => k + 1);
                                } catch (e) {
                                  toast.error(e?.message || 'Failed to delete event');
                                }
                              }}
                              aria-label={t('calendar.deleteEvent')}
                              title={t('calendar.deleteEvent')}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {eventModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div>
                <h2 className="text-base font-semibold text-[#111418] dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>
                    {editingEvent ? t('common.edit') : t('calendar.addEvent')}
                  </span>
                  {editingEvent?.source === 'Google' && (
                    <span className="inline-flex items-center rounded-md bg-primary/10 text-primary dark:bg-primary/20 text-[10px] px-2 py-1 font-semibold">
                      {t('calendar.viewGoogleCalendar')}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {t('calendar.addScheduleDesc') ?? ''}
                </p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-[#111418] dark:hover:text-white"
                aria-label="Close"
                onClick={closeModal}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (!eventForm.title.trim()) {
                    toast.error('Title is required');
                    return;
                  }

                  let startIso = null;
                  let endIso = null;

                  if (eventForm.isAllDay) {
                    startIso = utcDateInputToIso(eventForm.startDate);
                    endIso = utcDateInputToIso(eventForm.endDate);
                  } else {
                    const sDate = eventForm.startDateTime ? new Date(eventForm.startDateTime) : null;
                    const sValid = sDate && !Number.isNaN(sDate.getTime());

                    const eDate = eventForm.endDateTime ? new Date(eventForm.endDateTime) : null;
                    const eValid = eDate && !Number.isNaN(eDate.getTime());

                    // If end is empty, default to +1 hour for better UX.
                    const endFallback = sValid ? new Date(sDate.getTime() + 60 * 60 * 1000) : null;

                    startIso = sValid ? sDate.toISOString() : null;
                    const endDateToUse = eValid ? eDate : endFallback;
                    endIso = endDateToUse ? endDateToUse.toISOString() : null;
                  }

                  if (!startIso || !endIso) {
                    toast.error('Please provide start and end dates');
                    return;
                  }

                  if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
                    toast.error('End time must be after start time');
                    return;
                  }

                  const payload = {
                    title: eventForm.title.trim(),
                    description: eventForm.description || undefined,
                    startDate: startIso,
                    endDate: endIso,
                    location: eventForm.location || undefined,
                    color: eventForm.color || undefined,
                    isAllDay: !!eventForm.isAllDay,
                  };

                  if (!editingEvent) {
                    await eventsAPI.createEvent(payload);
                  } else {
                    const isGoogle = editingEvent?.source === 'Google';
                    if (isGoogle) {
                      await googleEventsAPI.updateGoogleEvent(editingEvent.externalId, payload);
                    } else {
                      await eventsAPI.updateEvent(editingEvent.id, payload);
                    }
                  }

                  await loadEvents();
                  setEmbedReloadKey((k) => k + 1);
                  closeModal();
                } catch (err) {
                  toast.error(err?.message || 'Failed to save event');
                }
              }}
              className="px-5 py-4"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('calendar.titleLabel')}
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-200 focus:outline-none focus:border-primary"
                    value={eventForm.title}
                    placeholder={t('calendar.titlePlaceholder')}
                    onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('calendar.allDay')}
                  </label>
                  <input
                    type="checkbox"
                    checked={eventForm.isAllDay}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setEventForm((p) => {
                        if (next) {
                          return {
                            ...p,
                            isAllDay: true,
                            startDate: p.startDate || formatLocalDateIso(new Date()),
                            endDate: p.endDate || p.startDate || formatLocalDateIso(new Date()),
                          };
                        }
                        return { ...p, isAllDay: false };
                      });
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {eventForm.isAllDay ? t('calendar.dateLabel') : t('calendar.timeLabel')}
                  </label>

                  {eventForm.isAllDay ? (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="date"
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          value={eventForm.startDate}
                          onChange={(e) => setEventForm((p) => ({ ...p, startDate: e.target.value, endDate: p.endDate || e.target.value }))}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="date"
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          value={eventForm.endDate}
                          onChange={(e) => setEventForm((p) => ({ ...p, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="datetime-local"
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          value={eventForm.startDateTime}
                          onChange={(e) => setEventForm((p) => ({ ...p, startDateTime: e.target.value }))}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="datetime-local"
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          value={eventForm.endDateTime}
                          onChange={(e) => setEventForm((p) => ({ ...p, endDateTime: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('calendar.description')}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-200 focus:outline-none focus:border-primary"
                    value={eventForm.description}
                    onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('calendar.locationOptional')}
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      value={eventForm.location}
                      placeholder={t('calendar.locationLabel') ?? ''}
                      onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('calendar.colorLabel')}
                    </label>
                    <div className="flex flex-wrap gap-2 py-1">
                      {['#1380ec','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEventForm((p) => ({ ...p, color: p.color === color ? '' : color }))}
                          className="size-7 rounded-full border-2 transition-all shrink-0 hover:scale-110 active:scale-95"
                          style={{
                            backgroundColor: color,
                            borderColor: eventForm.color === color ? '#fff' : color,
                            boxShadow: eventForm.color === color ? `0 0 0 2px ${color}` : 'none',
                          }}
                          aria-label={color}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors text-sm"
                    onClick={closeModal}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-semibold"
                  >
                    {editingEvent ? (t('calendar.update') ?? t('daily.update') ?? 'Update') : t('calendar.submitAdd')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile: floating add event button (bottom-right) */}
      <button
        type="button"
        onClick={openCreateModal}
        className="sm:hidden fixed bottom-6 right-6 z-40 flex size-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
        aria-label={t('calendar.addEvent')}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
};

export default CalendarPage;

