# PlanDaily — Frontend React

SPA daily planner & goal management app — React 18 + Tailwind, giao tiếp với ASP.NET Core 8 backend qua REST API. Hiện là personal tool, đang plan nâng cấp thành SaaS.

---

## Project Context

| | |
|---|---|
| **Stack** | React 18, React Router DOM v6, Tailwind CSS v3.4, i18next (vi/en), Lexical ^0.41 (rich text), lucide-react |
| **Ngôn ngữ** | JavaScript thuần — không có TypeScript |
| **State** | Local `useState`/`useEffect` — không có global state manager |
| **API** | Tất cả calls qua `src/services/api.js` — JWT Bearer, base `REACT_APP_API_URL` |
| **Database** | Không có (backend: Neon PostgreSQL, qua ASP.NET Core 8) |
| **Deployment** | Frontend: Vercel. Backend: Docker + ngrok (port 8080 → 5113 dev) |
| **Users** | Cá nhân — plan mở rộng SaaS |

**Luôn nhớ:**
- Không có TypeScript — dùng JSDoc comment nếu cần type hint, không tạo `.ts` files
- i18n bắt buộc: mọi string UI phải qua `t('key')` — thêm vào cả `vi.json` lẫn `en.json`
- Auth token ở `localStorage('token')`, user object ở `localStorage('user')`, settings ở `localStorage('user_settings')`
- Dark mode toggle qua `document.documentElement.classList` + dispatch `CustomEvent('userSettingsUpdated')`
- API wrapper tự động toast success/error cho mutating requests — không cần toast thủ công trừ khi cần custom message

---

## Làm việc với Claude (DEV AGENT mode)

### Bước 1 — Hiểu Task
- Đọc CLAUDE.md + `.claude/memory/MEMORY.md` + docs liên quan
- Nếu chưa rõ: hỏi từng câu một, chờ trả lời (max 3 câu)
- Dùng quick options khi có thể: "Option 1: ... Option 2: ... Option 3: Khác"

### Bước 2 — Branch
- Kiểm tra branch hiện tại: `git branch --show-current`
- **Cảnh báo** nếu user đang ở feat/fix branch khác (có thể quên chưa checkout về main/master)
- Hỏi:
  - Option 1: Tạo branch mới `feat/<slug>` hoặc `fix/<slug>`
  - Option 2: Tiếp tục trên branch hiện tại
  - Option 3: Khác

### Bước 3 — Plan & Confirm

**Task nhỏ** (1-3 file, ít impact):
> "Tôi sẽ [mô tả ngắn]. Được chưa?"
Chờ confirm mới làm.

**Task lớn** (nhiều file, nhiều component):
Build plan đầy đủ:
- File nào tạo/sửa
- i18n keys nào cần thêm
- Dependency nào cần
- Plan đủ context để chia cho sub-agent nếu cần
> "Đây là plan: [plan]. Confirm để bắt đầu?"
Chờ confirm mới làm.

### Bước 4 — Implement

Khi code, luôn kiểm tra:
- **i18n:** Có string hardcode tiếng Anh/Việt không? → phải qua `t('key')`
- **Security:** Input đã validate chưa? Không expose token/secret ra UI
- **Auth guards:** Route mới có cần `ProtectedRoute` / `AdminRoute` / `CvPlatformAdminRoute` không?
- **API pattern:** Dùng đúng hàm trong `src/services/api.js` — không gọi `fetch()` trực tiếp
- **Dark mode:** Class Tailwind có `dark:` variant chưa nếu component mới có background/text?
- **Side effects:** Thay đổi này có break localStorage schema hoặc custom events không?

### Bước 5 — Test & Verify
- Chạy `pnpm dev` kiểm tra không có lỗi compile
- Nếu có UI thay đổi → dùng `.claude/skills/ui-review.md`
- Kiểm tra cả vi và en locale nếu có thêm i18n keys

---

## Project Structure

