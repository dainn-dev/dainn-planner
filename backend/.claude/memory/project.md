# Project Facts — DailyPlanner Backend

_Stable facts. Chỉ update khi project thay đổi căn bản._

## Description

ASP.NET Core 8 Web API cho daily planner cá nhân — quản lý tasks hàng ngày, long-term goals, calendar events, notifications, tích hợp Google Calendar OAuth và Todoist OAuth. Bao gồm CV hosting platform mới (multi-tenant theo subdomain). Hiện tại dùng cá nhân, plan mở rộng thành workspace/SaaS.

Là một phần của monorepo `dainn-planner`:
- `backend/` — project này (ASP.NET Core 8)
- `frontend/` — React 18 CRA SPA, gọi API qua `src/services/api.js`
- `cv-next/` — Next.js 15 TypeScript, CV hosting tại `*.dainn.online`, đã có CLAUDE.md riêng

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | ASP.NET Core 8 |
| ORM | Entity Framework Core 8 + Npgsql |
| Database | Neon PostgreSQL (serverless, us-east-2) |
| Identity | ASP.NET Identity + JWT Bearer + Refresh Token |
| Social Auth | Google OAuth 2.0, Facebook OAuth |
| 2FA | TOTP (ASP.NET Identity 2FA) |
| Background jobs | Hangfire + `Hangfire.PostgreSql` |
| Logging | Serilog (Console + rolling file sinks) |
| Object mapping | AutoMapper |
| Validation | FluentValidation (validators trong Application layer) |
| Email | SMTP (`SmtpEmailSender`) |
| Captcha | Google reCAPTCHA v2 |
| Container | Docker, docker-compose |
| Testing | xUnit + FluentAssertions + Moq |

## Architecture

**Clean Architecture** 4 layers:

1. **Domain** (`DailyPlanner.Domain`) — Entities thuần, không có dependencies
2. **Application** (`DailyPlanner.Application`) — DTOs, Interfaces, Validators, AutoMapper Profile, Options
3. **Infrastructure** (`DailyPlanner.Infrastructure`) — EF Core DbContext, Service implementations, Migrations
4. **API** (`DailyPlanner.Api`) — Controllers, Middleware, Hangfire Jobs, OAuth handlers, Program.cs

**Request flow:** HTTP Request → GlobalExceptionHandlerMiddleware → JWT Auth → Controller (thin) → Service → DbContext → PostgreSQL

## Database

**Provider:** Neon PostgreSQL (serverless)
**Connection:** `Host=...-pooler.c-3.us-east-2.aws.neon.tech;Database=neondb;SSL Mode=Require`

**Entities & Tables:**

| Entity | Table | Notes |
|---|---|---|
| ApplicationUser | AspNetUsers | IdentityUser + FullName, Phone, Location, AvatarUrl, Timezone, Language |
| DailyTask | DailyTasks | Recurring task template; has TaskInstances |
| TaskInstance | TaskInstances | Per-day execution row; unique (TaskId, InstanceDate) |
| LongTermGoal | LongTermGoals | Status: Active/Completed/Archived; Progress decimal |
| GoalMilestone | GoalMilestones | Belongs to LongTermGoal, has DailyTasks |
| GoalTask | GoalTasks | Sub-task của Goal |
| CalendarEvent | CalendarEvents | Supports Google Calendar sync (GoogleEventId) |
| Notification | Notifications | Type, Title, PayloadJson (jsonb), IdempotencyKey |
| RefreshToken | RefreshTokens | JWT refresh token per user |
| UserDevice | UserDevices | Device tracking cho 2FA trusted devices |
| UserSettings | UserSettings | PK=UserId, Data (text) JSON blob |
| UserActivity | UserActivities | Audit log per user |
| ContactMessage | ContactMessages | Public contact form submissions |
| UserStatistics | UserStatistics | Weekly performance stats |
| UserGoogleIntegration | UserGoogleIntegrations | Google Calendar OAuth tokens |
| UserTodoistIntegration | UserTodoistIntegrations | Todoist OAuth token |
| CvSite | Sites | Multi-tenant CV site; Status: pending/approved/rejected/suspended |
| CvDocument | Documents | CV data (jsonb columns per section) |

