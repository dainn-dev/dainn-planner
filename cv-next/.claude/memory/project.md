# Project Facts — cv-next

_Stable facts. Chi update khi project thay doi can ban._

## Description

cv-next la frontend cua nen tang CV hosting ca nhan. Moi user duoc cap mot subdomain `{slug}.dainn.online` (sau khi admin approve). Khi co request den subdomain, Next.js middleware extract slug → SSR fetch CV data tu ASP.NET Core backend → render public CV page.

Apex domain `dainn.online` → marketing home (empty CV content, no backend call).
Slug chua ton tai hoac chua approved → SiteUnavailable page.

## Tech Stack

| Thu | Mo ta |
|---|---|
| Next.js 15.2.4 | App Router, Server Components, Edge middleware |
| React 18 | UI framework |
| TypeScript (strict) | Type safety, path alias `@/*` |
| Tailwind CSS 3 | Styling (custom colors: primary=#149ddd, secondary=#173b6c) |
| shadcn/ui | Component library (full Radix UI set) |
| Zod | Schema validation cho theme tokens va CV content |
| next-themes | Dark/light mode support |
| Lucide React | Icons |
| pnpm | Package manager |

## Architecture

```
Browser
  ↓ {slug}.dainn.online
Next.js Edge Middleware
  ↓ x-tenant-slug header
Next.js App Router (SSR)
  ↓ fetch /api/v1/cv/site (X-Tenant-Slug header)
ASP.NET Core DailyPlanner.Api
  ↓ EF Core
PostgreSQL
```

**3 render paths:**
1. `kind: "marketing"` — apex domain, show MarketingHome (empty content)
2. `kind: "unavailable"` — slug khong ton tai / chua approved, show SiteUnavailable
3. `kind: "cv"` — show CvPublicPage voi theme + content tu backend

**Theme system:**
- Backend tra ve `{ presetKey, tokens }` cung voi site data
- `resolveThemeTokens()` merge preset + overrides
- `tokensToCssVars()` chuyen tokens thanh CSS variables
- `CvThemeShell` inject CSS vars qua inline style tren root div

## CV Sections (theo thu tu render)

Hero → About → Facts → Skills → Resume → Portfolio → Services → Testimonials → Contact → Footer

## API Overview (backend endpoints cv-next goi)

| Method | Path | Mo ta |
|---|---|---|
| GET | `/api/v1/cv/site` | Lay site data (theme + content) — requires `X-Tenant-Slug` header |
| GET | `/api/v1/cv/portfolio/:id` | Lay portfolio item detail |
| POST | `/api/v1/cv/contact` | Gui contact form |

## Key Components

| File | Vai tro |
|---|---|
| `middleware.ts` | Edge: parse Host → x-tenant-slug header |
| `lib/tenant.ts` | parseTenantSlugFromHost, RESERVED_SUBDOMAINS |
| `lib/server/public-cv.ts` | SSR fetch + routing logic |
| `lib/cv-content.ts` | CvContentDocument type, rowToCvDoc, emptyCvDocument |
| `lib/theme/schema.ts` | ThemeTokens Zod schema (9 token keys) |
| `lib/theme/presets.ts` | THEME_PRESETS: default (Light) + midnight |
| `lib/theme/merge.ts` | resolveThemeTokens, tokensToCssVars |
| `lib/api/cv.ts` | cvApi endpoints, cvUrl(), cvFetchPublic() |
| `components/cv-public-page.tsx` | Full CV page layout |
| `components/cv-theme-shell.tsx` | CSS variables injection |
| `components/cv-content-context.tsx` | CvContentProvider + useCvContentFromApi hook |
| `components/ui/` | shadcn/ui components (full set) |

## Infrastructure

- **Deployment:** Vercel
- **Wildcard DNS:** `*.dainn.online` → Vercel (cv-next)
- **Backend:** `api.dainn.online` → DailyPlanner.Api (ASP.NET Core)
- **Env vars required:** `NEXT_PUBLIC_API_BASE_URL`, `ROOT_DOMAIN`

## Conventions

- Server Component mac dinh, `"use client"` chi khi can interactivity
- Server Component boc Client Component (vi du Hero → HeroContent)
- CV data trong client: chi qua `useCvContentFromApi()` hook
- API calls: `cvUrl(cvApi.xxx)` — khong hardcode URL
- Imports: `@/` alias, khong dung relative imports dai
- Theme: tokens → CSS variables — khong dung arbitrary CSS values truc tiep
