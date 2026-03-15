# dainn-planner MVP Integration, QA, and Release Readiness Plan

Date: 2026-03-15  
Owner: CEO 2  
Source issue: DIA-3

## Objective
Ship a production-ready MVP by integrating frontend and backend end-to-end, validating core user journeys with automated and smoke tests, and enforcing a repeatable release checklist.

## Integration Scope (MVP-critical)
- Frontend `src/services/api.js` points to backend API base URL for all authenticated planner flows.
- Backend API + DB migrations are bootable in a clean environment using documented setup.
- Core flows verified end-to-end:
  - Auth: register/login/reset-password.
  - Daily tasks: create/edit/complete/delete.
  - Goals: create/view/update progress.
  - Calendar events: create/view/update/delete.
  - Settings/profile: load/update preferences and profile.

## Execution Plan
### Phase 1: Environment and Contract Alignment
- Confirm backend runs locally and migrations apply successfully.
- Confirm frontend runs and points at backend without CORS failures.
- Lock MVP API contract expectations for auth/tasks/goals/calendar/settings.

### Phase 2: Integration Hardening
- Resolve API mismatch defects (payload shape, validation, error mapping, auth headers).
- Normalize frontend error handling and empty/loading/success states for core pages.
- Ensure refresh-token/session handling is consistent across route transitions.

### Phase 3: Automated QA Baseline
- Backend automated validation:
  - Run `dotnet test` in `backend`.
  - Ensure core service-level tests cover auth, user, task, goal, calendar, and admin behavior.
- Frontend automated validation:
  - Run `pnpm test -- --watch=false` in `frontend`.
  - Add/update tests for planner-critical interaction paths (task and goal flows first).

### Phase 4: Smoke Validation (Pre-release Gate)
- Run manual smoke script in a clean environment:
  1. Start backend and frontend.
  2. Register/login as non-admin user.
  3. Create/edit/complete/delete a task.
  4. Create a goal and update milestone progress.
  5. Create/update/delete a calendar event.
  6. Update profile/setting and verify persistence after refresh.
  7. Validate logout/login roundtrip.
- Log defects by severity (`critical`, `high`, `medium`, `low`) and block release on unresolved `critical`/`high`.

## Release Readiness Checklist (Launch)
- Environment
  - Database migration runs cleanly from current main branch.
  - Required env vars configured (DB connection, JWT key, CORS origins, mail settings as applicable).
- Quality
  - Backend tests pass.
  - Frontend tests pass.
  - Smoke checklist fully passed.
  - No open `critical` or `high` defects.
- Security and Reliability
  - JWT/auth flows validated (login, refresh, logout).
  - Unauthorized routes/API return expected 401/403 behavior.
  - Error logs writable and monitored (Serilog paths configured).
- Operations
  - Rollback steps documented (previous build + DB rollback/backup approach).
  - One responsible owner assigned for release command and post-release monitoring window.

## Exit Criteria
- End-to-end MVP flows run successfully against the same backend instance.
- Automated tests are green for backend and frontend.
- Smoke checklist is complete with no release-blocking issues.
- Release checklist is signed off by delivery owner.

## Immediate Next Steps
1. Execute Phase 1 and Phase 2 integration checks in the active branch.
2. Run automated tests and capture failures into prioritized issues.
3. Run smoke checklist and convert defects to tracked tickets.
4. Approve go/no-go for launch based on checklist outcome.
