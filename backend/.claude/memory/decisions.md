# Architectural Decisions

_Thêm decisions vào đây khi chúng được đưa ra._

---

## Decision: Clean Architecture (4 layers)

**Date:** 2026-03-23
**Decision:** Tổ chức code theo Domain → Application → Infrastructure → API
**Reason:** Tách biệt business logic khỏi infrastructure, dễ test service layer với InMemory DB
**Alternatives considered:** N/A — inferred từ existing code structure

---

## Decision: DailyTask + TaskInstance pattern

**Date:** 2026-03-23
**Decision:** `DailyTask` là recurring template, `TaskInstance` là per-day execution row
**Reason:** Thay thế legacy model (task per date), cho phép track history và override description per-day
**Alternatives considered:** N/A — inferred từ LegacyDailyTaskToTaskInstancesMigrationService và migrations

---

## Decision: ASP.NET Identity + JWT (không dùng cookie auth)

**Date:** 2026-03-23
**Decision:** JWT Bearer token + Refresh Token, lưu token phía frontend trong localStorage
**Reason:** Phù hợp với SPA (React) và mobile clients trong tương lai
**Alternatives considered:** N/A — inferred từ JwtService và AuthController

---

## Decision: Neon PostgreSQL (serverless)

**Date:** 2026-03-23
**Decision:** Dùng Neon PostgreSQL thay vì self-host PostgreSQL
**Reason:** Serverless, không cần quản lý database server, phù hợp với single-user personal tool
**Alternatives considered:** N/A — inferred từ connection string

---

## Decision: Hangfire cho background jobs

**Date:** 2026-03-23
**Decision:** Dùng Hangfire với PostgreSQL storage cho scheduled/recurring jobs
**Reason:** Dashboard UI, persistent job storage, dễ monitor và retry failed jobs
**Alternatives considered:** N/A — inferred từ existing code

---

## Decision: CV hosting dùng multi-tenant subdomain pattern

**Date:** 2026-03-23
**Decision:** Mỗi CV site có slug riêng (`{slug}.dainn.online`), resolve bằng `X-Tenant-Slug` header hoặc subdomain
**Reason:** Mỗi user có public CV URL riêng, không cần path-based routing
**Alternatives considered:** Path-based (`dainn.online/cv/{slug}`) — rejected vì subdomain sạch hơn cho CV

---

## Decision: Serilog với file sinks (errors + info/warning tách biệt)

**Date:** 2026-03-23
**Decision:** 2 file sinks: `dailyplanner-errors-.log` (Error+) và `dailyplanner-.log` (Info/Warning), rolling daily
**Reason:** Dễ monitor errors riêng, không cần lọc trong admin logs viewer
**Alternatives considered:** N/A — inferred từ Program.cs

---
