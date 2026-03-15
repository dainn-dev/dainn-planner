# dainn-planner MVP Frontend Planner Experience Plan

Date: 2026-03-15  
Owner: CEO 2  
Source issue: DIA-5

## Objective
Deliver a functional, reliable MVP planner UI in `frontend` where users can create, view, edit, complete, and delete planning artifacts with predictable loading, empty, success, and error states.

## Current Baseline (repo-aligned)
- Existing authenticated planner routes: `/daily`, `/goals`, `/goals/:id`, `/calendar`, `/settings`.
- Existing API layer in `src/services/api.js` with task and goal service clients.
- Existing page-level implementations for daily tasks, goals, goal detail, and calendar.
- Existing component system for forms, messages, header/sidebar, and protected routes.

## MVP UX Scope (Must-Have)
### Daily Planning
- List daily tasks with fast add/edit/delete/complete interactions.
- Clear task status cues (pending/completed) and lightweight filtering.
- Inline validation and actionable error messages for failed actions.

### Goal Tracking
- Goals list supports create/edit/delete and visible progress signals.
- Goal detail supports milestone/task updates and progress recalculation feedback.
- Empty states guide first-time users to create their first goal/milestone.

### Calendar Planning
- Event create/view/edit/delete with stable date/time rendering.
- Event states remain coherent after route reload/navigation.
- Category/color mapping remains consistent across calendar interactions.

## UX State Standards (Required on all MVP planner pages)
- Loading: non-blocking skeleton/spinner where data is fetched.
- Empty: instructional state with a clear next action.
- Success: optimistic or immediate confirmation pattern for mutations.
- Error: concise, user-facing error with retry path.
- Network fallback: preserve user input on failed submit where possible.

## API Integration Contract Alignment
- `tasksAPI`: `getTasks`, `createTask`, `updateTask`, `completeTask`, `deleteTask`.
- `goalsAPI`: goal CRUD + milestone toggles and detail fetch.
- Calendar API methods must align with backend contract and shared date formats.
- Standardize response normalization in page adapters to avoid per-page shape drift.

## Implementation Plan
### Phase 1: Route-by-Route Audit
- Audit `DailyPage`, `GoalsPage`, `GoalDetailPage`, and `CalendarPage` for CRUD completeness.
- Identify missing/loading/error state gaps and inconsistent interaction behaviors.
- Confirm auth-expiry handling sends users through consistent session recovery/login flow.

### Phase 2: Interaction Hardening
- Normalize form validation and disabled/loading button behavior during submits.
- Ensure mutation errors surface through shared message components.
- Remove stale UI state after failed optimistic updates.

### Phase 3: Responsiveness and Usability
- Verify mobile/desktop usability for planner-critical pages.
- Improve information hierarchy for task lists and goal progress surfaces.
- Ensure tap targets and keyboard accessibility are acceptable for MVP.

### Phase 4: Quality Gate
- Add/update tests for task CRUD and goal/milestone interactions.
- Execute frontend test suite and resolve planner-critical failures.
- Run manual smoke against live backend for daily-goal-calendar flows.

## Definition of Done
- Users can complete full planner CRUD journeys on tasks, goals, and calendar events.
- Planner pages consistently show loading/empty/success/error states.
- No unresolved critical/high UX defects in planner flows.
- Frontend test pass + manual smoke validation completed.

## Immediate Next Steps
1. Execute Phase 1 audit and file any scope gaps as tracked issues.
2. Implement Phase 2 hardening on highest-traffic planner interactions first (`/daily`, `/goals`).
3. Run quality gate and convert residual defects into prioritized follow-up tickets.
