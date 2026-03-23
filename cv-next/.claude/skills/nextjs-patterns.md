# Next.js Patterns — cv-next

Tham khao khi them component, page, hoac server/client logic.

## Server vs Client Component

**Mac dinh: Server Component.** Chi them `"use client"` khi:
- Dung React hooks (useState, useEffect, useContext, ...)
- Can browser APIs (window, document, ...)
- Can event handlers (onClick, onChange, ...)

```tsx
// Server Component (mac dinh) — khong co "use client"
export default function MySection() {
  return <section id="my-section">...</section>
}

// Client Component
"use client"
export default function MyInteractiveWidget() {
  const [state, setState] = useState(...)
  ...
}
```

## Pattern: Server Component boc Client Component

Dung pattern nay de giu phan lon cay la Server Component:

```tsx
// hero.tsx — Server Component (boc)
import { Suspense } from "react"
import HeroContent from "./hero-content"

export default function Hero() {
  return (
    <section id="hero" className="...">
      <Suspense fallback={<HeroLoading />}>
        <HeroContent />
      </Suspense>
    </section>
  )
}

// hero-content.tsx — Client Component (con)
"use client"
export default function HeroContent() {
  const apiCv = useCvContentFromApi()
  // ... interactive logic
}
```

## Doc CV Data trong Client Components

**Chi dung `useCvContentFromApi()`** — khong fetch truc tiep tu client:

```tsx
"use client"
import { useCvContentFromApi } from "@/components/cv-content-context"

export default function MyContent() {
  const apiCv = useCvContentFromApi()
  const profile = apiCv?.content?.profile as Record<string, unknown> | null | undefined
  // ...
}
```

## Them CV Section Moi

1. Tao `components/my-section.tsx` (Server Component):
```tsx
import { Suspense } from "react"
import MySectionContent from "./my-section-content"

export default function MySection() {
  return (
    <section id="my-section" className="py-16">
      <div className="container mx-auto px-4">
        <Suspense fallback={<p>Loading...</p>}>
          <MySectionContent />
        </Suspense>
      </div>
    </section>
  )
}
```

2. Tao `components/my-section-content.tsx` (Client Component)
3. Them vao `components/cv-public-page.tsx` va `components/marketing-home.tsx`
4. Them nav item vao `components/sidebar.tsx` neu can

## API Calls

**Tren Server (SSR):**
```tsx
import { cvApi, cvUrl } from "@/lib/api/cv"
const res = await fetch(cvUrl(cvApi.site), {
  cache: "no-store",
  headers: { "X-Tenant-Slug": slug },
})
```

**Tren Client:**
```tsx
import { cvApi, cvUrl } from "@/lib/api/cv"
const res = await fetch(cvUrl(cvApi.portfolio(id)), { headers })
```

**Khong hardcode URL.** Luon dung `cvUrl(cvApi.xxx)`.

## Them Route Moi

```tsx
// app/my-route/page.tsx
export default async function MyPage() {
  // Server Component
}

// app/my-route/[id]/page.tsx — dynamic route
export default function MyDynamic({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params) // React.use() trong client
  // hoac await params trong server component
}
```

## Theme CSS Variables

Dung CSS variables duoc inject boi `CvThemeShell`:

```tsx
// Dung CSS variables trong Tailwind
<div className="bg-[var(--color-bg)] text-[var(--color-text)]">
  <span className="text-[var(--color-accent)]">Accent text</span>
</div>
```

Variables co san: `--color-bg`, `--color-surface`, `--color-accent`, `--color-text`, `--color-text-muted`, `--font-heading`, `--font-body`, `--radius-md`, `--shadow-card`

## Imports

```tsx
// Dung @/ alias
import { cvUrl } from "@/lib/api/cv"
import { Button } from "@/components/ui/button"
import type { ThemeTokens } from "@/lib/theme/schema"

// Khong dung relative import dai
// ❌ import { cvUrl } from "../../lib/api/cv"
// ✓ import { cvUrl } from "@/lib/api/cv"
```

## Kiem tra Truoc Khi Done

1. `pnpm build` — check TS errors (next.config.mjs dang ignore chung!)
2. `pnpm lint` — check ESLint
3. Test `http://{slug}.localhost:3000` neu thay doi multi-tenant logic
