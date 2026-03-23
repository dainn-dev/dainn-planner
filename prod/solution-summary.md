# CV platform — production-oriented solution summary

This document captures the agreed direction for **cv-next** (and related hosting): multi-tenant CVs by subdomain, **platform admin approval** for new sites, **users editing their own CV** and **choosing a CV theme**, minimal APIs, and replacing Firebase with a persistent store.

---

## Architecture: backend owns APIs and Postgres

| Layer | Responsibility |
|-------|----------------|
| **`backend/`** (e.g. **ASP.NET Core** in `DailyPlanner.Api` or a dedicated **CV API** project) | **Define and host all CV domain HTTP APIs** (public site payload, auth, admin, themes, notifications). **Only the backend** opens connections to **Postgres** (e.g. **EF Core**, migrations, repositories). Enforces authz, validation, theme merge, and transactional site approval. |
| **Postgres** | Persistence for `users`, `sites`, `cv_documents`, `notifications`, optional `cv_theme_presets`. **No direct access from cv-next.** |
| **`cv-next` (Next.js)** | **UI**: marketing, subdomain CV pages, user dashboard, platform admin UI. Calls the backend via **`fetch`/server actions** using a configured **`API_BASE_URL`** (and cookies / `Authorization` for session or JWT). **Does not** use the Postgres driver or embed DB connection strings. |

**Contact and transactional email** are implemented in **`backend/`** only; **cv-next** does not configure SMTP or send mail.

**Tenant header:** For local dev or SSR, cv-next may forward **`Host`** or a derived **`X-Tenant-Slug`** to the backend on **`GET …/site`** so the API resolves the correct site without trusting client body.

---

## Roles

| Role | Purpose |
|------|---------|
| **Platform admin** | Staff: see **all CV sites / requests**, **approve** or **reject** new site creation; optional suspend. |
| **User (site owner)** | Authenticated account: **request** a CV site (slug), **update CV content**, **set CV theme** (preset ± safe overrides) for their own site only. |

Public visitors only **read** approved sites via subdomain.

---

## Product model

- Each **approved** site is served at **`{slug}.dainn.online`** (e.g. `anhnh.dainn.online`, `lmthu.dainn.online`).
- **Hostname** selects the tenant; public pages load **only** that site’s data **if** the site is **approved** (and not suspended).
- **Apex** `dainn.online`: marketing, signup, and links to user dashboard — implementation choice.

### Lifecycle: request → review → live

1. User signs up / logs in and submits **Create CV site** with desired **`slug`** (and any required profile fields).
2. Site record is **`pending`** until a platform admin acts.
3. **Approve:** `slug` is reserved, status **`approved`**, subdomain serves public site data via **backend** `GET …/site` (see API surface).
4. **Reject:** status **`rejected`**, optional **`rejection_reason`** shown to the user; slug freed for reuse if you allow resubmit.

**One user = one site row (v1):** Each user may have **at most one** row in **`sites`**. First submission **inserts**; **resubmit** after reject (or **edit slug** while still pending) **updates** that same row. There is **no second concurrent “create CV site” request** for the same account.

**Draft content:** Owner may **edit CV sections** while **`pending`** (stored in `cv_documents`); **public** subdomain either returns **404 / “not published”** or a minimal placeholder until **approved** — pick one policy and document it in the API.

### CV themes (per site)

- Each **site** has a **theme** that controls **public CV appearance** — **not** arbitrary user CSS (avoid XSS and broken layouts).
- **Theme is defined as structured data:** a fixed **token contract** (semantic keys → string values, usually CSS values). **Presets** and **per-site rows** both conform to that contract — see **Theme registry & data contract** below.
- **v1:** **Preset-only** — `sites.theme_preset_key` points at a row/file in the **registry**; resolved **`tokens`** power the public UI.
- **v2 (optional):** **`sites.theme_overrides`** — JSON that may only contain **keys from the same contract**, validated and merged **server-side** over the preset defaults.

---

## Platform admin dashboard (staff)

**Primary view:** **list of CV sites / requests** (not the per-section CV editor).

| Capability | Description |
|------------|-------------|
| **List** | Table or cards: `slug`, owner email, `status`, requested date, optional last updated. |
| **Filter** | By `pending` / `approved` / `rejected` / `suspended`. |
| **Approve** | Transition `pending` → `approved`; ensure `slug` unique among approved sites. **Then** notify the owner (**email** + **in-app**). |
| **Reject** | Transition to `rejected` + store reason for the user. **Then** notify the owner (**email** + **in-app**), including the reason in both where appropriate. |
| **Optional** | Suspend approved site (`suspended`) without deleting data; consider same **email + in-app** pattern. |