```
frontend/
├── src/
│   ├── App.js                    # Root routing — BrowserRouter + ToastContainer
│   ├── i18n.js                   # i18next setup, fallback vi, lưu app_lang localStorage
│   ├── index.js                  # Entry point
│   ├── index.css                 # Global styles + Tailwind directives
│   ├── pages/
│   │   ├── DailyPage.js          # Task planning theo ngày — core feature
│   │   ├── GoalsPage.js          # Danh sách long-term goals
│   │   ├── GoalDetailPage.js     # Chi tiết goal + milestones
│   │   ├── CalendarPage.js       # Calendar + events (local + Google)
│   │   ├── SettingsPage.js       # User settings (profile, security, notifications)
│   │   ├── HomePage.js           # Landing page (public)
│   │   ├── LoginPage.js          # Login — email/pass, Google, Facebook, 2FA
│   │   ├── RegisterPage.js       # Register
│   │   ├── AdminDashboardPage.js # Admin: stats overview
│   │   ├── AdminUsersPage.js     # Admin: user list + export
│   │   ├── AdminUserDetailPage.js# Admin: user detail
│   │   ├── AdminLogsPage.js      # Admin: log files list
│   │   ├── AdminLogDetailPage.js # Admin: log viewer + SSE stream
│   │   └── AdminCvSitesPage.js   # Platform admin: CV site moderation
│   ├── components/
│   │   ├── Sidebar.js            # Nav sidebar (role-aware menu)
│   │   ├── Header.js             # Authenticated header + notifications
│   │   ├── AddTaskModal.js       # Modal tạo/edit task
│   │   ├── ToastContainer.js     # Global toast notifications
│   │   ├── ProtectedRoute.js     # Auth guard (redirect /login)
│   │   ├── AdminRoute.js         # Role guard: Admin
│   │   ├── CvPlatformAdminRoute.js # Role guard: platform_admin
│   │   ├── TaskDescriptionEditor.js # Lexical rich text editor
│   │   ├── TaskHistoryModal.js   # Task completion history
│   │   └── [form components]     # FormInput, FormSelect, FormTextarea, Toggle, PasswordInput
│   ├── services/
│   │   └── api.js                # Tất cả API calls — authAPI, tasksAPI, goalsAPI,
│   │                             #   eventsAPI, notificationsAPI, adminAPI,
│   │                             #   integrationsAPI, googleEventsAPI, cvPlatformAPI
│   ├── utils/
│   │   ├── auth.js               # getStoredUser, isAdminUser, getPostLoginPath, isCvPlatformStaffUser
│   │   ├── toast.js              # Toast utility (used by api.js)
│   │   ├── dateFormat.js         # formatDate, formatTime, formatLocalDateIso, formatLocalTimeHHmm
│   │   ├── colorMappings.js      # Calendar event color utilities
│   │   ├── formValidation.js     # Form validation helpers
│   │   └── goalProgress.js       # Goal progress calculation
│   ├── hooks/
│   │   ├── useForm.js            # Custom hook for form state + validation
│   │   └── useRecaptchaV2.js     # reCAPTCHA v2 hook
│   ├── constants/
│   │   ├── tasks.js              # DEFAULT_TAGS, TAG_I18N_KEYS, priorities
│   │   └── settings.js           # Settings constants + initial values
│   └── locales/
│       ├── vi.json               # Tiếng Việt (fallback mặc định)
│       └── en.json               # English
├── public/                       # Static assets
├── .env                          # Local env (PORT=3005, REACT_APP_API_URL, REACT_APP_GOOGLE_CLIENT_ID)
├── .env.example                  # Template env
├── tailwind.config.js            # Custom colors, fonts, shadows, animations
├── vercel.json                   # Vercel deployment config
└── package.json                  # Scripts: dev, build, test
```

---

## Key Commands

| Command | Mô tả |
|---|---|
| `pnpm dev` | Start dev server (PORT=3005) |
| `pnpm dev:3000` | Start ở port 3000 |
| `pnpm build` | Build production |
| `pnpm test` | Run tests (React Testing Library) |

---

## Skills

