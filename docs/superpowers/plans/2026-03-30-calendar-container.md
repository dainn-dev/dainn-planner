# Calendar Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `CalendarPage.js` as a vertical-timeline calendar UI based on `frontend/task/code.html`, replacing the Google Calendar iframe with native event rendering, an inline event detail drawer, and a Bento insights row.

**Architecture:** Single-file replacement of `CalendarPage.js` — all existing event CRUD logic (form state, submit handler, delete) is preserved; only the render layer changes. No new component files are created. State stays local (`useState`/`useEffect`).

**Tech Stack:** React 18, Tailwind CSS v3.4, i18next, `eventsAPI` + `tasksAPI` from `src/services/api.js`, `formatLocalDateIso` / `formatLocalTimeHHmm` / `formatTime` from `src/utils/dateFormat.js`.

**Spec:** `docs/superpowers/specs/2026-03-30-calendar-container-design.md`

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/pages/CalendarPage.js` | **Rewrite** | Full render rebuild; keep event CRUD logic |
| `src/locales/vi.json` | **Modify** | Add 7 new `calendar.*` keys |
| `src/locales/en.json` | **Modify** | Add 7 new `calendar.*` keys |

---

## Task 1 — Add i18n keys

**Files:**
- Modify: `src/locales/vi.json` (after `"update": "Cập nhật"` line, inside `"calendar": {}`)
- Modify: `src/locales/en.json` (after `"update": "Update"` line, inside `"calendar": {}`)

- [ ] **Step 1: Add keys to `vi.json`**

In `src/locales/vi.json`, inside the `"calendar"` object, after `"update": "Cập nhật"`:

```json
    "productivityPeak": "Năng suất cao nhất",
    "productivityPeakDesc": "Khung giờ hiệu quả nhất của bạn là 09–11 giờ sáng.",
    "taskCompletion": "Hoàn thành nhiệm vụ",
    "dailyGoalsMet": "{{percent}}% mục tiêu hôm nay",
    "nextEvent": "Sự kiện tiếp theo",
    "noUpcomingEvents": "Không có sự kiện sắp tới",
    "startingIn": "Bắt đầu sau {{minutes}} phút"
```

- [ ] **Step 2: Add keys to `en.json`**

In `src/locales/en.json`, inside the `"calendar"` object, after `"update": "Update"`:

```json
    "productivityPeak": "Productivity Peak",
    "productivityPeakDesc": "Your most active window is between 09 AM and 11 AM.",
    "taskCompletion": "Task Completion",
    "dailyGoalsMet": "{{percent}}% of daily goals met",
    "nextEvent": "Next Event",
    "noUpcomingEvents": "No upcoming events",
    "startingIn": "Starting in {{minutes}} minutes"
```

- [ ] **Step 3: Commit**

```bash
git add src/locales/vi.json src/locales/en.json
git commit -m "feat(calendar): add i18n keys for calendar container rebuild"
```

---

## Task 2 — Scaffold new CalendarPage (remove old, add skeleton)

**Files:**
- Modify: `src/pages/CalendarPage.js`

This task strips all Google Calendar infrastructure and replaces the render with a structural skeleton. Event CRUD logic is preserved untouched.

- [ ] **Step 1: Replace imports at top of file**

Replace the entire import block (lines 1–11) with:

```js
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import ModalMutationProgressBar from '../components/ModalMutationProgressBar';
import { eventsAPI, notificationsAPI, tasksAPI, USER_SETTINGS_STORAGE_KEY } from '../services/api';
import { toast } from '../utils/toast';
import { formatLocalDateIso, formatLocalTimeHHmm, formatTime } from '../utils/dateFormat';
```

- [ ] **Step 2: Remove all Google helper functions**

Delete these functions entirely (they are between the imports and `const CalendarPage`):
- `toGoogleDate8`
- `startOfWeek`
- `computeGoogleDatesParam`
- `buildGoogleCalendarEmbedUrl`

Replace them with the two helpers needed for the new layout:

```js
const HOUR_HEIGHT = 64; // px per hour in timeline
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;

