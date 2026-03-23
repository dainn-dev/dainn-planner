# cv-next

Frontend multi-tenant cho nền tảng CV hosting cá nhân — mỗi subdomain `{slug}.dainn.online` serve một public CV page riêng, lấy data từ ASP.NET Core backend qua HTTP.

---

## Project Context

| | |
|---|---|
| **Stack** | Next.js 15.2.4, React 18, TypeScript (strict), Tailwind CSS 3, shadcn/ui (Radix), Zod |
| **Database** | Không có — cv-next là pure frontend, backend (`DailyPlanner.Api`) owns PostgreSQL |
| **Kien truc** | Multi-tenant by subdomain; `middleware.ts` extract slug → `x-tenant-slug` header; SSR fetch qua `lib/server/public-cv.ts` |
| **Deployment** | Vercel; wildcard `*.dainn.online` trỏ về cv-next |
| **Users** | Public visitors (doc CV), personal project |

**Luon nho:**
- cv-next **khong co DB**, khong co API routes rieng — chi goi backend qua `NEXT_PUBLIC_API_BASE_URL`
- Pattern: Server Component boc Client Component (vi du `Hero` → `HeroContent`, `About` → `AboutContent`)
- `useCvContentFromApi()` la cach duy nhat client components doc CV data
- Path alias `@/*` map to project root (`./*` trong `tsconfig.json`)
- `next.config.mjs` dang set `ignoreBuildErrors: true` va `ignoreDuringBuilds: true` — nen check type errors thu cong

---

## Lam viec voi Claude (DEV AGENT mode)

### Buoc 1 — Hieu Task
- Doc CLAUDE.md + `.claude/memory/MEMORY.md` + docs lien quan
- Neu chua ro: hoi tung cau mot, cho tra loi (max 3 cau)
- Dung quick options khi co the: "Option 1: ... Option 2: ... Option 3: Khac"

### Buoc 2 — Branch
- Kiem tra branch hien tai: `git branch --show-current`
- **Canh bao** neu user dang o feat/fix branch khac (co the quen chua checkout ve main/master)
- Hoi:
  - Option 1: Tao branch moi `feat/<slug>` hoac `fix/<slug>`
  - Option 2: Tiep tuc tren branch hien tai
  - Option 3: Khac

### Buoc 3 — Plan & Confirm

**Task nho** (1-3 file, it impact):
> "Toi se [mo ta ngan]. Duoc chua?"
Cho confirm moi lam.

**Task lon** (nhieu file, nhieu component):
Build plan day du:
- File nao tao/sua
- Test nao viet
- Dependency nao can
- Plan du context de chia cho sub-agent neu can
> "Day la plan: [plan]. Confirm de bat dau?"
Cho confirm moi lam.

### Buoc 4 — Implement

Khi code, luon kiem tra:
- **Security:** Input da validate chua? Co lo hong injection, auth bypass khong?
- **Cluster-safe:** Co dung in-memory state khong? Neu co → chuyen qua Redis
- **Performance:** Co N+1 query khong? Can cache khong? Batch duoc khong?
- **Pattern nhat quan:** Co theo dung module pattern cua codebase khong?
- **Side effects:** Thay doi nay co break feature/logic khac khong?
- **Deploy safety:** Code moi co anh huong den Vercel deploy khong?

### Buoc 5 — Test & Verify
- Chay `pnpm build` de check compile errors (ESLint/TS errors dang bi ignore trong next.config.mjs nen phai check thu cong)
- Neu co UI thay doi → dung `.claude/skills/ui-review.md`

---

## Project Structure

