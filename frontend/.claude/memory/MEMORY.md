# PlanDaily Frontend — Memory

**Stack:** React 18 + Tailwind CSS v3 + i18next (vi/en) | **API:** ASP.NET Core 8 backend qua REST
**Deploy:** Vercel (frontend) + Docker+ngrok (backend, port 8080) | **Dev port:** 3005

**Luôn nhớ:**
- Không TypeScript — thuần JS
- Mọi string UI phải qua `t('key')` và thêm vào cả `vi.json` lẫn `en.json`
- Tất cả API calls qua `src/services/api.js` — không gọi fetch trực tiếp
- Auth token: `localStorage('token')`, user: `localStorage('user')`

**Mode:** DEV AGENT

---

## Current State

- Status: freshly initialized by Blueberry Sensei (2026-03-23)
- Active branch: master
- Last task: initial Claude Code setup

## Key Components

| File | Vai trò |
|---|---|
| `src/services/api.js` | Tất cả API calls — authAPI, tasksAPI, goalsAPI, eventsAPI, notificationsAPI, adminAPI, integrationsAPI, cvPlatformAPI |
| `src/App.js` | Root routing — BrowserRouter, ProtectedRoute, AdminRoute, CvPlatformAdminRoute |
| `src/pages/DailyPage.js` | Core feature — task planning theo ngày, tích hợp Todoist |
| `src/i18n.js` | i18next setup — vi (fallback) + en, lưu `app_lang` localStorage |
| `src/utils/auth.js` | Role checks — isAdminUser, isCvPlatformStaffUser, getPostLoginPath |

## Recent Features (từ git log)

- Todoist integration (connect/disconnect/sync tasks)
- Google reCAPTCHA v2 (login, forgot password, settings)
- Google Calendar integration (OAuth connect, embed)
- CV hosting platform (CvSite + CvDocument, platform_admin role)
- Admin logs viewer với SSE stream (`/admin/logs/stream`)
- 2FA (TOTP setup, enable/disable)
- Social login: Google OAuth + Facebook

## In Progress

(none)

## Recent Decisions

Xem `.claude/memory/decisions.md`

---

_Keep this file under 200 lines. Archive old context with compress-context skill._
