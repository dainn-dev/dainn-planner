import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import { eventsAPI, notificationsAPI, USER_SETTINGS_STORAGE_KEY } from '../services/api';
import LogoutButton from '../components/LogoutButton';
import { isStoredAdmin } from '../utils/auth';
import { formatDateWithWeekday, formatDateTime } from '../utils/dateFormat';
import {
  getColorClasses,
  getTextColorClasses,
  getDotColorClasses,
  getTimeColorClasses,
  EVENT_COLORS,
} from '../utils/colorMappings';

const toDateOnly = (d) => d.toISOString().slice(0, 10);
const toISODateTime = (dateStr, timeStr) => (dateStr && timeStr ? `${dateStr}T${timeStr}:00.000Z` : dateStr ? `${dateStr}T12:00:00.000Z` : null);

const mapEventFromApi = (e) => {
  const start = new Date(e.startDate);
  const isAllDay = e.isAllDay ?? e.allDay;
  const timeFrom = !isAllDay && e.startDate ? e.startDate.slice(11, 16) : null;
  const timeTo = !isAllDay && e.endDate ? e.endDate.slice(11, 16) : null;
  return {
    id: e.id,
    date: start,
    time: timeFrom || null,
    timeFrom: timeFrom || null,
    timeTo: timeTo || null,
    title: e.title,
    description: e.description || '',
    color: e.color || 'green',
    allDay: isAllDay,
    address: e.location || '',
    location: e.location,
  };
};

const mapNotificationFromApi = (n) => ({
  id: n.id,
  type: n.type || 'system',
  title: n.title,
  message: n.message,
  time: n.createdAt ? formatDateTime(n.createdAt) : '',
  unread: !n.isRead,
  icon: n.icon || 'notifications',
  iconBg: 'bg-blue-100',
  iconColor: n.iconColor || 'text-indigo-600',
});

const MOBILE_BREAKPOINT = 640;

const VIEW_DAY = 'day';
const VIEW_WEEK = 'week';
const VIEW_MONTH = 'month';

