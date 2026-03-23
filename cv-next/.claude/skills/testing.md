# Testing Skill

## Trang Thai Hien Tai

cv-next **chua co test framework**. Neu can them tests:

### Setup Vite + Testing Library (khuyen nghi cho Next.js)

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

Them vao `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Chay Tests (sau khi setup)

```bash
pnpm test        # Run mot lan
pnpm test:watch  # Watch mode
```

## Test Requirements

**New feature:** Viet tests TRUOC implementation (TDD).
**Bug fix:** Viet regression test truoc.
**Component:** Test behavior, khong test implementation.
**Utility functions** (`lib/tenant.ts`, `lib/theme/merge.ts`, ...): Unit test tat ca edge cases.

## Uu tien Test

1. **Utility functions** — `parseTenantSlugFromHost`, `resolveThemeTokens`, `tokensToCssVars`
2. **Components** — render dung data, handle null/undefined content
3. **Integration** — SSR fetch flow neu co mock

## Vi du Test Utility

```tsx
// lib/tenant.test.ts
import { describe, it, expect } from "vitest"
import { parseTenantSlugFromHost } from "@/lib/tenant"

describe("parseTenantSlugFromHost", () => {
  it("returns slug for valid subdomain", () => {
    expect(parseTenantSlugFromHost("john.dainn.online")).toBe("john")
  })
  it("returns null for apex domain", () => {
    expect(parseTenantSlugFromHost("dainn.online")).toBeNull()
  })
  it("returns null for reserved subdomain", () => {
    expect(parseTenantSlugFromHost("www.dainn.online")).toBeNull()
  })
})
```

## Sau khi test

Report: "Unit tests: X/X passing."
Neu co failure: fix truoc khi tiep tuc.
