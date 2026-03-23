# DailyPlanner Backend

ASP.NET Core 8 Web API cho ứng dụng daily planner — quản lý tasks, goals, calendar, notifications, tích hợp Google Calendar và Todoist. Phần của monorepo `dainn-planner` (backend + frontend React + cv-next Next.js).

---

## Project Context

| | |
|---|---|
| **Stack** | ASP.NET Core 8, Entity Framework Core 8, Npgsql, ASP.NET Identity, JWT + Refresh Token, Hangfire (PostgreSQL), Serilog, AutoMapper |
| **Database** | Neon PostgreSQL (serverless, us-east-2) — EF Core migrations |
| **Kiến trúc** | Clean Architecture: Domain → Application → Infrastructure → API |
| **Deployment** | Docker self-host, expose qua ngrok. Image: `dailyplanner-api:latest`, port 8080 |
| **Users** | Hiện tại cá nhân (personal tool), plan mở rộng workspace/SaaS |

**Luôn nhớ:**
- Controllers luôn check `userId` từ `ClaimTypes.NameIdentifier` trước — return `Unauthorized()` nếu null, không throw
- Services trả về `ApiResponse<T>` — không throw exceptions, kiểm tra `.Success` ở controller
- Default timezone: `Asia/Ho_Chi_Minh`, default language: `vi`
- `DailyTask` là template recurring; `TaskInstance` là per-day execution row — đây là pattern mới sau legacy migration
- `CvSite` + `CvDocument` là feature CV hosting mới, tenant resolve qua `X-Tenant-Slug` header hoặc subdomain

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
- Test nào viết
- Dependency nào cần
- Plan đủ context để chia cho sub-agent nếu cần
> "Đây là plan: [plan]. Confirm để bắt đầu?"
Chờ confirm mới làm.

### Bước 4 — Implement

Khi code, luôn kiểm tra:
- **Security:** Input đã validate chưa? Có lỗ hổng injection, auth bypass không?
- **Cluster-safe:** Có dùng in-memory state không? Nếu có → chuyển qua Redis
- **Performance:** Có N+1 query không? Cần cache không? Batch được không?
- **Pattern nhất quán:** Có theo đúng module pattern của codebase không?
- **Side effects:** Thay đổi này có break feature/logic khác không?
- **Deploy safety:** Code mới có ảnh hưởng đến rolling deploy (Docker restart) không?

### Bước 5 — Test & Verify
- Chạy test suite: `dotnet test`
- Build nếu cần: `dotnet build`
- Kiểm tra không có lỗi compile/runtime
- Nếu thêm migration mới → dùng `.claude/skills/database-workflow.md`

---

## Project Structure

```
backend/
├── DailyPlanner.Domain/
│   └── Entities/              # 18 entities — ApplicationUser, DailyTask, TaskInstance,
│                              #   LongTermGoal, GoalMilestone, GoalTask, CalendarEvent,
│                              #   Notification, RefreshToken, UserDevice, UserSettings,
│                              #   UserActivity, ContactMessage, UserStatistics,
│                              #   UserGoogleIntegration, UserTodoistIntegration,
│                              #   CvSite, CvDocument
├── DailyPlanner.Application/
│   ├── DTOs/                  # Request/Response DTOs (+ DTOs/Cv/ cho CV feature)
│   ├── Interfaces/            # Service interfaces
│   ├── Mappings/MappingProfile.cs  # AutoMapper profile
│   ├── Validators/            # FluentValidation validators
│   └── Options/               # Strongly-typed config options
├── DailyPlanner.Infrastructure/
│   ├── Data/
│   │   ├── ApplicationDbContext.cs  # EF Core context + model configuration
│   │   └── DatabaseSeeder.cs        # Seed roles + admin user
│   ├── Services/              # 25 service implementations
│   ├── Migrations/            # EF Core migrations
│   └── DependencyInjection.cs # Register all services
├── DailyPlanner.Api/
│   ├── Controllers/           # 14 REST controllers + Controllers/Cv/
│   ├── Jobs/                  # Hangfire background jobs
│   ├── Middleware/            # GlobalExceptionHandlerMiddleware
│   ├── OAuth/                 # Google/Facebook OAuth helpers
│   ├── Options/               # API-layer options
│   ├── Swagger/               # CvTenantHeaderOperationFilter
│   └── Program.cs             # App bootstrap, middleware pipeline, Hangfire setup
├── DailyPlanner.Infrastructure.Tests/
│   ├── Services/              # 10 service test files (xUnit + Moq + FluentAssertions)
│   └── Helpers/TestHelpers.cs # InMemory DB factory, CreateMapper, CreateTestUser
├── docker-compose.yml         # Single-service compose — API port 8080
├── Dockerfile
├── DailyPlanner.sln
└── docs/
    └── architecture.md
```