const CalendarPage = () => {
  const { t } = useTranslation();
  const isAdmin = isStoredAdmin();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(() =>
    (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) ? VIEW_DAY : VIEW_WEEK
  );
  const [weekStartDay, setWeekStartDay] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' && localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      const v = stored?.weekStartDay;
      return (v === 'sunday' || v === 'monday') ? v : 'monday';
    } catch (e) {
      return 'monday';
    }
  });

  // Month view is now available on mobile; no need to switch view on resize
  const [events, setEvents] = useState([]);
  const [, setEventsLoading] = useState(false);

  const [addEventModalOpen, setAddEventModalOpen] = useState(false);
  const [eventDetailModalOpen, setEventDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editedEvent, setEditedEvent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    timeFrom: '',
    timeTo: '',
    color: 'green',
    allDay: false,
    locationType: '',
    platform: '',
    address: '',
  });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const getRange = () => {
      if (viewMode === VIEW_DAY) {
        const d = new Date(currentDate);
        const dayStr = toDateOnly(d);
        return { startDate: dayStr, endDate: dayStr };
      }
      if (viewMode === VIEW_WEEK) {
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(d);
        mon.setDate(d.getDate() + diff);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return { startDate: toDateOnly(mon), endDate: toDateOnly(sun) };
      }
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return { startDate: toDateOnly(first), endDate: toDateOnly(last) };
    };
    const load = async () => {
      setEventsLoading(true);
      try {
        const { startDate, endDate } = getRange();
        const [eventsData, notificationsData] = await Promise.all([
          eventsAPI.getEvents({ startDate, endDate }),
          notificationsAPI.getNotifications({ limit: 20 }),
        ]);
        if (cancelled) return;
        setEvents(Array.isArray(eventsData) ? eventsData.map(mapEventFromApi) : []);
        const notifList = Array.isArray(notificationsData) ? notificationsData : (notificationsData?.notifications || []);
        setNotifications(notifList.map(mapNotificationFromApi));
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load events:', error);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentDate, viewMode]);

  const getMonthName = (date) => t(`calendar.month${date.getMonth() + 1}`);

  // Navigate months/weeks
  const changeMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const changeWeek = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * 7));
      return newDate;
    });
  };

  const changeDay = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + direction);
      return newDate;
    });
  };

  // Handle add event modal
  const handleOpenAddEventModal = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setEventForm({
      title: '',
      date: dateStr,
      timeFrom: '',
      timeTo: '',
      color: 'green',
      allDay: false,
      locationType: '',
      platform: '',
      address: '',
    });
    setAddEventModalOpen(true);
  };

  const handleCloseAddEventModal = () => {
    setAddEventModalOpen(false);
    setEventForm({
      title: '',
      date: '',
      timeFrom: '',
      timeTo: '',
      color: 'green',
      allDay: false,
      locationType: '',
      platform: '',
      address: '',
    });
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();

    if (!eventForm.title.trim()) return;

    if (
      !eventForm.allDay &&
      eventForm.timeFrom &&
      eventForm.timeTo &&
      eventForm.timeTo <= eventForm.timeFrom
    ) {
      window.alert('End time must be later than start time.');
      return;
    }

    const dateStr = eventForm.date || new Date().toISOString().slice(0, 10);
    const isAllDay = eventForm.allDay;
    const startDate = isAllDay
      ? `${dateStr}T00:00:00.000Z`
      : toISODateTime(dateStr, eventForm.timeFrom || '09:00');
    const endDate = isAllDay
      ? `${dateStr}T23:59:59.999Z`
      : toISODateTime(dateStr, eventForm.timeTo || eventForm.timeFrom || '10:00');

    const location = eventForm.locationType === 'online' ? eventForm.platform : (eventForm.address || eventForm.platform || '');

    try {
      const created = await eventsAPI.createEvent({
        title: eventForm.title.trim(),
        description: '',
        startDate,
        endDate,
        location: location || undefined,
        color: eventForm.color,
        isAllDay,
      });
      setEvents([...events, mapEventFromApi(created)]);
      handleCloseAddEventModal();
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await eventsAPI.deleteEvent(eventId);
      setEvents(events.filter(event => event.id !== eventId));
      if (selectedEvent && selectedEvent.id === eventId) {
        setEventDetailModalOpen(false);
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Handle show event detail
  const handleShowEventDetail = (event) => {
    setSelectedEvent(event);
    setEditedEvent({ ...event });
    setIsEditingEvent(false);
    setEventDetailModalOpen(true);
  };

  const handleCloseEventDetail = () => {
    setEventDetailModalOpen(false);
    setSelectedEvent(null);
    setEditedEvent(null);
    setIsEditingEvent(false);
  };

  const handleStartEdit = () => {
    setIsEditingEvent(true);
  };

  const handleCancelEdit = () => {
    setEditedEvent({ ...selectedEvent });
    setIsEditingEvent(false);
  };

  const handleSaveEvent = async () => {
    if (!editedEvent.title.trim()) return;

    if (
      !editedEvent.allDay &&
      editedEvent.timeFrom &&
      editedEvent.timeTo &&
      editedEvent.timeTo <= editedEvent.timeFrom
    ) {
      window.alert('End time must be later than start time.');
      return;
    }

    const eventDate = editedEvent.date instanceof Date ? editedEvent.date : new Date(editedEvent.date);
    const dateStr = toDateOnly(eventDate);
    const isAllDay = editedEvent.allDay;
    const startDate = isAllDay
      ? `${dateStr}T00:00:00.000Z`
      : (editedEvent.timeFrom ? `${dateStr}T${editedEvent.timeFrom}:00.000Z` : `${dateStr}T09:00:00.000Z`);
    const endDate = isAllDay
      ? `${dateStr}T23:59:59.999Z`
      : (editedEvent.timeTo ? `${dateStr}T${editedEvent.timeTo}:00.000Z` : startDate);

    try {
      await eventsAPI.updateEvent(editedEvent.id, {
        title: editedEvent.title.trim(),
        description: editedEvent.description || '',
        startDate,
        endDate,
        location: editedEvent.address || editedEvent.location || undefined,
        color: editedEvent.color,
        isAllDay,
      });
      setEvents(events.map(event => (event.id === editedEvent.id ? editedEvent : event)));
      setSelectedEvent(editedEvent);
      setIsEditingEvent(false);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Format date for display (weekday + date from user settings)
  const formatDate = (date) => formatDateWithWeekday(date);

  // Convert solar date to lunar date (simplified Vietnamese lunar calendar)
  const convertToLunar = (solarDate) => {
    const d = new Date(solarDate);
    const baseSolar = new Date(1900, 0, 1);
    const baseLunar = { year: 1899, month: 12, day: 1 };
    const diffDays = Math.floor((d - baseSolar) / (1000 * 60 * 60 * 24));
    const lunarDays = baseLunar.day + diffDays;
    let lunarMonth = baseLunar.month;
    let lunarYear = baseLunar.year;
    let remainingDays = lunarDays;
    const lunarMonths = [29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30];
    while (remainingDays > 0) {
      const monthLength = lunarMonths[(lunarMonth - 1) % 12];
      if (remainingDays > monthLength) {
        remainingDays -= monthLength;
        lunarMonth++;
        if (lunarMonth > 12) {
          lunarMonth = 1;
          lunarYear++;
        }
      } else {
        break;
      }
    }
    const lunarDay = Math.floor(remainingDays) || 1;
    return {
      day: lunarDay,
      month: lunarMonth,
      year: lunarYear,
      monthName: t(`calendar.lunarMonth${lunarMonth}`),
      display: `${lunarDay}/${lunarMonth}`
    };
  };

  // Keep weekStartDay in sync with localStorage (e.g. after user changes it in Settings)
  useEffect(() => {
    const readStored = () => {
      try {
        const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
        const stored = raw ? JSON.parse(raw) : {};
        const v = stored?.weekStartDay;
        if (v === 'sunday' || v === 'monday') setWeekStartDay(v);
      } catch (e) {}
    };
    window.addEventListener('userSettingsUpdated', readStored);
    return () => window.removeEventListener('userSettingsUpdated', readStored);
  }, []);

  // Generate week view based on week start day
  const generateWeek = () => {
    const date = new Date(currentDate);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    let daysToSubtract;
    if (weekStartDay === 'sunday') {
      // Start from Sunday
      daysToSubtract = dayOfWeek;
    } else {
      // Start from Monday (default)
      // Convert Sunday (0) to 6, Monday (1) to 0, etc.
      daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - daysToSubtract);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      week.push(day);
    }

    return week;
  };

  // Generate calendar grid (month view) based on week start day
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);

    // Start from week start day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();

    let daysToSubtract;
    if (weekStartDay === 'sunday') {
      // Start from Sunday
      daysToSubtract = dayOfWeek;
    } else {
      // Start from Monday (default)
      // Convert Sunday (0) to 6, Monday (1) to 0, etc.
      daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }

    startDate.setDate(firstDay.getDate() - daysToSubtract);

    const calendar = [];
    const current = new Date(startDate);

    // Generate 35 days (5 weeks)
    for (let i = 0; i < 35; i++) {
      calendar.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return calendar;
  };

  const getWeekDays = () => {
    const keys = ['daySunday', 'dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday'];
    if (weekStartDay === 'sunday') {
      return keys.map((k) => t(`calendar.${k}`));
    }
    return [...keys.slice(1).map((k) => t(`calendar.${k}`)), t('calendar.daySunday')];
  };

  const getWeekDaysShort = () => {
    const keys = ['shortSun', 'shortMon', 'shortTue', 'shortWed', 'shortThu', 'shortFri', 'shortSat'];
    if (weekStartDay === 'sunday') {
      return keys.map((k) => t(`calendar.${k}`));
    }
    return [...keys.slice(1).map((k) => t(`calendar.${k}`)), t('calendar.shortSun')];
  };

  const weekDays = getWeekDays();
  const weekDaysShort = getWeekDaysShort();

  const generateDay = () => [new Date(currentDate)];

  const calendarDays = viewMode === VIEW_DAY ? generateDay() : viewMode === VIEW_WEEK ? generateWeek() : generateCalendar();

  const isCurrentMonth = (date) =>
    date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();

  const getEventColorLabel = (colorValue) => {
    const key = `color${colorValue.charAt(0).toUpperCase()}${colorValue.slice(1)}`;
    return t(`calendar.${key}`);
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = event.date;
      return eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear();
    });
  };

  // Get week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Get week range text
  const getWeekRange = () => {
    const week = generateWeek();
    const start = week[0];
    const end = week[6];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;

    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${getMonthName(start)}`;
    } else {
      return `${startDay} ${getMonthName(start)} - ${endDay} ${getMonthName(end)}`;
    }
  };

  const getDayTitle = () => formatDate(currentDate);

  const weekNumber = getWeekNumber(currentDate);

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, unread: false })));
  };

  const handleDeleteAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-display h-screen flex overflow-hidden selection:bg-indigo-600 selection:text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-[#101922] h-full relative overflow-hidden">
        <header className="flex flex-col bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 z-10 sticky top-0 shadow-sm">
          <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3">
            {/* Row 1: left (menu, title, nav); on mobile, right side has notifications + avatar */}
            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-4 text-[#111418] dark:text-white min-w-0">
              <button
                className="lg:hidden min-h-[44px] min-w-[44px] p-2 -ml-1 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 touch-manipulation flex items-center justify-center"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={t('common.toggleMenu')}
              >
                <span className="material-symbols-outlined text-xl">menu</span>
              </button>
              <div className="lg:hidden flex items-center shrink-0">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-xl">calendar_month</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <h2 className="text-[#111418] dark:text-white text-sm sm:text-base md:text-lg font-bold leading-tight tracking-[-0.015em] truncate">
                    {viewMode === VIEW_DAY ? getDayTitle() : viewMode === VIEW_WEEK ? getWeekRange() : `${getMonthName(currentDate)}, ${currentDate.getFullYear()}`}
                  </h2>
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => viewMode === VIEW_DAY ? changeDay(-1) : viewMode === VIEW_WEEK ? changeWeek(-1) : changeMonth(-1)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 hover:text-gray-800 dark:hover:text-white transition-colors touch-manipulation"
                      aria-label={viewMode === VIEW_DAY ? t('calendar.prevDay') : viewMode === VIEW_WEEK ? t('calendar.prevWeek') : t('calendar.prevMonth')}
                    >
                      <span className="material-symbols-outlined text-[22px]">chevron_left</span>
                    </button>
                    <button
                      onClick={() => viewMode === VIEW_DAY ? changeDay(1) : viewMode === VIEW_WEEK ? changeWeek(1) : changeMonth(1)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 hover:text-gray-800 dark:hover:text-white transition-colors touch-manipulation"
                      aria-label={viewMode === VIEW_DAY ? t('calendar.nextDay') : viewMode === VIEW_WEEK ? t('calendar.nextWeek') : t('calendar.nextMonth')}
                    >
                      <span className="material-symbols-outlined text-[22px]">chevron_right</span>
                    </button>
                  </div>
                </div>
                <p className="text-gray-500 dark:text-slate-400 text-[11px] sm:text-xs hidden sm:block">{viewMode === VIEW_DAY ? t('calendar.eventsInDay') : t('calendar.weekEvents', { weekNumber })}</p>
              </div>
            </div>
            {/* Top right on mobile only: notifications + avatar (Google Calendar style) */}
            <div className="flex items-center gap-2 shrink-0 sm:hidden">
              <div className="relative group">
                <button
                  className="flex min-h-[44px] min-w-[44px] size-10 cursor-pointer items-center justify-center rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 active:bg-blue-200 transition-colors relative touch-manipulation"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label={t('common.notifications')}
                  aria-expanded={notificationsOpen}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                  )}
                </button>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                        <h3 className="font-bold text-[#111418] dark:text-white text-sm">{t('common.notifications')}</h3>
                        <div className="flex items-center gap-3">
                          <button className="text-[11px] font-medium text-primary dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors" onClick={handleMarkAllAsRead}>{t('common.markAllRead')}</button>
                          <button className="text-[11px] font-medium text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" onClick={handleDeleteAllNotifications}>{t('common.deleteAll')}</button>
                        </div>
                      </div>
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">{t('common.noNotifications')}</div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`relative flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-gray-50 dark:border-slate-700/50 ${notification.unread ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}`}
                              onClick={() => setNotifications(notifications.map(n => n.id === notification.id ? { ...n, unread: false } : n))}
                            >
                              <div className={`size-9 rounded-full ${notification.iconBg} flex items-center justify-center ${notification.iconColor} shrink-0 mt-0.5`}>
                                <span className="material-symbols-outlined text-lg">{notification.icon}</span>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className={`text-sm leading-tight ${notification.unread ? 'font-semibold' : 'font-medium'} text-[#111418] dark:text-slate-200`}>{notification.title}</p>
                                  {notification.unread && <span className="size-2 bg-primary rounded-full mt-1"></span>}
                                </div>
                                <p className={`text-xs leading-relaxed ${notification.unread ? 'text-gray-600 dark:text-slate-400' : 'text-gray-500 dark:text-slate-500'} line-clamp-2`}>{notification.message}</p>
                                <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium pt-0.5">{notification.time}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <Link to="#" className="block p-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-t border-gray-100 dark:border-slate-700 transition-colors" onClick={(e) => { e.preventDefault(); setNotificationsOpen(false); }}>
                          {t('common.viewAllNotifications')}
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-10 min-h-[44px] min-w-[44px] cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all touch-manipulation"
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBr3X7Z7D9oVzqv59WsWDkRyy7yyUi86zJzG0vYqzFaaGh60Qw5psjFjeEh7oCRNQMb9pV2RNcGZ7LdYuSCCXKNFvIuW_u3KWXWL45QWH4DESIVyRG1t2l4Li_LiWgFjDjzgpaGbmp6v-bJBrouwxbq731SsEPCb6dMx0HOmrZjFpR4YJZ2PZr9ckec2y5gpszHLn_zL10DWuQkfb2ocg5mZ2rT7WUFuO8euRXp4-mErpqaeriYEsTgIevz0gS-hwFDr7N3T-y6mNpV")' }}
                role="button"
                aria-label={t('common.userProfile')}
                tabIndex={0}
              />
            </div>
            </div>
            {/* Desktop: view, today, add, notifications, avatar. Mobile: row 2 has view + today only */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              {/* Calendar Controls - visible on mobile in row 2 below */}
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 sm:p-1 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <label className={`cursor-pointer relative px-2 sm:px-3 py-1.5 min-h-[36px] flex items-center justify-center text-xs sm:text-sm transition-colors rounded-md touch-manipulation ${viewMode === VIEW_DAY
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-800 dark:text-white font-semibold'
                      : 'font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'
                    }`}>
                    <span>{t('calendar.viewDay')}</span>
                    <input
                      className="hidden"
                      name="view_mode"
                      type="radio"
                      value={VIEW_DAY}
                      checked={viewMode === VIEW_DAY}
                      onChange={() => setViewMode(VIEW_DAY)}
                    />
                  </label>
                  <label className={`cursor-pointer relative px-2 sm:px-3 py-1.5 min-h-[36px] flex items-center justify-center text-xs sm:text-sm transition-colors rounded-md touch-manipulation ${viewMode === VIEW_WEEK
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-800 dark:text-white font-semibold'
                      : 'font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'
                    }`}>
                    <span>{t('calendar.viewWeek')}</span>
                    <input
                      className="hidden"
                      name="view_mode"
                      type="radio"
                      value={VIEW_WEEK}
                      checked={viewMode === VIEW_WEEK}
                      onChange={() => setViewMode(VIEW_WEEK)}
                    />
                  </label>
                  <label className={`cursor-pointer relative px-2 sm:px-3 py-1.5 min-h-[36px] flex items-center justify-center text-xs sm:text-sm transition-colors rounded-md touch-manipulation ${viewMode === VIEW_MONTH
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-800 dark:text-white font-semibold'
                      : 'font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'
                    }`}>
                    <span>{t('calendar.viewMonth')}</span>
                    <input
                      className="hidden"
                      name="view_mode"
                      type="radio"
                      value={VIEW_MONTH}
                      checked={viewMode === VIEW_MONTH}
                      onChange={() => setViewMode(VIEW_MONTH)}
                    />
                  </label>
                </div>
              </div>

              {/* Action Button - desktop */}
              <button
                onClick={handleOpenAddEventModal}
                className="hidden sm:flex h-10 cursor-pointer items-center justify-center rounded-lg bg-[#1380ec] px-4 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors"
              >
                <span className="mr-2 material-symbols-outlined text-sm">add</span>
                <span className="truncate">{t('calendar.addEvent')}</span>
              </button>

              {/* Notifications Dropdown */}
              <div className="relative group">
                <button
                  className="flex min-h-[44px] min-w-[44px] size-10 cursor-pointer items-center justify-center rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 active:bg-blue-200 transition-colors relative touch-manipulation"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label={t('common.notifications')}
                  aria-expanded={notificationsOpen}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                  )}
                </button>
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                        <h3 className="font-bold text-[#111418] dark:text-white text-sm">{t('common.notifications')}</h3>
                        <div className="flex items-center gap-3">
                          <button
                            className="text-[11px] font-medium text-primary dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                            onClick={handleMarkAllAsRead}
                          >
                            {t('common.markAllRead')}
                          </button>
                          <button
                            className="text-[11px] font-medium text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            onClick={handleDeleteAllNotifications}
                          >
                            {t('common.deleteAll')}
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                            {t('common.noNotifications')}
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`relative flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-gray-50 dark:border-slate-700/50 ${notification.unread ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}`}
                              onClick={() => {
                                setNotifications(notifications.map(n =>
                                  n.id === notification.id ? { ...n, unread: false } : n
                                ));
                              }}
                            >
                              <div className={`size-9 rounded-full ${notification.iconBg} flex items-center justify-center ${notification.iconColor} shrink-0 mt-0.5`}>
                                <span className="material-symbols-outlined text-lg">{notification.icon}</span>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className={`text-sm leading-tight ${notification.unread ? 'font-semibold' : 'font-medium'} text-[#111418] dark:text-slate-200`}>
                                    {notification.title}
                                  </p>
                                  {notification.unread && (
                                    <span className="size-2 bg-primary rounded-full mt-1"></span>
                                  )}
                                </div>
                                <p className={`text-xs leading-relaxed ${notification.unread ? 'text-gray-600 dark:text-slate-400' : 'text-gray-500 dark:text-slate-500'} line-clamp-2`}>
                                  {notification.message}
                                </p>
                                <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium pt-0.5">{notification.time}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <Link
                          to="#"
                          className="block p-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-t border-gray-100 dark:border-slate-700 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            setNotificationsOpen(false);
                          }}
                        >
                          {t('common.viewAllNotifications')}
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-10 min-h-[44px] min-w-[44px] cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all touch-manipulation"
                style={{
                  backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBr3X7Z7D9oVzqv59WsWDkRyy7yyUi86zJzG0vYqzFaaGh60Qw5psjFjeEh7oCRNQMb9pV2RNcGZ7LdYuSCCXKNFvIuW_u3KWXWL45QWH4DESIVyRG1t2l4Li_LiWgFjDjzgpaGbmp6v-bJBrouwxbq731SsEPCb6dMx0HOmrZjFpR4YJZ2PZr9ckec2y5gpszHLn_zL10DWuQkfb2ocg5mZ2rT7WUFuO8euRXp4-mErpqaeriYEsTgIevz0gS-hwFDr7N3T-y6mNpV")'
                }}
                role="button"
                aria-label={t('common.userProfile')}
                tabIndex={0}
              />
            </div>
            {/* Mobile row 2: view switcher */}
            <div className="flex sm:hidden items-center gap-2 w-full">
              <div className="flex p-0.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                <label className={`cursor-pointer relative px-2 py-1.5 min-h-[36px] flex items-center justify-center text-xs transition-colors rounded-md touch-manipulation ${viewMode === VIEW_DAY ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-800 dark:text-white font-semibold' : 'font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'}`}>
                  <span>{t('calendar.viewDay')}</span>
                  <input className="hidden" name="view_mode" type="radio" value={VIEW_DAY} checked={viewMode === VIEW_DAY} onChange={() => setViewMode(VIEW_DAY)} />
                </label>
                <label className={`cursor-pointer relative px-2 py-1.5 min-h-[36px] flex items-center justify-center text-xs transition-colors rounded-md touch-manipulation ${viewMode === VIEW_WEEK ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-800 dark:text-white font-semibold' : 'font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'}`}>
                  <span>{t('calendar.viewWeek')}</span>
                  <input className="hidden" name="view_mode" type="radio" value={VIEW_WEEK} checked={viewMode === VIEW_WEEK} onChange={() => setViewMode(VIEW_WEEK)} />
                </label>
                <label className={`cursor-pointer relative px-2 py-1.5 min-h-[36px] flex items-center justify-center text-xs transition-colors rounded-md touch-manipulation ${viewMode === VIEW_MONTH ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-800 dark:text-white font-semibold' : 'font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'}`}>
                  <span>{t('calendar.viewMonth')}</span>
                  <input className="hidden" name="view_mode" type="radio" value={VIEW_MONTH} checked={viewMode === VIEW_MONTH} onChange={() => setViewMode(VIEW_MONTH)} />
                </label>
              </div>
            </div>
          </div>

          <div className={`grid border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${viewMode === VIEW_DAY ? 'grid-cols-1' : 'grid-cols-7'}`}>
            {viewMode !== VIEW_DAY && (
              weekDays.map((day, idx) => {
                const isWeekend = weekStartDay === 'sunday'
                  ? (idx === 0 || idx === 6)
                  : (idx === 5 || idx === 6);
                return (
                  <div key={idx} className="py-2 sm:py-3 px-1 sm:px-4 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isWeekend ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                      <span className="sm:hidden">{weekDaysShort[idx]}</span>
                      <span className="hidden sm:inline">{day}</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#101922] overflow-x-hidden">
          <div className={`grid ${viewMode === VIEW_DAY ? 'grid-cols-1 grid-rows-1' : viewMode === VIEW_WEEK ? 'grid-cols-7 grid-rows-1' : 'grid-cols-7 grid-rows-5'} min-h-[min(800px,calc(100vh-180px))] sm:min-h-[800px] h-full`}>
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const isOtherMonth = viewMode === VIEW_MONTH && !isCurrentMonth(day);
              const today = new Date();
              const isToday = (viewMode === VIEW_MONTH || viewMode === VIEW_WEEK) && day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();

              return (
                <div
                  key={idx}
                  className={`border-b border-r border-slate-200 dark:border-slate-700 p-1.5 sm:p-3 ${viewMode === VIEW_DAY ? 'min-h-[calc(100vh-180px)]' : viewMode === VIEW_WEEK ? 'min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-200px)]' : 'min-h-[100px] sm:min-h-[140px]'} group hover:bg-gray-50 dark:hover:bg-slate-800/50 active:bg-gray-100 dark:active:bg-slate-800 transition-colors relative ${isToday ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/30' : isOtherMonth ? 'bg-gray-50/50 dark:bg-slate-800/30' : ''
                    }`}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    {(viewMode === VIEW_MONTH || viewMode === VIEW_WEEK) && (
                      <span className={`text-xs sm:text-sm font-semibold leading-tight ${isToday ? 'text-primary' : isOtherMonth ? 'text-slate-300 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        {day.getDate()}
                      </span>
                    )}
                    {!isOtherMonth && (
                      <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-tight hidden sm:block">
                        {convertToLunar(day).display}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex flex-col gap-1 sm:gap-2 min-w-0">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleShowEventDetail(event)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleShowEventDetail(event); }}
                        className={`w-full rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 cursor-pointer transition-all duration-200 shadow-sm relative group/item min-h-[44px] flex flex-col justify-center touch-manipulation ${getColorClasses(event.color)}`}
                      >
                        {!event.allDay && (
                          <div className={`flex items-center gap-1.5 mb-0.5 ${viewMode === VIEW_WEEK ? 'hidden sm:flex' : ''}`}>
                            {event.color !== 'emerald' && (
                              <div className={`size-1 sm:size-1.5 rounded-full shrink-0 ${getDotColorClasses(event.color)}`}></div>
                            )}
                            <span className={`text-[9px] sm:text-[10px] font-bold tracking-wide ${getTimeColorClasses(event.color)}`}>
                              {viewMode === VIEW_WEEK || viewMode === VIEW_MONTH
                                ? (event.timeFrom || event.time || '')
                                : (event.timeFrom && event.timeTo ? `${event.timeFrom} - ${event.timeTo}` : event.timeFrom || event.time || '')}
                            </span>
                          </div>
                        )}
                        <p className={`text-[11px] sm:text-xs font-medium truncate ${getTextColorClasses(event.color)} ${event.allDay ? 'flex items-center gap-1.5' : ''}`}>
                          {event.allDay && <span className="text-sm sm:text-base shrink-0">🌴</span>}
                          {event.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: floating add event button (bottom-right) */}
        <button
          type="button"
          onClick={handleOpenAddEventModal}
          className="lg:hidden fixed bottom-6 right-6 z-40 flex size-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
          aria-label={t('calendar.addEventAria')}
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </main>

      {/* Add Event Modal */}
      {addEventModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/20 dark:bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={handleCloseAddEventModal}
        >
          <div
            className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-zinc-100 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAddEvent}>
              <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white" id="add-event-title">{t('calendar.addScheduleTitle')}</h3>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-slate-400 mt-1">{t('calendar.addScheduleDesc')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="event-title" className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">
                      {t('calendar.titleLabel')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="event-title"
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent touch-manipulation"
                      placeholder={t('calendar.titlePlaceholder')}
                    />
                  </div>

                  <div>
                    <label htmlFor="event-date" className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">
                      {t('calendar.dateLabel')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="event-date"
                      required
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent touch-manipulation"
                    />
                  </div>

                  <div className="flex items-center gap-3 min-h-[44px]">
                    <input
                      type="checkbox"
                      id="event-all-day"
                      checked={eventForm.allDay}
                      onChange={(e) => setEventForm({ ...eventForm, allDay: e.target.checked, timeFrom: e.target.checked ? '' : eventForm.timeFrom, timeTo: e.target.checked ? '' : eventForm.timeTo })}
                      className="size-5 sm:size-4 text-zinc-900 dark:text-slate-100 border-zinc-300 dark:border-slate-600 rounded focus:ring-zinc-900 dark:focus:ring-primary cursor-pointer touch-manipulation"
                    />
                    <label htmlFor="event-all-day" className="text-sm font-medium text-zinc-700 dark:text-slate-300 cursor-pointer touch-manipulation">
                      {t('calendar.allDay')}
                    </label>
                  </div>

                  {!eventForm.allDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="event-time-from" className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">
                          {t('calendar.timeFrom')}
                        </label>
                        <input
                          type="time"
                          id="event-time-from"
                          value={eventForm.timeFrom}
                          onChange={(e) => setEventForm({ ...eventForm, timeFrom: e.target.value })}
                          className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent touch-manipulation"
                        />
                      </div>
                      <div>
                        <label htmlFor="event-time-to" className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">
                          {t('calendar.timeTo')}
                        </label>
                        <input
                          type="time"
                          id="event-time-to"
                          value={eventForm.timeTo}
                          onChange={(e) => setEventForm({ ...eventForm, timeTo: e.target.value })}
                          className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent touch-manipulation"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">
                      {t('calendar.locationOptional')}
                    </label>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
                          <input
                            type="radio"
                            name="add-locationType"
                            value="online"
                            checked={eventForm.locationType === 'online'}
                            onChange={(e) => setEventForm({ ...eventForm, locationType: e.target.value, address: '' })}
                            className="size-5 sm:size-4 text-zinc-900 dark:text-slate-100 border-zinc-300 dark:border-slate-600 focus:ring-zinc-900 dark:focus:ring-primary"
                          />
                          <span className="text-sm text-zinc-700 dark:text-slate-300">{t('calendar.online')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
                          <input
                            type="radio"
                            name="add-locationType"
                            value="offline"
                            checked={eventForm.locationType === 'offline'}
                            onChange={(e) => setEventForm({ ...eventForm, locationType: e.target.value, platform: '' })}
                            className="size-5 sm:size-4 text-zinc-900 dark:text-slate-100 border-zinc-300 dark:border-slate-600 focus:ring-zinc-900 dark:focus:ring-primary"
                          />
                          <span className="text-sm text-zinc-700 dark:text-slate-300">{t('calendar.offline')}</span>
                        </label>
                      </div>
                      {eventForm.locationType === 'online' && (
                        <select
                          value={eventForm.platform || ''}
                          onChange={(e) => setEventForm({ ...eventForm, platform: e.target.value })}
                          className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent touch-manipulation"
                        >
                          <option value="">{t('calendar.selectPlatform')}</option>
                          <option value="google-meet">{t('calendar.platformGoogleMeet')}</option>
                          <option value="teams">{t('calendar.platformTeams')}</option>
                          <option value="whatsapp">{t('calendar.platformWhatsApp')}</option>
                        </select>
                      )}
                      {eventForm.locationType === 'offline' && (
                        <input
                          type="text"
                          value={eventForm.address || ''}
                          onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })}
                          placeholder={t('calendar.addressPlaceholder')}
                          className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent touch-manipulation"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="event-color" className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">
                      {t('calendar.colorLabel')}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      {EVENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setEventForm({ ...eventForm, color: color.value })}
                          className={`flex flex-col items-center gap-1 p-2 min-h-[44px] rounded-lg border-2 transition-all touch-manipulation ${eventForm.color === color.value
                              ? 'border-zinc-900 dark:border-primary bg-zinc-50 dark:bg-slate-700'
                              : 'border-zinc-200 dark:border-slate-600 hover:border-zinc-300 dark:hover:border-slate-500 active:bg-zinc-100 dark:active:bg-slate-600'
                            }`}
                        >
                          <div className={`size-5 sm:size-6 rounded-full ${color.bg}`}></div>
                          <span className="text-[9px] sm:text-[10px] font-medium text-zinc-600 dark:text-slate-400">{getEventColorLabel(color.value)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-slate-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:gap-3 gap-2 flex flex-col">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex justify-center items-center min-h-[44px] rounded-lg px-4 py-2.5 bg-zinc-900 dark:bg-primary text-white text-sm font-medium hover:bg-zinc-800 dark:hover:bg-primary/90 active:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:ring-offset-2 transition-colors shadow-sm touch-manipulation"
                >
                  {t('calendar.submitAdd')}
                </button>
                <button
                  type="button"
                  onClick={handleCloseAddEventModal}
                  className="w-full sm:w-auto inline-flex justify-center items-center min-h-[44px] rounded-lg px-4 py-2.5 bg-white dark:bg-slate-700 text-zinc-700 dark:text-slate-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-slate-600 active:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:ring-offset-2 transition-colors border border-zinc-300 dark:border-slate-600 shadow-sm touch-manipulation"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {eventDetailModalOpen && selectedEvent && editedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 sm:p-6 bg-zinc-900/20 dark:bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={handleCloseEventDetail}
        >
          <div
            className="relative transform overflow-hidden rounded-t-2xl sm:rounded-xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all w-full sm:my-8 sm:max-w-lg border border-zinc-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  {isEditingEvent ? (
                    <input
                      type="text"
                      value={editedEvent.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      className="w-full text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white bg-white dark:bg-slate-700 border border-zinc-300 dark:border-slate-600 rounded-lg px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary touch-manipulation"
                    />
                  ) : (
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`size-3 rounded-full shrink-0 ${getDotColorClasses(selectedEvent.color) || 'bg-gray-500'}`}></div>
                      <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white break-words" id="event-detail-title">
                        {selectedEvent.title}
                      </h3>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isEditingEvent ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveEvent}
                        className="min-h-[44px] px-4 py-2.5 bg-zinc-900 dark:bg-primary text-white text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-primary/90 active:bg-zinc-700 transition-colors touch-manipulation"
                        aria-label={t('common.save')}
                      >
                        {t('common.save')}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="min-h-[44px] px-4 py-2.5 bg-white dark:bg-slate-700 text-zinc-900 dark:text-slate-100 text-sm font-medium rounded-lg border border-zinc-300 dark:border-slate-600 hover:bg-zinc-50 dark:hover:bg-slate-600 active:bg-zinc-100 transition-colors touch-manipulation"
                        aria-label={t('common.cancel')}
                      >
                        {t('common.cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-700 active:bg-zinc-200 dark:active:bg-slate-600 transition-colors focus:outline-none flex items-center justify-center touch-manipulation"
                      aria-label={t('common.edit')}
                    >
                      <span className="material-symbols-outlined text-zinc-400 dark:text-slate-400 hover:text-zinc-600 dark:hover:text-slate-200 text-[20px]">edit</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 mb-1.5">
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    <span className="font-medium">{t('calendar.dateLabel')}</span>
                  </div>
                  {isEditingEvent ? (
                    <input
                      type="date"
                      value={editedEvent.date instanceof Date
                        ? `${editedEvent.date.getFullYear()}-${String(editedEvent.date.getMonth() + 1).padStart(2, '0')}-${String(editedEvent.date.getDate()).padStart(2, '0')}`
                        : editedEvent.date
                      }
                      onChange={(e) => {
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        handleFieldChange('date', new Date(year, month - 1, day));
                      }}
                      className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary touch-manipulation"
                    />
                  ) : (
                    <p className="text-sm text-zinc-900 dark:text-slate-200 ml-7">{formatDate(selectedEvent.date)}</p>
                  )}
                </div>

                {isEditingEvent ? (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-all-day"
                        checked={editedEvent.allDay || false}
                        onChange={(e) => handleFieldChange('allDay', e.target.checked)}
                        className="h-4 w-4 text-zinc-900 dark:text-slate-100 border-zinc-300 dark:border-slate-600 rounded focus:ring-zinc-900 dark:focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="edit-all-day" className="text-sm font-medium text-zinc-700 dark:text-slate-300 cursor-pointer">
                        {t('calendar.allDay')}
                      </label>
                    </div>
                    {!editedEvent.allDay && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">{t('calendar.timeFrom')}</label>
                          <input
                            type="time"
                            value={editedEvent.timeFrom || ''}
                            onChange={(e) => handleFieldChange('timeFrom', e.target.value)}
                            className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary touch-manipulation"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">{t('calendar.timeTo')}</label>
                          <input
                            type="time"
                            value={editedEvent.timeTo || ''}
                            onChange={(e) => handleFieldChange('timeTo', e.target.value)}
                            className="w-full px-3 py-2.5 min-h-[44px] border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary touch-manipulation"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {!selectedEvent.allDay && (
                      <div>
                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 mb-1">
                          <span className="material-symbols-outlined text-[18px]">schedule</span>
                          <span className="font-medium">{t('calendar.timeLabel')}</span>
                        </div>
                        <p className="text-sm text-zinc-900 dark:text-slate-200 ml-7">
                          {selectedEvent.timeFrom && selectedEvent.timeTo
                            ? `${selectedEvent.timeFrom} - ${selectedEvent.timeTo}`
                            : selectedEvent.timeFrom
                              ? selectedEvent.timeFrom
                              : selectedEvent.time || t('calendar.noTime')
                          }
                        </p>
                      </div>
                    )}

                    {selectedEvent.allDay && (
                      <div>
                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 mb-1">
                          <span className="material-symbols-outlined text-[18px]">event_available</span>
                          <span className="font-medium">{t('calendar.typeLabel')}</span>
                        </div>
                        <p className="text-sm text-zinc-900 dark:text-slate-200 ml-7">{t('calendar.allDay')}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Location Section */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 mb-1.5">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    <span className="font-medium">{t('calendar.locationLabel')}</span>
                  </div>
                  {isEditingEvent ? (
                    <div className="ml-7 space-y-3">
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="locationType"
                            value="online"
                            checked={editedEvent.locationType === 'online'}
                            onChange={(e) => handleFieldChange('locationType', e.target.value)}
                            className="h-4 w-4 text-zinc-900 dark:text-slate-100 border-zinc-300 dark:border-slate-600 focus:ring-zinc-900 dark:focus:ring-primary"
                          />
                          <span className="text-sm text-zinc-700 dark:text-slate-300">{t('calendar.online')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="locationType"
                            value="offline"
                            checked={editedEvent.locationType === 'offline'}
                            onChange={(e) => handleFieldChange('locationType', e.target.value)}
                            className="h-4 w-4 text-zinc-900 dark:text-slate-100 border-zinc-300 dark:border-slate-600 focus:ring-zinc-900 dark:focus:ring-primary"
                          />
                          <span className="text-sm text-zinc-700 dark:text-slate-300">{t('calendar.offline')}</span>
                        </label>
                      </div>
                      {editedEvent.locationType === 'online' && (
                        <select
                          value={editedEvent.platform || ''}
                          onChange={(e) => handleFieldChange('platform', e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary"
                        >
                          <option value="">{t('calendar.selectPlatform')}</option>
                          <option value="google-meet">{t('calendar.platformGoogleMeet')}</option>
                          <option value="teams">{t('calendar.platformTeams')}</option>
                          <option value="whatsapp">{t('calendar.platformWhatsApp')}</option>
                        </select>
                      )}
                      {editedEvent.locationType === 'offline' && (
                        <input
                          type="text"
                          value={editedEvent.address || ''}
                          onChange={(e) => handleFieldChange('address', e.target.value)}
                          placeholder={t('calendar.addressPlaceholder')}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-slate-600 rounded-lg text-sm text-zinc-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="ml-7">
                      {selectedEvent.locationType === 'online' && selectedEvent.platform ? (
                        <p className="text-sm text-zinc-900 dark:text-slate-200">
                          {t('calendar.online')} – {selectedEvent.platform === 'google-meet' ? t('calendar.platformGoogleMeet') :
                            selectedEvent.platform === 'teams' ? t('calendar.platformTeams') :
                              selectedEvent.platform === 'whatsapp' ? t('calendar.platformWhatsApp') : selectedEvent.platform}
                        </p>
                      ) : selectedEvent.locationType === 'offline' && selectedEvent.address ? (
                        <p className="text-sm text-zinc-900 dark:text-slate-200">{selectedEvent.address}</p>
                      ) : (
                        <p className="text-sm text-zinc-400 dark:text-slate-500">{t('calendar.noLocation')}</p>
                      )}
                    </div>
                  )}
                </div>

                {isEditingEvent ? (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-slate-300 mb-1.5">{t('calendar.colorLabel')}</label>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      {EVENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => handleFieldChange('color', color.value)}
                          className={`flex flex-col items-center gap-1 p-2 min-h-[44px] rounded-lg border-2 transition-all touch-manipulation ${editedEvent.color === color.value
                              ? 'border-zinc-900 dark:border-primary bg-zinc-50 dark:bg-slate-700'
                              : 'border-zinc-200 dark:border-slate-600 hover:border-zinc-300 dark:hover:border-slate-500 active:bg-zinc-100 dark:active:bg-slate-600'
                            }`}
                        >
                          <div className={`size-5 sm:size-6 rounded-full ${color.bg}`}></div>
                          <span className="text-[9px] sm:text-[10px] font-medium text-zinc-600 dark:text-slate-400">{getEventColorLabel(color.value)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 mb-1">
                      <span className="material-symbols-outlined text-[18px]">palette</span>
                      <span className="font-medium">{t('calendar.colorLabel')}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-7">
                      <div className={`size-4 rounded-full ${getDotColorClasses(selectedEvent.color) || 'bg-gray-500'}`}></div>
                      <span className="text-sm text-zinc-900 dark:text-slate-200">
                        {getEventColorLabel(selectedEvent.color)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!isEditingEvent && (
              <div className="bg-zinc-50 dark:bg-slate-800 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:flex-row-reverse gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(selectedEvent.id);
                  }}
                  className="w-full sm:w-auto inline-flex justify-center items-center min-h-[44px] rounded-lg px-4 py-2.5 bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-colors shadow-sm touch-manipulation"
                >
                  <span className="material-symbols-outlined text-[18px] mr-2">delete</span>
                  {t('calendar.deleteEvent')}
                </button>
                <button
                  type="button"
                  onClick={handleCloseEventDetail}
                  className="w-full sm:w-auto inline-flex justify-center items-center min-h-[44px] rounded-lg px-4 py-2.5 bg-white dark:bg-slate-700 text-zinc-700 dark:text-slate-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-slate-600 active:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:ring-offset-2 transition-colors border border-zinc-300 dark:border-slate-600 shadow-sm touch-manipulation"
                >
                  {t('common.close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-[51] transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
          <div className="size-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
          <h1 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
        </div>
        <div className="flex flex-col gap-2 p-4 flex-1">
          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>{t('admin.dashboard')}</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">people</span>
                <span>{t('admin.users')}</span>
              </Link>
              <Link
                to="/admin/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">description</span>
                <span>{t('admin.logs')}</span>
              </Link>
              <div className="my-2 border-t border-slate-100 dark:border-slate-700" />
            </>
          )}
          <Link
            to="/daily"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">today</span>
            <span>{t('calendar.planToday')}</span>
          </Link>
          <Link
            to="/goals"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">target</span>
            <span>{t('calendar.manageGoals')}</span>
          </Link>
          <Link
            to="/calendar"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-blue-300 font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined fill-1">calendar_month</span>
            <span>{t('calendar.calendarNav')}</span>
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>{t('calendar.settings')}</span>
          </Link>
          <div className="mt-auto border-t border-slate-100 dark:border-slate-700 pt-4">
            <LogoutButton
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white font-medium transition-colors w-full touch-manipulation min-h-[44px]"
              labelKey="calendar.logout"
            />
          </div>
        </div>
      </nav>
    </div>
  );
};

export default CalendarPage;

