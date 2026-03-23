# My CV Page — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** Frontend only — wires up existing `CvMeSiteController` endpoints

---

## Overview

Add a "My CV" page accessible to all authenticated users (including Admin, platform_admin) from the sidebar. The page lets a user:
1. Request a public CV site (slug-based subdomain), track its approval status
2. Edit CV content in JSON per section (partial saves, one section at a time)
3. Switch theme preset

---

## API Endpoints (existing backend)

Base server path: `/api/v1/cv/me/site` — In `cvMeAPI` code, paths omit the `/api` prefix since `REACT_APP_API_URL` already includes it (e.g. `http://localhost:8080/api`).

| Method | Code path | Description |
|---|---|---|
| GET | `/v1/cv/me/site` | Load site status + all content + theme |
| POST | `/v1/cv/me/site/request` | Request site with `{ slug }` |
| PUT | `/v1/cv/me/site/content` | Partial content update `{ [section]: json }` |
| PATCH | `/v1/cv/me/site/theme` | Change theme `{ presetKey }` |

**GET response shape:**
```json
{
  "site": {
    "id": "...",
    "slug": "...",
    "status": "pending|approved|rejected|suspended",
    "rejectionReason": "...|null",
    "requestedAt": "...",
    "themePresetKey": "default|midnight"
  },
  "content": {
    "profile": {...},
    "portfolio": {...},
    "skills": {...},
    "experience": [...],
    "education": [...],
    "certificates": [...],
    "services": {...},
    "facts": {...},
    "testimonials": {...}
  },
  "theme": {}
}
```

`site` is `null` if the user has never requested a site. The top-level `theme` field contains resolved theme tokens for the CV renderer — it is not used by this dashboard page and can be ignored.

Site statuses: `null` (no site) | `pending` | `approved` | `rejected` | `suspended`

---

## Architecture

### New file: `src/pages/MyCvPage.js`

Single-page layout with three stacked sections:

**1. Site Status Bar**
- `site === null`: input for slug + "Request site" button
- `status === 'pending'`: info badge "Awaiting admin review"
- `status === 'approved'`: success badge + live URL info (label: `myCv.visitSite`)
- `status === 'rejected'`: rejection reason displayed + re-request form (slug input pre-filled with `site.slug`, editable). Re-request calls the same `POST /v1/cv/me/site/request` endpoint.
- `status === 'suspended'`: warning badge

**2. Theme Picker**
- Two preset cards: `default` (Light) and `midnight` (Midnight)
- Active preset highlighted with border/ring
- Click → immediate `PATCH /theme` call
- **Disabled when `site === null` or `site.status !== 'approved'`** — render cards with `aria-disabled="true"` + `pointer-events-none opacity-50` so tooltip/note (`myCv.themeDisabled`) remains visible on hover

**3. Content Sections (Accordion)**
Nine sections, each rendered identically:
- Section header (clickable, expands/collapses). Only one section open at a time.
- Opening a section **resets its draft** to the current saved `content[section]` value (unsaved edits from a prior open are discarded — this is intentional for simplicity).
- `<textarea>` pre-filled with `JSON.stringify(content[section], null, 2)`. If `content[section]` is `undefined` or `null`, initialize draft to `'{}'`.
- "Save" button → validates JSON parse → `PUT /content { [section]: parsed }`
- Inline error message (`myCv.invalidJson`) if JSON parse fails
- Save button disabled while request in flight

Sections in order: `profile`, `portfolio`, `skills`, `experience`, `education`, `certificates`, `services`, `facts`, `testimonials`

**Save success feedback:** The `apiRequest` wrapper auto-toasts if the backend returns a `message` field. The backend `PUT /content` response does not include `message`, so no auto-toast fires — add a manual `toast.success(t('myCv.saveSuccess'))` after a successful PUT. The `POST /request` response also does not include `message`, so add a manual `toast.success` there as well (use `myCv.requestSuccess` key).

**Error state on load:** If the initial `GET /v1/cv/me/site` fails, set `error` state and render an inline error message with a "Retry" button.

### API module: `src/services/api.js`

Add `cvMeAPI` export:
```js
export const cvMeAPI = {
  getMySite: () => apiRequest('/v1/cv/me/site'),
  requestSite: (slug) => apiRequest('/v1/cv/me/site/request', {
    method: 'POST',
    body: JSON.stringify({ slug }),
  }),
  putContent: (section, value) => apiRequest('/v1/cv/me/site/content', {
    method: 'PUT',
    body: JSON.stringify({ [section]: value }),
  }),
  patchTheme: (presetKey) => apiRequest('/v1/cv/me/site/theme', {
    method: 'PATCH',
    body: JSON.stringify({ presetKey }),
  }),
};
```

### Router: `src/App.js`
Add `<Route path="/cv" element={<ProtectedRoute><MyCvPage /></ProtectedRoute>} />`

