import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import ModalMutationProgressBar from '../components/ModalMutationProgressBar';
import { eventsAPI, tasksAPI, notificationsAPI, googleEventsAPI, USER_SETTINGS_STORAGE_KEY } from '../services/api';
import AddTaskModal from '../components/AddTaskModal';
import { toast } from '../utils/toast';
import { formatLocalDateIso, formatLocalTimeHHmm } from '../utils/dateFormat';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Format task display title, prepending goal name when available. */
const taskDisplayTitle = (task) => {
  const base = task?.title || task?.text || '';
  return task?.goalName ? `[${task.goalName}] - ${base}` : base;
};

const TASK_SCHEDULE_KEY = 'task_schedule';
/** MIME type so only app task drags activate calendar drop targets (not random text/links). */
const TASK_DRAG_MIME = 'application/x-dainn-task-id';

function dataTransferHasTaskDrag(e) {
  const types = e?.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes(TASK_DRAG_MIME);
}

/** Read persisted schedule map: { [taskId]: { startTime, endTime } } */
function readTaskSchedule() {
  try { return JSON.parse(localStorage.getItem(TASK_SCHEDULE_KEY) || '{}'); } catch { return {}; }
}

/** Persist a single task's schedule slot. */
function saveTaskSchedule(taskId, startTime, endTime) {
  const map = readTaskSchedule();
  map[String(taskId)] = { startTime, endTime };
  localStorage.setItem(TASK_SCHEDULE_KEY, JSON.stringify(map));
}

// Dark (high-contrast) accent colors for the Add/Edit Event picker.
const EVENT_COLOR_PALETTE = ['#1E3A8A', '#064E3B', '#78350F', '#7F1D1D', '#4C1D95', '#701A75', '#0E3A4C'];

/** Visual tokens aligned with calendar mockups (navy + forest green + type-specific surfaces). */
const CAL_THEME = {
  navy: '#0a3366',
  navySoft: '#0d3d73',
  forest: '#004D40',
  forestHover: '#003d33',
  meetingBg: '#D6EAF8',
  meetingBorder: '#1565C0',
  meetingTitle: '#2C3E50',
  meetingMeta: '#5D6D7E',
  meetingAvatarMoreBg: '#BDC3C7',
  /** Deep focus — white card, dark teal left accent (no top border). */
  deepFocusBg: '#FAFAFA',
  deepFocusTeal: '#0D7377',
  deepFocusTealDark: '#0a5c5f',
  deepFocusTagBg: '#ECEFF1',
  deepFocusMeta: '#78909C',
  deepFocusDesc: '#90A4AE',
  /** Casual — lavender bar, white icon tile, teal-accent icon. */
  casualBg: '#EDE7F6',
  casualBorder: '#5E35B1',
  casualTitle: '#263238',
  casualMeta: '#78909C',
  casualIconTile: '#FFFFFF',
  casualChevron: '#B0BEC5',
  productivityBg: '#e8eaf6',
};

