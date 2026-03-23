# cv-next — Memory

**Stack:** Next.js 15.2.4 + React 18 + TypeScript + Tailwind + shadcn/ui | **Backend:** ASP.NET Core (DailyPlanner.Api) | **Deploy:** Vercel

**Luon nho:**
- cv-next khong co DB, khong co API routes — chi goi backend qua `NEXT_PUBLIC_API_BASE_URL`
- Server Component boc Client Component pattern (Hero → HeroContent, About → AboutContent)
- `useCvContentFromApi()` — cach duy nhat client components doc CV data
- `next.config.mjs` ignore TS/ESLint errors → phai chay `pnpm build` de check thu cong
- Path alias `@/*` → project root

**Mode:** DEV AGENT

---

## Current State

- Status: freshly initialized by Blueberry Sensei
- Active branch: master
- Last task: initial setup (Blueberry Sensei config generation)

## Key Components

| File | Vai tro |
|---|---|
| `app/page.tsx` | Entry point — route marketing / unavailable / cv |
| `lib/server/public-cv.ts` | SSR fetch site payload tu backend |
| `middleware.ts` | Edge: extract tenant slug → `x-tenant-slug` header |
| `components/cv-public-page.tsx` | Full CV layout (9 sections) |
| `lib/theme/` | Theme token system (schema, presets, merge, CSS vars) |
| `lib/api/cv.ts` | API URL builder |

## In Progress

(none)

## Recent Decisions

Xem `.claude/memory/decisions.md`

---

_Keep this file under 200 lines. Archive old context with compress-context skill._
