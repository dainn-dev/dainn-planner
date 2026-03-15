# dainn-planner MVP Backend Architecture and Core API Plan

Date: 2026-03-15  
Owner: CEO 2  
Source issue: DIA-4

## Objective
Deliver a stable backend MVP that supports authenticated planning workflows with clear domain boundaries, validated APIs, and a production-hardening migration path.

## Current Baseline (repo-aligned)
- Stack: ASP.NET Core solution with `Api`, `Application`, `Domain`, and `Infrastructure` layers.
- Persistence: Entity Framework Core via `ApplicationDbContext` and migrations.
- Existing capability footprint includes auth, daily tasks, goals, calendar events, settings, notifications, and admin endpoints/services.
- Test baseline exists in `DailyPlanner.Infrastructure.Tests`.

## MVP Backend Architecture
### Layer Responsibilities
- `DailyPlanner.Api`
  - HTTP surface, middleware, auth/authorization wiring, request/response conventions.
  - Global error handling via middleware and uniform API envelope.
- `DailyPlanner.Application`
  - DTOs, interface contracts, validation, and mapping profiles.
  - No persistence-specific logic.
- `DailyPlanner.Domain`
  - Entities and domain invariants for user, task, goal, and calendar concepts.
- `DailyPlanner.Infrastructure`
  - EF Core data access, service implementations, external integrations (email/recaptcha/logging).

### Architectural Rules (MVP)
- Controllers depend on `Application` interfaces only.
- Service methods enforce ownership checks (user can access only own planner entities unless admin).
- Validation happens before service execution; reject malformed requests with clear 400 payloads.
- Soft defaults over advanced abstraction: optimize for maintainability and shipping speed.

## Core Data Model (MVP)
- `ApplicationUser`: identity, credentials, profile, security settings.
- `DailyTask`: title, notes, due/scheduled date, status, priority, recurrence metadata, user FK.
- `LongTermGoal`: goal metadata, target date, progress state, user FK.
- `GoalMilestone` and `GoalTask`: decomposition for incremental progress.
- `CalendarEvent`: schedule blocks tied to user and optional goal/task context.
- `UserSettings`: notification/timezone/preference state.
- `RefreshToken`/`UserDevice`: session lifecycle and revocation controls.

## API Contract Surface (MVP-Critical)
### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Daily Tasks
- `GET /api/dailytasks`
- `POST /api/dailytasks`
- `PUT /api/dailytasks/{id}`
- `DELETE /api/dailytasks/{id}`
- `PATCH /api/dailytasks/{id}/complete`

### Goals and Milestones
- `GET /api/longtermgoals`
- `POST /api/longtermgoals`
- `PUT /api/longtermgoals/{id}`
- `DELETE /api/longtermgoals/{id}`
- Milestone/task sub-routes for create/update/delete and progress state updates.

### Calendar
- `GET /api/calendarevents`
- `POST /api/calendarevents`
- `PUT /api/calendarevents/{id}`
- `DELETE /api/calendarevents/{id}`

### User and Settings
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/users/settings`
- `PUT /api/users/settings`

## Validation and Error Strategy
- Input validation via FluentValidation in `Application` layer.
- Consistent error envelope with validation details, correlation id, and status code.
- Authorization failures: strict `401` for unauthenticated, `403` for unauthorized.
- Domain not-found semantics: `404` with resource identifier context.

## Security and Auth Strategy (MVP)
- JWT access token + refresh token flow with expiry and revocation.
- Password reset tokens are short-lived and one-time use.
- CORS restricted to frontend origins only.
- Sensitive config in environment variables (JWT secret, DB string, SMTP credentials).

## Production Hardening Migration Plan
### Phase 1: Stabilize Existing Endpoints
- Verify route consistency and DTO compatibility for frontend usage.
- Remove/flag non-MVP endpoints from launch scope to reduce risk.
- Ensure null-handling and date/time behavior are deterministic (UTC policy).

### Phase 2: Data and Reliability
- Audit migrations and run clean apply on fresh database.
- Add indexes for common list/filter paths (user+date, user+status).
- Add idempotency safeguards for high-risk mutations (task completion updates).

### Phase 3: Observability and Guardrails
- Standardize structured logs and request correlation.
- Add health/readiness endpoints for deploy checks.
- Define backup + rollback runbook (DB snapshot + previous image deploy).

### Phase 4: Testing Gate
- Required: `dotnet test` green for backend solution.
- Add/confirm tests for auth flow, task CRUD, goal progress, calendar CRUD, and ownership authorization.
- Run manual smoke for full authenticated planner journey.

## Delivery Sequencing
1. Lock API contract and DTO shape for frontend integration.
2. Complete endpoint reliability pass (validation, errors, auth checks).
3. Execute migration/reliability hardening tasks.
4. Run test gate and smoke validation; file follow-up defects by severity.

## Exit Criteria
- Core auth/task/goal/calendar/settings APIs pass integration and smoke checks.
- Backend tests pass and no release-blocking defects remain.
- Migration + rollback procedure is documented and validated.
- Backend is ready for MVP launch handoff with known risks explicitly tracked.
