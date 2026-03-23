import Sidebar from "@/components/sidebar"
import Hero from "@/components/hero"
import About from "@/components/about"
import Facts from "@/components/facts"
import Skills from "@/components/skills"
import Resume from "@/components/resume"
import Portfolio from "@/components/portfolio"
import Services from "@/components/services"
import Testimonials from "@/components/testimonials"
import Contact from "@/components/contact"
import Footer from "@/components/footer"
import BackToTop from "@/components/back-to-top"
import { CvContentProvider } from "@/components/cv-content-context"
import { CvThemeShell } from "@/components/cv-theme-shell"
import { TenantSlugConsole } from "@/components/tenant-slug-console"
import type { CvContentDocument } from "@/lib/cv-content"
import type { ThemeTokens } from "@/lib/theme/schema"

export default function CvPublicPage({
  presetKey,
  tokens,
  content,
}: {
  presetKey: string
  tokens: ThemeTokens
  content: CvContentDocument
}) {
  return (
    <CvThemeShell presetKey={presetKey} tokens={tokens}>
      <CvContentProvider content={content}>
        <TenantSlugConsole />
        <div className="flex flex-col md:flex-row">
          <Sidebar />
          <main className="w-full md:ml-72">
            <Hero />
            <About />
            <Facts />
            <Skills />
            <Resume />
            <Portfolio />
            <Services />
            <Testimonials />
            <Contact />
            <Footer />
            <BackToTop />
          </main>
        </div>
      </CvContentProvider>
    </CvThemeShell>
  )
}
