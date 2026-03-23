import { themeOverridesSchema, type ThemeTokens } from "./schema"
import { getPresetByKey } from "./presets"

function deepMerge(base: ThemeTokens, partial: Partial<ThemeTokens>): ThemeTokens {
  return { ...base, ...partial }
}

export function resolveThemeTokens(
  presetKey: string,
  overrides: unknown | null | undefined,
): { presetKey: string; schemaVersion: number; tokens: ThemeTokens } {
  const preset = getPresetByKey(presetKey) ?? getPresetByKey("default")!
  const parsed = overrides == null ? {} : themeOverridesSchema.safeParse(overrides)
  const safeOverrides = parsed.success ? parsed.data : {}
  const tokens = deepMerge(preset.tokens, safeOverrides)
  return {
    presetKey: preset.key,
    schemaVersion: 1,
    tokens,
  }
}

/** Map token object to inline React style for CSS variables (camelCase → --kebab) */
export function tokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--color-bg": tokens.colorBg,
    "--color-surface": tokens.colorSurface,
    "--color-accent": tokens.colorAccent,
    "--color-text": tokens.colorText,
    "--color-text-muted": tokens.colorTextMuted,
    "--font-heading": tokens.fontHeading,
    "--font-body": tokens.fontBody,
    "--radius-md": tokens.radiusMd,
    "--shadow-card": tokens.shadowCard,
  }
}
