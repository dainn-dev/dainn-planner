import { themeTokensSchema, type ThemeTokens } from "./schema"

export type ThemePreset = {
  key: string
  label: string
  sortOrder: number
  tokens: ThemeTokens
  previewTokens?: Pick<ThemeTokens, "colorBg" | "colorAccent">
}

const defaultTokens: ThemeTokens = {
  colorBg: "#f8fafc",
  colorSurface: "#ffffff",
  colorAccent: "#0ea5e9",
  colorText: "#0f172a",
  colorTextMuted: "#64748b",
  fontHeading: "var(--font-raleway), system-ui, sans-serif",
  fontBody: "var(--font-open-sans), system-ui, sans-serif",
  radiusMd: "0.5rem",
  shadowCard: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
}

const midnightTokens: ThemeTokens = {
  colorBg: "#0f172a",
  colorSurface: "#1e293b",
  colorAccent: "#38bdf8",
  colorText: "#f1f5f9",
  colorTextMuted: "#94a3b8",
  fontHeading: "var(--font-raleway), system-ui, sans-serif",
  fontBody: "var(--font-open-sans), system-ui, sans-serif",
  radiusMd: "0.5rem",
  shadowCard: "0 4px 6px -1px rgb(0 0 0 / 0.4)",
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "default",
    label: "Light",
    sortOrder: 0,
    tokens: themeTokensSchema.parse(defaultTokens),
    previewTokens: { colorBg: defaultTokens.colorBg, colorAccent: defaultTokens.colorAccent },
  },
  {
    key: "midnight",
    label: "Midnight",
    sortOrder: 1,
    tokens: themeTokensSchema.parse(midnightTokens),
    previewTokens: { colorBg: midnightTokens.colorBg, colorAccent: midnightTokens.colorAccent },
  },
]

const byKey = new Map(THEME_PRESETS.map((p) => [p.key, p]))

export function getPresetByKey(key: string): ThemePreset | undefined {
  return byKey.get(key)
}

export function isAllowedPresetKey(key: string): boolean {
  return byKey.has(key)
}

export function listActivePresets(): ThemePreset[] {
  return [...THEME_PRESETS].sort((a, b) => a.sortOrder - b.sortOrder)
}
