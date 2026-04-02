# Meeting Card "More" Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the empty "More" button on the Meeting event card as a working context menu with Edit, Delete, and Copy Link actions.

**Architecture:** All changes in `frontend/src/pages/CalendarPage.js` and locale files. Add `activeEventMenuId` state to track which card's menu is open, wire up click-outside to close it, add a `more_vert` icon inside the button, and render a small dropdown menu alongside the button. Copy Link writes a date-scoped URL to the clipboard.

**Tech Stack:** React 18, Tailwind CSS v3.4, i18next (vi/en), Material Symbols icons (already used throughout the file)

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/pages/CalendarPage.js` | Add state, click-outside ref, icon, dropdown menu JSX, delete handler |
| `frontend/src/locales/vi.json` | Add `common.copyLink` key |
| `frontend/src/locales/en.json` | Add `common.copyLink` key |

---

## Task 1: Implement the "More" context menu on Meeting cards

**Files:**
- Modify: `frontend/src/pages/CalendarPage.js`
- Modify: `frontend/src/locales/vi.json`
- Modify: `frontend/src/locales/en.json`

### Existing code to understand

**The "More" button (around line 1367):**
```jsx
<span
  role="button"
  tabIndex={0}
  onClick={(e) => { e.stopPropagation(); }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
    }
  }}
  className="absolute right-3 top-1/2 z-[1] -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-[#7F8C8D] transition-colors hover:bg-white/80 hover:text-[#2C3E50]"
  aria-label={t('common.more')}
  title={t('common.more')}
>
</span>
```
Note the span is empty — no icon. This is what we're fixing.

**`openEditModal(evt)`** is a function already defined in the file (around line 481) — call it to open the edit modal for an event.

**Delete logic (from the detail drawer, around line 1757):**
```js
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
```
Replicate this pattern (adapted for `evt` not `selectedEvent`) in the menu's delete action.

**Existing state declarations are around lines 320-350.** Add new state after the existing ones.

**i18n keys already available:** `common.edit`, `common.delete`, `common.more`, `common.close`. Need to add: `common.copyLink`.

- [ ] **Step 1: Add `common.copyLink` to locale files**

In `frontend/src/locales/vi.json`, find the `"common"` object and add:
```json
"copyLink": "Sao chép liên kết"
```

In `frontend/src/locales/en.json`, find the `"common"` object and add:
```json
"copyLink": "Copy link"
```

- [ ] **Step 2: Add `activeEventMenuId` state**

In `CalendarPage.js`, find the state declarations block (around line 320). After the last `useState` in that block, add:
```js
const [activeEventMenuId, setActiveEventMenuId] = useState(null);
```

- [ ] **Step 3: Replace the empty More button with a working implementation**

Find the empty `<span role="button">` for the More button (it's inside `{type === 'meeting' && (` block). The span currently has an empty body.

Replace the entire span (from `<span role="button"` to the closing `</span>`) plus add the dropdown menu after it, like this:

```jsx
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
              toast.success(t('common.copyLink'));
            } catch {
              toast.error(t('common.copyLink'));
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
```

- [ ] **Step 4: Add click-outside handler to close the menu**

After the `handleDismissGoogleNudge` function (around line 735), add a `useEffect` that closes the menu when clicking outside:

```js
useEffect(() => {
  if (activeEventMenuId === null) return;
  const handleOutsideClick = () => setActiveEventMenuId(null);
  document.addEventListener('click', handleOutsideClick);
  return () => document.removeEventListener('click', handleOutsideClick);
}, [activeEventMenuId]);
```

- [ ] **Step 5: Verify JSON syntax**

```bash
cd /c/Users/hoang/Projects/dainn-planner/frontend
node -e "JSON.parse(require('fs').readFileSync('src/locales/vi.json','utf8')); console.log('vi OK')"
node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en OK')"
```

Expected:
```
vi OK
en OK
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/hoang/Projects/dainn-planner
git add frontend/src/pages/CalendarPage.js frontend/src/locales/vi.json frontend/src/locales/en.json
git commit -m "feat(CalendarPage): implement More context menu on Meeting event cards"
```