/** Returns Mon–Sun (or Sun–Sat) of the week containing `date`. */
function getWeekDays(date, weekStartDay) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun…6=Sat
  const delta = weekStartDay === 'sunday' ? -dow : -((dow + 6) % 7);
  const monday = new Date(d);
  monday.setDate(d.getDate() + delta);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

/** Top offset (px) for an event starting at `date` in the timeline grid. */
function eventTopPx(date) {
  const d = new Date(date);
  const h = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, (h - GRID_START_HOUR) * HOUR_HEIGHT);
}

/** Height (px) for an event from `startDate` to `endDate`. Min 32px. */
function eventHeightPx(startDate, endDate) {
  const diffMs = new Date(endDate) - new Date(startDate);
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(32, diffHours * HOUR_HEIGHT);
}

/** True if two dates are the same local calendar day. */
function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}
```

- [ ] **Step 3: Replace state block inside `CalendarPage`**

Remove all state declarations from `const CalendarPage = () => {` down to (and including) `const eventRange = useMemo(...)` and the `loadEvents` + `useEffect` blocks. Replace with:

```js
const CalendarPage = () => {
  const { t, i18n } = useTranslation();

  const [weekStartDay] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      const v = stored?.weekStartDay;
      return (v === 'sunday' || v === 'monday') ? v : 'monday';
    } catch { return 'monday'; }
  });

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [tasksForDay, setTasksForDay] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Event modal state (preserved from original)
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventFormSubmitting, setEventFormSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
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
  });

  const weekDays = useMemo(
    () => getWeekDays(currentDate, weekStartDay),
    [currentDate, weekStartDay]
  );

  const selectedDateIso = useMemo(() => formatLocalDateIso(selectedDate), [selectedDate]);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await eventsAPI.getEvents({ startDate: selectedDateIso, endDate: selectedDateIso });
      const list = res?.data ?? res?.items ?? res ?? [];
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [selectedDateIso]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tasksAPI.getTasks({ date: selectedDateIso })
      .then((res) => {
        const list = res?.data ?? res?.items ?? res ?? [];
        setTasksForDay(Array.isArray(list) ? list : []);
      })
      .catch(() => setTasksForDay([]));
  }, [selectedDateIso]);

  useEffect(() => {
    notificationsAPI.getNotifications({ limit: 20 })
      .then((data) => setNotifications(Array.isArray(data) ? data : (data?.notifications ?? [])))
      .catch(() => {});
  }, []);
```

- [ ] **Step 4: Keep existing form helpers and handlers unchanged**

The following functions must remain exactly as they are in the current file. Do not touch them:
- `toDatetimeLocalValueFromIso`
- `toDateInputValueFromUtcIso`
- `utcDateInputToIso`
- `openCreateModal`
- `openEditModal`
- `closeModal`
- `handleCalendarEventSubmit`

Only change in `openCreateModal`: remove the `embedReloadKey` line and `googleEventsAPI` reference from `handleCalendarEventSubmit`. Specifically, in `handleCalendarEventSubmit`:
- Remove `setEmbedReloadKey((k) => k + 1);`
- Remove the `isGoogle` / `googleEventsAPI.updateGoogleEvent` branch — always call `eventsAPI.updateEvent(editingEvent.id, payload)`

- [ ] **Step 5: Replace the return/JSX with a skeleton**

Replace everything from `return (` to the end of the file with:

```jsx
  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display min-h-screen flex flex-row overflow-hidden">
      <Sidebar />
      <MobileSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={t('calendar.title')}
          icon="calendar_month"
          actionButton={{ text: t('calendar.addEvent'), icon: 'add', onClick: openCreateModal }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {/* TASK 3: Calendar Header */}
          <div>CALENDAR HEADER PLACEHOLDER</div>

          {/* TASK 3: Day Selector */}
          <div>DAY SELECTOR PLACEHOLDER</div>

          {/* TASK 4: Timeline + Drawer */}
          <div>TIMELINE PLACEHOLDER</div>

          {/* TASK 5: Bento */}
          <div>BENTO PLACEHOLDER</div>
        </div>
      </div>

      {/* Event Modal — unchanged, added in Task 4 */}
    </div>
  );
};