**Auth:** real **platform-admin** authentication (role flag or separate admin allowlist). **Do not** rely only on IP / URL key for staff actions.

**Side effects:** Approve/reject handlers should be **transactional** for DB updates first, then **best-effort** email (queue/retry) so a mail failure does not roll back the decision. In-app notification should be written in the same successful path as the status change (or same transaction if same DB).

---

## User dashboard (CV owner)

- **Separate area** from platform admin, e.g. `/dashboard` or `app.dainn.online` (not the same as staff `/admin` unless role-gated).
- User can:
  - **Submit** the **only** allowed site request (first time), or **update** that same request while **`pending`** / after **`rejected`** (same `sites` row — see validation below).
  - **Update CV content** (same sections as today: profile, portfolio, skills, testimonials, facts, services, education, experience, certificates) for **`user_id`** in session.
  - **Choose a CV theme** (preset from catalog; optional limited overrides in v2) with **live preview** on dashboard before save.
  - See **in-app notifications** (bell / list): **unread** count, mark read; shows **site approved** / **site rejected** (and optional suspend).
- **`PUT`** APIs must enforce **owner-only**: `user_id` from session, never from client-supplied tenant id alone.

---

## Tenant resolution (public site)

1. Read **`Host`** (e.g. `anhnh.dainn.online`).
2. Parse **subdomain** = label before base domain (`dainn.online`).
3. Resolve **`sites`** (or equivalent) where **`slug` = subdomain** and **`status` = approved** (and not suspended).
4. Load **`cv_documents`** for that site’s **`owner_user_id`**.
5. Apply **theme** from **`sites`** (preset key + optional validated overrides) on the public layout — see **Rendering** below.

If not found or not approved → **404** or branded “site not available”.

**Next.js:** `middleware` / server loaders derive tenant from `Host`; **no** trust of client body for public tenant selection.

**Reserved subdomains:** `www`, `admin`, `api`, `app`, `dashboard`, `mail`, etc.

---

## Data model (recommended)

### `users`

| Column | Notes |
|--------|--------|
| `id` | UUID PK |
| `email` | Unique; login |
| `password_hash` / OAuth ids | As per auth stack |
| `role` | `user` \| `platform_admin` (or separate `admin_users` table) |
| `created_at` | |

### `sites` (one row per CV site / request)

| Column | Notes |
|--------|--------|
| `id` | UUID PK |
| `owner_user_id` | FK → `users.id` |
| `slug` | Desired / assigned subdomain label; **unique among non-rejected** or unique globally — define rule |
| `status` | `pending` \| `approved` \| `rejected` \| `suspended` |
| `rejection_reason` | Text; shown to owner when rejected |
| `requested_at` | |
| `reviewed_at` | |
| `reviewed_by_user_id` | FK → platform admin `users.id`, nullable |
| `theme_preset_key` | Text; FK or check against **allowlist** (e.g. `default`, `midnight`). **NOT NULL** with DB default `default`. |
| `theme_overrides` | JSONB, nullable; **v2** only — validated token overrides |
| `updated_at` | |

**Constraint (required):** **`UNIQUE (owner_user_id)`** — exactly **one** `sites` row per user. Enforce in the database so the rule cannot be bypassed by a buggy client or double-submit.

### Validation: one CV site request per user

| Rule | Behavior |
|------|----------|
| **DB** | `UNIQUE (owner_user_id)` on **`sites`**. |
| **`POST …/me/site/request`** (backend) | If the user has **no** row → **INSERT** (`pending`). If a row exists and status is **`pending`** or **`rejected`** → **UPDATE** `slug` (and any allowed fields), set `pending` if resubmitting from `rejected`. If status is **`approved`** or **`suspended`** → **409 Conflict** (user already has a site; use content APIs or support flow — no second request). |
| **Concurrency** | Use a transaction or rely on **unique constraint** and map duplicate insert to **409**. |
| **Slug uniqueness** | Still enforce globally (or among non-rejected) so two users cannot claim the same `slug` when active/pending. |

### `cv_documents` (one row per owner — JSONB)

