"use client"

import type { ReactNode } from "react"
import type { ThemeTokens } from "@/lib/theme/schema"
import { tokensToCssVars } from "@/lib/theme/merge"

export function CvThemeShell({
  presetKey,
  tokens,
  children,
}: {
  presetKey: string
  tokens: ThemeTokens
  children: ReactNode
}) {
  const vars = tokensToCssVars(tokens) as React.CSSProperties
  return (
    <div data-theme={presetKey} style={vars} className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {children}
    </div>
  )
}
