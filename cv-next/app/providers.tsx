"use client"

import type React from "react"
import AOSInit from "@/lib/aos"
import { Toaster } from "@/components/ui/toaster"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AOSInit />
      {children}
      <Toaster />
    </>
  )
}
