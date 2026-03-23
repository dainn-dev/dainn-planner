# Architectural Decisions

_Them decisions vao day khi chung duoc dua ra._

---

## Decision: Next.js App Router

**Date:** 2026-03-23
**Decision:** Dung Next.js App Router (app/) thay vi Pages Router
**Reason:** SSR tren Server Components, edge middleware, streaming — phu hop voi multi-tenant render pattern
**Alternatives considered:** Pages Router — khong chon vi kem linh hoat hon voi Server Components

---

## Decision: No database in cv-next

**Date:** 2026-03-23
**Decision:** cv-next khong co DB connection, khong co ORM — la pure frontend goi ASP.NET Core backend
**Reason:** Separation of concerns; backend (DailyPlanner.Api) owns PostgreSQL va business logic; cv-next chi la rendering layer
**Alternatives considered:** Next.js API routes voi direct DB — bi tu choi de tranh duplicate logic va connection overhead

---

## Decision: Multi-tenant by subdomain

**Date:** 2026-03-23
**Decision:** Tenant slug duoc extract tu Host header tai Edge middleware, truyen qua `x-tenant-slug` header xuong SSR
**Reason:** Moi user co URL rieng ({slug}.dainn.online), khong can login de xem public CV
**Alternatives considered:** Path-based routing (/cv/{slug}) — khong chon vi kem professional hon

---

## Decision: Token-based theme system

**Date:** 2026-03-23
**Decision:** Theme duoc dinh nghia la structured tokens (9 keys: colorBg, colorSurface, colorAccent, colorText, colorTextMuted, fontHeading, fontBody, radiusMd, shadowCard) inject qua CSS variables
**Reason:** Tranh arbitrary user CSS (XSS risk, broken layouts); dung preset + safe overrides
**Alternatives considered:** Arbitrary CSS / Tailwind config override — bi tu choi vi security risk

---

## Decision: shadcn/ui component library

**Date:** 2026-03-23
**Decision:** Dung toan bo shadcn/ui component set (Radix UI primitives + Tailwind)
**Reason:** Accessible, customizable, khong phu thuoc vao external CDN
**Alternatives considered:** N/A — inferred from existing code

---

## Decision: Vercel deployment

**Date:** 2026-03-23
**Decision:** Deploy cv-next len Vercel voi wildcard domain `*.dainn.online`
**Reason:** Native Next.js support, edge runtime, zero-config wildcard subdomain routing
**Alternatives considered:** N/A — inferred from project setup

---
