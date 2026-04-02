# Google Calendar Sync Display — Design Spec

**Date:** 2026-04-01
**Feature:** DAI-161 (Group E, Item #1)
**Scope:** Frontend only — `CalendarPage.js`

---

## Context

The backend already merges Google Calendar events into `GET /api/events` responses.
`CalendarEventDto` exposes `source: "Google"` and `externalId: "<googleEventId>"` for Google-sourced events.
The frontend currently ignores these fields — all events render identically and edits always call `eventsAPI.updateEvent()`.

---

## Goal

Display Google Calendar events on the CalendarPage timeline alongside local events, with a visual "G" badge to distinguish them. Editing and deleting Google events routes to the correct Google-specific API calls.

---

## Decisions

| Question | Decision |
|----------|----------|
| Google events visible? | Yes — merged into the same timeline as local events |
| Visual distinction | "G" badge on event card (top-right), no separate toggle |
| Click to edit | Same edit modal as local events |
| Save → push to Google? | Yes — `googleEventsAPI.updateGoogleEvent(externalId, payload)` |
| Delete → remove from Google? | Yes — `googleEventsAPI.deleteGoogleEvent(externalId)` |
| User not connected? | Show dismissible nudge banner below the page header |

---

## Architecture

No backend changes. All changes are in `frontend/src/pages/CalendarPage.js` and i18n files.

### Data flow

```
GET /api/events?startDate=X&endDate=X
  → CalendarEventService merges local + Google events
  → Returns list where Google events have { source: "Google", externalId: "google_id" }

CalendarPage.loadEvents()
  → sets events[] (unchanged)

Render: evt.source === "Google"
  → same card layout + "G" badge

Edit submit:
  if editingEvent.source === "Google"
    → googleEventsAPI.updateGoogleEvent(editingEvent.externalId, payload)
  else
    → eventsAPI.updateEvent(editingEvent.id, payload)

Delete:
  if selectedEvent.source === "Google"
    → googleEventsAPI.deleteGoogleEvent(selectedEvent.externalId)
  else
    → eventsAPI.deleteEvent(selectedEvent.id)
```

---

## UI Changes

### A. Google "G" badge on event cards

Added to all 3 event type layouts (meeting, deepfocus, casual) in the timeline.

```
Position: absolute top-1.5 right-1.5
Style: bg-white text-[#4285F4] border border-[#4285F4]/30 rounded-full text-[9px] font-bold px-1.5 py-0.5
Content: "G"
Condition: evt.source === "Google"
```

Hide badge when `isCompactEventCard` (height ≤ 52px) to avoid clutter.

### B. Edit modal routing

In `handleCalendarEventSubmit`:

```js
if (editingEvent?.source === 'Google') {
  await googleEventsAPI.updateGoogleEvent(editingEvent.externalId, payload);
} else if (!editingEvent) {
  await eventsAPI.createEvent(payload);
} else {
  await eventsAPI.updateEvent(editingEvent.id, payload);
}
```

No changes to form fields — same payload shape works for both APIs.

### C. Delete routing

In the event detail drawer delete handler:

```js
if (selectedEvent.source === 'Google') {
  await googleEventsAPI.deleteGoogleEvent(selectedEvent.externalId);
} else {
  await eventsAPI.deleteEvent(selectedEvent.id);
}
```

### D. Connect nudge banner

**Condition:** `plansSettings.googleCalendarConnected !== true`
**Placement:** Below the calendar header, above the day selector strip
**Dismiss:** `sessionStorage.setItem('gcal_nudge_dismissed', '1')` — reappears on next session

```
[calendar_month icon] Kết nối Google Calendar để xem events của bạn
                                              [Kết nối →]  [×]
```

Style: `bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-2.5`

---

## i18n Keys

### vi.json
```json
"calendar.googleBadge": "Google",
"calendar.connectGoogleBanner": "Kết nối Google Calendar để xem events của bạn",
"calendar.connectGoogleAction": "Kết nối",
"calendar.googleEventUpdated": "Đã cập nhật Google event"
```

### en.json
```json
"calendar.googleBadge": "Google",
"calendar.connectGoogleBanner": "Connect Google Calendar to see your events here",
"calendar.connectGoogleAction": "Connect",
"calendar.googleEventUpdated": "Google event updated"
```

---

## Error Handling

- If `googleEventsAPI.updateGoogleEvent` fails → `toast.error(err?.message || t('calendar.saveEventFail'))` (same as local)
- If `googleEventsAPI.deleteGoogleEvent` fails → `toast.error(err?.message || 'Failed to delete Google event')`
- If Google events fail to load (token expired, not connected) → backend returns only local events silently; no UI error needed

---

## Out of Scope

- Creating new events directly in Google Calendar from this page (local create always goes to local DB, then backend pushes to Google via `PushCalendarEventToGoogleAsync`)
- Two-way real-time sync / webhooks
- Showing which Google Calendar the event belongs to (primary only)