```
cv-next/
├── app/
│   ├── layout.tsx          # Root layout — fonts, ThemeProvider, Providers
│   ├── page.tsx            # Entry: routing marketing | unavailable | cv
│   ├── globals.css         # Base styles, CSS variables, section-title utility
│   ├── providers.tsx       # Client-side global providers
│   └── portfolio/[id]/     # Portfolio detail page (client component)
├── components/
│   ├── cv-public-page.tsx  # Full CV layout — wrap CvThemeShell + CvContentProvider
│   ├── cv-theme-shell.tsx  # Inject theme CSS variables via inline style
│   ├── cv-content-context.tsx # CvContentProvider + useCvContentFromApi hook
│   ├── marketing-home.tsx  # Apex domain — empty CV content
│   ├── site-unavailable.tsx # Slug chua approved / khong ton tai
│   ├── sidebar.tsx         # Fixed nav sidebar (client, reads profile from context)
│   ├── hero.tsx / hero-content.tsx
│   ├── about.tsx / about-content.tsx
│   ├── contact.tsx         # Contact form → POST /api/v1/cv/contact
│   └── ui/                 # shadcn/ui components (Radix-based)
├── lib/
│   ├── api/cv.ts           # API URL builder + cvFetchPublic
│   ├── cv-content.ts       # CvContentDocument type, rowToCvDoc, emptyCvDocument
│   ├── tenant.ts           # parseTenantSlugFromHost, RESERVED_SUBDOMAINS
│   ├── server/
│   │   ├── public-cv.ts    # SSR: fetch site payload → PublicCvPayload
│   │   └── tenant-request.ts # getTenantSlugFromRequest (reads x-tenant-slug header)
│   ├── theme/
│   │   ├── schema.ts       # ThemeTokens Zod schema, token keys
│   │   ├── presets.ts      # THEME_PRESETS (default/midnight), getPresetByKey
│   │   └── merge.ts        # resolveThemeTokens, tokensToCssVars
│   └── constants/
│       ├── platform.ts     # PENDING_SITE_PUBLIC_BEHAVIOR, AUTH_ROLES
│       ├── social-platforms.ts
│       └── ...
├── middleware.ts            # Edge: extract tenant slug → x-tenant-slug header
├── tailwind.config.ts       # Custom colors (primary=#149ddd, secondary=#173b6c), fonts
├── tsconfig.json            # strict: true, paths: @/* → ./*
└── next.config.mjs          # ignoreBuildErrors: true (check manually!)
```

---

## Key Commands

| Command | Mo ta |
|---|---|
| `pnpm dev` | Start dev server (localhost:3000) |
| `pnpm build` | Build production — dung de check TS/ESLint errors |
| `pnpm start` | Start production server |
| `pnpm lint` | Chay ESLint |

**Test local multi-tenant:** truy cap `http://{slug}.localhost:3000` — middleware se parse slug tu host.

---

## Skills

| Skill | Khi nao dung |
|---|---|
| `.claude/skills/nextjs-patterns.md` | Them component, page, hoac server/client logic |
| `.claude/skills/ui-review.md` | Sau khi thay doi UI |
| `.claude/skills/parallel-agents.md` | Task lon co nhieu phan doc lap |
| `.claude/skills/compress-context.md` | Context qua dai |
| `.claude/skills/testing.md` | Neu testing duoc them vao project |

---

## Memory System

Doc truoc khi bat dau task:
- `.claude/memory/MEMORY.md` — project state hien tai (< 200 lines)
- `.claude/memory/project.md` — stable facts ve project
- `.claude/memory/decisions.md` — architectural decisions da duoc dua ra

Cap nhat sau khi hoan thanh task:
- Update `MEMORY.md` neu project state thay doi
- Them vao `decisions.md` neu co architectural decision moi

---

## Git & GitHub

- Branches: `feat/<task>`, `fix/<task>`, `chore/<task>` (kebab-case, max 4 tu)
- Commits: nho, thuong xuyen, descriptive
- PR: tao khi task xong, bao gom change summary

---

## Code Conventions

- **Components:** Server Component mac dinh; them `"use client"` chi khi can interactivity/hooks
- **Pattern:** Server Component boc Client Component (vi du `Hero` → `HeroContent`)
- **CV data access:** Chi qua `useCvContentFromApi()` trong client components
- **API calls:** Dung `cvUrl()` + `cvApi.*` tu `lib/api/cv.ts`
- **Theme:** Tokens → `tokensToCssVars()` → CSS variables tren `CvThemeShell`
- **Imports:** Dung `@/` alias, khong dung relative imports dai
- **Types:** Zod schema cho validation, TypeScript interfaces cho internal types
- **Styling:** Tailwind utility classes; custom colors qua `tailwind.config.ts`

---

## Context Management

Khi context qua dai (nhieu messages, conversation cu):
Chay compress-context skill → summarize → archive → rewrite MEMORY.md