**Key relationships:**
- User 1-N DailyTask 1-N TaskInstance
- User 1-N LongTermGoal 1-N GoalMilestone 1-N DailyTask
- User 1-1 UserSettings, UserGoogleIntegration, UserTodoistIntegration, CvSite, CvDocument

## API Overview

**Base URL:** `http://localhost:5113/api` (dev) / `http://localhost:8080/api` (Docker)

| Controller | Route | Description |
|---|---|---|
| AuthController | `/api/auth/*` | Register, Login, 2FA, Social, Password Reset, Google OAuth |
| UsersController | `/api/users/*` | Profile, Settings, Avatar, Devices, 2FA management |
| TasksController | `/api/tasks/*` | CRUD tasks, toggle, history, tags |
| TaskInstancesController | `/api/task-instances/*` | Upsert per-day instance |
| GoalsController | `/api/goals/*` | CRUD goals, milestones, toggle |
| EventsController | `/api/events/*` | CRUD calendar events |
| NotificationsController | `/api/notifications/*` | List, mark read, delete |
| AdminController | `/api/admin/*` | Dashboard stats, user management, logs (Role=Admin) |
| GoogleIntegrationController | `/api/integrations/google/*` | Google Calendar OAuth + events CRUD |
| TodoistIntegrationController | `/api/integrations/todoist/*` | Todoist OAuth + task sync |
| ContactController | `/api/contact` | Public contact form |
| CV Controllers | `/api/v1/cv/*` | Public site, owner (me/*), admin (admin/*) |

**Response shape:**
```json
{ "success": true, "data": {...}, "message": "..." }
```

## Key Components

- `Program.cs` — Bootstrap: Serilog, CORS, Identity, JWT, Hangfire, Swagger, middleware pipeline
- `DependencyInjection.cs` — Register tất cả services (Scoped)
- `ApplicationDbContext.cs` — EF Core context với 18 DbSets + OnModelCreating config
- `DatabaseSeeder.cs` — Seed Admin/User roles + default accounts
- `MappingProfile.cs` — AutoMapper: Entity ↔ DTO mappings
- `GlobalExceptionHandlerMiddleware.cs` — Catch unhandled exceptions → 500 JSON response
- `LegacyDailyTaskToTaskInstancesMigrationService.cs` — One-time migration từ legacy per-date model sang TaskInstance model

## Infrastructure

- **Deploy:** Docker (`docker compose up --build`), expose qua ngrok
- **DB:** Neon PostgreSQL (cloud-hosted, connection pooler)
- **Logs:** Rolling file (`wwwroot/logs/dailyplanner-.log`, `dailyplanner-errors-.log`), retain 30 days
- **Uploads:** `wwwroot/uploads/avatars/` (static files)
- **Hangfire jobs:**
  - `renew-recurring-tasks` — daily midnight UTC
  - `cleanup-old-daily-tasks` — daily 01:00 UTC
  - `cleanup-old-user-activities` — daily 02:00 UTC
  - `task-reminders` — every minute (in-app notifications)
  - `email-weekly-summary` — Monday 09:00 UTC
  - `email-task-reminders` — every minute (email reminders)

## Conventions

- Controllers: thin, chỉ extract userId + call service + return result
- Services: return `ApiResponse<T>`, inject `ApplicationDbContext` + `IMapper`
- DTOs: Request/Response tách biệt, validation bằng FluentValidation
- Tests: InMemory EF Core DB, xUnit `[Fact]`/`[Theory]`, tên `Method_ShouldX_WhenY`
- Migrations: `dotnet ef migrations add <Name> --project DailyPlanner.Infrastructure --startup-project DailyPlanner.Api`
