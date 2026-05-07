import { Suspense } from "react"
import AboutContent from "./about-content"

export default function About() {
  return (
    <section id="profile" className="py-8 bg-[#0f1418]">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Profile</h2>
          <Suspense fallback={<p className="text-gray-400">Loading about information...</p>}>
            <AboutContent />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
