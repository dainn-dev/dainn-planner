# Architecture — DailyPlanner Backend

## Overview

DailyPlanner Backend là ASP.NET Core 8 Web API theo Clean Architecture. Phục vụ cả planner app (tasks, goals, calendar, notifications) và CV hosting platform (multi-tenant theo subdomain). Database: Neon PostgreSQL serverless.

Project là một phần của monorepo `dainn-planner` gồm 3 sub-projects:
- `backend/` — API này (ASP.NET Core 8)
- `frontend/` — React 18 CRA SPA (`http://plan.nport.link`)
- `cv-next/` — Next.js 15 CV hosting (`*.dainn.online`)

## System Diagram

```
                    ┌─────────────────────────────────────────┐
                    │           Internet                      │
                    └──────────┬──────────────────────────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
    ┌─────────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │  React SPA     │  │  Next.js     │  │  Admin/     │
    │  plan.nport    │  │  *.dainn     │  │  Swagger    │
    │  .link         │  │  .online     │  │  Hangfire   │
    └─────────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                │                 │
              │         Bearer JWT / X-Tenant-Slug header
              │                │                 │
              └────────────────┼─────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   DailyPlanner.Api   │
                    │   :5113 (dev)        │
                    │   :8080 (docker)     │
                    │                     │
                    │  ┌────────────────┐ │
                    │  │  Middleware     │ │
                    │  │  - Serilog     │ │
                    │  │  - CORS        │ │
                    │  │  - JWT Auth    │ │
                    │  │  - Global Exc  │ │
                    │  └────────────────┘ │
                    │  ┌────────────────┐ │
                    │  │  Controllers   │ │
                    │  │  - Auth        │ │
                    │  │  - Tasks       │ │
                    │  │  - Goals       │ │
                    │  │  - CV          │ │
                    │  │  - Admin       │ │
                    │  │  - ...         │ │
                    │  └────────────────┘ │
                    │  ┌────────────────┐ │
                    │  │  Hangfire Jobs │ │
                    │  │  (background)  │ │
                    │  └────────────────┘ │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼───────────────────┐
              │                │                   │
    ┌─────────▼──────┐  ┌──────▼──────┐  ┌────────▼──────┐
    │  Application   │  │  Domain     │  │  External APIs │
    │  - DTOs        │  │  - Entities │  │  - Google Cal  │
    │  - Interfaces  │  │             │  │  - Todoist     │
    │  - Validators  │  │             │  │  - Firestore   │
    └─────────┬──────┘  └─────────────┘  └────────────────┘
              │
    ┌─────────▼──────┐
    │  Infrastructure│
    │  - DbContext   │
    │  - Services    │
    │  - Migrations  │
    └─────────┬──────┘
              │
    ┌─────────▼──────────────────────────┐
    │  Neon PostgreSQL (serverless)       │
    │  us-east-2                          │
    └────────────────────────────────────┘
```

## Components

### DailyPlanner.Domain
- **Location:** `DailyPlanner.Domain/Entities/`
- **Role:** Pure domain entities, không có external dependencies
- **Key entities:** ApplicationUser, DailyTask, TaskInstance, LongTermGoal, CvSite, CvDocument

### DailyPlanner.Application
- **Location:** `DailyPlanner.Application/`
- **Role:** Business logic contracts (interfaces), DTOs, validators, AutoMapper profile
- **Key files:** `Interfaces/`, `DTOs/`, `Mappings/MappingProfile.cs`, `Validators/`

### DailyPlanner.Infrastructure
- **Location:** `DailyPlanner.Infrastructure/`
- **Role:** EF Core DbContext, service implementations, migrations
- **Key files:** `Data/ApplicationDbContext.cs`, `Services/` (25 services), `Migrations/`, `DependencyInjection.cs`

### DailyPlanner.Api
- **Location:** `DailyPlanner.Api/`
- **Role:** HTTP layer — controllers, middleware, Hangfire jobs, OAuth handlers, startup
- **Key files:** `Program.cs`, `Controllers/` (14 + Cv/), `Jobs/`, `Middleware/`