| Column | Notes |
|--------|--------|
| `user_id` | PK/FK → `users.id` (unique) — **owner** of the content |
| `profile`, `portfolio`, `skills`, `testimonials`, `facts`, `services` | JSONB |
| `education`, `experience`, `certificates` | JSONB arrays |
| `updated_at` | |

Public reads join **`sites`** (approved) → **`cv_documents`** (`owner_user_id`).

### `cv_theme_presets` (optional catalog in DB)

If presets are **not** only hardcoded in the app:

| Column | Notes |
|--------|--------|
| `key` | PK, stable id (`midnight`, …) |
| `label` | Display name |
| `tokens` | JSONB — must satisfy **theme token contract** (same keys as API `theme.tokens`) |
| `theme_schema_version` | Int; bump when token keys change (migrations / compatibility) |
| `sort_order` | Picker order |
| `is_active` | Hide deprecated presets without breaking existing sites |

Alternatively, ship presets as **versioned JSON or TS modules** in the repo; each file exports **`key` + `tokens`** that satisfy the contract. Validate **`sites.theme_preset_key`** only against that registry.

### `notifications` (in-app, per user)

| Column | Notes |
|--------|--------|
| `id` | UUID PK |
| `user_id` | FK → `users.id` (recipient) |
| `type` | e.g. `site_approved` \| `site_rejected` \| `site_suspended` |
| `title` | Short label for UI |
| `body` | Plain text or short HTML-safe summary |
| `payload` | JSONB: `site_id`, `slug`, `rejection_reason` (if reject), link paths |
| `read_at` | Nullable; **null** = unread |
| `created_at` | |

Index **`(user_id, read_at, created_at)`** for “recent unread” queries.

---

## Theme registry & data contract (define + manage, aligned with storage)

Themes are **managed as data** end-to-end: **registry** (definitions) + **site** (selection + overrides) + **API** (resolved output) all use the **same shape**.

### 1. Single token contract (source of truth for “what keys exist”)

- Maintain one **canonical list of semantic token keys** used by CV layouts (e.g. `--color-bg`, `--color-surface`, `--color-accent`, `--color-text`, `--color-text-muted`, `--font-heading`, `--font-body`, `--radius-md`, `--shadow-card`). In data, store as **camelCase or kebab keys** consistently, e.g. JSON object `tokens`.
- Document the contract as **`theme.schema.json`** (JSON Schema) or **Zod** in the repo so:
  - **Preset** `tokens` in DB/code are validated on **deploy** or **admin save**.
  - **`sites.theme_overrides`** (v2) is validated on **`PATCH …/me/site/theme`** (backend) (reject unknown keys).
  - **`GET …/site`** response `theme.tokens` is always a **full merged** object satisfying the contract (**backend** fills missing keys from preset defaults).

**Rule:** UI components must **only** consume **contract keys** (via CSS variables mapped from `tokens`). No random hex fields outside the schema.

### 2. How definitions map to stored data

| Piece | Where it lives | What it stores |
|-------|----------------|----------------|
| **Preset definition** | `cv_theme_presets` row **or** `themes/{key}.json` in repo | `key`, `label`, **`tokens`** (full default map per contract), optional `theme_schema_version` |
| **Site choice** | **`sites.theme_preset_key`** | Foreign reference to **`key`** (allowlist / FK) |
| **Site tweaks (v2)** | **`sites.theme_overrides`** | **Partial** `tokens` object; same key set as contract, subset of values only |

**Resolve order (backend):** `mergedTokens = deepMerge(preset.tokens, validate(overrides))` → attach to **`GET …/site`** and **`GET …/me/site`** responses.

### 3. Managing presets (operations)

| Action | Steps |
|--------|--------|
| **Add preset** | Add definition (DB insert or new JSON file) → ensure **`key`** in allowlist → set **`is_active`** / ship → expose in backend **`GET …/themes`**. |
| **Edit preset tokens** | Update definition; all sites with that **`theme_preset_key`** pick up new defaults on next resolve (or bump **`sites.updated_at`** to invalidate cache). |
| **Disable preset** | Set **`is_active = false`**; remove from picker. Existing **`sites.theme_preset_key`** still resolve until you **migrate** those rows to another key. |
| **Change contract (new keys)** | Bump **`theme_schema_version`**; add defaults for new keys in every preset; optional DB migration for old rows; keep backward compatibility or one-shot migrate **`theme_overrides`**. |

### 4. API payloads (match the same data)

All implemented on the **backend**; paths below are **logical** — prefix with your API version/base (e.g. `/api/v1/cv`).

