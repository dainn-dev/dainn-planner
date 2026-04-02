# Calendar Week Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load all events for the full current week in one API call instead of per-selected-day, so the week event count is accurate and day-selector dots can reflect real data.

**Architecture:** Single file change — `frontend/src/pages/CalendarPage.js`. `loadEvents()` is widened to fetch `weekDays[0]..weekDays[6]`. A new `weekStartIso` derived value drives its `useEffect`. `timedEvents` and `allDayEvents` filter by `selectedDate` so the timeline only shows the selected day. Day-selector buttons get a dot when their day has events (replacing the today-only dot logic).

**Tech Stack:** React 18, i18next (vi/en), `eventsAPI` from `src/services/api.js`

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/pages/CalendarPage.js` | Widen `loadEvents()`, split useEffect, filter `timedEvents`/`allDayEvents` by date, add per-day dot to day selector |

---

## Task 1: Widen loadEvents to fetch the full week

**Files:**
- Modify: `frontend/src/pages/CalendarPage.js`

**Context:**

Current `loadEvents` (around line 384):
```js
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
```

Current `useEffect` that fires it (around line 414):
```js
useEffect(() => {
  loadEvents();
  loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDateIso]);
```

`weekDays` is a derived value (around line 732):
```js
const weekDays = getWeekDays(currentDate, weekStartDay);
```

`formatLocalDateIso` is already imported from `../utils/dateFormat`.

`isSameDay(a, b)` is a helper function defined in the file (around line 185).

`timedEvents` and `allDayEvents` derivations (around line 733):
```js
const timedEvents = events.filter((e) => !e.isAllDay);
const allDayEvents = events.filter((e) => e.isAllDay);
```

- [ ] **Step 1: Add `weekStartIso` derived value**

Find the line:
```js
const selectedDateIso = formatLocalDateIso(selectedDate);
```

Add directly after it:
```js
const weekStartIso = weekDays.length > 0 ? formatLocalDateIso(weekDays[0]) : selectedDateIso;
const weekEndIso = weekDays.length > 0 ? formatLocalDateIso(weekDays[6]) : selectedDateIso;
```

- [ ] **Step 2: Widen `loadEvents()` to fetch the full week**

Replace the current `loadEvents` function body with:
```js
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
```

- [ ] **Step 3: Split the useEffect into two**

Replace:
```js
useEffect(() => {
  loadEvents();
  loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDateIso]);
```

With:
```js
useEffect(() => {
  loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [weekStartIso]);

useEffect(() => {
  loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDateIso]);
```

- [ ] **Step 4: Filter `timedEvents` and `allDayEvents` by `selectedDate`**

`weekDays` and `timedEvents`/`allDayEvents` are all derived values declared together. `weekDays` is declared first, then `timedEvents`/`allDayEvents`. Replace:
```js
const timedEvents = events.filter((e) => !e.isAllDay);
const allDayEvents = events.filter((e) => e.isAllDay);
```

With:
```js
const timedEvents = events.filter((e) => !e.isAllDay && isSameDay(new Date(e.startDate), selectedDate));
const allDayEvents = events.filter((e) => e.isAllDay && isSameDay(new Date(e.startDate), selectedDate));
```

- [ ] **Step 5: Add per-day event dot to day-selector buttons**

In the day-selector `weekDays.map()` block, find:
```js
const isSelected = isSameDay(day, selectedDate);
const isTodayDay = isSameDay(day, new Date());
```

Add after those two lines:
```js
const dayIso = formatLocalDateIso(day);
const dayHasEvents = events.some((e) => formatLocalDateIso(new Date(e.startDate)) === dayIso);
```

Then find the dot indicator span:
```jsx
<span
  className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : isTodayDay ? 'bg-[#005EB8]' : 'invisible'}`}
/>
```

Replace with:
```jsx
<span
  className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dayHasEvents ? 'bg-[#005EB8]' : 'invisible'}`}
/>
```

- [ ] **Step 6: Verify no compile error**

```bash
cd /c/Users/hoang/Projects/dainn-planner/frontend && pnpm build 2>&1 | tail -20
```

Expected: build completes with no errors (warnings about unused vars or eslint are OK).

- [ ] **Step 7: Commit**

```bash
cd /c/Users/hoang/Projects/dainn-planner
git add frontend/src/pages/CalendarPage.js
git commit -m "feat(CalendarPage): load full week events instead of single day"
```
