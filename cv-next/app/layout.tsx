import type React from "react"
import type { Metadata } from "next/dist/lib/metadata/types/metadata-interface"
import { Open_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Providers from "./providers"
import { getPublicCvPayload } from "@/lib/server/public-cv"

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPublicCvPayload()

  if (payload.kind === "cv") {
    const profile = payload.content?.profile as { name?: string } | null | undefined
    const name = profile?.name || "Portfolio"
    return {
      title: `${name} | Portfolio`,
      description: "Professional portfolio website showcasing skills and projects",
      generator: 'v0.dev'
    }
  }

  return {
    title: "Your Portfolio",
    description: "Professional portfolio website showcasing skills and projects",
    generator: 'v0.dev'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${openSans.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
