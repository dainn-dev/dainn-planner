"use client"

import { useState, useEffect } from "react"
import { useCvContentFromApi } from "@/components/cv-content-context"

interface TechnicalSkill {
  category: string
  details: string
}

interface SkillsData {
  intro: {
    title: string
    description: string
  }
  technicalSkills: TechnicalSkill[]
  softSkills: string[]
}

export default function Skills() {
  const apiCv = useCvContentFromApi()
  const [data, setData] = useState<SkillsData>({
    intro: {
      title: "Skills",
      description: "Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem. Sit sint consectetur velit. Quisquam quos quisquam cupiditate. Et nemo qui impedit suscipit alias ea. Quia fugiat sit in iste officiis commodi quidem hic quas.",
    },
    technicalSkills: [],
    softSkills: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = apiCv?.content?.skills as SkillsData | null | undefined
    if (raw && typeof raw === "object" && raw.intro) {
      setData(raw)
    }
    setLoading(false)
  }, [apiCv])

  if (loading) {
    return (
      <section id="skills" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="section-title mb-12">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <ul className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <li key={i} className="h-4 bg-gray-200 rounded w-full"></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <ul className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <li key={i} className="h-4 bg-gray-200 rounded w-3/4"></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="skills" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Skills</h2>
          <p className="text-gray-600">{data.intro.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-lg font-bold text-[#173b6c] mb-6">Technical Skills</h3>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              {data.technicalSkills.map((skill, idx) => (
                <li key={idx}>
                  <span className="font-semibold">{skill.category}:</span> {skill.details}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#173b6c] mb-6">Soft Skills</h3>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              {data.softSkills.map((skill, idx) => (
                <li key={idx}>{skill}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