### Sidebar: `src/components/Sidebar.js`
Add to `baseMenuItems` (visible to all authenticated users, including Admin and platform_admin — no role filtering needed):
```js
{ path: '/cv', labelKey: 'sidebar.myCv', icon: 'badge', fillWhenActive: false }
```
`badge` is a valid Material Symbols Outlined icon. No `isActive()` override needed — the default exact match `location.pathname === '/cv'` is correct (no sub-routes).

### i18n keys

Add to `vi.json` and `en.json`:

| Key | VI | EN |
|---|---|---|
| `sidebar.myCv` | CV của tôi | My CV |
| `myCv.title` | CV của tôi | My CV |
| `myCv.loadError` | Không thể tải CV. Thử lại? | Failed to load CV. Retry? |
| `myCv.retry` | Thử lại | Retry |
| `myCv.siteStatus` | Trạng thái site | Site Status |
| `myCv.noSite` | Bạn chưa có site CV. Nhập slug để tạo yêu cầu. | You don't have a CV site yet. Enter a slug to request one. |
| `myCv.slugLabel` | Slug (tên miền phụ) | Slug (subdomain) |
| `myCv.slugPlaceholder` | vd: yourname | e.g. yourname |
| `myCv.slugInvalid` | Slug chỉ gồm chữ thường, số và dấu gạch ngang (3–40 ký tự) | Slug must be lowercase letters, numbers and hyphens (3–40 chars) |
| `myCv.requestSite` | Yêu cầu tạo site | Request site |
| `myCv.statusPending` | Đang chờ duyệt | Awaiting review |
| `myCv.statusApproved` | Site đã được duyệt | Site is live |
| `myCv.statusRejected` | Yêu cầu bị từ chối | Request rejected |
| `myCv.statusSuspended` | Site bị tạm dừng | Site suspended |
| `myCv.rejectionReason` | Lý do | Reason |
| `myCv.reRequest` | Yêu cầu lại | Re-request |
| `myCv.theme` | Theme | Theme |
| `myCv.themeDisabled` | Cần site được duyệt trước khi chọn theme | Site must be approved before choosing a theme |
| `myCv.content` | Nội dung CV | CV Content |
| `myCv.visitSite` | Xem site | Visit site |
| `myCv.requestSuccess` | Yêu cầu đã được gửi | Request submitted |
| `myCv.saveSection` | Lưu | Save |
| `myCv.saveSuccess` | Đã lưu | Saved |
| `myCv.invalidJson` | JSON không hợp lệ | Invalid JSON |
| `myCv.sections.profile` | Hồ sơ | Profile |
| `myCv.sections.portfolio` | Portfolio | Portfolio |
| `myCv.sections.skills` | Kỹ năng | Skills |
| `myCv.sections.experience` | Kinh nghiệm | Experience |
| `myCv.sections.education` | Học vấn | Education |
| `myCv.sections.certificates` | Chứng chỉ | Certificates |
| `myCv.sections.services` | Dịch vụ | Services |
| `myCv.sections.facts` | Facts | Facts |
| `myCv.sections.testimonials` | Nhận xét | Testimonials |

---

## State Management

All state local in `MyCvPage`:

```
loading: bool
error: string | null
site: { id, slug, status, rejectionReason, themePresetKey } | null
content: { profile, portfolio, skills, experience, education, certificates, services, facts, testimonials }
slugInput: string
openSection: string | null          (accordion — only one open at a time)
sectionDraft: { [section]: string } (textarea values; reset to saved value on section open)
sectionErrors: { [section]: string | null }
savingSection: { [section]: bool }
savingTheme: bool
requestingSlug: bool
```

---

## UX Details

- On mount: fetch `GET /v1/cv/me/site`, set `content` from response. **Do not pre-populate `sectionDraft` on mount** — each section's draft is initialized lazily when that section is first opened (set to `JSON.stringify(content[section], null, 2)` or `'{}'` if section is empty). This avoids redundant state.
- Accordion: only one section open at a time. Re-opening a section resets draft to current saved value.
- `sectionDraft[s]` initial value: `JSON.stringify(content[s], null, 2)` if `content[s]` is defined and not null; otherwise `'{}'`.
- Theme cards: show preset label (Light / Midnight). Disabled + tooltip when site is not approved.
- Slug input validation (client-side, before submit): `/^[a-z0-9-]{3,40}$/`. Show `myCv.slugInvalid` inline if fails.
- Re-request (rejected): slug input pre-filled with `site.slug`, editable. Calls same `POST /request`.
- Save section: `JSON.parse` draft → on failure show `myCv.invalidJson` inline, no API call. On success call `putContent`, then `toast.success(t('myCv.saveSuccess'))`.
- Theme PATCH fires on card click (no confirm needed).
- API error toasts auto-handled by `apiRequest` wrapper.

---

## Constraints

- No TypeScript — plain JS
- All UI strings via `t('key')`
- Use `apiRequest` from `src/services/api.js` — no direct `fetch()`
- Dark mode: all Tailwind classes need `dark:` variants
- Route guard: `ProtectedRoute` only (all authenticated users, no role restriction)
