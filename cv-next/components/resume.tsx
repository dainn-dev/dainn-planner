"use client"

import { useEffect, useState } from "react"
import { useCvContentFromApi } from "@/components/cv-content-context"

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
    <section id="resume" className="py-16">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Resume</h2>
          {profile.resumeIntro ? <p className="text-gray-600">{profile.resumeIntro}</p> : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left — Professional Experience */}
          <div data-aos="fade-up">
            <h3 className="text-lg font-bold text-[#173b6c] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
              Professional Experience
            </h3>
            {experience.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No experience added yet.</p>
            ) : (
              experience.map((exp, index) => (
                <div key={exp.id || index} className="mb-6">
                  <h4 className="text-base font-bold text-[#173b6c]">{exp.title}</h4>
                  <h5 className="text-[#149ddd] font-semibold mb-1">{exp.company}</h5>
                  <p className="text-sm text-gray-500 mb-1">
                    {exp.startYear}{exp.endYear ? ` - ${exp.endYear}` : ""}
                  </p>
                  {exp.location ? <p className="italic text-sm text-gray-500 mb-2">{exp.location}</p> : null}
                  <div
                    className="text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: exp.description || "" }}
                  />
                </div>
              ))
            )}
          </div>

          {/* Right — Education + Certificates */}
          <div data-aos="fade-up" data-aos-delay="100">
            {/* Education */}
            <h3 className="text-lg font-bold text-[#173b6c] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
              Education
            </h3>
            {education.length === 0 ? (
              <p className="text-gray-500 italic text-sm mb-8">No education added yet.</p>
            ) : (
              education.map((edu, index) => (
                <div key={edu.id || index} className="mb-6">
                  <h4 className="text-base font-bold text-[#173b6c]">{edu.school}</h4>
                  <h5 className="text-[#149ddd] font-semibold mb-1">{edu.degree}</h5>
                  {edu.location ? <p className="italic text-sm text-gray-500 mb-1">{edu.location}</p> : null}
                  {edu.description ? <p className="text-gray-600 text-sm">{edu.description}</p> : null}
                </div>
              ))
            )}

            {/* Certificates */}
            <h3 className="text-lg font-bold text-[#173b6c] mt-8 mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
              Certificates
            </h3>
            {!ready ? (
              <div className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ) : certificates.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No certificates added yet.</p>
            ) : (
              certificates.map((cert, index) => (
                <div key={cert.id || index} className="mb-6">
                  <h4 className="text-base font-bold text-[#173b6c]">{cert.title}</h4>
                  <h5 className="text-[#149ddd] font-semibold mb-1">{cert.issuer}</h5>
                  {cert.date ? <p className="italic text-sm text-gray-500 mb-1">{cert.date}</p> : null}
                  <div
                    className="text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: cert.description || "" }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
