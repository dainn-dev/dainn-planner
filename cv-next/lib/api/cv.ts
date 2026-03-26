/** Base URL for ASP.NET CV APIs. */
export function getApiBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!u?.trim()) {
    throw new Error(
      "Set NEXT_PUBLIC_API_BASE_URL to your backend origin, e.g. http://localhost:5113",
    )
  }
  return u.replace(/\/$/, "")
}

export const cvApi = {
  site: "/api/v1/cv/site",
  themes: "/api/v1/cv/themes",
  portfolio: (id: string) => `/api/v1/cv/portfolio/${encodeURIComponent(id)}`,
  contact: "/api/v1/cv/contact",
}

export function cvUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`
}

export async function cvFetchPublic(path: string, init?: RequestInit): Promise<Response> {
  return fetch(cvUrl(path), { ...init, cache: init?.cache ?? "no-store" })
}

/** Resolve a relative backend path to a full URL for static assets (avatars, images).
 *  Strips the /api suffix from the base URL so /uploads/... paths resolve correctly. */
export function getAssetFullUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (path.startsWith("http")) return path
  const base = getApiBaseUrl().replace(/\/api\/?$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}
