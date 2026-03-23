# DailyPlanner Backend — Memory

**Stack:** ASP.NET Core 8 + EF Core 8 + Neon PostgreSQL | **Deploy:** Docker + ngrok | **Users:** Personal, plan workspace

**Luôn nhớ:**
- Controllers: check `userId` từ claims trước, return `Unauthorized()` nếu null
- Services: return `ApiResponse<T>`, không throw
- `DailyTask` = recurring template; `TaskInstance` = per-day row
- CV feature: `CvSite` + `CvDocument`, tenant qua `X-Tenant-Slug` header / subdomain
- Monorepo: `backend/` + `frontend/` (React CRA) + `cv-next/` (Next.js — đã có CLAUDE.md riêng)

**Mode:** DEV AGENT

---

## Current State

- Status: freshly initialized by Blueberry Sensei
- Active branch: master
- Last task: initial Blueberry Sensei setup

## Key Components

- `DailyPlanner.Api/Program.cs` — app bootstrap, middleware pipeline, Hangfire schedule, DB seeding
- `DailyPlanner.Infrastructure/Data/ApplicationDbContext.cs` — EF Core context, 18 entities, model config
- `DailyPlanner.Infrastructure/Services/` — 25 services (Auth, Task, Goal, CV, Todoist, Google Calendar...)
- `DailyPlanner.Api/Controllers/` — 14 controllers + `Controllers/Cv/`
- `DailyPlanner.Infrastructure.Tests/` — 10 test files, xUnit + Moq + FluentAssertions
- `DailyPlanner.Infrastructure/Migrations/` — EF Core migrations (latest: `20260324120000_CvRepairEnsureSitesDocumentsTables`)

## In Progress

(none)

## Recent Decisions

Xem `.claude/memory/decisions.md`

---

_Keep this file under 200 lines. Archive old context with compress-context skill._