### DailyPlanner.Infrastructure.Tests
- **Location:** `DailyPlanner.Infrastructure.Tests/`
- **Role:** Unit tests cho service layer
- **Pattern:** xUnit + Moq + FluentAssertions + InMemory EF Core

## Data Flow

```
HTTP Request
  → Serilog request logging
  → CORS check
  → JWT Bearer validation
  → GlobalExceptionHandlerMiddleware
  → Controller (extract userId from ClaimTypes.NameIdentifier)
  → Service (business logic, EF Core queries)
  → ApplicationDbContext
  → Neon PostgreSQL
  → ApiResponse<T>
  → JSON response (camelCase)
```

## CV Multi-Tenant Flow

```
Request to {slug}.dainn.online
  → Vercel (cv-next)
  → middleware.ts: parse slug from Host header → set x-tenant-slug header
  → Next.js Server Component: read x-tenant-slug header
  → lib/server/public-cv.ts: fetch /api/v1/cv/sites/{slug}/payload
  → DailyPlanner.Api: CvTenantResolver reads X-Tenant-Slug or Host
  → CvService: load CvSite + CvDocument from PostgreSQL
  → JSON payload → cv-next renders CV page
```

## DailyTask + TaskInstance Pattern

```
DailyTask (template)
  ├── Id, UserId, Title, Description
  ├── Date (original/start date)
  ├── Recurrence (0=none, 1=daily, 2=weekly, 3=monthly)
  ├── Priority, Tags, ReminderTime
  └── TaskInstances[]
       ├── TaskInstance (per-day)
       │    ├── Id, TaskId, InstanceDate
       │    ├── Status (incomplete/complete)
       │    ├── Description (can override template)
       │    └── IsOverride
       └── ...
```

## Hangfire Background Jobs

| Job | Schedule | Function |
|---|---|---|
| RecurringTaskRenewalJob | Daily midnight UTC | Tạo TaskInstance cho recurring tasks ngày mới |
| OldDailyTaskCleanupJob | Daily 01:00 UTC | Xóa tasks cũ hơn 7 ngày (completed) |
| OldUserActivityCleanupJob | Daily 02:00 UTC | Xóa user activity logs cũ |
| TaskReminderJob | Every minute | Gửi in-app notification khi đến ReminderTime |
| WeeklySummaryEmailJob | Monday 09:00 UTC | Record stats + gửi weekly email summary |
| EmailTaskReminderJob | Every minute | Gửi email reminder cho task |

## External Services

| Service | Usage | Config |
|---|---|---|
| Neon PostgreSQL | Primary database | `ConnectionStrings:DefaultConnection` |
| Google OAuth 2.0 | Sign-in + Calendar | `Authentication:Google:ClientId/Secret` |
| Facebook OAuth | Sign-in | `Authentication:Facebook:AppId/AppSecret` |
| Todoist API | Task sync OAuth | `Integrations:Todoist:ClientId/Secret` |
| Google Firestore | CV data import (optional) | Firebase service account |
| SMTP | Email notifications | `Email:SmtpHost/Port/User/Password` |
| Google reCAPTCHA v2 | Form protection | `Recaptcha:SecretKey` |

## Environment Variables

Xem `docker-compose.yml` cho full list. Key variables:

```
ConnectionStrings__DefaultConnection   # Neon PostgreSQL connection string
Jwt__Key                               # JWT signing key (32+ chars)
Jwt__Issuer / Jwt__Audience            # JWT issuer/audience
Authentication__Google__ClientId/Secret
Authentication__Facebook__AppId/AppSecret
Cors__AllowedOrigins__0/1/2            # Allowed frontend origins
Cv__RootDomain                         # dainn.online
Email__SmtpHost/Port/User/Password
Hangfire__Username/Password            # Dashboard basic auth
Integrations__Todoist__ClientId/Secret
Recaptcha__SecretKey
```