---

## Key Commands

| Command | Mô tả |
|---|---|
| `dotnet run --project DailyPlanner.Api` | Start dev server (http://localhost:5113) |
| `dotnet test` | Chạy tất cả tests |
| `dotnet build` | Build solution |
| `dotnet ef migrations add <Name> --project DailyPlanner.Infrastructure --startup-project DailyPlanner.Api` | Tạo migration mới |
| `dotnet ef database update --project DailyPlanner.Infrastructure --startup-project DailyPlanner.Api` | Apply migrations |
| `docker compose up --build` | Build và run Docker (port 8080) |

---

## Skills

| Skill | Khi nào dùng |
|---|---|
| `.claude/skills/testing.md` | Chạy tests, viết tests |
| `.claude/skills/database-workflow.md` | Thêm entity, tạo migration, update schema |
| `.claude/skills/dotnet-workflow.md` | Thêm service, controller, dependency injection |
| `.claude/skills/parallel-agents.md` | Task lớn có nhiều phần độc lập |
| `.claude/skills/compress-context.md` | Context quá dài |
| `.claude/skills/ui-review.md` | Chỉ dùng khi làm việc ở frontend/ hoặc cv-next/ |

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

## Testing

- **Framework:** xUnit + FluentAssertions + Moq
- **Run:** `dotnet test`
- **Run specific:** `dotnet test --filter "FullyQualifiedName~DailyTaskServiceTests"`
- **Pattern:** InMemory EF Core DB (`TestHelpers.CreateInMemoryDbContext()`), Arrange/Act/Assert
- **Location:** `DailyPlanner.Infrastructure.Tests/Services/`
- **Convention:** Tên test `MethodName_ShouldDoX_WhenCondition`

---

## Git & GitHub

- Branches: `feat/<task>`, `fix/<task>`, `chore/<task>` (kebab-case, max 4 từ)
- Commits: nhỏ, thường xuyên, descriptive
- PR: tạo khi task xong, bao gồm change summary + test results

---

## Code Conventions

**Controllers:**
- Luôn kiểm tra `userId = User.FindFirstValue(ClaimTypes.NameIdentifier)` đầu mỗi action
- Return `Unauthorized()` nếu null, không throw
- Gọi service, kiểm tra `result.Success` → return `Ok(result)` hoặc `BadRequest(result)` / `NotFound(result)`

**Services:**
- Trả về `ApiResponse<T>` — không throw exceptions (dùng try/catch nội bộ)
- Inject `ApplicationDbContext` + `IMapper` + dependencies qua constructor

**DTOs:**
- Request DTOs trong `DailyPlanner.Application/DTOs/`
- Tất cả mappings trong `MappingProfile.cs`

**Hangfire Jobs:**
- Jobs đăng ký trong `DailyPlanner.Infrastructure/DependencyInjection.cs` (service) + `Program.cs` (schedule)
- Cron schedule đặt ở `Program.cs`

---

## API Endpoints (tóm tắt)

| Group | Prefix | Auth |
|---|---|---|
| Auth | `/api/auth/*` | Public + Bearer |
| Users | `/api/users/*` | Bearer |
| Tasks | `/api/tasks/*` | Bearer |
| Task Instances | `/api/task-instances/*` | Bearer |
| Goals | `/api/goals/*` | Bearer |
| Calendar Events | `/api/events/*` | Bearer |
| Notifications | `/api/notifications/*` | Bearer |
| Admin | `/api/admin/*` | Bearer + Role=Admin |
| Google Integration | `/api/integrations/google/*` | Bearer |
| Todoist Integration | `/api/integrations/todoist/*` | Bearer |
| CV (public) | `/api/v1/cv/*` | Public + Bearer + Role=platform_admin |
| Contact | `/api/contact` | Public |

Swagger UI: `http://localhost:5113/swagger`
Hangfire Dashboard: `http://localhost:5113/hangfire` (Basic Auth)

---

## Context Management

Khi context quá dài (nhiều messages, conversation cũ):
Chạy compress-context skill → summarize → archive → rewrite MEMORY.md
