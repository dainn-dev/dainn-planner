/** Phase 0 decisions — see prod/solution-summary.md */
export const PENDING_SITE_PUBLIC_BEHAVIOR = "404" as const

export const AUTH_ROLES = {
  user: "user",
  platform_admin: "platform_admin",
} as const

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES]
