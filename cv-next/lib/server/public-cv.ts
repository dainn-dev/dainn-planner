import { headers } from "next/headers"
import { getTenantSlugFromRequest } from "@/lib/server/tenant-request"
import { resolveThemeTokens } from "@/lib/theme/merge"
import { emptyCvDocument, rowToCvDoc, type CvContentDocument } from "@/lib/cv-content"
import { PENDING_SITE_PUBLIC_BEHAVIOR } from "@/lib/constants/platform"
import { cvApi, cvUrl } from "@/lib/api/cv"

export type PublicCvPayload =
  | { kind: "marketing" }
  | { kind: "unavailable"; slug: string }
  | {
      kind: "cv"
      slug: string
      theme: ReturnType<typeof resolveThemeTokens>
      content: CvContentDocument
      updatedAt: string | null
    }

type SiteApiJson = {
  slug?: string
  theme?: {
    presetKey: string
    schemaVersion?: number
    tokens: Record<string, string>
  }
  content?: Record<string, unknown> | null
  updatedAt?: string | null
}

export async function getPublicCvPayload(): Promise<PublicCvPayload> {
  const slug = await getTenantSlugFromRequest()
  if (!slug) {
    return { kind: "marketing" }
  }

  try {
    const h = await headers()
    const tenantHeader = h.get("x-tenant-slug") ?? slug
    const res = await fetch(cvUrl(cvApi.site), {
      cache: "no-store",
      headers: {
        "X-Tenant-Slug": tenantHeader,
      },
    })

    if (res.status === 404) {
      if (PENDING_SITE_PUBLIC_BEHAVIOR === "404") {
        return { kind: "unavailable", slug }
      }
      return { kind: "unavailable", slug }
    }

    if (!res.ok) {
      return { kind: "unavailable", slug }
    }

    const data = (await res.json()) as SiteApiJson
    if (!data.slug || !data.theme?.tokens) {
      return { kind: "unavailable", slug }
    }

    const theme: ReturnType<typeof resolveThemeTokens> = {
      presetKey: data.theme.presetKey,
      schemaVersion: data.theme.schemaVersion ?? 1,
      tokens: data.theme.tokens as ReturnType<typeof resolveThemeTokens>["tokens"],
    }

    const raw = data.content
    const content = raw
      ? rowToCvDoc({
          profile: raw.profile,
          portfolio: raw.portfolio,
          skills: raw.skills,
          testimonials: raw.testimonials,
          facts: raw.facts,
          services: raw.services,
          education: raw.education,
          experience: raw.experience,
          certificates: raw.certificates,
        })
      : emptyCvDocument()

    return {
      kind: "cv",
      slug: data.slug,
      theme,
      content,
      updatedAt: data.updatedAt ?? null,
    }
  } catch {
    return { kind: "unavailable", slug }
  }
}
