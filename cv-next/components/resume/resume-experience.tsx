"use client"

import { useState } from "react"
import { sanitizeCvHtml } from "@/lib/sanitize-html"

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

export default function ResumeExperience({ experience }: { experience: any[] }) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (key: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div data-aos="fade-up">
      <h3 className="text-lg font-bold text-[#4ab8e6] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
        Professional Experience
      </h3>
      {experience.length === 0 ? (
        <p className="text-gray-500 italic text-sm">No experience added yet.</p>
      ) : (
        experience.map((exp, index) => (
          <div key={exp.id || index} className="mb-8">
            <h4 className="text-base font-bold text-gray-100">{exp.title}</h4>
            <h5 className="text-sm text-[#149ddd] font-semibold mb-1">{exp.company}</h5>
            <p className="text-sm text-gray-400 mb-1 text-right font-bold">
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
                    <div key={project.id || pIndex} className="pl-4 border-l-2 border-[#2a323c]">
                      <button
                        onClick={() => toggleProject(projectKey)}
                        className="w-full flex items-center justify-between gap-2 mb-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <h6 className="text-sm font-semibold text-[#4ab8e6] flex-1">{project.name}</h6>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(project.startDate || project.endDate) ? (
                            <span className="text-sm text-gray-400 whitespace-nowrap">
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
                            <p className="text-gray-200 font-bold italic">{project.role}</p>
                          )}
                          {project.summary && (
                            <p className="text-gray-300">{project.summary}</p>
                          )}
                          {project.teamSize && (
                            <p className="text-gray-200 font-bold">Team: {project.teamSize}</p>
                          )}
                          {project.techStack && (
                            <p className="text-gray-200 font-bold">Tech: {project.techStack}</p>
                          )}
                          {project.responsibilities && (
                            <div
                              className="text-gray-300 prose prose-sm prose-invert max-w-none prose-p:text-sm prose-li:text-sm prose-headings:text-sm [&_table]:text-sm [&_table]:my-0 [&_tr]:!border-0 [&_th]:!p-2 [&_td]:!p-2 [&_td_p]:!my-0 [&_th_p]:!my-0"
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
  )
}