- **`GET …/themes`** — list for picker: `key`, `label`, `sortOrder`, optional **`previewTokens`** (small subset, e.g. `accent` + `bg` only) so list stays small. Full **`tokens`** optional per item if needed for client-only preview without duplicating registry.
- **`GET …/site`** / **`GET …/me/site`** — `theme: { presetKey, schemaVersion?, tokens: { ...full merged } }` so the client and SSR never guess merge rules.
- **`PATCH …/me/site/theme`** — body `{ presetKey, overrides? }`; **backend** validates **`presetKey`** against registry and **`overrides`** against **partial** contract schema.

### 5. Optional: theme assets

If presets reference **fonts or images**, store **URLs or font family names** only as **values inside `tokens`** or a nested **`assets`** object **also** described in the same JSON Schema — keeps one validation path.

---

## Notifications: email + in-app (approve / reject)

When a platform admin **approves** or **rejects** a site request (and optionally **suspends**):

| Channel | Behavior |
|---------|----------|
| **Email** | Send to **`users.email`** for the **site owner**. **Approve:** include public URL `https://{slug}.{ROOT_DOMAIN}` and short “next steps” (e.g. finish your CV). **Reject:** include **`rejection_reason`** and link to dashboard to edit/resubmit. Use transactional templates; send from **backend** (same mail stack as **`POST …/contact`**) or a provider (Resend, SES, etc.). **Async/queue** recommended; log failures; optional retry. |
| **In-app** | **Insert** one row in **`notifications`** for **`owner_user_id`**. Dashboard shows badge + list; **`GET …/me/notifications`** (and **`PATCH …/read`** or mark-all-read) on the **backend**. |

**Duplicate safety:** Idempotency key on admin action (e.g. `site_id` + `reviewed_at`) or “only one notification per status transition” if admins can re-open edge cases.

**Optional later:** push (web push / mobile) using the same event hook.

---

## CV themes: rendering & validation

### Public rendering

- **Backend `GET …/site`** (cv-next SSR calls it with tenant context) returns a **`theme`** object matching **Theme registry & data contract**: `{ "presetKey": "midnight", "schemaVersion?": 1, "tokens": { ...merged } }` where **`tokens`** are the **full** resolved map (preset + validated overrides).
- Root layout for the CV subdomain sets **`data-theme="{presetKey}"`** and/or **`style={{ ...cssVars }}`** from **`tokens`**. All CV UI reads **semantic tokens** (`--color-bg`, `--color-accent`, `--font-body`, …), not ad-hoc hex in components.
- **Dark/light:** each preset may define both or document as dark-only; optional user-facing **appearance** toggle is a separate product decision (would still map to token sets).

### Validation (writes)

- **`theme_preset_key`:** must be in **allowlist** (DB FK to `cv_theme_presets` or shared enum in API layer).
- **`theme_overrides`:** optional v2 — schema validate (Zod / JSON Schema); strip unknown keys; constrain colors to regex or token references; max object size.

### Caching

- Public pages can cache by **`slug` + theme version** (or `updated_at` on `sites`) to avoid stale styles after theme change.

---

## API surface (implemented in `backend/`, not in Next.js)

**Convention:** expose under a stable base path (e.g. **`https://api.dainn.online/api/v1/cv`** or **`/api/cv/v1`** on the same API host as Daily Planner). **cv-next** calls these URLs; it does **not** query Postgres.

**Auth:** cookie session, **JWT** `Authorization: Bearer`, or **opaque token** — chosen stack lives in the backend; Next forwards credentials on `fetch`.

### Public (read-only, tenant from `Host` or `X-Tenant-Slug`)

- **`GET …/site`** — full JSON for **approved** tenant only; includes **`theme`** (resolved preset + tokens). **404** if not approved. Backend resolves tenant from forwarded **`Host`** / slug header (trusted from SSR or edge only).
- **`GET …/themes`** — **public** list of **active** presets (`key`, `label`, optional thumbnail); no secrets.

### User (authenticated owner)

- **`GET …/me/site`** — current user’s site row + content + **theme** (or split meta + content).
- **`PATCH …/me/site/theme`** — body: `{ "presetKey": "..." , "overrides?": { ... } }`; owner-only; validate allowlist + schema; persists to **`sites`** via EF/repository.
- **`GET …/me/notifications`** — paginated list; optional `?unread=1`.
- **`PATCH …/me/notifications/:id/read`** — mark one read (or **`POST …/me/notifications/read-all`**).
- **`PUT …/me/site/content`** — replace **own** `cv_documents` only (validate schema).
- **`POST …/me/site/request`** — **upsert** the **single** `sites` row for the user (same rules as doc: **409** when **`approved`** / **`suspended`**).

