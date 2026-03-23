import { Suspense } from "react"
import AboutContent from "./about-content"

export default function About() {
  return (
    <section id="about" className="py-16">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>About</h2>
          <Suspense fallback={<p className="text-gray-600">Loading about information...</p>}>
            <AboutContent />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
