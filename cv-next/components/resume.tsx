"use client"

import { useEffect, useState } from "react"
import { useCvContentFromApi } from "@/components/cv-content-context"
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (key: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const formatProjectDate = (value?: string) => {
    if (!value) return ""
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      const m = parseInt(dmy[2], 10)
      if (m >= 1 && m <= 12) return `${months[m - 1]} ${dmy[3]}`
    }
    const iso = value.match(/^(\d{4})-(\d{1,2})/)
    if (iso) {
      const m = parseInt(iso[2], 10)
      if (m >= 1 && m <= 12) return `${months[m - 1]} ${iso[1]}`
    }
    return value
  }

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
    <section id="resume" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Resume</h2>
          {profile.resumeIntro ? <p className="text-gray-600">{profile.resumeIntro}</p> : null}
        </div>

        <div className="flex flex-col gap-12">
          <div data-aos="fade-up">
            <h3 className="text-lg font-bold text-[#173b6c] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
              Professional Experience
            </h3>
            {experience.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No experience added yet.</p>
            ) : (
              experience.map((exp, index) => (
                <div key={exp.id || index} className="mb-8">
                  <h4 className="text-base font-bold text-[#173b6c]">{exp.title}</h4>
                  <h5 className="text-sm text-[#149ddd] font-semibold mb-1">{exp.company}</h5>
                  <p className="text-sm text-gray-500 mb-1">
                    {exp.startYear}{exp.endYear ? ` - ${exp.endYear}` : ""}
                  </p>
                  {exp.location ? <p className="italic text-sm text-gray-500 mb-3">{exp.location}</p> : null}

                  {!exp.projects || exp.projects.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No projects</p>
                  ) : (
                    <div className="space-y-4 mt-3">
                      {exp.projects.map((project: any, pIndex: number) => {
                        const projectKey = `${exp.id || index}-${project.id || pIndex}`
                        const isExpanded = expandedProjects.has(projectKey)

                        return (
                          <div key={project.id || pIndex} className="pl-4 border-l-2 border-gray-200">
                            <button
                              onClick={() => toggleProject(projectKey)}
                              className="w-full flex items-center justify-between gap-2 mb-1 text-left hover:opacity-70 transition-opacity"
                            >
                              <h6 className="text-sm font-semibold text-[#173b6c] flex-1">{project.name}</h6>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {(project.startDate || project.endDate) ? (
                                  <span className="text-sm text-gray-500 whitespace-nowrap">
                                    {formatProjectDate(project.startDate)}
                                    {project.endDate ? ` - ${formatProjectDate(project.endDate)}` : ""}
                                  </span>
                                ) : null}
                                <span className="material-symbols-outlined text-[18px] text-[#149ddd]">
                                  {isExpanded ? "expand_less" : "expand_more"}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="mt-2 space-y-2 text-sm">
                                {project.role && (
                                  <p className="text-gray-700 font-bold italic">{project.role}</p>
                                )}
                                {project.summary && (
                                  <p className="text-gray-600">{project.summary}</p>
                                )}
                                {project.teamSize && (
                                  <p className="text-gray-700 font-bold">Team: {project.teamSize}</p>
                                )}
                                {project.techStack && (
                                  <p className="text-gray-700 font-bold">Tech: {project.techStack}</p>
                                )}
                                {project.responsibilities && (
                                  <div
                                    className="text-gray-600 prose prose-sm max-w-none prose-p:text-sm prose-li:text-sm prose-headings:text-sm [&_table]:text-sm [&_table]:my-0 [&_tr]:!border-0 [&_th]:!p-2 [&_td]:!p-2 [&_td_p]:!my-0 [&_th_p]:!my-0"
                                    dangerouslySetInnerHTML={{ __html: sanitizeCvHtml(project.responsibilities) }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10" data-aos="fade-up" data-aos-delay="100">
            <div>
              <h3 className="text-lg font-bold text-[#173b6c] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
                Education
              </h3>
              {education.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No education added yet.</p>
              ) : (
                education.map((edu, index) => (
                  <div key={edu.id || index} className="mb-6">
                    <h4 className="text-base font-bold text-[#173b6c]">{edu.school}</h4>
                    <h5 className="text-sm text-[#149ddd] font-semibold mb-1">{edu.degree}</h5>
                    {edu.location ? <p className="italic text-sm text-gray-500 mb-1">{edu.location}</p> : null}
                    {edu.description ? <p className="text-gray-600 text-sm">{edu.description}</p> : null}
                  </div>
                ))
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#173b6c] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
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
                    <h5 className="text-sm text-[#149ddd] font-semibold mb-1">{cert.issuer}</h5>
                    {cert.date ? <p className="italic text-sm text-gray-500 mb-1">{cert.date}</p> : null}
                    <div
                      className="text-gray-600 prose prose-sm max-w-none [&_table]:text-sm [&_table]:my-0 [&_tr]:!border-0 [&_th]:!p-2 [&_td]:!p-2 [&_td_p]:!my-0 [&_th_p]:!my-0"
                      dangerouslySetInnerHTML={{ __html: sanitizeCvHtml(cert.description) }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
