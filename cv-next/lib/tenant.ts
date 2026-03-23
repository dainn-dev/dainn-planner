const DEFAULT_ROOT = "dainn.online"

export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "app",
  "dashboard",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
])

export function getRootDomain(): string {
  return (process.env.ROOT_DOMAIN ?? DEFAULT_ROOT).toLowerCase().replace(/^\.+/, "")
}

/**
 * Extract tenant slug from Host. Returns null for apex, www, reserved labels, or non-matching hosts.
 */
export function parseTenantSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null
  const host = hostHeader.split(":")[0]?.toLowerCase().trim()
  if (!host) return null

  const root = getRootDomain()

  if (host === root || host === `www.${root}`) return null

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1))
    if (!sub || sub.includes(".")) return null
    if (RESERVED_SUBDOMAINS.has(sub)) return null
    return sub
  }

  // Local dev: {slug}.localhost
  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length)
    if (!sub || sub.includes(".")) return null
    if (RESERVED_SUBDOMAINS.has(sub)) return null
    return sub
  }

  // Plain localhost / 127.0.0.1 — no tenant
  if (host === "localhost" || host.startsWith("127.0.0.1")) return null

  return null
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function isValidSlugFormat(slug: string): boolean {
  if (slug.length < 2 || slug.length > 63) return false
  return SLUG_RE.test(slug)
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SUBDOMAINS.has(slug.toLowerCase())
}

export function publicSiteUrl(slug: string): string {
  const root = getRootDomain()
  return `https://${slug}.${root}`
}