export default CalendarPage;
```

- [ ] **Step 6: Verify compile**

```bash
cd frontend && pnpm dev
```

Expected: dev server starts, no compile errors. The page renders with placeholder text.

- [ ] **Step 7: Commit**

```bash
git add src/pages/CalendarPage.js
git commit -m "feat(calendar): scaffold new CalendarPage — remove Google embed, add state + helpers"
```

---

## Task 3 — Calendar Header + Day Selector

**Files:**
- Modify: `src/pages/CalendarPage.js`

- [ ] **Step 1: Replace Calendar Header placeholder**

Replace `{/* TASK 3: Calendar Header */}<div>CALENDAR HEADER PLACEHOLDER</div>` with:

```jsx
          {/* Calendar Header */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-['Manrope'] text-3xl sm:text-4xl font-extrabold text-on-surface dark:text-white tracking-tighter">
                {selectedDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">
                {eventsLoading
                  ? t('common.loading')
                  : t('calendar.nEvents', { count: events.length })}
              </p>
            </div>
            <div className="flex items-center bg-[#f2f4f7] dark:bg-slate-800 rounded-full p-1.5 space-x-1 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                  setSelectedDate(d);
                }}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all text-primary"
                aria-label={t('calendar.prevWeek')}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => { const now = new Date(); setCurrentDate(now); setSelectedDate(now); }}
                className="px-4 py-1.5 bg-white dark:bg-slate-700 text-primary dark:text-blue-300 font-bold rounded-full text-sm shadow-sm"
              >
                {t('calendar.today')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                  setSelectedDate(d);
                }}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all text-primary"
                aria-label={t('calendar.nextWeek')}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
```

- [ ] **Step 2: Replace Day Selector placeholder**

Replace `{/* TASK 3: Day Selector */}<div>DAY SELECTOR PLACEHOLDER</div>` with:

```jsx
          {/* Day Selector */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const shortKeys = ['shortSun','shortMon','shortTue','shortWed','shortThu','shortFri','shortSat'];
              const label = t(`calendar.${shortKeys[day.getDay()]}`);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(new Date(day))}
                  className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all cursor-pointer space-y-1 ${
                    isSelected
                      ? 'bg-primary text-white shadow-xl shadow-primary/20 ring-4 ring-primary/10 scale-105 z-10'
                      : 'bg-[#f2f4f7] dark:bg-slate-800 hover:bg-[#e8eaed] dark:hover:bg-slate-700 hover:scale-[1.02]'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {label}
                  </span>
                  <span className={`text-xl font-extrabold font-['Manrope'] ${isSelected ? '' : 'text-[#191c1e] dark:text-white'}`}>
                    {day.getDate()}
                  </span>
                  {isToday && (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                  )}
                </button>
              );
            })}
          </div>
```

- [ ] **Step 3: Verify in browser**

```bash
cd frontend && pnpm dev
```

Expected: Calendar header shows current month/year with nav buttons. Day selector shows 7 days, today is dotted, selected day is highlighted blue.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CalendarPage.js
git commit -m "feat(calendar): add calendar header navigation and 7-day selector"
```

---

## Task 4 — Timeline Grid + Event Detail Drawer + Event Modal

**Files:**
- Modify: `src/pages/CalendarPage.js`

- [ ] **Step 1: Add color palette helper (after the `isSameDay` helper from Task 2)**

```js
const EVENT_COLOR_PALETTE = ['#1380ec','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#ef4444'];

function getEventColor(evt, index) {
  if (evt?.color) return evt.color;
  return EVENT_COLOR_PALETTE[index % EVENT_COLOR_PALETTE.length];
}
```

