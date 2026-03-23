import { Suspense } from "react"
import HeroContent from "./hero-content"

export default function Hero() {
  return (
    <section
      id="hero"
      className="flex flex-col justify-content-center items-center h-screen bg-[url('/background.jpg?height=1080&width=1920')] bg-cover bg-center bg-fixed relative"
    >
      <div className="absolute inset-0 bg-[#040b14]/70"></div>
      <Suspense fallback={<HeroLoading />}>
        <HeroContent />
      </Suspense>
    </section>
  )
}

function HeroLoading() {
  return (
    <div className="container mx-auto px-4 text-center relative z-10" data-aos="fade-in">
      <h1 className="text-5xl font-bold text-white mb-4">Loading...</h1>
      <p className="text-white text-2xl">
        I&apos;m <span className="text-[#149ddd]">...</span>
      </p>
    </div>
  )
}
