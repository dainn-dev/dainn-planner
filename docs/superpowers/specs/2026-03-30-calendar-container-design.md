# Calendar Container Rebuild — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** `frontend/src/pages/CalendarPage.js` — full rebuild
**Reference design:** `frontend/task/code.html` (Calendar Container section)
**Approach:** Single-file rebuild (Option A)

---

## 1. Goal

Replace the current `CalendarPage.js` (Google Calendar iframe + collapsible events panel) with a fully custom vertical-timeline calendar UI based on `code.html`. All event CRUD logic is preserved; only the render layer is replaced.

---

## 2. What Is Removed

| Removed | Reason |
|---|---|
| Google Calendar embed (`<iframe>`) | User chose Option 1: drop embed entirely |
| `eventsOpen` toggle button in Header | No longer needed |
| `googleCalendarSrcId`, `embedReloadKey` state | Embed gone |
| `integrationsAPI.getGoogleCalendarEmbedSrc()` call | Embed gone |
| `VIEW_DAY / VIEW_WEEK / VIEW_MONTH` constants | Replaced by single day-focus model |
| `buildGoogleCalendarEmbedUrl`, `computeGoogleDatesParam`, `toGoogleDate8` helpers | Embed gone |

---

## 3. Layout

```
CalendarPage
├── <Sidebar />
├── <Header /> (title="calendar.title", no extraButtons)
└── <main> flex-col, overflow-y-auto
    ├── Calendar Header     ← Month/Year + Prev / Today / Next
    ├── Day Selector        ← 5-day horizontal strip (Mon–Fri of currentDate's week)
    ├── All-Day Strip       ← horizontal list of all-day events for selectedDate
    ├── Timeline Grid       ← 08:00–20:00 vertical, events positioned absolutely
    ├── Event Detail Drawer ← inline right panel, shown when selectedEvent != null
    └── Bento Bottom        ← 3 insight cards
```

---

## 4. State

```js
const [currentDate, setCurrentDate] = useState(() => new Date())
// selectedDate = the day shown in the timeline (defaults to currentDate)
const [selectedDate, setSelectedDate] = useState(() => new Date())

const [events, setEvents] = useState([])
const [eventsLoading, setEventsLoading] = useState(false)
const [tasksForDay, setTasksForDay] = useState([])

const [selectedEvent, setSelectedEvent] = useState(null)  // for detail drawer

// Modal state (unchanged from current implementation)
const [eventModalOpen, setEventModalOpen] = useState(false)
const [eventFormSubmitting, setEventFormSubmitting] = useState(false)
const [editingEvent, setEditingEvent] = useState(null)
const [eventForm, setEventForm] = useState({ ... })  // same shape as current

const [sidebarOpen, setSidebarOpen] = useState(false)
const [notifications, setNotifications] = useState([])
```

---

## 5. Data Loading

### Events
```
eventsAPI.getEvents({ startDate: selectedDateIso, endDate: selectedDateIso })
```
Re-fetches whenever `selectedDate` changes.

### Tasks (Bento — Task Completion card)
```
tasksAPI.getTasks({ date: selectedDateIso })
```
Re-fetches whenever `selectedDate` changes. Used only for `% completed` in Bento.

---

## 6. Calendar Header

```
← [Prev]   October 2024   [Next] →     [Today]
```

- Prev/Next: `setCurrentDate` and `setSelectedDate` by ±1 week (moves the day strip)
- Today: resets both to `new Date()`
- Title: formatted as `"MMMM YYYY"` using `toLocaleDateString`

---

## 7. Day Selector

Horizontal strip showing **Mon–Fri** of `currentDate`'s ISO week (respects `weekStartDay` from `localStorage`).

Each day pill:
- Shows short weekday label + date number
- `selectedDate` day is highlighted with `bg-primary text-white shadow-xl`
- Clicking a day → `setSelectedDate(day)`
- Today's date gets a dot indicator

---

## 8. Timeline Grid

**Hours rendered:** 08:00–20:00 (12 slots × 64px = 768px total height).

### Event Positioning
```js
const HOUR_HEIGHT = 64 // px per hour
const GRID_START_HOUR = 8

top    = (startHour - GRID_START_HOUR) * HOUR_HEIGHT + (startMin / 60) * HOUR_HEIGHT
height = Math.max(32, (durationMinutes / 60) * HOUR_HEIGHT)
```

Events are `position: absolute` inside a `position: relative` container.

### Event Card Styles
Color is derived from `evt.color` field, with a fallback palette:
```js
const COLOR_PALETTE = ['#1380ec','#10b981','#f59e0b','#8b5cf6','#ec4899']
// index = evt.id % COLOR_PALETTE.length if evt.color is empty
```

