import { z } from "zod"

export const THEME_SCHEMA_VERSION = 1

/** Semantic token keys — public CV layout maps these to CSS variables */
export const themeTokensSchema = z.object({
  colorBg: z.string(),
  colorSurface: z.string(),
  colorAccent: z.string(),
  colorText: z.string(),
  colorTextMuted: z.string(),
  fontHeading: z.string(),
  fontBody: z.string(),
  radiusMd: z.string(),
  shadowCard: z.string(),
})

export type ThemeTokens = z.infer<typeof themeTokensSchema>

export const themeOverridesSchema = themeTokensSchema.partial()

export type ThemeOverrides = z.infer<typeof themeOverridesSchema>

export const themeApiSchema = z.object({
  presetKey: z.string().min(1),
  schemaVersion: z.number().int().optional(),
  tokens: themeTokensSchema,
})
