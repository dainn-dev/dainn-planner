# Architecture — cv-next

## Overview

cv-next la frontend multi-tenant cho nen tang CV hosting ca nhan. Moi user (sau khi duoc admin approve) co mot subdomain rieng `{slug}.dainn.online` — khi visitor truy cap, Next.js render public CV page voi data lay tu ASP.NET Core backend.

cv-next khong co database va khong co API routes rieng. No la pure rendering layer — moi data deu den tu `DailyPlanner.Api` backend qua HTTP.

## System Diagram

```
Visitor browser
      |
      | https://{slug}.dainn.online
      v
[Vercel Edge Network]
      |
      v
[Next.js Edge Middleware]  <- middleware.ts
   - Parse Host header
   - Extract tenant slug (e.g. "john" from "john.dainn.online")
   - Set x-tenant-slug request header
      |
      v
[Next.js App Router - SSR]  <- app/page.tsx
   - getTenantSlugFromRequest() reads x-tenant-slug
   - If no slug: return MarketingHome (apex domain)
   - If slug: fetch /api/v1/cv/site with X-Tenant-Slug header
      |
      | HTTP fetch
      v
[DailyPlanner.Api - ASP.NET Core]
   - Resolve site by slug
   - Return: { slug, theme: { presetKey, tokens }, content: {...} }
   - Or 404 if not found / not approved
      |
      | Response
      v
[Next.js SSR continues]
   - 404 response: render SiteUnavailable
   - OK response: resolve theme tokens, parse content
   - Render CvPublicPage with theme + content
      |
      v
[HTML sent to browser]
   - CvThemeShell injects CSS variables (--color-bg, --color-accent, ...)
   - CvContentProvider provides CV data to all client components
   - Client hydration: Sidebar, Contact form, AOS animations
```

## Components

### middleware.ts
- **Location:** `middleware.ts` (project root)
- **Role:** Edge function — parse Host header, set `x-tenant-slug` header
- **Key logic:** `parseTenantSlugFromHost()` — handle `.dainn.online` va `.localhost` subdomains

### lib/server/public-cv.ts
- **Location:** `lib/server/public-cv.ts`
- **Role:** SSR data fetching — goi backend, return typed `PublicCvPayload`
- **Output types:** `{ kind: "marketing" }` | `{ kind: "unavailable", slug }` | `{ kind: "cv", slug, theme, content }`

### Theme System
- **Location:** `lib/theme/`
- **Role:** Token-based theming
- `schema.ts` — 9 token keys (ThemeTokens Zod schema)
- `presets.ts` — built-in presets: "default" (Light), "midnight"
- `merge.ts` — `resolveThemeTokens()` merge preset + overrides; `tokensToCssVars()` → CSS variables

### CvPublicPage / CvThemeShell / CvContentProvider
- **Location:** `components/`
- **Role:** Layout + theme injection + data distribution
- `CvThemeShell` — inject CSS vars qua inline style
- `CvContentProvider` — React context cung cap CV data cho tat ca sections
- `useCvContentFromApi()` — hook cho client components

### CV Sections
- **Location:** `components/`
- **Pattern:** Server Component (`about.tsx`) boc Client Component (`about-content.tsx`)
- **Sections:** Hero, About, Facts, Skills, Resume, Portfolio, Services, Testimonials, Contact, Footer

### lib/api/cv.ts
- **Location:** `lib/api/cv.ts`
- **Role:** API URL builder — `cvUrl()`, `cvApi.*` endpoints, `cvFetchPublic()`

## Data Flow — Public CV Request

```
1. GET john.dainn.online/
2. middleware.ts: slug = "john", set x-tenant-slug: john
3. app/page.tsx (SSR):
   a. getTenantSlugFromRequest() → "john"
   b. fetch(NEXT_PUBLIC_API_BASE_URL + "/api/v1/cv/site", { X-Tenant-Slug: "john" })
   c. Parse response → PublicCvPayload
4. Render CvPublicPage:
   a. CvThemeShell: style="--color-bg: #f8fafc; --color-accent: #0ea5e9; ..."
   b. CvContentProvider: content = { profile, portfolio, skills, ... }
5. Client hydration: Sidebar reads profile from context, AOS init, Contact form ready
```

## Environment Variables

| Var | Mo ta | Vi du |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API origin | `http://localhost:5113` |
| `ROOT_DOMAIN` | Apex domain cho tenant parsing | `dainn.online` |

## External Services

| Service | Mo ta |
|---|---|
| DailyPlanner.Api | ASP.NET Core backend — owns PostgreSQL, CV data, themes, auth |
| Vercel | Hosting, edge functions, wildcard subdomain routing |
