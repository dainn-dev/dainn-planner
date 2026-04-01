# Google Calendar Sync Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display Google Calendar events on CalendarPage timeline with a "G" badge, routing edits and deletes to the Google API.

**Architecture:** Backend already merges Google events into `GET /api/events` with `source: "Google"` and `externalId`. All changes are pure frontend — detect the `source` field in `CalendarPage.js` and branch the edit/delete API calls accordingly. A dismissible nudge banner guides users who haven't connected yet.

**Tech Stack:** React 18, Tailwind CSS v3.4, i18next (vi/en), `eventsAPI` + `googleEventsAPI` from `src/services/api.js`

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/pages/CalendarPage.js` | Add nudge banner, G badge on cards, route edit/delete |
| `frontend/src/locales/vi.json` | Add 4 new `calendar.*` keys |
| `frontend/src/locales/en.json` | Add 4 new `calendar.*` keys |

---

## Task 1: Add i18n keys

**Files:**
- Modify: `frontend/src/locales/vi.json`
- Modify: `frontend/src/locales/en.json`

- [ ] **Step 1: Add keys to vi.json**

Open `frontend/src/locales/vi.json`. Find the `"calendar"` object and append these 4 keys before the closing `}` of that section:

```json
"googleSourceBadge": "Google",
"connectGoogleBanner": "Kết nối Google Calendar để xem events của bạn trên lịch",
"connectGoogleAction": "Kết nối",
"googleEventUpdated": "Đã cập nhật Google event"
```

- [ ] **Step 2: Add keys to en.json**

Open `frontend/src/locales/en.json`. Find the `"calendar"` object and append the same 4 keys:

```json
"googleSourceBadge": "Google",
"connectGoogleBanner": "Connect Google Calendar to see your events here",
"connectGoogleAction": "Connect",
"googleEventUpdated": "Google event updated"
```

- [ ] **Step 3: Verify no JSON syntax error**

```bash
cd frontend
node -e "JSON.parse(require('fs').readFileSync('src/locales/vi.json','utf8')); console.log('vi OK')"
node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en OK')"
```

Expected output:
```
vi OK
en OK
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales/vi.json frontend/src/locales/en.json
git commit -m "feat(i18n): add Google Calendar sync keys to calendar locale"
```

---

## Task 2: Read googleCalendarConnected from settings

**Files:**
- Modify: `frontend/src/pages/CalendarPage.js`

The goal is a reactive boolean `isGoogleConnected` that reads `googleCalendarConnected` from `localStorage(USER_SETTINGS_STORAGE_KEY)`, identical to how `weekStartDay` is already read at the top of the component.

- [ ] **Step 1: Add `isGoogleConnected` state**

In `CalendarPage.js`, find the block that reads `weekStartDay` (around line 271). Directly after the `workHours` useState block (around line 294), add:

```js
const [isGoogleConnected] = useState(() => {
  try {
    const raw = typeof window !== 'undefined' && localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return !!stored?.plans?.googleCalendarConnected;
  } catch {
    return false;
  }
});
```

- [ ] **Step 2: Add `googleNudgeDismissed` state**

Directly after the `isGoogleConnected` state, add:

```js
const [googleNudgeDismissed, setGoogleNudgeDismissed] = useState(() => {
  try {
    return sessionStorage.getItem('gcal_nudge_dismissed') === '1';
  } catch {
    return false;
  }
});
```

- [ ] **Step 3: Add dismiss handler**

After the `goToday` function (around line 700), add:

```js
const handleDismissGoogleNudge = () => {
  try { sessionStorage.setItem('gcal_nudge_dismissed', '1'); } catch { /* ignore */ }
  setGoogleNudgeDismissed(true);
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/CalendarPage.js
git commit -m "feat(CalendarPage): read googleCalendarConnected from settings"
```

---

## Task 3: Render connect nudge banner

**Files:**
- Modify: `frontend/src/pages/CalendarPage.js`

- [ ] **Step 1: Add the banner JSX**

In the render section, find the comment `{/* ── M2: Day Selector + Task Strip ── */}` (around line 828). Insert the banner **between** the Calendar Header block and the M2 block:

```jsx
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
        onClick={() => { window.location.href = '/settings'; }}
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
```

- [ ] **Step 2: Verify banner renders when not connected**

Start the dev server and temporarily force `isGoogleConnected = false` by checking in a browser that has not connected Google Calendar. Banner should appear. Clicking × dismisses it for the session. Clicking "Kết nối" navigates to `/settings`.

```bash
cd frontend && pnpm dev
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CalendarPage.js
git commit -m "feat(CalendarPage): add Google Calendar connect nudge banner"
```

---

## Task 4: Add "G" badge to event cards

**Files:**
- Modify: `frontend/src/pages/CalendarPage.js`

Google events have `source: "Google"`. We add a small badge on all 3 card types — but only when the card is tall enough to not be cluttered (`!isCompactEventCard`).

The badge JSX to reuse for all 3 types:

```jsx
{evt.source === 'Google' && !isCompactEventCard && (
  <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white text-[#4285F4] border border-[#4285F4]/30 leading-none select-none">
    G
  </span>
)}
```

- [ ] **Step 1: Add badge to Meeting card**

Find the Meeting card inner div (search for `{type === 'meeting' && (`). It starts with:

```jsx
<div className={`relative flex h-full w-full flex-col font-display antialiased ${isCompactEventCard ? 'p-2.5' : 'p-4 pt-3 pb-3'}`}>
```

Add the badge as the **first child** inside that div, before the existing `<span role="button">` element:

```jsx
{type === 'meeting' && (
  <div className={`relative flex h-full w-full flex-col font-display antialiased ${isCompactEventCard ? 'p-2.5' : 'p-4 pt-3 pb-3'}`}>
    {evt.source === 'Google' && !isCompactEventCard && (
      <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white text-[#4285F4] border border-[#4285F4]/30 leading-none select-none">
        G
      </span>
    )}
    {/* … rest of meeting card unchanged … */}
```

- [ ] **Step 2: Add badge to Deep Focus card**

Find `{type === 'deepfocus' && (`. Its inner div starts with:

```jsx
<div className={`relative flex h-full w-full flex-col ${isCompactEventCard ? 'p-2.5' : 'p-4 pr-14 pt-3.5'}`}>
```

Add the badge as the **first child** inside that div:

```jsx
{type === 'deepfocus' && (
  <div className={`relative flex h-full w-full flex-col ${isCompactEventCard ? 'p-2.5' : 'p-4 pr-14 pt-3.5'}`}>
    {evt.source === 'Google' && !isCompactEventCard && (
      <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white text-[#4285F4] border border-[#4285F4]/30 leading-none select-none">
        G
      </span>
    )}
    {/* … rest of deepfocus card unchanged … */}
```

- [ ] **Step 3: Add badge to Casual card**

Find `{type === 'casual' && (`. Its inner div starts with:

```jsx
<div className={`flex h-full w-full items-center ${isCompactEventCard ? 'gap-2 px-2.5 py-1.5' : 'gap-3 px-4 py-2.5'}`}>
```

The casual card uses `flex items-center` (not `relative`), so wrap it in a relative container. Replace the outer div with:

```jsx
{type === 'casual' && (
  <div className="relative h-full w-full">
    {evt.source === 'Google' && !isCompactEventCard && (
      <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white text-[#4285F4] border border-[#4285F4]/30 leading-none select-none">
        G
      </span>
    )}
    <div className={`flex h-full w-full items-center ${isCompactEventCard ? 'gap-2 px-2.5 py-1.5' : 'gap-3 px-4 py-2.5'}`}>
      {/* … rest of casual card unchanged … */}
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify badge renders**

In the dev server, if any Google events exist on the timeline for the selected day, their cards should show a small "G" badge in the top-right corner (only on cards taller than 52px).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CalendarPage.js
git commit -m "feat(CalendarPage): add Google source badge to timeline event cards"
```

---

## Task 5: Route edit submit to Google API

**Files:**
- Modify: `frontend/src/pages/CalendarPage.js`

- [ ] **Step 1: Add `googleEventsAPI` to imports**

Find the import at line 7:

```js
import { eventsAPI, tasksAPI, notificationsAPI, USER_SETTINGS_STORAGE_KEY } from '../services/api';
```

Replace with:

```js
import { eventsAPI, tasksAPI, notificationsAPI, googleEventsAPI, USER_SETTINGS_STORAGE_KEY } from '../services/api';
```

- [ ] **Step 2: Branch the submit handler**

Find `handleCalendarEventSubmit` — specifically the try block that calls `eventsAPI.createEvent` / `eventsAPI.updateEvent` (around line 588):

```js
    try {
      if (!editingEvent) {
        await eventsAPI.createEvent(payload);
      } else {
        await eventsAPI.updateEvent(editingEvent.id, payload);
      }
      await loadEvents();
      setEventModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      toast.error(err?.message || t('calendar.saveEventFail'));
    } finally {
```

Replace the try block contents with:

```js
    try {
      if (!editingEvent) {
        await eventsAPI.createEvent(payload);
      } else if (editingEvent.source === 'Google') {
        await googleEventsAPI.updateGoogleEvent(editingEvent.externalId, payload);
      } else {
        await eventsAPI.updateEvent(editingEvent.id, payload);
      }
      await loadEvents();
      setEventModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      toast.error(err?.message || t('calendar.saveEventFail'));
    } finally {
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CalendarPage.js
git commit -m "feat(CalendarPage): route Google event edits to googleEventsAPI"
```

---

## Task 6: Route delete to Google API

**Files:**
- Modify: `frontend/src/pages/CalendarPage.js`

- [ ] **Step 1: Find the delete handler in the event detail drawer**

Search for `window.confirm` (around line 1664). The current delete handler is:

```js
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
```

Replace with:

```js
onClick={async () => {
  if (!window.confirm(`${t('calendar.deleteEvent')}?`)) return;
  try {
    if (selectedEvent.source === 'Google') {
      await googleEventsAPI.deleteGoogleEvent(selectedEvent.externalId);
    } else {
      await eventsAPI.deleteEvent(selectedEvent.id);
    }
    setSelectedEvent(null);
    await loadEvents();
  } catch (e) {
    toast.error(e?.message || 'Failed to delete event');
  }
}}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/CalendarPage.js
git commit -m "feat(CalendarPage): route Google event deletes to googleEventsAPI"
```

---

## Task 7: Smoke test end-to-end

- [ ] **Step 1: Start dev server**

```bash
cd frontend && pnpm dev
```

- [ ] **Step 2: Verify nudge banner (not connected)**

If the test account has no Google Calendar connected: navigate to `/calendar`. A blue banner should appear. Click × to dismiss — banner disappears and does not reappear until a new browser session. Click "Kết nối" — navigates to `/settings`.

- [ ] **Step 3: Verify nudge banner is hidden when connected**

In browser devtools console:

```js
const key = localStorage.getItem('user_settings');
const s = JSON.parse(key);
s.plans = { ...s.plans, googleCalendarConnected: true };
localStorage.setItem('user_settings', JSON.stringify(s));
location.reload();
```

Banner should not appear after reload.

- [ ] **Step 4: Verify G badge (with Google events)**

If Google is connected and events exist for a day — select that day and verify event cards show the "G" badge (top-right, visible only on cards with height > 52px).

- [ ] **Step 5: Verify edit routing**

Open a Google event (it should show in the edit modal). Change the title and submit. Network tab should show a PUT to `/api/integrations/google/events/<externalId>`, not `/api/events/<id>`.

- [ ] **Step 6: Verify delete routing**

Click delete on a Google event in the detail drawer. Confirm the dialog. Network tab should show a DELETE to `/api/integrations/google/events/<externalId>`.

- [ ] **Step 7: Verify local events unaffected**

Edit and delete a local event (no `source` field). Should still call `/api/events/<id>`.

- [ ] **Step 8: Final commit (if any cleanup needed)**

```bash
git add -p
git commit -m "chore(CalendarPage): cleanup after Google Calendar sync smoke test"
```
