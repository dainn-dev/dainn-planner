"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { CvContentDocument } from "@/lib/cv-content"

type CvCtx = {
  content: CvContentDocument
}

const CvContentContext = createContext<CvCtx | null>(null)

export function CvContentProvider({
  content,
  children,
}: {
  content: CvContentDocument
  children: ReactNode
}) {
  return (
    <CvContentContext.Provider value={{ content }}>{children}</CvContentContext.Provider>
  )
}

export function useCvContentFromApi(): CvCtx | null {
  return useContext(CvContentContext)
}