| Skill | Khi nào dùng |
|---|---|
| `.claude/skills/testing.md` | Viết và chạy tests |
| `.claude/skills/ui-review.md` | Sau khi thay đổi UI |
| `.claude/skills/i18n-workflow.md` | Thêm string mới, thêm locale key |
| `.claude/skills/react-patterns.md` | Tạo component/page mới, follow conventions |
| `.claude/skills/parallel-agents.md` | Task lớn có nhiều phần độc lập |
| `.claude/skills/compress-context.md` | Context quá dài |

---

## Memory System

Đọc trước khi bắt đầu task:
- `.claude/memory/MEMORY.md` — project state hiện tại (< 200 lines)
- `.claude/memory/project.md` — stable facts về project
- `.claude/memory/decisions.md` — architectural decisions đã được đưa ra

Cập nhật sau khi hoàn thành task:
- Update `MEMORY.md` nếu project state thay đổi
- Thêm vào `decisions.md` nếu có architectural decision mới

---

## API Overview

Base URL: `REACT_APP_API_URL` (default `http://localhost:8080/api`)

| Module | Export | Endpoints chính |
|---|---|---|
| Auth | `authAPI` | `/auth/login`, `/auth/register`, `/auth/social-login`, `/auth/verify-2fa`, `/auth/forgot-password`, `/auth/reset-password` |
| User | `userAPI` | `/users/me`, `/users/me/settings`, `/users/me/avatar`, `/users/me/devices`, `/users/me/2fa/*`, `/users/me/change-password` |
| Tasks | `tasksAPI` | `/tasks`, `/tasks/:id`, `/tasks/:id/toggle`, `/task-instances`, `/tasks/:id/history`, `/tasks/tags` |
| Goals | `goalsAPI` | `/goals`, `/goals/:id`, `/goals/:id/milestones`, `/goals/:id/milestones/:id/toggle` |
| Events | `eventsAPI` | `/events`, `/events/:id` |
| Notifications | `notificationsAPI` | `/notifications`, `/notifications/:id/read`, `/notifications/read-all` |
| Integrations | `integrationsAPI` | `/integrations/google/*`, `/integrations/todoist/*` |
| Admin | `adminAPI` | `/admin/users`, `/admin/dashboard/stats`, `/admin/logs`, `/admin/logs/stream` (SSE) |
| CV Platform | `cvPlatformAPI` | `/v1/cv/admin/sites` (role: platform_admin) |

Tất cả calls qua `apiRequest()` trong `src/services/api.js` — auto Bearer token, auto toast, auto 401 redirect.

---

## Auth & Roles

```
localStorage('token')        → JWT Bearer token
localStorage('user')         → { id, email, role, ... }
localStorage('user_settings')→ user preferences (darkMode, weekStartDay, plans.*, ...)
localStorage('app_lang')     → 'vi' | 'en'
localStorage('deviceId')     → device fingerprint cho 2FA
```

| Role | Access |
|---|---|
| (user) | `/daily`, `/goals`, `/calendar`, `/settings` |
| `Admin` | Tất cả user routes + `/admin/*` |
| `platform_admin` | `/admin/cv-sites` only |

---

## i18n

- 2 locales: `vi` (fallback mặc định) + `en`
- Files: `src/locales/vi.json`, `src/locales/en.json`
- Hook: `const { t } = useTranslation()` → `t('section.key')`
- Interpolation: `t('key', { variable: value })` → `"{{variable}}"` trong JSON
- Language switch: `localStorage('app_lang')` + `i18n.changeLanguage()`

---

## Tailwind Conventions

Custom colors quan trọng:
- `primary` (#137fec) — main CTA blue
- `background-dark` (#101922) — dark mode background
- `text-main` (#111827), `text-muted` (#6b7280)
- `secondary` (#52525b), `highlight` (#6366f1)

Dark mode: class strategy (`dark:` prefix). Toggle qua `document.documentElement.classList.add('dark')`.

---

## Git & GitHub

- Branches: `feat/<task>`, `fix/<task>`, `chore/<task>` (kebab-case, max 4 từ)
- Commits: nhỏ, thường xuyên, descriptive
- PR: tạo khi task xong, bao gồm change summary + test results

---

## Context Management

Khi context quá dài (nhiều messages, conversation cũ):
Chạy compress-context skill → summarize → archive → rewrite MEMORY.md