Each card shows: title, time range, location (if set). Click → `setSelectedEvent(evt)`.

### Current Time Indicator
A red horizontal line at the current time (only shown if `selectedDate` is today and current time is within 08:00–20:00).

---

## 9. Event Detail Drawer

Shown inline to the right of the timeline when `selectedEvent !== null`. Width: `w-80` (320px). Does **not** use a modal overlay.

Contents:
- Event title (large)
- Time range / all-day label
- Location (if set)
- Description (if set)
- Color swatch
- **Edit** button → `openEditModal(selectedEvent)`
- **Delete** button → confirm + `eventsAPI.deleteEvent` (same logic as current)
- **Close (×)** → `setSelectedEvent(null)`

Closes automatically when a new event is selected.

---

## 10. Bento Bottom Section

Three cards in a `grid-cols-3` row below the timeline.

| Card | Content | Data |
|---|---|---|
| **Productivity Peak** | Icon + "Your most active window is 09–11 AM" | Hardcoded (static copy) |
| **Task Completion** | Progress bar + `X% of daily goals met` | `tasksForDay`: `completed / total * 100` |
| **Next Event** | Title + "Starting in N minutes" | Next upcoming event in `events` after `Date.now()` |

If no tasks loaded → Task Completion shows `0%`.
If no upcoming event → Next Event card shows `t('calendar.noUpcomingEvents')`.

---

## 11. Create/Edit Modal

**Unchanged** from current implementation:
- Same form fields (title, all-day toggle, start/end datetime, description, location, color picker)
- Same `handleCalendarEventSubmit` logic
- Same `ModalMutationProgressBar`
- Opened from: FAB button (bottom-right) + Edit button in detail drawer

---

## 12. i18n Keys to Add

All new keys go into both `vi.json` and `en.json`:

```
calendar.title              → "Lịch" / "Calendar"
calendar.todayButton        → "Hôm nay" / "Today"
calendar.noUpcomingEvents   → "Không có sự kiện sắp tới" / "No upcoming events"
calendar.productivityPeak   → "Năng suất cao nhất" / "Productivity Peak"
calendar.taskCompletion     → "Hoàn thành nhiệm vụ" / "Task Completion"
calendar.nextEvent          → "Sự kiện tiếp theo" / "Next Event"
calendar.dailyGoalsMet      → "{{percent}}% mục tiêu hôm nay" / "{{percent}}% of daily goals met"
calendar.startingIn         → "Bắt đầu sau {{minutes}} phút" / "Starting in {{minutes}} minutes"
calendar.allDay             → (existing key, keep)
calendar.addEvent           → (existing key, keep)
```

---

## 13. Dark Mode

All new elements use `dark:` Tailwind variants:
- Timeline background: `bg-white dark:bg-slate-900`
- Hour labels: `text-slate-400 dark:text-slate-500`
- Event cards: derive from color, add `dark:border-slate-700` where applicable
- Drawer: `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700`
- Bento cards: follow existing card pattern in app

---

## 14. Linear Milestones & Task Breakdown

### Milestone 1 — Remove old code & scaffold new layout
- [ ] Delete Google Calendar embed, related state, and helper functions
- [ ] Scaffold new layout: `<main>` with Calendar Header, Day Selector placeholder, Timeline placeholder, Bento placeholder
- [ ] Add `currentDate` / `selectedDate` state with Prev/Today/Next navigation
- [ ] Verify app compiles with no errors

### Milestone 2 — Day Selector + data loading
- [ ] Implement `getWeekDays(currentDate, weekStartDay)` helper
- [ ] Render Day Selector strip with active-day highlight
- [ ] Wire `eventsAPI.getEvents` to `selectedDate`
- [ ] Wire `tasksAPI.getTasks` to `selectedDate` for Bento

### Milestone 3 — Timeline Grid
- [ ] Render 08:00–20:00 hour slots
- [ ] Position events absolutely using `top`/`height` formula
- [ ] Style event cards with color palette
- [ ] Add current-time indicator (today only)
- [ ] Handle all-day events in strip above timeline

### Milestone 4 — Event Detail Drawer
- [ ] Build inline drawer component inside CalendarPage
- [ ] Wire click on event card → `setSelectedEvent`
- [ ] Edit / Delete buttons in drawer
- [ ] Auto-close on new event select or X

### Milestone 5 — Bento Bottom + i18n + dark mode
- [ ] Render 3 Bento cards
- [ ] Task Completion % from `tasksForDay`
- [ ] Next Event countdown
- [ ] Add all i18n keys to `vi.json` and `en.json`
- [ ] Verify all `dark:` variants render correctly
- [ ] Final compile check (`pnpm dev`)
