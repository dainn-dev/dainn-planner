"use client"

import { useState, useEffect } from "react"
import { FACT_ICONS, type FactIconName } from "@/lib/constants/fact-icons"
import { useCvContentFromApi } from "@/components/cv-content-context"

interface Fact {
  id?: string
  icon: string
  count: number
  title: string
  description: string
}

interface FactsData {
  intro: {
    title: string
    description: string
  }
  facts: Fact[]
}

export default function Facts() {
  const apiCv = useCvContentFromApi()
  const [data, setData] = useState<FactsData>({
    intro: {
      title: "Facts",
      description: "Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem. Sit sint consectetur velit. Quisquam quos quisquam cupiditate. Et nemo qui impedit suscipit alias ea. Quia fugiat sit in iste officiis commodi quidem hic quas.",
    },
    facts: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = apiCv?.content?.facts as FactsData | null | undefined
    if (raw && typeof raw === "object" && raw.intro) {
      setData(raw)
    }
    setLoading(false)
  }, [apiCv])

  useEffect(() => {
    if (!loading) {
      const counters = document.querySelectorAll(".count-number")

      const animateCounter = (counter: Element) => {
        const target = Number.parseInt(counter.getAttribute("data-target") || "0")
        const duration = 2000 // ms
        const step = target / (duration / 16) // 16ms is roughly 60fps
        let current = 0

        const updateCounter = () => {
          current += step
          if (current < target) {
            counter.textContent = Math.ceil(current).toString() + "+"
            requestAnimationFrame(updateCounter)
          } else {
            counter.textContent = target.toString() + "+"
          }
        }

        updateCounter()
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCounter(entry.target)
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.5 },
      )

      counters.forEach((counter) => {
        observer.observe(counter)
      })

      return () => {
        counters.forEach((counter) => {
          observer.unobserve(counter)
        })
      }
    }
  }, [loading])

  const getIcon = (iconName: string) => {
    const IconComponent = FACT_ICONS[iconName as FactIconName] || FACT_ICONS.Smile
    return <IconComponent className="h-8 w-8 text-[#149ddd]" />
  }

  if (loading) {
    return (
      <section id="facts" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="section-title mb-12">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center" data-aos="fade-up">
                <div className="flex justify-center items-center w-16 h-16 rounded-full bg-[#e8f7fb] mb-4">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
                <div className="text-center">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="facts" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Facts</h2>
          <p className="text-gray-600">{data.intro.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.facts.map((fact, index) => (
            <div key={fact.id || index} className="flex flex-col items-center" data-aos="fade-up">
              <div className="flex justify-center items-center w-16 h-16 rounded-full bg-[#e8f7fb] mb-4">
                {getIcon(fact.icon)}
              </div>
              <div className="text-center">
                <span className="count-number text-3xl font-bold text-[#173b6c]" data-target={fact.count}>
                  0
                </span>
                <p className="mt-2 text-sm text-gray-600">
                  <strong>{fact.title}</strong> {fact.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
