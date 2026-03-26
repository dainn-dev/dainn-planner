"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, LinkIcon } from "lucide-react"
import { useCvContentFromApi } from "@/components/cv-content-context"
import { useRouter } from "next/navigation"
import { getAssetFullUrl } from "@/lib/api/cv"

interface PortfolioItem {
  id: string
  category: string
  imageUrl: string
  title: string
  detailsUrl?: string
}

interface PortfolioData {
  intro: {
    title: string
    description: string
  }
  items: PortfolioItem[]
}

export default function Portfolio() {
  const apiCv = useCvContentFromApi()
  const router = useRouter()
  const [filter, setFilter] = useState("*")
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    intro: {
      title: "Portfolio",
      description:
        "Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem. Sit sint consectetur velit. Quisquam quos quisquam cupiditate. Et nemo qui impedit suscipit alias ea. Quia fugiat sit in iste officiis commodi quidem hic quas.",
    },
    items: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = apiCv?.content?.portfolio as PortfolioData | null | undefined
    if (raw && typeof raw === "object" && raw.intro) {
      setPortfolioData(raw)
    }
    setLoading(false)
  }, [apiCv])

  // Default items to show while loading
  const defaultItems: PortfolioItem[] = [
    { id: "1", category: "app", imageUrl: "/background.jpg?height=400&width=600", title: "App 1" },
    { id: "2", category: "web", imageUrl: "/background.jpg?height=400&width=600", title: "Web 3" },
    { id: "3", category: "app", imageUrl: "/background.jpg?height=400&width=600", title: "App 2" },
  ]

  const items = loading ? defaultItems : portfolioData.items
  const filteredItems = filter === "*" ? items : items.filter((item) => item.category === filter)

  const intro = portfolioData.intro

  const handleItemClick = (itemId: string) => {
    router.push(`/portfolio/${itemId}`)
  }

  return (
    <section id="portfolio" className="py-16 bg-[#f5f8fd]">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Portfolio</h2>
          <p className="text-gray-600">{intro.description}</p>
        </div>

        <div className="flex justify-center mb-8" data-aos="fade-up">
          <ul className="flex flex-wrap justify-center gap-2">
            <li>
              <button
                onClick={() => setFilter("*")}
                className={`px-4 py-2 rounded-md transition-colors ${filter === "*" ? "bg-[#149ddd] text-white" : "bg-white hover:bg-gray-100"}`}
              >
                All
              </button>
            </li>
            <li>
              <button
                onClick={() => setFilter("app")}
                className={`px-4 py-2 rounded-md transition-colors ${filter === "app" ? "bg-[#149ddd] text-white" : "bg-white hover:bg-gray-100"}`}
              >
                App
              </button>
            </li>
            <li>
              <button
                onClick={() => setFilter("card")}
                className={`px-4 py-2 rounded-md transition-colors ${filter === "card" ? "bg-[#149ddd] text-white" : "bg-white hover:bg-gray-100"}`}
              >
                Card
              </button>
            </li>
            <li>
              <button
                onClick={() => setFilter("web")}
                className={`px-4 py-2 rounded-md transition-colors ${filter === "web" ? "bg-[#149ddd] text-white" : "bg-white hover:bg-gray-100"}`}
              >
                Web
              </button>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-aos="fade-up" data-aos-delay="100">
          {filteredItems.map((item, idx) => (
            <div key={item.id ?? idx} className="portfolio-item cursor-pointer" onClick={() => handleItemClick(item.id)}>
              <div className="portfolio-wrap">
                <Image
                  src={getAssetFullUrl(item.imageUrl) || "/background.jpg"}
                  alt={item.title}
                  width={600}
                  height={400}
                  className="w-full h-64 object-cover"
                />
                <div className="portfolio-links">
                  <a href={item.imageUrl} title={item.title} className="text-white hover:text-gray-200" onClick={(e) => e.stopPropagation()}>
                    <Plus className="h-6 w-6" />
                  </a>
                  <a href={item.detailsUrl || "#"} title="More Details" className="text-white hover:text-gray-200" onClick={(e) => e.stopPropagation()}>
                    <LinkIcon className="h-6 w-6" />
                  </a>
                </div>
              </div>
              <div className="mt-2 text-center font-semibold text-[#173b6c]">{item.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
