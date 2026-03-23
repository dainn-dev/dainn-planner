# Project Facts — PlanDaily Frontend

_Stable facts. Chỉ update khi project thay đổi căn bản._

## Description

PlanDaily là SPA React cho daily planner & goal management cá nhân, hiện đang plan nâng cấp thành SaaS. Frontend giao tiếp với ASP.NET Core 8 backend qua REST API (JWT Bearer). Hỗ trợ i18n vi/en, dark mode, tích hợp Google Calendar và Todoist. Có admin dashboard và CV hosting platform (platform_admin role).

## Tech Stack

| Dependency | Version | Vai trò |
|---|---|---|
| react | ^18.2.0 | UI library |
| react-dom | ^18.2.0 | DOM rendering |
| react-router-dom | ^6.20.0 | Client-side routing |
| react-scripts | 5.0.1 | CRA build toolchain |
| tailwindcss | ^3.4.0 | Utility-first CSS |
| @tailwindcss/forms | ^0.5.7 | Form styles reset |
| @tailwindcss/container-queries | ^0.1.1 | Container queries |
| i18next | ^25.8.14 | i18n core |
| react-i18next | ^16.5.6 | React i18n bindings |
| i18next-browser-languagedetector | ^8.2.1 | Auto-detect language |
| lexical | ^0.41.0 | Rich text engine |
| @lexical/react | ^0.41.0 | Lexical React bindings |
| @lexical/rich-text | ^0.41.0 | Rich text plugin |
| @lexical/list | ^0.41.0 | List plugin |
| @lexical/markdown | ^0.41.0 | Markdown plugin |
| @lexkit/editor | ^0.0.38 | Lexical editor wrapper |
| lucide-react | ^0.577.0 | Icon library |
| postcss | ^8.4.32 | CSS processing |
| autoprefixer | ^10.4.16 | CSS vendor prefixes |

**Không có:** TypeScript, Redux/Zustand, React Query/SWR, Axios, testing library (chỉ react-scripts test mặc định)

## Architecture

```
User → Vercel (SPA) → src/services/api.js → ASP.NET Core 8 (Docker + ngrok)
                                                      ↓
                                             Neon PostgreSQL (serverless)
```

- **Routing:** React Router DOM v6, route groups: Public / ProtectedRoute / AdminRoute / CvPlatformAdminRoute
- **State:** Local useState/useEffect mỗi page — không có global store
- **Auth flow:** Login → JWT stored in localStorage('token') + user object in localStorage('user') → apiRequest auto-attach Bearer header → 401 auto-redirect /login
- **Dark mode:** localStorage('user_settings').darkMode → document.documentElement.classList → Custom event 'userSettingsUpdated'
- **i18n:** App load → detect localStorage('app_lang') → fallback 'vi' → useTranslation hook per component

## Routes

| Route | Guard | Component |
|---|---|---|
| `/` | public | HomePage |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | public | Auth pages |
| `/contact`, `/term`, `/conditions` | public | Info pages |
| `/daily` | ProtectedRoute | DailyPage |
| `/goals`, `/goals/:id` | ProtectedRoute | Goals pages |
| `/calendar` | ProtectedRoute | CalendarPage |
| `/settings`, `/settings/*` | ProtectedRoute | SettingsPage |
| `/admin/dashboard`, `/admin/users`, `/admin/users/:id` | AdminRoute (role=Admin) | Admin pages |
| `/admin/logs`, `/admin/logs/:fileName` | AdminRoute | Log pages |
| `/admin/cv-sites` | CvPlatformAdminRoute (role=platform_admin hoặc Admin) | AdminCvSitesPage |
| `*` | public | NotFoundPage |

## Key Conventions

**Components:**
- Default export, function component
- Tailwind cho tất cả styling — không có CSS modules hay styled-components
- `useTranslation()` + `t('section.key')` cho mọi UI string
- Icon: Material Symbols (Google Fonts CDN) qua className `material-symbols-rounded`
- Icon: lucide-react cho một số components mới hơn

**API calls:**
- Tất cả qua named exports từ `src/services/api.js` (authAPI, tasksAPI, v.v.)
- `apiRequest()` wrapper: auto Bearer token, auto toast (mutating), auto 401 redirect, in-flight GET dedup
- Response unwrap: `data.data` → `data` → raw (apiRequest tự xử lý)
- FormData: tự động bỏ Content-Type header (upload avatar)

**Auth:**
- `localStorage('token')` → JWT
- `localStorage('user')` → `{ id, email, role, fullName, ... }`
- `localStorage('user_settings')` → full settings object từ `/users/me/settings`
- `localStorage('app_lang')` → 'vi' | 'en'
- `localStorage('deviceId')` → device fingerprint (2FA flow)
- `localStorage('refreshToken')` → refresh token (social login)

**i18n:**
- Cả `vi.json` và `en.json` phải đồng bộ — thêm key vào cả hai
- Interpolation: `"Xin chào {{name}}"` + `t('key', { name: 'World' })`
- Namespace mặc định: `translation` (single namespace)

## Infrastructure

- **Frontend:** Vercel (auto-deploy từ git push)
- **Backend:** Docker image `dailyplanner-api:latest`, port 8080, expose qua ngrok
- **Database:** Neon PostgreSQL serverless (managed từ backend)
- **Local dev:** PORT=3005, `REACT_APP_API_URL=http://localhost:5113/api`
- **Integrations:** Google OAuth (sign-in + Calendar), Facebook OAuth, Todoist OAuth, reCAPTCHA v2

## Environment Variables

| Var | Mô tả |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL (no trailing slash) |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `REACT_APP_FACEBOOK_APP_ID` | Facebook App ID |
| `REACT_APP_RECAPTCHA_SITE_KEY` | reCAPTCHA v2 site key |
| `REACT_APP_DEMO_VIDEO_URL` | Demo video URL cho homepage modal |
| `REACT_APP_GOOGLE_CALENDAR_EMBED_ID` | Force Google Calendar embed src |
| `PORT` | Dev server port (default 3005) |