function toHex6(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const m = s.match(/^#?([0-9a-f]{6})$/i);
  return m ? `#${m[1].toUpperCase()}` : null;
}

/** Mix hex color with white. `whiteRatio` in [0..1], higher = lighter. */
function tintHexWithWhite(hex, whiteRatio) {
  const h = toHex6(hex);
  if (!h) return null;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const t = Math.min(1, Math.max(0, Number(whiteRatio)));
  const mix = (c) => Math.round(c + (255 - c) * t);
  const rr = mix(r).toString(16).padStart(2, '0');
  const gg = mix(g).toString(16).padStart(2, '0');
  const bb = mix(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`.toUpperCase();
}

function normalizeEventType(evt) {
  const raw = evt?.eventType ?? evt?.EventType;
  let s = String(raw || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (s === 'deepfocus') return 'deepfocus';
  if (s === 'casual' || s === 'casualsync') return 'casual';
  if (s === 'meeting') return 'meeting';
  const title = String(evt?.title || '');
  if (/^deep\s*focus\s*:/i.test(title)) return 'deepfocus';
  return 'meeting';
}

function displayDeepFocusTitle(title) {
  return String(title || '').replace(/^deep\s*focus\s*:\s*/i, '').trim();
}

function getEventColor(evt, index) {
  return evt?.color || EVENT_COLOR_PALETTE[index % EVENT_COLOR_PALETTE.length];
}

function getInitials(label) {
  const s = String(label || '').trim();
  if (!s) return '??';
  const parts = s.split(/[\s.@]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return initials || '??';
}

function computeTimedEventColumns(dayEvents) {
  const MAX_COLS = 2;
  const rows = (Array.isArray(dayEvents) ? dayEvents : [])
    .map((evt) => {
      const start = new Date(evt.startDate);
      const end = new Date(evt.endDate);
      if (Number.isNaN(start.getTime())) return null;
      const startMs = start.getTime();
      const endSafeMs = Number.isNaN(end.getTime()) ? (startMs + 60 * 60000) : end.getTime();
      const endMs = Math.max(startMs + 15 * 60000, endSafeMs);
      return { id: evt.id, startMs, endMs };
    })
    .filter(Boolean)
    .sort((a, b) => (a.startMs - b.startMs) || (b.endMs - a.endMs));

  const layoutById = {};
  let active = []; // [{ id, endMs, col }] — col=-1 means overflow
  let groupIds = [];
  let groupMaxCols = 1;

  const finalizeGroup = () => {
    if (groupIds.length === 0) return;
    const colCount = Math.min(groupMaxCols, MAX_COLS);
    for (const id of groupIds) {
      if (layoutById[id]) layoutById[id].colCount = colCount;
      else layoutById[id] = { col: 0, colCount, isOverflow: false };
    }
    groupIds = [];
    groupMaxCols = 1;
  };

  for (const ev of rows) {
    active = active.filter((a) => a.endMs > ev.startMs);
    if (active.length === 0) finalizeGroup();

    const usedCols = new Set(active.map((a) => a.col).filter((c) => c >= 0));
    let col = 0;
    while (usedCols.has(col)) col += 1;

    if (col < MAX_COLS) {
      // Normal assignment: fits within the 2-column cap
      layoutById[ev.id] = { col, colCount: 1, isOverflow: false };
      active.push({ id: ev.id, endMs: ev.endMs, col });
      groupMaxCols = Math.max(groupMaxCols, col + 1);
    } else {
      // Overflow: would need a 3rd+ column — render full-width on top
      layoutById[ev.id] = { col: 0, colCount: MAX_COLS, isOverflow: true };
      active.push({ id: ev.id, endMs: ev.endMs, col: -1 });
    }
    groupIds.push(ev.id);
  }

  finalizeGroup();
  return layoutById;
}

function htmlToPlainText(html) {
  const s = String(html || '').trim();
  if (!s) return '';
  // Fast path: no tags
  if (!/[<>]/.test(s)) return s;
  try {
    const doc = new DOMParser().parseFromString(s, 'text/html');
    const text = (doc?.body?.textContent || '').replace(/\s+/g, ' ').trim();
    return text;
  } catch {
    return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function getWeekDays(date, weekStartDay) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const delta = weekStartDay === 'sunday' ? -dow : -((dow + 6) % 7);
  const start = new Date(d);
  start.setDate(d.getDate() + delta);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

/** Pixels per hour in the day timeline (8:00–19:00). */
const CALENDAR_HOUR_HEIGHT_PX = 110;

function eventTopPx(startHour, startMin, dayStart = 8) {
  return (startHour - dayStart) * CALENDAR_HOUR_HEIGHT_PX + (startMin / 60) * CALENDAR_HOUR_HEIGHT_PX;
}

function eventHeightPx(durationMinutes) {
  return Math.max(40, (durationMinutes / 60) * CALENDAR_HOUR_HEIGHT_PX);
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
  const v = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(v.getTime())) return null;
  return v.toISOString();
}

function getMonthDays(year, month, wsDay) {
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days = [];
  const startDow = firstDay.getDay();
  const offset = wsDay === 'sunday' ? startDow : (startDow === 0 ? 6 : startDow - 1);
  for (let i = offset - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), otherMonth: true });
  }
  for (let d = 1; d <= lastDate; d++) {
    days.push({ date: new Date(year, month, d), otherMonth: false });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), otherMonth: true });
  }
  return days;
}

// ─── Component ─────────────────────────────────────────────────────────────

const CalendarPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const [workHours] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' && localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      const s = Number(stored?.workHourStart);
      const e = Number(stored?.workHourEnd);
      const vs = Number.isInteger(s) && s >= 0 && s <= 22 ? s : 8;
      const ve = Number.isInteger(e) && e > vs && e <= 24 ? e : 23;
      return { start: vs, end: ve };
    } catch {
      return { start: 8, end: 23 };
    }
  });
  const workHourStart = workHours.start;
  const workHourEnd = workHours.end;

  const [isGoogleConnected] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' && localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      return !!stored?.plans?.googleCalendarConnected;
    } catch {
      return false;
    }
  });

  const [googleNudgeDismissed, setGoogleNudgeDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('gcal_nudge_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ── Core state ──
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [tasksForDay, setTasksForDay] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [showTaskStrip, setShowTaskStrip] = useState(false);
  /** Task strip list: show incomplete-only vs completed-only. */
  const [taskStripFilter, setTaskStripFilter] = useState('incomplete');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDeleteConfirm, setTaskDeleteConfirm] = useState(false);
  const [taskEditModalOpen, setTaskEditModalOpen] = useState(false);
  const [selectedTimelineTask, setSelectedTimelineTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverHour, setDragOverHour] = useState(null);
  const [dragOverWeekDayIso, setDragOverWeekDayIso] = useState(null);
  const timelineRef = useRef(null);
  const timelineScrollRef = useRef(null);
  const [activeEventMenuId, setActiveEventMenuId] = useState(null);

  // ── Event CRUD form state (unchanged) ──
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventFormSubmitting, setEventFormSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showNewGuestInput, setShowNewGuestInput] = useState(false);
  const [newGuestValue, setNewGuestValue] = useState('');
  const [showNewProjectTagInput, setShowNewProjectTagInput] = useState(false);
  const [newProjectTagValue, setNewProjectTagValue] = useState('');
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    isAllDay: false,
    startDate: '',
    endDate: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    color: '',
    // new modal fields
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    eventType: 'meeting',
    casualIcon: '☕',
    reminderMinutes: 15,
    doNotDisturb: false,
    attendees: [],
    projectTags: [],
  });

  // ── Mini calendar state (for event modal) ──
  const [miniCalDate, setMiniCalDate] = useState(() => new Date());

  // ── Current-time indicator (updates every 60s) ──
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef(null);
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Data loading ──
  const selectedDateIso = formatLocalDateIso(selectedDate);
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const delta = weekStartDay === 'sunday' ? -dow : -((dow + 6) % 7);
    d.setDate(d.getDate() + delta);
    return d;
  }, [currentDate, weekStartDay]);
  const weekStartIso = useMemo(() => formatLocalDateIso(weekStart), [weekStart]);
  const weekEndIso = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return formatLocalDateIso(d);
  }, [weekStart]);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await eventsAPI.getEvents({ startDate: weekStartIso, endDate: weekEndIso });
      const list = res?.data ?? res?.items ?? res ?? [];
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      // Increase page size to show more tasks for the selected day.
      const res = await tasksAPI.getTasks({ date: selectedDateIso, page: 1, pageSize: 30 });
      const list = res?.data ?? res?.items ?? res ?? [];
      const tasks = Array.isArray(list) ? list : [];
      const schedule = readTaskSchedule();
      const merged = tasks.map((t) => {
        const slot = schedule[String(t.id)];
        if (slot && !t.startTime) return { ...t, startTime: slot.startTime, endTime: slot.endTime };
        return t;
      });
      setTasksForDay(merged);
    } catch {
      setTasksForDay([]);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartIso]);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateIso]);

  useEffect(() => {
    notificationsAPI.getNotifications({ limit: 20 })
      .then((data) => setNotifications(Array.isArray(data) ? data : (data?.notifications ?? [])))
      .catch(() => { });
  }, []);

  useEffect(() => {
    setSelectedTask((st) => {
      if (!st) return null;
      const fresh = tasksForDay.find((x) => x.id === st.id);
      if (!fresh) return null;
      const done = !!(fresh.completed || fresh.isCompleted);
      const visible = taskStripFilter === 'complete' ? done : !done;
      return visible ? fresh : null;
    });
  }, [taskStripFilter, tasksForDay]);


  // ── Event CRUD handlers ──
  const openCreateModal = () => {
    if (eventFormSubmitting) return;
    const baseDateStr = formatLocalDateIso(new Date(selectedDate));
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
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
      date: baseDateStr,
      startTime: '09:00',
      endTime: '10:00',
      eventType: 'meeting',
      casualIcon: '☕',
      reminderMinutes: 15,
      doNotDisturb: false,
      attendees: [],
      projectTags: [],
    });
    setMiniCalDate(new Date(selectedDate));
    setShowNewGuestInput(false);
    setNewGuestValue('');
    setShowNewProjectTagInput(false);
    setNewProjectTagValue('');
    setEventModalOpen(true);
  };

  const openEditModal = (evt) => {
    if (eventFormSubmitting) return;
    const allDay = !!evt?.isAllDay;
    let date = '';
    let startTime = '09:00';
    let endTime = '10:00';
    if (allDay) {
      date = toDateInputValueFromUtcIso(evt?.startDate) ?? '';
    } else if (evt?.startDate) {
      const s = new Date(evt.startDate);
      const e = new Date(evt.endDate);
      date = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
      startTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
      endTime = !Number.isNaN(e.getTime()) ? `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}` : '10:00';
    }
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
      date,
      startTime,
      endTime,
      eventType: normalizeEventType(evt),
      casualIcon: evt?.icon ?? '☕',
      reminderMinutes: typeof evt?.reminderMinutes === 'number' ? evt.reminderMinutes : 15,
      doNotDisturb: !!evt?.dndEnabled,
      attendees: Array.isArray(evt?.attendees) ? evt.attendees : [],
      projectTags: Array.isArray(evt?.projectTags) ? evt.projectTags : [],
    });
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      setMiniCalDate(new Date(y, m - 1, d));
    }
    setShowNewGuestInput(false);
    setNewGuestValue('');
    setShowNewProjectTagInput(false);
    setNewProjectTagValue('');
    setEventModalOpen(true);
  };

  const closeModal = () => {
    if (eventFormSubmitting) return;
    setEventModalOpen(false);
    setEditingEvent(null);
    setShowNewGuestInput(false);
    setNewGuestValue('');
    setShowNewProjectTagInput(false);
    setNewProjectTagValue('');
  };

  const handleAddNewGuest = () => {
    const next = String(newGuestValue || '').trim();
    if (!next) return;
    setEventForm((p) => ({
      ...p,
      attendees: Array.from(new Set([...(Array.isArray(p.attendees) ? p.attendees : []), next])),
    }));
    setNewGuestValue('');
    setShowNewGuestInput(false);
  };

  const handleAddNewProjectTag = () => {
    const next = String(newProjectTagValue || '').trim();
    if (!next) return;
    setEventForm((p) => ({
      ...p,
      projectTags: Array.from(new Set([...(Array.isArray(p.projectTags) ? p.projectTags : []), next])),
    }));
    setNewProjectTagValue('');
    setShowNewProjectTagInput(false);
  };

  const handleCalendarEventSubmit = async (e) => {
    e.preventDefault();
    if (eventFormSubmitting) return;

    if (!eventForm.title.trim()) {
      toast.error(t('calendar.titleRequired'));
      return;
    }

    let startIso = null;
    let endIso = null;

    if (eventForm.isAllDay) {
      startIso = utcDateInputToIso(eventForm.startDate);
      endIso = utcDateInputToIso(eventForm.endDate);
    } else {
      let sDate, eDate;
      if (eventForm.date && eventForm.startTime) {
        sDate = new Date(`${eventForm.date}T${eventForm.startTime}:00`);
        eDate = eventForm.date && eventForm.endTime ? new Date(`${eventForm.date}T${eventForm.endTime}:00`) : null;
      } else {
        sDate = eventForm.startDateTime ? new Date(eventForm.startDateTime) : null;
        eDate = eventForm.endDateTime ? new Date(eventForm.endDateTime) : null;
      }
      const sValid = sDate && !Number.isNaN(sDate.getTime());
      const eValid = eDate && !Number.isNaN(eDate.getTime());
      const endFallback = sValid ? new Date(sDate.getTime() + 60 * 60 * 1000) : null;
      startIso = sValid ? sDate.toISOString() : null;
      const endDateToUse = eValid ? eDate : endFallback;
      endIso = endDateToUse ? endDateToUse.toISOString() : null;
    }

    if (!startIso || !endIso) {
      toast.error(t('calendar.provideStartEnd'));
      return;
    }

    if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
      toast.error(t('calendar.endAfterStart'));
      return;
    }

    const attendees = Array.isArray(eventForm.attendees)
      ? eventForm.attendees.map((s) => String(s || '').trim()).filter(Boolean)
      : [];
    const projectTags = Array.isArray(eventForm.projectTags)
      ? eventForm.projectTags.map((s) => String(s || '').trim()).filter(Boolean)
      : [];

    const payload = {
      title: eventForm.title.trim(),
      description: eventForm.description || undefined,
      startDate: startIso,
      endDate: endIso,
      location: eventForm.location || undefined,
      color: eventForm.color || undefined,
      isAllDay: !!eventForm.isAllDay,
      eventType: eventForm.eventType || undefined,
      // Create/update from app only: don't mirror to Google Calendar.
      pushToGoogle: false,
      icon: eventForm.eventType === 'casual' ? (eventForm.casualIcon || undefined) : undefined,
      dndEnabled: eventForm.eventType === 'deepfocus' ? !!eventForm.doNotDisturb : undefined,
      reminderMinutes: typeof eventForm.reminderMinutes === 'number' ? eventForm.reminderMinutes : undefined,
      attendees: attendees.length > 0 ? attendees : undefined,
      projectTags: projectTags.length > 0 ? projectTags : undefined,
    };

    setEventFormSubmitting(true);
    try {
      if (!editingEvent) {
        await eventsAPI.createEvent(payload);
      } else if (editingEvent.source === 'Google') {
        if (!editingEvent.externalId) throw new Error(t('calendar.saveEventFail'));
        await googleEventsAPI.updateGoogleEvent(editingEvent.externalId, payload);
        toast.success(t('calendar.googleEventUpdated'));
      } else {
        await eventsAPI.updateEvent(editingEvent.id, payload);
      }
      await loadEvents();
      setEventModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      toast.error(err?.message || t('calendar.saveEventFail'));
    } finally {
      setEventFormSubmitting(false);
    }
  };

  const handleDeleteTask = async (task) => {
    try {
      await tasksAPI.deleteTask(task.id);
      setTasksForDay((prev) => prev.filter((t) => t.id !== task.id));
      setSelectedTask(null);
      setTaskDeleteConfirm(false);
    } catch (err) {
      toast.error(err?.message || t('calendar.deleteTaskFail'));
    }
  };

  const handleToggleTask = async (task) => {
    const nowCompleted = !(task.completed || task.isCompleted);
    // optimistic update
    setTasksForDay((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: nowCompleted, isCompleted: nowCompleted } : t,
      ),
    );
    try {
      await tasksAPI.completeTask(task.id);
    } catch {
      // revert on failure
      await loadTasks();
    }
  };

  const handleTaskDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    const idStr = String(task.id);
    e.dataTransfer.setData('text/plain', idStr);
    e.dataTransfer.setData(TASK_DRAG_MIME, idStr);
  };

  const resolveDraggedTaskId = (e) =>
    e.dataTransfer.getData(TASK_DRAG_MIME) || e.dataTransfer.getData('text/plain');

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
    setDragOverWeekDayIso(null);
    setDragOverHour(null);
  };

  const handleTimelineDragOver = (e) => {
    if (!draggedTask && !dataTransferHasTaskDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = Math.round((y / CALENDAR_HOUR_HEIGHT_PX) * 60 / 15) * 15;
    const hour = workHourStart + Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;
    const clamped = Math.min(Math.max(hour, workHourStart), workHourEnd - 1);
    setDragOverHour({ hour: clamped, min });
  };

  const handleTimelineDragLeave = (e) => {
    if (!timelineRef.current?.contains(e.relatedTarget)) {
      setDragOverHour(null);
    }
  };

  const handleTimelineDrop = async (e) => {
    e.preventDefault();
    setDragOverHour(null);
    setDragOverWeekDayIso(null);
    if (!timelineRef.current) return;
    // resolve task — prefer state, fall back to dataTransfer id lookup
    const taskId = resolveDraggedTaskId(e);
    const task = draggedTask ?? tasksForDay.find((t) => String(t.id) === taskId);
    setDraggedTask(null);
    if (!task) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = Math.round((y / CALENDAR_HOUR_HEIGHT_PX) * 60 / 15) * 15;
    const rawHour = workHourStart + Math.floor(totalMinutes / 60);
    const rawMin = totalMinutes % 60;
    const startHour = Math.min(Math.max(rawHour, workHourStart), workHourEnd - 1);
    const startMin = rawMin;
    const endH = startHour + 1 >= workHourEnd ? workHourEnd : startHour + 1;
    const startTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endTime = `${String(endH).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    // persist to localStorage so schedule survives refresh even if backend ignores these fields
    saveTaskSchedule(task.id, startTime, endTime);
    // optimistic update
    setTasksForDay((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, startTime, endTime } : t),
    );
    try {
      await tasksAPI.updateTask(task.id, { startTime, endTime });
    } catch {
      await loadTasks();
    }
  };

  /** Allow dropping tasks when the pointer is over event cards or task cards (they sit above the grid). */
  const handleTaskTimelineDragOver = (e) => {
    if (!draggedTask && !dataTransferHasTaskDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    handleTimelineDragOver(e);
  };

  const handleTaskTimelineDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleTimelineDrop(e);
  };

  const handleWeekDayDragOver = (e, day) => {
    if (!draggedTask && !dataTransferHasTaskDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverWeekDayIso(formatLocalDateIso(day));
  };

  const handleWeekDayDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverWeekDayIso(null);
    }
  };

  const handleWeekDayDrop = async (e, day) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverWeekDayIso(null);
    setDragOverHour(null);
    const taskId = resolveDraggedTaskId(e);
    const task = draggedTask ?? tasksForDay.find((t) => String(t.id) === taskId);
    setDraggedTask(null);
    if (!task) return;
    if (isSameDay(day, selectedDate)) return;

    const prev = task.date ? new Date(task.date) : new Date(selectedDate);
    const target = new Date(day);
    target.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    const datePayload = target.toISOString();
    const payload = { date: datePayload };
    if (task.startTime) payload.startTime = task.startTime;
    if (task.endTime) payload.endTime = task.endTime;

    try {
      await tasksAPI.updateTask(task.id, payload);
      setSelectedTask(null);
      setSelectedTimelineTask(null);
      setTaskDeleteConfirm(false);
      setSelectedDate(new Date(day));
      toast.success(t('calendar.taskMovedToDay'));
    } catch (err) {
      toast.error(err?.message || t('calendar.taskMoveDayFail'));
      await loadTasks();
    }
  };

  const navigateWeek = (delta) => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  };

  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDismissGoogleNudge = () => {
    try { sessionStorage.setItem('gcal_nudge_dismissed', '1'); } catch { /* ignore */ }
    setGoogleNudgeDismissed(true);
  };

  // ── Derived values ──
  const weekDays = getWeekDays(currentDate, weekStartDay);
  const timedEvents = events.filter((e) => !e.isAllDay && isSameDay(new Date(e.startDate), selectedDate));
  const allDayEvents = events.filter((e) => e.isAllDay && isSameDay(new Date(e.startDate), selectedDate));
  const timedEventLayout = computeTimedEventColumns(timedEvents);

  // Earlier start time → higher z-index (earlier events render on top when overlapping)
  const timedEventZBase = (() => {
    const sorted = [...timedEvents]
      .filter((e) => !Number.isNaN(new Date(e.startDate).getTime()))
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const n = sorted.length;
    const map = {};
    sorted.forEach((e, i) => { map[e.id] = n - i + 1; });
    return map;
  })();

  const isToday = isSameDay(selectedDate, new Date());
  const nowHour = now.getHours();
  const nowMin = now.getMinutes();
  const showTimeLine = isToday && nowHour >= workHourStart && nowHour < workHourEnd;
  const timeLineTop = showTimeLine ? eventTopPx(nowHour, nowMin, workHourStart) : null;

  // Keep current-time indicator centered in the visible timeline viewport.
  useEffect(() => {
    if (!showTimeLine) return;
    const scroller = timelineScrollRef.current;
    if (!scroller) return;
    if (timeLineTop == null) return;

    // If layout isn't ready yet, defer one tick.
    const raf = requestAnimationFrame(() => {
      const viewportH = scroller.clientHeight || 0;
      const maxScrollTop = Math.max(0, scroller.scrollHeight - viewportH);
      const target = Math.min(maxScrollTop, Math.max(0, Math.round(timeLineTop - viewportH / 2)));
      scroller.scrollTo({ top: target, behavior: 'auto' });
    });

    return () => cancelAnimationFrame(raf);
  }, [showTimeLine, timeLineTop, selectedDateIso, workHourStart, workHourEnd]);

  const totalTasks = tasksForDay.length;
  const completedTasks = tasksForDay.filter(
    (task) => task.completed || task.status === 'completed' || task.isCompleted,
  ).length;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const nextEvent = timedEvents
    .filter((e) => {
      const start = new Date(e.startDate);
      return !Number.isNaN(start.getTime()) && start > now;
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] ?? null;

  const minutesUntilNext = nextEvent
    ? Math.max(1, Math.round((new Date(nextEvent.startDate) - now) / 60000))
    : null;

  // Use Thursday (index 3) as anchor to determine displayed month
  const anchorDay = weekDays[3] ?? weekDays[0];
  const anchorMonth = anchorDay ? anchorDay.getMonth() + 1 : currentDate.getMonth() + 1;
  const anchorYear = anchorDay ? anchorDay.getFullYear() : currentDate.getFullYear();
  const monthLabel = `${t(`calendar.month${anchorMonth}`)} ${anchorYear}`;
  const DAY_KEYS = ['shortSun', 'shortMon', 'shortTue', 'shortWed', 'shortThu', 'shortFri', 'shortSat'];

  // ── Render ──
  return (
    <div className="bg-background-light dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display min-h-screen flex flex-row overflow-hidden">
      {activeEventMenuId !== null && (
        <div
          className="fixed inset-0 z-[49]"
          onClick={() => setActiveEventMenuId(null)}
          aria-hidden="true"
        />
      )}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={t('calendar.title')}
          icon="calendar_month"
          actionButton={{
            text: t('calendar.addEvent'),
            icon: 'add',
            onClick: openCreateModal,
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-4 gap-4">

          {/* ── Calendar Header ── */}
          <div className="flex items-end justify-between gap-4 shrink-0">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111418] dark:text-slate-100 tracking-tighter select-none">
                {monthLabel}
              </h2>
              <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">
                {t('calendar.weekEventCount', { count: events.length })}
              </p>
            </div>

            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-1.5 gap-1 shadow-sm shrink-0">
              <button
                type="button"
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all text-primary"
                aria-label={t('calendar.prevWeek')}
                title={t('calendar.prevWeek')}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={goToday}
                className="px-6 py-1.5 bg-white dark:bg-slate-700 text-primary font-bold rounded-full text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition-all"
              >
                {t('calendar.today')}
              </button>
              <button
                type="button"
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all text-primary"
                aria-label={t('calendar.nextWeek')}
                title={t('calendar.nextWeek')}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* ── Google Calendar connect nudge ── */}
          {!isGoogleConnected && !googleNudgeDismissed && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[18px] text-[#4285F4] shrink-0">calendar_month</span>
                <span className="text-sm text-blue-700 dark:text-blue-300 truncate">
                  {t('calendar.connectGoogleBanner')}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { navigate('/settings'); }}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#4285F4] text-white hover:bg-[#3367d6] transition-colors"
                >
                  {t('calendar.connectGoogleAction')}
                </button>
                <button
                  type="button"
                  onClick={handleDismissGoogleNudge}
                  className="p-1 rounded-lg text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                  aria-label={t('common.close')}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          )}

          {/* ── M2: Day Selector + Task Strip ── */}
          {(() => {
            const incompleteTasks = tasksForDay.filter((t) => !(t.completed || t.isCompleted));
            const sortedTasks = [...tasksForDay].sort((a, b) => {
              const aC = a.completed || a.isCompleted ? 1 : 0;
              const bC = b.completed || b.isCompleted ? 1 : 0;
              if (aC !== bC) return aC - bC; // incomplete first
              return (b.priority || 0) - (a.priority || 0); // high priority first
            });
            const visibleTasks = sortedTasks.filter((task) => {
              const done = !!(task.completed || task.isCompleted);
              return taskStripFilter === 'complete' ? done : !done;
            });
            const taskStripModeToggle = (
              <div
                className="flex items-center rounded-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/80 p-0.5 shrink-0"
                role="group"
                aria-label={t('calendar.taskStripFilterAria')}
              >
                <button
                  type="button"
                  onClick={() => setTaskStripFilter('incomplete')}
                  aria-pressed={taskStripFilter === 'incomplete'}
                  className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap ${
                    taskStripFilter === 'incomplete'
                      ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                >
                  {t('daily.incomplete')}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStripFilter('complete')}
                  aria-pressed={taskStripFilter === 'complete'}
                  className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap ${
                    taskStripFilter === 'complete'
                      ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                >
                  {t('daily.completed')}
                </button>
              </div>
            );
            return (
              <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0 overflow-hidden">
                {/* Day buttons row */}
                <div className="flex gap-1 sm:gap-2 p-2">
                  {weekDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const dayIso = formatLocalDateIso(day);
                    const dayHasEvents = events.some((e) => formatLocalDateIso(new Date(e.startDate)) === dayIso);
                    const isDropTarget = dragOverWeekDayIso === dayIso && !isSelected;
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setSelectedDate(new Date(day))}
                        onDragOver={(e) => handleWeekDayDragOver(e, day)}
                        onDragLeave={handleWeekDayDragLeave}
                        onDrop={(e) => handleWeekDayDrop(e, day)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl transition-all duration-150 ${isSelected
                            ? 'text-white shadow-lg shadow-black/10 scale-[1.02]'
                            : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-[#111418] dark:text-slate-200'
                          } ${isDropTarget ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-800' : ''}`}
                        style={isSelected ? { backgroundColor: CAL_THEME.navy } : undefined}
                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'text-white/85' : 'opacity-70'}`}>
                          {t(`calendar.${DAY_KEYS[day.getDay()]}`)}
                        </span>
                        <span className="text-sm sm:text-base font-bold leading-none">{day.getDate()}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dayHasEvents ? 'bg-[#005EB8]' : 'invisible'}`}
                        />
                      </button>
                    );
                  })}

                  {/* Task strip toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowTaskStrip((v) => !v)}
                    title={t('calendar.showTasks')}
                    className={`shrink-0 relative flex flex-col items-center justify-center gap-0.5 py-2 px-2.5 rounded-2xl transition-all duration-150 ${
                      showTaskStrip && incompleteTasks.length > 0
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                        : showTaskStrip
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                        : incompleteTasks.length > 0
                        ? 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">checklist</span>
                    {incompleteTasks.length > 0 && (
                      <span className={`text-[9px] font-bold leading-none ${incompleteTasks.length > 0 ? 'text-red-400' : 'text-gray-400 dark:text-slate-500'}`}>
                        {incompleteTasks.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Collapsible task strip */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${incompleteTasks.length > 0 ? 'border-l-2 border-red-400 dark:border-red-500' : ''}`}
                  style={{ maxHeight: showTaskStrip ? '320px' : '0px' }}
                >
                  {/* Pill list */}
                  <div className="border-t border-gray-100 dark:border-slate-700 px-3 py-2.5">
                    {sortedTasks.length === 0 ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <p className="text-xs text-gray-400 dark:text-slate-500 py-1 min-w-0 flex-1 pr-2">
                          {t('calendar.noTasksToday')}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {taskStripFilter === 'incomplete' && (
                            <button
                              type="button"
                              onClick={() => { setSelectedTask(null); setTaskEditModalOpen(true); }}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all shrink-0"
                              title={t('daily.addTask')}
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                            </button>
                          )}
                          {taskStripModeToggle}
                        </div>
                      </div>
                    ) : visibleTasks.length === 0 ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <p className="text-xs text-gray-400 dark:text-slate-500 py-1 min-w-0 flex-1 pr-2">
                          {taskStripFilter === 'complete' ? t('calendar.taskStripNoCompleted') : t('calendar.taskStripNoIncomplete')}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {taskStripFilter === 'incomplete' && (
                            <button
                              type="button"
                              onClick={() => { setSelectedTask(null); setTaskEditModalOpen(true); }}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all shrink-0"
                              title={t('daily.addTask')}
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                            </button>
                          )}
                          {taskStripModeToggle}
                        </div>
                      </div>
                    ) : (
                      <div className="flex w-full items-center gap-2">
                        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 items-center">
                        {visibleTasks.map((task) => {
                          const isCompleted = task.completed || task.isCompleted;
                          const priority = task.priority || 0;
                          const isActive = selectedTask?.id === task.id;
                          return (
                            <button
                              key={task.id}
                              type="button"
                              draggable="true"
                              onDragStart={(e) => handleTaskDragStart(e, task)}
                              onDragEnd={handleTaskDragEnd}
                              onClick={() => {
                                setSelectedTask((prev) => prev?.id === task.id ? null : task);
                                setTaskDeleteConfirm(false);
                              }}
                              title={taskDisplayTitle(task)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.97] shrink-0 cursor-grab active:cursor-grabbing ${
                                isActive
                                  ? 'ring-2 ring-primary ring-offset-1'
                                  : ''
                              } ${
                                isCompleted
                                  ? 'bg-gray-100 dark:bg-slate-700/60 text-gray-400 dark:text-slate-500'
                                  : priority === 2
                                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/40'
                                  : priority === 1
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isCompleted ? 'bg-gray-300 dark:bg-slate-600'
                                : priority === 2 ? 'bg-red-400'
                                : priority === 1 ? 'bg-amber-400'
                                : 'bg-gray-400'
                              }`} />
                              <span className={`max-w-[140px] truncate ${isCompleted ? 'line-through' : ''}`}>
                                {taskDisplayTitle(task)}
                              </span>
                              {isCompleted && (
                                <span className="material-symbols-outlined text-[11px] shrink-0">check</span>
                              )}
                            </button>
                          );
                        })}
                        {taskStripFilter === 'incomplete' && (
                          <button
                            type="button"
                            onClick={() => { setSelectedTask(null); setTaskEditModalOpen(true); }}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all shrink-0 self-center"
                            title={t('daily.addTask')}
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                          </button>
                        )}
                        </div>
                        <div className="shrink-0 self-center">
                          {taskStripModeToggle}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task detail panel */}
                  {selectedTask && (() => {
                    const t2 = tasksForDay.find((x) => x.id === selectedTask.id) || selectedTask;
                    const isCompleted = t2.completed || t2.isCompleted;
                    const priority = t2.priority || 0;
                    const priorityLabel = priority === 2 ? t('daily.priorityHigh') : priority === 1 ? t('daily.priorityMedium') : t('daily.priorityLow');
                    const priorityColor = priority === 2
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                      : priority === 1
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';
                    const tags = Array.isArray(t2.tags) ? t2.tags : [];
                    return (
                      <div className="border-t border-gray-100 dark:border-slate-700 px-3 py-3 flex flex-col gap-2 bg-gray-50/50 dark:bg-slate-800/40">
                        {/* Header: priority + title + close */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 flex items-start gap-2">
                            <span className={`mt-0.5 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColor}`}>
                              {priorityLabel}
                            </span>
                            <p className={`min-w-0 text-sm font-semibold text-[#111418] dark:text-slate-100 leading-snug truncate ${isCompleted ? 'line-through opacity-60' : ''}`}>
                              {taskDisplayTitle(t2)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSelectedTask(null); setTaskDeleteConfirm(false); }}
                            className="shrink-0 rounded-md p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>

                        {/* Meta: tags */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20 font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Description */}
                        {htmlToPlainText(t2.description) && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {htmlToPlainText(t2.description)}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          {/* Toggle complete */}
                          <button
                            type="button"
                            onClick={() => handleToggleTask(t2)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              isCompleted
                                ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'
                                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isCompleted ? 'undo' : 'check_circle'}
                            </span>
                            {isCompleted ? t('calendar.taskMarkIncomplete') : t('calendar.taskMarkComplete')}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => setTaskEditModalOpen(true)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary dark:text-blue-400 hover:bg-primary/10 dark:hover:bg-blue-400/10 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            {t('common.edit')}
                          </button>

                          {/* Delete */}
                          {taskDeleteConfirm ? (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-xs text-gray-500 dark:text-slate-400">{t('calendar.confirmDelete')}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(t2)}
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                {t('common.yes')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setTaskDeleteConfirm(false)}
                                className="px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                {t('common.no')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setTaskDeleteConfirm(true)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors ml-auto"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {/* ── M3 + M4: Timeline + Event Drawer ── */}
          <div className="flex gap-4 flex-1 min-h-0">

            {/* Timeline */}
            <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">

              {/* All-day event pills */}
              {allDayEvents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-slate-700 shrink-0">
                  {allDayEvents.map((evt, i) => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      className="px-2.5 py-1 rounded-full text-white text-xs font-medium truncate max-w-[200px] hover:brightness-90 transition-all"
                      style={{ backgroundColor: getEventColor(evt, i) }}
                    >
                      {evt.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Scrollable grid */}
              <div ref={timelineScrollRef} className="relative flex-1 overflow-y-auto">
                <div
                  className="relative"
                  style={{
                    height: (workHourEnd - workHourStart) * CALENDAR_HOUR_HEIGHT_PX,
                    paddingRight: 8,
                    paddingBottom: 8,
                  }}
                >

                  {/* Hour rows */}
                  {Array.from({ length: workHourEnd - workHourStart }, (_, i) => {
                    const hour = workHourStart + i;
                    return (
                      <div
                        key={hour}
                        className="absolute w-full"
                        style={{ top: i * CALENDAR_HOUR_HEIGHT_PX, height: CALENDAR_HOUR_HEIGHT_PX }}
                      >
                        <div className={`absolute left-0 w-12 text-right pr-2 text-[10px] text-gray-400 dark:text-slate-500 select-none leading-none ${i === 0 ? 'translate-y-0' : '-translate-y-2'}`}>
                          {String(hour).padStart(2, '0')}:00
                        </div>
                        <div className="absolute left-12 right-0 border-t border-gray-100 dark:border-slate-700/60" />
                      </div>
                    );
                  })}

                  {/* Current-time indicator */}
                  {showTimeLine && !eventModalOpen && !taskEditModalOpen && (
                    <div
                      className="absolute left-12 right-0 pointer-events-none"
                      style={{ top: timeLineTop, zIndex: 20000 }}
                    >
                      <div className="relative">
                        <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                        <div className="border-t-2 border-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Timed event cards (lane excludes hour labels) */}
                  <div
                    ref={timelineRef}
                    className="absolute left-14 right-2 top-0 bottom-0"
                    onDragOver={handleTimelineDragOver}
                    onDragLeave={handleTimelineDragLeave}
                    onDrop={handleTimelineDrop}
                  >
                    {timedEvents.map((evt) => {
                      const start = new Date(evt.startDate);
                      const end = new Date(evt.endDate);
                      if (Number.isNaN(start.getTime())) return null;
                      const startH = start.getHours();
                      const startM = start.getMinutes();
                      if (startH < workHourStart || startH >= workHourEnd) return null;
                      const durationMin = Number.isNaN(end.getTime())
                        ? 60
                        : Math.max(15, (end - start) / 60000);
                      const top = eventTopPx(startH, startM, workHourStart);
                      const height = eventHeightPx(durationMin);
                      const CARD_GAP_PX = 8; // visual breathing room between adjacent cards
                      const cardTop = top + Math.round(CARD_GAP_PX / 2);
                      const cardHeight = Math.max(36, height - CARD_GAP_PX);
                      const startLabel = formatLocalTimeHHmm(evt.startDate) ?? '';
                      const endLabel = formatLocalTimeHHmm(evt.endDate) ?? '';
                      const isCompactEventCard = cardHeight <= 52;
                      const isLongEventCard = durationMin >= 60;
                      const fallbackEventTextColor = '#06b6d4';
                      const accentColor = evt?.color ? String(evt.color) : fallbackEventTextColor;
                      const type = normalizeEventType(evt);
                      const accentSurfaceColor =
                        tintHexWithWhite(accentColor, 0.96)
                        ?? (type === 'meeting'
                          ? CAL_THEME.meetingBg
                          : type === 'deepfocus'
                            ? CAL_THEME.deepFocusBg
                            : CAL_THEME.casualBg);
                      const attendees = Array.isArray(evt?.attendees) ? evt.attendees : [];
                      const projectTags = Array.isArray(evt?.projectTags) ? evt.projectTags : [];
                      const deepTitle = displayDeepFocusTitle(evt.title);
                      const layout = timedEventLayout?.[evt.id] || { col: 0, colCount: 1, isOverflow: false };
                      const isOverflow = !!layout.isOverflow;

                      // z-index: earlier start → higher rank (earlier events sit on top).
                      // Overflow events get an extra boost when current time is near them.
                      const startMs = start.getTime();
                      const endSafeMs = Number.isNaN(end.getTime()) ? startMs + 3600000 : end.getTime();
                      const nowMs = now.getTime();
                      const baseZ = timedEventZBase[evt.id] ?? 1;
                      let zIndex;
                      if (isOverflow) {
                        if (nowMs >= startMs && nowMs <= endSafeMs) {
                          zIndex = baseZ + 1000; // happening now → float above all
                        } else if (nowMs >= startMs - 30 * 60000 && nowMs < startMs) {
                          zIndex = baseZ + 500; // starting within 30 min
                        } else {
                          zIndex = baseZ; // just use start-time order
                        }
                      } else {
                        zIndex = baseZ;
                      }

                      const eventCardStyle =
                        type === 'meeting'
                          ? {
                            top: cardTop,
                            height: cardHeight,
                            backgroundColor: accentSurfaceColor,
                            borderLeft: `5px solid ${accentColor}`,
                          }
                          : type === 'deepfocus'
                            ? {
                              top: cardTop,
                              height: cardHeight,
                              backgroundColor: accentSurfaceColor,
                              borderLeft: `5px solid ${accentColor}`,
                            }
                            : {
                              top: cardTop,
                              height: cardHeight,
                              backgroundColor: accentSurfaceColor,
                              borderLeft: `5px solid ${accentColor}`,
                            };

                      // Render overlaps side-by-side using % widths (max 2 columns).
                      const colCount = Math.min(2, Math.max(1, layout.colCount || 1));
                      const col = Math.max(0, layout.col || 0);
                      const widthPct = 100 / colCount;
                      const leftPct = col * widthPct;
                      const overlapStyle = isOverflow
                        ? {
                          // Overflow: full-width, sits on top based on time proximity
                          left: 0,
                          right: 0,
                          marginRight: '0.25rem',
                          opacity: 0.92,
                          zIndex,
                        }
                        : colCount > 1
                          ? {
                            left: `${leftPct}%`,
                            width: `calc(${widthPct}% - 0.5rem)`,
                            marginLeft: col > 0 ? '0.25rem' : 0,
                            marginRight: '0.25rem',
                            zIndex,
                          }
                          : {
                            left: 0,
                            right: 0,
                            marginRight: '0.25rem',
                            zIndex,
                          };

                      return (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={() => { setSelectedEvent(evt); setSelectedTimelineTask(null); }}
                          className={`absolute text-left ${activeEventMenuId === evt.id ? 'overflow-visible' : 'overflow-hidden'} transition-all active:scale-[0.99] font-display antialiased ${type === 'casual'
                              ? 'rounded-xl shadow-[0_1px_8px_rgba(38,50,56,0.08)] hover:shadow-[0_3px_14px_rgba(38,50,56,0.1)]'
                              : type === 'meeting'
                                ? 'rounded-xl shadow-[0_2px_12px_rgba(44,62,80,0.12)] hover:shadow-[0_4px_18px_rgba(44,62,80,0.16)]'
                                : 'rounded-2xl shadow-[0_2px_14px_rgba(13,115,119,0.12)] hover:shadow-[0_4px_20px_rgba(13,115,119,0.16)]'
                            }`}
                          style={{
                            ...eventCardStyle,
                            ...overlapStyle,
                            zIndex: hoveredEventId === evt.id ? 9999 : zIndex,
                          }}
                          onMouseEnter={() => setHoveredEventId(evt.id)}
                          onMouseLeave={() => setHoveredEventId(null)}
                          onDragOver={handleTaskTimelineDragOver}
                          onDrop={handleTaskTimelineDrop}
                          title={evt.title}
                        >
                          {/* Meeting — pastel card: title + meta, avatars bottom-left, menu centered right */}
                          {type === 'meeting' && (
                            <div className={`relative flex h-full w-full flex-col font-display antialiased ${isCompactEventCard ? 'p-2.5' : 'p-4 pt-3 pb-3'}`}>
                              {evt.source === 'Google' && !isCompactEventCard && (
                                <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white text-[#4285F4] border border-[#4285F4]/30 leading-none select-none">
                                  {t('calendar.googleSourceBadge')}
                                </span>
                              )}
                              {!isCompactEventCard && (
                                <div className="absolute right-2 top-1/2 z-[2] -translate-y-1/2">
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveEventMenuId((prev) => (prev === evt.id ? null : evt.id));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveEventMenuId((prev) => (prev === evt.id ? null : evt.id));
                                      }
                                      if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        setActiveEventMenuId(null);
                                      }
                                    }}
                                    className="flex items-center justify-center cursor-pointer rounded-lg p-1.5 text-[#7F8C8D] transition-colors hover:bg-white/80 hover:text-[#2C3E50]"
                                    aria-label={t('common.more')}
                                    title={t('common.more')}
                                  >
                                    <span className="material-symbols-outlined text-[16px] leading-none">more_vert</span>
                                  </span>

                                  {activeEventMenuId === evt.id && (
                                    <div
                                      className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveEventMenuId(null);
                                          openEditModal(evt);
                                        }}
                                      >
                                        <span className="material-symbols-outlined text-[15px]">edit</span>
                                        {t('common.edit')}
                                      </button>
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveEventMenuId(null);
                                          const url = `${window.location.origin}/calendar?date=${formatLocalDateIso(new Date(evt.startDate))}`;
                                          try {
                                            await navigator.clipboard.writeText(url);
                                            toast.success(t('common.copyLinkSuccess'));
                                          } catch {
                                            toast.error(t('common.copyLinkError'));
                                          }
                                        }}
                                      >
                                        <span className="material-symbols-outlined text-[15px]">link</span>
                                        {t('common.copyLink')}
                                      </button>
                                      <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveEventMenuId(null);
                                          if (!window.confirm(`${t('calendar.deleteEvent')}?`)) return;
                                          try {
                                            if (evt.source === 'Google') {
                                              if (!evt.externalId) throw new Error(t('calendar.deleteEventFail'));
                                              await googleEventsAPI.deleteGoogleEvent(evt.externalId);
                                            } else {
                                              await eventsAPI.deleteEvent(evt.id);
                                            }
                                            await loadEvents();
                                          } catch (err) {
                                            toast.error(err?.message || t('calendar.deleteEventFail'));
                                          }
                                        }}
                                      >
                                        <span className="material-symbols-outlined text-[15px]">delete</span>
                                        {t('common.delete')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className={`min-w-0 flex-1 ${isCompactEventCard ? 'pr-0' : 'pr-10'}`}>
                                {isLongEventCard ? (
                                  <h3 className="font-bold text-secondary font-['Manrope']" style={{ color: accentColor }}>
                                    {evt.title}
                                  </h3>
                                ) : (
                                  <p
                                    className="truncate text-xs font-bold leading-snug tracking-tight"
                                    style={{ color: accentColor }}
                                  >
                                    {evt.title}
                                  </p>
                                )}
                                <p
                                  className={`font-normal ${isCompactEventCard ? 'mt-0.5 text-[10px] leading-tight' : 'mt-1 text-[10px] leading-relaxed'}`}
                                  style={{ color: CAL_THEME.meetingMeta }}
                                >
                                  {startLabel}{endLabel ? ` – ${endLabel}` : ''}
                                  {!isCompactEventCard && (
                                    evt.location
                                      ? ` • ${evt.location}`
                                      : evt.description
                                        ? ` • ${String(evt.description).replace(/\s+/g, ' ').trim().slice(0, 40)}${evt.description.length > 40 ? '…' : ''}`
                                        : ''
                                  )}
                                </p>
                              </div>

                              {height > 56 && attendees.length > 0 && (
                                <div className="mt-auto flex shrink-0 items-center pt-3">
                                  <div className="flex items-center -space-x-2">
                                    {attendees.slice(0, 3).map((a) => (
                                      <span
                                        key={a}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-white bg-white text-[11px] font-semibold shadow-sm ring-1 ring-black/[0.06]"
                                        style={{ color: accentColor }}
                                        title={a}
                                      >
                                        {getInitials(a)}
                                      </span>
                                    ))}
                                    {attendees.length > 3 && (
                                      <span
                                        className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full border-[2.5px] border-white px-1.5 text-[11px] font-bold text-white shadow-sm ring-1 ring-black/[0.06]"
                                        style={{ backgroundColor: CAL_THEME.meetingAvatarMoreBg }}
                                        title={t('calendar.attendees')}
                                      >
                                        +{attendees.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Deep focus — light card, teal top+left frame, grey tag pills, teal type */}
                          {type === 'deepfocus' && (
                            <div className={`relative flex h-full w-full flex-col ${isCompactEventCard ? 'p-2.5' : 'p-4 pr-14 pt-3.5'}`}>
                              {evt.source === 'Google' && !isCompactEventCard && (
                                <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white text-[#4285F4] border border-[#4285F4]/30 leading-none select-none">
                                  {t('calendar.googleSourceBadge')}
                                </span>
                              )}
                              {!isCompactEventCard && (
                                <span
                                  className="absolute right-3 top-3 shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm"
                                  style={{ backgroundColor: accentColor }}
                                >
                                  ! {t('calendar.priority')}
                                </span>
                              )}

                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  {isLongEventCard ? (
                                    <h3 className="font-bold text-secondary font-['Manrope']" style={{ color: accentColor }}>
                                      {t('calendar.deepFocusPrefix')}{deepTitle}
                                    </h3>
                                  ) : (
                                    <p
                                      className="truncate text-[13px] font-bold leading-snug tracking-tight sm:text-[14px]"
                                      style={{ color: accentColor }}
                                    >
                                      {t('calendar.deepFocusPrefix')}{deepTitle}
                                    </p>
                                  )}
                                  <p
                                    className={`font-normal truncate ${isCompactEventCard ? 'mt-0.5 text-[10px] leading-tight' : 'mt-1.5 text-[11px] leading-relaxed sm:text-[12px]'}`}
                                    style={{ color: CAL_THEME.deepFocusMeta }}
                                  >
                                    {startLabel}{endLabel ? ` – ${endLabel}` : ''}
                                    {!isCompactEventCard && evt.location ? ` • ${evt.location}` : ''}
                                  </p>
                                </div>
                              </div>

                              {height > 72 && (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {!!evt.dndEnabled && (
                                    <span
                                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm"
                                      style={{
                                        backgroundColor: CAL_THEME.deepFocusTagBg,
                                        color: CAL_THEME.deepFocusTealDark,
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-[15px]" style={{ color: accentColor }}>lock</span>
                                      {t('calendar.doNotDisturb')}
                                    </span>
                                  )}
                                  {projectTags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm"
                                      style={{
                                        backgroundColor: CAL_THEME.deepFocusTagBg,
                                        color: CAL_THEME.deepFocusTealDark,
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-[15px]" style={{ color: accentColor }}>folder_special</span>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {height > 100 && evt.description && (
                                <p
                                  className="mt-3 flex-1 py-1 text-xs italic leading-relaxed line-clamp-3 sm:text-[13px]"
                                  style={{ color: CAL_THEME.deepFocusDesc }}
                                >
                                  {evt.description}
                                </p>
                              )}

                              {height > 88 && (
                                <div className="pointer-events-auto absolute bottom-3 right-3">
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(evt);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openEditModal(evt);
                                      }
                                    }}
                                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: CAL_THEME.deepFocusTeal }}
                                    aria-label={t('common.edit')}
                                    title={t('common.edit')}
                                  >
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Casual — lavender bar, white rounded icon tile, avatar + chevron */}
                          {type === 'casual' && (
                            <div className="relative h-full w-full">
                              {evt.source === 'Google' && !isCompactEventCard && (
                                <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white text-[#4285F4] border border-[#4285F4]/30 leading-none select-none">
                                  {t('calendar.googleSourceBadge')}
                                </span>
                              )}
                              <div className={`flex h-full w-full items-center ${isCompactEventCard ? 'gap-2 px-2.5 py-1.5' : 'gap-3 px-4 py-2.5'}`}>
                                <span
                                  className={`flex shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/[0.04] ${isCompactEventCard ? 'h-8 w-8' : 'h-10 w-10'}`}
                                  style={{ backgroundColor: CAL_THEME.casualIconTile }}
                                >
                                  {evt.icon && /[\u{1F300}-\u{1FAD6}]|[\u2600-\u27BF]/u.test(String(evt.icon)) ? (
                                    <span className={`${isCompactEventCard ? 'text-base' : 'text-xl'} leading-none`}>{evt.icon}</span>
                                  ) : (
                                    <span className={`material-symbols-outlined ${isCompactEventCard ? 'text-[18px]' : 'text-[22px]'}`} style={{ color: CAL_THEME.deepFocusTeal }}>
                                      local_cafe
                                    </span>
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  {isLongEventCard ? (
                                    <h3 className="font-bold text-secondary font-['Manrope']" style={{ color: accentColor }}>
                                      {evt.title}
                                    </h3>
                                  ) : (
                                    <p
                                      className="truncate text-[13px] font-bold leading-snug tracking-tight sm:text-[14px]"
                                      style={{ color: accentColor }}
                                    >
                                      {evt.title}
                                    </p>
                                  )}
                                  <p
                                    className={`font-normal ${isCompactEventCard ? 'mt-0.5 text-[10px] leading-tight' : 'mt-1 text-[11px] leading-relaxed sm:text-[12px]'}`}
                                    style={{ color: CAL_THEME.casualMeta }}
                                  >
                                    {startLabel}{endLabel ? ` – ${endLabel}` : ''}
                                    {!isCompactEventCard && (
                                      evt.location
                                        ? ` • ${evt.location}`
                                        : evt.description
                                          ? ` • ${String(evt.description).replace(/\s+/g, ' ').trim().slice(0, 40)}${evt.description.length > 40 ? '…' : ''}`
                                          : ''
                                    )}
                                  </p>
                                </div>

                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Drag-over drop indicator */}
                    {draggedTask && dragOverHour && (() => {
                      const dropTop = eventTopPx(dragOverHour.hour, dragOverHour.min, workHourStart);
                      return (
                        <div
                          className="absolute left-0 right-0 pointer-events-none z-50"
                          style={{ top: dropTop, height: CALENDAR_HOUR_HEIGHT_PX }}
                        >
                          <div className="mx-1 h-full rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20 flex items-center px-3">
                            <span className="text-xs text-emerald-600 dark:text-emerald-300 font-medium">
                              {String(dragOverHour.hour).padStart(2, '0')}:{String(dragOverHour.min).padStart(2, '0')} – {taskDisplayTitle(draggedTask)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Scheduled task cards */}
                    {tasksForDay.filter((task) => task.startTime).map((task) => {
                      const [sh, sm] = task.startTime.split(':').map(Number);
                      if (sh < workHourStart || sh >= workHourEnd) return null;
                      const top = eventTopPx(sh, sm, workHourStart);
                      let cardHeight = CALENDAR_HOUR_HEIGHT_PX - 8;
                      if (task.endTime) {
                        const [eh, em] = task.endTime.split(':').map(Number);
                        const durMin = (eh * 60 + em) - (sh * 60 + sm);
                        if (durMin > 0) cardHeight = Math.max(36, (durMin / 60) * CALENDAR_HOUR_HEIGHT_PX - 8);
                      }
                      const isCompleted = task.completed || task.isCompleted;
                      const endLabel = task.endTime || '';
                      const isOverdue = !isCompleted && task.endTime && (() => {
                        const [eh, em] = task.endTime.split(':').map(Number);
                        const endMs = new Date(selectedDate).setHours(eh, em, 0, 0);
                        return Date.now() > endMs;
                      })();
                      return (
                        <div
                          key={`task-${task.id}`}
                          className="absolute left-0 right-0 pointer-events-auto cursor-grab active:cursor-grabbing"
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task)}
                          onDragEnd={handleTaskDragEnd}
                          onDragOver={handleTaskTimelineDragOver}
                          onDrop={handleTaskTimelineDrop}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          style={{
                            top: top + 4,
                            height: cardHeight,
                            zIndex: hoveredTaskId === task.id ? 9999 : 20,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTimelineTask((prev) => prev?.id === task.id ? null : task);
                              setSelectedEvent(null);
                            }}
                            className={`w-full h-full rounded-lg px-2.5 py-1.5 text-left shadow-sm border transition-all hover:shadow-md ${
                              isCompleted
                                ? 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 opacity-60'
                                : isOverdue
                                ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                                : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`material-symbols-outlined text-[14px] shrink-0 ${isOverdue ? 'text-red-400' : 'text-emerald-500'}`}>
                                {isOverdue ? 'warning' : 'task_alt'}
                              </span>
                              <span className={`text-xs font-medium truncate ${
                                isCompleted ? 'line-through text-gray-400'
                                : isOverdue ? 'text-red-600 dark:text-red-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {taskDisplayTitle(task)}
                              </span>
                            </div>
                            <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-400 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                              {task.startTime}{endLabel ? ` – ${endLabel}` : ''}
                            </p>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {eventsLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-800/60">
                    <div className="text-sm text-gray-500 dark:text-slate-400">Loading…</div>
                  </div>
                )}
              </div>
            </div>

            {/* M4: Event Detail Drawer */}
            {selectedEvent && (
              <div className="w-80 shrink-0 sticky top-0 self-start flex flex-col bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedEvent.color && (
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: selectedEvent.color }}
                      />
                    )}
                    <span className="text-sm font-semibold text-[#111418] dark:text-slate-100 truncate">
                      {selectedEvent.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="shrink-0 rounded-lg p-1 text-gray-500 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label={t('common.close')}
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="px-4 py-3 flex flex-col gap-3 text-sm">
                  {/* Time range */}
                  <div className="flex items-start gap-2 text-gray-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">schedule</span>
                    <span>
                      {selectedEvent.isAllDay
                        ? t('calendar.allDay')
                        : `${formatLocalTimeHHmm(selectedEvent.startDate) ?? ''} – ${formatLocalTimeHHmm(selectedEvent.endDate) ?? ''}`}
                    </span>
                  </div>

                  {/* Location */}
                  {selectedEvent.location && (
                    <div className="flex items-start gap-2 text-gray-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">location_on</span>
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}

                  {/* Description */}
                  {selectedEvent.description && (
                    <div className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed border-t border-gray-100 dark:border-slate-700 pt-3">
                      {selectedEvent.description}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedEvent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary dark:text-blue-400 hover:bg-primary/10 dark:hover:bg-blue-400/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`${t('calendar.deleteEvent')}?`)) return;
                        try {
                          if (selectedEvent.source === 'Google') {
                            if (!selectedEvent.externalId) throw new Error(t('calendar.deleteEventFail'));
                            await googleEventsAPI.deleteGoogleEvent(selectedEvent.externalId);
                          } else {
                            await eventsAPI.deleteEvent(selectedEvent.id);
                          }
                          setSelectedEvent(null);
                          await loadEvents();
                        } catch (e) {
                          toast.error(e?.message || t('calendar.deleteEventFail'));
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                      {t('calendar.deleteEvent')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* M4b: Timeline Task Detail Drawer */}
            {selectedTimelineTask && (() => {
              const t2 = tasksForDay.find((x) => x.id === selectedTimelineTask.id) || selectedTimelineTask;
              const isCompleted = t2.completed || t2.isCompleted;
              const priority = t2.priority || 0;
              const priorityLabel = priority === 2 ? t('daily.priorityHigh') : priority === 1 ? t('daily.priorityMedium') : t('daily.priorityLow');
              const priorityColor = priority === 2
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                : priority === 1
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';
              const tags = Array.isArray(t2.tags) ? t2.tags : [];
              const isOverdue = !isCompleted && t2.endTime && (() => {
                const [eh, em] = t2.endTime.split(':').map(Number);
                return Date.now() > new Date(selectedDate).setHours(eh, em, 0, 0);
              })();
              return (
                <div className="w-72 shrink-0 sticky top-0 self-start flex flex-col bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  {/* Header */}
                  <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${isOverdue ? 'text-red-400' : isCompleted ? 'text-gray-400' : 'text-emerald-500'}`}>
                        {isCompleted ? 'task_alt' : isOverdue ? 'warning' : 'radio_button_unchecked'}
                      </span>
                      <span className="text-sm font-semibold text-[#111418] dark:text-slate-100 truncate">
                        {taskDisplayTitle(t2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTimelineTask(null)}
                      className="shrink-0 rounded-lg p-1 text-gray-500 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>

                  <div className="px-4 py-3 flex flex-col gap-3 text-sm">
                    {/* Priority */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColor}`}>{priorityLabel}</span>
                      {isOverdue && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">{t('calendar.overdue')}</span>}
                    </div>

                    {/* Time */}
                    {(t2.startTime || t2.endTime) && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                        <span className="material-symbols-outlined text-[16px] shrink-0">schedule</span>
                        <span className="text-xs">{t2.startTime}{t2.endTime ? ` – ${t2.endTime}` : ''}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20 font-medium">{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    {htmlToPlainText(t2.description) && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed border-t border-gray-100 dark:border-slate-700 pt-3 line-clamp-4">
                        {htmlToPlainText(t2.description)}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-slate-700 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleTask(t2);
                          setSelectedTimelineTask((prev) => prev ? { ...prev, completed: !isCompleted, isCompleted: !isCompleted } : null);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isCompleted
                            ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-gray-200'
                            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{isCompleted ? 'undo' : 'check_circle'}</span>
                        {isCompleted ? t('calendar.taskMarkIncomplete') : t('calendar.taskMarkComplete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedTask(t2); setTaskEditModalOpen(true); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t2).then(() => setSelectedTimelineTask(null))}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors ml-auto"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── M5: Bento Bottom ── (hidden on mobile while task strip is open to save space) */}
          <div
            className={`${showTaskStrip ? 'hidden sm:grid' : 'grid'} gap-3 shrink-0 grid-flow-col auto-cols-[minmax(260px,1fr)] overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3`}
          >

            {/* Productivity Peak */}
            <div
              className="rounded-2xl p-4 flex flex-col gap-2 shadow-sm border border-indigo-100/60 dark:border-indigo-900/40"
              style={{ backgroundColor: CAL_THEME.productivityBg }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005EB8] dark:text-blue-300 text-[20px]">bolt</span>
                <span className="text-sm font-semibold text-[#111418] dark:text-slate-100">
                  {t('calendar.productivityPeak')}
                </span>
              </div>
              <p className="text-xs text-[#546E7A] dark:text-slate-300 leading-relaxed">
                {t('calendar.productivityPeakDesc')}
              </p>
            </div>

            {/* Task Completion */}
            <div className="rounded-2xl p-4 flex flex-col gap-2 bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-[#111418] dark:text-slate-100 truncate">
                    {t('calendar.taskCompletion')}
                  </span>
                  {totalTasks > 0 && completedTasks < totalTasks && (
                    <span
                      className="material-symbols-outlined text-[18px] text-red-500 shrink-0"
                      title={t('calendar.taskMarkIncomplete')}
                      aria-label={t('calendar.taskMarkIncomplete')}
                    >
                      checklist
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: CAL_THEME.forest }}>
                  {t('calendar.dailyGoalsMet', { percent: completionPercent })}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%`, backgroundColor: CAL_THEME.forest }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {completedTasks}/{totalTasks} tasks
              </span>
            </div>

            {/* Next reminder — navy hero card */}
            <div
              className="rounded-2xl p-4 flex flex-col gap-3 shadow-md text-white"
              style={{ background: `linear-gradient(145deg, ${CAL_THEME.navy} 0%, ${CAL_THEME.navySoft} 100%)` }}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-sky-200/90">
                {t('calendar.nextReminder')}
              </div>
              {nextEvent ? (
                <>
                  <div>
                    <div className="text-lg font-bold leading-tight truncate">
                      {nextEvent.title}
                    </div>
                    <div className="text-sm text-sky-100/90 mt-1">
                      {t('calendar.startingIn', { minutes: minutesUntilNext })}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-start px-4 py-1.5 rounded-lg text-xs font-semibold border-2 border-white/40 text-white hover:bg-white/10 transition-colors"
                    onClick={() => toast.success(t('calendar.snoozeHint'))}
                  >
                    {t('calendar.snooze')}
                  </button>
                </>
              ) : (
                <p className="text-sm text-sky-100/80">
                  {t('calendar.noUpcomingEvents')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Event Create/Edit Modal ── */}
      {eventModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => { if (!eventFormSubmitting) closeModal(); }}
        >
          <div
            className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalMutationProgressBar active={eventFormSubmitting} label={t('common.saving')} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
              <h2 className="text-base font-semibold text-[#111418] dark:text-slate-100">
                {editingEvent ? t('common.edit') : t('calendar.addEvent')}
              </h2>
              <button
                type="button"
                disabled={eventFormSubmitting}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                aria-label="Close"
                onClick={closeModal}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={handleCalendarEventSubmit}
              aria-busy={eventFormSubmitting}
              className="flex-1 overflow-y-auto flex flex-col"
            >
              <div className={`flex flex-col lg:flex-row flex-1 ${eventFormSubmitting ? 'pointer-events-none opacity-70' : ''}`}>

                {/* ── Left panel ── */}
                <div className="flex-1 p-6 flex flex-col gap-5">

                  {/* Event type selector */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'meeting', icon: 'groups', label: t('calendar.eventTypeMeeting') },
                      { key: 'deepfocus', icon: 'bolt', label: t('calendar.eventTypeDeepFocus') },
                      { key: 'casual', icon: 'local_cafe', label: t('calendar.eventTypeCasualSync') },
                    ].map(({ key, icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEventForm((p) => ({ ...p, eventType: key }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${eventForm.eventType === key
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Title — floating label */}
                  <div className="relative">
                    <input
                      id="evt-title"
                      disabled={eventFormSubmitting}
                      placeholder=" "
                      value={eventForm.title}
                      onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                      className="peer w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-4 pt-6 pb-2 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                    />
                    <label
                      htmlFor="evt-title"
                      className="pointer-events-none absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal"
                    >
                      {t('calendar.titleLabel')}
                    </label>
                  </div>

                  {/* When */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      {t('calendar.when')}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-1 min-w-[120px] items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 px-3 py-3 text-sm text-[#111418] dark:text-slate-100">
                        <span className="material-symbols-outlined text-[16px] text-gray-400 shrink-0">calendar_today</span>
                        <span className="truncate">{eventForm.date || formatLocalDateIso(selectedDate)}</span>
                      </div>
                      <input
                        type="time"
                        disabled={eventFormSubmitting}
                        value={eventForm.startTime}
                        onChange={(e) => setEventForm((p) => ({ ...p, startTime: e.target.value }))}
                        className="w-28 rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-3 py-3 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                      />
                      <span className="text-gray-400">—</span>
                      <input
                        type="time"
                        disabled={eventFormSubmitting}
                        value={eventForm.endTime}
                        onChange={(e) => setEventForm((p) => ({ ...p, endTime: e.target.value }))}
                        className="w-28 rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-3 py-3 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Meeting-specific */}
                  {eventForm.eventType === 'meeting' && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {t('calendar.meetingDetails')}
                      </p>
                      <div className="relative">
                        <input
                          id="evt-location"
                          disabled={eventFormSubmitting}
                          placeholder=" "
                          value={eventForm.location}
                          onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
                          className="peer w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-4 pt-6 pb-2 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                        />
                        <label
                          htmlFor="evt-location"
                          className="pointer-events-none absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal"
                        >
                          {t('calendar.locationOptional')}
                        </label>
                      </div>

                      {/* Attendees (chips + Add Guest) */}
                      <div>
                        <div className="text-sm font-medium text-[#111418] dark:text-slate-100 mb-3">
                          {t('calendar.attendees')}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {(Array.isArray(eventForm.attendees) ? eventForm.attendees : []).map((nameOrEmail) => {
                            const label = String(nameOrEmail || '').trim();
                            if (!label) return null;
                            const initials = label
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase())
                              .join('') || '??';
                            const remove = () => setEventForm((p) => ({
                              ...p,
                              attendees: (Array.isArray(p.attendees) ? p.attendees : []).filter((x) => x !== nameOrEmail),
                            }));
                            return (
                              <span
                                key={label}
                                className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-700 dark:text-slate-200"
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold">
                                  {initials}
                                </span>
                                <span className="max-w-[180px] truncate">{label}</span>
                                <button
                                  type="button"
                                  onClick={remove}
                                  className="ml-1 -mr-1 rounded-full p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-600 transition-colors"
                                  aria-label={`${t('common.remove')}: ${label}`}
                                  title={t('common.remove')}
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </span>
                            );
                          })}

                          {showNewGuestInput ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                disabled={eventFormSubmitting}
                                value={newGuestValue}
                                onChange={(e) => setNewGuestValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddNewGuest();
                                  }
                                }}
                                placeholder={t('calendar.newGuestPlaceholder')}
                                autoFocus
                                className="px-3 py-1.5 text-sm font-medium border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                              />
                              <button
                                type="button"
                                disabled={eventFormSubmitting}
                                onClick={handleAddNewGuest}
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                                aria-label={t('calendar.confirmAddGuest')}
                                title={t('calendar.confirmAddGuest')}
                              >
                                <span className="material-symbols-outlined text-[18px]">check</span>
                              </button>
                              <button
                                type="button"
                                disabled={eventFormSubmitting}
                                onClick={() => {
                                  setShowNewGuestInput(false);
                                  setNewGuestValue('');
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                aria-label={t('common.cancel')}
                                title={t('common.cancel')}
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={eventFormSubmitting}
                              onClick={() => setShowNewGuestInput(true)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                              aria-label={t('calendar.addGuest')}
                              title={t('calendar.addGuest')}
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deep Focus-specific */}
                  {eventForm.eventType === 'deepfocus' && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {t('calendar.focusSettings')}
                      </p>
                      <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[#111418] dark:text-slate-100">{t('calendar.doNotDisturb')}</p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{t('calendar.doNotDisturbDesc')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEventForm((p) => ({ ...p, doNotDisturb: !p.doNotDisturb }))}
                          className={`relative ml-4 h-6 w-10 rounded-full transition-colors shrink-0 ${eventForm.doNotDisturb ? 'bg-primary' : 'bg-gray-200 dark:bg-slate-600'}`}
                          aria-pressed={eventForm.doNotDisturb}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${eventForm.doNotDisturb ? 'left-5' : 'left-1'}`}
                          />
                        </button>
                      </div>

                      {/* Location */}
                      <div className="relative">
                        <input
                          id="evt-location-deepfocus"
                          disabled={eventFormSubmitting}
                          placeholder=" "
                          value={eventForm.location}
                          onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
                          className="peer w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-4 pt-6 pb-2 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                        />
                        <label
                          htmlFor="evt-location-deepfocus"
                          className="pointer-events-none absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal"
                        >
                          {t('calendar.locationOptional')}
                        </label>
                      </div>

                      {/* Project Tags */}
                      <div>
                        <div className="text-sm font-medium text-[#111418] dark:text-slate-100 mb-3">
                          {t('calendar.projectTags')}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {(Array.isArray(eventForm.projectTags) ? eventForm.projectTags : []).map((tag) => {
                            const label = String(tag || '').trim();
                            if (!label) return null;
                            const remove = () => setEventForm((p) => ({
                              ...p,
                              projectTags: (Array.isArray(p.projectTags) ? p.projectTags : []).filter((x) => x !== tag),
                            }));
                            return (
                              <span
                                key={label}
                                className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-700 dark:text-slate-200"
                              >
                                <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                                <span className="max-w-[180px] truncate">{label}</span>
                                <button
                                  type="button"
                                  onClick={remove}
                                  className="ml-1 -mr-1 rounded-full p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-600 transition-colors"
                                  aria-label={`${t('common.remove')}: ${label}`}
                                  title={t('common.remove')}
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </span>
                            );
                          })}

                          {showNewProjectTagInput ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                disabled={eventFormSubmitting}
                                value={newProjectTagValue}
                                onChange={(e) => setNewProjectTagValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddNewProjectTag();
                                  }
                                }}
                                placeholder={t('calendar.newProjectTagPlaceholder')}
                                autoFocus
                                className="px-3 py-1.5 text-sm font-medium border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                              />
                              <button
                                type="button"
                                disabled={eventFormSubmitting}
                                onClick={handleAddNewProjectTag}
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                                aria-label={t('calendar.confirmAddProjectTag')}
                                title={t('calendar.confirmAddProjectTag')}
                              >
                                <span className="material-symbols-outlined text-[18px]">check</span>
                              </button>
                              <button
                                type="button"
                                disabled={eventFormSubmitting}
                                onClick={() => {
                                  setShowNewProjectTagInput(false);
                                  setNewProjectTagValue('');
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                aria-label={t('common.cancel')}
                                title={t('common.cancel')}
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={eventFormSubmitting}
                              onClick={() => setShowNewProjectTagInput(true)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                              aria-label={t('calendar.addProjectTag')}
                              title={t('calendar.addProjectTag')}
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Casual-specific */}
                  {eventForm.eventType === 'casual' && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {t('calendar.vibe')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['☕', '🎵', '🎮', '📚', '🌿', '🍕', '🎨', '🏃'].map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setEventForm((p) => ({ ...p, casualIcon: icon }))}
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${eventForm.casualIcon === icon
                                ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary'
                                : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                              }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input
                          id="evt-location-casual"
                          disabled={eventFormSubmitting}
                          placeholder=" "
                          value={eventForm.location}
                          onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
                          className="peer w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-4 pt-6 pb-2 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                        />
                        <label
                          htmlFor="evt-location-casual"
                          className="pointer-events-none absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal"
                        >
                          {t('calendar.locationOptional')}
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      id="evt-description"
                      rows={3}
                      disabled={eventFormSubmitting}
                      placeholder=" "
                      value={eventForm.description}
                      onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                      className="peer w-full resize-none rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-4 pt-6 pb-3 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                    />
                    <label
                      htmlFor="evt-description"
                      className="pointer-events-none absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal"
                    >
                      {t('calendar.description')}
                    </label>
                  </div>


                  {/* Color picker */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      {t('calendar.colorLabel')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          type="button"
                          disabled={eventFormSubmitting}
                          onClick={() => setEventForm((p) => ({ ...p, color: p.color === color ? '' : color }))}
                          className="size-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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

                {/* ── Right panel: mini calendar + live preview ── */}
                <div className="lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-slate-700 p-4 flex flex-col gap-4">

                  {/* Mini calendar */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setMiniCalDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
                        className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      <span className="text-xs font-semibold text-[#111418] dark:text-slate-100">
                        {t(`calendar.month${miniCalDate.getMonth() + 1}`)} {miniCalDate.getFullYear()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMiniCalDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
                        className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="mb-1 grid grid-cols-7">
                      {(weekStartDay === 'sunday'
                        ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                        : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
                      ).map((d) => (
                        <div key={d} className="py-1 text-center text-[10px] font-semibold text-gray-400 dark:text-slate-500">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {getMonthDays(miniCalDate.getFullYear(), miniCalDate.getMonth(), weekStartDay).map(({ date: d, otherMonth }) => {
                        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const isSelDay = eventForm.date === iso;
                        const isTodayDay = isSameDay(d, new Date());
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => setEventForm((p) => ({ ...p, date: iso }))}
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all ${isSelDay
                                ? 'bg-primary font-bold text-white'
                                : isTodayDay
                                  ? 'border-2 border-primary font-bold text-primary'
                                  : otherMonth
                                    ? 'text-gray-300 dark:text-slate-600'
                                    : 'text-[#111418] hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700'
                              }`}
                          >
                            {d.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Remind me */}
                  <div className="relative">
                    <select
                      id="evt-reminder"
                      disabled={eventFormSubmitting}
                      value={eventForm.reminderMinutes}
                      onChange={(e) => setEventForm((p) => ({ ...p, reminderMinutes: Number(e.target.value) }))}
                      className="peer w-full cursor-pointer appearance-none rounded-xl border border-gray-200 dark:border-slate-600 bg-transparent px-4 pt-6 pb-2 text-sm text-[#111418] dark:text-slate-100 focus:outline-none focus:border-primary disabled:opacity-60"
                    >
                      <option value={15}>{t('calendar.remind15min')}</option>
                      <option value={30}>{t('calendar.remind30min')}</option>
                      <option value={60}>{t('calendar.remind1hour')}</option>
                      <option value={1440}>{t('calendar.remind1day')}</option>
                    </select>
                    <label
                      htmlFor="evt-reminder"
                      className="pointer-events-none absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 transition-all"
                    >
                      {t('calendar.remindMe')}
                    </label>
                  </div>

                  {/* Live preview */}
                  <div className="mt-auto">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      {t('calendar.livePreview')}
                    </p>
                    <div
                      className="rounded-xl p-3 text-white"
                      style={{
                        backgroundColor: eventForm.color || (
                          eventForm.eventType === 'deepfocus' ? '#8b5cf6'
                            : eventForm.eventType === 'casual' ? '#10b981'
                              : '#1380ec'
                        ),
                      }}
                    >
                      <div className="truncate text-sm font-semibold">
                        {eventForm.eventType === 'casual' && eventForm.casualIcon ? `${eventForm.casualIcon} ` : ''}
                        {eventForm.title || t('calendar.titlePlaceholder')}
                      </div>
                      <div className="mt-1 text-xs opacity-80">
                        {eventForm.date || formatLocalDateIso(selectedDate)} • {eventForm.startTime || '09:00'} – {eventForm.endTime || '10:00'}
                      </div>
                      <div className="mt-2">
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                          {eventForm.eventType === 'meeting'
                            ? t('calendar.eventTypeMeeting')
                            : eventForm.eventType === 'deepfocus'
                              ? t('calendar.eventTypeDeepFocus')
                              : t('calendar.eventTypeCasualSync')}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-700">
                <button
                  type="button"
                  disabled={eventFormSubmitting}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={closeModal}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={eventFormSubmitting}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {eventFormSubmitting
                    ? t('common.saving')
                    : (editingEvent ? (t('calendar.update') ?? 'Update') : t('calendar.submitAdd'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={openCreateModal}
        className="sm:hidden fixed bottom-6 right-6 z-40 flex size-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
        aria-label={t('calendar.addEvent')}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Task edit modal */}
      <AddTaskModal
        open={taskEditModalOpen}
        onClose={() => setTaskEditModalOpen(false)}
        onSaved={async () => {
          setTaskEditModalOpen(false);
          setSelectedTask(null);
          await loadTasks();
        }}
        initialTask={selectedTask}
      />
    </div>
  );
};

export default CalendarPage;
