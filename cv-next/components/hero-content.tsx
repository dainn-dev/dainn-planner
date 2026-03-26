"use client"

import { useEffect, useRef, useState } from "react"
import Typed from "typed.js"
import { useCvContentFromApi } from "@/components/cv-content-context"
import { getAssetFullUrl } from "@/lib/api/cv"

export default function HeroContent() {
  const apiCv = useCvContentFromApi()
  const typedRef = useRef<HTMLSpanElement>(null)
  const typed = useRef<Typed | null>(null)
  const [profileData, setProfileData] = useState({
    name: "Your Name",
    title: "UI/UX Designer & Web Developer",
    image: "",
    backgroundImage: "",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = apiCv?.content?.profile as Record<string, string> | null | undefined
    if (p && typeof p === "object") {
      setProfileData({
        name: p.name || "Your Name",
        title: p.title || "UI/UX Designer & Web Developer",
        image: p.image || "",
      })
    }
    setLoading(false)
  }, [apiCv])

  useEffect(() => {
    if (typedRef.current && !loading) {
      // Extract professional skills from title or use defaults
      const skills = profileData.title?.split("&").map((s) => s.trim()) || ["Designer", "Developer", "Freelancer"]

      typed.current = new Typed(typedRef.current, {
        strings: skills,
        typeSpeed: 100,
        backSpeed: 50,
        backDelay: 2000,
        loop: true,
      })
    }

    return () => {
      if (typed.current) {
        typed.current.destroy()
      }
    }
  }, [profileData.title, loading])

  const bgUrl = profileData.backgroundImage
    ? getAssetFullUrl(profileData.backgroundImage)
    : "/background.jpg"

  if (loading) {
    return (
      <>
        <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url('/background.jpg')` }} />
        <div className="absolute inset-0 bg-[#040b14]/60" />
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <img src="/loading.gif" alt="Loading..." className="h-16 w-16" />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url('${bgUrl}')` }} />
      <div className="absolute inset-0 bg-[#040b14]/60" />
      <div className="min-h-screen flex items-center justify-center relative z-10">
      <div className="container mx-auto px-4 text-center relative z-10" data-aos="fade-in">
        <h1 className="text-5xl font-bold text-white mb-4">{profileData.name}</h1>
        <p className="text-white text-2xl">
          I&apos;m <span ref={typedRef} className="text-[var(--color-accent,#149ddd)]"></span>
        </p>
      </div>
      </div>
    </>
  )
}
