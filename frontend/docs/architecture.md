# Architecture — PlanDaily Frontend

## Overview

PlanDaily Frontend là React 18 SPA deploy trên Vercel, kết nối với ASP.NET Core 8 backend qua REST API. App hiện là personal tool, đang plan nâng cấp thành SaaS. Không có SSR — tất cả rendering client-side. Auth bằng JWT Bearer token stored trong localStorage.

## System Diagram

```
[User Browser]
      |
      | HTTPS
      v
[Vercel CDN — SPA React 18]
      |
      | HTTPS (REACT_APP_API_URL)
      | Bearer JWT
      v
[Docker Container — ASP.NET Core 8, port 8080]
      |          expose qua ngrok (dev/prod hiện tại)
      |
      v
[Neon PostgreSQL — serverless, us-east-2]

External services:
- Google OAuth (sign-in + Calendar)
- Facebook OAuth (sign-in)
- Todoist OAuth (task sync)
- reCAPTCHA v2 (form protection)
```

## Frontend Components

### Routing Layer (`src/App.js`)
- BrowserRouter với 3 loại guards:
  - `ProtectedRoute` — redirect `/login` nếu không có token
  - `AdminRoute` — redirect nếu user không có role `Admin`
  - `CvPlatformAdminRoute` — redirect nếu không có role `platform_admin` hoặc `Admin`
- `ToastContainer` — global toast notifications (mounted ở root)

### API Layer (`src/services/api.js`)
- `apiRequest()` — base wrapper với: auto Bearer token, auto toast cho mutating requests, auto 401 redirect, in-flight GET dedup
- Named exports: `authAPI`, `tasksAPI`, `goalsAPI`, `eventsAPI`, `notificationsAPI`, `adminAPI`, `integrationsAPI`, `googleEventsAPI`, `cvPlatformAPI`
- `getAvatarFullUrl()` — build full URL cho avatar images

### Auth Layer (`src/utils/auth.js`)
- `getStoredUser()` — parse `localStorage('user')`
- `isAdminUser()`, `isStoredAdmin()` — check role=Admin
- `isCvPlatformStaffUser()`, `isStoredCvPlatformStaff()` — check role=platform_admin|Admin
- `getPostLoginPath()` — redirect destination sau login (by role)

### i18n Layer (`src/i18n.js`)
- i18next với LanguageDetector, 2 locales: vi (fallback) + en
- Lưu language preference trong `localStorage('app_lang')`
- Single namespace `translation`

### State Management
- Local `useState`/`useEffect` per-component — không có global store
- Persistent state qua localStorage:
  - `token` — JWT
  - `user` — user object
  - `user_settings` — full settings synced từ backend
  - `app_lang` — language preference
  - `deviceId` — 2FA device fingerprint
- Cross-component communication: custom DOM events (`userSettingsUpdated`)

### Dark Mode
- Tailwind class strategy: `document.documentElement.classList.toggle('dark')`
- `App.js` listen `userSettingsUpdated` event → `applyDarkModeFromStorage()`
- Source of truth: `localStorage('user_settings').darkMode`

## Pages & Features

| Page | Route | Feature |
|---|---|---|
| DailyPage | `/daily` | Task list theo ngày, Todoist sync, thời gian tracking |
| GoalsPage | `/goals` | Long-term goals list với progress |
| GoalDetailPage | `/goals/:id` | Goal detail + milestones management |
| CalendarPage | `/calendar` | Monthly calendar, local events + Google Calendar embed |
| SettingsPage | `/settings/*` | Profile, notifications, security (2FA, devices), preferences |
| AdminDashboardPage | `/admin/dashboard` | Stats overview, user growth charts |
| AdminUsersPage | `/admin/users` | User list, search, filter, export (CSV/Excel/PDF) |
| AdminUserDetailPage | `/admin/users/:id` | User detail + edit + password reset |
| AdminLogsPage | `/admin/logs` | Log file list |
| AdminLogDetailPage | `/admin/logs/:fileName` | Log viewer với SSE real-time stream |
| AdminCvSitesPage | `/admin/cv-sites` | CV site moderation (approve/reject/suspend) |

## Data Flow Example (Task Creation)

```
User clicks "Add Task"
  → AddTaskModal mounts (local state)
  → User fills form
  → handleSubmit() calls tasksAPI.createTask(data)
    → apiRequest('/tasks', { method: 'POST', body: ... })
      → fetch with Bearer token
      → response OK → toast.success(message) auto
      → return data.data
  → DailyPage reloads task list
  → Modal closes
```

## Environment Configuration

| Var | Dev | Prod (Vercel) |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:5113/api` | Backend ngrok URL |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google Cloud Console client ID | Same |
| `REACT_APP_RECAPTCHA_SITE_KEY` | reCAPTCHA site key | Same |
| `PORT` | 3005 | N/A (Vercel managed) |

## SaaS Upgrade Considerations

Khi plan nâng cấp lên SaaS, các điểm cần xem xét:
- **Multi-tenancy:** Hiện không có — cần workspace/org concept
- **TypeScript migration:** Từ JS thuần sang TS để scale team
- **Global state:** Xem xét Zustand hoặc React Query khi data sharing tăng
- **Auth security:** JWT từ localStorage → httpOnly cookie
- **Landing page:** SEO cần SSR → xem xét Next.js migration
- **Billing/subscription:** Cần thêm billing UI (Stripe)