### Platform admin (authenticated + role)

- **`GET …/admin/sites`** — list sites with filters (`status`, pagination, search).
- **`POST …/admin/sites/:id/approve`** — approve → DB transaction → **notification** row → **enqueue email**.
- **`POST …/admin/sites/:id/reject`** — body: `{ "reason": "..." }`; same side effects.
- **`POST …/admin/sites/:id/suspend`** — optional.

### Other

- **`POST …/contact`** — **backend** only (same API host): rate limits, validation, optional per-tenant `to`.

**Portfolio item detail**

- **`GET …/portfolio/{id}`** — scoped to **tenant** resolved from `Host`; backend reads **`cv_documents.portfolio`** for that site.

**Real-time:** refetch after save or optional SSE from backend later.

**OpenAPI:** generate **OpenAPI/Swagger** from the backend for cv-next and mobile clients.

---

## Security

- **Platform admin** routes: require **`role = platform_admin`** (or equivalent).
- **User** routes: **`user_id` from session**; never elevate via `slug` or `userId` in body.
- **Public** routes: no write; reads only for **approved** sites.
- **Themes:** no raw user CSS; only **preset keys** and **validated** override objects; prevent open redirects or script injection via theme payloads (treat as data, escape in HTML if any string fields).
- Legacy **IP / query key** on `/admin` is **not** sufficient for production staff tools — replace with proper auth + role checks.

---

## Infrastructure

- **DNS:** wildcard `*.dainn.online` → **cv-next** (or CDN); **api** subdomain → **backend** if split.
- **TLS:** wildcard cert for `*.dainn.online`.
- **Env (cv-next):** `ROOT_DOMAIN`, **`API_BASE_URL`** (backend origin); no Postgres URL, **no SMTP**.
- **Env (backend):** Postgres connection string, JWT secrets, SMTP or email provider, `ROOT_DOMAIN` for link generation in emails.
- **Email:** transactional sender (from address, templates for **site approved** / **site rejected**); queue from **backend** recommended.

---

## Migration from legacy Firestore exports

- Seed **`users`**, **`sites`** (`approved`, **`theme_preset_key = 'default'`**), **`cv_documents`** for existing single-tenant data.
- If using **`cv_theme_presets`**, seed rows to match code-defined presets or migrate keys.
- Optional one-time import: **backend** **`POST …/admin/migration/firestore`** accepts Firestore-export-shaped JSON (`sites` / `documents` arrays); **cv-next** no longer uses Firebase.

---

## Summary checklist

| Item | Decision |
|------|----------|
| **API + DB** | **All CV domain HTTP APIs and Postgres access live in `backend/`** (ASP.NET Core + EF Core or equivalent). **cv-next** is UI + `API_BASE_URL` client only. |
| Tenant key | Subdomain → **`sites.slug`** where **`approved`** (resolved in **backend**) |
| Content | **`cv_documents`** in Postgres per **`owner_user_id`** (JSONB v1) |
| Platform admin UI | **List sites** + **approve / reject** (and optional suspend) — calls **backend** |
| User UI | **Dashboard**: **one** site request per user + **edit own CV content** + **theme picker / preview** — calls **backend** |
| Themes | **Contract** + **registry** + **`sites`** columns; **`GET …/themes`**, **`PATCH …/me/site/theme`**, **`theme`** on **`GET …/site`** (merged **`tokens`**) — all **backend** |
| Site requests | **`UNIQUE (owner_user_id)`** + **409** if already **approved** / **`suspended`** |
| Public API | **`GET …/site`** (Host / tenant header), **404** if not approved |
| User API | **`GET`/`PUT`/`PATCH …/me/...`** — session/JWT on **backend** |
| Admin API | **`GET …/admin/sites`** + approve/reject — **backend** |
| Approve/reject | **Email** + **`notifications`** row; orchestrated in **backend** |
| Contact | **`POST …/contact`** on **backend** only; no SMTP in cv-next |
| Firebase (client) | **Removed from cv-next**; CV data is API + Postgres only |

---

*Last updated: 2026-03-23 — design notes for dainn-planner / cv-next + backend API.*
