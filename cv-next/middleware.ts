import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { parseTenantSlugFromHost } from "@/lib/tenant"

/** Edge-safe: tenant slug only. Auth for /admin and /dashboard runs in route layouts (Node). */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const slug = parseTenantSlugFromHost(request.headers.get("host"))
  if (slug) {
    requestHeaders.set("x-tenant-slug", slug)
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
