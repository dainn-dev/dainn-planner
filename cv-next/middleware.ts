import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "dainn.online"

const RESERVED = new Set([
  "www", "admin", "api", "app", "dashboard",
  "mail", "smtp", "ftp", "cdn", "static", "assets",
])

function getSlug(hostHeader: string | null): string | null {
  if (!hostHeader) return null
  const host = hostHeader.split(":")[0]?.toLowerCase().trim()
  if (!host) return null
  const root = ROOT_DOMAIN.toLowerCase().replace(/^\.+/, "")
  if (host === root || host === `www.${root}`) return null
  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1))
    if (!sub || sub.includes(".") || RESERVED.has(sub)) return null
    return sub
  }
  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length)
    if (!sub || sub.includes(".") || RESERVED.has(sub)) return null
    return sub
  }
  return null
}

/** Edge-safe: tenant slug only. */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const slug = getSlug(request.headers.get("host"))
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