- [ ] **Step 2: Add `currentTimeTopPx` computed value (inside CalendarPage, after `selectedDateIso`)**

```js
  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNowTick(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentTimeTopPx = useMemo(() => {
    if (!isSameDay(selectedDate, nowTick)) return null;
    const h = nowTick.getHours() + nowTick.getMinutes() / 60;
    if (h < GRID_START_HOUR || h > GRID_END_HOUR) return null;
    return (h - GRID_START_HOUR) * HOUR_HEIGHT;
  }, [selectedDate, nowTick]);
```

- [ ] **Step 3: Split events into timed vs all-day (inside CalendarPage, after `loadEvents` useEffect)**

```js
  const timedEvents = useMemo(
    () => events.filter((e) => !e.isAllDay),
    [events]
  );
  const allDayEvents = useMemo(
    () => events.filter((e) => !!e.isAllDay),
    [events]
  );
```

- [ ] **Step 4: Replace Timeline placeholder**

Replace `{/* TASK 4: Timeline + Drawer */}<div>TIMELINE PLACEHOLDER</div>` with:

```jsx
          {/* Timeline + Detail Drawer */}
          <div className="flex gap-4">
            {/* Timeline Grid */}
            <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-3xl p-6 shadow-sm overflow-hidden">

              {/* All-day strip */}
              {allDayEvents.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                  {allDayEvents.map((evt, i) => {
                    const color = getEventColor(evt, i);
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => setSelectedEvent(evt)}
                        className="px-3 py-1 rounded-full text-xs font-bold text-white transition-transform hover:scale-105"
                        style={{ backgroundColor: color }}
                      >
                        {evt.title}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Timed grid */}
              <div className="relative" style={{ height: `${(GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT}px` }}>
                {/* Hour lines */}
                {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800 flex"
                    style={{ top: `${i * HOUR_HEIGHT}px` }}
                  >
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-16 -mt-2.5 pr-3 text-right shrink-0">
                      {String(GRID_START_HOUR + i).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}

                {/* Current time indicator */}
                {currentTimeTopPx !== null && (
                  <div
                    className="absolute left-16 right-0 flex items-center z-20 pointer-events-none"
                    style={{ top: `${currentTimeTopPx}px` }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                )}

                {/* Event cards */}
                <div className="absolute left-16 right-0 top-0 bottom-0">
                  {eventsLoading && (
                    <div className="flex items-center justify-center h-full text-sm text-slate-400">
                      {t('common.loading')}
                    </div>
                  )}
                  {!eventsLoading && timedEvents.length === 0 && (
                    <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-slate-500">
                      {t('calendar.noEvents')}
                    </div>
                  )}
                  {timedEvents.map((evt, i) => {
                    const color = getEventColor(evt, i);
                    const top = eventTopPx(evt.startDate);
                    const height = eventHeightPx(evt.startDate, evt.endDate);
                    const isActive = selectedEvent?.id === evt.id;
                    const startText = formatLocalTimeHHmm(evt.startDate) ?? '';
                    const endText = formatLocalTimeHHmm(evt.endDate) ?? '';
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => setSelectedEvent(isActive ? null : evt)}
                        className="absolute left-2 right-2 rounded-2xl p-3 text-left overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 border-l-4"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: `${color}18`,
                          borderLeftColor: color,
                          boxShadow: isActive ? `0 0 0 2px ${color}` : undefined,
                        }}
                      >
                        <p className="font-bold text-sm font-['Manrope'] truncate" style={{ color }}>
                          {evt.title}
                        </p>
                        {height > 40 && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: `${color}cc` }}>
                            {startText}{endText ? ` - ${endText}` : ''}
                            {evt.location ? ` • ${evt.location}` : ''}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Event Detail Drawer */}
            {selectedEvent && (
              <div className="w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 flex flex-col gap-4 shadow-sm self-start sticky top-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base font-['Manrope'] text-[#191c1e] dark:text-white leading-tight">
                    {selectedEvent.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label={t('common.close')}
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>
                    {selectedEvent.isAllDay
                      ? t('calendar.allDay')
                      : `${formatLocalTimeHHmm(selectedEvent.startDate) ?? ''} – ${formatLocalTimeHHmm(selectedEvent.endDate) ?? ''}`}
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
                      {selectedEvent.location}
                    </div>
                  )}
                  {selectedEvent.description && (
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400 mt-0.5">notes</span>
                      <p className="line-clamp-4">{selectedEvent.description}</p>
                    </div>
                  )}
                  {selectedEvent.color && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">palette</span>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    disabled={eventFormSubmitting}
                    onClick={() => openEditModal(selectedEvent)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    disabled={eventFormSubmitting}
                    onClick={async () => {
                      if (!window.confirm(`${t('calendar.deleteEvent')}?`)) return;
                      try {
                        await eventsAPI.deleteEvent(selectedEvent.id);
                        setSelectedEvent(null);
                        await loadEvents();
                      } catch (e) {
                        toast.error(e?.message || 'Failed to delete event');
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
```

- [ ] **Step 5: Add Event Modal (after the closing `</div>` of `.flex-1.overflow-y-auto`, before closing `</div>` of the outer wrapper)**

Paste the existing event modal JSX from the current `CalendarPage.js` (the `{eventModalOpen && <div ...>` block). This block is preserved exactly — no changes needed inside it, except ensure `googleEventsAPI` reference is removed (already done in Task 2 Step 4).

- [ ] **Step 6: Verify in browser**

```bash
cd frontend && pnpm dev
```

Expected:
- Timeline shows hour lines 08:00–20:00
- Events for `selectedDate` appear as color cards positioned by time
- Clicking an event opens the detail drawer on the right
- All-day events appear in the strip above
- Red current-time line appears if today is selected
- Edit/Delete in drawer work (form modal opens, delete triggers confirm)

- [ ] **Step 7: Commit**

```bash
git add src/pages/CalendarPage.js
git commit -m "feat(calendar): add timeline grid, event cards, and detail drawer"
```

---

## Task 5 — Bento Bottom Section

**Files:**
- Modify: `src/pages/CalendarPage.js`

- [ ] **Step 1: Add `nextEvent` computed value (inside CalendarPage, after `allDayEvents` useMemo)**

```js
  const nextEvent = useMemo(() => {
    const now = nowTick.getTime();
    return timedEvents
      .filter((e) => new Date(e.startDate).getTime() > now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] ?? null;
  }, [timedEvents, nowTick]);

  const nextEventMinutes = useMemo(() => {
    if (!nextEvent) return null;
    const diff = new Date(nextEvent.startDate).getTime() - nowTick.getTime();
    return Math.max(0, Math.round(diff / 60_000));
  }, [nextEvent, nowTick]);

  const taskCompletionPercent = useMemo(() => {
    if (tasksForDay.length === 0) return 0;
    const done = tasksForDay.filter((t) => t.isCompleted ?? t.completed).length;
    return Math.round((done / tasksForDay.length) * 100);
  }, [tasksForDay]);
```

- [ ] **Step 2: Replace Bento placeholder**

Replace `{/* TASK 5: Bento */}<div>BENTO PLACEHOLDER</div>` with:

```jsx
          {/* Bento Bottom */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8">
            {/* Productivity Peak */}
            <div className="bg-[#e0eafc] dark:bg-blue-950/40 p-6 rounded-3xl flex flex-col justify-between min-h-[140px]">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <div>
                <h4 className="font-bold text-primary font-['Manrope']">{t('calendar.productivityPeak')}</h4>
                <p className="text-xs text-primary/70 dark:text-blue-300/70 mt-1">{t('calendar.productivityPeakDesc')}</p>
              </div>
            </div>

            {/* Task Completion */}
            <div className="bg-[#f2f4f7] dark:bg-slate-800/60 p-6 rounded-3xl flex items-center space-x-4 min-h-[140px]">
              <div className="flex-1">
                <h4 className="font-bold text-[#191c1e] dark:text-white font-['Manrope']">{t('calendar.taskCompletion')}</h4>
                <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${taskCompletionPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                  {t('calendar.dailyGoalsMet', { percent: taskCompletionPercent })}
                </p>
              </div>
            </div>

            {/* Next Event */}
            <div className="bg-primary text-white p-6 rounded-3xl flex flex-col justify-center items-center text-center space-y-2 min-h-[140px] shadow-xl shadow-primary/10">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t('calendar.nextEvent')}</p>
              {nextEvent ? (
                <>
                  <h4 className="font-extrabold text-base font-['Manrope'] leading-tight">{nextEvent.title}</h4>
                  <p className="text-xs opacity-80 italic">
                    {t('calendar.startingIn', { minutes: nextEventMinutes })}
                  </p>
                </>
              ) : (
                <p className="text-sm opacity-70 italic">{t('calendar.noUpcomingEvents')}</p>
              )}
            </div>
          </div>
```

- [ ] **Step 3: Final compile + dark mode check**

```bash
cd frontend && pnpm dev
```

Expected:
- Bento row renders with 3 cards
- Task Completion % updates based on `tasksForDay`
- Next Event shows correct title + countdown (or empty state)
- Toggle dark mode (via DevTools `document.documentElement.classList.toggle('dark')`) — all new elements render correctly in both modes

- [ ] **Step 4: Check both locales**

In the app, switch language to English (via Settings or `localStorage.setItem('app_lang','en')` + refresh). Verify all new i18n keys display in English. Switch back to Vietnamese. Verify all keys display in Vietnamese.

- [ ] **Step 5: Final commit**

```bash
git add src/pages/CalendarPage.js
git commit -m "feat(calendar): add bento insights row — task completion, next event, productivity peak"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Layout (§3): Tasks 2–5 cover all sections ✓
  - State (§4): Task 2 Step 3 ✓
  - Data loading (§5): Task 2 Step 3 ✓
  - Calendar Header (§6): Task 3 Step 1 ✓
  - Day Selector (§7): Task 3 Step 2 ✓
  - Timeline Grid + positioning formula (§8): Task 4 Steps 1–4 ✓
  - Event Detail Drawer (§9): Task 4 Step 4 ✓
  - Bento Bottom (§10): Task 5 Steps 1–2 ✓
  - Create/Edit Modal (§11): Task 4 Step 5 ✓
  - i18n keys (§12): Task 1 ✓
  - Dark mode (§13): covered in every task's Tailwind classes ✓
  - Removed features (§14): Task 2 Steps 1–4 ✓

- [x] **Placeholders:** None. Every step has concrete code.

- [x] **Type consistency:**
  - `getEventColor(evt, index)` defined in Task 4 Step 1, used in Task 4 Step 4 ✓
  - `eventTopPx(date)` / `eventHeightPx(start, end)` defined in Task 2 Step 2, used in Task 4 Step 4 ✓
  - `isSameDay(a, b)` defined in Task 2 Step 2, used in Task 3 Step 2 + Task 4 Step 2 ✓
  - `GRID_START_HOUR` / `GRID_END_HOUR` / `HOUR_HEIGHT` defined in Task 2 Step 2, used in Task 4 Steps 2+4 ✓
  - `timedEvents` / `allDayEvents` defined in Task 4 Step 3, used in Task 4 Step 4 + Task 5 Step 1 ✓
  - `nowTick` defined in Task 4 Step 2, used in Task 5 Step 1 ✓
  - `nextEvent` / `nextEventMinutes` / `taskCompletionPercent` defined in Task 5 Step 1, used in Task 5 Step 2 ✓
