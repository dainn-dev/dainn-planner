import { headers } from "next/headers"
import { parseTenantSlugFromHost } from "@/lib/tenant"

export async function getTenantSlugFromRequest(): Promise<string | null> {
  const h = await headers()
  const fromMw = h.get("x-tenant-slug")
  if (fromMw) return fromMw
  return parseTenantSlugFromHost(h.get("host"))
}
