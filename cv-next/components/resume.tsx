"use client"

import { useEffect, useState } from "react"
import { useCvContentFromApi } from "@/components/cv-content-context"
import ResumeExperience from "@/components/resume/resume-experience"
import ResumeEducation from "@/components/resume/resume-education"
import ResumeCertificates from "@/components/resume/resume-certificates"
import { sanitizeCvHtml } from "@/lib/sanitize-html"

export default function Resume() {
  const apiCv = useCvContentFromApi()
  const [profile, setProfile] = useState({
    resumeIntro: "",
  })
  const [education, setEducation] = useState<any[]>([])
  const [experience, setExperience] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const c = apiCv?.content
    if (c) {
      const p = c.profile as Record<string, string> | null | undefined
      if (p && typeof p === "object") {
        setProfile((prev) => ({ ...prev, resumeIntro: p.resumeIntro || "" }))
      }
      setEducation(Array.isArray(c.education) ? c.education : [])
      setExperience(Array.isArray(c.experience) ? c.experience : [])
      setCertificates(Array.isArray(c.certificates) ? c.certificates : [])
    }
    setReady(true)
  }, [apiCv])

  return (
    <section id="resume" className="py-8 bg-[#0f1418]">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Resume</h2>
          {profile.resumeIntro ? (
            <div
              className="text-gray-400 cv-resume-intro-prose prose prose-sm prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: sanitizeCvHtml(profile.resumeIntro),
              }}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-12">
          <ResumeExperience experience={experience} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10" data-aos="fade-up" data-aos-delay="100">
            <ResumeEducation education={education} />
            <ResumeCertificates certificates={certificates} ready={ready} />
          </div>
        </div>
      </div>
    </section>
  )
}
