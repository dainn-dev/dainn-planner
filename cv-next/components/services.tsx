"use client"

import { useState, useEffect } from "react"
import { useCvContentFromApi } from "@/components/cv-content-context"
import { SERVICE_ICONS, type ServiceIconName } from "@/lib/constants/service-icons"

interface Service {
  id?: string
  icon: string
  title: string
  description: string
}

interface ServicesData {
  intro: {
    title: string
    description: string
  }
  services: Service[]
}

export default function Services() {
  const apiCv = useCvContentFromApi()
  const [data, setData] = useState<ServicesData>({
    intro: {
      title: "Services",
      description: "Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem. Sit sint consectetur velit. Quisquam quos quisquam cupiditate. Et nemo qui impedit suscipit alias ea. Quia fugiat sit in iste officiis commodi quidem hic quas.",
    },
    services: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = apiCv?.content?.services as ServicesData | null | undefined
    if (raw && typeof raw === "object" && raw.intro) {
      setData(raw)
    }
    setLoading(false)
  }, [apiCv])

  if (loading) {
    return (
      <section id="services" className="py-8 bg-[#0f1418]">
        <div className="container mx-auto px-4">
          <div className="section-title mb-12">
            <div className="h-8 bg-[#1c232b] rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-[#1c232b] rounded w-3/4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#151b22] p-6 rounded-lg shadow-sm border border-[#2a323c] animate-pulse">
                <div className="flex gap-4">
                  <div className="h-12 w-12 bg-[#1c232b] rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-[#1c232b] rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-[#1c232b] rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="services" className="py-8 bg-[#0f1418]">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Services</h2>
          <p className="text-gray-400">{data.intro.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.services.map((service, index) => {
            const Icon = SERVICE_ICONS[service.icon as ServiceIconName] || SERVICE_ICONS.Briefcase
            return (
              <div key={service.id || index} className="icon-box" data-aos="fade-up" data-aos-delay={index * 100}>
                <div className="flex gap-4">
                  <div className="icon">
                    <Icon className="h-10 w-10 text-[#149ddd]" />
                  </div>
                  <div className="flex-1">
                    <h5 className="title text-base font-bold mb-1">
                      <a href="#" className="text-[#4ab8e6] hover:text-[#149ddd]">
                        {service.title}
                      </a>
                    </h5>
                    <p className="description text-sm text-gray-300">{service.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
