"use client"

import { useEffect } from "react"
import { parseTenantSlugFromHost } from "@/lib/tenant"

/**
 * Logs tenant slug in the browser DevTools console (client-side only).
 * Server middleware / getPublicCvPayload logs appear in Vercel/terminal, not here.
 */
export function TenantSlugConsole() {
  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.host : ""
    const slug = parseTenantSlugFromHost(host)
    console.log("[cv-next] X-Tenant-Slug (browser):", slug ?? "(none — apex or no match)", "| host:", host)
  }, [])
  return null
}
